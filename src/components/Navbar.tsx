import React, { useState, useEffect } from 'react';
import { NetworkMetrics, ChaosSettings } from '../types';
import { 
  Network, 
  ShieldCheck, 
  Activity, 
  Share2, 
  Cpu, 
  Terminal, 
  Flame, 
  Plus, 
  CheckCircle2, 
  AlertTriangle,
  Crown,
  Zap,
  Radar,
  ShieldAlert,
  Volume2,
  VolumeX,
  Eye,
  Lock,
  Radio,
  Clock,
  Castle,
  Shield,
  Home as HomeIcon,
  Boxes,
  FileText,
  Plane,
  Bug,
  Bot,
  Antenna,
  Bluetooth
} from 'lucide-react';
import { FirebaseAuthBar } from './FirebaseAuthBar';
import { PWAInstallButton } from './PWAInstallButton';

export type ActiveTab = 'home' | 'ai_intel' | 'agent_overlay' | 'topology' | 'self_healing' | 'studio' | 'radar' | 'c4isr' | 'drones' | 'swarm_engine' | 'p2p_mesh' | 'meshtastic_ble' | 'mavlink_stanag' | 'atak_cot' | 'sdr_hardware' | 'electronic_warfare' | 'auto_debug' | 'dashboard' | 'sharing' | 'tasks' | 'inspector' | 'chaos' | 'citadel' | 'logs';
export type TabCategory = 'all' | 'tactical' | 'fabric' | 'resilience';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenCitadel?: () => void;
  metrics: NetworkMetrics;
  chaosSettings: ChaosSettings;
  onOpenNewNodeModal: () => void;
  onQuickHeal: () => void;
  opticsMode?: 'standard' | 'nvg' | 'amber';
  onToggleOptics?: (mode: 'standard' | 'nvg' | 'amber') => void;
  audioEnabled?: boolean;
  onToggleAudio?: () => void;
  onOpenSecurityWipe?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenCitadel,
  metrics,
  chaosSettings,
  onOpenNewNodeModal,
  onQuickHeal,
  opticsMode = 'standard',
  onToggleOptics,
  audioEnabled = true,
  onToggleAudio,
  onOpenSecurityWipe,
}) => {
  const [zuluTime, setZuluTime] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<TabCategory>('all');
  const [classification, setClassification] = useState<'TOP SECRET // SI-GAMMA // NOFORN' | 'SECRET // REL TO USA, FVEY' | 'UNCLASSIFIED // DEMO'>(
    'TOP SECRET // SI-GAMMA // NOFORN'
  );

  // Live Zulu UTC Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const zulu = now.toISOString().substring(11, 19) + ' Z';
      setZuluTime(zulu);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const isChaosActive = 
    chaosSettings.severedLinks.length > 0 || 
    chaosSettings.isolatedNodes.length > 0 || 
    chaosSettings.packetLossEnabled || 
    chaosSettings.highLatencySimulation;

  // Tab definitions with category mapping
  const tabDefinitions: {
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    category: 'tactical' | 'fabric' | 'resilience';
    badge?: string;
    colorClass: string;
  }[] = [
    // Home & Primary Entry
    {
      id: 'home',
      label: '4D Geometric Home',
      icon: <Boxes className="w-3.5 h-3.5 text-indigo-400" />,
      category: 'tactical',
      badge: '4D-HEX',
      colorClass: 'bg-indigo-950/80 text-indigo-200 border-indigo-700/60'
    },
    {
      id: 'ai_intel',
      label: 'Gemini AI Intel Hub',
      icon: <Bot className="w-3.5 h-3.5 text-indigo-300" />,
      category: 'tactical',
      badge: 'VOICE+MAPS',
      colorClass: 'bg-gradient-to-r from-indigo-950/90 to-purple-950/90 text-indigo-100 border-indigo-500/70'
    },
    {
      id: 'agent_overlay',
      label: 'P2P Agent Overlay',
      icon: <Cpu className="w-3.5 h-3.5 text-emerald-400" />,
      category: 'tactical',
      badge: 'Ed25519-P2P',
      colorClass: 'bg-gradient-to-r from-emerald-950/90 to-teal-950/90 text-emerald-100 border-emerald-500/70'
    },

    // Tactical & C4ISR Domain
    {
      id: 'c4isr',
      label: 'C4ISR War Room',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />,
      category: 'tactical',
      badge: 'DEFCON',
      colorClass: 'bg-rose-950/80 text-rose-200 border-rose-700/60'
    },
    {
      id: 'drones',
      label: 'UAV Swarm & Recon',
      icon: <Plane className="w-3.5 h-3.5 text-cyan-400" />,
      category: 'tactical',
      badge: 'AIR-LINK',
      colorClass: 'bg-cyan-950/80 text-cyan-200 border-cyan-700/60'
    },
    {
      id: 'radar',
      label: 'Tactical Radar',
      icon: <Radar className="w-3.5 h-3.5 text-emerald-400" />,
      category: 'tactical',
      badge: 'BFT-16',
      colorClass: 'bg-emerald-950/80 text-emerald-200 border-emerald-700/60'
    },
    {
      id: 'studio',
      label: 'Directive Studio',
      icon: <Crown className="w-3.5 h-3.5 text-amber-400" />,
      category: 'tactical',
      badge: 'ROEs',
      colorClass: 'bg-amber-950/80 text-amber-200 border-amber-700/60'
    },
    {
      id: 'swarm_engine',
      label: 'Edge Swarm Engine',
      icon: <Zap className="w-3.5 h-3.5 text-cyan-400" />,
      category: 'tactical',
      badge: 'PoW',
      colorClass: 'bg-cyan-950/80 text-cyan-200 border-cyan-700/60'
    },
    {
      id: 'p2p_mesh',
      label: 'P2P Multi-Device Sync',
      icon: <Radio className="w-3.5 h-3.5 text-cyan-400" />,
      category: 'tactical',
      badge: 'WEBRTC',
      colorClass: 'bg-cyan-950/80 text-cyan-200 border-cyan-700/60'
    },
    {
      id: 'meshtastic_ble',
      label: 'Meshtastic BLE',
      icon: <Bluetooth className="w-3.5 h-3.5 text-indigo-400" />,
      category: 'tactical',
      badge: 'TRACK 3',
      colorClass: 'bg-gradient-to-r from-indigo-950/90 to-slate-950 text-indigo-100 border-indigo-500/70'
    },
    {
      id: 'mavlink_stanag',
      label: 'STANAG / MAVLink GCS',
      icon: <Plane className="w-3.5 h-3.5 text-cyan-400" />,
      category: 'tactical',
      badge: 'AUTOPILOT',
      colorClass: 'bg-gradient-to-r from-cyan-950/90 to-slate-950 text-cyan-100 border-cyan-500/70'
    },
    {
      id: 'atak_cot',
      label: 'ATAK / CoT Gateway',
      icon: <Share2 className="w-3.5 h-3.5 text-emerald-400" />,
      category: 'tactical',
      badge: 'TAK/XML',
      colorClass: 'bg-gradient-to-r from-emerald-950/90 to-slate-950 text-emerald-100 border-emerald-500/70'
    },
    {
      id: 'sdr_hardware',
      label: 'SDR & Waterfall Bridge',
      icon: <Antenna className="w-3.5 h-3.5 text-cyan-300" />,
      category: 'tactical',
      badge: 'WEBUSB',
      colorClass: 'bg-gradient-to-r from-cyan-950/90 to-blue-950/90 text-cyan-100 border-cyan-500/70'
    },
    {
      id: 'electronic_warfare',
      label: 'EW & TDoA Geolocation',
      icon: <Radar className="w-3.5 h-3.5 text-purple-400" />,
      category: 'tactical',
      badge: 'SIGINT',
      colorClass: 'bg-gradient-to-r from-purple-950/90 to-slate-950 text-purple-200 border-purple-700/60'
    },

    // Fabric Core Network Domain
    {
      id: 'self_healing',
      label: 'Dynamic Route Healer',
      icon: <Network className="w-3.5 h-3.5 text-cyan-400" />,
      category: 'fabric',
      badge: 'DIJKSTRA',
      colorClass: 'bg-gradient-to-r from-cyan-950/90 to-slate-950 text-cyan-200 border-cyan-700/60'
    },
    {
      id: 'topology',
      label: 'Fabric Topology',
      icon: <Network className="w-3.5 h-3.5 text-sky-400" />,
      category: 'fabric',
      colorClass: 'bg-slate-800 text-sky-200 border-slate-700'
    },
    {
      id: 'dashboard',
      label: 'Health & Telemetry',
      icon: <Activity className="w-3.5 h-3.5 text-emerald-400" />,
      category: 'fabric',
      colorClass: 'bg-slate-800 text-slate-100 border-slate-700'
    },
    {
      id: 'sharing',
      label: 'Encrypted Data Share',
      icon: <Share2 className="w-3.5 h-3.5 text-indigo-400" />,
      category: 'fabric',
      colorClass: 'bg-slate-800 text-indigo-200 border-slate-700'
    },
    {
      id: 'tasks',
      label: 'Agent Tasks',
      icon: <Cpu className="w-3.5 h-3.5 text-violet-400" />,
      category: 'fabric',
      colorClass: 'bg-slate-800 text-violet-200 border-slate-700'
    },
    {
      id: 'inspector',
      label: 'Frame Sniffer',
      icon: <Terminal className="w-3.5 h-3.5 text-slate-300" />,
      category: 'fabric',
      colorClass: 'bg-slate-800 text-slate-100 border-slate-700'
    },

    // Resilience & Chaos Domain
    {
      id: 'auto_debug',
      label: 'Auto Debug & Trace',
      icon: <Bug className="w-3.5 h-3.5 text-amber-400" />,
      category: 'resilience',
      badge: 'SELF-HEAL',
      colorClass: 'bg-amber-950/80 text-amber-200 border-amber-700/60'
    },
    {
      id: 'chaos',
      label: 'Resilience Sandbox',
      icon: <Flame className="w-3.5 h-3.5 text-rose-400" />,
      category: 'resilience',
      badge: isChaosActive ? 'ACTIVE' : undefined,
      colorClass: 'bg-rose-950/80 text-rose-200 border-rose-700/60'
    },

    // Citadel Sovereign Enclave (White Background Page)
    {
      id: 'citadel',
      label: 'The Citadel',
      icon: <Castle className="w-3.5 h-3.5 text-indigo-400" />,
      category: 'tactical',
      badge: 'VAULTS/BANK/INTEL',
      colorClass: 'bg-white text-slate-900 border-slate-300 font-bold'
    },

    // Cryptographic System Logs
    {
      id: 'logs',
      label: 'Audit Logs',
      icon: <FileText className="w-3.5 h-3.5 text-amber-400" />,
      category: 'tactical',
      badge: 'SHA-256',
      colorClass: 'bg-amber-950/80 text-amber-200 border-amber-700/60'
    }
  ];

  const totalCount = tabDefinitions.length;
  const tacticalCount = tabDefinitions.filter(t => t.category === 'tactical').length;
  const fabricCount = tabDefinitions.filter(t => t.category === 'fabric').length;
  const resilienceCount = tabDefinitions.filter(t => t.category === 'resilience').length;

  const filteredTabs = tabDefinitions.filter(tab => 
    selectedCategory === 'all' || tab.category === selectedCategory || tab.id === activeTab
  );

  return (
    <header id="fabric-header" className="bg-slate-950/95 backdrop-blur-md text-slate-100 border-b border-slate-800/90 sticky top-0 z-40 shadow-xl font-sans">
      {/* Top Defense Telemetry & OPSEC Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 text-xs font-mono">
        <div className="flex items-center space-x-3">
          {/* Classification Stencil Badge */}
          <button
            onClick={() => {
              setClassification(prev => 
                prev.startsWith('TOP') 
                  ? 'SECRET // REL TO USA, FVEY' 
                  : prev.startsWith('SECRET') 
                  ? 'UNCLASSIFIED // DEMO' 
                  : 'TOP SECRET // SI-GAMMA // NOFORN'
              );
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border transition-colors cursor-pointer select-none ${
              classification.startsWith('TOP') 
                ? 'bg-amber-950/90 text-amber-300 border-amber-600' 
                : classification.startsWith('SECRET') 
                ? 'bg-rose-950/90 text-rose-300 border-rose-600' 
                : 'bg-emerald-950/90 text-emerald-300 border-emerald-600'
            }`}
            title="Click to cycle simulated OPSEC Security Classification"
          >
            {classification}
          </button>

          <span className="text-slate-700">|</span>

          {/* Zulu Time */}
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-slate-200 tracking-wider">{zuluTime || 'UTC ZULU'}</span>
          </div>

          <span className="text-slate-700 hidden sm:inline">|</span>

          {/* STANAG / Link-16 Net Sync */}
          <div className="hidden sm:flex items-center space-x-1.5 text-slate-400">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>STANAG 5516 LINK-16 (NET 127)</span>
          </div>

          <span className="text-slate-700 hidden md:inline">|</span>

          {/* Cryptographic Standard */}
          <div className="hidden md:flex items-center space-x-1.5 text-slate-400">
            <Lock className="w-3 h-3 text-cyan-400" />
            <span>AES-256-GCM / ECDH-P256</span>
          </div>
        </div>

        {/* Live Network Health Metrics & Controls */}
        <div className="flex items-center space-x-3.5">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">Nodes:</span>
            <span className="font-bold text-emerald-400">{metrics.onlineNodes}/{metrics.totalNodes}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">Links:</span>
            <span className="font-bold text-emerald-400">{metrics.activeLinks}/{metrics.totalLinks}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">Latency:</span>
            <span className="font-bold text-cyan-400">{metrics.avgLatencyMs}ms</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">Health:</span>
            <span className={`font-bold ${
              metrics.meshHealthScore > 90 ? 'text-emerald-400' : 'text-amber-400'
            }`}>{metrics.meshHealthScore}%</span>
          </div>

          {/* Audio Master Toggle */}
          {onToggleAudio && (
            <button
              onClick={onToggleAudio}
              className={`p-1 rounded border transition-colors cursor-pointer ${
                audioEnabled 
                  ? 'bg-slate-800 border-slate-700 text-cyan-300 hover:text-cyan-200' 
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
              }`}
              title={audioEnabled ? 'Master Squelch & Acoustic SFX: ENABLED' : 'Master Squelch & Acoustic SFX: MUTED'}
            >
              {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Optics Mode Selector */}
          {onToggleOptics && (
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5 text-[10px]">
              {(['standard', 'nvg', 'amber'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => onToggleOptics(mode)}
                  className={`px-1.5 py-0.5 rounded uppercase font-bold transition-colors cursor-pointer ${
                    opticsMode === mode
                      ? mode === 'nvg'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : mode === 'amber'
                        ? 'bg-amber-950 text-amber-300 border border-amber-700'
                        : 'bg-slate-800 text-slate-200 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                  title={`Switch Console Optics: ${mode.toUpperCase()}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          )}

          {isChaosActive && (
            <button
              id="quick-heal-btn"
              onClick={onQuickHeal}
              className="flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors cursor-pointer animate-pulse"
              title="Chaos faults active. Click to restore all links and nodes."
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>Restore Fabric</span>
            </button>
          )}

          {/* Security Wipe Button */}
          {onOpenSecurityWipe && (
            <button
              id="btn-navbar-security-wipe"
              onClick={onOpenSecurityWipe}
              className="flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-700/60 hover:bg-rose-900 hover:text-rose-100 transition-colors cursor-pointer text-[10px] font-mono font-bold"
              title="Emergency Security Wipe: Zeroize Cryptographic Keys & Reset Mesh Fabric"
            >
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              <span>Security Wipe</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-800/80 text-cyan-400 shadow-inner">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2 font-tactical">
              <span>Mesh Link Connection Fabric</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700 font-mono font-normal">
                C4ISR // MESH-NET
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Military-grade encrypted agent mesh & electronic warfare battle management
            </p>
          </div>
        </div>

        {/* Domain Category Filter Pills */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-mono">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-slate-800 text-slate-100 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Views ({totalCount})
          </button>
          <button
            onClick={() => setSelectedCategory('tactical')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'tactical'
                ? 'bg-rose-950 text-rose-200 border border-rose-800/80 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            <span>Tactical & C4ISR ({tacticalCount})</span>
          </button>
          <button
            onClick={() => setSelectedCategory('fabric')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'fabric'
                ? 'bg-sky-950 text-sky-200 border border-sky-800/80 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-3 h-3 text-sky-400" />
            <span>Fabric Network ({fabricCount})</span>
          </button>
          <button
            onClick={() => setSelectedCategory('resilience')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'resilience'
                ? 'bg-amber-950 text-amber-200 border border-amber-800/80 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3 h-3 text-amber-400" />
            <span>Resilience ({resilienceCount})</span>
          </button>
        </div>

        {/* Action Button */}
        <div className="flex items-center space-x-2.5">
          {/* Firebase Authentication Bar */}
          <FirebaseAuthBar />

          {/* Home Button */}
          <button
            id="btn-navbar-home"
            onClick={() => onTabChange('home')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-tactical tracking-wide shadow-md ${
              activeTab === 'home'
                ? 'bg-indigo-600 text-white shadow-indigo-900 border border-indigo-400'
                : 'bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60'
            }`}
            title="Go to 4D Geometric Homepage"
          >
            <HomeIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Home</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-900/90 text-indigo-300 font-mono font-bold">
              4D
            </span>
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* The Citadel Entrance Button */}
          <button
            id="btn-citadel-entrance"
            onClick={() => {
              if (onOpenCitadel) {
                onOpenCitadel();
              } else {
                onTabChange('citadel');
              }
            }}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-md shadow-white/10 border border-slate-300 transition-all cursor-pointer font-tactical tracking-wide group"
            title="Open The Citadel Sovereign Enclave (Vaults, Bank, Intelligence)"
          >
            <Castle className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span className="text-slate-900">Citadel Entrance</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-mono font-bold">
              WHITE BG
            </span>
          </button>

          <button
            id="btn-add-agent"
            onClick={onOpenNewNodeModal}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-950 transition-all cursor-pointer font-tactical tracking-wide"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Deploy Agent Node</span>
          </button>
        </div>
      </div>

      {/* Primary Tab Navigation Ribbon */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3">
        <nav id="view-tabs" className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none text-xs">
          {filteredTabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer select-none border ${
                  isActive
                    ? `${tab.colorClass} shadow-md`
                    : 'bg-slate-900/80 border-slate-800/90 text-slate-400 hover:text-slate-200 hover:bg-slate-850 hover:border-slate-700'
                }`}
              >
                {tab.icon}
                <span className="font-tactical tracking-wide">{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase ${
                    isActive ? 'bg-black/30 border border-white/20' : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
