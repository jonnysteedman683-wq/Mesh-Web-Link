import React, { useState, useEffect, useRef } from 'react';
import { Plane, Compass, Gauge, Battery, ShieldAlert, Play, Square, Navigation, Radio, Terminal, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { mavlinkProtocolService } from '../services/mavlinkProtocolService';
import { MavlinkConnectionState, MavlinkFlightMode } from '../types';
import { tactileAudio } from '../services/tactileAudio';

interface MavlinkStanagViewProps {
  onNotify?: (msg: string) => void;
}

export const MavlinkStanagView: React.FC<MavlinkStanagViewProps> = ({ onNotify }) => {
  const [state, setState] = useState<MavlinkConnectionState>(mavlinkProtocolService.getState());
  const [baudRate, setBaudRate] = useState<number>(57600);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const horizonCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const unsub = mavlinkProtocolService.subscribe(() => {
      setState(mavlinkProtocolService.getState());
    });
    return () => unsub();
  }, []);

  // Render Artificial Horizon Primary Flight Display (PFD)
  useEffect(() => {
    const canvas = horizonCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const rollRad = ((state.telemetry.rollDeg || 0) * Math.PI) / 180;
    const pitchOffset = (state.telemetry.pitchDeg || 0) * 2.2;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-rollRad);
    ctx.translate(0, pitchOffset);

    // Sky
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-width, -height * 2, width * 2, height * 2);

    // Ground
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-width, 0, width * 2, height * 2);

    // Horizon line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-width, 0);
    ctx.lineTo(width, 0);
    ctx.stroke();

    // Pitch ladder rungs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.font = '9px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';

    [-20, -10, 10, 20].forEach(deg => {
      const y = -deg * 2.2;
      const w = Math.abs(deg) === 20 ? 40 : 25;
      ctx.beginPath();
      ctx.moveTo(-w, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.fillText(`${deg}°`, w + 12, y + 3);
    });

    ctx.restore();

    // Aircraft fixed reticle
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Left wing
    ctx.moveTo(centerX - 45, centerY);
    ctx.lineTo(centerX - 15, centerY);
    ctx.lineTo(centerX - 15, centerY + 8);
    // Center pip
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    // Right wing
    ctx.moveTo(centerX + 15, centerY + 8);
    ctx.lineTo(centerX + 15, centerY);
    ctx.lineTo(centerX + 45, centerY);
    ctx.stroke();

    // Roll indicator arc at top
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 80, -Math.PI * 0.75, -Math.PI * 0.25);
    ctx.stroke();

    // Roll pointer
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-rollRad);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(0, -80);
    ctx.lineTo(-5, -72);
    ctx.lineTo(5, -72);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [state.telemetry.rollDeg, state.telemetry.pitchDeg]);

  const handleConnectSerial = async () => {
    tactileAudio.playClick();
    setErrorMsg(null);
    try {
      await mavlinkProtocolService.connectPhysicalSerial(baudRate);
      if (onNotify) onNotify(`Connected to MAVLink hardware over WebSerial (${baudRate} baud).`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'WebSerial connection failed. Use Chrome/Edge over HTTPS.');
      if (onNotify) onNotify('WebSerial connection cancelled or failed.');
    }
  };

  const handleConnectSimulated = () => {
    tactileAudio.playClick();
    setErrorMsg(null);
    mavlinkProtocolService.connectSimulated();
    if (onNotify) onNotify('Loaded PX4 SITL / MAVLink v2 flight telemetry stream.');
  };

  const handleDisconnect = () => {
    tactileAudio.playClick();
    mavlinkProtocolService.disconnect();
    if (onNotify) onNotify('Disconnected MAVLink autopilot link.');
  };

  const handleArmToggle = () => {
    tactileAudio.playPing();
    if (state.telemetry.isArmed) {
      mavlinkProtocolService.disarmMotors();
      if (onNotify) onNotify('DISARMED autopilot motors.');
    } else {
      mavlinkProtocolService.armMotors();
      if (onNotify) onNotify('ARMED autopilot propulsion.');
    }
  };

  const handleTakeoff = () => {
    tactileAudio.playPing();
    mavlinkProtocolService.executeTakeoff(25);
    if (onNotify) onNotify('Commanded autonomous takeoff to 25m AGL.');
  };

  const handleRtl = () => {
    tactileAudio.playPing();
    mavlinkProtocolService.executeRtl();
    if (onNotify) onNotify('Commanded Return-To-Launch (RTL).');
  };

  const handleSetMode = (mode: MavlinkFlightMode) => {
    tactileAudio.playClick();
    mavlinkProtocolService.setFlightMode(mode);
    if (onNotify) onNotify(`Autopilot flight mode switched to ${mode}`);
  };

  const handleEmergencyKill = () => {
    tactileAudio.playAlarm();
    if (confirm('CRITICAL ACTION: Execute emergency motor shutdown immediately?')) {
      mavlinkProtocolService.emergencyMotorKill();
      if (onNotify) onNotify('EMERGENCY MOTOR CUTOFF EXECUTED!');
    }
  };

  const t = state.telemetry;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Plane className="w-5 h-5 text-cyan-400" />
            <span>STANAG 4586 / MAVLink v2 Telemetry & GCS</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700">
              Autopilot V2
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time binary telemetry ingestion, primary flight display HUD, and ArduPilot/PX4 command dispatcher.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {state.isConnected ? (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold">{state.portName}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900 text-emerald-200">
                  {t.isArmed ? 'ARMED' : 'DISARMED'}
                </span>
              </div>
              <button
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <select
                value={baudRate}
                onChange={e => setBaudRate(parseInt(e.target.value))}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-300 rounded-xl px-2 py-1.5"
              >
                <option value="57600">57,600 Baud (SiK Radio)</option>
                <option value="115200">115,200 Baud (USB Pixhawk)</option>
                <option value="921600">921,600 Baud (Fast Serial)</option>
              </select>

              <button
                onClick={handleConnectSerial}
                disabled={state.isConnecting}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-cyan-600/30 disabled:opacity-50"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>{state.isConnecting ? 'Opening...' : 'Connect WebSerial'}</span>
              </button>

              <button
                onClick={handleConnectSimulated}
                className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plane className="w-3.5 h-3.5 text-cyan-400" />
                <span>Simulate SITL</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Flight HUD & Telemetry Instruments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* PFD Artificial Horizon Canvas */}
        <div className="lg:col-span-4 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="w-full flex justify-between items-center mb-2 text-xs">
            <span className="text-slate-400 uppercase font-bold text-[10px]">Primary Flight Display (PFD)</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.isArmed ? 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
              {t.isArmed ? 'PROPULSION ARMED' : 'MOTORS SAFE'}
            </span>
          </div>

          <div className="w-48 h-48 rounded-full overflow-hidden border-2 border-slate-700 shadow-2xl relative bg-black">
            <canvas
              ref={horizonCanvasRef}
              width={192}
              height={192}
              className="w-full h-full block"
            />
          </div>

          <div className="w-full grid grid-cols-3 gap-1 text-center mt-3 pt-2 border-t border-slate-900 text-[10px] text-slate-400">
            <div>
              <span>ROLL:</span> <strong className="text-cyan-300">{t.rollDeg}°</strong>
            </div>
            <div>
              <span>PITCH:</span> <strong className="text-amber-300">{t.pitchDeg}°</strong>
            </div>
            <div>
              <span>YAW:</span> <strong className="text-emerald-300">{t.yawDeg.toFixed(0)}°</strong>
            </div>
          </div>
        </div>

        {/* Flight Gauges & Kinematics */}
        <div className="lg:col-span-8 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
                <Gauge className="w-3 h-3 text-cyan-400" />
                <span>Groundspeed</span>
              </div>
              <div className="text-lg font-bold text-white mt-1">
                {t.groundSpeedMps.toFixed(1)} <span className="text-xs font-normal text-slate-400">m/s</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Airspeed: {t.airSpeedMps.toFixed(1)} m/s</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
                <Navigation className="w-3 h-3 text-amber-400" />
                <span>Altitude AGL</span>
              </div>
              <div className="text-lg font-bold text-amber-300 mt-1">
                {t.altRelativeMeters.toFixed(1)} <span className="text-xs font-normal text-slate-400">m</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">MSL: {t.altMslMeters.toFixed(1)}m • {t.climbRateMps > 0 ? `+${t.climbRateMps}` : t.climbRateMps} m/s</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
                <Compass className="w-3 h-3 text-emerald-400" />
                <span>GNSS Constellation</span>
              </div>
              <div className="text-lg font-bold text-emerald-300 mt-1">
                {t.satellitesVisible} <span className="text-xs font-normal text-slate-400">Sats</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{t.gpsFixType} • HDOP: {t.hdop}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
                <Battery className="w-3 h-3 text-purple-400" />
                <span>6S Battery Pack</span>
              </div>
              <div className="text-lg font-bold text-purple-300 mt-1">
                {t.batteryVoltage.toFixed(1)}V <span className="text-xs font-normal text-slate-400">({t.batteryRemainingPercent.toFixed(0)}%)</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Current: {t.batteryCurrentA.toFixed(1)}A</div>
            </div>
          </div>

          {/* Autopilot Tactical Command Bar */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Plane className="w-3.5 h-3.5 text-cyan-400" />
                <span>STANAG 4586 Autopilot GCS Commands</span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>Active Mode:</span>
                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                  {t.flightMode}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={handleArmToggle}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  t.isArmed
                    ? 'bg-amber-950 hover:bg-amber-900 border border-amber-700 text-amber-300'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                }`}
              >
                {t.isArmed ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{t.isArmed ? 'Disarm Propulsion' : 'Arm Autopilot'}</span>
              </button>

              <button
                onClick={handleTakeoff}
                disabled={!t.isArmed}
                className="px-3.5 py-2 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plane className="w-3.5 h-3.5 text-cyan-400" />
                <span>Takeoff (25m)</span>
              </button>

              <button
                onClick={handleRtl}
                className="px-3.5 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 border border-purple-700 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                <span>Return To Launch (RTL)</span>
              </button>

              <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

              {/* Mode Selectors */}
              {(['GUIDED', 'AUTO', 'LOITER', 'POSHOLD', 'ALT_HOLD'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => handleSetMode(mode)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    t.flightMode === mode
                      ? 'bg-cyan-600 text-slate-950'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {mode}
                </button>
              ))}

              <button
                onClick={handleEmergencyKill}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ml-auto shadow-md shadow-rose-600/30"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Emergency Kill</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAVLink v2 Binary Packet Inspector */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
              MAVLink v2 Real-Time Binary Frame Stream
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            Magic: 0xFD • Drop Rate: {t.packetDropRate}% • Link RSSI: {t.rssiPercent}%
          </span>
        </div>

        <div className="space-y-1 max-h-[220px] overflow-y-auto font-mono text-[11px] pr-1">
          {state.packetLogs.map(pkt => (
            <div
              key={`${pkt.seq}-${pkt.timestamp}`}
              className="p-1.5 rounded bg-slate-900 border border-slate-850 flex flex-wrap items-center justify-between gap-2 text-slate-300"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">#{pkt.seq.toString().padStart(3, '0')}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                  {pkt.msgName} ({pkt.msgId})
                </span>
                <span className="text-slate-300">{pkt.payloadSummary}</span>
              </div>
              <div className="text-[9px] text-slate-500 select-all font-mono">
                {pkt.rawHex}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
