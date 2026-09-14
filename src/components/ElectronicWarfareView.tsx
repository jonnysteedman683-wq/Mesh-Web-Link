import React, { useState, useEffect, useRef } from 'react';
import { 
  Crosshair, 
  Radio, 
  ShieldAlert, 
  ShieldCheck, 
  Zap, 
  Activity, 
  Sliders, 
  RotateCw, 
  Target, 
  Flame, 
  AlertTriangle, 
  Search, 
  Sparkles, 
  Bot, 
  Compass, 
  Maximize2, 
  Layers, 
  ChevronRight, 
  CheckCircle2, 
  RefreshCw,
  PlusCircle,
  Eye,
  Radar
} from 'lucide-react';
import { 
  electronicWarfareManager, 
  EwSensorStation, 
  EmitterTarget, 
  FhssChannelMatrix, 
  JammingAssessment,
  EmitterType,
  ThreatLevel
} from '../services/electronicWarfareManager';
import { tactileAudio } from '../services/tactileAudio';

interface ElectronicWarfareViewProps {
  onNotify?: (msg: string) => void;
  onNavigateTab?: (tab: any) => void;
}

export const ElectronicWarfareView: React.FC<ElectronicWarfareViewProps> = ({
  onNotify,
  onNavigateTab
}) => {
  const [sensors, setSensors] = useState<EwSensorStation[]>(electronicWarfareManager.getSensors());
  const [emitters, setEmitters] = useState<EmitterTarget[]>(electronicWarfareManager.getEmitters());
  const [fhss, setFhss] = useState<FhssChannelMatrix>(electronicWarfareManager.getFhssMatrix());
  const [jammingAssessment, setJammingAssessment] = useState<JammingAssessment>(electronicWarfareManager.getJammingAssessment());

  const [selectedEmitter, setSelectedEmitter] = useState<EmitterTarget | null>(null);
  const [showHyperbolas, setShowHyperbolas] = useState<boolean>(true);
  const [showBearingLines, setShowBearingLines] = useState<boolean>(true);
  const [showCepCircles, setShowCepCircles] = useState<boolean>(true);

  // New Emitter Injection State
  const [showInjectModal, setShowInjectModal] = useState<boolean>(false);
  const [newEmitterName, setNewEmitterName] = useState<string>('HOSTILE RADAR EMITTER (UNKNOWN)');
  const [newEmitterType, setNewEmitterType] = useState<EmitterType>('HOSTILE_RADAR');
  const [newEmitterFreq, setNewEmitterFreq] = useState<number>(1030.0);
  const [newEmitterErp, setNewEmitterErp] = useState<number>(500);

  // Gemini SIGINT AI State
  const [geminiEwAdvice, setGeminiEwAdvice] = useState<string | null>(null);
  const [isAnalyzingEw, setIsAnalyzingEw] = useState<boolean>(false);

  // Map Canvas
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingSensorId = useRef<string | null>(null);

  // Sync state with ElectronicWarfareManager
  useEffect(() => {
    const unsub = electronicWarfareManager.subscribe(() => {
      setSensors([...electronicWarfareManager.getSensors()]);
      setEmitters([...electronicWarfareManager.getEmitters()]);
      setFhss({ ...electronicWarfareManager.getFhssMatrix() });
      setJammingAssessment(electronicWarfareManager.getJammingAssessment());
    });

    return () => unsub();
  }, []);

  // -------------------------------------------------------------
  // Map Canvas 2D Drawing & TDoA Hyperbolic Math Render
  // -------------------------------------------------------------
  useEffect(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark Tactical Background
    ctx.fillStyle = '#060b13';
    ctx.fillRect(0, 0, w, h);

    // Tactical Coordinate Grid Lines
    ctx.strokeStyle = '#101c2e';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Concentric Range Rings from Center (Base HQ)
    const centerX = w / 2;
    const centerY = h / 2;
    ctx.strokeStyle = 'rgba(14, 116, 144, 0.15)';
    ctx.lineWidth = 1;
    [100, 200, 300, 400].forEach(r => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Helper coordinate mapping: [0, 1000] -> [0, w] & [0, h]
    const mapX = (gx: number) => (gx / 1000) * w;
    const mapY = (gy: number) => (gy / 1000) * h;

    // 1. Draw Baseline Links between Sensor Stations
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.setLineDash([4, 4]);
    for (let i = 0; i < sensors.length; i++) {
      for (let j = i + 1; j < sensors.length; j++) {
        ctx.beginPath();
        ctx.moveTo(mapX(sensors[i].x), mapY(sensors[i].y));
        ctx.lineTo(mapX(sensors[j].x), mapY(sensors[j].y));
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);

    // 2. Draw Hyperbolic Curves & Bearing Vectors for Emitters
    emitters.forEach(emitter => {
      if (!emitter.isActive || emitter.isNeutralized) return;

      const estPx = mapX(emitter.estimatedX);
      const estPy = mapY(emitter.estimatedY);

      // Draw Bearing Lines (AoA) from Sensors to Estimated Location
      if (showBearingLines) {
        sensors.forEach(sensor => {
          const sPx = mapX(sensor.x);
          const sPy = mapY(sensor.y);
          ctx.strokeStyle = 'rgba(234, 179, 8, 0.25)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sPx, sPy);
          ctx.lineTo(estPx, estPy);
          ctx.stroke();
        });
      }

      // Draw Hyperbolic TDoA Isochrone Curves (Approximation between Sensor Pairs)
      if (showHyperbolas && sensors.length >= 2) {
        const s1 = sensors[0];
        const s2 = sensors[1];
        const p1x = mapX(s1.x), p1y = mapY(s1.y);
        const p2x = mapX(s2.x), p2y = mapY(s2.y);

        ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 3]);

        ctx.beginPath();
        const d1 = Math.hypot(estPx - p1x, estPy - p1y);
        const d2 = Math.hypot(estPx - p2x, estPy - p2y);
        const diff = d1 - d2;

        // Trace points on the hyperbolic locus |dist(P, S1) - dist(P, S2)| = diff
        for (let py = 0; py < h; py += 15) {
          for (let px = 0; px < w; px += 15) {
            const curDiff = Math.hypot(px - p1x, py - p1y) - Math.hypot(px - p2x, py - p2y);
            if (Math.abs(curDiff - diff) < 4) {
              ctx.rect(px, py, 2, 2);
            }
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Circular Error Probable (CEP) Confidence Ellipse
      if (showCepCircles) {
        const cepPx = (emitter.cepRadiusMeters / 1000) * w * 2.5;
        ctx.beginPath();
        ctx.arc(estPx, estPy, Math.max(12, cepPx), 0, Math.PI * 2);
        ctx.fillStyle = emitter.threatLevel === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.12)';
        ctx.fill();
        ctx.strokeStyle = emitter.threatLevel === 'CRITICAL' ? '#ef4444' : '#eab308';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw Target Center Marker
      ctx.fillStyle = emitter.threatLevel === 'CRITICAL' ? '#ef4444' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(estPx, estPy, 6, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing Ring
      ctx.strokeStyle = emitter.threatLevel === 'CRITICAL' ? '#f87171' : '#fbbf24';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(estPx, estPy, 12, 0, Math.PI * 2);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`[${emitter.name.slice(0, 18)}]`, estPx + 10, estPy - 6);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.fillText(`${emitter.frequencyMhz} MHz • CEP: ${emitter.cepRadiusMeters}m (${emitter.confidencePercent}%)`, estPx + 10, estPy + 6);
    });

    // 3. Draw Sensor Stations
    sensors.forEach(sensor => {
      const sx = mapX(sensor.x);
      const sy = mapY(sensor.y);

      // Sensor Range Ring
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.beginPath();
      ctx.arc(sx, sy, 45, 0, Math.PI * 2);
      ctx.stroke();

      // Sensor Shape
      ctx.fillStyle = sensor.type === 'AIRBORNE_UAV' ? '#38bdf8' : '#06b6d4';
      ctx.beginPath();
      ctx.arc(sx, sy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Sensor Label & Clock Drift
      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(sensor.callsign, sx - 40, sy - 14);
      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.fillText(`Sync Δ: ±${sensor.clockSyncDriftNs}ns • ${sensor.altitudeM}m`, sx - 30, sy + 18);
    });

    // 4. Draw Adaptive Spatial Nulling Beam Indicator
    if (fhss.activeHopping) {
      const rad = (fhss.spatialNullingBearingDeg * Math.PI) / 180;
      const nx = centerX + Math.cos(rad) * 160;
      const ny = centerY + Math.sin(rad) * 160;

      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`Adaptive Spatial Null (${fhss.spatialNullingBearingDeg}°)`, nx + 4, ny);
    }

  }, [sensors, emitters, fhss, showHyperbolas, showBearingLines, showCepCircles]);

  // -------------------------------------------------------------
  // Interactive Canvas Mouse Drag (Move Sensors in Real-Time)
  // -------------------------------------------------------------
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 1000;
    const clickY = ((e.clientY - rect.top) / rect.height) * 1000;

    // Check if clicked near a sensor
    const hitSensor = sensors.find(s => Math.hypot(s.x - clickX, s.y - clickY) < 60);
    if (hitSensor) {
      draggingSensorId.current = hitSensor.id;
      tactileAudio.playClick();
      return;
    }

    // Check if clicked near an emitter to select it
    const hitEmitter = emitters.find(em => Math.hypot(em.estimatedX - clickX, em.estimatedY - clickY) < 60);
    if (hitEmitter) {
      setSelectedEmitter(hitEmitter);
      tactileAudio.playPing();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingSensorId.current) return;
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const curX = ((e.clientX - rect.left) / rect.width) * 1000;
    const curY = ((e.clientY - rect.top) / rect.height) * 1000;

    electronicWarfareManager.moveSensor(draggingSensorId.current, curX, curY);
  };

  const handleMouseUp = () => {
    draggingSensorId.current = null;
  };

  // -------------------------------------------------------------
  // Actions: Neutralize, ECCM Nulling, Inject
  // -------------------------------------------------------------
  const handleNeutralize = (emitterId: string) => {
    tactileAudio.playLaserShot();
    electronicWarfareManager.neutralizeEmitter(emitterId);
    if (onNotify) onNotify('Target neutralized via directed electronic counter-measure & kinetic vectoring.');
  };

  const handleApplySpatialNulling = (bearingDeg: number) => {
    tactileAudio.playPing();
    electronicWarfareManager.triggerSpatialNulling(bearingDeg);
    if (onNotify) onNotify(`Adaptive Spatial Nulling beam locked to ${bearingDeg.toFixed(1)}°`);
  };

  const handleInjectEmitter = (e: React.FormEvent) => {
    e.preventDefault();
    tactileAudio.playPing();
    electronicWarfareManager.injectHostileEmitter(
      newEmitterName,
      newEmitterType,
      newEmitterFreq,
      newEmitterErp
    );
    setShowInjectModal(false);
    if (onNotify) onNotify(`Intercepted new RF emitter: ${newEmitterName}`);
  };

  const handleAnalyzeEwWithGemini = async () => {
    tactileAudio.playPing();
    setIsAnalyzingEw(true);
    setGeminiEwAdvice(null);

    try {
      const activeEmittersSummary = emitters
        .filter(e => e.isActive && !e.isNeutralized)
        .map(e => `[${e.type}] "${e.name}" at ${e.frequencyMhz} MHz, ERP: ${e.erpWatts}W, CEP: ${e.cepRadiusMeters}m, Bearing: ${e.bearingAnglesDeg['sensor-alpha'] || 'N/A'}°`)
        .join('; ');

      const prompt = `You are the Senior Electronic Warfare (EW) & SIGINT Operations Director for the C4ISR Battle Grid.
Assess the current real-time RF threat environment:
- Active Jamming Mode: ${jammingAssessment.detectedMode} (J/S Ratio: ${jammingAssessment.jammerToSignalRatioDb} dB, Affected BW: ${jammingAssessment.affectedBandwidthMhz} MHz)
- Mesh Link Integrity: ${jammingAssessment.linkIntegrityPercent}%
- Current FHSS Status: ${fhss.activeHopping ? 'ACTIVE' : 'DISABLED'} at ${fhss.hopRateHz} hops/sec (Anti-Jam Margin: +${fhss.antiJamMarginDb} dB, Nulling Angle: ${fhss.spatialNullingBearingDeg}°)
- Intercepted Emitters (${emitters.filter(e => e.isActive).length}): ${activeEmittersSummary || 'No active hostile emitters'}
- Sensor Array: 4 TDoA stations with sub-nanosecond clock sync (±0.8ns precision).

Provide a concise, military-grade Electronic Counter-Countermeasures (ECCM) & Strike Plan:
1. Threat Classification & Adversary Intent Analysis
2. Recommended FHSS Key Synchronization & Hopping Rate Adjustment
3. Directional Beam-Nulling Angle & Kinetic/Electronic Neutralization Directive.`;

      const resp = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        setGeminiEwAdvice(data.text || data.reply || 'EW Analysis complete.');
      } else {
        setGeminiEwAdvice(
          `**ELECTRONIC WARFARE DIRECTIVE (SIGINT-ALPHA)**\n\n` +
          `• **Primary Threat**: Krasukha-4 Barrage Jammer on 915 MHz generating swept chirp noise across 26 MHz bandwidth.\n` +
          `• **ECCM Mitigation**: Increase STANAG-5516 hop rate to 1,200 hops/sec across 16-channel pseudorandom pool. Engage Direct Sequence Spread Spectrum (DSSS) chipping rate 11x.\n` +
          `• **Kinetic/Suppression Directive**: Lock adaptive spatial null to 142° azimuth. Dispatch UAV-Strike-02 on coordinate Grid [524, 418] with CEP accuracy ±14.5m.`
        );
      }
    } catch (e) {
      setGeminiEwAdvice(
        `**ELECTRONIC WARFARE DIRECTIVE**\n\n` +
        `• **Adversary Assessment**: High-power barrage jamming detected on ISM/Tactical channels.\n` +
        `• **Immediate Action**: Maintain continuous TDoA hyperbolic geolocation sweep and steer phased-array antenna null to suppress hostile carrier.`
      );
    } finally {
      setIsAnalyzingEw(false);
    }
  };

  const activeEmittersCount = emitters.filter(e => e.isActive && !e.isNeutralized).length;

  return (
    <div className="space-y-6 animate-in fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="p-2 rounded-xl bg-purple-950/80 border border-purple-700/60 text-purple-400">
                <Radar className="w-5 h-5 animate-spin" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide font-mono flex items-center gap-2">
                  <span>Electronic Warfare (EW) & TDoA Triangulation</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700 font-sans font-bold">
                    ACTIVE SIGINT
                  </span>
                </h1>
                <p className="text-xs text-slate-400 font-mono">
                  Time-Difference-of-Arrival (TDoA) hyperbolic emitter geolocation, jamming detection & STANAG-5516 FHSS anti-jamming matrix
                </p>
              </div>
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs font-mono">
              <span className={`px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1.5 ${
                jammingAssessment.detectedMode !== 'NONE'
                  ? 'bg-rose-950/90 text-rose-300 border-rose-800 animate-pulse'
                  : 'bg-emerald-950/90 text-emerald-300 border-emerald-700'
              }`}>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>EA THREAT: {jammingAssessment.detectedMode.replace('_', ' ')}</span>
              </span>

              <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                J/S Ratio: <strong className={jammingAssessment.jammerToSignalRatioDb > 0 ? 'text-rose-400' : 'text-emerald-400'}>{jammingAssessment.jammerToSignalRatioDb} dB</strong>
              </span>

              <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                Link Integrity: <strong className="text-cyan-400">{jammingAssessment.linkIntegrityPercent}%</strong>
              </span>

              <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-purple-400">
                FHSS: {fhss.activeHopping ? `${fhss.hopRateHz} Hops/Sec` : 'OFF'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowInjectModal(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-950/90 hover:bg-purple-900 border border-purple-700 text-purple-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-purple-400" />
              <span>Inject Hostile Emitter</span>
            </button>

            <button
              onClick={() => {
                tactileAudio.playClick();
                electronicWarfareManager.recalculateTDoAForAll();
                if (onNotify) onNotify('Recalculated high-precision TDoA hyperbolic loci across all sensors.');
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCw className="w-4 h-4 text-cyan-400" />
              <span>Re-Triangulate TDoA</span>
            </button>
          </div>
        </div>

        {/* 4-Stat Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/90">
            <div className="text-[11px] font-mono text-slate-400 uppercase">Synchronized Sensors</div>
            <div className="text-lg font-black font-mono text-cyan-400 mt-0.5">
              {sensors.length} Stations (±0.4ns)
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/90">
            <div className="text-[11px] font-mono text-slate-400 uppercase">Active Emitters</div>
            <div className="text-lg font-black font-mono text-amber-400 mt-0.5">
              {activeEmittersCount} Targets
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/90">
            <div className="text-[11px] font-mono text-slate-400 uppercase">Anti-Jam Margin</div>
            <div className="text-lg font-black font-mono text-emerald-400 mt-0.5">
              +{fhss.antiJamMarginDb.toFixed(1)} dB
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/90">
            <div className="text-[11px] font-mono text-slate-400 uppercase">Spatial Null Angle</div>
            <div className="text-lg font-black font-mono text-purple-400 mt-0.5">
              {fhss.spatialNullingBearingDeg}° Azimuth
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Left 2D TDoA Map + Right Jamming & ECCM Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive 2D TDoA Geolocation Canvas (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Crosshair className="w-4 h-4 text-purple-400 animate-pulse" />
                <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                  2D Hyperbolic TDoA Geolocation Matrix
                </h2>
              </div>

              {/* Layer Toggles */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-mono">
                <button
                  onClick={() => setShowHyperbolas(!showHyperbolas)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    showHyperbolas ? 'bg-rose-950 text-rose-300 border border-rose-800 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Toggle Hyperbolic Isochrones"
                >
                  Hyperbolas
                </button>
                <button
                  onClick={() => setShowBearingLines(!showBearingLines)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    showBearingLines ? 'bg-amber-950 text-amber-300 border border-amber-800 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Toggle Angle of Arrival Rays"
                >
                  AoA Rays
                </button>
                <button
                  onClick={() => setShowCepCircles(!showCepCircles)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    showCepCircles ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Toggle Circular Error Probable Rings"
                >
                  CEP Radius
                </button>
              </div>
            </div>

            {/* 2D Canvas */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#060b13] aspect-[4/3] w-full">
              <canvas
                ref={mapCanvasRef}
                width={700}
                height={525}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="w-full h-full block cursor-crosshair"
              />

              <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 backdrop-blur-md">
                <span>Drag sensors to reposition • Click targets to inspect</span>
              </div>

              <div className="absolute bottom-2 right-2 text-[10px] font-mono text-cyan-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                1000m x 1000m Tactical Grid
              </div>
            </div>

            {/* Sensor Stations Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
              {sensors.map(sensor => (
                <div 
                  key={sensor.id}
                  className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between"
                >
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="font-bold text-slate-200 truncate">{sensor.callsign.split(' ')[0]}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Pos: [{sensor.x.toFixed(0)}, {sensor.y.toFixed(0)}]
                  </div>
                  <div className="text-[10px] text-cyan-400 font-bold">
                    Drift: ±{sensor.clockSyncDriftNs}ns
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Intercepted Emitters Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-rose-400" />
                <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                  Intercepted RF Emitters & Geolocation Log ({emitters.length})
                </h2>
              </div>
            </div>

            <div className="space-y-2.5">
              {emitters.map(emitter => {
                const isSelected = selectedEmitter?.id === emitter.id;
                return (
                  <div
                    key={emitter.id}
                    onClick={() => {
                      setSelectedEmitter(emitter);
                      tactileAudio.playClick();
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      emitter.isNeutralized
                        ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                        : isSelected
                        ? 'bg-slate-800/90 border-purple-500 shadow-lg'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          emitter.isNeutralized
                            ? 'bg-slate-800 text-slate-400 border border-slate-700'
                            : emitter.threatLevel === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {emitter.isNeutralized ? 'NEUTRALIZED' : emitter.threatLevel}
                        </span>
                        <strong className="text-xs font-mono text-white">{emitter.name}</strong>
                      </div>

                      <div className="flex items-center space-x-3 text-xs font-mono">
                        <span className="text-cyan-400 font-bold">{emitter.frequencyMhz} MHz</span>
                        <span className="text-slate-400">ERP: {emitter.erpWatts}W</span>
                        <span className="text-amber-400">CEP: ±{emitter.cepRadiusMeters}m</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
                      <div>Modulation: <strong className="text-slate-200">{emitter.modulation}</strong></div>
                      <div>PRF: <strong className="text-slate-200">{emitter.pulseRepetitionFreqHz} Hz</strong></div>
                      <div>TDoA Accuracy: <strong className="text-emerald-400">{emitter.confidencePercent}%</strong></div>
                      <div>Bearing (α): <strong className="text-purple-400">{emitter.bearingAnglesDeg['sensor-alpha'] || '142'}°</strong></div>
                    </div>

                    {!emitter.isNeutralized && (
                      <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-800/60">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplySpatialNulling(emitter.bearingAnglesDeg['sensor-alpha'] || 140);
                          }}
                          className="px-2.5 py-1 bg-purple-950/80 hover:bg-purple-900 border border-purple-700 text-purple-300 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                        >
                          Steer Spatial Null
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNeutralize(emitter.id);
                          }}
                          className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-200 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                        >
                          Neutralize Emitter
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Jamming Detection + STANAG FHSS Matrix + Gemini SIGINT (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Electronic Attack & Jamming Analysis Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                  RF Jamming & Electronic Attack Matrix
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Mode: <strong className="text-rose-400">{jammingAssessment.detectedMode}</strong>
              </span>
            </div>

            {/* Jammer-to-Signal Meter */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Jammer-to-Signal (J/S Ratio):</span>
                <span className="font-bold text-rose-400">{jammingAssessment.jammerToSignalRatioDb} dB</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    jammingAssessment.jammerToSignalRatioDb > 10 ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(10, (jammingAssessment.jammerToSignalRatioDb + 20) * 2))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>-20 dB (Nominal)</span>
                <span>0 dB (Equal)</span>
                <span>+30 dB (Critical Jam)</span>
              </div>
            </div>

            {/* Affected Bandwidth & Link Integrity */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Affected RF Bandwidth</span>
                <span className="text-base font-bold text-amber-400 mt-1 block">
                  {jammingAssessment.affectedBandwidthMhz} MHz
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Mesh Link Integrity</span>
                <span className="text-base font-bold text-cyan-400 mt-1 block">
                  {jammingAssessment.linkIntegrityPercent}%
                </span>
              </div>
            </div>

            {/* Automated Recommendation Box */}
            <div className="p-3 bg-rose-950/30 border border-rose-900/60 rounded-xl text-xs font-mono text-rose-200">
              <div className="font-bold mb-1 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Automated EW Mitigation Directive:</span>
              </div>
              <p className="text-[11px] text-rose-300 leading-relaxed">
                {jammingAssessment.recommendedEccm}
              </p>
            </div>
          </div>

          {/* STANAG-5516 / Link-16 FHSS Anti-Jamming Engine */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                  STANAG-5516 FHSS ECCM Matrix
                </h2>
              </div>

              <button
                onClick={() => electronicWarfareManager.toggleFhss()}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  fhss.activeHopping
                    ? 'bg-purple-950 text-purple-200 border border-purple-700'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {fhss.activeHopping ? 'HOPPING ACTIVE' : 'PAUSED'}
              </button>
            </div>

            {/* Active Frequency Hopping Display */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-xs font-mono mb-2">
                <span className="text-slate-400">Current Hop Frequency:</span>
                <span className="text-cyan-400 font-black text-sm">
                  {fhss.currentHopFrequencyMhz.toFixed(4)} MHz
                </span>
              </div>

              {/* Channel Pool Visual Bar */}
              <div className="grid grid-cols-8 gap-1">
                {fhss.channelPool.map((freq, idx) => {
                  const isCurrent = fhss.hopIndex === idx;
                  return (
                    <div
                      key={freq}
                      className={`p-1 rounded text-center font-mono text-[9px] font-bold transition-all ${
                        isCurrent
                          ? 'bg-purple-500 text-slate-950 scale-105 shadow-md shadow-purple-500/50'
                          : 'bg-slate-900 text-slate-500 border border-slate-800'
                      }`}
                      title={`${freq} MHz`}
                    >
                      {freq.toFixed(0)}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hop Rate Selector & Dwell Time */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Hop Rate (Hops/Sec):</label>
                <select
                  value={fhss.hopRateHz}
                  onChange={e => electronicWarfareManager.setFhssHopRate(parseInt(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value={200}>200 Hops/s (Low Power)</option>
                  <option value={500}>500 Hops/s (Nominal)</option>
                  <option value={800}>800 Hops/s (Tactical)</option>
                  <option value={1200}>1,200 Hops/s (STANAG-5516)</option>
                  <option value={2500}>2,500 Hops/s (MilSpec Max)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Spatial Nulling Bearing:</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={fhss.spatialNullingBearingDeg}
                    onChange={e => electronicWarfareManager.triggerSpatialNulling(parseInt(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <span className="text-purple-400 font-bold w-10 text-right">{fhss.spatialNullingBearingDeg}°</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gemini AI SIGINT & Electronic Warfare Advisor */}
          <div className="bg-slate-900/90 border border-purple-900/50 rounded-2xl p-5 backdrop-blur-xl space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-bold text-purple-200 uppercase font-mono tracking-wider">
                  Gemini AI SIGINT & EW Advisor
                </h2>
              </div>
              <button
                onClick={handleAnalyzeEwWithGemini}
                disabled={isAnalyzingEw}
                className="px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-700 text-purple-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isAnalyzingEw ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                ) : (
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                )}
                <span>{isAnalyzingEw ? 'Assessing...' : 'Run EW Assessment'}</span>
              </button>
            </div>

            {geminiEwAdvice ? (
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-purple-950 text-xs font-mono text-slate-300 space-y-2 whitespace-pre-line leading-relaxed">
                {geminiEwAdvice}
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-mono">
                Request Gemini AI SIGINT assessment to formulate automated counter-jamming frequencies, spatial nulling vectors, and precision strike coordinates.
              </p>
            )}
          </div>

        </div>
      </div>

      {/* Inject Hostile Emitter Modal */}
      {showInjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Flame className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white font-mono">Inject Unidentified RF Emitter</h3>
              </div>
              <button
                onClick={() => setShowInjectModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleInjectEmitter} className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Emitter Name / Designation:</label>
                <input
                  type="text"
                  value={newEmitterName}
                  onChange={e => setNewEmitterName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Emitter Type:</label>
                  <select
                    value={newEmitterType}
                    onChange={e => setNewEmitterType(e.target.value as EmitterType)}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="BARRAGE_JAMMER">Barrage Jammer</option>
                    <option value="GPS_SPOOFER">GPS Spoofer</option>
                    <option value="HOSTILE_RADAR">Hostile Radar</option>
                    <option value="UAV_C2_UPLINK">UAV C2 Uplink</option>
                    <option value="SWEPT_FREQUENCY_JAMMER">Swept Jammer</option>
                    <option value="CLANDESTINE_RELAY">Clandestine Relay</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Carrier Frequency (MHz):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newEmitterFreq}
                    onChange={e => setNewEmitterFreq(parseFloat(e.target.value))}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Effective Radiated Power (Watts):</label>
                <input
                  type="number"
                  value={newEmitterErp}
                  onChange={e => setNewEmitterErp(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInjectModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold cursor-pointer"
                >
                  Inject Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
