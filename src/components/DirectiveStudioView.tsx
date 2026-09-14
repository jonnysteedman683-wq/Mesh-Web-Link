import React, { useState } from 'react';
import { 
  MissionDirectiveConfig, 
  MissionDossier, 
  MissionRulesOfEngagement,
  AgentNode
} from '../types';
import { meshFabric, MeshFabricManager } from '../fabric/meshFabric';
import { 
  Crown, 
  Send, 
  Award, 
  Users, 
  Layers, 
  Terminal, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Compass, 
  Sparkles, 
  Target, 
  Fingerprint, 
  Check, 
  Copy, 
  RefreshCw,
  AlertCircle,
  Radio,
  Cpu,
  Bot
} from 'lucide-react';
import { AgentGatewayModal } from './AgentGatewayModal';
import { offlineMeshStorage, QueuedDirectiveRecord } from '../services/offlineMeshStorage';

interface DirectiveStudioViewProps {
  nodes: AgentNode[];
}

export const DirectiveStudioView: React.FC<DirectiveStudioViewProps> = ({ nodes }) => {
  const templates = MeshFabricManager.DIRECTIVE_TEMPLATES;
  const initialTemplate = templates[0];

  const [codename, setCodename] = useState<string>(initialTemplate.codename);
  const [directiveText, setDirectiveText] = useState<string>(initialTemplate.directiveText);
  const [sectorTarget, setSectorTarget] = useState<string>(initialTemplate.sectorTarget);
  const [clearanceLevel, setClearanceLevel] = useState<MissionRulesOfEngagement['clearanceLevel']>(
    initialTemplate.rulesOfEngagement.clearanceLevel
  );
  const [attestationQuorum, setAttestationQuorum] = useState<MissionRulesOfEngagement['attestationQuorum']>(
    initialTemplate.rulesOfEngagement.attestationQuorum
  );
  const [failoverPolicy, setFailoverPolicy] = useState<MissionRulesOfEngagement['failoverPolicy']>(
    initialTemplate.rulesOfEngagement.failoverPolicy
  );
  const [cryptoStandard, setCryptoStandard] = useState<MissionRulesOfEngagement['cryptoStandard']>(
    initialTemplate.rulesOfEngagement.cryptoStandard
  );
  const [assignedCoordinators, setAssignedCoordinators] = useState<string[]>(
    initialTemplate.assignedCoordinators
  );
  const [assignedUnits, setAssignedUnits] = useState<string[]>(initialTemplate.assignedUnits);

  // Active execution state
  const [isGatewayOpen, setIsGatewayOpen] = useState<boolean>(false);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [activeDossier, setActiveDossier] = useState<MissionDossier | null>(null);
  const [historyDossiers, setHistoryDossiers] = useState<MissionDossier[]>(() => meshFabric.getMissionDossiers());
  const [selectedHistoryDossier, setSelectedHistoryDossier] = useState<MissionDossier | null>(null);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  const handleApplyTemplate = (tmpl: MissionDirectiveConfig) => {
    setCodename(tmpl.codename);
    setDirectiveText(tmpl.directiveText);
    setSectorTarget(tmpl.sectorTarget);
    setClearanceLevel(tmpl.rulesOfEngagement.clearanceLevel);
    setAttestationQuorum(tmpl.rulesOfEngagement.attestationQuorum);
    setFailoverPolicy(tmpl.rulesOfEngagement.failoverPolicy);
    setCryptoStandard(tmpl.rulesOfEngagement.cryptoStandard);
    setAssignedCoordinators(tmpl.assignedCoordinators);
    setAssignedUnits(tmpl.assignedUnits);
  };

  const toggleCoordinator = (coordId: string) => {
    if (assignedCoordinators.includes(coordId)) {
      if (assignedCoordinators.length > 1) {
        setAssignedCoordinators(assignedCoordinators.filter(c => c !== coordId));
      }
    } else {
      setAssignedCoordinators([...assignedCoordinators, coordId]);
    }
  };

  const toggleUnit = (unitId: string) => {
    if (assignedUnits.includes(unitId)) {
      if (assignedUnits.length > 1) {
        setAssignedUnits(assignedUnits.filter(u => u !== unitId));
      }
    } else {
      setAssignedUnits([...assignedUnits, unitId]);
    }
  };

  const handleDispatchDirective = async () => {
    if (isDispatching) return;
    setIsDispatching(true);

    const config: MissionDirectiveConfig = {
      id: `dir-${Date.now().toString(36)}`,
      codename,
      directiveText,
      sectorTarget,
      rulesOfEngagement: {
        clearanceLevel,
        attestationQuorum,
        failoverPolicy,
        cryptoStandard,
        timeoutMs: 8000,
      },
      assignedCoordinators,
      assignedUnits,
    };

    try {
      // Safely persist to local IndexedDB CRDT queue for offline resilience
      await offlineMeshStorage.queueDirective({
        codename,
        directiveText,
        sectorTarget,
        priority: clearanceLevel === 'LEVEL_5_QUANTUM_TOP_SECRET' ? 'FLASH_OVERRIDE' : clearanceLevel === 'LEVEL_4_SECRET' ? 'IMMEDIATE' : 'PRIORITY',
      });

      const dossier = await meshFabric.executeCustomMissionDirective(config, (updated) => {
        setActiveDossier({ ...updated });
      });
      setActiveDossier(dossier);
      setHistoryDossiers([...meshFabric.getMissionDossiers()]);
      setSelectedHistoryDossier(dossier);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDispatching(false);
    }
  };

  const displayedDossier = selectedHistoryDossier || activeDossier || historyDossiers[0] || null;

  const handleCopyMerkle = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  Directive Studio & Mission Builder
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  ISSUED BY COMMAND (ME)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Formulate tactical directives, set Rules of Engagement, and delegate through Coordinators (Omnisary, Hermes, Inquisitor) with audited delivery back to Me.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsGatewayOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 transition-all cursor-pointer shadow-sm"
              title="Connect real Python scripts, drone swarms, and robotics over REST/Webhook"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>External Agent Gateway</span>
            </button>

            <button
              onClick={handleDispatchDirective}
              disabled={isDispatching}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-md cursor-pointer ${
                isDispatching
                  ? 'bg-amber-600/50 text-amber-200 animate-pulse'
                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
              }`}
            >
              <Send className={`w-3.5 h-3.5 ${isDispatching ? 'animate-spin' : ''}`} />
              <span>{isDispatching ? 'Dispatching Directive...' : 'Dispatch Directive from Me'}</span>
            </button>
          </div>
        </div>

        {/* Hybrid Architecture Status Strip */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 pb-1 border-t border-slate-800 text-[11px]">
          <span className="text-slate-400 font-medium">Hybrid Architecture:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 font-mono text-[10px]">
            <Bot className="w-3 h-3 text-emerald-400" />
            <span>Coordinators: Gemini 3.8 Flash Core</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/60 text-cyan-300 font-mono text-[10px]">
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span>Swarms: Edge AI + REST/Webhook Gateway</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/50 border border-amber-800/60 text-amber-300 font-mono text-[10px]">
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            <span>Attestation: WebCrypto ECDH + Merkle Tree</span>
          </span>
        </div>

        {/* Quick Presets Bar */}
        <div className="border-t border-slate-800 pt-3">
          <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Preset Operational Directive Templates:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {templates.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => handleApplyTemplate(tmpl)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer text-xs ${
                  codename === tmpl.codename
                    ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-slate-200 flex items-center justify-between">
                  <span>{tmpl.codename}</span>
                  <span className="text-[9px] font-mono text-amber-400">{tmpl.rulesOfEngagement.clearanceLevel.split('_')[1]}</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-1">
                  {tmpl.sectorTarget}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Mission Definition & ROE (col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>1. Mission Directive Specification</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Directive Codename
                </label>
                <input
                  type="text"
                  value={codename}
                  onChange={(e) => setCodename(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                  placeholder="e.g. OPERATION TITAN AEGIS"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Operational Directive Orders (Issued by Command)
                </label>
                <textarea
                  value={directiveText}
                  onChange={(e) => setDirectiveText(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 text-xs focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
                  placeholder="State the objective, expected findings, and synthesis requirements..."
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-rose-400" />
                  <span>Target Tactical Sector & Grid Coordinate</span>
                </label>
                <input
                  type="text"
                  value={sectorTarget}
                  onChange={(e) => setSectorTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                  placeholder="e.g. Sector 7-G (Orbital Uplink & Perimeter Grid)"
                />
              </div>
            </div>

            {/* Rules of Engagement */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Rules of Engagement (ROE) & Attestation Policy</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1 font-mono">
                    Clearance Classification
                  </label>
                  <select
                    value={clearanceLevel}
                    onChange={(e) => setClearanceLevel(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="LEVEL_1_ROUTINE">Level 1: Routine Unclassified</option>
                    <option value="LEVEL_2_RESTRICTED">Level 2: Restricted Telemetry</option>
                    <option value="LEVEL_3_CONFIDENTIAL">Level 3: Confidential Squad Sweep</option>
                    <option value="LEVEL_4_SECRET">Level 4: Secret Multi-Hop Attestation</option>
                    <option value="LEVEL_5_QUANTUM_TOP_SECRET">Level 5: Quantum Top Secret (Zero-Knowledge)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1 font-mono">
                    Attestation Quorum Policy
                  </label>
                  <select
                    value={attestationQuorum}
                    onChange={(e) => setAttestationQuorum(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="majority">Majority Proofs (&gt; 50% nodes)</option>
                    <option value="strict_unanimous">Strict Unanimous (100% quorum)</option>
                    <option value="zero_knowledge_proof">Zero-Knowledge Attestation Proof Chain</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1 font-mono">
                    Failover Policy
                  </label>
                  <select
                    value={failoverPolicy}
                    onChange={(e) => setFailoverPolicy(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="auto_succession">Autonomous Succession (Byzantine fallback)</option>
                    <option value="strict_primary_only">Strict Primary (Abort on missing coordinator)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1 font-mono">
                    Cryptographic Suite
                  </label>
                  <select
                    value={cryptoStandard}
                    onChange={(e) => setCryptoStandard(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="AES-256-GCM + ECDH-P256">AES-256-GCM + ECDH-P256 (WebCrypto Standard)</option>
                    <option value="ChaCha20-Poly1305 + X25519">ChaCha20-Poly1305 + X25519 (High-Speed Stream)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form: Unit Selection & Hierarchy Matrix (col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>2. Coordinator & Execution Unit Allocation</span>
            </h3>

            {/* Coordinator Toggles */}
            <div>
              <label className="block text-slate-400 text-[11px] mb-1.5 font-mono">
                Coordinators to Invoke:
              </label>
              <div className="space-y-1.5">
                {[
                  { id: 'node-omnisary', name: 'Omnisary', role: 'Tactical Squad Coordinator' },
                  { id: 'node-hermes', name: 'Hermes', role: 'Autonomous Swarm Relay' },
                  { id: 'node-inquisitor', name: 'Inquisitor', role: 'Audit, Synthesis & Specialist Hub' },
                ].map((c) => {
                  const isChecked = assignedCoordinators.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleCoordinator(c.id)}
                      className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors text-xs ${
                        isChecked
                          ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 text-indigo-400" />
                        <div>
                          <span className="font-semibold text-slate-100">{c.name}</span>
                          <span className="text-[10px] text-slate-400 ml-2">({c.role})</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded text-indigo-500 pointer-events-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Execution Units Toggles */}
            <div className="border-t border-slate-800 pt-3">
              <label className="block text-slate-400 text-[11px] mb-1.5 font-mono">
                Subordinate Units to Deploy:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {[
                  { id: 'node-squad-alpha', name: 'Alpha Squad', type: 'squad', lead: 'Omnisary' },
                  { id: 'node-squad-bravo', name: 'Bravo Recon', type: 'squad', lead: 'Omnisary' },
                  { id: 'node-swarm-sensor', name: 'Sensor Swarm', type: 'swarm', lead: 'Hermes' },
                  { id: 'node-swarm-compute', name: 'Compute Swarm', type: 'swarm', lead: 'Hermes' },
                  { id: 'node-spec-cipher', name: 'Cipher Spec.', type: 'spec', lead: 'Inquisitor' },
                  { id: 'node-spec-forensic', name: 'Forensic Spec.', type: 'spec', lead: 'Inquisitor' },
                ].map((u) => {
                  const isChecked = assignedUnits.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleUnit(u.id)}
                      className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-colors text-xs ${
                        isChecked
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {u.type === 'squad' && <Users className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                        {u.type === 'swarm' && <Layers className="w-3 h-3 text-cyan-400 flex-shrink-0" />}
                        {u.type === 'spec' && <Terminal className="w-3 h-3 text-purple-400 flex-shrink-0" />}
                        <span className="font-semibold text-slate-200 truncate">{u.name}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded text-emerald-500 pointer-events-none ml-1"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Flow Preview Card */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-[11px] font-mono space-y-1">
              <div className="text-slate-400 font-semibold">Hierarchy Path:</div>
              <div className="text-slate-300 leading-snug">
                <span className="text-amber-400 font-bold">Me</span> ➔{' '}
                <span className="text-indigo-400 font-bold">{assignedCoordinators.length} Coordinators</span> ➔{' '}
                <span className="text-emerald-400 font-bold">{assignedUnits.length} Units</span> ➔{' '}
                <span className="text-purple-400 font-bold">Inquisitor (Audit)</span> ➔{' '}
                <span className="text-amber-400 font-bold">Me</span>
              </div>
            </div>

            <button
              onClick={handleDispatchDirective}
              disabled={isDispatching}
              className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className={`w-4 h-4 ${isDispatching ? 'animate-spin' : ''}`} />
              <span>{isDispatching ? 'Executing Mission Flow...' : 'Launch Mission Directive Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-Time Mission Execution Flow (If active or completed) */}
      {displayedDossier && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>Mission Attestation Dossier: {displayedDossier.directiveConfig.codename}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    displayedDossier.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 animate-pulse'
                  }`}>
                    {displayedDossier.status.toUpperCase()}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Delivered to Command (Me) • Audited by {displayedDossier.auditSynthesisLead} • {displayedDossier.directiveConfig.sectorTarget}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">
                {new Date(displayedDossier.startTime).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Stepper Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
            {[
              { num: 1, label: 'Me Dispatches', stage: 'dispatching', desc: 'Directives sent to coordinators' },
              { num: 2, label: 'Coordinators Order', stage: 'delegating', desc: 'Units mobilized with rules' },
              { num: 3, label: 'Unit Sweeps & Proofs', stage: 'executing', desc: 'Squads, swarms & specs active' },
              { num: 4, label: 'Inquisitor Attestation', stage: 'auditing', desc: 'Merkle aggregation & audit' },
              { num: 5, label: 'Delivered to Me', stage: 'completed', desc: 'Verified brief delivered to Me' },
            ].map((st, i) => {
              const stages = ['dispatching', 'delegating', 'executing', 'auditing', 'completed'];
              const currIdx = stages.indexOf(displayedDossier.status);
              const isPast = currIdx >= i;
              const isCurr = displayedDossier.status === st.stage;

              return (
                <div
                  key={st.num}
                  className={`p-2.5 rounded-lg border transition-all ${
                    isCurr
                      ? 'bg-amber-950/50 border-amber-500 text-amber-200 animate-pulse'
                      : isPast
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-950/50 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] font-bold">PHASE {st.num}</span>
                    {isPast ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </div>
                  <div className="font-semibold text-[11px]">{st.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{st.desc}</div>
                </div>
              );
            })}
          </div>

          {/* Executive Summary Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Executive Synthesis Dossier for Command (Me)</span>
                </span>
                {displayedDossier.isGeminiPowered && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950/80 border border-purple-800 text-purple-300">
                    <Bot className="w-3 h-3 text-purple-400" />
                    <span>Gemini 3.8 Flash Attested</span>
                  </span>
                )}
              </div>

              {displayedDossier.merkleRootHash && (
                <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800 font-mono text-[11px] text-slate-300">
                  <Fingerprint className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Merkle Root: {displayedDossier.merkleRootHash}</span>
                  <button
                    onClick={() => handleCopyMerkle(displayedDossier.merkleRootHash)}
                    className="ml-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {displayedDossier.executiveSummary}
            </p>

            {/* Coordinator Tactical Strategy Breakdown */}
            {displayedDossier.coordinatorPlans && (
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <h5 className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span>Coordinator Tactical Strategy Plans (Autonomous AI):</span>
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
                  <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg space-y-1">
                    <span className="font-semibold text-rose-300 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-rose-400" />
                      Omnisary (Squads)
                    </span>
                    <p className="text-slate-300 text-[10.5px] leading-relaxed font-sans">{displayedDossier.coordinatorPlans.omnisary}</p>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg space-y-1">
                    <span className="font-semibold text-cyan-300 flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-cyan-400" />
                      Hermes (Swarms)
                    </span>
                    <p className="text-slate-300 text-[10.5px] leading-relaxed font-sans">{displayedDossier.coordinatorPlans.hermes}</p>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg space-y-1">
                    <span className="font-semibold text-indigo-300 flex items-center gap-1">
                      <Fingerprint className="w-3 h-3 text-indigo-400" />
                      Inquisitor (Audits)
                    </span>
                    <p className="text-slate-300 text-[10.5px] leading-relaxed font-sans">{displayedDossier.coordinatorPlans.inquisitor}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Detailed Unit Findings Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Audited Unit Findings Fed to Inquisitor:</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(Object.entries(displayedDossier.unitReports) as [string, {
                unitName: string;
                coordinator: string;
                payloadCiphertext: string;
                verifiedPlaintext: string;
                signatureHash: string;
                timestamp: number;
              }][]).map(([unitId, report]) => (
                <div
                  key={unitId}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs font-mono"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="font-bold text-slate-100 font-sans">{report.unitName}</span>
                    <span className="text-[10px] text-slate-500">via {report.coordinator}</span>
                  </div>

                  <p className="text-slate-300 font-sans text-xs leading-relaxed">
                    {report.verifiedPlaintext}
                  </p>

                  <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[10px] text-slate-400">
                    <div className="truncate text-slate-500">
                      Ciphertext: <span className="text-cyan-400/90">{report.payloadCiphertext}</span>
                    </div>
                    <div className="text-slate-500">
                      Attestation: <span className="text-emerald-400">{report.signatureHash}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Historical Dossier Archive Selector */}
      {historyDossiers.length > 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-300 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Historical Mission Archives Issued by Me ({historyDossiers.length})</span>
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {historyDossiers.map((hd) => (
              <button
                key={hd.id}
                onClick={() => setSelectedHistoryDossier(hd)}
                className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  displayedDossier?.id === hd.id
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-slate-200 truncate">{hd.directiveConfig.codename}</div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">{hd.directiveConfig.sectorTarget}</div>
                <div className="text-[9px] font-mono text-emerald-400 mt-1">
                  Status: {hd.status.toUpperCase()} • {new Date(hd.startTime).toLocaleTimeString()}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      {/* External Agent Gateway Modal */}
      <AgentGatewayModal
        isOpen={isGatewayOpen}
        onClose={() => setIsGatewayOpen(false)}
      />
    </div>
  );
};
