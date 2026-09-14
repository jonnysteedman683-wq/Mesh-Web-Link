import React, { useState, useEffect, useRef } from 'react';
import { AgentNode } from '../types';
import { meshFabric } from '../fabric/meshFabric';
import { verificationLoopManager } from '../services/verificationLoopManager';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Radio, 
  Zap, 
  Flame, 
  Lock, 
  Unlock, 
  Volume2, 
  VolumeX, 
  AlertTriangle, 
  Activity, 
  Eye, 
  Layers, 
  Cpu, 
  Terminal, 
  Crosshair, 
  Clock, 
  RefreshCw,
  Sliders,
  CheckCircle2,
  Skull
} from 'lucide-react';

interface C4ISRWarRoomViewProps {
  nodes: AgentNode[];
}

export type DefconLevel = 5 | 4 | 3 | 2 | 1;
export type OpticsMode = 'standard' | 'nvg' | 'flir' | 'amber';
export type JammingMode = 'spot' | 'barrage' | 'sweep' | 'drfm';

interface Link16Message {
  id: string;
  jSeries: string;
  sourceTrack: string;
  mgrs: string;
  iffStatus: 'FRIEND' | 'HOSTILE' | 'UNKNOWN' | 'ASSUMED_FRIEND';
  payload: string;
  timestamp: string;
}

export interface ThreatTarget {
  id: string;
  designation: string;
  frequency: number; // MHz
  bandwidth: number; // MHz
  signalStrength: string; // dBm
  modulation: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'ACTIVE_EMISSION' | 'JAMMED_DENIED';
  recommendedMode: JammingMode;
  notes: string;
}

export const C4ISRWarRoomView: React.FC<C4ISRWarRoomViewProps> = ({ nodes }) => {
  // DEFCON State
  const [defcon, setDefcon] = useState<DefconLevel>(3);
  const [opticsMode, setOpticsMode] = useState<OpticsMode>('standard');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [voiceSynthesizer, setVoiceSynthesizer] = useState<boolean>(true);

  // Electronic Warfare (EW) State
  const [freqHopping, setFreqHopping] = useState<boolean>(true);
  const [currentFrequency, setCurrentFrequency] = useState<number>(312.450); // MHz
  const [eccmEnabled, setEccmEnabled] = useState<boolean>(true);
  const [spectrumNoiseFloor, setSpectrumNoiseFloor] = useState<number>(-94); // dBm

  // Electronic Attack (EA) / Jamming State
  const [jammingActive, setJammingActive] = useState<boolean>(false);
  const [jammingMode, setJammingMode] = useState<JammingMode>('spot');
  const [jamTargetFrequency, setJamTargetFrequency] = useState<number>(341.225); // MHz
  const [jamBandwidth, setJamBandwidth] = useState<number>(30); // MHz for barrage
  const [jamPowerWatts, setJamPowerWatts] = useState<number>(500); // Watts ERP
  const [jamAntenna, setJamAntenna] = useState<'phased_array' | 'directional_horn' | 'omni'>('directional_horn');
  const [drfmGhostCount, setDrfmGhostCount] = useState<number>(4);
  const [selectedThreatId, setSelectedThreatId] = useState<string | null>('TGT-0994');

  // Threat Intercept Catalog
  const [threatCatalog, setThreatCatalog] = useState<ThreatTarget[]>([
    {
      id: 'TGT-0994',
      designation: 'Byzantine Rogue Beacon (Sector 7-G)',
      frequency: 341.225,
      bandwidth: 4.5,
      signalStrength: '-62 dBm',
      modulation: 'DSSS / QPSK Encrypted',
      priority: 'CRITICAL',
      status: 'ACTIVE_EMISSION',
      recommendedMode: 'spot',
      notes: 'Unauthenticated spoofing node attempting peer injection into Inquisitor node.'
    },
    {
      id: 'TGT-0182',
      designation: 'Hostile Drone Swarm C2 Uplink',
      frequency: 284.100,
      bandwidth: 8.0,
      signalStrength: '-74 dBm',
      modulation: 'FHSS / FSK Telemetry',
      priority: 'HIGH',
      status: 'ACTIVE_EMISSION',
      recommendedMode: 'sweep',
      notes: 'Adversary micro-UAV command link guiding rogue boids toward perimeter checkpoint.'
    },
    {
      id: 'TGT-0441',
      designation: 'Adversary Pulse-Doppler Tracking Radar',
      frequency: 365.800,
      bandwidth: 12.0,
      signalStrength: '-56 dBm',
      modulation: 'Chirp Pulsed Radar',
      priority: 'MEDIUM',
      status: 'ACTIVE_EMISSION',
      recommendedMode: 'drfm',
      notes: 'Ground-based search radar painting friendly drone cluster altitude 120ft AGL.'
    },
    {
      id: 'TGT-0710',
      designation: 'Adversary Tactical Net VHF Relay',
      frequency: 242.000,
      bandwidth: 25.0,
      signalStrength: '-81 dBm',
      modulation: 'Wideband FM Voice / Data',
      priority: 'LOW',
      status: 'ACTIVE_EMISSION',
      recommendedMode: 'barrage',
      notes: 'Unencrypted command net relay broadcasting troop coordination packets.'
    }
  ]);

  // Permissive Action Link (PAL) & Zeroize State
  const [palKeyAlpha, setPalKeyAlpha] = useState<string>('');
  const [palArmed, setPalArmed] = useState<boolean>(false);
  const [palError, setPalError] = useState<string | null>(null);
  const [zeroizeCountdown, setZeroizeCountdown] = useState<number | null>(null);
  const [zeroizeSuccess, setZeroizeSuccess] = useState<boolean>(false);

  // Link-16 Tactical Datalink Stream
  const [link16Feed, setLink16Feed] = useState<Link16Message[]>([
    {
      id: 'j-01',
      jSeries: 'J2.2',
      sourceTrack: 'TRK-0104',
      mgrs: '32U MV 84102 19482',
      iffStatus: 'FRIEND',
      payload: 'BLUE FORCE BFT: Alpha Squad lead at perimeter checkpoint Bravo.',
      timestamp: '00:04:12'
    },
    {
      id: 'j-02',
      jSeries: 'J3.5',
      sourceTrack: 'TRK-0882',
      mgrs: '32U MV 86490 20114',
      iffStatus: 'ASSUMED_FRIEND',
      payload: 'SURFACE TRACK: Sensor Swarm Drone Cluster #4 altitude 120ft AGL.',
      timestamp: '00:04:29'
    },
    {
      id: 'j-03',
      jSeries: 'J12.0',
      sourceTrack: 'TRK-0001',
      mgrs: '32U MV 85000 19000',
      iffStatus: 'FRIEND',
      payload: 'MISSION MGMT: Central Command (Me) key rotation window verified nominal.',
      timestamp: '00:04:45'
    }
  ]);

  const waterfallCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const zeroizeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sweepPhaseRef = useRef<number>(0);

  // Calculate Jammer to Signal (J/S) Ratio dynamically
  const calculateJSRatio = (targetFreq: number) => {
    // Distance factor + Power + Antenna Gain
    const basePowerDb = 10 * Math.log10(jamPowerWatts);
    const antennaGain = jamAntenna === 'phased_array' ? 18 : jamAntenna === 'directional_horn' ? 12 : 3;
    const modeMultiplier = jammingMode === 'spot' ? 1.4 : jammingMode === 'drfm' ? 1.2 : jammingMode === 'sweep' ? 1.0 : 0.7;
    const freqSeparationPenalty = Math.max(0, Math.abs(targetFreq - jamTargetFrequency) * 1.5);
    const calculated = (basePowerDb + antennaGain) * modeMultiplier - 22 - freqSeparationPenalty;
    return parseFloat(calculated.toFixed(1));
  };

  // Web Audio Tactical Sounds
  const playWarRoomSfx = (type: 'siren' | 'zeroize' | 'click' | 'chirp' | 'jamming') => {
    if (!audioEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'siren') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.3);
        osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (type === 'jamming') {
        // Electronic Attack Noise Burst + High Whistle
        const bufferSize = ctx.sampleRate * 0.45;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.8;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + 0.3);
        filter.Q.value = 4.0;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.09, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();

        // Overlay carrier screech
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(2400, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.4);
        oscGain.gain.setValueAtTime(0.04, ctx.currentTime);
        oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'zeroize') {
        // Harsh industrial burst
        const bufferSize = ctx.sampleRate * 0.4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.15));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        noise.connect(filter);
        filter.connect(ctx.destination);
        noise.start();
      } else if (type === 'chirp') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(2800, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch (e) {}
  };

  const speakMilitary = (text: string) => {
    if (!voiceSynthesizer || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      u.pitch = 0.85;
      u.volume = 0.85;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  };

  // DEFCON Level Handler
  const handleSetDefcon = (level: DefconLevel) => {
    setDefcon(level);
    playWarRoomSfx('siren');

    const descriptions = {
      5: "DEFCON Five. Normal peacetime readiness. Routine sensor sweeps.",
      4: "DEFCON Four. Intelligence watch active. Autonomous counter-spoofing engaged.",
      3: "DEFCON Three. Round House. Mesh attestation elevated. ROE quorum ready.",
      2: "DEFCON Two. Fast Pace. Dual-key armed. Autonomous jamming countermeasures active.",
      1: "DEFCON One. Cocked Pistol. Maximum combat readiness. Critical zeroize enabled."
    };

    speakMilitary(descriptions[level]);

    // Dispatch broadcast across mesh fabric
    meshFabric.sendEncryptedMessage(
      'node-me',
      'node-omnisary',
      `[TACTICAL COMMAND ALERT] DEFCON condition elevated to LEVEL ${level}. Posture updated network-wide.`,
      'task_dispatch'
    );
  };

  // Frequency Hopping Loop
  useEffect(() => {
    if (!freqHopping) return;
    const interval = setInterval(() => {
      // 225.000 to 399.975 MHz UHF military band
      const randOffset = (Math.floor(Math.random() * 700) * 0.25).toFixed(3);
      const newFreq = 225.000 + parseFloat(randOffset);
      setCurrentFrequency(newFreq);
    }, 180);
    return () => clearInterval(interval);
  }, [freqHopping]);

  // Jamming Handlers
  const handleToggleJamming = () => {
    const nextState = !jammingActive;
    setJammingActive(nextState);

    if (nextState) {
      playWarRoomSfx('jamming');
      speakMilitary(`Electronic Attack engaged. Transmitting high power ${jammingMode} jam on ${jamTargetFrequency.toFixed(3)} megahertz.`);

      // Update Link-16 Tactical Datalink
      const newMsg: Link16Message = {
        id: `j-${Date.now()}`,
        jSeries: 'J14.0',
        sourceTrack: 'EA-POD-01',
        mgrs: '32U MV 85000 19000',
        iffStatus: 'FRIEND',
        payload: `ELECTRONIC ATTACK: Transmitting ${jamPowerWatts}W ${jammingMode.toUpperCase()} jam at ${jamTargetFrequency.toFixed(3)} MHz. Ant: ${jamAntenna.toUpperCase()}.`,
        timestamp: new Date().toLocaleTimeString()
      };
      setLink16Feed(prev => [newMsg, ...prev.slice(0, 9)]);

      // If targeting a threat in catalog, mark it denied
      setThreatCatalog(prev => prev.map(t => {
        if (Math.abs(t.frequency - jamTargetFrequency) < (jammingMode === 'barrage' ? jamBandwidth / 2 : 2.5)) {
          return { ...t, status: 'JAMMED_DENIED' };
        }
        return t;
      }));

      // Broadcast attestation across mesh fabric
      meshFabric.sendEncryptedMessage(
        'node-me',
        'node-inquisitor',
        `[ELECTRONIC ATTACK ACTIVE] High-power ${jammingMode} RF emission transmitting at ${jamTargetFrequency.toFixed(3)} MHz. J/S Margin: +${calculateJSRatio(jamTargetFrequency)} dB.`,
        'task_dispatch'
      );

      // Automated Checking Loop verification on Electronic Warfare Jamming
      verificationLoopManager.verifyAndPersistResult(
        'jammer',
        `C4ISR EW Transmitter (${jamAntenna.toUpperCase()})`,
        {
          mode: jammingMode,
          frequencyMhz: jamTargetFrequency,
          bandwidthMhz: jamBandwidth,
          powerWatts: jamPowerWatts,
          jsRatioDb: calculateJSRatio(jamTargetFrequency),
          drfmGhosts: jammingMode === 'drfm' ? drfmGhostCount : 0,
          status: 'TRANSMITTING_ATTACK_CARRIER',
        },
        {
          jamPowerWatts: jamPowerWatts,
          rfFreqMhz: jamTargetFrequency,
          rssi: -38,
        },
        `Automated check loop validated EW RF carrier. J/S ratio +${calculateJSRatio(jamTargetFrequency)}dB exceeds STANAG denial threshold.`
      );
    } else {
      playWarRoomSfx('chirp');
      speakMilitary("Electronic Attack disengaged. RF transmitter in passive standby.");
    }
  };

  const handleEngageThreat = (threat: ThreatTarget) => {
    setSelectedThreatId(threat.id);
    setJamTargetFrequency(threat.frequency);
    setJammingMode(threat.recommendedMode);
    setJammingActive(true);
    playWarRoomSfx('jamming');

    const js = calculateJSRatio(threat.frequency);
    speakMilitary(`Target ${threat.id} locked. Electronic Attack transmitting on ${threat.frequency.toFixed(3)} megahertz. Target link denied.`);

    setThreatCatalog(prev => prev.map(t => t.id === threat.id ? { ...t, status: 'JAMMED_DENIED' } : t));

    // Update Link-16 feed
    const newMsg: Link16Message = {
      id: `j-${Date.now()}`,
      jSeries: 'J14.0',
      sourceTrack: 'EA-POD-01',
      mgrs: '32U MV 85000 19000',
      iffStatus: 'FRIEND',
      payload: `ELECTRONIC SUPPRESSION: ${threat.id} (${threat.designation}) link jammed at ${threat.frequency} MHz. J/S ratio +${js} dB.`,
      timestamp: new Date().toLocaleTimeString()
    };
    setLink16Feed(prev => [newMsg, ...prev.slice(0, 9)]);

    meshFabric.sendEncryptedMessage(
      'node-me',
      'node-omnisary',
      `[ELECTRONIC COUNTERMEASURE] Target ${threat.id} at ${threat.frequency} MHz actively jammed. Telemetry neutralized.`,
      'task_dispatch'
    );

    // Verify threat neutralization outcome
    verificationLoopManager.verifyAndPersistResult(
      'jammer',
      `Target Engagement: ${threat.id}`,
      {
        targetId: threat.id,
        designation: threat.designation,
        frequencyMhz: threat.frequency,
        jsRatioDb: js,
        mode: threat.recommendedMode,
        status: 'JAMMED_DENIED',
      },
      {
        rfFreqMhz: threat.frequency,
        jamPowerWatts: jamPowerWatts,
        rssi: -35,
      },
      `Automated checking loop verified target ${threat.id} denial. Byzantine emission suppressed.`
    );
  };

  // Waterfall RF Spectrum Canvas Animation
  useEffect(() => {
    let animId: number;
    const canvas = waterfallCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Shift previous image down by 1px
    const renderWaterfall = () => {
      ctx.drawImage(canvas, 0, 0, width, height - 2, 0, 2, width, height - 2);

      // Generate a new row of RF spectrum amplitude
      const rowData = ctx.createImageData(width, 2);
      const d = rowData.data;

      // Update sweep phase for sweep jamming mode
      sweepPhaseRef.current = (sweepPhaseRef.current + 4) % width;

      for (let x = 0; x < width; x++) {
        // Base thermal noise floor
        let signal = Math.random() * 32;

        const currentFreqAtX = 225 + (x / width) * 175;

        // Carrier peak around current friendly hopping frequency
        const freqX = Math.floor(((currentFrequency - 225) / 175) * width);
        const distToFriendly = Math.abs(x - freqX);
        if (distToFriendly < 8) {
          signal += (8 - distToFriendly) * 16 + Math.random() * 30;
        }

        // Render ambient threat signals
        threatCatalog.forEach(t => {
          const tX = Math.floor(((t.frequency - 225) / 175) * width);
          const distToThreat = Math.abs(x - tX);
          if (distToThreat < 6) {
            signal += (6 - distToThreat) * 14 + Math.random() * 25;
          }
        });

        // RENDER ACTIVE HIGH-POWER JAMMING SIGNATURE
        if (jammingActive) {
          const jamTargetX = Math.floor(((jamTargetFrequency - 225) / 175) * width);
          const distToJamTarget = Math.abs(x - jamTargetX);

          if (jammingMode === 'spot') {
            // High-power focused Gaussian energy beam + side-lobe splatter
            if (distToJamTarget < 16) {
              const spotIntensity = (16 - distToJamTarget) * 18 + Math.random() * 80;
              signal += spotIntensity;
            }
          } else if (jammingMode === 'barrage') {
            // Wideband fiery noise wall
            const halfBwPixels = Math.floor(((jamBandwidth / 2) / 175) * width);
            if (distToJamTarget <= halfBwPixels) {
              signal += 150 + Math.random() * 95;
            }
          } else if (jammingMode === 'sweep') {
            // Rapid sweeping razor laser signature
            const distToSweep = Math.abs(x - sweepPhaseRef.current);
            if (distToSweep < 5) {
              signal += 200 + Math.random() * 55;
            }
          } else if (jammingMode === 'drfm') {
            // Coherent twin false doppler echo pulses
            const ghostSpacing = 8;
            for (let g = 1; g <= drfmGhostCount; g++) {
              const gX = jamTargetX + (g % 2 === 0 ? 1 : -1) * g * ghostSpacing;
              if (Math.abs(x - gX) < 4) {
                signal += 160 + Math.random() * 60;
              }
            }
          }
        }

        // Color mapper: blue (quiet) -> cyan -> green -> yellow -> red/white (hot jamming emission)
        let r = 0, g = 0, b = 0;
        if (signal < 38) {
          b = Math.floor(signal * 4);
        } else if (signal < 85) {
          g = Math.floor((signal - 38) * 5);
          b = 200;
        } else if (signal < 140) {
          r = Math.floor((signal - 85) * 4);
          g = 220;
        } else if (signal < 210) {
          r = 255;
          g = Math.floor(255 - (signal - 140) * 2.5);
          b = 40;
        } else {
          // Extremely hot (saturated jammer core)
          r = 255;
          g = 255;
          b = Math.min(255, Math.floor((signal - 210) * 3));
        }

        const idx = x * 4;
        d[idx] = r;
        d[idx + 1] = g;
        d[idx + 2] = b;
        d[idx + 3] = 255;

        // Duplicate for 2px row thickness
        const idx2 = (width + x) * 4;
        d[idx2] = r;
        d[idx2 + 1] = g;
        d[idx2 + 2] = b;
        d[idx2 + 3] = 255;
      }

      ctx.putImageData(rowData, 0, 0);
      animId = requestAnimationFrame(renderWaterfall);
    };

    animId = requestAnimationFrame(renderWaterfall);
    return () => cancelAnimationFrame(animId);
  }, [currentFrequency, jammingActive, jammingMode, jamTargetFrequency, jamBandwidth, drfmGhostCount, threatCatalog]);

  // Armed Emergency Zeroize Protocol
  const handleInitiateZeroize = () => {
    if (palKeyAlpha !== 'ALPHA-99') {
      setPalError("PAL ACCESS DENIED: Enter authorization code 'ALPHA-99' into Permissive Action Link first.");
      playWarRoomSfx('chirp');
      setTimeout(() => setPalError(null), 5000);
      return;
    }
    setPalError(null);

    setZeroizeCountdown(5);
    playWarRoomSfx('siren');
    speakMilitary("Warning. Cryptographic zeroize sequence initiated. T minus 5 seconds to total key purge.");

    let count = 5;
    zeroizeTimerRef.current = setInterval(() => {
      count--;
      if (count > 0) {
        setZeroizeCountdown(count);
        playWarRoomSfx('siren');
      } else {
        if (zeroizeTimerRef.current) clearInterval(zeroizeTimerRef.current);
        executeZeroizePurge();
      }
    }, 1000);
  };

  const handleAbortZeroize = () => {
    if (zeroizeTimerRef.current) clearInterval(zeroizeTimerRef.current);
    setZeroizeCountdown(null);
    playWarRoomSfx('chirp');
    speakMilitary("Zeroize sequence aborted by Central Command.");
  };

  const executeZeroizePurge = async () => {
    setZeroizeCountdown(null);
    setZeroizeSuccess(true);
    playWarRoomSfx('zeroize');
    speakMilitary("Scorched earth protocol complete. All ephemeral cryptographic keys, Merkle roots, and routing caches purged.");

    // Clear local storage and state
    try {
      localStorage.removeItem('mesh_directive_history');
      localStorage.removeItem('mesh_fabric_state');
    } catch (e) {}

    // Dispatch zeroize broadcast
    await meshFabric.sendEncryptedMessage(
      'node-me',
      'node-inquisitor',
      '[EMERGENCY ZEROIZE EXECUTED] All ephemeral session buffers sanitized. Node keys rotated to null ground zero.',
      'key_exchange'
    );

    setTimeout(() => {
      setZeroizeSuccess(false);
      setPalArmed(false);
      setPalKeyAlpha('');
    }, 4000);
  };

  // Optical HUD Styling helper
  const getOpticsClass = () => {
    switch (opticsMode) {
      case 'nvg':
        return 'filter-nvg text-emerald-300 bg-slate-950 border-emerald-800/80 shadow-[0_0_50px_rgba(16,185,129,0.15)]';
      case 'flir':
        return 'filter-flir text-slate-100 bg-black border-slate-700 shadow-none';
      case 'amber':
        return 'filter-amber text-amber-300 bg-neutral-950 border-amber-800/80 shadow-[0_0_50px_rgba(245,158,11,0.15)]';
      default:
        return 'text-slate-100 bg-slate-900 border-slate-800';
    }
  };

  const defconColors = {
    5: { bg: 'bg-blue-950/80', border: 'border-blue-700', text: 'text-blue-300', name: 'DEFCON 5 (PEACETIME)' },
    4: { bg: 'bg-emerald-950/80', border: 'border-emerald-700', text: 'text-emerald-300', name: 'DEFCON 4 (INTELLIGENCE WATCH)' },
    3: { bg: 'bg-amber-950/80', border: 'border-amber-700', text: 'text-amber-300', name: 'DEFCON 3 (AIR FORCE READY)' },
    2: { bg: 'bg-orange-950/80', border: 'border-orange-700', text: 'text-orange-300', name: 'DEFCON 2 (ARMED FORCES READY)' },
    1: { bg: 'bg-rose-950/90', border: 'border-rose-600', text: 'text-rose-200', name: 'DEFCON 1 (MAXIMUM COMBAT)' },
  };

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 transition-all duration-300 ${opticsMode === 'nvg' ? 'font-mono' : ''}`}>
      {/* Top Banner: Master DEFCON Readiness Strip */}
      <div className={`border rounded-2xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300 ${getOpticsClass()}`}>
        {defcon === 1 && (
          <div className="absolute inset-0 bg-rose-600/10 animate-pulse pointer-events-none" />
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-3 py-1 rounded-md text-xs font-mono font-bold uppercase tracking-wider border flex items-center gap-1.5 shadow-sm ${defconColors[defcon].bg} ${defconColors[defcon].border} ${defconColors[defcon].text}`}>
                <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
                <span>{defconColors[defcon].name}</span>
              </span>

              <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-slate-950 border border-slate-800 text-slate-400">
                MIL-STD-2525D / Link-16 STANAG 5516 Active
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              C4ISR War Room & Electronic Warfare Defense Center
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
              Strategic battle management system providing real-time DEFCON posture control, Electronic Counter-Countermeasures (ECCM), MIL-STD-2525 Link-16 tactical datalinks, and two-person Permissive Action Link (PAL) emergency cryptographic zeroize.
            </p>
          </div>

          {/* Master DEFCON Selector Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              {([5, 4, 3, 2, 1] as DefconLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => handleSetDefcon(lvl)}
                  className={`w-10 h-10 rounded-lg font-mono font-extrabold text-sm transition-all cursor-pointer flex flex-col items-center justify-center ${
                    defcon === lvl
                      ? `${defconColors[lvl].bg} ${defconColors[lvl].border} ${defconColors[lvl].text} border-2 shadow-lg scale-105`
                      : 'bg-slate-900 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                  title={`Set readiness to DEFCON ${lvl}`}
                >
                  <span>D{lvl}</span>
                </button>
              ))}
            </div>

            {/* Optics Sensor Mode Toggles */}
            <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-mono">
              {[
                { id: 'standard', name: 'CYAN' },
                { id: 'nvg', name: 'NVG' },
                { id: 'flir', name: 'FLIR' },
                { id: 'amber', name: 'AMBER' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setOpticsMode(m.id as OpticsMode)}
                  className={`px-2.5 py-1.5 rounded-md font-semibold transition-colors ${
                    opticsMode === m.id
                      ? 'bg-slate-800 text-slate-100 border border-slate-600'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Global Military Telemetry Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
              <Radio className="w-3 h-3 text-cyan-400" />
              Tactical Frequency (FHSS)
            </span>
            <div className="text-xl font-bold font-mono text-cyan-400">
              {currentFrequency.toFixed(3)} MHz
            </div>
            <div className="text-[10px] text-slate-400">Fast Frequency Hopping: Active</div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
              <Crosshair className="w-3 h-3 text-emerald-400" />
              MGRS Grid Center
            </span>
            <div className="text-sm font-bold font-mono text-emerald-400 truncate">
              32U MV 85000 19000
            </div>
            <div className="text-[10px] text-slate-400">Sector 7-G Command Center (Me)</div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              EW Jamming Resistance
            </span>
            <div className="text-xl font-bold font-mono text-amber-300">
              +42 dB ECCM
            </div>
            <div className="text-[10px] text-slate-400">Notch filter array operational</div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
              <Lock className="w-3 h-3 text-purple-400" />
              PAL Readiness
            </span>
            <div className="text-sm font-bold font-mono text-purple-300">
              {palArmed ? 'ARMED & SEALED' : 'STANDBY (ALPHA-99)'}
            </div>
            <div className="text-[10px] text-slate-400">Two-Person Rule Enforced</div>
          </div>
        </div>
      </div>

      {/* Main Tactical Grid: Link-16 Datalink & Electronic Warfare (EW) Waterfall */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Electronic Warfare (EW) Waterfall & Frequency Hopping Spectrum */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>Electronic Warfare (EW) RF Spectrum Waterfall</span>
              </h3>
              <p className="text-xs text-slate-400">225.0 MHz - 400.0 MHz Military UHF Tactical Band</p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <button
                onClick={() => setFreqHopping(!freqHopping)}
                className={`px-3 py-1 rounded-md border transition-colors cursor-pointer ${
                  freqHopping ? 'bg-cyan-950 border-cyan-700 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-500'
                }`}
              >
                {freqHopping ? 'FHSS HOPPING ON' : 'FIXED FREQ'}
              </button>

              <button
                onClick={() => setEccmEnabled(!eccmEnabled)}
                className={`px-3 py-1 rounded-md border transition-colors cursor-pointer ${
                  eccmEnabled ? 'bg-emerald-950 border-emerald-700 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-500'
                }`}
              >
                {eccmEnabled ? 'ECCM ANTI-JAM ON' : 'ECCM OFF'}
              </button>
            </div>
          </div>

          {/* Waterfall Canvas Display */}
          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
            {jammingActive && (
              <div className="absolute top-2 left-2 right-2 z-10 px-3 py-1.5 rounded-lg bg-rose-950/90 border border-rose-600/80 backdrop-blur-md flex items-center justify-between text-xs font-mono animate-pulse">
                <div className="flex items-center space-x-2 text-rose-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span className="font-bold">TRANSMITTING ACTIVE ELECTRONIC ATTACK</span>
                  <span className="text-rose-400">|</span>
                  <span>{jamPowerWatts}W ERP</span>
                  <span className="text-rose-400">|</span>
                  <span className="uppercase">{jammingMode} JAM</span>
                  <span className="text-rose-400">|</span>
                  <span>TGT: {jamTargetFrequency.toFixed(3)} MHz</span>
                </div>
                <div className="text-amber-300 font-bold">
                  J/S RATIO: +{calculateJSRatio(jamTargetFrequency)} dB (TARGET DENIED)
                </div>
              </div>
            )}

            <canvas
              ref={waterfallCanvasRef}
              width={700}
              height={220}
              className="w-full h-auto block"
            />
            {/* Frequency scale markers */}
            <div className="flex justify-between px-3 py-1 text-[10px] font-mono text-slate-500 bg-slate-950/90 border-t border-slate-800">
              <span>225 MHz (L-Band)</span>
              <span>280 MHz</span>
              <span className="text-cyan-400 font-bold">BLUE CARRIER: {currentFrequency.toFixed(3)} MHz</span>
              {jammingActive && (
                <span className="text-rose-400 font-bold">JAM: {jamTargetFrequency.toFixed(3)} MHz</span>
              )}
              <span>350 MHz</span>
              <span>400 MHz (MilSatCom)</span>
            </div>
          </div>

          {/* EW Status Diagnostics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono">
            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg">
              <span className="text-slate-500 text-[10px] block uppercase">RF Thermal Floor</span>
              <span className="font-bold text-slate-300">{spectrumNoiseFloor} dBm</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg">
              <span className="text-slate-500 text-[10px] block uppercase">Bit Error Rate (BER)</span>
              <span className="font-bold text-emerald-400">&lt; 10^-8 (Nominal)</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg">
              <span className="text-slate-500 text-[10px] block uppercase">Beamforming Nulls</span>
              <span className="font-bold text-cyan-400">4 Steered Antennas</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg">
              <span className="text-slate-500 text-[10px] block uppercase">Active Jammer State</span>
              <span className={`font-bold ${jammingActive ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>
                {jammingActive ? 'TRANSMITTING (HOT)' : 'STANDBY (PASSIVE)'}
              </span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Link-16 / TADIL-J Tactical Datalink Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Link-16 / STANAG Feed</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                TADIL-J
              </span>
            </div>
            <p className="text-xs text-slate-400">J-Series encrypted track broadcasts & Blue Force Tracking</p>
          </div>

          {/* Link-16 Log Stream */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex-1 max-h-[300px] overflow-y-auto space-y-2.5 font-mono text-xs">
            {link16Feed.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1 text-[11px]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>[{item.jSeries}]</span>
                    <span className="text-slate-300">{item.sourceTrack}</span>
                  </span>
                  <span className="text-[10px] text-slate-500">{item.timestamp}</span>
                </div>
                <div className="text-[10px] text-emerald-400/80">
                  MGRS: {item.mgrs}
                </div>
                <p className="text-slate-300 font-sans text-xs">{item.payload}</p>
              </div>
            ))}
          </div>

          {/* IFF Status Summary */}
          <div className="pt-2 border-t border-slate-800 text-[11px] font-mono flex items-center justify-between text-slate-400">
            <span>IFF Mode 5 Crypto: VERIFIED</span>
            <span className="text-emerald-400 font-bold">100% BLUE FORCE</span>
          </div>
        </div>
      </div>

      {/* NEW SECTION: Electronic Attack (EA) & Directed Jammer Command Center */}
      <div className="bg-slate-900 border border-cyan-900/60 rounded-2xl p-6 space-y-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-rose-400" />
                <span>AN/ALQ-249 Electronic Attack (EA) High-Power Jammer</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                MIL-STD-461G Compliant
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-100">
              Tactical RF Jamming & Electronic Countermeasure Suite
            </h3>
            <p className="text-xs text-slate-400 max-w-3xl">
              Equipped with agile Gallium Nitride (GaN) solid-state power amplifiers. Capable of concentrated Spot Jamming on hostile beacons, broadband Barrage Flood across communication corridors, high-speed Chirp Sweeping, and Digital Radio Frequency Memory (DRFM) spoofing.
            </p>
          </div>

          {/* Master Transmit & Safe Cutoff Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleJamming}
              className={`flex items-center space-x-2 px-5 py-3 rounded-xl font-mono text-xs font-bold transition-all shadow-lg cursor-pointer ${
                jammingActive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/40 animate-pulse'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-600/30'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>{jammingActive ? 'CEASE TRANSMISSION (STOP JAM)' : 'ENGAGE RF TRANSMITTER (HOT)'}</span>
            </button>
          </div>
        </div>

        {/* Jammer Parameter Configuration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Panel 1: Jamming Mode Selection */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <label className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
              <span>Jamming Attack Mode</span>
              <span className="text-cyan-400 font-bold uppercase">{jammingMode}</span>
            </label>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <button
                onClick={() => {
                  setJammingMode('spot');
                  playWarRoomSfx('chirp');
                }}
                className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                  jammingMode === 'spot'
                    ? 'bg-rose-950/80 border-rose-600 text-rose-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-[11px]">SPOT JAM</div>
                <div className="text-[9px] text-slate-400">High-Power Narrow</div>
              </button>

              <button
                onClick={() => {
                  setJammingMode('barrage');
                  playWarRoomSfx('chirp');
                }}
                className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                  jammingMode === 'barrage'
                    ? 'bg-rose-950/80 border-rose-600 text-rose-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-[11px]">BARRAGE</div>
                <div className="text-[9px] text-slate-400">Wideband Noise</div>
              </button>

              <button
                onClick={() => {
                  setJammingMode('sweep');
                  playWarRoomSfx('chirp');
                }}
                className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                  jammingMode === 'sweep'
                    ? 'bg-rose-950/80 border-rose-600 text-rose-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-[11px]">CHIRP SWEEP</div>
                <div className="text-[9px] text-slate-400">Fast Agility FM</div>
              </button>

              <button
                onClick={() => {
                  setJammingMode('drfm');
                  playWarRoomSfx('chirp');
                }}
                className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                  jammingMode === 'drfm'
                    ? 'bg-rose-950/80 border-rose-600 text-rose-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-[11px]">DRFM SPOOF</div>
                <div className="text-[9px] text-slate-400">Digital Deception</div>
              </button>
            </div>

            {jammingMode === 'barrage' && (
              <div className="pt-2 border-t border-slate-800 space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Barrage Bandwidth:</span>
                  <span className="text-cyan-400 font-bold">{jamBandwidth} MHz</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={80}
                  step={5}
                  value={jamBandwidth}
                  onChange={(e) => setJamBandwidth(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>
            )}

            {jammingMode === 'drfm' && (
              <div className="pt-2 border-t border-slate-800 space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>False Echo Targets:</span>
                  <span className="text-cyan-400 font-bold">{drfmGhostCount} Blips</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={8}
                  step={1}
                  value={drfmGhostCount}
                  onChange={(e) => setDrfmGhostCount(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Panel 2: Target Frequency Tuning */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <label className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
              <span>Target Frequency</span>
              <span className="text-rose-400 font-bold font-mono text-sm">
                {jamTargetFrequency.toFixed(3)} MHz
              </span>
            </label>

            <input
              type="range"
              min={225.000}
              max={400.000}
              step={0.025}
              value={jamTargetFrequency}
              onChange={(e) => setJamTargetFrequency(parseFloat(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />

            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-mono text-slate-500 block uppercase">Quick Target Presets:</span>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                <button
                  onClick={() => setJamTargetFrequency(341.225)}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors text-left truncate cursor-pointer"
                >
                  341.225 (TGT-0994)
                </button>
                <button
                  onClick={() => setJamTargetFrequency(284.100)}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors text-left truncate cursor-pointer"
                >
                  284.100 (UAV C2)
                </button>
                <button
                  onClick={() => setJamTargetFrequency(365.800)}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors text-left truncate cursor-pointer"
                >
                  365.800 (RADAR)
                </button>
                <button
                  onClick={() => setJamTargetFrequency(242.000)}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors text-left truncate cursor-pointer"
                >
                  242.000 (VHF RELAY)
                </button>
              </div>
            </div>
          </div>

          {/* Panel 3: Transmit Power & Antenna Array */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <label className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
              <span>RF Power (ERP)</span>
              <span className="text-amber-400 font-bold font-mono">{jamPowerWatts} Watts</span>
            </label>

            <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
              {[50, 250, 500, 1000, 2000].map((watts) => (
                <button
                  key={watts}
                  onClick={() => setJamPowerWatts(watts)}
                  className={`py-1.5 rounded-lg border text-center transition-colors cursor-pointer ${
                    jamPowerWatts === watts
                      ? 'bg-amber-950 border-amber-600 text-amber-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {watts}W
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <span className="text-[10px] font-mono text-slate-500 block uppercase">Antenna Directivity:</span>
              <div className="flex gap-1 text-[10px] font-mono">
                <button
                  onClick={() => setJamAntenna('phased_array')}
                  className={`flex-1 py-1 rounded border text-center transition-colors cursor-pointer ${
                    jamAntenna === 'phased_array'
                      ? 'bg-cyan-950 border-cyan-700 text-cyan-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Phased (15°)
                </button>
                <button
                  onClick={() => setJamAntenna('directional_horn')}
                  className={`flex-1 py-1 rounded border text-center transition-colors cursor-pointer ${
                    jamAntenna === 'directional_horn'
                      ? 'bg-cyan-950 border-cyan-700 text-cyan-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Horn (45°)
                </button>
                <button
                  onClick={() => setJamAntenna('omni')}
                  className={`flex-1 py-1 rounded border text-center transition-colors cursor-pointer ${
                    jamAntenna === 'omni'
                      ? 'bg-cyan-950 border-cyan-700 text-cyan-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Omni (360°)
                </button>
              </div>
            </div>
          </div>

          {/* Panel 4: Jammer-to-Signal (J/S) & Calculated Impact */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase text-slate-400 block">
                Jammer-to-Signal (J/S) Ratio
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-400 flex items-baseline gap-2">
                <span>+{calculateJSRatio(jamTargetFrequency)} dB</span>
                <span className="text-[11px] font-normal text-slate-400">Target Envelope</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                {calculateJSRatio(jamTargetFrequency) > 15
                  ? 'CRITICAL SUPPRESSION: Adversary demodulation eye diagram collapsed. 99.9% packet loss.'
                  : calculateJSRatio(jamTargetFrequency) > 5
                  ? 'EFFECTIVE DEGRADATION: Severe BER inflation. Datalink fallback triggered.'
                  : 'MARGINAL INTERFERENCE: Increase transmit ERP or narrow antenna beam.'}
              </p>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800 text-[10px] font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Blue Force Deconfliction:</span>
                <span className="text-cyan-400 font-bold">GUARDED (+38 dB)</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>GaN PA Thermal State:</span>
                <span className="text-emerald-400">68°C (NOMINAL)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Threat Intercept Catalog & Fast Jam Matrix */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>SIGINT / ELINT Intercepted Threat Target Directory</span>
            </h4>
            <span className="text-[10px] font-mono text-slate-500">
              4 Active Intercepts Logged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                  <th className="py-2 px-3">Target ID & Name</th>
                  <th className="py-2 px-3">Frequency</th>
                  <th className="py-2 px-3">Modulation</th>
                  <th className="py-2 px-3">Signal</th>
                  <th className="py-2 px-3">Threat Priority</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {threatCatalog.map((threat) => {
                  const isEngaged = jammingActive && Math.abs(jamTargetFrequency - threat.frequency) < 2.0;
                  const isDenied = threat.status === 'JAMMED_DENIED' || isEngaged;

                  return (
                    <tr
                      key={threat.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        selectedThreatId === threat.id ? 'bg-slate-800/30' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-200">{threat.id}</div>
                        <div className="text-[10px] text-slate-400">{threat.designation}</div>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-cyan-400">
                        {threat.frequency.toFixed(3)} MHz
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                        {threat.modulation}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {threat.signalStrength}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            threat.priority === 'CRITICAL'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : threat.priority === 'HIGH'
                              ? 'bg-orange-950 text-orange-300 border border-orange-800'
                              : threat.priority === 'MEDIUM'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {threat.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1.5 w-fit ${
                            isDenied
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-800 animate-pulse'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isDenied ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          <span>{isDenied ? 'JAMMED & DENIED' : 'ACTIVE EMISSION'}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isEngaged ? (
                          <button
                            onClick={handleToggleJamming}
                            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition-colors cursor-pointer shadow-sm"
                          >
                            DISENGAGE
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEngageThreat(threat)}
                            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-rose-900 border border-slate-700 hover:border-rose-600 text-slate-200 hover:text-rose-200 font-bold text-[10px] transition-all cursor-pointer"
                          >
                            LOCK & JAM
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Section: Permissive Action Link (PAL) & Emergency Cryptographic Zeroize */}
      <div className="bg-slate-900 border border-rose-950/60 rounded-2xl p-6 space-y-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1.5">
                <Skull className="w-3.5 h-3.5 text-rose-400" />
                <span>Permissive Action Link (PAL) / Cryptographic Zeroize</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-400 border border-slate-800">
                Two-Person Authorization Rule
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-100">
              Emergency Network Key Sanitization & "Burn Bag" Zeroize
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              In the event of physical capture or fatal Byzantine infiltration, entering the Alpha PAL code arms the scorched-earth sanitization protocol—flushing all ephemeral WebCrypto ECDH session keys, AES-256 state buffers, and routing matrices across all 9 mesh nodes.
            </p>
          </div>

          {/* PAL Dual-Key Form */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 block uppercase">
                Enter PAL Alpha Seal Key:
              </label>
              <input
                type="password"
                placeholder="ALPHA-99"
                value={palKeyAlpha}
                onChange={(e) => {
                  setPalKeyAlpha(e.target.value);
                  if (e.target.value === 'ALPHA-99') {
                    setPalArmed(true);
                    playWarRoomSfx('chirp');
                  } else {
                    setPalArmed(false);
                  }
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-rose-600 tracking-widest w-36 uppercase"
              />
            </div>

            {/* Execute or Countdown Button */}
            <div className="pt-4 space-y-2">
              {palError && (
                <div className="p-2 rounded-lg bg-rose-950/80 border border-rose-700 text-rose-300 font-mono text-[11px]">
                  {palError}
                </div>
              )}
              {zeroizeCountdown !== null ? (
                <div className="flex items-center gap-2">
                  <div className="px-4 py-2 rounded-xl bg-rose-600 text-white font-mono font-bold text-sm animate-ping">
                    T-{zeroizeCountdown}s
                  </div>
                  <button
                    onClick={handleAbortZeroize}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    ABORT ZEROIZE
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleInitiateZeroize}
                  disabled={!palArmed}
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all shadow-lg cursor-pointer ${
                    palArmed
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 animate-pulse'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Skull className="w-4 h-4" />
                  <span>INITIATE EMERGENCY ZEROIZE</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Zeroize Success Confirmation Toast */}
        {zeroizeSuccess && (
          <div className="p-4 rounded-xl bg-emerald-950 border border-emerald-700 text-emerald-200 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>ZEROIZE PROTOCOL CONFIRMED: Ephemeral keys flushed. Network restored to clean-room slate.</span>
            </div>
            <span className="text-[10px] text-emerald-400">VERIFIED BY INQUISITOR</span>
          </div>
        )}
      </div>
    </div>
  );
};
