#!/usr/bin/env python3
"""
===============================================================================
P2P DISTRIBUTED AGENT OVERLAY NETWORK FOR HETEROGENEOUS AI AGENT SWARMS
===============================================================================
Architecture & Specifications:
  1. Cryptographic Identity & Addressing:
     - Ed25519 Signing & Verification Keypairs per agent.
     - Content-Addressed Routing ID: SHA256(Ed25519_Pubkey)[:16].hex() -> 32 hex chars.
     - Envelope canonical signing & verification for non-repudiation and integrity.
  2. Capability & Service Gossip Protocol:
     - Periodic capability heartbeat announcements ("llm_generate", "python_repl", etc.).
     - Health metrics: token latency (ms/token), VRAM/RAM capacity, queue depth.
     - Dynamic capability-based load-balanced routing.
  3. Overlay Communication Patterns:
     - Async Request-Response RPC with timeout handling and backpressure.
     - Stream Multiplexer: Virtual channel streaming for real-time LLM token chunks.
     - Topic-based Pub/Sub bus for swarm consensus & coordination events.
  4. Distributed Blackboard (LWW-Element-Set CRDT):
     - Peer-to-peer conflict-free replicated data type key-value store.
===============================================================================
"""

import asyncio
import enum
import hashlib
import json
import os
import sys
import time
import uuid
from dataclasses import dataclass, field, asdict
from typing import (
    Any,
    AsyncIterator,
    Callable,
    Coroutine,
    Dict,
    List,
    Optional,
    Set,
    Tuple,
    Union,
)

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ed25519


# =============================================================================
# 1. CRYPTOGRAPHIC AGENT IDENTITY & ADDRESSING
# =============================================================================

class AgentIdentity:
    """
    Manages an agent's Ed25519 signing keypair and deterministic address derivation.
    """
    def __init__(self, private_key: Optional[ed25519.Ed25519PrivateKey] = None):
        self._priv = private_key or ed25519.Ed25519PrivateKey.generate()
        self._pub = self._priv.public_key()
        self.pub_bytes = self._pub.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        )
        # 16-byte address = SHA256(Ed25519_Pubkey)[:16] -> 32-char hex string
        self.agent_id = hashlib.sha256(self.pub_bytes).digest()[:16].hex()

    def sign(self, message: bytes) -> bytes:
        return self._priv.sign(message)

    @staticmethod
    def verify(pub_bytes: bytes, message: bytes, signature: bytes) -> bool:
        try:
            pub = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)
            pub.verify(signature, message)
            return True
        except (InvalidSignature, ValueError):
            return False


# =============================================================================
# 2. AGENT WIRE ENVELOPE & PROTOCOL MESSAGES
# =============================================================================

class EnvelopeType(enum.Enum):
    RPC_REQUEST     = "RPC_REQUEST"
    RPC_RESPONSE    = "RPC_RESPONSE"
    RPC_ERROR       = "RPC_ERROR"
    STREAM_CHUNK    = "STREAM_CHUNK"
    STREAM_END      = "STREAM_END"
    GOSSIP_ANNOUNCE = "GOSSIP_ANNOUNCE"
    PUBSUB_EVENT    = "PUBSUB_EVENT"
    CRDT_SYNC       = "CRDT_SYNC"


@dataclass
class AgentEnvelope:
    type: str                     # EnvelopeType string
    sender_id: str                # Originator Agent ID (32 hex)
    sender_pubkey: str            # Hex-encoded 32-byte Ed25519 public key
    recipient_id: str             # Destination Agent ID or "*" for broadcast
    correlation_id: str           # Unique request / stream session ID
    seq: int                      # Monotonic sequence counter
    timestamp: float              # Epoch timestamp
    payload: Dict[str, Any]       # Message body
    signature: str = ""           # Hex-encoded Ed25519 signature

    def canonical_bytes(self) -> bytes:
        """
        Produces a deterministic JSON byte representation over all fields except signature.
        """
        canonical_dict = {
            "type": self.type,
            "sender_id": self.sender_id,
            "sender_pubkey": self.sender_pubkey,
            "recipient_id": self.recipient_id,
            "correlation_id": self.correlation_id,
            "seq": self.seq,
            "timestamp": self.timestamp,
            "payload": self.payload,
        }
        return json.dumps(canonical_dict, sort_keys=True, separators=(",", ":")).encode("utf-8")

    def sign(self, identity: AgentIdentity):
        sig_bytes = identity.sign(self.canonical_bytes())
        self.signature = sig_bytes.hex()

    def verify_integrity(self) -> bool:
        try:
            pub_bytes = bytes.fromhex(self.sender_pubkey)
            sig_bytes = bytes.fromhex(self.signature)
            derived_id = hashlib.sha256(pub_bytes).digest()[:16].hex()
            if derived_id != self.sender_id:
                return False
            return AgentIdentity.verify(pub_bytes, self.canonical_bytes(), sig_bytes)
        except Exception:
            return False

    def serialize(self) -> str:
        return json.dumps(asdict(self))

    @classmethod
    def deserialize(cls, raw: str) -> "AgentEnvelope":
        data = json.loads(raw)
        return cls(**data)


# =============================================================================
# 3. DISTRIBUTED BLACKBOARD CRDT (LWW-REGISTER SET)
# =============================================================================

@dataclass
class LWWRegister:
    value: Any
    timestamp: float
    author: str


class DistributedBlackboard:
    """
    Conflict-Free Replicated Data Type (CRDT) key-value store using Last-Write-Wins (LWW).
    Enables decentralized state sharing across all agents.
    """
    def __init__(self, node_id: str):
        self.node_id = node_id
        self._store: Dict[str, LWWRegister] = {}
        self._lock = asyncio.Lock()

    async def put(self, key: str, value: Any) -> LWWRegister:
        async with self._lock:
            reg = LWWRegister(value=value, timestamp=time.time(), author=self.node_id)
            self._store[key] = reg
            return reg

    async def get(self, key: str, default: Any = None) -> Any:
        async with self._lock:
            reg = self._store.get(key)
            return reg.value if reg else default

    async def merge(self, updates: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Merges remote CRDT state into local store using LWW rule."""
        merged_keys = []
        async with self._lock:
            for k, reg_dict in updates.items():
                remote_ts = reg_dict["timestamp"]
                local_reg = self._store.get(k)
                if local_reg is None or remote_ts > local_reg.timestamp:
                    self._store[k] = LWWRegister(
                        value=reg_dict["value"],
                        timestamp=remote_ts,
                        author=reg_dict["author"]
                    )
                    merged_keys.append(k)
        return {"merged_keys": merged_keys}

    async def export_state(self) -> Dict[str, Any]:
        async with self._lock:
            return {
                k: {"value": reg.value, "timestamp": reg.timestamp, "author": reg.author}
                for k, reg in self._store.items()
            }


# =============================================================================
# 4. CAPABILITY REGISTRY & REPUTATION TRACKER
# =============================================================================

@dataclass
class PeerCapabilityMetadata:
    agent_id: str
    name: str
    capabilities: List[str]
    token_latency_ms: float
    vram_free_gb: float
    queue_depth: int
    last_seen: float
    reputation_score: float = 1.0


class CapabilityRegistry:
    """
    Tracks dynamic peer capability announcements, latency metrics, and load balancing.
    """
    def __init__(self):
        self._peers: Dict[str, PeerCapabilityMetadata] = {}

    def update_peer(
        self,
        agent_id: str,
        name: str,
        capabilities: List[str],
        token_latency_ms: float,
        vram_free_gb: float,
        queue_depth: int
    ):
        self._peers[agent_id] = PeerCapabilityMetadata(
            agent_id=agent_id,
            name=name,
            capabilities=capabilities,
            token_latency_ms=token_latency_ms,
            vram_free_gb=vram_free_gb,
            queue_depth=queue_depth,
            last_seen=time.time()
        )

    def find_best_peer_for_capability(self, capability: str) -> Optional[str]:
        """
        Selects the optimal peer for a capability based on queue depth and latency.
        """
        candidates = [
            peer for peer in self._peers.values()
            if capability in peer.capabilities and (time.time() - peer.last_seen) < 60.0
        ]
        if not candidates:
            return None

        # Multi-objective score: Lowest queue depth and lowest latency
        candidates.sort(key=lambda p: (p.queue_depth * 10.0) + p.token_latency_ms)
        return candidates[0].agent_id

    def list_all_peers(self) -> List[PeerCapabilityMetadata]:
        return list(self._peers.values())


# =============================================================================
# 5. STREAM MULTIPLEXER (VIRTUAL CHANNELS FOR TOKEN STREAMING)
# =============================================================================

class StreamMultiplexer:
    """
    Multiplexes virtual stream channels over asynchronous queues for LLM token streaming.
    """
    def __init__(self):
        self._active_streams: Dict[str, asyncio.Queue] = {}

    def open_stream(self, stream_id: str) -> asyncio.Queue:
        queue = asyncio.Queue()
        self._active_streams[stream_id] = queue
        return queue

    async def push_chunk(self, stream_id: str, chunk: Any):
        if stream_id in self._active_streams:
            await self._active_streams[stream_id].put((False, chunk))

    async def close_stream(self, stream_id: str):
        if stream_id in self._active_streams:
            await self._active_streams[stream_id].put((True, None))  # (is_end, data)

    def remove_stream(self, stream_id: str):
        self._active_streams.pop(stream_id, None)

    async def stream_iterator(self, stream_id: str) -> AsyncIterator[Any]:
        queue = self._active_streams.get(stream_id)
        if not queue:
            raise KeyError(f"Stream ID {stream_id} not registered.")
        try:
            while True:
                is_end, data = await queue.get()
                if is_end:
                    break
                yield data
        finally:
            self.remove_stream(stream_id)


# =============================================================================
# 6. MESH AGENT NODE RUNTIME
# =============================================================================

class SimulatedMeshRouter:
    """
    Simulated zero-trust transport switch that connects MeshAgentNode instances in-memory.
    """
    def __init__(self):
        self._agents: Dict[str, "MeshAgentNode"] = {}

    def register(self, agent: "MeshAgentNode"):
        self._agents[agent.agent_id] = agent

    async def route_frame(self, raw_envelope: str):
        env = AgentEnvelope.deserialize(raw_envelope)
        if env.recipient_id == "*":
            # Broadcast to all agents except sender
            for aid, agent in list(self._agents.items()):
                if aid != env.sender_id:
                    asyncio.create_task(agent.on_receive_envelope(raw_envelope))
        else:
            dest = self._agents.get(env.recipient_id)
            if dest:
                asyncio.create_task(dest.on_receive_envelope(raw_envelope))
            else:
                pass


class MeshAgentNode:
    """
    Autonomous P2P Agent Overlay Node.
    """
    def __init__(
        self,
        name: str,
        identity: Optional[AgentIdentity] = None,
        router: Optional[SimulatedMeshRouter] = None,
        token_latency_ms: float = 25.0,
        vram_free_gb: float = 24.0,
    ):
        self.name = name
        self.identity = identity or AgentIdentity()
        self.agent_id = self.identity.agent_id
        self.router = router or SimulatedMeshRouter()
        self.router.register(self)

        self.token_latency_ms = token_latency_ms
        self.vram_free_gb = vram_free_gb
        self.queue_depth = 0

        self.capabilities: Dict[str, Callable] = {}
        self.streaming_capabilities: Dict[str, Callable[..., AsyncIterator[str]]] = {}
        self.pubsub_subscribers: Dict[str, List[Callable[[Dict[str, Any]], Coroutine]]] = {}

        self.registry = CapabilityRegistry()
        self.blackboard = DistributedBlackboard(self.agent_id)
        self.multiplexer = StreamMultiplexer()

        self._pending_rpc: Dict[str, asyncio.Future] = {}
        self._seq_counter = 0
        self._gossip_task: Optional[asyncio.Task] = None

    def register_capability(self, name: str, handler: Callable):
        self.capabilities[name] = handler

    def register_streaming_capability(self, name: str, handler: Callable[..., AsyncIterator[str]]):
        self.streaming_capabilities[name] = handler

    def subscribe_topic(self, topic: str, handler: Callable[[Dict[str, Any]], Coroutine]):
        if topic not in self.pubsub_subscribers:
            self.pubsub_subscribers[topic] = []
        self.pubsub_subscribers[topic].append(handler)

    def _next_seq(self) -> int:
        self._seq_counter += 1
        return self._seq_counter

    # -------------------------------------------------------------------------
    # Core Messaging & RPC
    # -------------------------------------------------------------------------
    async def send_task(self, target: str, task: Dict[str, Any], timeout: float = 10.0) -> Dict[str, Any]:
        """
        Sends an RPC task request to either a specific agent ID or by capability lookup.
        """
        dest_agent_id = target
        if dest_agent_id not in self.registry._peers and target in ["llm_generate", "python_repl", "vector_search"]:
            # Route by capability query
            best = self.registry.find_best_peer_for_capability(target)
            if not best:
                raise RuntimeError(f"No available peer advertising capability '{target}'")
            dest_agent_id = best

        cid = str(uuid.uuid4())
        fut = asyncio.get_running_loop().create_future()
        self._pending_rpc[cid] = fut

        env = AgentEnvelope(
            type=EnvelopeType.RPC_REQUEST.value,
            sender_id=self.agent_id,
            sender_pubkey=self.identity.pub_bytes.hex(),
            recipient_id=dest_agent_id,
            correlation_id=cid,
            seq=self._next_seq(),
            timestamp=time.time(),
            payload=task
        )
        env.sign(self.identity)

        await self.router.route_frame(env.serialize())
        try:
            res = await asyncio.wait_for(fut, timeout=timeout)
            return res
        finally:
            self._pending_rpc.pop(cid, None)

    async def stream_task(self, target: str, task: Dict[str, Any]) -> AsyncIterator[str]:
        """
        Initiates a streaming task and yields real-time token chunks.
        """
        dest_agent_id = target
        if dest_agent_id not in self.registry._peers and target in ["llm_generate", "vision", "reasoning"]:
            best = self.registry.find_best_peer_for_capability(target)
            if not best:
                raise RuntimeError(f"No available peer advertising streaming capability '{target}'")
            dest_agent_id = best

        stream_id = str(uuid.uuid4())
        self.multiplexer.open_stream(stream_id)

        env = AgentEnvelope(
            type=EnvelopeType.RPC_REQUEST.value,
            sender_id=self.agent_id,
            sender_pubkey=self.identity.pub_bytes.hex(),
            recipient_id=dest_agent_id,
            correlation_id=stream_id,
            seq=self._next_seq(),
            timestamp=time.time(),
            payload={"stream": True, **task}
        )
        env.sign(self.identity)

        await self.router.route_frame(env.serialize())

        async for chunk in self.multiplexer.stream_iterator(stream_id):
            yield chunk

    async def broadcast_event(self, topic: str, payload: Dict[str, Any]):
        """
        Broadcasts an event on the pub/sub topic to all swarm peers.
        """
        env = AgentEnvelope(
            type=EnvelopeType.PUBSUB_EVENT.value,
            sender_id=self.agent_id,
            sender_pubkey=self.identity.pub_bytes.hex(),
            recipient_id="*",
            correlation_id=str(uuid.uuid4()),
            seq=self._next_seq(),
            timestamp=time.time(),
            payload={"topic": topic, "data": payload}
        )
        env.sign(self.identity)
        await self.router.route_frame(env.serialize())

    async def sync_blackboard_key(self, key: str, value: Any):
        """
        Updates local CRDT and broadcasts delta update to all mesh peers.
        """
        reg = await self.blackboard.put(key, value)
        env = AgentEnvelope(
            type=EnvelopeType.CRDT_SYNC.value,
            sender_id=self.agent_id,
            sender_pubkey=self.identity.pub_bytes.hex(),
            recipient_id="*",
            correlation_id=str(uuid.uuid4()),
            seq=self._next_seq(),
            timestamp=time.time(),
            payload={"updates": {key: {"value": reg.value, "timestamp": reg.timestamp, "author": reg.author}}}
        )
        env.sign(self.identity)
        await self.router.route_frame(env.serialize())

    # -------------------------------------------------------------------------
    # Gossip Capability Announcements
    # -------------------------------------------------------------------------
    async def broadcast_gossip_heartbeat(self):
        all_caps = list(self.capabilities.keys()) + list(self.streaming_capabilities.keys())
        env = AgentEnvelope(
            type=EnvelopeType.GOSSIP_ANNOUNCE.value,
            sender_id=self.agent_id,
            sender_pubkey=self.identity.pub_bytes.hex(),
            recipient_id="*",
            correlation_id=str(uuid.uuid4()),
            seq=self._next_seq(),
            timestamp=time.time(),
            payload={
                "name": self.name,
                "capabilities": all_caps,
                "token_latency_ms": self.token_latency_ms,
                "vram_free_gb": self.vram_free_gb,
                "queue_depth": self.queue_depth
            }
        )
        env.sign(self.identity)
        await self.router.route_frame(env.serialize())

    def start_gossip(self, interval: float = 5.0):
        async def _loop():
            while True:
                await self.broadcast_gossip_heartbeat()
                await asyncio.sleep(interval)
        self._gossip_task = asyncio.create_task(_loop())

    def stop_gossip(self):
        if self._gossip_task:
            self._gossip_task.cancel()

    # -------------------------------------------------------------------------
    # Inbound Envelope Handler
    # -------------------------------------------------------------------------
    async def on_receive_envelope(self, raw_envelope: str):
        env = AgentEnvelope.deserialize(raw_envelope)

        # 1. Cryptographic Signature Verification
        if not env.verify_integrity():
            print(f"[{self.name}] REJECTED forged or corrupted envelope from {env.sender_id[:8]}...")
            return

        # 2. Dispatch based on type
        if env.type == EnvelopeType.GOSSIP_ANNOUNCE.value:
            p = env.payload
            self.registry.update_peer(
                agent_id=env.sender_id,
                name=p["name"],
                capabilities=p["capabilities"],
                token_latency_ms=p["token_latency_ms"],
                vram_free_gb=p["vram_free_gb"],
                queue_depth=p["queue_depth"]
            )

        elif env.type == EnvelopeType.PUBSUB_EVENT.value:
            topic = env.payload.get("topic")
            data = env.payload.get("data", {})
            for handler in self.pubsub_subscribers.get(topic, []):
                asyncio.create_task(handler(data))

        elif env.type == EnvelopeType.CRDT_SYNC.value:
            updates = env.payload.get("updates", {})
            await self.blackboard.merge(updates)

        elif env.type == EnvelopeType.RPC_RESPONSE.value:
            cid = env.correlation_id
            if cid in self._pending_rpc:
                self._pending_rpc[cid].set_result(env.payload)

        elif env.type == EnvelopeType.STREAM_CHUNK.value:
            cid = env.correlation_id
            chunk = env.payload.get("chunk")
            await self.multiplexer.push_chunk(cid, chunk)

        elif env.type == EnvelopeType.STREAM_END.value:
            cid = env.correlation_id
            await self.multiplexer.close_stream(cid)

        elif env.type == EnvelopeType.RPC_REQUEST.value:
            asyncio.create_task(self._handle_inbound_rpc(env))

    async def _handle_inbound_rpc(self, env: AgentEnvelope):
        action = env.payload.get("action")
        is_stream = env.payload.get("stream", False)
        params = env.payload.get("params", {})

        self.queue_depth += 1
        try:
            if is_stream and action in self.streaming_capabilities:
                handler = self.streaming_capabilities[action]
                async for chunk in handler(**params):
                    chunk_env = AgentEnvelope(
                        type=EnvelopeType.STREAM_CHUNK.value,
                        sender_id=self.agent_id,
                        sender_pubkey=self.identity.pub_bytes.hex(),
                        recipient_id=env.sender_id,
                        correlation_id=env.correlation_id,
                        seq=self._next_seq(),
                        timestamp=time.time(),
                        payload={"chunk": chunk}
                    )
                    chunk_env.sign(self.identity)
                    await self.router.route_frame(chunk_env.serialize())

                end_env = AgentEnvelope(
                    type=EnvelopeType.STREAM_END.value,
                    sender_id=self.agent_id,
                    sender_pubkey=self.identity.pub_bytes.hex(),
                    recipient_id=env.sender_id,
                    correlation_id=env.correlation_id,
                    seq=self._next_seq(),
                    timestamp=time.time(),
                    payload={}
                )
                end_env.sign(self.identity)
                await self.router.route_frame(end_env.serialize())

            elif action in self.capabilities:
                handler = self.capabilities[action]
                if asyncio.iscoroutinefunction(handler):
                    result = await handler(**params)
                else:
                    result = handler(**params)

                resp_env = AgentEnvelope(
                    type=EnvelopeType.RPC_RESPONSE.value,
                    sender_id=self.agent_id,
                    sender_pubkey=self.identity.pub_bytes.hex(),
                    recipient_id=env.sender_id,
                    correlation_id=env.correlation_id,
                    seq=self._next_seq(),
                    timestamp=time.time(),
                    payload={"status": "success", "result": result}
                )
                resp_env.sign(self.identity)
                await self.router.route_frame(resp_env.serialize())

            else:
                resp_env = AgentEnvelope(
                    type=EnvelopeType.RPC_RESPONSE.value,
                    sender_id=self.agent_id,
                    sender_pubkey=self.identity.pub_bytes.hex(),
                    recipient_id=env.sender_id,
                    correlation_id=env.correlation_id,
                    seq=self._next_seq(),
                    timestamp=time.time(),
                    payload={"status": "error", "error": f"Capability '{action}' not found"}
                )
                resp_env.sign(self.identity)
                await self.router.route_frame(resp_env.serialize())
        finally:
            self.queue_depth = max(0, self.queue_depth - 1)


# =============================================================================
# 7. EXECUTABLE MULTI-AGENT SWARM SIMULATION
# =============================================================================

async def run_simulation():
    print("=" * 80)
    print("P2P AGENT OVERLAY NETWORK SIMULATION")
    print("=" * 80)

    mesh_router = SimulatedMeshRouter()

    # 1. Instantiate 3 Heterogeneous Agents
    planner = MeshAgentNode(name="PlannerAgent", router=mesh_router)
    llm_worker = MeshAgentNode(name="LLMWorkerAgent", router=mesh_router, token_latency_ms=18.5, vram_free_gb=48.0)
    tool_executor = MeshAgentNode(name="ToolExecutorAgent", router=mesh_router)

    print(f"[+] Initialized Planner Node      : {planner.agent_id} ({planner.name})")
    print(f"[+] Initialized LLM Worker Node   : {llm_worker.agent_id} ({llm_worker.name})")
    print(f"[+] Initialized Tool Executor Node: {tool_executor.agent_id} ({tool_executor.name})")

    # 2. Register Capabilities
    # (a) Streaming LLM Generation Handler
    async def handle_llm_generate(prompt: str) -> AsyncIterator[str]:
        tokens = [
            "Analyzing ", "battlefield ", "telemetry... ",
            "Optimal ", "UAV ", "reconnaissance ", "vector ", "is ", "Alpha-9.",
            " Mission ", "confidence: ", "99.4%."
        ]
        for t in tokens:
            await asyncio.sleep(0.04)
            yield t

    llm_worker.register_streaming_capability("llm_generate", handle_llm_generate)

    # (b) Python REPL Tool Handler
    def handle_python_repl(code: str) -> Dict[str, Any]:
        # Safely compute simple arithmetic / telemetry formula
        scope = {"__builtins__": {}}
        try:
            val = eval(code, scope)
            return {"output": str(val), "exit_code": 0}
        except Exception as err:
            return {"error": str(err), "exit_code": 1}

    tool_executor.register_capability("python_repl", handle_python_repl)

    # (c) Swarm Consensus Pub/Sub Event Listener
    consensus_events = []
    async def on_swarm_event(evt: Dict[str, Any]):
        consensus_events.append(evt)
        print(f"  [📢 PUBSUB BROADCAST] Received on topic: {evt}")

    planner.subscribe_topic("mission_alerts", on_swarm_event)

    # 3. Gossip Discovery
    print("\n--- PHASE 1: Peer Discovery & Capability Gossip ---")
    await planner.broadcast_gossip_heartbeat()
    await llm_worker.broadcast_gossip_heartbeat()
    await tool_executor.broadcast_gossip_heartbeat()
    await asyncio.sleep(0.1)

    print(f"[✓] Planner discovered {len(planner.registry.list_all_peers())} network peers.")
    for peer in planner.registry.list_all_peers():
        print(f"    • Peer {peer.agent_id[:12]}... | Name: {peer.name:<18} | Caps: {peer.capabilities} | Latency: {peer.token_latency_ms}ms")

    # 4. Capability-Based Dynamic Routing (Python REPL Tool Execution)
    print("\n--- PHASE 2: Capability-Routed Task Execution (Python REPL) ---")
    tool_task = {
        "action": "python_repl",
        "params": {"code": "34.0522 * 2 + 100"}
    }
    print(f"[>] Planner dispatching task by capability query ('python_repl')...")
    tool_response = await planner.send_task("python_repl", tool_task)
    print(f"[<] Response received: {tool_response}")
    assert tool_response["result"]["output"] == "168.1044"
    print("  [✓] Verified signed RPC execution & mathematical output.")

    # 5. Virtual Streaming Token Multiplexing
    print("\n--- PHASE 3: Virtual Multiplexed Token Streaming ---")
    stream_task = {
        "action": "llm_generate",
        "params": {"prompt": "Plan UAV perimeter sweep"}
    }
    print(f"[>] Planner opening virtual stream with LLMWorkerAgent...")
    print("  [Streaming tokens]: ", end="", flush=True)
    full_text = ""
    async for token in planner.stream_task("llm_generate", stream_task):
        print(token, end="", flush=True)
        full_text += token
    print()
    assert "Alpha-9" in full_text
    print("  [✓] Streaming token session finalized and closed cleanly.")

    # 6. Distributed Blackboard CRDT Sync
    print("\n--- PHASE 4: Distributed Blackboard CRDT Synchronization ---")
    await planner.sync_blackboard_key("MISSION_STATUS", "ACTIVE_RECON_PHASE_1")
    await asyncio.sleep(0.1)

    llm_status = await llm_worker.blackboard.get("MISSION_STATUS")
    tool_status = await tool_executor.blackboard.get("MISSION_STATUS")
    print(f"  [+] LLMWorkerAgent Blackboard State  : {llm_status}")
    print(f"  [+] ToolExecutorAgent Blackboard State: {tool_status}")
    assert llm_status == "ACTIVE_RECON_PHASE_1"
    assert tool_status == "ACTIVE_RECON_PHASE_1"
    print("  [✓] CRDT distributed blackboard state synced across all nodes.")

    # 7. Topic-Based Swarm Pub/Sub Event Broadcast
    print("\n--- PHASE 5: Swarm Consensus Pub/Sub Event Broadcast ---")
    await tool_executor.broadcast_event("mission_alerts", {
        "alert": "PERIMETER_CLEAR",
        "timestamp": time.time(),
        "threat_level": "LOW"
    })
    await asyncio.sleep(0.1)
    assert len(consensus_events) > 0
    print("  [✓] Swarm broadcast received and acknowledged.")

    # 8. Cryptographic Tamper Resistance Check
    print("\n--- PHASE 6: Cryptographic Signature Tamper Rejection Test ---")
    tampered_env = AgentEnvelope(
        type=EnvelopeType.RPC_REQUEST.value,
        sender_id=planner.agent_id,
        sender_pubkey=planner.identity.pub_bytes.hex(),
        recipient_id=tool_executor.agent_id,
        correlation_id=str(uuid.uuid4()),
        seq=999,
        timestamp=time.time(),
        payload={"action": "python_repl", "params": {"code": "0"}}
    )
    tampered_env.sign(planner.identity)
    # Tamper with payload after signing
    tampered_env.payload = {"action": "python_repl", "params": {"code": "1337"}}
    print("  [!] Adversary injected payload alteration post-signature...")
    assert not tampered_env.verify_integrity()
    print("  [✓] SUCCESS: Signature verification caught and rejected forged envelope.")

    print("\n" + "=" * 80)
    print("ALL P2P AGENT OVERLAY PROTOCOL TESTS COMPLETED SUCCESSFULLY")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(run_simulation())
