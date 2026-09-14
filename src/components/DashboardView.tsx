import React, { useState } from 'react';
import { AgentNode, MeshLink, NetworkMetrics, ChaosSettings } from '../types';
import { meshFabric } from '../fabric/meshFabric';
import { 
  Activity, 
  ShieldCheck, 
  Cpu, 
  HardDrive, 
  Wifi, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  Server, 
  Zap, 
  Clock, 
  Radio, 
  ExternalLink,
  Crown,
  Award,
  Users,
  Layers,
  Terminal,
  ArrowRight,
  GitMerge
} from 'lucide-react';

interface DashboardViewProps {
  nodes: AgentNode[];
  links: MeshLink[];
  metrics: NetworkMetrics;
  chaosSettings: ChaosSettings;
  onSendProbe: (sourceId: string, targetId: string) => void;
  onToggleIsolateNode: (nodeId: string) => void;
  onToggleSeverLink: (linkId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  nodes,
  links,
  metrics,
  chaosSettings,
  onSendProbe,
  onToggleIsolateNode,
  onToggleSeverLink,
}) => {
  const [isExecutingPipeline, setIsExecutingPipeline] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<string | null>(null);

  const getRoleBadgeClass = (role: AgentNode['role']) => {
    switch (role) {
      case 'command_me':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'coordinator':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'squad':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'swarm':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'specialist':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'security_sentinel':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'mesh_bridge':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'compute_worker':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'vector_store':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'ingestion_node':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'consensus_leader':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const handleRunCommandCycle = async () => {
    if (isExecutingPipeline) return;
    setIsExecutingPipeline(true);
    setPipelineStatus('1/4: Command (Me) issuing encrypted orders to Coordinators...');

    setTimeout(() => {
      setPipelineStatus('2/4: Coordinators (Omnisary, Hermes, Inquisitor) ordering Squads, Swarms & Specialists...');
    }, 1200);

    setTimeout(() => {
      setPipelineStatus('3/4: Execution units compiling cryptographic proofs & feeding directly to Inquisitor...');
    }, 2400);

    setTimeout(() => {
      setPipelineStatus('4/4: Inquisitor auditing all evidence and returning finalized dossier to Command (Me)!');
    }, 3600);

    setTimeout(() => {
      setIsExecutingPipeline(false);
      setPipelineStatus('Cycle Complete: All unit results verified and safely delivered back to Me.');
      setTimeout(() => setPipelineStatus(null), 4000);
    }, 4800);

    await meshFabric.executeHierarchicalCommandPipeline('Executive Task: Recon & Security Audit Directive');
  };

  return (
    <div className="space-y-6">
      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Fabric Health Index */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Mesh Fabric Health</span>
            <div className={`p-2 rounded-lg ${
              metrics.meshHealthScore > 90 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
            }`}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className={`text-2xl font-bold font-mono ${
              metrics.meshHealthScore > 90 ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {metrics.meshHealthScore}%
            </span>
            <span className="text-xs text-slate-400">
              {metrics.onlineNodes}/{metrics.totalNodes} Nodes Active
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                metrics.meshHealthScore > 90 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${metrics.meshHealthScore}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Redundancy: Optimal</span>
            <span className="text-slate-300 font-mono">{metrics.activeLinks}/{metrics.totalLinks} Links</span>
          </div>
        </div>

        {/* Metric 2: Cryptographic Verification */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Cryptographic Security</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              100%
            </span>
            <span className="text-xs text-slate-400">
              AES-256-GCM
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Throughput:</span>
            <span className="text-emerald-400 font-mono font-medium">{metrics.totalCryptoOps} ops/s</span>
          </div>
        </div>

        {/* Metric 3: Round-Trip Latency */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Avg Mesh Latency</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Wifi className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-cyan-300">
              {metrics.avgLatencyMs} ms
            </span>
            <span className="text-xs text-slate-400">
              Packet Loss: {metrics.avgPacketLoss}%
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-cyan-500 rounded-full" 
              style={{ width: `${Math.min(100, Math.max(10, (metrics.avgLatencyMs / 150) * 100))}%` }} 
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Jitter: ±2.1 ms</span>
            <span className="text-slate-300 font-mono">Dijkstra Paths</span>
          </div>
        </div>

        {/* Metric 4: Fabric Throughput */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Fabric Bandwidth</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-purple-300">
              {metrics.totalThroughputKbps} Kbps
            </span>
            <span className="text-xs text-slate-400">
              Total Tx/Rx
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: '68%' }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Frames Handled:</span>
            <span className="text-slate-300 font-mono">{metrics.totalPacketsDelivered} pkts</span>
          </div>
        </div>
      </div>

      {/* Command Delegation & Results Pipeline Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <span>Command & Delegation Hierarchy Flow</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Strict 3-Tier Architecture
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Direct encrypted order line: Me ➔ Coordinators ➔ Squads, Swarms & Specialists ➔ Results Feed to Inquisitor ➔ Verified Dossier to Me
              </p>
            </div>
          </div>

          <button
            onClick={handleRunCommandCycle}
            disabled={isExecutingPipeline}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isExecutingPipeline 
                ? 'bg-indigo-600/50 text-indigo-200 animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isExecutingPipeline ? 'animate-spin' : ''}`} />
            <span>{isExecutingPipeline ? 'Executing Command Cycle...' : 'Trigger Full Command Cycle'}</span>
          </button>
        </div>

        {pipelineStatus && (
          <div className="px-3.5 py-2 rounded-lg bg-indigo-950/70 border border-indigo-500/30 text-xs text-indigo-200 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span className="font-mono">{pipelineStatus}</span>
          </div>
        )}

        {/* Visual 4-Step Pipeline Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Step 1: Command (Me) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-1 relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-400 font-mono">1. COMMAND (ME)</span>
              <Crown className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-xs text-slate-200 font-medium">Supreme Authority</p>
            <p className="text-[10px] text-slate-400 leading-snug">
              Issues AES-256 encrypted directives to Omnisary, Hermes & Inquisitor.
            </p>
          </div>

          {/* Step 2: Coordinators */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-1 relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-400 font-mono">2. COORDINATORS</span>
              <Award className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <p className="text-xs text-slate-200 font-medium">Omnisary • Hermes • Inquisitor</p>
            <p className="text-[10px] text-slate-400 leading-snug">
              Split tasks & dispatch directives down to Squads, Swarms and Specialists.
            </p>
          </div>

          {/* Step 3: Execution Units */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-1 relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-400 font-mono">3. EXECUTION UNITS</span>
              <Users className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-xs text-slate-200 font-medium">Squads • Swarms • Specialists</p>
            <p className="text-[10px] text-slate-400 leading-snug">
              Execute operations & feed all raw results directly into Inquisitor.
            </p>
          </div>

          {/* Step 4: Inquisitor Audit & Delivery */}
          <div className="bg-slate-950/80 border border-cyan-900/50 rounded-lg p-3 space-y-1 relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-cyan-400 font-mono">4. AUDIT & RETURN</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <p className="text-xs text-slate-200 font-medium">Inquisitor ➔ Me</p>
            <p className="text-[10px] text-slate-400 leading-snug">
              Inquisitor verifies cryptographic proofs and delivers final dossier to Me.
            </p>
          </div>
        </div>
      </div>

      {/* Distributed System Node Status Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Distributed Agent Node Statuses</span>
            </h3>
            <p className="text-xs text-slate-400">
              Live computational resource usage, crypto pipelines, and connectivity per node
            </p>
          </div>
          <div className="text-xs text-slate-400">
            <span className="text-emerald-400 font-semibold">{nodes.filter(n => n.status === 'ONLINE').length}</span> of {nodes.length} Nodes Healthy
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-mono text-[11px] uppercase">
              <tr>
                <th className="py-3 px-4">Agent Node</th>
                <th className="py-3 px-4">Role & Region</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">CPU Utilization</th>
                <th className="py-3 px-4">Memory</th>
                <th className="py-3 px-4">Crypto Throughput</th>
                <th className="py-3 px-4">Packets TX / RX</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {nodes.map(node => {
                const isIsolated = node.status === 'ISOLATED' || chaosSettings.isolatedNodes.includes(node.id);
                return (
                  <tr key={node.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Node Name & Fingerprint */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                        <span>{node.name}</span>
                      </div>
                      <div className="text-[10px] text-cyan-400 font-mono mt-0.5">
                        FP: {node.fingerprint}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        IP: {node.ipAddress}
                      </div>
                    </td>

                    {/* Role & Region & Hierarchy Tier */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded border font-mono font-semibold ${getRoleBadgeClass(node.role)}`}>
                          {node.role === 'command_me' 
                            ? 'COMMAND (ME)' 
                            : node.role === 'coordinator' 
                            ? 'COORDINATOR' 
                            : node.role === 'squad'
                            ? 'TACTICAL SQUAD'
                            : node.role === 'swarm'
                            ? 'SWARM'
                            : node.role === 'specialist'
                            ? 'SPECIALIST'
                            : node.role.replace('_', ' ').toUpperCase()}
                        </span>
                        {node.tier && (
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                            {node.tier}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-1">
                        {node.region}
                      </div>
                      {node.description && (
                        <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 max-w-[200px]" title={node.description}>
                          {node.description}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        isIsolated
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isIsolated ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                        {isIsolated ? 'ISOLATED' : 'ONLINE'}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        up {Math.floor(node.uptimeSeconds / 3600)}h {Math.floor((node.uptimeSeconds % 3600) / 60)}m
                      </div>
                    </td>

                    {/* CPU */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-slate-200 font-semibold w-8">{node.cpuPercent}%</span>
                        <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              node.cpuPercent > 70 ? 'bg-rose-500' : node.cpuPercent > 45 ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${node.cpuPercent}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {node.activeThreads} active threads
                      </span>
                    </td>

                    {/* Memory */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="text-slate-200">
                        {node.memoryMb} MB
                      </div>
                      <div className="text-[10px] text-slate-500">
                        cap: {node.maxMemoryMb} MB
                      </div>
                    </td>

                    {/* Crypto Throughput */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="text-emerald-400 font-medium">
                        {node.cryptoOpsSec} ops/s
                      </div>
                      <div className="text-[10px] text-slate-500">
                        0 verification errs
                      </div>
                    </td>

                    {/* Packets */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                      <div className="flex items-center space-x-1 text-slate-200">
                        <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                        <span>{node.packetsSent}</span>
                        <span className="text-slate-600">/</span>
                        <ArrowDownLeft className="w-3 h-3 text-cyan-400" />
                        <span>{node.packetsReceived}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          const target = nodes.find(n => n.id !== node.id);
                          if (target) onSendProbe(node.id, target.id);
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition-colors cursor-pointer"
                        title="Send Encrypted Probe Frame"
                      >
                        Probe
                      </button>
                      <button
                        onClick={() => onToggleIsolateNode(node.id)}
                        className={`px-2 py-1 rounded text-[11px] border transition-colors cursor-pointer ${
                          isIsolated
                            ? 'bg-slate-800 text-slate-200 border-slate-700'
                            : 'bg-rose-500/10 text-rose-300 border-rose-500/20 hover:bg-rose-500/20'
                        }`}
                        title="Simulate network isolation"
                      >
                        {isIsolated ? 'Restore' : 'Isolate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Network Fabric Links Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span>Mesh Connection Bridges & Routing Status</span>
            </h3>
            <p className="text-xs text-slate-400">
              Active peer links, cryptographic cipher negotiation, and latency metrics
            </p>
          </div>
          <div className="text-xs font-mono text-emerald-400">
            All links verified with ECDH session keys
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-mono text-[11px] uppercase">
              <tr>
                <th className="py-3 px-4">Link ID</th>
                <th className="py-3 px-4">Source ↔ Target</th>
                <th className="py-3 px-4">Latency & Jitter</th>
                <th className="py-3 px-4">Loss & Bandwidth</th>
                <th className="py-3 px-4">Cipher Negotiation</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4 text-right">Chaos Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {links.map(link => {
                const isSevered = link.status === 'severed' || chaosSettings.severedLinks.includes(link.id);
                return (
                  <tr key={link.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {link.id}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-200">
                      <span className="text-cyan-400">{link.sourceId}</span>
                      <span className="text-slate-500 mx-1.5">◀═▶</span>
                      <span className="text-cyan-400">{link.targetId}</span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className="text-slate-100 font-semibold">{link.latencyMs} ms</span>
                      <span className="text-slate-500 text-[10px] ml-1.5">±{link.jitterMs}ms</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <span className={link.packetLossPercent > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                        {link.packetLossPercent}%
                      </span>
                      <span className="text-slate-500 mx-1">|</span>
                      <span className="text-slate-300">{link.bandwidthMbps} Mbps</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5 text-slate-300 text-[11px]">
                        <Lock className="w-3 h-3 text-emerald-400" />
                        <span className="font-mono text-[10px]">{link.cipherSuite}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        SecFp: {link.sharedSecretFingerprint}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                        isSevered
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {isSevered ? 'SEVERED' : 'ESTABLISHED'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onToggleSeverLink(link.id)}
                        className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                          isSevered
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600'
                            : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/20'
                        }`}
                      >
                        {isSevered ? 'Repair' : 'Sever'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
