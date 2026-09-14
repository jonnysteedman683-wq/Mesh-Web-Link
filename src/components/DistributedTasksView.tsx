import React, { useState } from 'react';
import { AgentNode, CollaborativeTask } from '../types';
import { meshFabric } from '../fabric/meshFabric';
import { 
  Cpu, 
  Play, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Layers, 
  Award, 
  Lock, 
  ArrowRight, 
  Database, 
  Plus, 
  Crown, 
  Zap,
  Users,
  Radio,
  Sparkles,
  Filter,
  CheckSquare,
  Square,
  ChevronRight,
  Shield,
  Flame,
  Check
} from 'lucide-react';

interface DistributedTasksViewProps {
  nodes: AgentNode[];
  tasks: CollaborativeTask[];
  onDispatchTask: (
    title: string,
    type: CollaborativeTask['type'],
    initiatorNodeId: string,
    assignedNodes: string[],
    payloadDescription: string
  ) => Promise<void>;
}

export const DistributedTasksView: React.FC<DistributedTasksViewProps> = ({
  nodes,
  tasks,
  onDispatchTask,
}) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('Zero-Knowledge State Vector Attestation');
  const [taskType, setTaskType] = useState<CollaborativeTask['type']>('consensus_audit');
  const [initiatorId, setInitiatorId] = useState<string>(nodes[0]?.id || 'node-me');
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(nodes.slice(0, 4).map(n => n.id));
  const [description, setDescription] = useState<string>(
    'Cross-verifying distributed agent cryptographic state commitments across sharded mesh zones.'
  );

  // Filter & Search in Dispatch Modal
  const [nodeFilterCategory, setNodeFilterCategory] = useState<'all' | 'coordinators' | 'squads' | 'swarms' | 'specialists'>('all');
  const [nodeSearchQuery, setNodeSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Quick Swarm / Subgroup Selection Presets
  const handleSelectPreset = (preset: 'all' | 'none' | 'coordinators' | 'squads' | 'swarms' | 'specialists' | 'workers') => {
    switch (preset) {
      case 'all':
        setSelectedNodeIds(nodes.map(n => n.id));
        break;
      case 'none':
        setSelectedNodeIds([]);
        break;
      case 'coordinators':
        setSelectedNodeIds(nodes.filter(n => n.role === 'coordinator' || n.unitGroup === 'coordinators').map(n => n.id));
        break;
      case 'squads':
        setSelectedNodeIds(nodes.filter(n => n.role === 'squad' || n.unitGroup === 'squads').map(n => n.id));
        break;
      case 'swarms':
        setSelectedNodeIds(nodes.filter(n => n.role === 'swarm' || n.unitGroup === 'swarms').map(n => n.id));
        break;
      case 'specialists':
        setSelectedNodeIds(nodes.filter(n => n.role === 'specialist' || n.unitGroup === 'specialists').map(n => n.id));
        break;
      case 'workers':
        setSelectedNodeIds(nodes.filter(n => n.id !== initiatorId && n.status === 'ONLINE').map(n => n.id));
        break;
    }
  };

  const handleToggleNode = (id: string) => {
    if (selectedNodeIds.includes(id)) {
      setSelectedNodeIds(selectedNodeIds.filter(nId => nId !== id));
    } else {
      setSelectedNodeIds([...selectedNodeIds, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedNodeIds.length === 0) return;
    setIsSubmitting(true);
    try {
      await onDispatchTask(title, taskType, initiatorId, selectedNodeIds, description);
      setShowModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fast One-Click Swarm Dispatch Bar
  const handleQuickSwarmDispatch = async (swarmGroup: 'squads' | 'swarms' | 'specialists' | 'all') => {
    let targetNodes: AgentNode[] = [];
    let taskName = '';
    let type: CollaborativeTask['type'] = 'consensus_audit';

    if (swarmGroup === 'squads') {
      targetNodes = nodes.filter(n => n.role === 'squad' || n.unitGroup === 'squads');
      taskName = 'Tactical Squad Synchronized Kinetic Recon & Perimeter Lock';
      type = 'federated_telemetry';
    } else if (swarmGroup === 'swarms') {
      targetNodes = nodes.filter(n => n.role === 'swarm' || n.unitGroup === 'swarms');
      taskName = 'Edge Swarm Distributed AI Inference & Signal Mapping';
      type = 'distributed_hash';
    } else if (swarmGroup === 'specialists') {
      targetNodes = nodes.filter(n => n.role === 'specialist' || n.unitGroup === 'specialists');
      taskName = 'Cryptographic Ledger Forensic Verification & Key Rotation';
      type = 'state_vector_sync';
    } else {
      targetNodes = nodes.filter(n => n.id !== 'node-me');
      taskName = 'Full Swarm Broadcast: Zero-Knowledge Multi-Agent Consensus';
      type = 'consensus_audit';
    }

    if (targetNodes.length === 0) {
      targetNodes = nodes.slice(0, 3);
    }

    await onDispatchTask(
      taskName,
      type,
      'node-me',
      targetNodes.map(n => n.id),
      `Automated swarm broadcast dispatched simultaneously across ${targetNodes.length} ${swarmGroup} units.`
    );
  };

  const getTaskIcon = (type: CollaborativeTask['type']) => {
    switch (type) {
      case 'consensus_audit':
        return <Award className="w-4 h-4 text-indigo-400" />;
      case 'state_vector_sync':
        return <Database className="w-4 h-4 text-amber-400" />;
      case 'distributed_hash':
        return <Cpu className="w-4 h-4 text-purple-400" />;
      case 'federated_telemetry':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
    }
  };

  // Filtered nodes for the modal selection grid
  const filteredNodes = nodes.filter(node => {
    const matchesSearch = node.name.toLowerCase().includes(nodeSearchQuery.toLowerCase()) ||
      node.id.toLowerCase().includes(nodeSearchQuery.toLowerCase()) ||
      node.role.toLowerCase().includes(nodeSearchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (nodeFilterCategory === 'all') return true;
    if (nodeFilterCategory === 'coordinators') return node.role === 'coordinator' || node.unitGroup === 'coordinators';
    if (nodeFilterCategory === 'squads') return node.role === 'squad' || node.unitGroup === 'squads';
    if (nodeFilterCategory === 'swarms') return node.role === 'swarm' || node.unitGroup === 'swarms';
    if (nodeFilterCategory === 'specialists') return node.role === 'specialist' || node.unitGroup === 'specialists';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>Distributed Agent Collaboration & Swarm Task Orchestration</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Coordinate multi-agent workloads with sharded cryptographic payloads, multi-selection swarm dispatch, and verifiable aggregation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={async () => {
              await meshFabric.executeHierarchicalCommandPipeline('Collaborative Synthesis Directive: Distributed Zero-Knowledge Proof Aggregation');
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5 text-amber-300" />
            <span>Dispatch Hierarchical Pipeline</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Custom Swarm Task</span>
          </button>
        </div>
      </div>

      {/* Quick Swarm Dispatch Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 shadow-sm space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="font-bold uppercase tracking-wider text-slate-200">Simultaneous Swarm Dispatch:</span>
            <span className="text-slate-500 text-[11px]">Broadcast atomic collaborative jobs to entire unit subgroups with one click</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Available Fabric Units: <strong className="text-emerald-400">{nodes.length}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => handleQuickSwarmDispatch('squads')}
            className="flex items-center justify-between p-2.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 rounded-lg text-xs transition-all cursor-pointer group text-left"
          >
            <div>
              <div className="font-semibold text-slate-200 group-hover:text-cyan-300">Tactical Squads</div>
              <div className="text-[10px] text-slate-500 font-mono">Alpha + Bravo Recon</div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono font-bold">
              Dispatch
            </span>
          </button>

          <button
            onClick={() => handleQuickSwarmDispatch('swarms')}
            className="flex items-center justify-between p-2.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 rounded-lg text-xs transition-all cursor-pointer group text-left"
          >
            <div>
              <div className="font-semibold text-slate-200 group-hover:text-purple-300">Drone & Compute Swarms</div>
              <div className="text-[10px] text-slate-500 font-mono">Sensor + AI Compute</div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono font-bold">
              Dispatch
            </span>
          </button>

          <button
            onClick={() => handleQuickSwarmDispatch('specialists')}
            className="flex items-center justify-between p-2.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-lg text-xs transition-all cursor-pointer group text-left"
          >
            <div>
              <div className="font-semibold text-slate-200 group-hover:text-amber-300">Security Specialists</div>
              <div className="text-[10px] text-slate-500 font-mono">Cipher + Forensic</div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono font-bold">
              Dispatch
            </span>
          </button>

          <button
            onClick={() => handleQuickSwarmDispatch('all')}
            className="flex items-center justify-between p-2.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-lg text-xs transition-all cursor-pointer group text-left"
          >
            <div>
              <div className="font-semibold text-slate-200 group-hover:text-emerald-300">Entire Mesh Swarm</div>
              <div className="text-[10px] text-slate-500 font-mono">All Subordinate Nodes</div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
              Broadcast
            </span>
          </button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {tasks.map(task => {
          const initiator = nodes.find(n => n.id === task.initiatorNodeId);

          return (
            <div
              key={task.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4"
            >
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                    {getTaskIcon(task.type)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{task.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="font-mono text-cyan-400">{task.id}</span>
                      <span>•</span>
                      <span>Initiator: <span className="font-semibold text-slate-200">{initiator?.name || task.initiatorNodeId}</span></span>
                      <span>•</span>
                      <span className="font-mono text-slate-500">
                        {new Date(task.startTime).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium ${
                    task.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse'
                  }`}>
                    {task.status.toUpperCase()} ({task.progress}%)
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300 leading-relaxed">
                {task.payloadDescription}
              </p>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                  <span>Distributed Execution Progress</span>
                  <span>{task.progress}%</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>

              {/* Assigned Distributed Nodes & Encrypted Subtask Results */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider">
                    Participating Swarm Nodes ({task.assignedNodes.length} Nodes Assigned):
                  </span>
                  <span className="text-emerald-400 text-[11px]">
                    {Object.keys(task.encryptedResults).length} / {task.assignedNodes.length} Proofs Delivered
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {task.assignedNodes.map(nodeId => {
                    const node = nodes.find(n => n.id === nodeId);
                    const result = task.encryptedResults[nodeId];

                    return (
                      <div
                        key={nodeId}
                        className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs space-y-1.5 font-mono relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200 truncate">
                            {node?.name || nodeId}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            result
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                          }`}>
                            {result ? 'PROOF COMMITTED' : 'PROCESSING...'}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px] truncate">
                          {result || 'Computing zero-knowledge state epoch proof...'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Aggregated Consensus Outcome */}
              {task.aggregatedPlaintext && (
                <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-3.5 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Cryptographic Consensus Plaintext Outcome:</span>
                  </div>
                  <div className="text-slate-200 font-mono text-[11px] leading-relaxed">
                    {task.aggregatedPlaintext}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Advanced Multi-Select Swarm Dispatch Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-600/40 text-purple-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-tactical">
                    <span>Multi-Node Swarm Task Dispatcher</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 font-mono font-bold">
                      MULTI-SELECT
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Select individual nodes or whole subgroups to execute synchronized workload
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-slate-300 mb-1 font-medium font-mono">
                  Task Title:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium font-mono">
                    Workload Category:
                  </label>
                  <select
                    value={taskType}
                    onChange={e => setTaskType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-purple-500 font-mono"
                  >
                    <option value="consensus_audit">Byzantine Epoch Audit</option>
                    <option value="state_vector_sync">State Vector CRDT Sync</option>
                    <option value="distributed_hash">Distributed Hash Proof</option>
                    <option value="federated_telemetry">Federated Anomaly Digest</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium font-mono">
                    Initiator / Root Coordinator:
                  </label>
                  <select
                    value={initiatorId}
                    onChange={e => setInitiatorId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-purple-500 font-mono"
                  >
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>
                        {n.name} ({n.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multi-Select Swarm & Node Subgroup Selection Section */}
              <div className="space-y-2.5 border border-slate-800 rounded-xl p-3.5 bg-slate-950/60">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-slate-300 font-medium font-mono flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                    <span>Select Participating Swarm Worker Nodes ({selectedNodeIds.length} Selected):</span>
                  </label>
                  <span className="text-[11px] font-mono text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/60">
                    {selectedNodeIds.length} of {nodes.length} Nodes Armed
                  </span>
                </div>

                {/* Subgroup Quick Selection Presets */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                  <span className="text-slate-500 text-[10px] mr-1 uppercase">Subgroup Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('all')}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                  >
                    Select All ({nodes.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('coordinators')}
                    className="px-2 py-1 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60 transition-colors cursor-pointer"
                  >
                    Coordinators ({nodes.filter(n => n.role === 'coordinator' || n.unitGroup === 'coordinators').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('squads')}
                    className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-200 border border-cyan-700/60 transition-colors cursor-pointer"
                  >
                    Squads ({nodes.filter(n => n.role === 'squad' || n.unitGroup === 'squads').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('swarms')}
                    className="px-2 py-1 rounded bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-700/60 transition-colors cursor-pointer"
                  >
                    Swarms ({nodes.filter(n => n.role === 'swarm' || n.unitGroup === 'swarms').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('specialists')}
                    className="px-2 py-1 rounded bg-amber-950 hover:bg-amber-900 text-amber-200 border border-amber-700/60 transition-colors cursor-pointer"
                  >
                    Specialists ({nodes.filter(n => n.role === 'specialist' || n.unitGroup === 'specialists').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('none')}
                    className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 transition-colors cursor-pointer ml-auto"
                  >
                    Clear
                  </button>
                </div>

                {/* Search & Category Filter */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Search node by name, ID, or role..."
                    value={nodeSearchQuery}
                    onChange={e => setNodeSearchQuery(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 font-mono"
                  />
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[10px] font-mono">
                    {(['all', 'coordinators', 'squads', 'swarms', 'specialists'] as const).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNodeFilterCategory(cat)}
                        className={`px-2 py-1 rounded capitalize transition-colors cursor-pointer ${
                          nodeFilterCategory === cat
                            ? 'bg-purple-900/80 text-purple-200 font-bold border border-purple-700/50'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Node Grid Multi-Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                  {filteredNodes.map(node => {
                    const isSelected = selectedNodeIds.includes(node.id);
                    const isInitiator = node.id === initiatorId;

                    return (
                      <button
                        type="button"
                        key={node.id}
                        onClick={() => handleToggleNode(node.id)}
                        className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-950/40 border-purple-500/60 text-slate-100 shadow-sm'
                            : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-semibold text-xs text-slate-200 truncate">{node.name}</span>
                            {isInitiator && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-900 text-indigo-300 font-mono">
                                INITIATOR
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate flex items-center gap-1.5 mt-0.5">
                            <span className="uppercase text-slate-400">{node.role}</span>
                            <span>•</span>
                            <span>{node.region}</span>
                            <span>•</span>
                            <span className="text-emerald-400">{node.cryptoOpsSec} ops/s</span>
                          </div>
                        </div>

                        <div className={`w-4 h-4 rounded flex items-center justify-center text-xs shrink-0 transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white font-bold shadow-sm shadow-purple-900'
                            : 'border border-slate-700 bg-slate-900'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                  {filteredNodes.length === 0 && (
                    <div className="col-span-2 text-center py-4 text-slate-500 font-mono text-xs">
                      No nodes match current filter query.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium font-mono">
                  Workload Payload Specification:
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedNodeIds.length === 0 || isSubmitting}
                  className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold shadow-md shadow-purple-950 cursor-pointer flex items-center gap-2 font-tactical tracking-wide"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {isSubmitting ? 'Dispatching Swarm...' : `Launch Swarm Dispatch (${selectedNodeIds.length} Nodes)`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
