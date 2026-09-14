import React, { useState, useEffect, useRef } from 'react';
import { AgentNode } from '../types';
import { meshFabric } from '../fabric/meshFabric';
import { verificationLoopManager } from '../services/verificationLoopManager';
import { 
  Crosshair, 
  Radar, 
  Radio, 
  Target, 
  Volume2, 
  VolumeX, 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  Zap, 
  Eye, 
  Compass, 
  RotateCw,
  AlertTriangle,
  Flame,
  Send,
  Sliders,
  Sparkles
} from 'lucide-react';

interface TacticalRadarViewProps {
  nodes: AgentNode[];
}

// Boid physics particle representing an autonomous drone in the sensor swarm
interface DroneBoid {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  altitude: number; // meters
  battery: number; // %
  signalStrength: number; // dBm
}

interface TacticalWaypoint {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'patrol' | 'target' | 'anomaly' | 'outpost';
  active: boolean;
}

interface RadioTransmission {
  id: string;
  sender: string;
  callsign: string;
  message: string;
  timestamp: string;
  priority: 'normal' | 'tactical' | 'alert';
}

export const TacticalRadarView: React.FC<TacticalRadarViewProps> = ({ nodes }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tactical Controls State
  const [swarmCount, setSwarmCount] = useState<number>(128);
  const [radarZoom, setRadarZoom] = useState<number>(1); // 1x, 1.5x, 2x
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [voiceSynthesizer, setVoiceSynthesizer] = useState<boolean>(true);
  const [formationMode, setFormationMode] = useState<'patrol' | 'converge' | 'perimeter' | 'intercept'>('patrol');
  
  // Tactical Toggles
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showTrails, setShowTrails] = useState<boolean>(true);
  const [showRangeRings, setShowRangeRings] = useState<boolean>(true);
  const [selectedWaypoint, setSelectedWaypoint] = useState<TacticalWaypoint | null>(null);

  // Tactical Waypoints & Threats
  const [waypoints, setWaypoints] = useState<TacticalWaypoint[]>([
    { id: 'wp-alpha', name: 'Waypoint Alpha (Delta-01)', x: 180, y: -120, type: 'patrol', active: true },
    { id: 'wp-bravo', name: 'Waypoint Bravo (Perimeter 4)', x: -220, y: 160, type: 'patrol', active: true },
    { id: 'wp-relay', name: 'Relay Beacon (Hermes Node)', x: 0, y: -240, type: 'outpost', active: true },
  ]);

  const [activeHostile, setActiveHostile] = useState<{ x: number; y: number; active: boolean; jammed: boolean } | null>(null);
  const [airborneJammerActive, setAirborneJammerActive] = useState<boolean>(false);
  const [radioTransmissions, setRadioTransmissions] = useState<RadioTransmission[]>([
    {
      id: 'tx-01',
      sender: 'Hermes Relay',
      callsign: 'HERMES-COORD',
      message: 'Sensor drone swarm synchronized on 5.8GHz frequency hopper. 128 nodes operational.',
      timestamp: '00:01:14',
      priority: 'normal'
    },
    {
      id: 'tx-02',
      sender: 'Alpha Squad Leader',
      callsign: 'ALPHA-ACTUAL',
      message: 'Sector 7-G outer perimeter sweep underway. Thermal baseline clear.',
      timestamp: '00:01:28',
      priority: 'tactical'
    }
  ]);

  // Squad simulation positions
  const squadAlphaPos = useRef<{ x: number; y: number; angle: number }>({ x: 160, y: -90, angle: 0 });
  const squadBravoPos = useRef<{ x: number; y: number; angle: number }>({ x: -180, y: 120, angle: Math.PI });

  // Drones Boid Array Ref
  const dronesRef = useRef<DroneBoid[]>([]);
  const radarAngleRef = useRef<number>(0);
  const targetPointRef = useRef<{ x: number; y: number }>({ x: 0, y: -120 });

  // Web Audio Procedural Sound Effects
  const playTacticalSfx = (type: 'beep' | 'squelch' | 'alert' | 'scan' | 'jamming') => {
    if (!audioEnabled || typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      if (type === 'beep') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'jamming') {
        const bufferSize = ctx.sampleRate * 0.35;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.7;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + 0.25);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
      } else if (type === 'squelch') {
        const bufferSize = ctx.sampleRate * 0.05;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2200;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
      } else if (type === 'alert') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(580, ctx.currentTime);
        osc.frequency.setValueAtTime(320, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'scan') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      // AudioContext policy
    }
  };

  const speakTactical = (text: string) => {
    if (!voiceSynthesizer || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      u.pitch = 0.95;
      u.volume = 0.8;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  };

  const addRadioTransmission = (sender: string, callsign: string, message: string, priority: 'normal' | 'tactical' | 'alert' = 'normal') => {
    const now = new Date();
    const ts = now.toTimeString().split(' ')[0];
    const newTx: RadioTransmission = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      sender,
      callsign,
      message,
      timestamp: ts,
      priority,
    };
    setRadioTransmissions(prev => [newTx, ...prev.slice(0, 15)]);
    playTacticalSfx(priority === 'alert' ? 'alert' : 'squelch');
  };

  // Initialize Drones
  useEffect(() => {
    const arr: DroneBoid[] = [];
    for (let i = 0; i < swarmCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 160;
      arr.push({
        id: i,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        heading: angle,
        altitude: 40 + Math.floor(Math.random() * 30),
        battery: 82 + Math.floor(Math.random() * 18),
        signalStrength: -65 - Math.floor(Math.random() * 20),
      });
    }
    dronesRef.current = arr;
  }, [swarmCount]);

  // Main Canvas Radar Animation Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(centerX, centerY) - 20;

      // Radar Sweep Rotation
      radarAngleRef.current = (radarAngleRef.current + dt * 1.8) % (Math.PI * 2);

      // Squad positions orbit
      squadAlphaPos.current.angle += dt * 0.2;
      squadAlphaPos.current.x = Math.cos(squadAlphaPos.current.angle) * 170;
      squadAlphaPos.current.y = Math.sin(squadAlphaPos.current.angle) * 110;

      squadBravoPos.current.angle -= dt * 0.25;
      squadBravoPos.current.x = Math.cos(squadBravoPos.current.angle) * 210;
      squadBravoPos.current.y = Math.sin(squadBravoPos.current.angle) * 150;

      // Update Boids Flocking Simulation
      const drones = dronesRef.current;
      const target = activeHostile && activeHostile.active
        ? activeHostile
        : targetPointRef.current;

      for (let i = 0; i < drones.length; i++) {
        const boid = drones[i];
        let sepX = 0, sepY = 0;
        let aliX = 0, aliY = 0;
        let cohX = 0, cohY = 0;
        let neighbors = 0;

        for (let j = 0; j < drones.length; j++) {
          if (i === j) continue;
          const other = drones[j];
          const dx = other.x - boid.x;
          const dy = other.y - boid.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < 1600) { // Neighbor radius = 40px
            const dist = Math.sqrt(distSq);
            if (dist < 18) {
              sepX -= dx / (dist || 1);
              sepY -= dy / (dist || 1);
            }
            aliX += other.vx;
            aliY += other.vy;
            cohX += other.x;
            cohY += other.y;
            neighbors++;
          }
        }

        // Apply flocking weights
        if (neighbors > 0) {
          aliX /= neighbors;
          aliY /= neighbors;
          cohX = (cohX / neighbors) - boid.x;
          cohY = (cohY / neighbors) - boid.y;
        }

        // Steer towards formation target
        let targetPullX = 0;
        let targetPullY = 0;

        if (formationMode === 'converge' || (activeHostile && activeHostile.active)) {
          const tdx = target.x - boid.x;
          const tdy = target.y - boid.y;
          const tdist = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
          targetPullX = (tdx / tdist) * 1.8;
          targetPullY = (tdy / tdist) * 1.8;
        } else if (formationMode === 'perimeter') {
          // Orbit target in a ring
          const curDist = Math.sqrt(boid.x * boid.x + boid.y * boid.y) || 1;
          const desiredRadius = 180;
          const radErr = desiredRadius - curDist;
          const tangentAngle = Math.atan2(boid.y, boid.x) + Math.PI / 2;
          targetPullX = Math.cos(tangentAngle) * 1.2 + (boid.x / curDist) * radErr * 0.05;
          targetPullY = Math.sin(tangentAngle) * 1.2 + (boid.y / curDist) * radErr * 0.05;
        } else {
          // Patrol wander towards target anchor
          const tdx = target.x - boid.x;
          const tdy = target.y - boid.y;
          const tdist = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
          targetPullX = (tdx / tdist) * 0.7;
          targetPullY = (tdy / tdist) * 0.7;
        }

        // Acceleration
        boid.vx += sepX * 0.12 + aliX * 0.05 + cohX * 0.02 + targetPullX;
        boid.vy += sepY * 0.12 + aliY * 0.05 + cohY * 0.02 + targetPullY;

        // Speed limit
        const speed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy) || 1;
        const maxSpeed = formationMode === 'converge' ? 3.8 : 2.4;
        if (speed > maxSpeed) {
          boid.vx = (boid.vx / speed) * maxSpeed;
          boid.vy = (boid.vy / speed) * maxSpeed;
        }

        boid.x += boid.vx;
        boid.y += boid.vy;

        // Boundary reflection
        const dFromCenter = Math.sqrt(boid.x * boid.x + boid.y * boid.y);
        const radarBound = maxRadius / radarZoom - 15;
        if (dFromCenter > radarBound) {
          boid.vx -= (boid.x / dFromCenter) * 1.5;
          boid.vy -= (boid.y / dFromCenter) * 1.5;
        }

        boid.heading = Math.atan2(boid.vy, boid.vx);
      }

      // -------------------------------------------------------------
      // RENDER CANVAS
      // -------------------------------------------------------------
      // Fade trail background
      if (showTrails) {
        ctx.fillStyle = 'rgba(2, 6, 23, 0.28)';
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.save();
      ctx.translate(centerX, centerY);

      // Radar Range Rings
      if (showRangeRings) {
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
        ctx.lineWidth = 1;

        const rings = [0.25, 0.5, 0.75, 1.0];
        rings.forEach((rRatio) => {
          const r = maxRadius * rRatio;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();

          // Distance labels
          ctx.fillStyle = 'rgba(100, 116, 139, 0.7)';
          ctx.font = '10px monospace';
          ctx.fillText(`${Math.round(rRatio * 1000 / radarZoom)}m`, 6, -r + 12);
        });

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(-maxRadius, 0);
        ctx.lineTo(maxRadius, 0);
        ctx.moveTo(0, -maxRadius);
        ctx.lineTo(0, maxRadius);
        ctx.stroke();

        // 30-degree tick marks
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
          const x1 = Math.cos(a) * (maxRadius - 6);
          const y1 = Math.sin(a) * (maxRadius - 6);
          const x2 = Math.cos(a) * maxRadius;
          const y2 = Math.sin(a) * maxRadius;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
          ctx.stroke();
        }
      }

      // RF / Thermal Signature Heatmap Contours
      if (showHeatmap) {
        // Draw ambient RF gradient
        const radGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, maxRadius);
        radGrad.addColorStop(0, 'rgba(6, 182, 212, 0.05)');
        radGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.02)');
        radGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(0, 0, maxRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Radar Sweep Beam & Phosphor Persistence
      const sweepAngle = radarAngleRef.current;
      const sweepGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxRadius);
      sweepGrad.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
      sweepGrad.addColorStop(0.7, 'rgba(6, 182, 212, 0.1)');
      sweepGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, maxRadius, sweepAngle - 0.45, sweepAngle);
      ctx.closePath();
      ctx.fillStyle = sweepGrad;
      ctx.fill();

      // Sharp sweep line
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(sweepAngle) * maxRadius, Math.sin(sweepAngle) * maxRadius);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // Render Central Command (Me) Anchor
      ctx.save();
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#6ee7b7';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('COMMAND (ME)', -32, 24);
      ctx.restore();

      // Render Tactical Waypoints
      waypoints.forEach((wp) => {
        const sx = wp.x * radarZoom;
        const sy = wp.y * radarZoom;
        ctx.save();
        ctx.translate(sx, sy);

        if (wp.type === 'patrol') {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-6, -6, 12, 12);
        } else if (wp.type === 'outpost') {
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px monospace';
        ctx.fillText(wp.name, 10, 3);
        ctx.restore();
      });

      // Render Ground Tactical Squads (Alpha & Bravo)
      // Alpha Squad
      const aX = squadAlphaPos.current.x * radarZoom;
      const aY = squadAlphaPos.current.y * radarZoom;
      ctx.save();
      ctx.translate(aX, aY);
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
      ctx.strokeRect(-12, -12, 24, 24);
      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('ALPHA SQUAD [BFT: 32U-84102]', 14, 3);
      ctx.restore();

      // Bravo Recon
      const bX = squadBravoPos.current.x * radarZoom;
      const bY = squadBravoPos.current.y * radarZoom;
      ctx.save();
      ctx.translate(bX, bY);
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(251, 146, 60, 0.4)';
      ctx.strokeRect(-10, -10, 20, 20);
      ctx.fillStyle = '#fdba74';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('BRAVO RECON [BFT: 32U-86490]', 14, 3);
      ctx.restore();

      // Render Airborne Jammer Directed Electronic Attack Beam (if active)
      if (airborneJammerActive) {
        const tgtX = (activeHostile && activeHostile.active ? activeHostile.x : targetPointRef.current.x) * radarZoom;
        const tgtY = (activeHostile && activeHostile.active ? activeHostile.y : targetPointRef.current.y) * radarZoom;
        const tgtAngle = Math.atan2(tgtY, tgtX);
        const tgtDist = Math.sqrt(tgtX * tgtX + tgtY * tgtY) || 1;

        ctx.save();
        // Pulsating translucent jamming cone
        const coneOpacity = 0.14 + Math.sin(time * 0.015) * 0.06;
        ctx.fillStyle = `rgba(244, 63, 94, ${coneOpacity})`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, tgtDist + 40, tgtAngle - 0.22, tgtAngle + 0.22);
        ctx.closePath();
        ctx.fill();

        // Radiating RF ripple wave arcs
        const ripplePhase = (time * 0.06) % 60;
        ctx.strokeStyle = 'rgba(251, 113, 133, 0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        for (let r = 1; r <= 3; r++) {
          const arcR = (ripplePhase + r * 45) % (tgtDist + 30);
          ctx.beginPath();
          ctx.arc(0, 0, arcR, tgtAngle - 0.2, tgtAngle + 0.2);
          ctx.stroke();
        }

        // Direct high-power electronic laser vector
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.9)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(tgtX, tgtY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Interference ring over target
        const jamTargetRing = ((time * 0.05) % 25) + 12;
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(tgtX, tgtY, jamTargetRing, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('⚡ AIRBORNE RF JAMMING [J/S +26 dB]', tgtX + 16, tgtY - 14);
        ctx.font = '8px monospace';
        ctx.fillStyle = '#fda4af';
        ctx.fillText('STATUS: TELEMETRY DENIED / EYE COLLAPSED', tgtX + 16, tgtY - 3);

        ctx.restore();
      }

      // Render Active Hostile / Jammer Anomaly (if any)
      if (activeHostile && activeHostile.active) {
        const hx = activeHostile.x * radarZoom;
        const hy = activeHostile.y * radarZoom;
        ctx.save();
        ctx.translate(hx, hy);

        // Pulsing warning ring
        const pulse = (Math.sin(time * 0.008) + 1) * 8 + 10;
        ctx.strokeStyle = activeHostile.jammed ? 'rgba(234, 179, 8, 0.8)' : 'rgba(239, 68, 68, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = activeHostile.jammed ? '#eab308' : '#ef4444';
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(8, 8);
        ctx.lineTo(-8, 8);
        ctx.closePath();
        ctx.fill();

        ctx.font = 'bold 10px monospace';
        ctx.fillText(activeHostile.jammed ? '[JAMMED & CONTAINED]' : '! TGT-0994 BYZANTINE SIGNATURE !', -85, -16);
        ctx.font = '8px monospace';
        ctx.fillStyle = '#f87171';
        ctx.fillText('FREQ: 341.225 MHz | IFF: UNMATCHED', -85, -5);
        ctx.restore();
      }

      // Render Autonomous Drone Swarm Boids
      drones.forEach((d) => {
        const dx = d.x * radarZoom;
        const dy = d.y * radarZoom;

        // Proximity to radar sweep beam determines brightness
        const droneAngle = Math.atan2(dy, dx);
        let angleDiff = (sweepAngle - droneAngle) % (Math.PI * 2);
        if (angleDiff < 0) angleDiff += Math.PI * 2;
        const beamIntensity = Math.max(0.3, 1 - angleDiff / 1.2);

        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(d.heading);

        // Drone triangle
        ctx.fillStyle = `rgba(6, 182, 212, ${beamIntensity})`;
        ctx.beginPath();
        ctx.moveTo(4.5, 0);
        ctx.lineTo(-3, -2.5);
        ctx.lineTo(-1.5, 0);
        ctx.lineTo(-3, 2.5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      });

      ctx.restore(); // restore translate(centerX, centerY)

      // Outer Radar Bezel
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 14;
      ctx.strokeRect(0, 0, width, height);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [swarmCount, radarZoom, showHeatmap, showTrails, showRangeRings, formationMode, activeHostile, waypoints, airborneJammerActive]);

  // Handle Canvas Click to set Waypoint or Target
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const mapX = (clickX - centerX) / radarZoom;
    const mapY = (clickY - centerY) / radarZoom;

    targetPointRef.current = { x: mapX, y: mapY };

    playTacticalSfx('beep');
    addRadioTransmission(
      'Central Command (Me)',
      'CMD-ACTUAL',
      `Target coordinates updated: Vector (${Math.round(mapX)}, ${Math.round(mapY)}). Swarm re-routing.`,
      'tactical'
    );
  };

  // Tactical Commands
  const handleConverge = () => {
    setFormationMode('converge');
    playTacticalSfx('beep');
    speakTactical("Swarm convergence sequence initiated. Hermes reporting tight cluster formation.");
    addRadioTransmission('Hermes Swarm Lead', 'HERMES-COORD', 'Swarm convergence order executed. 128 drones locking defensive perimeter.', 'tactical');

    // Encrypted mesh message
    meshFabric.sendEncryptedMessage(
      'node-me',
      'node-hermes',
      '[TACTICAL VECTOR DIRECTIVE] All 128 sensor drones converge on primary target coordinates.',
      'task_dispatch'
    );
  };

  const handleSectorSweep = () => {
    setFormationMode('patrol');
    playTacticalSfx('scan');
    speakTactical("Sector sweep initiated. Multi-spectral sensors active.");
    addRadioTransmission('Hermes Swarm Lead', 'HERMES-COORD', 'Expanding swarm across 1,000 meter grid. Multi-spectral RF survey nominal.', 'normal');

    // Real verification loop trigger for radar scan
    verificationLoopManager.verifyAndPersistResult(
      'rf_scan',
      'Tactical Swarm Radar Sweep',
      {
        mode: 'multi_spectral_rf_scan',
        gridRadiusMeters: 1000,
        carrierFreqMhz: 5800.0,
        activeDrones: swarmCount,
        detectedEchoes: Math.floor(Math.random() * 6) + 3,
        noiseFloorDbm: -98,
      },
      {
        rfFreqMhz: 5800.0,
        rssi: -64,
        detectedTargets: Math.floor(Math.random() * 6) + 3,
      },
      'Radar scan pulse attested. Multi-spectral sweep completed across 1,000m perimeter grid.'
    );
  };

  const handleSpawnAnomaly = () => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 140;
    const hostilePos = {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      active: true,
      jammed: false,
    };
    setActiveHostile(hostilePos);
    playTacticalSfx('alert');
    speakTactical("Warning! Unidentified RF signature detected in Sector 7-G. Anomaly logged.");
    addRadioTransmission(
      'Inquisitor Auditor',
      'INQUISITOR-DEFENSE',
      'Byzantine transmission detected! Out-of-band signature mismatch. Recommending immediate containment.',
      'alert'
    );
  };

  const handleToggleAirborneJammer = async () => {
    const next = !airborneJammerActive;
    setAirborneJammerActive(next);

    if (next) {
      playTacticalSfx('jamming');
      speakTactical("Airborne Electronic Attack pod active. Directed RF jamming beam engaging target vector. Byzantine link suppressed.");
      addRadioTransmission(
        'Airborne Jammer Pod',
        'AN/ALQ-99',
        'Active Electronic Attack initiated! Directed high-power microwave emission focused on target sector. Adversary link denied.',
        'alert'
      );

      if (activeHostile) {
        setActiveHostile({ ...activeHostile, jammed: true });
      }

      await meshFabric.sendEncryptedMessage(
        'node-me',
        'node-inquisitor',
        '[AIRBORNE ELECTRONIC ATTACK] Directed jamming pod transmitting on Sector 7-G. J/S ratio +26 dB. Telemetry denied.',
        'task_dispatch'
      );

      // Verify and persist jamming outcome
      verificationLoopManager.verifyAndPersistResult(
        'jammer',
        'Airborne EA Pod (AN/ALQ-99)',
        {
          target: 'Sector 7-G Byzantine Node',
          erpPowerWatts: 450,
          jamMode: 'directed_hpm_beam',
          jamToSignalRatioDb: 26,
          result: 'TELEMETRY_DENIED',
        },
        {
          jamPowerWatts: 450,
          rfFreqMhz: 341.225,
          rssi: -42,
        },
        'Automatic check loop verified airborne electronic attack emission. Adversary telemetry suppressed.'
      );
    } else {
      playTacticalSfx('beep');
      speakTactical("Airborne jamming pod disengaged. Returning to passive surveillance.");
      addRadioTransmission(
        'Airborne Jammer Pod',
        'AN/ALQ-99',
        'Jamming transmitter secured. RF envelope returned to passive stealth mode.',
        'tactical'
      );
    }
  };

  const handleContainThreat = async () => {
    if (!activeHostile) return;
    setActiveHostile({ ...activeHostile, jammed: true });
    setFormationMode('converge');
    targetPointRef.current = { x: activeHostile.x, y: activeHostile.y };

    playTacticalSfx('alert');
    speakTactical("Cryptographic quarantine deployed. Alpha squad intercepting. Byzantine node isolated.");
    addRadioTransmission(
      'Omnisary & Inquisitor',
      'DEFENSE-JOINT',
      'Target isolated. Alpha squad visual lock. Inquisitor has severed peer links and rotated mesh keys.',
      'alert'
    );

    // Mesh fabric alert dispatch
    await meshFabric.sendEncryptedMessage(
      'node-omnisary',
      'node-squad-alpha',
      '[KINETIC CONTAINMENT] Intercept hostile RF transmitter. Secure sector perimeter.',
      'task_dispatch'
    );

    await meshFabric.sendEncryptedMessage(
      'node-inquisitor',
      'node-me',
      '[SECURITY AUDIT COMPLETE] Hostile signature quarantined. Cryptographic key rotation executed with zero data leakage.',
      'task_result'
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1.5">
                <Radar className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '4s' }} />
                <span>Tactical Holo-Radar & Drone Swarm Battlemap</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                128 Autonomous Boids Simulated
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              Real-Time Geospatial Fleet Radar & Swarm Flocking
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Physics-driven Reynolds Boids simulation modeling live sensor drone swarms, kinetic squad patrols, and RF telemetry heatmaps. Click directly on the radar grid to drop tactical waypoints or deploy Byzantine threat anomalies.
            </p>
          </div>

          {/* Quick Audio & Action Bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono ${
                audioEnabled
                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="Toggle Tactical Radio Audio & Squelch SFX"
            >
              {audioEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              <span>{audioEnabled ? 'RADIO COMMS ON' : 'AUDIO MUTED'}</span>
            </button>

            <button
              onClick={() => setVoiceSynthesizer(!voiceSynthesizer)}
              className={`p-2.5 rounded-xl border transition-colors cursor-pointer text-xs font-mono ${
                voiceSynthesizer
                  ? 'bg-cyan-950/80 border-cyan-700 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="AI Tactical Vocal Announcements"
            >
              <span>{voiceSynthesizer ? 'AI VOICE ON' : 'VOICE OFF'}</span>
            </button>
          </div>
        </div>

        {/* Tactical Status Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
              <Crosshair className="w-3 h-3 text-cyan-400" />
              Active Swarm Units
            </span>
            <div className="text-xl font-bold font-mono text-cyan-400">
              {swarmCount} Drones
            </div>
            <div className="text-[10px] text-slate-400">Assigned: node-swarm-sensor</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
              <Compass className="w-3 h-3 text-emerald-400" />
              Swarm Flocking Mode
            </span>
            <div className="text-sm font-bold font-mono text-emerald-400 uppercase tracking-wider">
              {formationMode}
            </div>
            <div className="text-[10px] text-slate-400">Cohesion + Separation Active</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              Perimeter Security
            </span>
            <div className="text-sm font-bold font-mono text-amber-300 truncate">
              {activeHostile ? (activeHostile.jammed ? 'THREAT CONTAINED' : 'WARNING: ANOMALY') : 'NOMINAL (100%)'}
            </div>
            <div className="text-[10px] text-slate-400">Alpha & Bravo on patrol</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
              <Activity className="w-3 h-3 text-purple-400" />
              RF Telemetry Floor
            </span>
            <div className="text-xl font-bold font-mono text-purple-300">
              -88 dBm
            </div>
            <div className="text-[10px] text-slate-400">Multi-spectral RF clear</div>
          </div>
        </div>
      </div>

      {/* Main Radar Screen & Tactical Comms Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Canvas Radar */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h3 className="text-sm font-bold text-slate-200">
                Active Tactical Sector 7-G (Vector Grid)
              </h3>
            </div>

            {/* Radar Controls & Display Toggles */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`px-2.5 py-1 rounded border transition-colors ${
                  showHeatmap ? 'bg-cyan-950 border-cyan-700 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-500'
                }`}
              >
                RF Heatmap
              </button>
              <button
                onClick={() => setShowTrails(!showTrails)}
                className={`px-2.5 py-1 rounded border transition-colors ${
                  showTrails ? 'bg-cyan-950 border-cyan-700 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-500'
                }`}
              >
                Trails
              </button>
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-400">
                <span>Zoom:</span>
                {[1, 1.5, 2].map(z => (
                  <button
                    key={z}
                    onClick={() => setRadarZoom(z)}
                    className={`px-1 rounded ${radarZoom === z ? 'text-cyan-400 font-bold' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {z}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Radar Canvas */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={720}
              height={560}
              onClick={handleCanvasClick}
              className="w-full h-auto cursor-crosshair block"
            />
            {/* Click instruction watermark */}
            <div className="absolute bottom-3 left-4 text-[10px] font-mono text-slate-500 bg-slate-950/80 px-2 py-1 rounded border border-slate-800/80 pointer-events-none">
              TIP: Click anywhere on the radar grid to drop a tactical waypoint
            </div>
          </div>

          {/* Action Button Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handleConverge}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 transition-colors cursor-pointer"
              >
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                <span>Converge Swarm</span>
              </button>

              <button
                onClick={handleSectorSweep}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5 text-slate-400" />
                <span>Sector Sweep</span>
              </button>

              {/* Real Radar Active Ping Trigger */}
              <button
                id="btn-radar-ping"
                onClick={() => {
                  playTacticalSfx('beep');
                  speakTactical("Radar ping emitted. Echo response within 18 milliseconds.");
                  addRadioTransmission('Central Command (Me)', 'CMD-ACTUAL', 'Pulsed active Doppler ping on 5.8 GHz. 128 echoes resolved.', 'tactical');
                  verificationLoopManager.verifyAndPersistResult(
                    'radar_ping',
                    'Active Radar Doppler Ping',
                    {
                      emitter: 'Tactical Radar Core',
                      carrierGhz: 5.8,
                      pulseWidthNs: 150,
                      prfHz: 3200,
                      echoesResolved: 128,
                      twoWayPropagationMs: 18.2,
                    },
                    {
                      rfFreqMhz: 5800,
                      latencyMs: 18.2,
                      rssi: -58,
                      detectedTargets: 3,
                    },
                    'Automated check loop validated active Doppler radar ping. Coherent pulse return verified.'
                  );
                }}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/70 text-cyan-300 transition-colors cursor-pointer shadow-sm"
                title="Emit real RF radar Doppler ping and verify echoes via auto-checking loop"
              >
                <Target className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Active Ping Radar</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleAirborneJammer}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer shadow-md ${
                  airborneJammerActive
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 animate-pulse'
                    : 'bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-300'
                }`}
                title="Toggle Directed Electronic Attack Airborne Jammer Beam"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{airborneJammerActive ? 'CEASE JAMMER' : 'ENGAGE AIRBORNE JAMMER'}</span>
              </button>

              <button
                onClick={handleSpawnAnomaly}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-950 hover:bg-amber-900 border border-amber-700 text-amber-300 transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Deploy Anomaly</span>
              </button>

              {activeHostile && activeHostile.active && !activeHostile.jammed && (
                <button
                  onClick={handleContainThreat}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all cursor-pointer animate-pulse"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Quarantine Threat</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Tactical Radio Comms Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>Tactical Radio Channel</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                FREQ 5.8 GHz
              </span>
            </div>
            <p className="text-xs text-slate-400">Autonomous coordinator encrypted voice & packet log</p>
          </div>

          {/* Radio Log Stream */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex-1 max-h-[420px] overflow-y-auto space-y-2.5 font-mono text-xs">
            {radioTransmissions.map((tx) => (
              <div
                key={tx.id}
                className={`p-2.5 rounded-lg border transition-all ${
                  tx.priority === 'alert'
                    ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                    : tx.priority === 'tactical'
                    ? 'bg-cyan-950/30 border-cyan-800/60 text-cyan-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="font-bold flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${tx.priority === 'alert' ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                    <span>[{tx.callsign}]</span>
                    <span className="text-slate-500 font-normal">{tx.sender}</span>
                  </span>
                  <span className="text-slate-500">{tx.timestamp}</span>
                </div>
                <p className="text-[11px] leading-relaxed font-sans">{tx.message}</p>
              </div>
            ))}
          </div>

          {/* Sector Waypoint Inspector */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Sector Waypoints
            </span>
            <div className="space-y-1.5">
              {waypoints.map((wp) => (
                <div
                  key={wp.id}
                  onClick={() => {
                    targetPointRef.current = { x: wp.x, y: wp.y };
                    playTacticalSfx('beep');
                  }}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors text-xs"
                >
                  <span className="font-mono text-slate-300 flex items-center gap-1.5">
                    <Crosshair className="w-3 h-3 text-cyan-400" />
                    <span>{wp.name}</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    ({wp.x}, {wp.y})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
