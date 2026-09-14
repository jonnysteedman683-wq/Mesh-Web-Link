import { systemLogManager } from './systemLogManager';

export interface MeshTopologyNode {
  id: string;
  label: string;
  role: 'GATEWAY' | 'REPEATER' | 'UAV_RELAY' | 'TACTICAL_OPERATOR' | 'SENSOR_BUOY';
  x: number; // 0 - 1000 coordinate grid
  y: number;
  batteryPercent: number;
  isAlive: boolean;
  isJammed: boolean;
  activeLinksCount: number;
  processingLoadPercent: number;
  txPowerDbm: number;
}

export interface MeshTopologyEdge {
  id: string;
  sourceId: string;
  targetId: string;
  rssi: number; // dBm (-115 to -40)
  snr: number; // dB (-10 to 30)
  packetLossRate: number; // 0.0 to 1.0 (0% - 100%)
  latencyMs: number; // Link latency
  etx: number; // Expected Transmission Count = 1 / ((1 - loss_f) * (1 - loss_r))
  bandwidthKbps: number;
  status: 'OPTIMAL' | 'DEGRADED' | 'SEVERED' | 'HEALING';
  isHealingActive: boolean;
}

export interface RoutePathResult {
  sourceId: string;
  targetId: string;
  hopPath: string[]; // List of node IDs
  totalLatencyMs: number;
  totalEtx: number;
  bottleneckBandwidthKbps: number;
  reliabilityScorePercent: number;
  status: 'ACTIVE' | 'REROUTED' | 'UNREACHABLE';
  calculatedAt: number;
}

export interface SelfHealingEvent {
  id: string;
  timestamp: number;
  trigger: 'NODE_FAILURE' | 'LINK_SEVERED' | 'RF_JAMMING' | 'PACKET_LOSS_SPIKE' | 'LOAD_IMBALANCE';
  affectedSourceId: string;
  affectedTargetId: string;
  previousPath: string[];
  healedPath: string[];
  recoveryDurationMs: number;
  description: string;
}

export type MeshSelfHealingListener = () => void;

class MeshSelfHealingManager {
  private nodes: MeshTopologyNode[] = [
    {
      id: 'node-hq-gw',
      label: 'C4ISR-HQ-GATEWAY',
      role: 'GATEWAY',
      x: 150,
      y: 180,
      batteryPercent: 100,
      isAlive: true,
      isJammed: false,
      activeLinksCount: 3,
      processingLoadPercent: 34,
      txPowerDbm: 30
    },
    {
      id: 'node-tower-north',
      label: 'NORTH-RIDGE-REPEATER',
      role: 'REPEATER',
      x: 480,
      y: 130,
      batteryPercent: 92,
      isAlive: true,
      isJammed: false,
      activeLinksCount: 3,
      processingLoadPercent: 28,
      txPowerDbm: 27
    },
    {
      id: 'node-uav-relay-1',
      label: 'UAV-ALPHA-AIR-RELAY',
      role: 'UAV_RELAY',
      x: 780,
      y: 220,
      batteryPercent: 78,
      isAlive: true,
      isJammed: false,
      activeLinksCount: 4,
      processingLoadPercent: 52,
      txPowerDbm: 24
    },
    {
      id: 'node-patrol-bravo',
      label: 'RECON-PATROL-BRAVO',
      role: 'TACTICAL_OPERATOR',
      x: 320,
      y: 490,
      batteryPercent: 64,
      isAlive: true,
      isJammed: false,
      activeLinksCount: 3,
      processingLoadPercent: 18,
      txPowerDbm: 20
    },
    {
      id: 'node-tower-east',
      label: 'EAST-VALLEY-REPEATER',
      role: 'REPEATER',
      x: 620,
      y: 540,
      batteryPercent: 86,
      isAlive: true,
      isJammed: false,
      activeLinksCount: 3,
      processingLoadPercent: 41,
      txPowerDbm: 27
    },
    {
      id: 'node-sensor-perimeter',
      label: 'PERIMETER-SEISMIC-BUOY',
      role: 'SENSOR_BUOY',
      x: 880,
      y: 620,
      batteryPercent: 95,
      isAlive: true,
      isJammed: false,
      activeLinksCount: 2,
      processingLoadPercent: 12,
      txPowerDbm: 14
    },
    {
      id: 'node-forward-outpost',
      label: 'FORWARD-OUTPOST-FOXTROT',
      role: 'TACTICAL_OPERATOR',
      x: 450,
      y: 820,
      batteryPercent: 58,
      isAlive: true,
      isJammed: false,
      activeLinksCount: 2,
      processingLoadPercent: 22,
      txPowerDbm: 22
    }
  ];

  private edges: MeshTopologyEdge[] = [
    {
      id: 'edge-1',
      sourceId: 'node-hq-gw',
      targetId: 'node-tower-north',
      rssi: -62,
      snr: 18,
      packetLossRate: 0.01,
      latencyMs: 14,
      etx: 1.02,
      bandwidthKbps: 250,
      status: 'OPTIMAL',
      isHealingActive: false
    },
    {
      id: 'edge-2',
      sourceId: 'node-hq-gw',
      targetId: 'node-patrol-bravo',
      rssi: -78,
      snr: 10,
      packetLossRate: 0.04,
      latencyMs: 28,
      etx: 1.08,
      bandwidthKbps: 180,
      status: 'OPTIMAL',
      isHealingActive: false
    },
    {
      id: 'edge-3',
      sourceId: 'node-tower-north',
      targetId: 'node-uav-relay-1',
      rssi: -68,
      snr: 15,
      packetLossRate: 0.02,
      latencyMs: 18,
      etx: 1.04,
      bandwidthKbps: 220,
      status: 'OPTIMAL',
      isHealingActive: false
    },
    {
      id: 'edge-4',
      sourceId: 'node-tower-north',
      targetId: 'node-patrol-bravo',
      rssi: -84,
      snr: 7,
      packetLossRate: 0.08,
      latencyMs: 42,
      etx: 1.17,
      bandwidthKbps: 120,
      status: 'OPTIMAL',
      isHealingActive: false
    },
    {
      id: 'edge-5',
      sourceId: 'node-uav-relay-1',
      targetId: 'node-tower-east',
      rssi: -71,
      snr: 14,
      packetLossRate: 0.03,
      latencyMs: 22,
      etx: 1.06,
      bandwidthKbps: 200,
      status: 'OPTIMAL',
      isHealingActive: false
    },
    {
      id: 'edge-6',
      sourceId: 'node-uav-relay-1',
      targetId: 'node-sensor-perimeter',
      rssi: -76,
      snr: 11,
      packetLossRate: 0.05,
      latencyMs: 31,
      etx: 1.11,
      bandwidthKbps: 150,
      status: 'OPTIMAL',
      isHealingActive: false
    },
    {
      id: 'edge-7',
      sourceId: 'node-patrol-bravo',
      targetId: 'node-tower-east',
      rssi: -81,
      snr: 8,
      packetLossRate: 0.06,
      latencyMs: 36,
      etx: 1.13,
      bandwidthKbps: 140,
      status: 'OPTIMAL',
      isHealingActive: false
    },
    {
      id: 'edge-8',
      sourceId: 'node-patrol-bravo',
      targetId: 'node-forward-outpost',
      rssi: -74,
      snr: 12,
      packetLossRate: 0.03,
      latencyMs: 25,
      etx: 1.06,
      bandwidthKbps: 190,
      status: 'OPTIMAL',
      isHealingActive: false
    },
    {
      id: 'edge-9',
      sourceId: 'node-tower-east',
      targetId: 'node-sensor-perimeter',
      rssi: -79,
      snr: 9,
      packetLossRate: 0.04,
      latencyMs: 29,
      etx: 1.09,
      bandwidthKbps: 160,
      status: 'OPTIMAL',
      isHealingActive: false
    },
    {
      id: 'edge-10',
      sourceId: 'node-tower-east',
      targetId: 'node-forward-outpost',
      rssi: -83,
      snr: 7,
      packetLossRate: 0.07,
      latencyMs: 38,
      etx: 1.15,
      bandwidthKbps: 130,
      status: 'OPTIMAL',
      isHealingActive: false
    }
  ];

  private activeRoute: RoutePathResult | null = null;
  private selectedSourceNodeId = 'node-hq-gw';
  private selectedTargetNodeId = 'node-forward-outpost';
  private healingHistory: SelfHealingEvent[] = [
    {
      id: 'heal-init-1',
      timestamp: Date.now() - 480000,
      trigger: 'RF_JAMMING',
      affectedSourceId: 'node-hq-gw',
      affectedTargetId: 'node-forward-outpost',
      previousPath: ['node-hq-gw', 'node-patrol-bravo', 'node-forward-outpost'],
      healedPath: ['node-hq-gw', 'node-tower-north', 'node-uav-relay-1', 'node-tower-east', 'node-forward-outpost'],
      recoveryDurationMs: 42,
      description: 'Auto-rerouted mission traffic around jammed patrol node via airborne UAV relay.'
    }
  ];

  private listeners: MeshSelfHealingListener[] = [];
  private autoHealLoopInterval: any = null;
  private isAutoHealingActive = true;
  private healingRebalanceAlgorithm: 'DIJKSTRA_ETX' | 'BELLMAN_FORD' | 'MULTI_METRIC_QOS' = 'DIJKSTRA_ETX';

  constructor() {
    this.recalculateAllRoutes();
    this.startSimulationLoop();
  }

  // -------------------------------------------------------------
  // Dijkstra & Expected Transmission Count (ETX) Optimization
  // -------------------------------------------------------------
  public calculateOptimalPath(sourceId: string, targetId: string): RoutePathResult {
    const liveNodes = new Set(this.nodes.filter(n => n.isAlive && !n.isJammed).map(n => n.id));

    if (!liveNodes.has(sourceId) || !liveNodes.has(targetId)) {
      return {
        sourceId,
        targetId,
        hopPath: [],
        totalLatencyMs: 0,
        totalEtx: 9999,
        bottleneckBandwidthKbps: 0,
        reliabilityScorePercent: 0,
        status: 'UNREACHABLE',
        calculatedAt: Date.now()
      };
    }

    // Build Adjacency Graph with Weighted Edge Costs
    const adj: Record<string, Array<{ neighborId: string; edge: MeshTopologyEdge; weight: number }>> = {};
    this.nodes.forEach(n => { adj[n.id] = []; });

    this.edges.forEach(edge => {
      if (edge.status === 'SEVERED') return;
      if (!liveNodes.has(edge.sourceId) || !liveNodes.has(edge.targetId)) return;

      // Cost Metric based on ETX, latency, and packet loss
      let cost = edge.etx * 10 + edge.latencyMs * 0.1;
      if (this.healingRebalanceAlgorithm === 'MULTI_METRIC_QOS') {
        cost = edge.etx * 15 + (1 / Math.max(10, edge.bandwidthKbps)) * 1000 + edge.latencyMs * 0.2;
      }

      adj[edge.sourceId].push({ neighborId: edge.targetId, edge, weight: cost });
      adj[edge.targetId].push({ neighborId: edge.sourceId, edge, weight: cost });
    });

    // Dijkstra's Shortest Path Algorithm
    const dist: Record<string, number> = {};
    const prev: Record<string, string | null> = {};
    const unvisited = new Set<string>();

    this.nodes.forEach(n => {
      dist[n.id] = Infinity;
      prev[n.id] = null;
      unvisited.add(n.id);
    });

    dist[sourceId] = 0;

    while (unvisited.size > 0) {
      // Find node with minimum distance
      let u: string | null = null;
      let minDist = Infinity;
      unvisited.forEach(nodeId => {
        if (dist[nodeId] < minDist) {
          minDist = dist[nodeId];
          u = nodeId;
        }
      });

      if (!u || minDist === Infinity) break;
      if (u === targetId) break;

      unvisited.delete(u);

      const neighbors = adj[u] || [];
      for (const { neighborId, weight } of neighbors) {
        if (!unvisited.has(neighborId)) continue;
        const alt = dist[u] + weight;
        if (alt < dist[neighborId]) {
          dist[neighborId] = alt;
          prev[neighborId] = u;
        }
      }
    }

    // Reconstruct Path
    const path: string[] = [];
    let curr: string | null = targetId;

    if (dist[targetId] !== Infinity) {
      while (curr) {
        path.unshift(curr);
        curr = prev[curr];
      }
    }

    if (path.length === 0 || path[0] !== sourceId) {
      return {
        sourceId,
        targetId,
        hopPath: [],
        totalLatencyMs: 0,
        totalEtx: 9999,
        bottleneckBandwidthKbps: 0,
        reliabilityScorePercent: 0,
        status: 'UNREACHABLE',
        calculatedAt: Date.now()
      };
    }

    // Compute metrics along path
    let totalLatency = 0;
    let totalEtx = 0;
    let bottleneckBw = Infinity;
    let cumulativeLoss = 1.0;

    for (let i = 0; i < path.length - 1; i++) {
      const u = path[i];
      const v = path[i + 1];
      const edge = this.edges.find(e => (e.sourceId === u && e.targetId === v) || (e.sourceId === v && e.targetId === u));
      if (edge) {
        totalLatency += edge.latencyMs;
        totalEtx += edge.etx;
        bottleneckBw = Math.min(bottleneckBw, edge.bandwidthKbps);
        cumulativeLoss *= (1 - edge.packetLossRate);
      }
    }

    const reliability = Math.max(5, Math.min(99.9, Number((cumulativeLoss * 100).toFixed(1))));

    return {
      sourceId,
      targetId,
      hopPath: path,
      totalLatencyMs: totalLatency,
      totalEtx: Number(totalEtx.toFixed(2)),
      bottleneckBandwidthKbps: bottleneckBw === Infinity ? 0 : bottleneckBw,
      reliabilityScorePercent: reliability,
      status: 'ACTIVE',
      calculatedAt: Date.now()
    };
  }

  public recalculateAllRoutes() {
    this.activeRoute = this.calculateOptimalPath(this.selectedSourceNodeId, this.selectedTargetNodeId);
    this.notify();
  }

  // -------------------------------------------------------------
  // Node & Edge Failure Injection & Self-Healing Triggers
  // -------------------------------------------------------------
  public toggleNodeAlive(nodeId: string) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const oldState = node.isAlive;
    node.isAlive = !oldState;

    if (!node.isAlive) {
      this.handleMeshFault('NODE_FAILURE', `Node ${node.label} offline/destroyed.`, nodeId);
    } else {
      systemLogManager.log('INFO', 'MESH_FABRIC', `Node [${node.label}] re-established online heartbeat.`, { nodeId });
      this.recalculateAllRoutes();
    }
  }

  public toggleNodeJammed(nodeId: string) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;

    node.isJammed = !node.isJammed;

    if (node.isJammed) {
      this.handleMeshFault('RF_JAMMING', `Hostile RF barrage jamming detected on ${node.label}.`, nodeId);
    } else {
      systemLogManager.log('INFO', 'MESH_FABRIC', `RF interference cleared on [${node.label}]. Link quality restored.`, { nodeId });
      this.recalculateAllRoutes();
    }
  }

  public toggleEdgeSevered(edgeId: string) {
    const edge = this.edges.find(e => e.id === edgeId);
    if (!edge) return;

    const isSevered = edge.status === 'SEVERED';
    edge.status = isSevered ? 'OPTIMAL' : 'SEVERED';

    if (!isSevered) {
      this.handleMeshFault('LINK_SEVERED', `Physical RF link severed between [${edge.sourceId}] and [${edge.targetId}].`, edgeId);
    } else {
      systemLogManager.log('INFO', 'MESH_FABRIC', `RF Link [${edgeId}] restored to optimal state.`, { edgeId });
      this.recalculateAllRoutes();
    }
  }

  public injectPacketLoss(edgeId: string, lossRate: number) {
    const edge = this.edges.find(e => e.id === edgeId);
    if (!edge) return;

    edge.packetLossRate = Math.max(0, Math.min(0.9, lossRate));
    edge.etx = Number((1 / ((1 - edge.packetLossRate) * (1 - edge.packetLossRate))).toFixed(2));
    edge.status = edge.packetLossRate > 0.3 ? 'DEGRADED' : 'OPTIMAL';

    if (edge.packetLossRate > 0.4) {
      this.handleMeshFault('PACKET_LOSS_SPIKE', `Packet loss spiked to ${(lossRate * 100).toFixed(0)}% on link ${edgeId}.`, edgeId);
    } else {
      this.recalculateAllRoutes();
    }
  }

  private handleMeshFault(trigger: SelfHealingEvent['trigger'], desc: string, targetEntityId: string) {
    const prevPath = this.activeRoute ? [...this.activeRoute.hopPath] : [];
    const startTime = performance.now();

    // Trigger Self-Healing Routing Recalculation
    const newRoute = this.calculateOptimalPath(this.selectedSourceNodeId, this.selectedTargetNodeId);
    const durationMs = Number((performance.now() - startTime + Math.random() * 25 + 15).toFixed(1));

    this.activeRoute = newRoute;

    // Record Self-Healing Event
    const event: SelfHealingEvent = {
      id: `heal-${Date.now()}`,
      timestamp: Date.now(),
      trigger,
      affectedSourceId: this.selectedSourceNodeId,
      affectedTargetId: this.selectedTargetNodeId,
      previousPath: prevPath,
      healedPath: newRoute.hopPath,
      recoveryDurationMs: durationMs,
      description: `${desc} Autonomous rebalancer re-routed traffic in ${durationMs}ms.`
    };

    this.healingHistory.unshift(event);
    if (this.healingHistory.length > 20) this.healingHistory.pop();

    systemLogManager.log(
      'WARN',
      'MESH_FABRIC',
      `[SELF-HEALING EVENT] ${event.description}`,
      { trigger, prevPath, healedPath: newRoute.hopPath, recoveryMs: durationMs }
    );

    this.notify();
  }

  // -------------------------------------------------------------
  // Dynamic Route Rebalancing & Strategy Selection
  // -------------------------------------------------------------
  public setRebalanceAlgorithm(algo: 'DIJKSTRA_ETX' | 'BELLMAN_FORD' | 'MULTI_METRIC_QOS') {
    this.healingRebalanceAlgorithm = algo;
    this.recalculateAllRoutes();
    systemLogManager.log('INFO', 'MESH_FABRIC', `Routing algorithm switched to ${algo}. Topology re-optimized.`, { algo });
  }

  public setRouteEndpoints(sourceId: string, targetId: string) {
    this.selectedSourceNodeId = sourceId;
    this.selectedTargetNodeId = targetId;
    this.recalculateAllRoutes();
  }

  public toggleAutoHealing() {
    this.isAutoHealingActive = !this.isAutoHealingActive;
    this.notify();
  }

  public triggerFullTopologyRebalance() {
    const startTime = performance.now();
    this.recalculateAllRoutes();
    const duration = Number((performance.now() - startTime + 8).toFixed(1));

    systemLogManager.log(
      'INFO',
      'MESH_FABRIC',
      `Full tactical mesh graph rebalance executed across ${this.nodes.length} nodes & ${this.edges.length} links in ${duration}ms.`,
      { nodes: this.nodes.length, edges: this.edges.length }
    );

    this.notify();
  }

  public moveNode(nodeId: string, x: number, y: number) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.x = Math.max(50, Math.min(950, x));
      node.y = Math.max(50, Math.min(950, y));

      // Dynamic RF link budget recalculation based on distance
      this.edges.forEach(edge => {
        if (edge.sourceId === nodeId || edge.targetId === nodeId) {
          const s = this.nodes.find(n => n.id === edge.sourceId);
          const t = this.nodes.find(n => n.id === edge.targetId);
          if (s && t) {
            const dist = Math.hypot(s.x - t.x, s.y - t.y);
            const pathLoss = (dist / 100) * 12 + 45; // Friis free space approximation
            edge.rssi = Number((-pathLoss).toFixed(1));
            edge.snr = Number((edge.rssi + 95).toFixed(1));
            edge.packetLossRate = edge.rssi < -85 ? 0.15 : edge.rssi < -75 ? 0.05 : 0.01;
            edge.etx = Number((1 / ((1 - edge.packetLossRate) * (1 - edge.packetLossRate))).toFixed(2));
            edge.latencyMs = Math.floor(dist * 0.04 + 10);
          }
        }
      });

      this.recalculateAllRoutes();
    }
  }

  // -------------------------------------------------------------
  // Simulation Loop
  // -------------------------------------------------------------
  private startSimulationLoop() {
    this.autoHealLoopInterval = setInterval(() => {
      // Small airborne UAV drift
      const uav = this.nodes.find(n => n.role === 'UAV_RELAY');
      if (uav && uav.isAlive) {
        const time = Date.now() / 6000;
        uav.x = 760 + Math.sin(time) * 50;
        uav.y = 220 + Math.cos(time) * 40;
      }

      // Random jitter on processing loads
      this.nodes.forEach(n => {
        n.processingLoadPercent = Math.max(10, Math.min(90, Math.floor(n.processingLoadPercent + (Math.random() - 0.5) * 6)));
      });

      if (this.isAutoHealingActive) {
        this.recalculateAllRoutes();
      }
    }, 2500);
  }

  // -------------------------------------------------------------
  // Getters & Subscription
  // -------------------------------------------------------------
  public getNodes(): MeshTopologyNode[] {
    return this.nodes;
  }

  public getEdges(): MeshTopologyEdge[] {
    return this.edges;
  }

  public getActiveRoute(): RoutePathResult | null {
    return this.activeRoute;
  }

  public getHealingHistory(): SelfHealingEvent[] {
    return this.healingHistory;
  }

  public getEndpoints(): { sourceId: string; targetId: string } {
    return { sourceId: this.selectedSourceNodeId, targetId: this.selectedTargetNodeId };
  }

  public getAlgorithm(): 'DIJKSTRA_ETX' | 'BELLMAN_FORD' | 'MULTI_METRIC_QOS' {
    return this.healingRebalanceAlgorithm;
  }

  public isAutoHealing(): boolean {
    return this.isAutoHealingActive;
  }

  public subscribe(cb: MeshSelfHealingListener): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }
}

export const meshSelfHealingManager = new MeshSelfHealingManager();
