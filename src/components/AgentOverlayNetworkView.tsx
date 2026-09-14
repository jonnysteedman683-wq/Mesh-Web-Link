import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Shield,
  Key,
  Database,
  Terminal,
  Play,
  RefreshCw,
  Send,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Share2,
  Activity,
  Layers,
  Sparkles,
  Search,
  Lock,
  ArrowRight,
  Code2,
  ListOrdered,
  ShieldAlert
} from 'lucide-react';
import { SecurityWipeModal } from './SecurityWipeModal';

interface OverlayAgent {
  agentId: string;
  name: string;
  role: 'planner' | 'llm_worker' | 'tool_executor' | 'memory_store' | 'custom';
  publicKeyHex: string;
  capabilities: string[];
  tokenLatencyMs: number;
  vramFreeGb: number;
  queueDepth: number;
  lastSeen: number;
  status: 'online' | 'busy' | 'offline';
  processedTasks: number;
}

interface CRDTRegister {
  value: any;
  timestamp: number;
  author: string;
}

interface EnvelopeLog {
  id: string;
  type: string;
  senderId: string;
  recipientId: string;
  correlationId: string;
  seq: number;
  timestamp: number;
  payload: any;
  signature: string;
  verified: boolean;
}

export const AgentOverlayNetworkView: React.FC = () => {
  const [agents, setAgents] = useState<OverlayAgent[]>([]);
  const [blackboard, setBlackboard] = useState<Record<string, CRDTRegister>>({});
  const [envelopes, setEnvelopes] = useState<EnvelopeLog[]>([]);
  const [totalTasks, setTotalTasks] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // RPC Dispatch form
  const [selectedSender, setSelectedSender] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('llm_generate');
  const [targetType, setTargetType] = useState<'capability' | 'direct'>('capability');
  const [selectedTargetAgent, setSelectedTargetAgent] = useState<string>('');
  const [rpcParamPrompt, setRpcParamPrompt] = useState<string>('Synthesize strategic reconnaissance directives for Sector Alpha.');
  const [rpcParamCode, setRpcParamCode] = useState<string>('(128.5 * 1.3082) + Math.sqrt(99.4)');
  const [rpcLoading, setRpcLoading] = useState<boolean>(false);
  const [lastRpcResult, setLastRpcResult] = useState<any>(null);

  // Streaming Task state
  const [streamPrompt, setStreamPrompt] = useState<string>('Analyze multi-spectral radar sweep telemetry across sector boundaries.');
  const [streamChunks, setStreamChunks] = useState<string>('');
  const [streamingActive, setStreamingActive] = useState<boolean>(false);
  const [streamMeta, setStreamMeta] = useState<any>(null);

  // CRDT blackboard update form
  const [newKey, setNewKey] = useState<string>('TACTICAL_GRID_STATUS');
  const [newValue, setNewValue] = useState<string>('ACTIVE_HIGH_READINESS');
  const [crdtLoading, setCrdtLoading] = useState<boolean>(false);

  // Node Spawner modal & state
  const [showSpawnModal, setShowSpawnModal] = useState<boolean>(false);
  const [newAgentName, setNewAgentName] = useState<string>('SpectreScoutAgent');
  const [newAgentRole, setNewAgentRole] = useState<'planner' | 'llm_worker' | 'tool_executor' | 'memory_store' | 'custom'>('custom');
  const [newAgentCaps, setNewAgentCaps] = useState<string>('stealth_radar, jamming_triangulation');
  const [spawnLoading, setSpawnLoading] = useState<boolean>(false);

  // Byzantine Swarm Consensus Quorum state
  const [consensusProposal, setConsensusProposal] = useState<string>('AUTHORIZE_DRONE_INTERCEPT_CORRIDOR_DELTA');
  const [consensusThreshold, setConsensusThreshold] = useState<number>(0.66);
  const [consensusLoading, setConsensusLoading] = useState<boolean>(false);
  const [consensusResult, setConsensusResult] = useState<any>(null);

  // MITM Tamper & Forgery Rejection Simulator state
  const [tamperLoading, setTamperLoading] = useState<boolean>(false);
  const [tamperResult, setTamperResult] = useState<any>(null);

  // Security Wipe Modal state
  const [showSecurityWipeModal, setShowSecurityWipeModal] = useState<boolean>(false);

  // Python Script Runner state
  const [pythonRunning, setPythonRunning] = useState<boolean>(false);
  const [pythonOutput, setPythonOutput] = useState<string | null>(null);
  const [activePythonScript, setActivePythonScript] = useState<string>('');

  const streamEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch full overlay state
  const fetchState = async () => {
    try {
      const res = await fetch('/api/agent-mesh/state');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
        setBlackboard(data.blackboard || {});
        setEnvelopes(data.recentEnvelopes || []);
        setTotalTasks(data.totalTasksExecuted || 0);
        if (!selectedSender && data.agents?.length > 0) {
          setSelectedSender(data.agents[0].agentId);
        }
      }
    } catch (err) {
      console.error('Failed to load agent mesh state:', err);
    } finally {
      setLoading(false);
    }
  };

  // Execute Security Wipe on Overlay Network
  const handleExecuteSecurityWipe = async () => {
    const res = await fetch('/api/mesh/security-wipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        confirmationCode: 'ZEROIZE',
        operatorCallsign: 'OverlayCommander'
      })
    });
    if (!res.ok) {
      throw new Error('Security wipe failed on server.');
    }
    setStreamChunks('');
    setStreamMeta(null);
    setConsensusResult(null);
    setTamperResult(null);
    setPythonOutput(null);
    await fetchState();
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 4000);
    return () => clearInterval(interval);
  }, []);

  // Handle RPC Dispatch
  const handleDispatchRpc = async () => {
    setRpcLoading(true);
    setLastRpcResult(null);

    let params: any = {};
    if (selectedAction === 'llm_generate') {
      params = { prompt: rpcParamPrompt };
    } else if (selectedAction === 'python_repl' || selectedAction === 'math_eval') {
      params = { code: rpcParamCode, expression: rpcParamCode };
    } else if (selectedAction === 'vector_search') {
      params = { query: rpcParamPrompt, topK: 3 };
    } else {
      params = { note: 'Swarm consensus quorum ping', timestamp: Date.now() };
    }

    try {
      const payload: any = {
        senderId: selectedSender,
        action: selectedAction,
        params,
      };

      if (targetType === 'direct' && selectedTargetAgent) {
        payload.target = selectedTargetAgent;
      }

      const res = await fetch('/api/agent-mesh/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setLastRpcResult(data);
      fetchState();
    } catch (err: any) {
      setLastRpcResult({ error: err?.message || 'RPC invocation failed' });
    } finally {
      setRpcLoading(false);
    }
  };

  // Handle Real-Time Token Streaming
  const handleStartStream = async () => {
    setStreamingActive(true);
    setStreamChunks('');
    setStreamMeta(null);

    try {
      const response = await fetch('/api/agent-mesh/stream-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: streamPrompt, senderId: selectedSender }),
      });

      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          if (!block.trim()) continue;
          const eventMatch = block.match(/event:\s*(.+)/);
          const dataMatch = block.match(/data:\s*(.+)/);

          const eventType = eventMatch ? eventMatch[1].trim() : 'message';
          const eventData = dataMatch ? JSON.parse(dataMatch[1]) : {};

          if (eventType === 'stream_start') {
            setStreamMeta(eventData);
          } else if (eventType === 'stream_chunk') {
            setStreamChunks((prev) => prev + (eventData.chunk || ''));
          } else if (eventType === 'stream_end') {
            setStreamMeta((prev: any) => ({ ...prev, end: eventData }));
            fetchState();
          }
        }
      }
    } catch (err) {
      console.error('Stream error:', err);
    } finally {
      setStreamingActive(false);
    }
  };

  // Handle CRDT Put
  const handleCrdtPut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    setCrdtLoading(true);

    try {
      await fetch('/api/agent-mesh/crdt/put', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newKey.trim(),
          value: newValue,
          author: 'Commander (You)',
        }),
      });
      fetchState();
    } catch (err) {
      console.error('CRDT put failed:', err);
    } finally {
      setCrdtLoading(false);
    }
  };

  // Handle Dynamic Agent Node Spawning
  const handleSpawnAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSpawnLoading(true);
    try {
      const caps = newAgentCaps.split(',').map((c) => c.trim()).filter(Boolean);
      const res = await fetch('/api/agent-mesh/nodes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAgentName.trim(),
          role: newAgentRole,
          capabilities: caps,
        }),
      });
      if (res.ok) {
        setShowSpawnModal(false);
        fetchState();
      }
    } catch (err) {
      console.error('Failed to spawn agent:', err);
    } finally {
      setSpawnLoading(false);
    }
  };

  // Handle Swarm Consensus Quorum Vote
  const handleConsensusVote = async () => {
    setConsensusLoading(true);
    setConsensusResult(null);
    try {
      const res = await fetch('/api/agent-mesh/consensus/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal: consensusProposal,
          thresholdRatio: consensusThreshold,
        }),
      });
      const data = await res.json();
      setConsensusResult(data);
      fetchState();
    } catch (err: any) {
      setConsensusResult({ error: err?.message || 'Consensus vote failed' });
    } finally {
      setConsensusLoading(false);
    }
  };

  // Handle MITM Tamper Attack Simulation
  const handleSimulateTamper = async () => {
    setTamperLoading(true);
    setTamperResult(null);
    try {
      const res = await fetch('/api/agent-mesh/simulate-tamper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tamperField: 'directive' }),
      });
      const data = await res.json();
      setTamperResult(data);
      fetchState();
    } catch (err: any) {
      setTamperResult({ error: err?.message || 'Tamper test failed' });
    } finally {
      setTamperLoading(false);
    }
  };

  // Run Server Python Test Suite
  const handleRunPython = async (scriptType: 'agent_overlay' | 'crypto_fabric') => {
    setPythonRunning(true);
    setActivePythonScript(scriptType === 'crypto_fabric' ? 'mesh_crypto_fabric.py' : 'agent_overlay_network.py');
    setPythonOutput(null);

    try {
      const res = await fetch('/api/agent-mesh/run-python-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptType }),
      });
      const data = await res.json();
      setPythonOutput(data.stdout || data.stderr || 'Execution finished with no output.');
    } catch (err: any) {
      setPythonOutput(`Execution error: ${err?.message}`);
    } finally {
      setPythonRunning(false);
    }
  };

  return (
    <div className="space-y-6 text-zinc-100 p-1">
      {/* Top Banner & Telemetry KPIs */}
      <div className="bg-zinc-900/90 border border-emerald-500/30 rounded-xl p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-lg text-emerald-400">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-wider text-emerald-400 uppercase">
                  P2P Agent Overlay Network
                </h1>
                <span className="px-2 py-0.5 text-xs font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded">
                  ZERO-TRUST MESH
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Ed25519 Cryptographic Identities • Capability-Routed Task Execution • CRDT Blackboard • Token Stream Multiplexer
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowSpawnModal(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-all shadow-md"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Spawn New Agent</span>
            </button>

            <button
              onClick={() => handleRunPython('agent_overlay')}
              disabled={pythonRunning}
              className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black font-semibold text-xs rounded-lg transition-all shadow-lg shadow-emerald-950"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{pythonRunning ? 'Running Overlay...' : 'Test Overlay Network (Python)'}</span>
            </button>

            <button
              onClick={() => handleRunPython('crypto_fabric')}
              disabled={pythonRunning}
              className="flex items-center space-x-1.5 px-3 py-2 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-mono text-xs rounded-lg transition-all"
            >
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Test Zero-Trust Crypto</span>
            </button>

            <button
              onClick={() => setShowSecurityWipeModal(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-rose-950/90 hover:bg-rose-900 border border-rose-600/50 text-rose-300 font-mono text-xs rounded-lg transition-all shadow-md shadow-rose-950"
              title="Emergency Security Wipe: Zeroize Cryptographic Keys & Reset Mesh Fabric"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Security Wipe</span>
            </button>

            <button
              onClick={fetchState}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors border border-zinc-700"
              title="Refresh Network State"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-zinc-800/80">
          <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
            <div className="text-[11px] font-mono text-zinc-400 uppercase">Active Agents</div>
            <div className="text-xl font-bold text-emerald-400 font-mono">{agents.length} Nodes</div>
          </div>
          <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
            <div className="text-[11px] font-mono text-zinc-400 uppercase">Total Tasks Dispatched</div>
            <div className="text-xl font-bold text-cyan-400 font-mono">{totalTasks} RPC Calls</div>
          </div>
          <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
            <div className="text-[11px] font-mono text-zinc-400 uppercase">CRDT Blackboard Keys</div>
            <div className="text-xl font-bold text-amber-400 font-mono">{Object.keys(blackboard).length} Synced</div>
          </div>
          <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
            <div className="text-[11px] font-mono text-zinc-400 uppercase">Signed Envelopes</div>
            <div className="text-xl font-bold text-indigo-400 font-mono">{envelopes.length} Recorded</div>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left 2 Cols: Agent Topology + RPC Engine + Streaming Channel */}
        <div className="xl:col-span-2 space-y-6">
          {/* Agent Swarm Node Cards */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                  Active Cryptographic Agent Nodes
                </h2>
              </div>
              <span className="text-xs font-mono text-zinc-400">Ed25519 Identity Mesh</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map((agent) => (
                <div
                  key={agent.agentId}
                  className="bg-zinc-950/90 border border-zinc-800 hover:border-emerald-500/40 rounded-lg p-4 transition-all duration-200 relative group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-zinc-100">{agent.name}</span>
                        <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase bg-emerald-950 text-emerald-400 border border-emerald-500/30 rounded">
                          {agent.role}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400 mt-1 flex items-center space-x-1">
                        <Key className="w-3 h-3 text-zinc-500" />
                        <span className="truncate max-w-[190px]" title={agent.agentId}>
                          ID: {agent.agentId}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-xs font-mono text-emerald-400 uppercase">{agent.status}</span>
                    </div>
                  </div>

                  {/* Capabilities */}
                  <div className="mt-3">
                    <div className="text-[10px] uppercase font-mono text-zinc-500 mb-1">Advertised Capabilities:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {agent.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="px-2 py-0.5 text-[11px] font-mono bg-zinc-900 border border-zinc-700/60 rounded text-zinc-300"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Telemetry Metrics */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-zinc-900 text-center font-mono text-xs">
                    <div>
                      <div className="text-[10px] text-zinc-500">LATENCY</div>
                      <div className="text-emerald-400">{agent.tokenLatencyMs}ms</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500">VRAM FREE</div>
                      <div className="text-cyan-400">{agent.vramFreeGb} GB</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500">TASKS</div>
                      <div className="text-amber-400">{agent.processedTasks}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Capability-Routed RPC Execution Terminal */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                  Capability-Routed RPC Task Dispatcher
                </h2>
              </div>
              <span className="text-xs font-mono text-zinc-400">Signed Wire Envelopes</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1">Sender Agent</label>
                <select
                  value={selectedSender}
                  onChange={(e) => setSelectedSender(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  {agents.map((a) => (
                    <option key={a.agentId} value={a.agentId}>
                      {a.name} ({a.agentId.slice(0, 8)}...)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1">Capability / Action</label>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="llm_generate">llm_generate (Reasoning / Intel)</option>
                  <option value="python_repl">python_repl (Sandboxed Execution)</option>
                  <option value="math_eval">math_eval (Telemetry Math)</option>
                  <option value="vector_search">vector_search (Semantic Memory)</option>
                  <option value="consensus_vote">consensus_vote (Swarm Quorum)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1">Target Routing</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="capability">Auto (Capability Gossip Router)</option>
                  <option value="direct">Direct Node ID</option>
                </select>
              </div>
            </div>

            {/* Input params depending on action */}
            {selectedAction === 'llm_generate' || selectedAction === 'vector_search' ? (
              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1">Prompt / Query Text</label>
                <textarea
                  value={rpcParamPrompt}
                  onChange={(e) => setRpcParamPrompt(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1">Mathematical / Python Expression</label>
                <input
                  type="text"
                  value={rpcParamCode}
                  onChange={(e) => setRpcParamCode(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <button
              onClick={handleDispatchRpc}
              disabled={rpcLoading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black font-semibold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md shadow-emerald-950"
            >
              <Send className="w-4 h-4" />
              <span>{rpcLoading ? 'Signing & Dispatching Envelope...' : 'Dispatch Signed RPC Task'}</span>
            </button>

            {/* RPC Result Display */}
            {lastRpcResult && (
              <div className="bg-zinc-950 border border-emerald-500/30 rounded-lg p-4 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-emerald-400 border-b border-zinc-800 pb-2">
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-bold">RPC EXECUTION COMPLETED</span>
                  </div>
                  <span className="text-[11px] text-zinc-500">ID: {lastRpcResult.correlationId}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
                  <div>
                    Sender: <span className="text-zinc-200">{lastRpcResult.senderName}</span>
                  </div>
                  <div>
                    Target Peer: <span className="text-emerald-300">{lastRpcResult.targetName}</span>
                  </div>
                </div>

                <div className="bg-zinc-900 p-3 rounded border border-zinc-800 text-zinc-200 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(lastRpcResult.result, null, 2)}</pre>
                </div>

                <div className="text-[10px] text-zinc-500 truncate">
                  Ed25519 Sig: {lastRpcResult.responseSignature}
                </div>
              </div>
            )}
          </div>

          {/* Real-time Virtual Token Stream Channel */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                  Virtual Stream Channel Multiplexer (LLM Token Stream)
                </h2>
              </div>
              <span className="text-xs font-mono text-cyan-400">
                {streamingActive ? '● STREAMING LIVE' : 'STREAM IDLE'}
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={streamPrompt}
                onChange={(e) => setStreamPrompt(e.target.value)}
                placeholder="Enter prompt for multiplexed token streaming..."
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleStartStream}
                disabled={streamingActive}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-black font-semibold text-xs rounded-lg transition-all"
              >
                {streamingActive ? 'Streaming...' : 'Stream Tokens'}
              </button>
            </div>

            {/* Stream Output Console */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 min-h-[140px] max-h-[220px] overflow-y-auto font-mono text-xs text-zinc-200">
              {streamChunks ? (
                <div className="whitespace-pre-wrap leading-relaxed">
                  {streamChunks}
                  {streamingActive && <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse" />}
                </div>
              ) : (
                <div className="text-zinc-600 italic">No active stream. Click &quot;Stream Tokens&quot; to test the virtual multiplexer.</div>
              )}
              <div ref={streamEndRef} />
            </div>

            {streamMeta && (
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1">
                <span>Worker: {streamMeta.workerName}</span>
                <span>Session ID: {streamMeta.streamId}</span>
                {streamMeta.end && <span className="text-cyan-400">Total Chars: {streamMeta.end.totalChars}</span>}
              </div>
            )}
          </div>

          {/* Swarm Consensus Quorum Engine */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                  Swarm Consensus Quorum & Byzantine Voting
                </h2>
              </div>
              <span className="text-xs font-mono text-purple-400">Multi-Agent Ed25519 Quorum</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-mono text-zinc-400 block mb-1">Consensus Proposal Directive</label>
                <input
                  type="text"
                  value={consensusProposal}
                  onChange={(e) => setConsensusProposal(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1">Quorum Threshold</label>
                <select
                  value={consensusThreshold}
                  onChange={(e) => setConsensusThreshold(parseFloat(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-purple-500"
                >
                  <option value={0.51}>51% Simple Majority</option>
                  <option value={0.66}>66% Supermajority (2/3 BFT)</option>
                  <option value={0.75}>75% Byzantine Fault-Tolerant</option>
                  <option value={1.0}>100% Unanimous Quorum</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleConsensusVote}
              disabled={consensusLoading}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md shadow-purple-950"
            >
              {consensusLoading ? 'Polling Swarm Nodes & Verifying Signatures...' : 'Initiate Swarm Consensus Vote'}
            </button>

            {consensusResult && (
              <div className="bg-zinc-950 border border-purple-500/30 rounded-lg p-4 font-mono text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <div className="flex items-center space-x-2">
                    {consensusResult.passed ? (
                      <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-500/40 rounded font-bold">
                        QUORUM PASSED ({consensusResult.approvalPercentage}%)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-red-950 text-red-400 border border-red-500/40 rounded font-bold">
                        QUORUM FAILED ({consensusResult.approvalPercentage}%)
                      </span>
                    )}
                    <span className="text-zinc-300 font-bold">{consensusResult.proposal}</span>
                  </div>
                  <span className="text-zinc-500 text-[11px]">Threshold: {consensusResult.quorumThreshold}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {consensusResult.votes?.map((v: any) => (
                    <div key={v.agentId} className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-200">{v.agentName}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${v.vote === 'APPROVE' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                          {v.vote}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400">{v.reason}</div>
                      <div className="text-[10px] text-zinc-600 truncate">Sig: {v.signature}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Adversary MITM Tamper Rejection Test Suite */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                  Adversary Tamper & MITM Forgery Rejection Test
                </h2>
              </div>
              <span className="text-xs font-mono text-rose-400">Zero-Trust Integrity Check</span>
            </div>

            <p className="text-xs font-mono text-zinc-400">
              Simulates a malicious adversary intercepting a signed wire envelope in flight, altering the tactical payload contents, and attempting to deliver it to a peer. Verifies that the recipient detects cryptographic signature mismatches and drops the forged envelope.
            </p>

            <button
              onClick={handleSimulateTamper}
              disabled={tamperLoading}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md shadow-rose-950"
            >
              {tamperLoading ? 'Injecting MITM Payload Alteration...' : 'Execute MITM Tamper & Forgery Attack Simulation'}
            </button>

            {tamperResult && (
              <div className="bg-zinc-950 border border-rose-500/40 rounded-lg p-4 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">CRYPTO DEFENSE SUCCESSFUL</span>
                  </div>
                  <span className="text-[11px] text-rose-400 font-bold">{tamperResult.mitmDetectionResult}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800">
                    <div className="text-zinc-500 mb-1">ORIGINAL SIGNED PAYLOAD:</div>
                    <pre className="text-zinc-300 whitespace-pre-wrap">{JSON.stringify(tamperResult.originalPayload, null, 2)}</pre>
                  </div>
                  <div className="bg-zinc-900/80 p-2.5 rounded border border-rose-900/40">
                    <div className="text-rose-400 mb-1">FORGED MITM PAYLOAD (REJECTED):</div>
                    <pre className="text-rose-300 whitespace-pre-wrap">{JSON.stringify(tamperResult.tamperedPayload, null, 2)}</pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: CRDT Blackboard + Real Python Terminal + Envelopes Log */}
        <div className="space-y-6">
          {/* Distributed CRDT Blackboard */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                  CRDT Distributed Blackboard
                </h2>
              </div>
              <span className="text-xs font-mono text-amber-400">LWW Register</span>
            </div>

            {/* Blackboard List */}
            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
              {(Object.entries(blackboard) as [string, CRDTRegister][]).map(([key, reg]) => (
                <div key={key} className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-amber-300">{key}</span>
                    <span className="text-[10px] font-mono text-zinc-500">{reg.author}</span>
                  </div>
                  <div className="text-xs font-mono text-zinc-200 bg-zinc-900/70 p-1.5 rounded truncate">
                    {typeof reg.value === 'object' ? JSON.stringify(reg.value) : String(reg.value)}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-600">
                    Timestamp: {new Date(reg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Put New Key Form */}
            <form onSubmit={handleCrdtPut} className="space-y-2 pt-2 border-t border-zinc-800">
              <div className="text-[11px] font-mono text-zinc-400 uppercase">Write to CRDT Blackboard</div>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Key (e.g. MISSION_TARGET)"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Value"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={crdtLoading}
                className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-black font-semibold text-xs uppercase tracking-wider rounded-lg transition-all"
              >
                {crdtLoading ? 'Writing...' : 'Update Distributed Register'}
              </button>
            </form>
          </div>

          {/* Python Subprocess Live Terminal Output */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                  Server Subprocess Terminal
                </h2>
              </div>
              {activePythonScript && (
                <span className="text-[11px] font-mono text-emerald-400">{activePythonScript}</span>
              )}
            </div>

            <div className="bg-black border border-zinc-800 rounded-lg p-3 font-mono text-[11px] min-h-[160px] max-h-[220px] overflow-y-auto text-emerald-300">
              {pythonRunning ? (
                <div className="flex items-center space-x-2 text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Executing test suite in real Python sandbox...</span>
                </div>
              ) : pythonOutput ? (
                <pre className="whitespace-pre-wrap">{pythonOutput}</pre>
              ) : (
                <div className="text-zinc-600 italic">Click &quot;Test Overlay Network (Python)&quot; above to execute the live protocol suite.</div>
              )}
            </div>
          </div>

          {/* Wire Envelope Log */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <ListOrdered className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                  Signed Envelope Wire Log
                </h2>
              </div>
              <span className="text-xs font-mono text-zinc-400">{envelopes.length} Envelopes</span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {envelopes.slice(-10).reverse().map((env) => (
                <div key={env.id} className="bg-zinc-950 p-2.5 rounded border border-zinc-800 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-400">{env.type}</span>
                    <span className="text-[10px] text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verified</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate mt-1">
                    Seq #{env.seq} • From: {env.senderId.slice(0, 8)} → To: {env.recipientId.slice(0, 8)}
                  </div>
                  <div className="text-[10px] text-zinc-600 truncate mt-0.5">
                    Sig: {env.signature}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Spawn New Agent Modal */}
      {showSpawnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-indigo-500/40 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-zinc-100">Spawn Dynamic Agent Node</h3>
              </div>
              <button
                onClick={() => setShowSpawnModal(false)}
                className="text-zinc-400 hover:text-zinc-200 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSpawnAgent} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Agent Name</label>
                <input
                  type="text"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Agent Archetype / Role</label>
                <select
                  value={newAgentRole}
                  onChange={(e) => setNewAgentRole(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="planner">planner (Orchestration & Quorum)</option>
                  <option value="llm_worker">llm_worker (Inference & Reasoning)</option>
                  <option value="tool_executor">tool_executor (Sandboxed Tools & Math)</option>
                  <option value="memory_store">memory_store (Vector Memory & CRDT)</option>
                  <option value="custom">custom (Specialized Sensor/Radio)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Advertised Capabilities (comma-separated)</label>
                <input
                  type="text"
                  value={newAgentCaps}
                  onChange={(e) => setNewAgentCaps(e.target.value)}
                  placeholder="e.g. stealth_radar, python_repl, telemetry"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 bg-zinc-950 rounded border border-zinc-800 text-[11px] text-zinc-400">
                • Automatically derives a unique Ed25519 keypair and SHA256 ID.<br />
                • Immediately broadcasts a signed GOSSIP_ANNOUNCE packet into the mesh.
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSpawnModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={spawnLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-semibold shadow-lg shadow-indigo-950"
                >
                  {spawnLoading ? 'Generating Keys...' : 'Generate Keys & Deploy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Security Wipe Confirmation Modal */}
      <SecurityWipeModal
        isOpen={showSecurityWipeModal}
        onClose={() => setShowSecurityWipeModal(false)}
        onConfirmWipe={handleExecuteSecurityWipe}
        targetNodeCount={agents.length}
      />
    </div>
  );
};
