import React, { useState } from 'react';
import { AgentNode, MeshLink, MeshPacket, ChaosSettings } from '../types';
import { meshFabric } from '../fabric/meshFabric';
import { 
  Shield, 
  Cpu, 
  Database, 
  Radio, 
  Network, 
  Award, 
  Lock, 
  Zap, 
  Activity, 
  Server, 
  RefreshCw, 
  Send, 
  AlertOctagon,
  CheckCircle,
  ExternalLink,
  Info,
  Crown,
  ShieldCheck,
  Users,
  Layers,
  Terminal,
  ArrowRight,
  GitFork,
  ArrowUpRight
} from 'lucide-react';

interface TopologyViewProps {
  nodes: AgentNode[];
  links: MeshLink[];
  packets: MeshPacket[];
  chaosSettings: ChaosSettings;
  onSendProbe: (sourceId: string, targetId: string) => void;
  onToggleSeverLink: (linkId: string) => void;
  onToggleIsolateNode: (nodeId: string) => void;
}

export const TopologyView: React.FC<TopologyViewProps> = ({
  nodes,
  links,
  packets,
  chaosSettings,
  onSendProbe,
  onToggleSeverLink,
  onToggleIsolateNode,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('node-me');
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [isExecutingPipeline, setIsExecutingPipeline] = useState<boolean>(false);
  const [pipelineMessage, setPipelineMessage] = useState<string | null>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedLink = links.find(l => l.id === selectedLinkId);

  const getRoleIcon = (role: AgentNode['role']) => {
    switch (role) {
      case 'command_me':
        return <Crown className="w-4 h-4 text-amber-400" />;
      case 'coordinator':
        return <Award className="w-4 h-4 text-indigo-400" />;
      case 'squad':
        return <Users className="w-4 h-4 text-emerald-400" />;
      case 'swarm':
        return <Layers className="w-4 h-4 text-cyan-400" />;
      case 'specialist':
        return <Terminal className="w-4 h-4 text-purple-400" />;
      case 'security_sentinel':
        return <Shield className="w-4 h-4 text-emerald-400" />;
      case 'mesh_bridge':
        return <Network className="w-4 h-4 text-blue-400" />;
      case 'compute_worker':
        return <Cpu className="w-4 h-4 text-purple-400" />;
      case 'vector_store':
        return <Database className="w-4 h-4 text-amber-400" />;
      case 'ingestion_node':
        return <Radio className="w-4 h-4 text-cyan-400" />;
      case 'consensus_leader':
        return <ShieldCheck className="w-4 h-4 text-indigo-400" />;
      default:
        return <Server className="w-4 h-4 text-slate-400" />;
    }
  };

  const getRoleBadge = (role: AgentNode['role']) => {
    switch (role) {
      case 'command_me':
        return { label: 'Command (Me)', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'coordinator':
        return { label: 'Coordinator', bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
      case 'squad':
        return { label: 'Tactical Squad', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'swarm':
        return { label: 'Autonomous Swarm', bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
      case 'specialist':
        return { label: 'Specialist', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case 'security_sentinel':
        return { label: 'Sentinel', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'mesh_bridge':
        return { label: 'Bridge Relay', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'compute_worker':
        return { label: 'Compute', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case 'vector_store':
        return { label: 'Vector Store', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'ingestion_node':
        return { label: 'Ingestion', bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
      case 'consensus_leader':
        return { label: 'Consensus', bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
      default:
        return { label: 'Agent', bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
    }
  };

  const handleRunHierarchyPipeline = async () => {
    if (isExecutingPipeline) return;
    setIsExecutingPipeline(true);
    setPipelineMessage('Phase 1: Me dispatching encrypted directives to Omnisary, Hermes, and Inquisitor...');

    setTimeout(() => {
      setPipelineMessage('Phase 2: Coordinators ordering Alpha/Bravo Squads, Swarms & Specialists...');
    }, 1200);

    setTimeout(() => {
      setPipelineMessage('Phase 3: Squads, Swarms & Specialists executing & feeding results to Inquisitor...');
    }, 2400);

    setTimeout(() => {
      setPipelineMessage('Phase 4: Inquisitor synthesizing proofs and delivering verified dossier back to Me!');
    }, 3600);

    setTimeout(() => {
      setIsExecutingPipeline(false);
      setPipelineMessage('Pipeline Complete: Verified dossier successfully ingested by Central Command (Me).');
      setTimeout(() => setPipelineMessage(null), 5000);
    }, 4800);

    await meshFabric.executeHierarchicalCommandPipeline('Operation Omega: Multi-Tier Coordinated Verification');
  };

  // Filter in-flight packets
  const inFlightPackets = packets.filter(p => p.status === 'in_flight');

  return (
    <div className="space-y-6">
      {/* Top Banner / Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <span>Fabric Topology & Command Hierarchy</span>
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                AES-256-GCM Encrypted Fabric
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Hierarchical encrypted routing: <span className="text-amber-400 font-semibold">Me</span> ➔ <span className="text-indigo-400 font-semibold">Coordinators (Omnisary, Hermes, Inquisitor)</span> ➔ <span className="text-cyan-400 font-semibold">Squads, Swarms & Specialists</span> ➔ <span className="text-emerald-400 font-semibold">Feed Results to Inquisitor</span> ➔ <span className="text-amber-400 font-semibold">Back to Me</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunHierarchyPipeline}
              disabled={isExecutingPipeline}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer ${
                isExecutingPipeline
                  ? 'bg-indigo-600/60 text-indigo-200 animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${isExecutingPipeline ? 'animate-spin' : ''}`} />
              <span>{isExecutingPipeline ? 'Executing Command Pipeline...' : 'Trigger Command Pipeline'}</span>
            </button>

            <button
              onClick={() => {
                onSendProbe('node-me', 'node-omnisary');
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors shadow-sm cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>Probe Me ➔ Omnisary</span>
            </button>
          </div>
        </div>

        {/* Live Pipeline Flow Notification */}
        {pipelineMessage && (
          <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-xs text-indigo-300">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span className="font-mono">{pipelineMessage}</span>
          </div>
        )}

        {/* Active Failover Alert */}
        {meshFabric.getActiveFailoverScenario() && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200">
            <div className="flex items-center space-x-2">
              <AlertOctagon className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span className="font-mono">
                <strong>COORDINATOR FAILOVER ENGAGED:</strong> {meshFabric.getActiveFailoverScenario()?.title} (Fallback Lead: <strong className="text-emerald-300">{meshFabric.getActiveFailoverScenario()?.fallbackCoordinator}</strong>)
              </span>
            </div>
            <button
              onClick={() => meshFabric.resetCoordinatorFailover()}
              className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
            >
              Reset Failover
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Visualizer on Left (col-span-8), Node / Link Inspector on Right (col-span-4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visualizer Canvas Area */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-xl p-4 relative overflow-hidden shadow-inner min-h-[550px] flex flex-col justify-between">
          {/* Subtle Grid Background Pattern */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          />

          {/* Interactive SVG for Link Lines, Tier Guidelines, and Animated Packets */}
          <svg className="absolute inset-0 w-full h-full pointer-events-auto" viewBox="0 0 800 480">
            <defs>
              <linearGradient id="activeLinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="severedLinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.6" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Subtle Tier Background Bands & Dividers */}
            <g className="pointer-events-none opacity-40">
              {/* Tier 1 Band: Central Command (Me) */}
              <rect x="20" y="15" width="760" height="85" rx="8" fill="#1e1b4b" fillOpacity="0.25" stroke="#6366f1" strokeWidth="0.75" strokeDasharray="4 4" />
              <text x="35" y="32" fill="#fbbf24" fontSize="10" fontFamily="monospace" fontWeight="bold" letterSpacing="1">
                TIER 1 • CENTRAL COMMAND (ME)
              </text>

              {/* Tier 2 Band: Coordinators */}
              <rect x="20" y="130" width="760" height="120" rx="8" fill="#0f172a" fillOpacity="0.3" stroke="#38bdf8" strokeWidth="0.75" strokeDasharray="4 4" />
              <text x="35" y="148" fill="#818cf8" fontSize="10" fontFamily="monospace" fontWeight="bold" letterSpacing="1">
                TIER 2 • COORDINATORS (OMNISARY • HERMES • INQUISITOR)
              </text>

              {/* Tier 3 Band: Execution Units */}
              <rect x="20" y="280" width="760" height="185" rx="8" fill="#022c22" fillOpacity="0.15" stroke="#10b981" strokeWidth="0.75" strokeDasharray="4 4" />
              <text x="35" y="298" fill="#34d399" fontSize="10" fontFamily="monospace" fontWeight="bold" letterSpacing="1">
                TIER 3 • EXECUTION UNITS (SQUADS • SWARMS • SPECIALISTS)
              </text>
              <text x="765" y="298" textAnchor="end" fill="#fbbf24" fontSize="9" fontFamily="monospace" fontWeight="600">
                ↺ ALL UNITS FEED RESULTS ➔ INQUISITOR ➔ ME
              </text>
            </g>

            {/* Render Links */}
            {links.map(link => {
              const source = nodes.find(n => n.id === link.sourceId);
              const target = nodes.find(n => n.id === link.targetId);
              if (!source || !target) return null;

              const isSevered = link.status === 'severed' || chaosSettings.severedLinks.includes(link.id);
              const isSelected = selectedLinkId === link.id;

              const midX = (source.x + target.x) / 2;
              const midY = (source.y + target.y) / 2;

              // Color-code link based on hierarchy role
              const isFeedbackToInquisitor = target.id === 'node-inquisitor' && source.tier === 'execution';
              const isCommandFromMe = source.id === 'node-me';

              let linkStroke = '#10b981';
              if (isSevered) linkStroke = '#ef4444';
              else if (isSelected) linkStroke = '#38bdf8';
              else if (isCommandFromMe) linkStroke = '#f59e0b';
              else if (isFeedbackToInquisitor) linkStroke = '#a855f7';

              return (
                <g 
                  key={link.id} 
                  className="cursor-pointer group"
                  onClick={() => {
                    setSelectedLinkId(link.id);
                    setSelectedNodeId(null);
                  }}
                >
                  {/* Invisible broader stroke for easy clicking */}
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="transparent"
                    strokeWidth="18"
                  />

                  {/* Main Link Line */}
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={linkStroke}
                    strokeWidth={isSelected ? 3.5 : isCommandFromMe ? 2.5 : 2}
                    strokeDasharray={isSevered ? '6 6' : isFeedbackToInquisitor ? '4 3' : 'none'}
                    strokeOpacity={isSevered ? 0.6 : 0.75}
                    className="transition-all duration-300 group-hover:stroke-cyan-400 group-hover:stroke-width-3"
                  />

                  {/* Link Metric Badge in Center */}
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x="-28"
                      y="-11"
                      width="56"
                      height="22"
                      rx="6"
                      fill={isSevered ? '#450a0a' : isSelected ? '#0f172a' : '#020617'}
                      stroke={isSevered ? '#ef4444' : isSelected ? '#38bdf8' : '#1e293b'}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill={isSevered ? '#f87171' : isFeedbackToInquisitor ? '#c084fc' : isCommandFromMe ? '#fbbf24' : '#94a3b8'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="600"
                    >
                      {isSevered ? 'SEVERED' : `${link.latencyMs}ms`}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Render In-Flight Packets Traveling Along Links */}
            {inFlightPackets.map(pkt => {
              if (!pkt.route || pkt.route.length < 2) return null;
              const fromNode = nodes.find(n => n.id === pkt.currentHopId);
              const nextHopIndex = pkt.hopIndex + 1;
              const nextHopId = pkt.route[nextHopIndex] || pkt.targetId;
              const toNode = nodes.find(n => n.id === nextHopId);

              if (!fromNode || !toNode) return null;

              // Compute interpolated position for packet
              const currentX = (fromNode.x + toNode.x) / 2;
              const currentY = (fromNode.y + toNode.y) / 2;

              return (
                <g key={pkt.id} transform={`translate(${currentX}, ${currentY})`}>
                  <circle r="9" fill="#10b981" filter="url(#glow)" opacity="0.9" />
                  <circle r="5" fill="#ffffff" />
                  <text
                    x="14"
                    y="3"
                    fill="#34d399"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    AES-GCM
                  </text>
                </g>
              );
            })}
          </svg>

          {/* HTML Overlay for Nodes */}
          <div className="relative w-full h-[460px] pointer-events-none">
            {nodes.map(node => {
              const isSelected = selectedNodeId === node.id;
              const isIsolated = node.status === 'ISOLATED' || chaosSettings.isolatedNodes.includes(node.id);
              const badge = getRoleBadge(node.role);

              return (
                <div
                  key={node.id}
                  id={`node-card-${node.id}`}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onClick={() => {
                    setSelectedNodeId(node.id);
                    setSelectedLinkId(null);
                  }}
                  className={`absolute pointer-events-auto cursor-pointer select-none transition-all duration-200 group ${
                    isSelected ? 'scale-110 z-20' : 'hover:scale-105 z-10'
                  }`}
                >
                  <div
                    className={`px-3 py-2 rounded-xl border backdrop-blur-md shadow-lg transition-colors ${
                      isIsolated
                        ? 'bg-rose-950/80 border-rose-500/60 shadow-rose-950/50'
                        : isSelected
                        ? 'bg-slate-900/95 border-cyan-400 ring-2 ring-cyan-500/30'
                        : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-500'
                    }`}
                  >
                    {/* Top Row: Icon, Name & Status Ring */}
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded-md bg-slate-800 border border-slate-700">
                        {getRoleIcon(node.role)}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                          <span>{node.name}</span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isIsolated
                                ? 'bg-rose-500 ring-2 ring-rose-500/40'
                                : 'bg-emerald-400 ring-2 ring-emerald-400/40'
                            }`}
                          />
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[9px] px-1 py-0.2 rounded border font-mono ${badge.bg}`}>
                            {badge.label}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {node.region}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Micro-telemetry bar */}
                    <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>CPU: {node.cpuPercent}%</span>
                      <span className="text-emerald-400">{node.cryptoOpsSec} ops/s</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Canvas Footer Legend */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-0.5 bg-emerald-500 rounded" />
                <span>Healthy Link (ECDH Encrypted)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-0.5 bg-rose-500 rounded stroke-dasharray" />
                <span>Severed Link (Chaos Injected)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>AES-GCM Payload in transit</span>
              </span>
            </div>
            <div className="text-slate-500 text-[11px]">
              Click any node or link to inspect cryptographic status
            </div>
          </div>
        </div>

        {/* Right Details Panel: Node or Link Inspector */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
          {selectedNode ? (
            <>
              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                      {getRoleIcon(selectedNode.role)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">{selectedNode.name}</h3>
                      <p className="text-xs text-slate-400 font-mono">{selectedNode.id}</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      selectedNode.status === 'ONLINE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {selectedNode.status}
                  </span>
                </div>
              </div>

              {/* Hierarchical Position & Role Details */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    Hierarchy Role & Data Flow
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {selectedNode.tier ? `Tier: ${selectedNode.tier}` : 'Active Unit'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {selectedNode.description || 'Distributed mesh peer participating in authenticated zero-knowledge cryptographic fabric.'}
                </p>
                <div className="pt-2 border-t border-slate-800/80 text-[11px] space-y-1 text-slate-400 font-mono">
                  {selectedNode.id === 'node-me' && (
                    <div className="text-amber-400 space-y-0.5">
                      <div>▲ <strong>Root Authority:</strong> Directs Omnisary, Hermes & Inquisitor</div>
                      <div>▼ <strong>Final Delivery:</strong> Receives verified synthesis from Inquisitor</div>
                    </div>
                  )}
                  {selectedNode.id === 'node-omnisary' && (
                    <div className="text-indigo-300 space-y-0.5">
                      <div>▲ <strong>Upstream:</strong> Dispatched by Command (Me)</div>
                      <div>▼ <strong>Orders:</strong> Alpha Tactical Squad, Bravo Recon Squad</div>
                      <div>⇄ <strong>Consensus:</strong> Cross-links with Hermes & Inquisitor</div>
                    </div>
                  )}
                  {selectedNode.id === 'node-hermes' && (
                    <div className="text-indigo-300 space-y-0.5">
                      <div>▲ <strong>Upstream:</strong> Dispatched by Command (Me)</div>
                      <div>▼ <strong>Orders:</strong> Sensor Drone Swarm, Compute Worker Swarm</div>
                      <div>⇄ <strong>Fast Relay:</strong> Low-latency mesh bridge</div>
                    </div>
                  )}
                  {selectedNode.id === 'node-inquisitor' && (
                    <div className="text-cyan-300 space-y-0.5">
                      <div>▲ <strong>Upstream:</strong> Dispatched by Command (Me)</div>
                      <div>▼ <strong>Orders:</strong> Cipher Specialist, Forensic Specialist</div>
                      <div>◀ <strong>Ingestion Hub:</strong> Audits proof feeds from ALL Squads/Swarms/Specialists</div>
                      <div>▲ <strong>Report Return:</strong> Delivers signed aggregate dossier back to Me</div>
                    </div>
                  )}
                  {selectedNode.tier === 'execution' && (
                    <div className="text-emerald-400 space-y-0.5">
                      <div>▲ <strong>Subordinate To:</strong> Coordinator Command</div>
                      <div>➔ <strong>Result Destination:</strong> Feeds proofs directly to Inquisitor ➔ back to Me</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cryptographic Identity Section */}
              <div className="space-y-3 bg-slate-950 border border-slate-800/80 rounded-lg p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    Cryptographic Identity
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">ECDH P-256</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">
                      SHA-256 Key Fingerprint
                    </span>
                    <span className="font-mono text-cyan-300 text-[11px] select-all bg-slate-900 px-2 py-1 rounded block border border-slate-800 mt-0.5">
                      {selectedNode.fingerprint}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">
                      Public Key Spec
                    </span>
                    <span className="font-mono text-slate-400 text-[10px] select-all bg-slate-900 px-2 py-1 rounded block border border-slate-800 mt-0.5 truncate">
                      {selectedNode.publicKeyRaw}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>Cipher Suite</span>
                    <span className="font-mono text-slate-200">AES-256-GCM / 128-tag</span>
                  </div>
                </div>
              </div>

              {/* Hardware & Mesh Telemetry */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Hardware & Network Telemetry
                </h4>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-800/60 border border-slate-700/50 p-2.5 rounded-lg">
                    <span className="text-slate-400 block text-[10px]">CPU Load</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="font-mono text-sm font-semibold text-slate-100">
                        {selectedNode.cpuPercent}%
                      </span>
                      <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            selectedNode.cpuPercent > 75 ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${selectedNode.cpuPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/60 border border-slate-700/50 p-2.5 rounded-lg">
                    <span className="text-slate-400 block text-[10px]">RAM Allocated</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="font-mono text-sm font-semibold text-slate-100">
                        {selectedNode.memoryMb} MB
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        / {selectedNode.maxMemoryMb}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-800/60 border border-slate-700/50 p-2.5 rounded-lg">
                    <span className="text-slate-400 block text-[10px]">Packets TX/RX</span>
                    <div className="font-mono text-xs font-semibold text-slate-200 mt-1">
                      {selectedNode.packetsSent} / {selectedNode.packetsReceived}
                    </div>
                  </div>

                  <div className="bg-slate-800/60 border border-slate-700/50 p-2.5 rounded-lg">
                    <span className="text-slate-400 block text-[10px]">Crypto Throughput</span>
                    <div className="font-mono text-xs font-semibold text-emerald-400 mt-1">
                      {selectedNode.cryptoOpsSec} ops/s
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/40 rounded-lg p-2.5 border border-slate-800 text-xs space-y-1 text-slate-400">
                  <div className="flex justify-between">
                    <span>Mesh IP:</span>
                    <span className="font-mono text-slate-200">{selectedNode.ipAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Region Cluster:</span>
                    <span className="font-mono text-slate-200">{selectedNode.region}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uptime:</span>
                    <span className="font-mono text-slate-200">{Math.floor(selectedNode.uptimeSeconds / 3600)}h {Math.floor((selectedNode.uptimeSeconds % 3600) / 60)}m</span>
                  </div>
                </div>
              </div>

              {/* Node Actions */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <button
                  onClick={() => {
                    const otherNodes = nodes.filter(n => n.id !== selectedNode.id);
                    if (otherNodes.length > 0) {
                      onSendProbe(selectedNode.id, otherNodes[0].id);
                    }
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Encrypted Probe to Peer</span>
                </button>

                <button
                  onClick={() => onToggleIsolateNode(selectedNode.id)}
                  className={`w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    selectedNode.status === 'ISOLATED'
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>{selectedNode.status === 'ISOLATED' ? 'Reintegrate Node' : 'Simulate Node Isolation'}</span>
                </button>
              </div>
            </>
          ) : selectedLink ? (
            <>
              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">Mesh Link Details</h3>
                    <p className="text-xs text-slate-400 font-mono">{selectedLink.id}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      selectedLink.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {selectedLink.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Connected Peers */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
                <span className="text-slate-400 text-[10px] uppercase font-mono block">Bridged Peer Nodes</span>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{selectedLink.sourceId}</span>
                  <span className="text-slate-600 font-mono">◀═▶</span>
                  <span className="font-semibold text-slate-200">{selectedLink.targetId}</span>
                </div>
              </div>

              {/* Link Telemetry */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-800/60 border border-slate-700/50 p-2.5 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">Round-Trip Latency</span>
                  <span className="font-mono text-sm font-semibold text-cyan-400 mt-1 block">
                    {selectedLink.latencyMs} ms
                  </span>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/50 p-2.5 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">Jitter Variation</span>
                  <span className="font-mono text-sm font-semibold text-slate-200 mt-1 block">
                    ±{selectedLink.jitterMs} ms
                  </span>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/50 p-2.5 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">Packet Loss</span>
                  <span className="font-mono text-sm font-semibold text-emerald-400 mt-1 block">
                    {selectedLink.packetLossPercent}%
                  </span>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/50 p-2.5 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">Max Bandwidth</span>
                  <span className="font-mono text-sm font-semibold text-slate-200 mt-1 block">
                    {selectedLink.bandwidthMbps} Mbps
                  </span>
                </div>
              </div>

              {/* Security Cipher on Link */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Cipher Suite</span>
                  <span className="font-mono text-[11px] text-emerald-400">{selectedLink.cipherSuite}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Shared Secret ID</span>
                  <span className="font-mono text-[11px] text-cyan-300">{selectedLink.sharedSecretFingerprint}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Total Transferred</span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {(selectedLink.bytesTransferred / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onToggleSeverLink(selectedLink.id)}
                  className={`w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    selectedLink.status === 'severed'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600'
                      : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>{selectedLink.status === 'severed' ? 'Repair & Re-establish Link' : 'Sever Link (Chaos Test)'}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">
              <Info className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              Select an agent node or link in the topology to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
