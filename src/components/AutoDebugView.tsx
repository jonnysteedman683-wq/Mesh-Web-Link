import React, { useState, useEffect } from 'react';
import { autoDebugEngine } from '../services/autoDebugEngine';
import { DiagnosticFaultTrace, FaultDomain, FaultSeverity } from '../types';
import { 
  Bug, 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  RefreshCw, 
  AlertTriangle, 
  Terminal, 
  Layers, 
  Zap, 
  CheckCircle2, 
  Flame, 
  RotateCcw, 
  Sliders, 
  Cpu, 
  Trash2,
  Lock,
  Radio
} from 'lucide-react';
import { tactileAudio } from '../services/tactileAudio';

interface AutoDebugViewProps {
  onNotify?: (msg: string) => void;
}

export const AutoDebugView: React.FC<AutoDebugViewProps> = ({ onNotify }) => {
  const [traces, setTraces] = useState<DiagnosticFaultTrace[]>(autoDebugEngine.getTraces());
  const [selectedTraceId, setSelectedTraceId] = useState<string>(traces[0]?.id || '');
  const [isAutoHealEnabled, setIsAutoHealEnabled] = useState<boolean>(autoDebugEngine.isAutoHealingEnabled());
  const [filterDomain, setFilterDomain] = useState<string>('ALL');

  useEffect(() => {
    const unsub = autoDebugEngine.subscribe(updated => {
      setTraces(updated);
    });
    return unsub;
  }, []);

  const selectedTrace = traces.find(t => t.id === selectedTraceId) || traces[0];

  const handleToggleIsolation = (traceId: string) => {
    tactileAudio.playClick(950);
    autoDebugEngine.toggleTraceIsolation(traceId);
    if (onNotify) onNotify(`Fault Circuit Isolation toggled for ${traceId}`);
  };

  const handleSelfHealAll = () => {
    tactileAudio.playVerificationSuccess();
    autoDebugEngine.executeSelfHealAll();
    if (onNotify) onNotify('Automated Self-Healing cycle executed across all systems.');
  };

  const handleInjectFault = (domain: FaultDomain, severity: FaultSeverity) => {
    tactileAudio.playDenied();
    autoDebugEngine.injectSyntheticFault(domain, severity);
    if (onNotify) onNotify(`Synthetic fault injected into [${domain}] pipeline for resilience test.`);
  };

  const handleClear = () => {
    tactileAudio.playClick(800);
    autoDebugEngine.clearTraces();
    if (onNotify) onNotify('Diagnostic trace log cleared.');
  };

  const filteredTraces = filterDomain === 'ALL' 
    ? traces 
    : traces.filter(t => t.domain === filterDomain);

  return (
    <div className="space-y-6">
      {/* Top Banner & Automated Circuit Breaker Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Bug className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide font-tactical">
                Auto Debugging, Error Tracing & Fault Isolation
              </h2>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                isAutoHealEnabled ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-slate-800 text-slate-400'
              }`}>
                AUTO-HEAL: {isAutoHealEnabled ? 'ENGAGED' : 'MANUAL'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              Intercepts uncaught promises, WebCrypto failures, V8 memory heaps, and isolates compromised components.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSelfHealAll}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Self-Heal All Faults</span>
          </button>

          <button
            onClick={handleClear}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Flush Logs</span>
          </button>
        </div>
      </div>

      {/* Synthetic Chaos Injector Bar */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-300 font-bold">
          <Flame className="w-4 h-4 text-rose-400" />
          <span>Inject Synthetic Fault Test:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleInjectFault('WEB_CRYPTO', 'CRITICAL')}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-rose-300 border border-slate-700 text-[11px] cursor-pointer"
          >
            + Crypto Tag Mismatch
          </button>
          <button
            onClick={() => handleInjectFault('WEBAUTHN', 'WARNING')}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 text-[11px] cursor-pointer"
          >
            + Passkey Timeout
          </button>
          <button
            onClick={() => handleInjectFault('MESH_NETWORK', 'CRITICAL')}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 text-[11px] cursor-pointer"
          >
            + Mesh Hop Loss
          </button>
          <button
            onClick={() => handleInjectFault('DRONE_UAV', 'WARNING')}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-700 text-[11px] cursor-pointer"
          >
            + Drone RSSI Drop
          </button>
        </div>
      </div>

      {/* Main Grid: Trace Stream (4 cols) & Deep Stack Inspector (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Trace List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span>Diagnostic Traces ({filteredTraces.length})</span>
            <select
              value={filterDomain}
              onChange={e => setFilterDomain(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded text-[11px] px-2 py-0.5 text-slate-300"
            >
              <option value="ALL">All Domains</option>
              <option value="WEB_CRYPTO">WEB_CRYPTO</option>
              <option value="WEBAUTHN">WEBAUTHN</option>
              <option value="MESH_NETWORK">MESH_NETWORK</option>
              <option value="DRONE_UAV">DRONE_UAV</option>
              <option value="WEATHER_TELEMETRY">WEATHER</option>
            </select>
          </div>

          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {filteredTraces.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-slate-500 font-mono text-xs">
                No active diagnostic faults detected. Subsystems operating cleanly.
              </div>
            ) : (
              filteredTraces.map(trace => {
                const isSelected = selectedTrace?.id === trace.id;

                return (
                  <div
                    key={trace.id}
                    onClick={() => {
                      setSelectedTraceId(trace.id);
                      tactileAudio.playClick(1000);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-amber-500/70 shadow-md ring-1 ring-amber-500/30'
                        : trace.isolated
                        ? 'bg-rose-950/20 border-rose-900/60'
                        : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          trace.severity === 'FATAL' || trace.severity === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-300 border border-rose-700'
                            : trace.severity === 'WARNING'
                            ? 'bg-amber-950 text-amber-300 border border-amber-700'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {trace.severity}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-300">
                          {trace.domain}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(trace.timestamp).toISOString().substring(14, 19)}
                      </span>
                    </div>

                    <div className="text-xs text-white font-mono mt-1.5 line-clamp-2">
                      {trace.errorMessage}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span className="truncate max-w-[160px] text-slate-400">
                        {trace.culpritComponent}
                      </span>
                      <span className={trace.isolated ? 'text-rose-400 font-bold' : trace.autoHealed ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {trace.isolated ? 'ISOLATED' : trace.autoHealed ? 'AUTO-HEALED' : 'MONITORING'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Deep Inspector & Stack Trace HUD (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedTrace ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-amber-400">
                      FAULT TRACE ROOT CAUSE ANALYSIS
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      selectedTrace.isolated
                        ? 'bg-rose-950 text-rose-300 border border-rose-700'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    }`}>
                      CIRCUIT STATUS: {selectedTrace.isolated ? 'ISOLATED' : 'LIVE'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white font-tactical mt-0.5">
                    {selectedTrace.errorMessage}
                  </h3>
                  <div className="text-xs font-mono text-slate-400 mt-1">
                    Trace ID: <span className="text-amber-300">{selectedTrace.id}</span> • Culprit: <span className="text-cyan-300">{selectedTrace.culpritComponent}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleIsolation(selectedTrace.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      selectedTrace.isolated
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-700/60'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{selectedTrace.isolated ? 'De-isolate Component' : 'Trigger Circuit Isolation'}</span>
                  </button>
                </div>
              </div>

              {/* Telemetry Snapshot at time of fault */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Heap Memory</div>
                  <div className="text-lg font-bold font-mono text-white">
                    {selectedTrace.telemetrySnapshot?.memoryUsedMb || 34.2} MB
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono">V8 Garbage Collector OK</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Network Jitter</div>
                  <div className="text-lg font-bold font-mono text-white">
                    {selectedTrace.telemetrySnapshot?.networkLatencyMs || 8} ms
                  </div>
                  <div className="text-[10px] text-cyan-400 font-mono">Sub-10ms Mesh Target</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Crypto Ops/Sec</div>
                  <div className="text-lg font-bold font-mono text-white">
                    {selectedTrace.telemetrySnapshot?.cryptoOpsSec || 1350}
                  </div>
                  <div className="text-[10px] text-indigo-400 font-mono">SubtleCrypto Hardware</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Auto-Remediation</div>
                  <div className="text-xs font-bold font-mono text-emerald-400 truncate">
                    {selectedTrace.autoHealed ? 'REMEDIED' : 'PENDING'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">Circuit Auto-Reset</div>
                </div>
              </div>

              {/* Remediation Action Taken */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5">
                <div className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  AUTOMATED ISOLATION & REMEDIATION DIRECTIVE:
                </div>
                <div className="text-xs font-mono text-slate-300">
                  {selectedTrace.remediationAction || 'No remediation required.'}
                </div>
              </div>

              {/* Stack Trace Code Block */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Terminal className="w-3.5 h-3.5 text-amber-400" />
                    CALL STACK & RUNTIME EXCEPTION FRAME
                  </span>
                  <span>SOURCE MAPPING: ACTIVE</span>
                </div>

                <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-amber-200/90 overflow-x-auto leading-relaxed">
                  {selectedTrace.stackTrace || 'No stack trace captured.'}
                </pre>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-500 font-mono text-xs">
              Select a diagnostic trace from the left panel to inspect root-cause analysis.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
