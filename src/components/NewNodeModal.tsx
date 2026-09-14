import React, { useState } from 'react';
import { AgentRole, Region } from '../types';
import { Plus, Shield, Network, Cpu, Database, Radio, Award, Lock } from 'lucide-react';

interface NewNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (name: string, role: AgentRole, region: Region) => Promise<void>;
}

export const NewNodeModal: React.FC<NewNodeModalProps> = ({
  isOpen,
  onClose,
  onDeploy,
}) => {
  const [name, setName] = useState<string>('Eta Distributed Sentry');
  const [role, setRole] = useState<AgentRole>('security_sentinel');
  const [region, setRegion] = useState<Region>('us-west-2');
  const [isDeploying, setIsDeploying] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsDeploying(true);
    try {
      await onDeploy(name, role, region);
      onClose();
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Deploy New Mesh Agent Node</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-xs font-mono cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">
              Agent Node Name:
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
              placeholder="e.g. Theta Compute Node"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">
              Operational Role:
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as AgentRole)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-emerald-500 font-mono"
            >
              <option value="security_sentinel">Security Sentinel (Validation & Proofs)</option>
              <option value="mesh_bridge">Mesh Bridge / Relay (Routing Fabric)</option>
              <option value="compute_worker">Compute Worker (Distributed Workloads)</option>
              <option value="vector_store">Vector Store (Distributed State / Memory)</option>
              <option value="ingestion_node">Ingestion Node (Sensor & Edge Stream)</option>
              <option value="consensus_leader">Consensus Leader (Epoch Coordination)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">
              Geographic Region / Cluster:
            </label>
            <select
              value={region}
              onChange={e => setRegion(e.target.value as Region)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-emerald-500 font-mono"
            >
              <option value="us-west-2">US West (us-west-2)</option>
              <option value="us-east-1">US East (us-east-1)</option>
              <option value="eu-central-1">EU Central (eu-central-1)</option>
              <option value="ap-southeast-1">Asia Pacific (ap-southeast-1)</option>
              <option value="sa-east-1">South America (sa-east-1)</option>
              <option value="edge-mobile">Edge / Autonomous Worker</option>
            </select>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1 text-slate-400">
            <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[11px]">
              <Lock className="w-3 h-3" />
              Automated Cryptographic Provisioning
            </span>
            <p className="text-[11px] leading-relaxed">
              Spawning this node will generate an authentic ECDH P-256 key pair via WebCrypto, compute its SHA-256 fingerprint, and securely negotiate peer links with nearest nodes in the fabric.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDeploying}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium shadow-sm cursor-pointer"
            >
              {isDeploying ? 'Generating Keys...' : 'Generate & Deploy Node'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
