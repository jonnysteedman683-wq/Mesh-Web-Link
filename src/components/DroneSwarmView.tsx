import React, { useState, useEffect } from 'react';
import { droneSwarmManager } from '../services/droneSwarmManager';
import { DroneSwarmUnit, DroneFlightMode, DronePayloadType } from '../types';
import { 
  Plane, 
  Battery, 
  Radio, 
  Compass, 
  Navigation, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Crosshair, 
  Eye, 
  RotateCcw, 
  Layers, 
  Activity, 
  Wifi, 
  Play, 
  Pause, 
  Plus, 
  Sliders,
  MapPin
} from 'lucide-react';
import { tactileAudio } from '../services/tactileAudio';

interface DroneSwarmViewProps {
  onNotify?: (msg: string) => void;
}

export const DroneSwarmView: React.FC<DroneSwarmViewProps> = ({ onNotify }) => {
  const [drones, setDrones] = useState<DroneSwarmUnit[]>(droneSwarmManager.getDrones());
  const [selectedDroneId, setSelectedDroneId] = useState<string>(drones[0]?.id || '');
  const [isDeployModalOpen, setIsDeployModalOpen] = useState<boolean>(false);

  // New drone form
  const [newCallsign, setNewCallsign] = useState<string>('Viper-Five');
  const [newModel, setNewModel] = useState<string>('MQ-9M Stealth Recon');
  const [newPayload, setNewPayload] = useState<DronePayloadType>('EO_IR_OPTICAL');

  useEffect(() => {
    const unsub = droneSwarmManager.subscribe(updatedDrones => {
      setDrones(updatedDrones);
    });
    return unsub;
  }, []);

  const selectedDrone = drones.find(d => d.id === selectedDroneId) || drones[0];

  const handleModeChange = (mode: DroneFlightMode) => {
    if (!selectedDrone) return;
    tactileAudio.playClick(1300);
    droneSwarmManager.setFlightMode(selectedDrone.id, mode);
    if (onNotify) onNotify(`Drone Directive: ${selectedDrone.callsign} flight mode set to ${mode}`);
  };

  const handlePayloadChange = (payload: DronePayloadType) => {
    if (!selectedDrone) return;
    tactileAudio.playClick(1200);
    droneSwarmManager.setPayload(selectedDrone.id, payload);
    if (onNotify) onNotify(`Payload Sensor: ${selectedDrone.callsign} reconfigured to ${payload}`);
  };

  const handleToggleIsolation = (droneId: string) => {
    tactileAudio.playClick(900);
    droneSwarmManager.toggleDroneIsolation(droneId);
    const d = drones.find(u => u.id === droneId);
    if (onNotify) {
      onNotify(`Isolation status changed for ${d?.callsign || droneId}`);
    }
  };

  const handleReturnAll = () => {
    tactileAudio.playDenied();
    droneSwarmManager.returnAllToBase();
    if (onNotify) onNotify('EMERGENCY: Swarm Return to Base protocol broadcasted.');
  };

  const handleDeployNew = async (e: React.FormEvent) => {
    e.preventDefault();
    tactileAudio.playVerificationSuccess();
    await droneSwarmManager.deployDrone(newCallsign, newModel, newPayload);
    setIsDeployModalOpen(false);
    if (onNotify) onNotify(`New Aerial Recon Drone deployed: ${newCallsign}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Swarm Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide font-tactical">
                Autonomous Aerial Drone Swarm & Recon
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                ACTIVE SQUADRON: {drones.length} UNITS
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              Real-time telemetry, autonomous waypoint orbits, SIGINT/EO-IR sensor feeds, and RF relay bridges.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsDeployModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold font-mono transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Deploy UAV</span>
          </button>

          <button
            onClick={handleReturnAll}
            className="px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60 text-xs font-mono font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Emergency Return All Drones to Base"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RTB All Swarm</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Telemetry Map + Swarm List & Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Drone Cards (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span>Airframe Unit</span>
            <span>Link / Batt</span>
          </div>

          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {drones.map(drone => {
              const isSelected = selectedDrone?.id === drone.id;
              const isIsolated = drone.isolationStatus === 'ISOLATED';

              return (
                <div
                  key={drone.id}
                  onClick={() => {
                    setSelectedDroneId(drone.id);
                    tactileAudio.playClick(1000);
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500/70 shadow-md ring-1 ring-cyan-500/40'
                      : isIsolated
                      ? 'bg-rose-950/20 border-rose-900/60 opacity-70'
                      : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white font-tactical">
                          {drone.callsign}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          isIsolated ? 'bg-rose-900 text-rose-200' : 'bg-slate-800 text-cyan-300'
                        }`}>
                          {drone.id}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {drone.model} • {drone.targetSector}
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs">
                      <div className={`font-bold ${drone.batteryPercent < 25 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {drone.batteryPercent}% BATT
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {drone.rfLinkQualityPercent}% RF ({drone.rssiDbm} dBm)
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1 text-cyan-300">
                      <Activity className="w-3 h-3" />
                      {drone.flightMode.replace('_', ' ')}
                    </span>
                    <span>Alt: {drone.altitudeMeters}m</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected UAV HUD & Swarm Orbit Map (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedDrone && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
                      UAV TACTICAL TELEMETRY HUD
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      selectedDrone.isolationStatus === 'ISOLATED'
                        ? 'bg-rose-950 text-rose-300 border border-rose-700'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    }`}>
                      {selectedDrone.isolationStatus === 'ISOLATED' ? 'CIRCUIT-ISOLATED' : 'LINK SYNCHRONIZED'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white font-tactical mt-0.5">
                    {selectedDrone.callsign} <span className="text-slate-400 text-sm font-mono font-normal">({selectedDrone.model})</span>
                  </h3>
                  <div className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      {selectedDrone.latitude.toFixed(4)}° N, {selectedDrone.longitude.toFixed(4)}° E
                    </span>
                    <span>GPS Satellites: {selectedDrone.gpsLockSatellites}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleIsolation(selectedDrone.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      selectedDrone.isolationStatus === 'ISOLATED'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-700/60'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{selectedDrone.isolationStatus === 'ISOLATED' ? 'Restore Mesh Link' : 'Isolate UAV Link'}</span>
                  </button>
                </div>
              </div>

              {/* 4-Box Telemetry Gauges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
                    <Battery className="w-3 h-3 text-emerald-400" />
                    Power Reserve
                  </div>
                  <div className="text-lg font-bold font-mono text-white">
                    {selectedDrone.batteryPercent}%
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${selectedDrone.batteryPercent < 25 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${selectedDrone.batteryPercent}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
                    <Compass className="w-3 h-3 text-cyan-400" />
                    Altitude & Speed
                  </div>
                  <div className="text-lg font-bold font-mono text-white">
                    {selectedDrone.altitudeMeters}m
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Speed: {selectedDrone.groundSpeedKts} kts • Hdg: {selectedDrone.headingDeg}°
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-indigo-400" />
                    RF Link-16 Quality
                  </div>
                  <div className="text-lg font-bold font-mono text-white">
                    {selectedDrone.rfLinkQualityPercent}%
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    RSSI: {selectedDrone.rssiDbm} dBm
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
                    <Layers className="w-3 h-3 text-amber-400" />
                    Active Payload
                  </div>
                  <div className="text-xs font-bold font-mono text-amber-300 truncate">
                    {selectedDrone.payload}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono">
                    Status: {selectedDrone.payloadStatus}
                  </div>
                </div>
              </div>

              {/* Tactical Aerial Vector Plotter Canvas Simulation */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <Navigation className="w-3.5 h-3.5" />
                    TACTICAL WAYPOINT ORBIT RADIAL (SECTOR-7 COORDINATES)
                  </span>
                  <span>STANAG 4586 UAV PROTOCOL</span>
                </div>

                <div className="w-full h-44 bg-radial from-slate-900 to-slate-950 rounded-lg border border-slate-800/80 relative flex items-center justify-center overflow-hidden">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-30" />
                  
                  {/* Radar Circles */}
                  <div className="w-36 h-36 rounded-full border border-cyan-500/20 absolute" />
                  <div className="w-24 h-24 rounded-full border border-cyan-500/30 absolute" />
                  <div className="w-12 h-12 rounded-full border border-cyan-500/40 absolute" />

                  {/* Drone Markers */}
                  {drones.map(d => {
                    const isFocus = d.id === selectedDrone.id;
                    const posX = (d.flightPath[0]?.x || 50) + '%';
                    const posY = (d.flightPath[0]?.y || 50) + '%';

                    return (
                      <div
                        key={d.id}
                        style={{ left: posX, top: posY }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 transition-all ${
                          isFocus ? 'z-20 scale-110' : 'z-10 opacity-70'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                          d.isolationStatus === 'ISOLATED'
                            ? 'bg-rose-500'
                            : isFocus
                            ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]'
                            : 'bg-indigo-400'
                        }`}>
                          <Plane className="w-2 h-2 text-slate-950" />
                        </div>
                        <span className="text-[9px] font-mono font-bold text-white bg-slate-900/90 px-1 rounded border border-slate-700">
                          {d.callsign}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Direct Command Controls: Flight Modes & Payload Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Flight Directives */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="text-xs font-mono font-bold text-slate-300">
                    Flight Directives
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['AUTONOMOUS_ORBIT', 'WAYPOINT_PATROL', 'PERIMETER_SURVEILLANCE', 'RF_RELAY_STATION'] as DroneFlightMode[]).map(mode => (
                      <button
                        key={mode}
                        onClick={() => handleModeChange(mode)}
                        className={`px-2.5 py-2 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer text-left ${
                          selectedDrone.flightMode === mode
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {mode.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sensor Payloads */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="text-xs font-mono font-bold text-slate-300">
                    Recon Sensor Package
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['EO_IR_OPTICAL', 'LIDAR_MAPPING', 'SIGINT_INTERCEPT', 'MESH_RF_EXTENDER'] as DronePayloadType[]).map(payload => (
                      <button
                        key={payload}
                        onClick={() => handlePayloadChange(payload)}
                        className={`px-2.5 py-2 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer text-left ${
                          selectedDrone.payload === payload
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {payload.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Deploy UAV Modal */}
      {isDeployModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white font-tactical text-base">
                Deploy UAV to Swarm Array
              </h3>
              <button
                onClick={() => setIsDeployModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleDeployNew} className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Callsign</label>
                <input
                  type="text"
                  value={newCallsign}
                  onChange={e => setNewCallsign(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Airframe Model</label>
                <select
                  value={newModel}
                  onChange={e => setNewModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="MQ-9M Stealth Recon">MQ-9M Stealth Recon</option>
                  <option value="RQ-4X Global Eye">RQ-4X Global Eye</option>
                  <option value="AeroVironment Puma AE-4">AeroVironment Puma AE-4</option>
                  <option value="Skydio X10D Tactical">Skydio X10D Tactical</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Payload Sensor</label>
                <select
                  value={newPayload}
                  onChange={e => setNewPayload(e.target.value as DronePayloadType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="EO_IR_OPTICAL">EO/IR High-Definition Optical</option>
                  <option value="LIDAR_MAPPING">3D LiDAR Terrain Mapping</option>
                  <option value="SIGINT_INTERCEPT">SIGINT & RF Intercept</option>
                  <option value="MESH_RF_EXTENDER">Mesh Relay Extender Pod</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeployModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold"
                >
                  Launch & Link UAV
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
