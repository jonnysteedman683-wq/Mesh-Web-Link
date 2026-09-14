import React, { useState, useEffect } from 'react';
import { AgentNode, MeshLink, ChaosSettings, CoordinatorFailoverScenario, FailoverEventLog } from '../types';
import { meshFabric, MeshFabricManager } from '../fabric/meshFabric';
import { 
  Flame, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Sliders, 
  Zap, 
  Radio, 
  ShieldAlert, 
  Activity, 
  Layers, 
  WifiOff,
  Crown,
  Award,
  Users,
  Terminal,
  ArrowRight,
  ShieldCheck,
  Lock,
  Clock,
  Play,
  CheckCircle,
  AlertOctagon
} from 'lucide-react';

interface ResilienceSandboxViewProps {
  nodes: AgentNode[];
  links: MeshLink[];
  chaosSettings: ChaosSettings;
  onToggleSeverLink: (linkId: string) => void;
  onToggleIsolateNode: (nodeId: string) => void;
  onSetPacketLoss: (enabled: boolean, rate: number) => void;
  onSetLatencyChaos: (enabled: boolean, addedMs: number) => void;
  onHealAll: () => void;
  onRunResilienceTest: () => Promise<void>;
}

export const ResilienceSandboxView: React.FC<ResilienceSandboxViewProps> = ({
  nodes,
  links,
  chaosSettings,
  onToggleSeverLink,
  onToggleIsolateNode,
  onSetPacketLoss,
  onSetLatencyChaos,
  onHealAll,
  onRunResilienceTest,
}) => {
  const [isRunningTest, setIsRunningTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Coordinator Failover state
  const [selectedScenarioId, setSelectedScenarioId] = useState<CoordinatorFailoverScenario['id']>('omnisary_blackout');
  const [isSimulatingFailover, setIsSimulatingFailover] = useState<boolean>(false);
  const [failoverLogs, setFailoverLogs] = useState<FailoverEventLog[]>(() => meshFabric.getFailoverLogs());
  const [failoverSummary, setFailoverSummary] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const activeFailover = meshFabric.getActiveFailoverScenario();
  const scenarios = MeshFabricManager.FAILOVER_SCENARIOS;
  const currentScenario = scenarios.find(s => s.id === selectedScenarioId) || scenarios[0];

  // Refresh logs when fabric updates
  useEffect(() => {
    const unsub = meshFabric.subscribe(() => {
      setFailoverLogs([...meshFabric.getFailoverLogs()]);
    });
    return () => unsub();
  }, []);

  const handleRunTest = async () => {
    setIsRunningTest(true);
    setTestResult(null);
    try {
      await onRunResilienceTest();
      setTestResult('Fabric successfully re-routed encrypted packets through alternate active mesh bridges!');
    } catch {
      setTestResult('Network partitioned: No alternate route found for current topology.');
    } finally {
      setIsRunningTest(false);
    }
  };

  const handleLaunchFailoverSimulation = async (scenarioId: CoordinatorFailoverScenario['id']) => {
    if (isSimulatingFailover) return;
    setIsSimulatingFailover(true);
    setFailoverSummary(null);
    setCurrentStep(1);

    const stepTimers = [
      setTimeout(() => setCurrentStep(2), 650),
      setTimeout(() => setCurrentStep(3), 1350),
      setTimeout(() => setCurrentStep(4), 2100),
      setTimeout(() => setCurrentStep(5), 3600),
    ];

    try {
      const res = await meshFabric.triggerCoordinatorFailoverScenario(scenarioId, (newLog) => {
        setFailoverLogs(prev => [newLog, ...prev]);
      });
      setCurrentStep(5);
      setFailoverSummary(res.dossierSummary);
    } catch (err: any) {
      setFailoverSummary(`Simulation error: ${err?.message || 'Failover execution interrupted'}`);
    } finally {
      stepTimers.forEach(clearTimeout);
      setIsSimulatingFailover(false);
    }
  };

  const handleResetFailover = () => {
    meshFabric.resetCoordinatorFailover();
    setCurrentStep(0);
    setFailoverSummary(null);
  };

  const isAnyChaosActive =
    chaosSettings.severedLinks.length > 0 ||
    chaosSettings.isolatedNodes.length > 0 ||
    chaosSettings.packetLossEnabled ||
    chaosSettings.highLatencySimulation;

  const coordinators = nodes.filter(n => n.role === 'coordinator');
  const offlineCoordinators = coordinators.filter(c => chaosSettings.isolatedNodes.includes(c.id));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-400" />
            <span>Resilience Engineering & Coordinator Failover Sandbox</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Test self-healing mesh routing, dynamic coordinator succession, and Byzantine consensus failover
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {isAnyChaosActive && (
            <button
              onClick={() => {
                handleResetFailover();
                onHealAll();
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restore Entire Fabric</span>
            </button>
          )}

          <button
            onClick={handleRunTest}
            disabled={isRunningTest}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isRunningTest ? 'Testing Fabric...' : 'Run Auto-Route Test'}</span>
          </button>
        </div>
      </div>

      {testResult && (
        <div className="bg-cyan-950/40 border border-cyan-500/40 rounded-xl p-4 text-xs font-mono text-cyan-200 flex items-center justify-between">
          <span>{testResult}</span>
          <button onClick={() => setTestResult(null)} className="text-slate-400 hover:text-slate-200">✕</button>
        </div>
      )}

      {/* SECTION 1: DEDICATED COORDINATOR FAILOVER & SUCCESSION ENGINE */}
      <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-5 shadow-lg space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>Tier-2 Coordinator Failover & Autonomous Succession</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    offlineCoordinators.length > 0
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {offlineCoordinators.length > 0 
                      ? `FAILOVER ACTIVE (${offlineCoordinators.length} Coordinator Offline)` 
                      : 'ALL 3 COORDINATORS NOMINAL'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Test Byzantine quorum elections and autonomous unit adoption when Omnisary, Hermes, or Inquisitor goes offline
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeFailover && (
              <button
                onClick={handleResetFailover}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Heal Coordinator Mesh</span>
              </button>
            )}

            <button
              onClick={() => handleLaunchFailoverSimulation(selectedScenarioId)}
              disabled={isSimulatingFailover}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Play className={`w-3.5 h-3.5 ${isSimulatingFailover ? 'animate-spin' : ''}`} />
              <span>{isSimulatingFailover ? 'Executing Failover Protocol...' : 'Simulate Failover Scenario'}</span>
            </button>
          </div>
        </div>

        {/* Failover Scenarios Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {scenarios.map((sc) => {
            const isSelected = selectedScenarioId === sc.id;
            const isCurrentlyActive = activeFailover?.id === sc.id;

            return (
              <div
                key={sc.id}
                onClick={() => setSelectedScenarioId(sc.id)}
                className={`p-3.5 rounded-xl border text-xs transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/50 shadow-md'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                {isCurrentlyActive && (
                  <span className="absolute top-2 right-2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    ACTIVE NOW
                  </span>
                )}

                <div>
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    <span>{sc.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                    {sc.description}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5 text-[10px] font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Offline:</span>
                    <span className="text-rose-400 font-semibold">{sc.offlineCoordinators.join(', ')}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Fallback Lead:</span>
                    <span className="text-emerald-400 font-semibold">{sc.fallbackCoordinator}</span>
                  </div>
                  <div className="text-slate-500 text-[9px] pt-1">
                    Adopted: {sc.adoptedUnits.length} execution units
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 5-Step Failover Protocol Stepper */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-300 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>Real-Time Failover Succession Protocol</span>
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Scenario: <span className="text-indigo-300">{currentScenario.title}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
            {[
              { num: 1, label: 'Heartbeat Timeout', desc: 'Missed 3 pings (>3000ms)' },
              { num: 2, label: 'Byzantine Quorum', desc: 'Epoch election ratified' },
              { num: 3, label: 'ECDH Renegotiation', desc: 'New AES-256-GCM session' },
              { num: 4, label: 'Directive Rerouting', desc: 'Orders via fallback lead' },
              { num: 5, label: 'Dossier Delivered', desc: 'Proofs attested back to Me' },
            ].map((step) => {
              const isPassed = currentStep >= step.num;
              const isCurrent = currentStep === step.num && isSimulatingFailover;

              return (
                <div
                  key={step.num}
                  className={`p-2.5 rounded-lg border transition-all ${
                    isCurrent
                      ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200 animate-pulse'
                      : isPassed
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-900/50 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] font-bold">STAGE {step.num}</span>
                    {isPassed ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </div>
                  <div className="font-semibold text-[11px]">{step.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{step.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Failover Summary Notification if Complete */}
        {failoverSummary && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3.5 text-xs text-emerald-200 font-mono flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold">Protocol Validated: </span>
                <span>{failoverSummary}</span>
              </div>
            </div>
            <button
              onClick={() => setFailoverSummary(null)}
              className="text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Live Failover Event Log Stream */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <h4 className="font-semibold text-slate-300 flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Consensus & Cryptographic Succession Event Log</span>
            </h4>
            <span className="text-[11px] font-mono text-slate-500">
              {failoverLogs.length} events logged
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 font-mono text-[11px] pr-1">
            {failoverLogs.length === 0 ? (
              <div className="text-slate-600 text-center py-4">
                No failover events recorded yet. Click &ldquo;Simulate Failover Scenario&rdquo; above to run.
              </div>
            ) : (
              failoverLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 rounded border flex items-start justify-between gap-2 transition-colors ${
                    log.status === 'danger'
                      ? 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                      : log.status === 'warning'
                      ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                      : log.status === 'success'
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-slate-500 text-[10px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded border font-bold ${
                      log.stage === 'heartbeat_loss'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : log.stage === 'consensus_election'
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : log.stage === 'handshake_renewal'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : log.stage === 'directive_rerouted'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {log.stage.replace('_', ' ')}
                    </span>
                    <span className="leading-snug">{log.message}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">
                    [{log.sourceNodeId}]
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: CHAOS CONTROLS (SEVERING & PACKET LOSS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Link Severing & Node Isolation Controls */}
        <div className="lg:col-span-6 space-y-4">
          {/* Link Severing Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-amber-400" />
                <span>Simulate Link Severance (Partition Mesh)</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">
                {chaosSettings.severedLinks.length} Severed
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Click any link to sever it. The mesh fabric will dynamically re-route traffic through alternate peer bridges.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {links.map(link => {
                const isSevered = chaosSettings.severedLinks.includes(link.id);
                return (
                  <div
                    key={link.id}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                      isSevered
                        ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="font-mono">
                      <span className="font-semibold text-slate-100">{link.sourceId}</span>
                      <span className="text-slate-500 mx-1.5">◀═▶</span>
                      <span className="font-semibold text-slate-100">{link.targetId}</span>
                      <span className="text-[10px] text-slate-500 ml-2">({link.latencyMs}ms)</span>
                    </div>

                    <button
                      onClick={() => onToggleSeverLink(link.id)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        isSevered
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {isSevered ? 'Repair' : 'Sever'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Node Isolation Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Simulate Node Blackout / Isolation</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">
                {chaosSettings.isolatedNodes.length} Isolated
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Isolate an agent node from the mesh fabric to test decentralized consensus resilience.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {nodes.map(node => {
                const isIsolated = chaosSettings.isolatedNodes.includes(node.id);
                return (
                  <button
                    key={node.id}
                    onClick={() => onToggleIsolateNode(node.id)}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                      isIsolated
                        ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold flex items-center justify-between">
                      <span>{node.name}</span>
                      {node.role === 'coordinator' && (
                        <span className="text-[9px] px-1 rounded bg-indigo-500/20 text-indigo-300 font-mono">COORD</span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono mt-0.5 text-slate-400">
                      {isIsolated ? 'ISOLATED' : 'ONLINE'} • {node.region}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Traffic Degradation */}
        <div className="lg:col-span-6 space-y-4">
          {/* Packet Loss Degradation */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Simulate Network Packet Loss</span>
              </h3>
              <input
                type="checkbox"
                checked={chaosSettings.packetLossEnabled}
                onChange={e => onSetPacketLoss(e.target.checked, chaosSettings.packetLossRate)}
                className="rounded text-emerald-500 focus:ring-0 cursor-pointer"
              />
            </div>
            <p className="text-xs text-slate-400">
              Randomly drops in-flight packets based on configured probability to test retry acknowledgements.
            </p>

            <div>
              <div className="flex justify-between text-xs text-slate-300 font-mono mb-1">
                <span>Packet Loss Rate:</span>
                <span className="text-cyan-400 font-bold">{chaosSettings.packetLossRate}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={chaosSettings.packetLossRate}
                disabled={!chaosSettings.packetLossEnabled}
                onChange={e => onSetPacketLoss(true, parseInt(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer disabled:opacity-40"
              />
            </div>
          </div>

          {/* High Latency & Jitter Injection */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span>Inject Global High Latency (+{chaosSettings.addedLatencyMs} ms)</span>
              </h3>
              <input
                type="checkbox"
                checked={chaosSettings.highLatencySimulation}
                onChange={e => onSetLatencyChaos(e.target.checked, chaosSettings.addedLatencyMs)}
                className="rounded text-purple-500 focus:ring-0 cursor-pointer"
              />
            </div>
            <p className="text-xs text-slate-400">
              Artificially increases round-trip propagation delays across all mesh bridges to test timeout tolerance.
            </p>

            <div>
              <div className="flex justify-between text-xs text-slate-300 font-mono mb-1">
                <span>Added Latency:</span>
                <span className="text-purple-400 font-bold">+{chaosSettings.addedLatencyMs} ms</span>
              </div>
              <input
                type="range"
                min="50"
                max="300"
                step="25"
                value={chaosSettings.addedLatencyMs}
                disabled={!chaosSettings.highLatencySimulation}
                onChange={e => onSetLatencyChaos(true, parseInt(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer disabled:opacity-40"
              />
            </div>
          </div>

          {/* Self-Healing Architecture Details */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
            <span className="font-semibold text-slate-200 block">
              Dynamic Shortest-Path Mesh Routing:
            </span>
            <p className="text-slate-400 leading-relaxed">
              When peer links are severed, the routing engine calculates Dijkstra shortest path spanning trees avoiding broken or degraded edges. When a coordinator fails, remaining coordinators trigger Byzantine quorum consensus, adopt subordinate units, and renegotiate ephemeral cryptographic sessions without losing connectivity back to Central Command (Me).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

