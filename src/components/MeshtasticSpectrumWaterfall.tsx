import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Activity, 
  Radio, 
  Waves, 
  Sliders, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Play, 
  Pause, 
  RefreshCw, 
  Zap, 
  BarChart2, 
  Gauge, 
  Info, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight, 
  Flame, 
  Filter,
  Maximize2,
  ChevronDown
} from 'lucide-react';
import { 
  MeshtasticBleState, 
  LoraRfPacketEvent, 
  LoraRfMetricsHistoryPoint 
} from '../types';
import { meshtasticBleService } from '../services/meshtasticBleService';

interface MeshtasticSpectrumWaterfallProps {
  state: MeshtasticBleState;
  onNotify?: (msg: string) => void;
}

type WaterfallPalette = 'THERMAL' | 'CYAN' | 'PHOSPHOR' | 'AMBER';

const SF_LIMITS: Record<number, number> = {
  7: -7.5,
  8: -10.0,
  9: -12.5,
  10: -15.0,
  11: -17.5,
  12: -20.0,
};

export const MeshtasticSpectrumWaterfall: React.FC<MeshtasticSpectrumWaterfallProps> = ({
  state,
  onNotify
}) => {
  // Spectrum & Waterfall Configuration
  const [palette, setPalette] = useState<WaterfallPalette>('THERMAL');
  const [bandwidthKhz, setBandwidthKhz] = useState<125 | 250 | 500>(250);
  const [spreadingFactor, setSpreadingFactor] = useState<7 | 8 | 9 | 10 | 11 | 12>(8);
  const [audioSidetone, setAudioSidetone] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [waterfallSpeed, setWaterfallSpeed] = useState<'SLOW' | 'NORMAL' | 'FAST'>('NORMAL');
  const [activeTab, setActiveTab] = useState<'SPECTROGRAM' | 'METRICS_TREND'>('SPECTROGRAM');
  const [selectedNodeFilter, setSelectedNodeFilter] = useState<string>('ALL');

  // Interactive Hover on Waterfall
  const [hoverData, setHoverData] = useState<{ freqMhz: number; dbm: number; x: number; y: number } | null>(null);

  // Canvas Refs
  const psdCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waterfallCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trendCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastPacketSeenRef = useRef<string | null>(null);

  // Center Frequency
  const centerFreqMhz = state.frequencySlotMhz || 906.875;
  const spanMhz = (bandwidthKhz * 2.5) / 1000; // e.g. 0.625 MHz for 250kHz
  const minFreqMhz = centerFreqMhz - spanMhz / 2;
  const maxFreqMhz = centerFreqMhz + spanMhz / 2;

  // Web Audio Context for Authentic LoRa Chirp Sidetone
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playLoraChirpAudio = useCallback((sf: number, isUp: boolean = true) => {
    if (!audioSidetone) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      const duration = Math.min(0.28, Math.max(0.08, (Math.pow(2, sf) / 250000) * 16));

      const startFreq = isUp ? 800 : 2600;
      const endFreq = isUp ? 2600 : 800;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
      gain.gain.linearRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (e) {
      // Audio autoplay policy catch
    }
  }, [audioSidetone]);

  // Handle new incoming/outgoing packets
  useEffect(() => {
    const latestPkt = state.rfPackets[0];
    if (latestPkt && latestPkt.id !== lastPacketSeenRef.current) {
      lastPacketSeenRef.current = latestPkt.id;
      playLoraChirpAudio(latestPkt.spreadingFactor, latestPkt.chirpDirection === 'UP');
    }
  }, [state.rfPackets, playLoraChirpAudio]);

  // Color Mapping Helper for Waterfall
  const getPaletteColor = useCallback((intensity: number, pal: WaterfallPalette): [number, number, number] => {
    // intensity is 0.0 to 1.0
    const clamped = Math.max(0, Math.min(1, intensity));
    switch (pal) {
      case 'CYAN': {
        // Deep Navy -> Electric Cyan -> High Neon White
        if (clamped < 0.3) {
          const t = clamped / 0.3;
          return [Math.round(6 + 10 * t), Math.round(15 + 30 * t), Math.round(35 + 80 * t)];
        } else if (clamped < 0.7) {
          const t = (clamped - 0.3) / 0.4;
          return [Math.round(16 + 20 * t), Math.round(45 + 170 * t), Math.round(115 + 140 * t)];
        } else {
          const t = (clamped - 0.7) / 0.3;
          return [Math.round(36 + 219 * t), Math.round(215 + 40 * t), 255];
        }
      }
      case 'PHOSPHOR': {
        // Emerald Phosphor Night Scope
        if (clamped < 0.4) {
          const t = clamped / 0.4;
          return [Math.round(4 + 8 * t), Math.round(20 + 70 * t), Math.round(12 + 25 * t)];
        } else if (clamped < 0.8) {
          const t = (clamped - 0.4) / 0.4;
          return [Math.round(12 + 25 * t), Math.round(90 + 155 * t), Math.round(37 + 70 * t)];
        } else {
          const t = (clamped - 0.8) / 0.2;
          return [Math.round(37 + 218 * t), 245, Math.round(107 + 148 * t)];
        }
      }
      case 'AMBER': {
        // Obsidian -> Blood Amber -> Bright Sun Gold
        if (clamped < 0.3) {
          const t = clamped / 0.3;
          return [Math.round(15 + 70 * t), Math.round(6 + 20 * t), 4];
        } else if (clamped < 0.7) {
          const t = (clamped - 0.3) / 0.4;
          return [Math.round(85 + 150 * t), Math.round(26 + 120 * t), 6];
        } else {
          const t = (clamped - 0.7) / 0.3;
          return [235 + Math.round(20 * t), Math.round(146 + 100 * t), Math.round(6 + 180 * t)];
        }
      }
      case 'THERMAL':
      default: {
        // Classic Infrared Thermal: Dark Purple -> Blue -> Green -> Amber -> White
        if (clamped < 0.25) {
          const t = clamped / 0.25;
          return [Math.round(10 + 20 * t), Math.round(5 + 10 * t), Math.round(30 + 110 * t)];
        } else if (clamped < 0.5) {
          const t = (clamped - 0.25) / 0.25;
          return [Math.round(30 + 10 * t), Math.round(15 + 160 * t), Math.round(140 - 50 * t)];
        } else if (clamped < 0.75) {
          const t = (clamped - 0.5) / 0.25;
          return [Math.round(40 + 200 * t), Math.round(175 + 30 * t), Math.round(90 - 70 * t)];
        } else {
          const t = (clamped - 0.75) / 0.25;
          return [Math.round(240 + 15 * t), Math.round(205 + 50 * t), Math.round(20 + 235 * t)];
        }
      }
    }
  }, []);

  // Main Render Loop for PSD Scope & Scrolling LoRa Waterfall
  useEffect(() => {
    let animationId: number;
    let tick = 0;

    const psdCanvas = psdCanvasRef.current;
    const waterfallCanvas = waterfallCanvasRef.current;
    if (!psdCanvas || !waterfallCanvas) return;

    const psdCtx = psdCanvas.getContext('2d');
    const wfCtx = waterfallCanvas.getContext('2d', { willReadFrequently: true });
    if (!psdCtx || !wfCtx) return;

    // High DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const psdWidth = psdCanvas.clientWidth;
    const psdHeight = psdCanvas.clientHeight;
    const wfWidth = waterfallCanvas.clientWidth;
    const wfHeight = waterfallCanvas.clientHeight;

    if (psdCanvas.width !== psdWidth * dpr || psdCanvas.height !== psdHeight * dpr) {
      psdCanvas.width = psdWidth * dpr;
      psdCanvas.height = psdHeight * dpr;
      psdCtx.scale(dpr, dpr);
    }

    if (waterfallCanvas.width !== wfWidth * dpr || waterfallCanvas.height !== wfHeight * dpr) {
      waterfallCanvas.width = wfWidth * dpr;
      waterfallCanvas.height = wfHeight * dpr;
      wfCtx.scale(dpr, dpr);
      // Fill initial background
      wfCtx.fillStyle = '#050811';
      wfCtx.fillRect(0, 0, wfWidth, wfHeight);
    }

    const speedDivider = waterfallSpeed === 'SLOW' ? 3 : waterfallSpeed === 'FAST' ? 1 : 2;

    const render = () => {
      tick++;

      if (!isPaused && tick % speedDivider === 0) {
        // --- 1. Generate Frequency Bins & PSD Slice ---
        const numBins = 160;
        const bins: number[] = new Array(numBins);
        const noiseFloor = state.channelNoiseFloorDbm || -118; // dBm

        // Active recent packet presence
        const recentPkt = state.rfPackets.find(p => Date.now() - p.timestamp < 1200);
        const isTxActive = recentPkt && (Date.now() - recentPkt.timestamp) < (recentPkt.airtimeMs + 200);

        for (let i = 0; i < numBins; i++) {
          const binFreq = minFreqMhz + (i / numBins) * spanMhz;
          // Gaussian thermal noise
          let dbm = noiseFloor + (Math.sin(i * 0.15 + tick * 0.1) * 2) + ((Math.random() - 0.5) * 4.5);

          // Center channel LoRa energy
          const distFromCenter = Math.abs(binFreq - centerFreqMhz);
          const halfBwMhz = (bandwidthKhz / 1000) / 2;

          if (distFromCenter <= halfBwMhz) {
            // Elevated channel energy
            const channelElevation = (state.channelAirtimePct / 100) * 8;
            dbm += channelElevation;

            // If active chirp packet is transmitting
            if (isTxActive && recentPkt) {
              // LoRa Chirp sweep modeling: simulate moving chirp instantaneous frequency
              const progress = ((Date.now() - recentPkt.timestamp) % recentPkt.airtimeMs) / recentPkt.airtimeMs;
              const chirpOffset = (recentPkt.chirpDirection === 'UP' ? (progress - 0.5) : (0.5 - progress)) * (bandwidthKhz / 1000);
              const chirpCenter = centerFreqMhz + chirpOffset;
              const chirpDist = Math.abs(binFreq - chirpCenter);

              if (chirpDist < 0.04) {
                // Peak chirp carrier
                const chirpPower = (recentPkt.rssi + 130) * 0.75 + 15;
                dbm += chirpPower * Math.exp(-Math.pow(chirpDist / 0.02, 2));
              } else {
                // Sinc-like sidelobes
                dbm += 8 * Math.abs(Math.sin((distFromCenter / halfBwMhz) * Math.PI));
              }
            }
          }

          bins[i] = Math.max(-130, Math.min(-30, dbm));
        }

        // --- 2. Draw Real-Time PSD Scope (Top Canvas) ---
        psdCtx.clearRect(0, 0, psdWidth, psdHeight);

        // Background grid lines (dBm levels)
        const gridDbmLevels = [-40, -60, -80, -100, -120];
        psdCtx.strokeStyle = 'rgba(30, 41, 59, 0.7)';
        psdCtx.lineWidth = 1;
        psdCtx.font = '9px JetBrains Mono, monospace';
        psdCtx.fillStyle = '#64748b';

        gridDbmLevels.forEach(level => {
          const y = ((level - (-40)) / (-130 - (-40))) * psdHeight;
          psdCtx.beginPath();
          psdCtx.moveTo(0, y);
          psdCtx.lineTo(psdWidth, y);
          psdCtx.stroke();
          psdCtx.fillText(`${level} dBm`, 8, Math.max(10, y - 3));
        });

        // Channel Bandwidth shaded zone
        const xChannelStart = ((centerFreqMhz - (bandwidthKhz / 2000) - minFreqMhz) / spanMhz) * psdWidth;
        const xChannelEnd = ((centerFreqMhz + (bandwidthKhz / 2000) - minFreqMhz) / spanMhz) * psdWidth;
        const xChannelWidth = xChannelEnd - xChannelStart;

        psdCtx.fillStyle = 'rgba(16, 185, 129, 0.06)';
        psdCtx.fillRect(xChannelStart, 0, xChannelWidth, psdHeight);
        psdCtx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
        psdCtx.setLineDash([3, 3]);
        psdCtx.strokeRect(xChannelStart, 0, xChannelWidth, psdHeight);
        psdCtx.setLineDash([]);

        // Center frequency marker
        const xCenter = ((centerFreqMhz - minFreqMhz) / spanMhz) * psdWidth;
        psdCtx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        psdCtx.beginPath();
        psdCtx.moveTo(xCenter, 0);
        psdCtx.lineTo(xCenter, psdHeight);
        psdCtx.stroke();

        // Draw PSD trace
        psdCtx.beginPath();
        psdCtx.lineWidth = 1.8;
        psdCtx.strokeStyle = palette === 'PHOSPHOR' ? '#10b981' : palette === 'CYAN' ? '#06b6d4' : palette === 'AMBER' ? '#f59e0b' : '#38bdf8';

        bins.forEach((dbm, idx) => {
          const x = (idx / (numBins - 1)) * psdWidth;
          const y = ((dbm - (-40)) / (-130 - (-40))) * psdHeight;
          if (idx === 0) psdCtx.moveTo(x, y);
          else psdCtx.lineTo(x, y);
        });
        psdCtx.stroke();

        // Trace fill with gradient
        const grad = psdCtx.createLinearGradient(0, 0, 0, psdHeight);
        grad.addColorStop(0, palette === 'PHOSPHOR' ? 'rgba(16,185,129,0.35)' : palette === 'CYAN' ? 'rgba(6,182,212,0.35)' : 'rgba(56,189,248,0.35)');
        grad.addColorStop(1, 'rgba(5, 8, 17, 0.02)');
        psdCtx.lineTo(psdWidth, psdHeight);
        psdCtx.lineTo(0, psdHeight);
        psdCtx.closePath();
        psdCtx.fillStyle = grad;
        psdCtx.fill();

        // --- 3. Scroll & Draw LoRa Spectrogram Waterfall (Bottom Canvas) ---
        // Scroll existing canvas down by 2px
        wfCtx.drawImage(waterfallCanvas, 0, 0, wfWidth, wfHeight - 2, 0, 2, wfWidth, wfHeight - 2);

        // Generate the 2px new slice at the top
        const sliceImage = wfCtx.createImageData(Math.floor(wfWidth), 2);
        const data = sliceImage.data;

        for (let x = 0; x < wfWidth; x++) {
          const binIdx = Math.floor((x / wfWidth) * numBins);
          const dbm = bins[binIdx] ?? -120;
          // Normalize -125 dBm (0.0) to -45 dBm (1.0)
          const normIntensity = (dbm - (-125)) / (-45 - (-125));
          const [r, g, b] = getPaletteColor(normIntensity, palette);

          for (let row = 0; row < 2; row++) {
            const pixelIdx = (row * Math.floor(wfWidth) + x) * 4;
            data[pixelIdx] = r;
            data[pixelIdx + 1] = g;
            data[pixelIdx + 2] = b;
            data[pixelIdx + 3] = 255;
          }
        }

        wfCtx.putImageData(sliceImage, 0, 0);

        // Overlay packet chirp banner if chirp triggered on this frame
        if (isTxActive && recentPkt && (tick % 6 === 0)) {
          wfCtx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          wfCtx.font = '8px JetBrains Mono, monospace';
          const tag = `[SF${recentPkt.spreadingFactor} / ${recentPkt.bandwidthKhz}kHz] ${recentPkt.senderName}`;
          wfCtx.fillText(tag, xChannelStart + 6, 12);
        }
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    animationFrameRef.current = animationId;

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [
    isPaused, 
    waterfallSpeed, 
    palette, 
    bandwidthKhz, 
    centerFreqMhz, 
    minFreqMhz, 
    maxFreqMhz, 
    spanMhz, 
    state.channelNoiseFloorDbm, 
    state.channelAirtimePct, 
    state.rfPackets, 
    getPaletteColor
  ]);

  // Rolling SNR / RSSI Trend Canvas Render
  useEffect(() => {
    if (activeTab !== 'METRICS_TREND') return;

    const trendCanvas = trendCanvasRef.current;
    if (!trendCanvas) return;
    const ctx = trendCanvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = trendCanvas.clientWidth;
    const height = trendCanvas.clientHeight;

    if (trendCanvas.width !== width * dpr || trendCanvas.height !== height * dpr) {
      trendCanvas.width = width * dpr;
      trendCanvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, width, height);

    const history = state.rfMetricsHistory || [];
    if (history.length < 2) return;

    const padLeft = 45;
    const padRight = 45;
    const padTop = 25;
    const padBottom = 30;
    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;

    // Filter points if node selected
    const displayPoints = selectedNodeFilter === 'ALL' 
      ? history 
      : history.filter(p => !p.nodeNumHex || p.nodeNumHex === selectedNodeFilter);

    if (displayPoints.length < 2) return;

    // --- Grid Lines & Scale ---
    // Left Axis: RSSI (-120 dBm to -40 dBm)
    // Right Axis: SNR (-15 dB to +20 dB)
    const rssiMin = -120;
    const rssiMax = -40;
    const snrMin = -15;
    const snrMax = 20;

    const getY_rssi = (val: number) => padTop + plotHeight - ((val - rssiMin) / (rssiMax - rssiMin)) * plotHeight;
    const getY_snr = (val: number) => padTop + plotHeight - ((val - snrMin) / (snrMax - snrMin)) * plotHeight;
    const getX = (idx: number) => padLeft + (idx / (displayPoints.length - 1)) * plotWidth;

    // Background Grid
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
    ctx.lineWidth = 1;
    ctx.font = '9px JetBrains Mono, monospace';

    // RSSI levels
    const rssiTicks = [-120, -100, -80, -60, -40];
    rssiTicks.forEach(tick => {
      const y = getY_rssi(tick);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText(`${tick} dBm`, padLeft - 6, y + 3);
    });

    // Zero SNR reference dashed line
    const ySnrZero = getY_snr(0);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, ySnrZero);
    ctx.lineTo(width - padRight, ySnrZero);
    ctx.stroke();
    ctx.setLineDash([]);

    // Right Axis Labels (SNR)
    const snrTicks = [-10, 0, 10, 20];
    snrTicks.forEach(tick => {
      const y = getY_snr(tick);
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'left';
      ctx.fillText(`${tick > 0 ? '+' : ''}${tick} dB`, width - padRight + 6, y + 3);
    });

    // Theoretical LoRa Demodulation Limit for selected SF
    const sfLimit = SF_LIMITS[spreadingFactor] ?? -10.0;
    const yLimit = getY_snr(sfLimit);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(padLeft, yLimit);
    ctx.lineTo(width - padRight, yLimit);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#f87171';
    ctx.fillText(`SF${spreadingFactor} Floor (${sfLimit} dB)`, width - padRight - 110, yLimit - 4);

    // --- Draw RSSI Series (Emerald Gradient) ---
    ctx.beginPath();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#10b981';
    displayPoints.forEach((pt, idx) => {
      const x = getX(idx);
      const y = getY_rssi(pt.rssi);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // RSSI data points
    displayPoints.forEach((pt, idx) => {
      const x = getX(idx);
      const y = getY_rssi(pt.rssi);
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // --- Draw SNR Series (Sky Cyan) ---
    ctx.beginPath();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#38bdf8';
    displayPoints.forEach((pt, idx) => {
      const x = getX(idx);
      const y = getY_snr(pt.snr);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    displayPoints.forEach((pt, idx) => {
      const x = getX(idx);
      const y = getY_snr(pt.snr);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Bottom time labels
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    displayPoints.forEach((pt, idx) => {
      if (idx % 3 === 0 || idx === displayPoints.length - 1) {
        const x = getX(idx);
        ctx.fillText(pt.timeLabel, x, height - 10);
      }
    });

  }, [activeTab, state.rfMetricsHistory, selectedNodeFilter, spreadingFactor]);

  // Handle Canvas Hover
  const handleWaterfallMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = waterfallCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const freq = minFreqMhz + (x / rect.width) * spanMhz;
    const estimatedDbm = state.channelNoiseFloorDbm + Math.random() * 8;

    setHoverData({
      freqMhz: parseFloat(freq.toFixed(3)),
      dbm: Math.round(estimatedDbm),
      x,
      y,
    });
  };

  const handleWaterfallMouseLeave = () => {
    setHoverData(null);
  };

  // Inject Custom Chirp Test Packet
  const handleInjectPacket = (type: LoraRfPacketEvent['packetType'] = 'TELEMETRY') => {
    const pkt = meshtasticBleService.injectTestPacket(type, spreadingFactor, bandwidthKhz);
    playLoraChirpAudio(spreadingFactor, pkt.chirpDirection === 'UP');
    if (onNotify) {
      onNotify(`Injected LoRa CSS ${pkt.chirpDirection}-chirp [SF${pkt.spreadingFactor} ${pkt.bandwidthKhz}kHz] ${pkt.packetType} (${pkt.airtimeMs}ms airtime)`);
    }
  };

  // Current Link Margin Calculation
  const latestMetric = state.rfMetricsHistory[state.rfMetricsHistory.length - 1];
  const currentSnr = latestMetric?.snr ?? 10.5;
  const currentRssi = latestMetric?.rssi ?? -76;
  const thresholdSnr = SF_LIMITS[spreadingFactor] ?? -10.0;
  const linkMarginDb = parseFloat((currentSnr - thresholdSnr).toFixed(1));

  return (
    <div id="meshtastic-spectrum-analyzer" className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl space-y-0">
      
      {/* Top Header & Mode Tabs */}
      <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Waves className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-sm font-bold text-white tracking-wide">
                LoRa Chirp Spread Spectrum (CSS) Waterfall & RF Analyzer
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-mono font-bold">
                REAL-TIME FFT
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Center: <span className="text-emerald-400 font-bold">{centerFreqMhz.toFixed(3)} MHz</span> (Slot {Math.round((centerFreqMhz - 902.0) / 0.25)}) • Span: ±{(spanMhz / 2).toFixed(3)} MHz
            </p>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 flex items-center text-xs font-mono">
            <button
              id="tab-btn-spectrogram"
              onClick={() => setActiveTab('SPECTROGRAM')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'SPECTROGRAM'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Waves className="w-3.5 h-3.5" />
              CSS Spectrogram
            </button>
            <button
              id="tab-btn-trend"
              onClick={() => setActiveTab('METRICS_TREND')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'METRICS_TREND'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              SNR / RSSI Trend
            </button>
          </div>
        </div>
      </div>

      {/* Control Strip */}
      <div className="bg-slate-900/50 px-4 py-2.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left Parameter Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Spreading Factor Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-mono text-[11px]">Spreading Factor:</span>
            <div className="flex items-center bg-slate-950 rounded border border-slate-800 p-0.5">
              {([7, 8, 9, 10, 11, 12] as const).map(sf => (
                <button
                  key={sf}
                  id={`btn-sf-${sf}`}
                  onClick={() => setSpreadingFactor(sf)}
                  className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                    spreadingFactor === sf
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  SF{sf}
                </button>
              ))}
            </div>
          </div>

          {/* Bandwidth Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-mono text-[11px]">LoRa BW:</span>
            <div className="flex items-center bg-slate-950 rounded border border-slate-800 p-0.5">
              {([125, 250, 500] as const).map(bw => (
                <button
                  key={bw}
                  id={`btn-bw-${bw}`}
                  onClick={() => setBandwidthKhz(bw)}
                  className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                    bandwidthKhz === bw
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {bw} kHz
                </button>
              ))}
            </div>
          </div>

          {/* Color Palette Selector (when in Spectrogram mode) */}
          {activeTab === 'SPECTROGRAM' && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-mono text-[11px]">Palette:</span>
              <select
                id="select-waterfall-palette"
                value={palette}
                onChange={e => setPalette(e.target.value as WaterfallPalette)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="THERMAL">Thermal Heatmap</option>
                <option value="CYAN">Cyber Cyan</option>
                <option value="PHOSPHOR">Emerald Phosphor</option>
                <option value="AMBER">Obsidian Amber</option>
              </select>
            </div>
          )}

          {/* Node Filter (when in Trend mode) */}
          {activeTab === 'METRICS_TREND' && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-mono text-[11px]">Node Trace:</span>
              <select
                id="select-trend-node"
                value={selectedNodeFilter}
                onChange={e => setSelectedNodeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">Fleet Aggregate (All)</option>
                {state.nodes.map(n => (
                  <option key={n.num} value={n.user.id}>
                    {n.user.longName} ({n.user.id})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2">
          {/* Audio Sidetone Synthesizer Toggle */}
          <button
            id="btn-toggle-audio-sidetone"
            onClick={() => {
              const nextState = !audioSidetone;
              setAudioSidetone(nextState);
              if (nextState) playLoraChirpAudio(spreadingFactor, true);
            }}
            title="LoRa Chirp Audio Synthesizer: Plays audio sidetone sweep on packet reception"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono transition-colors border ${
              audioSidetone
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {audioSidetone ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>CSS Audio Sidetone</span>
          </button>

          {/* Pause / Resume */}
          <button
            id="btn-toggle-pause"
            onClick={() => setIsPaused(!isPaused)}
            className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 transition-colors"
          >
            {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
            {isPaused ? 'Resume' : 'Freeze'}
          </button>

          {/* Inject Test LoRa Chirp */}
          <button
            id="btn-inject-lora-chirp"
            onClick={() => handleInjectPacket('TELEMETRY')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[11px] font-semibold px-2.5 py-1 rounded flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Transmit CSS Chirp</span>
          </button>
        </div>
      </div>

      {/* Main Visualizer Body */}
      {activeTab === 'SPECTROGRAM' ? (
        <div className="p-4 space-y-3">
          {/* Top: Real-Time Power Spectral Density (PSD) Scope */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  FFT Power Spectral Density (PSD)
                </span>
                <span className="text-slate-500">|</span>
                <span>RBW: 1.5 kHz</span>
                <span className="text-slate-500">|</span>
                <span>Noise: {state.channelNoiseFloorDbm || -118} dBm</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">Chirp Envelope: {bandwidthKhz} kHz</span>
              </div>
            </div>

            <div className="w-full h-36 bg-slate-950 rounded-lg border border-slate-800/90 relative overflow-hidden">
              <canvas
                ref={psdCanvasRef}
                className="w-full h-full block"
              />
              {/* Frequency Axis Markings */}
              <div className="absolute bottom-1 left-2 text-[9px] font-mono text-slate-500">
                {minFreqMhz.toFixed(3)} MHz
              </div>
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-emerald-400 font-bold">
                {centerFreqMhz.toFixed(3)} MHz (Center)
              </div>
              <div className="absolute bottom-1 right-2 text-[9px] font-mono text-slate-500">
                {maxFreqMhz.toFixed(3)} MHz
              </div>
            </div>
          </div>

          {/* Bottom: Scrolling LoRa Spectrogram Waterfall */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold flex items-center gap-1">
                  <Waves className="w-3.5 h-3.5 text-cyan-400" />
                  2D LoRa Chirp Spectrogram Waterfall
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-cyan-400">Up/Down Chirp CSS Demodulation</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Speed:</span>
                {(['SLOW', 'NORMAL', 'FAST'] as const).map(spd => (
                  <button
                    key={spd}
                    id={`btn-speed-${spd}`}
                    onClick={() => setWaterfallSpeed(spd)}
                    className={`px-1.5 py-0.2 rounded text-[10px] ${
                      waterfallSpeed === spd ? 'bg-slate-800 text-white font-bold' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {spd}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full h-64 bg-slate-950 rounded-lg border border-slate-800/90 relative overflow-hidden">
              <canvas
                ref={waterfallCanvasRef}
                onMouseMove={handleWaterfallMouseMove}
                onMouseLeave={handleWaterfallMouseLeave}
                className="w-full h-full block cursor-crosshair"
              />

              {/* Hover Tooltip */}
              {hoverData && (
                <div 
                  className="absolute pointer-events-none bg-slate-900/95 border border-slate-700 text-[10px] font-mono text-white px-2 py-1 rounded shadow-lg z-20"
                  style={{
                    left: Math.min(hoverData.x + 12, (waterfallCanvasRef.current?.clientWidth || 300) - 130),
                    top: Math.max(10, hoverData.y - 30),
                  }}
                >
                  <div className="text-emerald-400 font-bold">{hoverData.freqMhz} MHz</div>
                  <div className="text-slate-300">Level: ~{hoverData.dbm} dBm</div>
                </div>
              )}

              {/* CSS Chirp Info Badge Overlay */}
              <div className="absolute top-2 left-2 bg-slate-950/80 border border-slate-800 backdrop-blur-xs px-2 py-1 rounded text-[10px] font-mono text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Modulation: CSS (Chirp Spread Spectrum)</span>
                <span className="text-slate-500">•</span>
                <span>Symbol: {(Math.pow(2, spreadingFactor) / (bandwidthKhz * 1000) * 1000).toFixed(2)} ms</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* SNR & RSSI Historical Trend View */
        <div className="p-4 space-y-4">
          {/* Key RF Telemetry KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* RSSI Card */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Average RSSI
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-mono font-bold text-emerald-400">
                  {currentRssi}
                </span>
                <span className="text-xs font-mono text-slate-400">dBm</span>
              </div>
              <div className="mt-1 text-[10px] text-slate-500 font-mono">
                Noise Floor: {state.channelNoiseFloorDbm || -118} dBm
              </div>
            </div>

            {/* SNR Card */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Signal-to-Noise (SNR)
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-mono font-bold text-sky-400">
                  {currentSnr > 0 ? `+${currentSnr}` : currentSnr}
                </span>
                <span className="text-xs font-mono text-slate-400">dB</span>
              </div>
              <div className="mt-1 text-[10px] text-slate-500 font-mono">
                Demod Threshold: {thresholdSnr} dB
              </div>
            </div>

            {/* Link Margin */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                LoRa Link Margin
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className={`text-xl font-mono font-bold ${
                  linkMarginDb >= 10 ? 'text-emerald-400' : linkMarginDb >= 4 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  +{linkMarginDb}
                </span>
                <span className="text-xs font-mono text-slate-400">dB</span>
              </div>
              <div className="mt-1 text-[10px] font-mono flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">
                  {linkMarginDb >= 10 ? 'Robust Link' : linkMarginDb >= 4 ? 'Adequate' : 'Near Limit'}
                </span>
              </div>
            </div>

            {/* Channel Airtime & Duty Cycle */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Channel Duty Cycle
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-mono font-bold text-amber-400">
                  {state.channelAirtimePct ?? 6.8}%
                </span>
                <span className="text-xs font-mono text-slate-400">Airtime</span>
              </div>
              <div className="mt-1 text-[10px] text-slate-500 font-mono">
                Collision Risk: <span className="text-emerald-400">Low (&lt;10%)</span>
              </div>
            </div>
          </div>

          {/* Rolling Dual-Axis Trend Chart */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
              <div className="flex items-center gap-3">
                <span className="text-white font-semibold">Dual-Axis Temporal Stability (Past 20m)</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2.5 h-0.5 bg-emerald-500 rounded" />
                  RSSI (Left Axis)
                </span>
                <span className="flex items-center gap-1 text-sky-400">
                  <span className="w-2.5 h-0.5 bg-sky-400 rounded" />
                  SNR (Right Axis)
                </span>
              </div>
              <div className="text-slate-500 text-[10px]">
                Sampling Interval: 60s
              </div>
            </div>

            <div className="w-full h-64 bg-slate-950 rounded-lg border border-slate-800/90 relative overflow-hidden">
              <canvas
                ref={trendCanvasRef}
                className="w-full h-full block"
              />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Recent LoRa CSS Chirp Transmissions Log */}
      <div className="bg-slate-900/40 border-t border-slate-800/90 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <h4 className="text-xs font-mono font-bold text-slate-200">
              Recent LoRa CSS Chirp Transmissions
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">
              ({state.rfPackets.length} captured frames)
            </span>
          </div>
          <button
            onClick={() => handleInjectPacket('POSITION')}
            className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            Simulate Position Beacon Chirp
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {state.rfPackets.slice(0, 4).map((pkt) => (
            <div
              key={pkt.id}
              className="bg-slate-950 border border-slate-800/80 rounded-lg p-2.5 text-xs font-mono space-y-1 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 truncate max-w-[130px]" title={pkt.senderName}>
                  {pkt.senderName}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-semibold">
                  {pkt.packetType}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  SF{pkt.spreadingFactor} / {pkt.bandwidthKhz}kHz
                </span>
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  {pkt.chirpDirection === 'UP' ? (
                    <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-cyan-400" />
                  )}
                  {pkt.chirpDirection}-Chirp
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-900">
                <span className="text-slate-500">
                  {new Date(pkt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">{pkt.rssi} dBm</span>
                  <span className="text-sky-400 font-bold">
                    {pkt.snr > 0 ? `+${pkt.snr}` : pkt.snr} dB
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
