import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Database, Radio, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { offlineMeshStorage, FieldModeStats, QueuedDirectiveRecord } from '../services/offlineMeshStorage';
import { tactileAudio } from '../services/tactileAudio';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [stats, setStats] = useState<FieldModeStats | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [queuedDirectives, setQueuedDirectives] = useState<QueuedDirectiveRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsub = offlineMeshStorage.subscribe((newStats) => {
      setStats(newStats);
    });

    return () => unsub();
  }, []);

  const handleToggleFieldMode = () => {
    tactileAudio.playClick(900);
    if (!stats) return;
    offlineMeshStorage.setFieldMode(!stats.isFieldModeActive);
  };

  const handleOpenDrawer = async () => {
    tactileAudio.playClick(1000);
    const dirs = await offlineMeshStorage.getAllDirectives();
    setQueuedDirectives(dirs);
    setShowDrawer(true);
  };

  const handleTriggerReconcile = async () => {
    tactileAudio.playClick(1100);
    setIsSyncing(true);
    await offlineMeshStorage.reconcileQueueWithMesh();
    const dirs = await offlineMeshStorage.getAllDirectives();
    setQueuedDirectives(dirs);
    setIsSyncing(false);
  };

  const isFieldActive = stats?.isFieldModeActive || !isOnline;

  return (
    <>
      {/* Floating Tactical Field Mode Badge (Bottom Left) */}
      <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2">
        {isFieldActive ? (
          <button
            onClick={handleOpenDrawer}
            className="flex items-center gap-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 px-3 py-1.5 text-xs font-mono font-medium text-amber-300 shadow-lg backdrop-blur-md transition-all cursor-pointer group"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span>{!isOnline ? 'COMMS SEVERED' : 'FIELD MODE ACTIVE'}</span>
            {stats && stats.pendingDirectivesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-amber-500/30 text-[10px] font-bold text-amber-200">
                {stats.pendingDirectivesCount} QUEUED
              </span>
            )}
          </button>
        ) : (
          <button
            onClick={handleOpenDrawer}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 px-2.5 py-1 text-[11px] font-mono font-medium text-slate-300 shadow-md backdrop-blur-md transition-all cursor-pointer"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span className="text-slate-400">MESH SYNCED</span>
            {stats && stats.pendingDirectivesCount > 0 && (
              <span className="px-1 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                {stats.pendingDirectivesCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Disconnected Field Mode & CRDT Reconciliation Modal Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-2xl overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className={`p-2 rounded-xl border ${isFieldActive ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'}`}>
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-mono">
                    Tactical Field Mode & IndexedDB Sync
                  </h3>
                  <p className="text-[11px] text-slate-400 font-sans">
                    CRDT Lamport vector replication for air-gapped field missions.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDrawer(false)}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono px-2 py-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕ Close
              </button>
            </div>

            {/* Status Metric Strip */}
            <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
              <div className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Uplink State</div>
                <div className={`font-bold mt-0.5 ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </div>
              </div>
              <div className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Outbox Queue</div>
                <div className="font-bold text-amber-300 mt-0.5">
                  {stats?.pendingDirectivesCount || 0} Pending
                </div>
              </div>
              <div className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">CRDT Clock</div>
                <div className="font-bold text-cyan-300 mt-0.5">
                  #{stats?.localLamportClock || 100}
                </div>
              </div>
            </div>

            {/* Field Mode Air-Gap Toggle */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold font-mono text-slate-200">
                  Force Air-Gapped Field Mode
                </div>
                <div className="text-[11px] text-slate-400 font-sans">
                  Simulate severed radio link; buffers all directives into IndexedDB without transmitting.
                </div>
              </div>

              <button
                onClick={handleToggleFieldMode}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                  stats?.isFieldModeActive
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                {stats?.isFieldModeActive ? 'DISCONNECT ON' : 'FORCE DISCONNECT'}
              </button>
            </div>

            {/* Queued Directives List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="font-bold uppercase tracking-wide">Offline Outbox Records</span>
                <span className="text-[10px] text-slate-500">IndexedDB: MeshTacticalOfflineDB</span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {queuedDirectives.length === 0 ? (
                  <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/60 text-center text-xs text-slate-400 font-mono">
                    No offline records queued. Local store synchronized.
                  </div>
                ) : (
                  queuedDirectives.map((d) => (
                    <div
                      key={d.id}
                      className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{d.codename}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300">
                            Clock #{d.lamportClock}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {d.directiveText}
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            d.status === 'SYNCED'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300 animate-pulse'
                          }`}
                        >
                          {d.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[10px] font-mono text-slate-400">
                Cache Size: ~{stats?.storageUsageKb || 12} KB
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTriggerReconcile}
                  disabled={!isOnline || isSyncing || (stats?.pendingDirectivesCount === 0)}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-slate-950 text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Reconciling...' : 'Reconcile CRDT'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
