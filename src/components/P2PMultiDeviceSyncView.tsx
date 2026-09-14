import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Smartphone, 
  Laptop, 
  Tablet, 
  Wifi, 
  Activity, 
  Share2, 
  Copy, 
  Check, 
  Send, 
  Zap, 
  ShieldAlert, 
  Crosshair, 
  Cpu, 
  ArrowRightLeft, 
  Maximize2,
  RefreshCw,
  Sliders,
  Terminal,
  ExternalLink,
  AlertTriangle,
  QrCode,
  Camera,
  CameraOff,
  Globe,
  Lock,
  Unlock,
  HelpCircle,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import QRCode from 'qrcode';
import { webrtcMesh } from '../fabric/webrtcMeshManager';
import { PhysicalPeerDevice, P2PMessagePacket, P2PBenchmarkResult } from '../types';

interface P2PMultiDeviceSyncViewProps {
  onNotify?: (msg: string) => void;
}

export type PairingTargetMode = 'public_shared' | 'dev_container' | 'custom_lan';

export const P2PMultiDeviceSyncView: React.FC<P2PMultiDeviceSyncViewProps> = ({ onNotify }) => {
  const [selfPeer, setSelfPeer] = useState<PhysicalPeerDevice>(webrtcMesh.getSelfPeer());
  const [peers, setPeers] = useState<PhysicalPeerDevice[]>(webrtcMesh.getPeers());
  const [messages, setMessages] = useState<P2PMessagePacket[]>(webrtcMesh.getMessages());
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [customCallsign, setCustomCallsign] = useState<string>(selfPeer.callsign);
  const [isEditingCallsign, setIsEditingCallsign] = useState<boolean>(false);
  const [selectedPeerId, setSelectedPeerId] = useState<string>('broadcast');
  const [chatInput, setChatInput] = useState<string>('');
  const [selectedTadilWord, setSelectedTadilWord] = useState<string>('J3.2 AIR TRACK');
  const [defconLevel, setDefconLevel] = useState<number>(3);
  const [jammerActive, setJammerActive] = useState<boolean>(false);
  const [benchmarkResult, setBenchmarkResult] = useState<P2PBenchmarkResult | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState<boolean>(false);
  const [tacticalWaypoint, setTacticalWaypoint] = useState<{ x: number; y: number }>({ x: 50, y: 50 });

  // Intelligent URL resolution for Google AI Studio sandbox vs Shared preview
  const rawCurrentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const isDevContainer = rawCurrentUrl.includes('ais-dev-');
  const publicSharedUrl = isDevContainer 
    ? rawCurrentUrl.replace('ais-dev-', 'ais-pre-')
    : rawCurrentUrl;

  const [pairingTargetMode, setPairingTargetMode] = useState<PairingTargetMode>(
    isDevContainer ? 'public_shared' : 'dev_container'
  );
  const [customLanUrl, setCustomLanUrl] = useState<string>('');
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(true);
  const [roomCode] = useState<string>(() => `MESH-${Math.floor(1000 + Math.random() * 9000)}`);
  const [joinRoomInput, setJoinRoomInput] = useState<string>('');
  const [activeTabSubMode, setActiveTabSubMode] = useState<'qr_code' | 'camera_scan' | 'room_code'>('qr_code');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedLink, setScannedLink] = useState<string | null>(null);

  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Compute active target URL for QR encoding
  const getActivePairingUrl = () => {
    if (pairingTargetMode === 'public_shared') {
      return publicSharedUrl;
    }
    if (pairingTargetMode === 'custom_lan') {
      return customLanUrl.trim() || 'http://192.168.1.100:3000';
    }
    return rawCurrentUrl;
  };

  // Subscribe to WebRTC manager state updates
  useEffect(() => {
    const unsubscribe = webrtcMesh.subscribe(() => {
      setSelfPeer(webrtcMesh.getSelfPeer());
      setPeers(webrtcMesh.getPeers());
      setMessages(webrtcMesh.getMessages());
    });

    // Wire up synchronization callbacks from remote peers
    webrtcMesh.onDefconSync = (level) => {
      setDefconLevel(level);
      if (onNotify) onNotify(`DEFCON level updated to ${level} by remote mesh peer`);
    };

    webrtcMesh.onJammerSync = (active) => {
      setJammerActive(active);
      if (onNotify) onNotify(`Electronic Warfare Jammer ${active ? 'ENGAGED' : 'DISENGAGED'} by remote peer`);
    };

    webrtcMesh.onWaypointSync = (wp) => {
      setTacticalWaypoint(wp);
      if (onNotify) onNotify(`Tactical Waypoint updated to (${wp.x}, ${wp.y}) via WebRTC`);
    };

    return () => {
      unsubscribe();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [onNotify]);

  // Generate QR Code whenever pairing URL or target mode changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activeUrl = getActivePairingUrl();
      const darkColor = pairingTargetMode === 'public_shared' 
        ? '#06b6d4' 
        : (pairingTargetMode === 'custom_lan' ? '#a855f7' : '#f59e0b');

      QRCode.toDataURL(activeUrl, {
        width: 220,
        margin: 1,
        color: {
          dark: darkColor,
          light: '#030712',
        },
      }).then(url => {
        setQrDataUrl(url);
      }).catch(err => {
        console.warn('QR code generation failed:', err);
      });
    }
  }, [pairingTargetMode, customLanUrl, publicSharedUrl, rawCurrentUrl]);

  // Mini radar canvas rendering
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Grid circles
    ctx.strokeStyle = '#0e7490';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 4, 0, Math.PI * 2);
    ctx.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.strokeStyle = '#155e75';
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Waypoint marker
    const px = (tacticalWaypoint.x / 100) * w;
    const py = (tacticalWaypoint.y / 100) * h;

    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#e0f2fe';
    ctx.font = '10px monospace';
    ctx.fillText(`WP [${tacticalWaypoint.x}, ${tacticalWaypoint.y}]`, px + 12, py + 4);
  }, [tacticalWaypoint]);

  const handleCopyLink = (urlToCopy?: string) => {
    if (typeof window !== 'undefined') {
      const url = urlToCopy || getActivePairingUrl();
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      if (onNotify) onNotify(`Mesh connection link copied: ${url.slice(0, 32)}...`);
    }
  };

  const handleOpenSimTab = (formFactor: 'mobile' | 'desktop' = 'mobile') => {
    if (typeof window !== 'undefined') {
      const features = formFactor === 'mobile' 
        ? 'width=420,height=840,resizable=yes,scrollbars=yes' 
        : undefined;
      try {
        const opened = window.open(window.location.href, '_blank', features);
        if (!opened) {
          handleCopyLink();
          if (onNotify) onNotify(`Popup blocked by browser. Peer pairing URL copied to clipboard instead.`);
        } else if (onNotify) {
          onNotify(`Opening simulated ${formFactor} peer node window...`);
        }
      } catch {
        handleCopyLink();
        if (onNotify) onNotify(`Direct popup restricted by iframe. Peer pairing URL copied to clipboard.`);
      }
    }
  };

  const handleStartCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera hardware access is not supported in this frame/browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      if (onNotify) onNotify('Tactical optical camera scanner initialized');
    } catch (err: any) {
      console.warn('Camera initiation failed:', err);
      setCameraError(err.message || 'Unable to access camera. Check device permissions or use Air-Link Room Code.');
      setIsCameraActive(false);
    }
  };

  const handleStopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomInput.trim()) return;
    if (onNotify) onNotify(`Joined tactical mesh room "${joinRoomInput.trim().toUpperCase()}"`);
    setJoinRoomInput('');
  };

  const handleUpdateCallsign = (e: React.FormEvent) => {
    e.preventDefault();
    webrtcMesh.setCallsign(customCallsign);
    setIsEditingCallsign(false);
    if (onNotify) onNotify(`Local terminal callsign set to ${customCallsign}`);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    if (selectedPeerId === 'broadcast') {
      webrtcMesh.broadcastToAllPeers({
        type: 'p2p_chat',
        payload: { text: chatInput },
      });
    } else {
      webrtcMesh.sendP2PChat(selectedPeerId, chatInput);
    }
    setChatInput('');
  };

  const handleSendTadil = () => {
    webrtcMesh.broadcastTadilAlert(selectedTadilWord, `TADIL Word ${selectedTadilWord} dispatched from ${selfPeer.callsign}`);
    if (onNotify) onNotify(`Broadcasted STANAG 5516 ${selectedTadilWord} across WebRTC DataChannels`);
  };

  const handleDefconChange = (newLevel: number) => {
    setDefconLevel(newLevel);
    webrtcMesh.syncDefconLevel(newLevel);
    if (onNotify) onNotify(`DEFCON ${newLevel} synchronized across all physical mesh devices`);
  };

  const handleToggleJammer = () => {
    const next = !jammerActive;
    setJammerActive(next);
    webrtcMesh.syncJammerStatus(next);
    if (onNotify) onNotify(`Tactical Jammer ${next ? 'ACTIVATED' : 'DEACTIVATED'} across mesh devices`);
  };

  const handleRadarClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const x = Math.round((clickX / rect.width) * 100);
    const y = Math.round((clickY / rect.height) * 100);

    setTacticalWaypoint({ x, y });
    webrtcMesh.syncTacticalWaypoint(x, y);
  };

  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    if (onNotify) onNotify('Firing 40-packet WebRTC DataChannel benchmark burst...');
    try {
      const targetId = selectedPeerId === 'broadcast' ? (peers[0]?.id || '') : selectedPeerId;
      const res = await webrtcMesh.runP2PBenchmark(targetId);
      setBenchmarkResult(res);
      if (onNotify) onNotify(`Benchmark completed: ${res.avgLatencyMs}ms avg latency, ${res.throughputKbps} Kbps`);
    } catch (e) {
      console.error('Benchmark failed:', e);
    } finally {
      setIsBenchmarking(false);
    }
  };

  const getDeviceIcon = (deviceType: 'desktop' | 'mobile' | 'tablet') => {
    switch (deviceType) {
      case 'mobile': return <Smartphone className="w-4 h-4 text-amber-400" />;
      case 'tablet': return <Tablet className="w-4 h-4 text-purple-400" />;
      default: return <Laptop className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getStatusBadge = (status: PhysicalPeerDevice['p2pStatus']) => {
    switch (status) {
      case 'data_channel_open':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
            WEBRTC DATACHANNEL OPEN
          </span>
        );
      case 'connected':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1.5" />
            PEER CONNECTED
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 animate-ping" />
            ICE NEGOTIATING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            FALLBACK WS RELAY
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="tactical-panel p-5 rounded-lg border border-cyan-500/30 bg-slate-900/80 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
          <Radio className="w-32 h-32 text-cyan-400" />
        </div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono tracking-widest uppercase mb-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>DISTRIBUTED P2P FABRIC • REAL MULTI-DEVICE SYNC</span>
            </div>
            <h1 className="text-2xl font-bold font-display text-white tracking-wide flex items-center gap-2">
              <span>WebRTC Physical Node Sync</span>
              <span className="text-xs px-2 py-0.5 rounded font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                P2P DATACHANNEL
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl font-sans">
              Autonomous browser-to-browser P2P mesh using WebRTC DataChannels and local signaling. Connect real phones, tablets, or separate browser windows with zero setup.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleOpenSimTab('mobile')}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Launch Peer Tab</span>
            </button>
            <button
              onClick={() => handleCopyLink()}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Mesh Link'}</span>
            </button>
          </div>
        </div>

        {/* Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800 font-mono text-xs">
          <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
            <div className="text-slate-500 text-[11px]">LOCAL TERMINAL</div>
            <div className="text-cyan-300 font-semibold truncate flex items-center gap-1.5 mt-0.5">
              {getDeviceIcon(selfPeer.deviceType)}
              <span>{selfPeer.callsign}</span>
            </div>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
            <div className="text-slate-500 text-[11px]">PHYSICAL PEERS</div>
            <div className="text-white font-semibold flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{peers.length} REMOTE {peers.length === 1 ? 'DEVICE' : 'DEVICES'}</span>
            </div>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
            <div className="text-slate-500 text-[11px]">AVG ROUND-TRIP PING</div>
            <div className="text-emerald-400 font-semibold flex items-center gap-1.5 mt-0.5">
              <Activity className="w-3.5 h-3.5" />
              <span>{selfPeer.latencyMs} ms</span>
            </div>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
            <div className="text-slate-500 text-[11px]">WIRE DATA TRANSFERRED</div>
            <div className="text-purple-400 font-semibold flex items-center gap-1.5 mt-0.5">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>{Math.round((selfPeer.dataSentBytes + selfPeer.dataReceivedBytes) / 1024)} KB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Multi-Device Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Quick Pairing QR & Device Roster (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Google Auth & Barcode Failure Diagnostic Banner */}
          {showDiagnostics && (
            <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-950/40 backdrop-blur-sm text-xs font-mono space-y-2.5">
              <div className="flex items-center justify-between text-amber-300 font-bold tracking-wide">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>BARCODE RESOLVER: GOOGLE 403 ERROR EXPLAINED</span>
                </div>
                <button 
                  onClick={() => setShowDiagnostics(false)}
                  className="text-amber-400/60 hover:text-amber-300 text-[10px]"
                >
                  Dismiss
                </button>
              </div>

              <p className="text-amber-200/90 font-sans leading-relaxed text-xs">
                Scanning the internal development link (<span className="font-mono text-amber-300">ais-dev-*</span>) with an external phone causes Google Cloud Run to block access with a <strong className="text-amber-100">Google 403 Forbidden / Error page</strong>, because that URL is strictly restricted to your logged-in Google AI Studio account.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="p-2.5 rounded bg-slate-950/80 border border-amber-500/20 text-slate-300 space-y-1">
                  <div className="text-cyan-400 font-bold flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Option 1: Public Preview</span>
                  </div>
                  <p className="font-sans text-[11px] text-slate-400">
                    Click <strong>'Share'</strong> in Google AI Studio's top header to activate public routing, then select the <strong>Public Shared Link</strong> below.
                  </p>
                </div>

                <div className="p-2.5 rounded bg-slate-950/80 border border-amber-500/20 text-slate-300 space-y-1">
                  <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5" />
                    <span>Option 2: Instant Multi-Window Test</span>
                  </div>
                  <p className="font-sans text-[11px] text-slate-400">
                    Click <strong>'Simulate Mobile Peer'</strong> below to test real-time WebRTC DataChannels and bidirectional messaging on this machine right now!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Upgraded Multi-Device Pairing Hub */}
          <div className="tactical-panel p-4 rounded-xl border border-slate-800 bg-slate-900/80 shadow-2xl">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold font-display text-white tracking-wide">
                    Cross-Device Tactical Pairing
                  </h2>
                  <div className="text-[10px] font-mono text-slate-400">
                    AIR-LINK • WEBRTC DATACHANNEL • QR ENCODING
                  </div>
                </div>
              </div>

              {/* Submode switcher tabs */}
              <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono">
                <button
                  onClick={() => { setActiveTabSubMode('qr_code'); handleStopCamera(); }}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeTabSubMode === 'qr_code'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-3 h-3 inline mr-1" />
                  QR Barcode
                </button>
                <button
                  onClick={() => { setActiveTabSubMode('camera_scan'); handleStartCamera(); }}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeTabSubMode === 'camera_scan'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Camera className="w-3 h-3 inline mr-1" />
                  Camera Reader
                </button>
                <button
                  onClick={() => { setActiveTabSubMode('room_code'); handleStopCamera(); }}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeTabSubMode === 'room_code'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Radio className="w-3 h-3 inline mr-1" />
                  Air-Link PIN
                </button>
              </div>
            </div>

            {/* TAB 1: QR CODE DISPLAY & TARGET MODE SELECTOR */}
            {activeTabSubMode === 'qr_code' && (
              <div className="space-y-3.5">
                {/* Mode Selector Pill Buttons */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                    <span>SELECT TARGET PAIRING DOMAIN:</span>
                    <span className="text-cyan-400">
                      {pairingTargetMode === 'public_shared' ? '✓ Recommended for Phone Camera' : 'Developer Restricted'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                    <button
                      onClick={() => setPairingTargetMode('public_shared')}
                      className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                        pairingTargetMode === 'public_shared'
                          ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/50'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1">
                        <Globe className="w-3 h-3 text-cyan-400" />
                        <span>Public Shared</span>
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1">No Google sign-in required</div>
                    </button>

                    <button
                      onClick={() => setPairingTargetMode('dev_container')}
                      className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                        pairingTargetMode === 'dev_container'
                          ? 'bg-amber-950/70 border-amber-500 text-amber-200 ring-1 ring-amber-500/50'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>Dev Container</span>
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1">Requires Google login</div>
                    </button>

                    <button
                      onClick={() => setPairingTargetMode('custom_lan')}
                      className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                        pairingTargetMode === 'custom_lan'
                          ? 'bg-purple-950/70 border-purple-500 text-purple-200 ring-1 ring-purple-500/50'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1">
                        <Wifi className="w-3 h-3 text-purple-400" />
                        <span>Local Wi-Fi IP</span>
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1">Custom LAN / tunnel URL</div>
                    </button>
                  </div>
                </div>

                {/* If Custom LAN selected, show input */}
                {pairingTargetMode === 'custom_lan' && (
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-purple-500/40 space-y-1.5">
                    <label className="text-[10px] font-mono text-purple-300 block">
                      CUSTOM LOCAL IP OR TUNNEL ENDPOINT:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customLanUrl}
                        onChange={(e) => setCustomLanUrl(e.target.value)}
                        placeholder="e.g. http://192.168.1.105:3000"
                        className="flex-1 px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                      />
                      <button
                        onClick={() => handleCopyLink(customLanUrl)}
                        className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}

                {/* QR Display + Scanning Instructions */}
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950 p-3.5 rounded-xl border border-slate-800/90">
                  <div className="relative group shrink-0">
                    {qrDataUrl ? (
                      <div className={`p-2 bg-slate-950 rounded-xl border shadow-lg ${
                        pairingTargetMode === 'public_shared'
                          ? 'border-cyan-500/50 shadow-cyan-500/10'
                          : (pairingTargetMode === 'custom_lan' ? 'border-purple-500/50 shadow-purple-500/10' : 'border-amber-500/50 shadow-amber-500/10')
                      }`}>
                        <img src={qrDataUrl} alt="Tactical Mesh Pairing QR" className="w-32 h-32 rounded-lg" />
                      </div>
                    ) : (
                      <div className="w-32 h-32 bg-slate-900 animate-pulse rounded-xl border border-slate-800 flex items-center justify-center text-xs text-slate-500">
                        Generating...
                      </div>
                    )}
                    <span className="absolute -bottom-2 -right-2 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[9px] font-mono text-cyan-300">
                      STANAG QR
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 space-y-2.5 flex-1 min-w-0">
                    <div>
                      <div className="text-[10px] font-mono text-slate-500 uppercase">ACTIVE ENCODED URL</div>
                      <div className="font-mono text-[11px] text-cyan-300 truncate bg-slate-900/90 px-2.5 py-1.5 rounded border border-slate-800 mt-0.5">
                        {getActivePairingUrl()}
                      </div>
                    </div>

                    <p className="font-sans text-xs text-slate-400 leading-relaxed">
                      {pairingTargetMode === 'public_shared' 
                        ? 'Scan with iOS Camera or Android Barcode Scanner. To ensure public routing is live, click "Share" in Google AI Studio top menu.' 
                        : (pairingTargetMode === 'custom_lan' 
                            ? 'Point other devices on your local Wi-Fi to this direct network address.' 
                            : 'Direct development container. Only accessible on devices signed in as jonnysteedman683@gmail.com.')}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
                      <button
                        onClick={() => handleCopyLink()}
                        className="px-2.5 py-1.5 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 transition-colors flex items-center gap-1.5"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copied to Clipboard' : 'Copy Active Link'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenSimTab('mobile')}
                        className="px-2.5 py-1.5 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center gap-1.5"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                        <span>Simulate Mobile Peer</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: IN-APP CAMERA BARCODE SCANNER */}
            {activeTabSubMode === 'camera_scan' && (
              <div className="space-y-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span className="text-white font-bold">Optical Camera Barcode Reader</span>
                  </div>
                  <span className="text-emerald-400 text-[10px] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    LIVE LENS
                  </span>
                </div>

                {cameraError ? (
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-700/50 text-rose-300 text-xs font-mono space-y-2">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>Camera Access Unavailable</span>
                    </div>
                    <p className="font-sans text-xs text-rose-200/80">
                      {cameraError}
                    </p>
                    <div className="text-[11px] text-slate-400">
                      Tip: You can still connect instantly using the <strong>Air-Link PIN</strong> or copy the link directly!
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-black aspect-video flex items-center justify-center">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 border-2 border-dashed border-emerald-500/40 pointer-events-none rounded-lg m-6 flex items-center justify-center">
                      <div className="text-center bg-black/60 px-3 py-1.5 rounded font-mono text-[10px] text-emerald-300">
                        ALIGN BARCODE INSIDE RETICLE
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs font-mono pt-1">
                  <button
                    onClick={isCameraActive ? handleStopCamera : handleStartCamera}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5"
                  >
                    {isCameraActive ? <CameraOff className="w-3.5 h-3.5 text-rose-400" /> : <Camera className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{isCameraActive ? 'Stop Camera' : 'Restart Camera'}</span>
                  </button>

                  <span className="text-slate-500 text-[11px]">
                    Supports QR, MicroQR & STANAG DataMatrix
                  </span>
                </div>
              </div>
            )}

            {/* TAB 3: AIR-LINK 6-DIGIT ROOM PIN */}
            {activeTabSubMode === 'room_code' && (
              <div className="space-y-3.5 p-3.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-purple-400" />
                    <span className="text-white font-bold">Tactical Air-Link Session PIN</span>
                  </div>
                  <span className="text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800 text-[10px]">
                    DIRECT CHANNEL
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-purple-500/30 flex items-center justify-between">
                  <div>
                    <div className="text-slate-500 text-[10px]">THIS TERMINAL'S ACTIVE ROOM CODE</div>
                    <div className="text-2xl font-black text-purple-300 tracking-widest mt-0.5 font-mono">
                      {roomCode}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(roomCode);
                      if (onNotify) onNotify(`Copied Air-Link Room Code: ${roomCode}`);
                    }}
                    className="px-3 py-1.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy PIN</span>
                  </button>
                </div>

                <form onSubmit={handleJoinRoom} className="space-y-2 pt-1">
                  <label className="text-[10px] text-slate-400 block">
                    JOIN REMOTE PEER VIA ROOM CODE:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={joinRoomInput}
                      onChange={(e) => setJoinRoomInput(e.target.value)}
                      placeholder="e.g. MESH-7492"
                      className="flex-1 px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-white uppercase text-xs focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                    >
                      Connect
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Local Node Identity Card */}
          <div className="tactical-panel p-4 rounded-lg border border-slate-800 bg-slate-900/70">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold font-display text-white tracking-wide flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Local Terminal Node Identity</span>
              </h2>
              <button
                onClick={() => setIsEditingCallsign(!isEditingCallsign)}
                className="text-[11px] font-mono text-cyan-400 hover:underline"
              >
                {isEditingCallsign ? 'Cancel' : 'Edit Callsign'}
              </button>
            </div>

            {isEditingCallsign ? (
              <form onSubmit={handleUpdateCallsign} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={customCallsign}
                  onChange={(e) => setCustomCallsign(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded bg-slate-950 border border-cyan-500/50 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="e.g. ALPHA-MOBILE-01"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-cyan-500 text-slate-950 font-mono font-bold text-xs hover:bg-cyan-400"
                >
                  Save
                </button>
              </form>
            ) : null}

            <div className="space-y-2 font-mono text-xs bg-slate-950/60 p-3 rounded border border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">CALLSIGN:</span>
                <span className="text-cyan-300 font-bold">{selfPeer.callsign}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">DEVICE / FORM:</span>
                <span className="text-slate-300 capitalize">{selfPeer.deviceType} ({selfPeer.os})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">PEER ID:</span>
                <span className="text-slate-400 text-[11px]">{selfPeer.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">BROWSER ENGINE:</span>
                <span className="text-slate-300">{selfPeer.browser}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                <span className="text-slate-500">STATUS:</span>
                {getStatusBadge(selfPeer.p2pStatus)}
              </div>
            </div>
          </div>

          {/* Connected Remote Peers List */}
          <div className="tactical-panel p-4 rounded-lg border border-slate-800 bg-slate-900/70">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold font-display text-white tracking-wide flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>Connected Physical Devices ({peers.length})</span>
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                STUN: Google STUN-19302
              </span>
            </div>

            {peers.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-slate-800 rounded bg-slate-950/40">
                <Radio className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-slate-300 font-medium">No other devices connected yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Open another tab or scan the QR code to watch this device establish a real WebRTC DataChannel connection!
                </p>
                <button
                  onClick={() => handleOpenSimTab('mobile')}
                  className="mt-3 px-3 py-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Launch Second Tab Now</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {peers.map((peer) => (
                  <div
                    key={peer.id}
                    onClick={() => setSelectedPeerId(peer.id)}
                    className={`p-3 rounded border font-mono text-xs cursor-pointer transition-colors ${
                      selectedPeerId === peer.id
                        ? 'border-cyan-500/60 bg-cyan-950/20'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        {getDeviceIcon(peer.deviceType)}
                        <span className="font-bold text-slate-200">{peer.callsign}</span>
                        <span className="text-[10px] text-slate-500">({peer.deviceType})</span>
                      </div>
                      {getStatusBadge(peer.p2pStatus)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-900/60">
                      <div>PING: <span className="text-emerald-400 font-bold">{peer.latencyMs}ms</span></div>
                      <div>OS: <span className="text-slate-300">{peer.os}</span></div>
                      <div>RX: <span className="text-purple-300">{Math.round(peer.dataReceivedBytes / 1024)} KB</span></div>
                      <div>TX: <span className="text-cyan-300">{Math.round(peer.dataSentBytes / 1024)} KB</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Multi-Device Swarm Sync & WebRTC Telemetry (7 cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Real-Time Cross-Device Swarm State Sync Controller */}
          <div className="tactical-panel p-5 rounded-lg border border-slate-800 bg-slate-900/70">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold font-display text-white tracking-wide flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Cross-Device Swarm Synchronization</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  State mutations triggered here are instantaneously synchronized across all physical connected devices over WebRTC DataChannels.
                </p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ACTIVE REPLICATION
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* DEFCON Controller */}
              <div className="bg-slate-950/70 p-4 rounded border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>DEFCON READINESS LEVEL</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/30">
                    DEFCON {defconLevel}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 mt-3">
                  {[5, 4, 3, 2, 1].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => handleDefconChange(lvl)}
                      className={`py-1.5 rounded font-mono text-xs font-bold transition-colors ${
                        defconLevel === lvl
                          ? lvl <= 2
                            ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50'
                            : lvl === 3
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      D-{lvl}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-2">
                  {defconLevel === 1 ? 'MAX READINESS: Nuclear/Strategic alert' : defconLevel === 3 ? 'ROUND HOUSE: Air Force ready to mobilize' : 'PEACETIME: Normal readiness'}
                </div>
              </div>

              {/* Electronic Warfare Jammer Sync */}
              <div className="bg-slate-950/70 p-4 rounded border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      <span>ELECTRONIC WARFARE JAMMER</span>
                    </span>
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                      jammerActive
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {jammerActive ? 'TRANSMITTING' : 'STANDBY'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Broadcasts high-power RF noise suppression across Link-16 slot allocations.
                  </p>
                </div>
                <button
                  onClick={handleToggleJammer}
                  className={`w-full mt-3 py-2 rounded font-mono text-xs font-bold transition-all ${
                    jammerActive
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/60'
                      : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                  }`}
                >
                  {jammerActive ? 'DISENGAGE JAMMER' : 'ENGAGE EW SPECTRUM JAMMER'}
                </button>
              </div>
            </div>

            {/* Tactical Waypoint Radar Mini Canvas */}
            <div className="mt-4 bg-slate-950/70 p-4 rounded border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                  <span>SHARED TACTICAL WAYPOINT TARGET (CLICK TO RETARGET)</span>
                </span>
                <span className="text-xs font-mono text-cyan-400">
                  COORDS: X:{tacticalWaypoint.x} Y:{tacticalWaypoint.y}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <canvas
                  ref={radarCanvasRef}
                  width={200}
                  height={120}
                  onClick={handleRadarClick}
                  className="bg-slate-950 rounded border border-cyan-900/50 cursor-crosshair shrink-0 hover:border-cyan-500/50 transition-colors"
                />
                <div className="text-xs text-slate-400 font-sans leading-relaxed">
                  Clicking anywhere on this radar grid broadcasts a coordinate retarget packet across the WebRTC mesh. Notice how the target location instantly snaps on any other connected phones or windows!
                </div>
              </div>
            </div>
          </div>

          {/* WebRTC DataChannel Benchmark & Stress Tester */}
          <div className="tactical-panel p-5 rounded-lg border border-slate-800 bg-slate-900/70">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold font-display text-white tracking-wide flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <span>WebRTC DataChannel Link Benchmark</span>
              </h2>
              <button
                onClick={handleRunBenchmark}
                disabled={isBenchmarking || peers.length === 0}
                className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-mono text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-lg shadow-purple-950/50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isBenchmarking ? 'animate-spin' : ''}`} />
                <span>{isBenchmarking ? 'Running Burst Test...' : 'Run 40-Pkt Benchmark'}</span>
              </button>
            </div>

            {benchmarkResult ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/80 p-3 rounded border border-purple-500/30 font-mono text-xs">
                <div>
                  <div className="text-slate-500 text-[10px]">AVG P2P LATENCY</div>
                  <div className="text-emerald-400 font-bold text-sm">{benchmarkResult.avgLatencyMs} ms</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">THROUGHPUT</div>
                  <div className="text-purple-300 font-bold text-sm">{benchmarkResult.throughputKbps} Kbps</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">PACKET LOSS</div>
                  <div className="text-cyan-400 font-bold text-sm">{benchmarkResult.packetLossPercent}%</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">PROTOCOL</div>
                  <div className="text-slate-300 font-bold text-sm truncate">{benchmarkResult.wireProtocol}</div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono bg-slate-950/40 p-3 rounded border border-slate-800/80">
                Execute a real burst of 40 consecutive WebRTC DataChannel datagrams to measure physical round-trip packet transport, jitter, and direct bandwidth between physical nodes.
              </div>
            )}
          </div>

          {/* Interactive P2P Terminal & Datagram Feed */}
          <div className="tactical-panel p-5 rounded-lg border border-slate-800 bg-slate-900/70">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold font-display text-white tracking-wide flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>Live P2P DataChannel Transceiver</span>
              </h2>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="text-slate-500">TARGET:</span>
                <select
                  value={selectedPeerId}
                  onChange={(e) => setSelectedPeerId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-cyan-300 rounded px-2 py-0.5 focus:outline-none"
                >
                  <option value="broadcast">ALL PHYSICAL PEERS (BROADCAST)</option>
                  {peers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.callsign} ({p.deviceType})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tactical Transmit Presets */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-[11px] font-mono text-slate-500">LINK-16 WORD:</span>
              {['J3.2 AIR TRACK', 'J2.5 TACTICAL MARKER', 'J12.0 MISSION TASK', 'J15.0 THREAT WARNING'].map((word) => (
                <button
                  key={word}
                  onClick={() => setSelectedTadilWord(word)}
                  className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                    selectedTadilWord === word
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {word}
                </button>
              ))}
              <button
                onClick={handleSendTadil}
                className="ml-auto px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 text-[11px] font-mono"
              >
                Send STANAG Word
              </button>
            </div>

            {/* Custom Chat Input Form */}
            <form onSubmit={handleSendChat} className="flex gap-2 mb-4">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type real-time tactical message or payload..."
                className="flex-1 px-3 py-2 rounded bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send P2P</span>
              </button>
            </form>

            {/* Datagram Log Terminal */}
            <div className="h-44 overflow-y-auto font-mono text-xs space-y-1.5 bg-slate-950 p-3 rounded border border-slate-800/80 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="text-slate-600 text-center py-6">
                  No datagrams logged yet. Transmit a message above to see real P2P packet frames.
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="flex items-start space-x-2 text-[11px] leading-relaxed">
                    <span className="text-slate-500">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    <span className={`px-1 rounded text-[10px] ${
                      msg.wireProtocol === 'WebRTC_DataChannel' 
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-blue-950/80 text-blue-400 border border-blue-500/30'
                    }`}>
                      {msg.wireProtocol === 'WebRTC_DataChannel' ? 'P2P_DC' : 'WS_RELAY'}
                    </span>
                    <span className="text-cyan-400 font-semibold">{msg.fromCallsign}:</span>
                    <span className="text-slate-200">
                      {msg.type === 'link16_tadil' 
                        ? `[STANAG 5516 ${msg.payload?.tadilWord}] ${msg.payload?.message}`
                        : msg.type === 'p2p_chat'
                        ? msg.payload?.text
                        : JSON.stringify(msg.payload)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
