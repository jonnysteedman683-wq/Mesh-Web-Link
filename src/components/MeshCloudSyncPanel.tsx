import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CloudRain, 
  RefreshCw, 
  Users, 
  Radio, 
  ShieldAlert, 
  CheckCircle2, 
  Plus, 
  ExternalLink, 
  LogOut, 
  Server,
  Zap,
  Lock,
  Compass
} from 'lucide-react';
import { meshCloudSyncService } from '../services/meshCloudSyncService';
import { MeshCloudSyncState, MeshMission } from '../types';
import { auth, signInWithGoogle, signInAsGuest } from '../services/firebase';
import { tactileAudio } from '../services/tactileAudio';

interface Props {
  onNotify?: (title: string, msg: string, type: 'info' | 'success' | 'warn') => void;
}

export const MeshCloudSyncPanel: React.FC<Props> = ({ onNotify }) => {
  const [syncState, setSyncState] = useState<MeshCloudSyncState>(meshCloudSyncService.getState());
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMissionName, setNewMissionName] = useState('');
  const [newMissionCode, setNewMissionCode] = useState('');
  const [newFreq, setNewFreq] = useState('915.000 MHz');
  const [newPreset, setNewPreset] = useState('LONG_FAST');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubSync = meshCloudSyncService.subscribe(setSyncState);
    const unsubAuth = auth.onAuthStateChanged(setCurrentUser);
    return () => {
      unsubSync();
      unsubAuth();
    };
  }, []);

  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMissionName.trim() || !newMissionCode.trim()) return;

    setIsSubmitting(true);
    tactileAudio.playClick(1100);
    try {
      const created = await meshCloudSyncService.createMission(
        newMissionName.trim(),
        newMissionCode.trim(),
        newFreq,
        newPreset
      );
      onNotify?.('Mission Established', `Tactical mission room #${created.code} synchronized to cloud.`, 'success');
      setShowCreateModal(false);
      setNewMissionName('');
      setNewMissionCode('');
    } catch (err: any) {
      onNotify?.('Creation Failed', err.message || 'Error creating mission', 'warn');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async (mId: string) => {
    tactileAudio.playClick(1000);
    const success = await meshCloudSyncService.joinMission(mId);
    if (success) {
      onNotify?.('Joined Mission', `Subscribed to multi-operator cloud feed.`, 'success');
    }
  };

  const handleLeave = () => {
    tactileAudio.playClick(800);
    meshCloudSyncService.leaveMission();
    onNotify?.('Disconnected', 'Left cloud mission room.', 'info');
  };

  const handleStandDownSos = async () => {
    tactileAudio.playClick(1200);
    await meshCloudSyncService.standDownEmergencySos();
    onNotify?.('SOS Stand Down', 'Emergency distress cancelled across all operators.', 'info');
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border ${
            syncState.activeMission 
              ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-400 shadow-sm shadow-emerald-900/40' 
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}>
            <Cloud className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide">
                Tactical Multi-Operator Cloud Sync
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800 text-indigo-300 font-bold">
                FIRESTORE REALTIME
              </span>
              {syncState.activeMission && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  SYNC ACTIVE
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Aggregates live Meshtastic nodes, waypoints, and LoRa packets across multiple field operators.
            </p>
          </div>
        </div>

        {/* Right Side: Auth & Room Actions */}
        <div className="flex items-center gap-2">
          {!currentUser ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => signInWithGoogle().catch(() => {})}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Operator Sign-In</span>
              </button>
              <button
                type="button"
                onClick={() => signInAsGuest('OP-FIELD-SCOUT').catch(() => {})}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 cursor-pointer"
              >
                Guest Op
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {currentUser.displayName || currentUser.email || 'Tactical Operator'}
              </span>

              {syncState.activeMission ? (
                <button
                  type="button"
                  onClick={handleLeave}
                  className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Leave Room</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/30 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Mission Room</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SOS Active Alert Banner */}
      {syncState.activeSosAlert && (
        <div className="mt-3 p-3 bg-red-950/80 border-2 border-red-500 rounded-xl flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2.5 text-red-200">
            <ShieldAlert className="w-5 h-5 text-red-400 animate-bounce" />
            <div>
              <div className="text-xs font-bold tracking-wider text-red-300 uppercase">
                EMERGENCY DISTRESS BEACON BROADCAST BY {syncState.activeSosAlert.initiatorName || 'OPERATOR'}
              </div>
              <div className="text-[11px] font-mono text-red-400">
                Lat: {syncState.activeSosAlert.latitude?.toFixed(4)}, Lon: {syncState.activeSosAlert.longitude?.toFixed(4)} • Type: {syncState.activeSosAlert.emergencyType || 'TACTICAL_MAYDAY'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleStandDownSos}
            className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-all"
          >
            Acknowledge / Stand Down
          </button>
        </div>
      )}

      {/* Sync Status Metrics Strip */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase font-mono block">Mission Code</span>
          <span className="font-bold text-white font-mono flex items-center gap-1.5 truncate">
            {syncState.activeMission ? syncState.activeMission.code : 'UNASSIGNED'}
          </span>
        </div>

        <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase font-mono block">Cloud Nodes Synced</span>
          <span className="font-bold text-cyan-400 font-mono flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            {syncState.cloudNodesCount} Mesh Radios
          </span>
        </div>

        <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase font-mono block">Tactical Waypoints</span>
          <span className="font-bold text-pink-400 font-mono flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-pink-400" />
            {syncState.cloudWaypointsCount} Shared Pins
          </span>
        </div>

        <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase font-mono block">Last Cloud Sync</span>
          <span className="font-bold text-emerald-400 font-mono flex items-center gap-1 truncate">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            {syncState.lastSyncedTimestamp 
              ? new Date(syncState.lastSyncedTimestamp).toLocaleTimeString() 
              : 'Standby'}
          </span>
        </div>
      </div>

      {/* Available Mission Rooms Drawer if Not In Mission */}
      {!syncState.activeMission && currentUser && syncState.availableMissions.length > 0 && (
        <div className="mt-3 p-3 bg-slate-950/90 rounded-xl border border-indigo-950">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              Available Mission Rooms in Firestore
            </span>
            <button
              type="button"
              onClick={() => meshCloudSyncService.fetchAvailableMissions()}
              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {syncState.availableMissions.map(m => (
              <div
                key={m.id}
                className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl hover:border-indigo-600 transition-all flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <span>{m.name}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="text-indigo-400 font-bold">{m.code}</span>
                    <span>• {m.frequency}</span>
                    <span>• {m.modemPreset}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleJoin(m.id)}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-all"
                >
                  Join
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Mission Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cloud className="w-4 h-4 text-indigo-400" />
                <span>Establish Tactical Mission Room</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMission} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Mission Codename</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OP-DESERT-SENTINEL"
                  value={newMissionCode}
                  onChange={e => setNewMissionCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Mission Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Search and Rescue Sector 4"
                  value={newMissionName}
                  onChange={e => setNewMissionName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-mono">LoRa Band</label>
                  <select
                    value={newFreq}
                    onChange={e => setNewFreq(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none font-mono"
                  >
                    <option value="915.000 MHz">US 915 MHz</option>
                    <option value="868.000 MHz">EU 868 MHz</option>
                    <option value="433.000 MHz">433 MHz Ham</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-mono">Modem Preset</label>
                  <select
                    value={newPreset}
                    onChange={e => setNewPreset(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none font-mono"
                  >
                    <option value="LONG_FAST">Long Fast (Standard)</option>
                    <option value="LONG_MODERATE">Long Moderate</option>
                    <option value="SHORT_TURBO">Short Turbo</option>
                    <option value="VERY_LONG_SLOW">Very Long Slow</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold cursor-pointer shadow-md shadow-indigo-600/40 disabled:opacity-50"
                >
                  {isSubmitting ? 'Establishing...' : 'Create & Join'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
