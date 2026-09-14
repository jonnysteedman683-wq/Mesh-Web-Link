import React, { useState, useEffect } from 'react';
import { SystemLogEntry } from '../types';
import { systemLogManager } from '../services/systemLogManager';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  ShieldCheck, 
  Radio, 
  Cpu, 
  AlertTriangle, 
  Info, 
  Terminal, 
  Clock, 
  Layers, 
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Lock,
  Zap,
  ArrowUpDown
} from 'lucide-react';

interface SystemLogsViewProps {
  onBackToTactical?: () => void;
  onGoHome?: () => void;
  onNotify?: (msg: string) => void;
}

export const SystemLogsView: React.FC<SystemLogsViewProps> = ({
  onBackToTactical,
  onGoHome,
  onNotify
}) => {
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedLog, setSelectedLog] = useState<SystemLogEntry | null>(null);

  // Manual test log form
  const [manualMsg, setManualMsg] = useState('');
  const [manualSubsystem, setManualSubsystem] = useState<SystemLogEntry['subsystem']>('AUTO_CHECK');
  const [manualLevel, setManualLevel] = useState<SystemLogEntry['level']>('INFO');

  useEffect(() => {
    setLogs(systemLogManager.getLogs());
    const unsub = systemLogManager.subscribe(entry => {
      setLogs(prev => [entry, ...prev.slice(0, 250)]);
    });
    return () => unsub();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.subsystem.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.hashSignature && log.hashSignature.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesLevel = selectedLevel === 'ALL' || log.level === selectedLevel;
    const matchesSubsystem = selectedSubsystem === 'ALL' || log.subsystem === selectedSubsystem;

    return matchesSearch && matchesLevel && matchesSubsystem;
  });

  const handleManualLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMsg.trim()) return;

    systemLogManager.log(manualLevel, manualSubsystem, manualMsg.trim(), {
      source: 'User Manual Entry',
      operatorId: 'CMD-ACTUAL'
    });

    if (onNotify) {
      onNotify('System log recorded and cryptographically signed.');
    }
    setManualMsg('');
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `system_telemetry_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    if (onNotify) onNotify('Exported system logs as JSON.');
  };

  const getLevelBadge = (level: SystemLogEntry['level']) => {
    switch (level) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700/60 font-mono font-bold text-[10px]">CRITICAL</span>;
      case 'WARN':
        return <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/60 font-mono font-bold text-[10px]">WARN</span>;
      case 'SEC_AUDIT':
        return <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700/60 font-mono font-bold text-[10px]">SEC_AUDIT</span>;
      case 'RF_EMISSION':
        return <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-mono font-bold text-[10px]">RF_EMISSION</span>;
      case 'DEVICE_LINK':
        return <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-mono font-bold text-[10px]">DEVICE_LINK</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono font-bold text-[10px]">INFO</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-amber-950 border border-amber-800/60 text-amber-400">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>System Telemetry & Audit Logs Section</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                LIVE BUFFER: {logs.length} RECORDS
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Cryptographically verified event stream for weather shifts, linked device telemetry, radar pings, EW jamming, and Citadel banking ledger audits
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Return to 4D Geometric Homepage"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>4D Homepage</span>
            </button>
          )}

          <button
            onClick={handleExportJson}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            title="Download audit logs as JSON file"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => {
              if (confirm('Clear all local log entries?')) {
                systemLogManager.clearLogs();
                if (onNotify) onNotify('Logs buffer cleared.');
              }
            }}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold border border-rose-900/50 transition-colors cursor-pointer"
            title="Clear memory buffer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Clear Buffer</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs by message, subsystem, or hash signature..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-xs font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500">Subsystem:</span>
            <select
              value={selectedSubsystem}
              onChange={e => setSelectedSubsystem(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">ALL SUBSYSTEMS</option>
              <option value="WEATHER">WEATHER</option>
              <option value="DEVICES">DEVICES</option>
              <option value="RADAR">RADAR</option>
              <option value="JAMMER">JAMMER</option>
              <option value="CITADEL">CITADEL</option>
              <option value="4D_ENGINE">4D_ENGINE</option>
              <option value="AUTO_CHECK">AUTO_CHECK</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500">Level:</span>
            <select
              value={selectedLevel}
              onChange={e => setSelectedLevel(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">ALL LEVELS</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="SEC_AUDIT">SEC_AUDIT</option>
              <option value="RF_EMISSION">RF_EMISSION</option>
              <option value="DEVICE_LINK">DEVICE_LINK</option>
            </select>
          </div>
        </div>
      </div>

      {/* Manual Log Submission Bar */}
      <form onSubmit={handleManualLogSubmit} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center space-x-1.5 text-cyan-400 font-bold font-mono">
          <Terminal className="w-3.5 h-3.5" />
          <span>Post Manual Log:</span>
        </div>

        <input
          type="text"
          placeholder="Enter command or manual observation note to append to the permanent ledger..."
          value={manualMsg}
          onChange={e => setManualMsg(e.target.value)}
          className="flex-1 min-w-[220px] px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
        />

        <select
          value={manualSubsystem}
          onChange={e => setManualSubsystem(e.target.value as any)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-mono focus:outline-none cursor-pointer"
        >
          <option value="WEATHER">WEATHER</option>
          <option value="DEVICES">DEVICES</option>
          <option value="RADAR">RADAR</option>
          <option value="JAMMER">JAMMER</option>
          <option value="CITADEL">CITADEL</option>
          <option value="AUTO_CHECK">AUTO_CHECK</option>
        </select>

        <select
          value={manualLevel}
          onChange={e => setManualLevel(e.target.value as any)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-mono focus:outline-none cursor-pointer"
        >
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="SEC_AUDIT">SEC_AUDIT</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>

        <button
          type="submit"
          className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
        >
          Commit Log
        </button>
      </form>

      {/* Main Logs Table / Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto font-mono text-xs">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950/80 sticky top-0 border-b border-slate-800 text-slate-400 text-[11px] uppercase z-10">
              <tr>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-3">Level</th>
                <th className="py-2.5 px-3">Subsystem</th>
                <th className="py-2.5 px-4">Event Message</th>
                <th className="py-2.5 px-3 text-right">Hash Signature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No log events match your current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(entry => (
                  <tr
                    key={entry.id}
                    onClick={() => setSelectedLog(entry)}
                    className="hover:bg-slate-850/80 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                      <span className="text-[10px] text-slate-600 block">
                        .{String(entry.timestamp % 1000).padStart(3, '0')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {getLevelBadge(entry.level)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold">
                        {entry.subsystem}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-200">
                      <div className="font-sans font-medium text-xs">{entry.message}</div>
                      {entry.details && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-xl">
                          {JSON.stringify(entry.details)}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-cyan-400/80 text-[10px] whitespace-nowrap">
                      {entry.hashSignature || '0x--'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal if a log is clicked */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl text-slate-100 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Log Attestation Record</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Record ID:</span>
                <span className="text-slate-200">{selectedLog.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Timestamp:</span>
                <span className="text-slate-200">{new Date(selectedLog.timestamp).toISOString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Subsystem:</span>
                <span className="text-cyan-300 font-bold">{selectedLog.subsystem}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Severity Level:</span>
                <span>{getLevelBadge(selectedLog.level)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Cryptographic Digest:</span>
                <span className="text-emerald-400">{selectedLog.hashSignature}</span>
              </div>
            </div>

            <div>
              <div className="text-slate-500 mb-1">Message:</div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-200 font-sans">
                {selectedLog.message}
              </div>
            </div>

            {selectedLog.details && (
              <div>
                <div className="text-slate-500 mb-1">Structured Telemetry Payload:</div>
                <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-cyan-300 overflow-x-auto max-h-44">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
