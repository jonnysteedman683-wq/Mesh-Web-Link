import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bluetooth, 
  Radio, 
  Battery, 
  Send, 
  RefreshCw, 
  Cpu, 
  ShieldCheck, 
  MapPin, 
  Wifi, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  Search,
  Signal,
  Activity,
  Compass,
  SlidersHorizontal,
  Layers,
  StopCircle,
  Play,
  Waves,
  Settings2,
  Key,
  Shield,
  Map,
  Route,
  Hash,
  Share2
} from 'lucide-react';
import { meshtasticBleService } from '../services/meshtasticBleService';
import { MeshtasticBleState, MeshtasticBleNode, DiscoveredBleRadioNode } from '../types';
import { tactileAudio } from '../services/tactileAudio';
import { MeshtasticSpectrumWaterfall } from './MeshtasticSpectrumWaterfall';
import { MeshtasticChannelAdminModal } from './MeshtasticChannelAdminModal';
import { MeshtasticTacticalMapView } from './MeshtasticTacticalMapView';
import { MeshCloudSyncPanel } from './MeshCloudSyncPanel';
import { meshCloudSyncService } from '../services/meshCloudSyncService';

interface MeshtasticBleViewProps {
  onNotify?: (msg: string) => void;
}

export const MeshtasticBleView: React.FC<MeshtasticBleViewProps> = ({ onNotify }) => {
  const [bleState, setBleState] = useState<MeshtasticBleState>(meshtasticBleService.getState());
  const [inputText, setInputText] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<MeshtasticBleNode | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Discovery Filter and Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'MESHTASTIC' | 'STRONG'>('ALL');
  const [selectedDiscoveredRadio, setSelectedDiscoveredRadio] = useState<DiscoveredBleRadioNode | null>(null);
  const [showSpectrumWaterfall, setShowSpectrumWaterfall] = useState<boolean>(true);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [adminTargetNode, setAdminTargetNode] = useState<MeshtasticBleNode | null>(null);
  const [mainViewTab, setMainViewTab] = useState<'MAP' | 'DIRECTORY'>('MAP');
  const [activeChatChannel, setActiveChatChannel] = useState<number>(0);

  useEffect(() => {
    const unsub = meshtasticBleService.subscribe(() => {
      setBleState(meshtasticBleService.getState());
    });
    return () => unsub();
  }, []);

  const handleStartScan = async (mode: 'PROXIMITY_SWEEP' | 'PHYSICAL_PICKER' = 'PROXIMITY_SWEEP') => {
    tactileAudio.playClick();
    setErrorMsg(null);
    try {
      await meshtasticBleService.startBleDiscovery(mode);
      if (onNotify) {
        onNotify(mode === 'PHYSICAL_PICKER' 
          ? 'Opening browser WebBluetooth device selector...' 
          : 'Started continuous WebBluetooth RF discovery sweep.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'WebBluetooth scan error');
      if (onNotify) onNotify('WebBluetooth scanning failed: ' + err.message);
    }
  };

  const handleStopScan = () => {
    tactileAudio.playClick();
    meshtasticBleService.stopBleDiscovery();
    if (onNotify) onNotify('Stopped WebBluetooth RF discovery scan.');
  };

  const handleConnectDiscovered = async (radio: DiscoveredBleRadioNode) => {
    tactileAudio.playNodeConnect();
    setErrorMsg(null);
    try {
      await meshtasticBleService.connectToDiscoveredRadio(radio);
      if (onNotify) onNotify(`Connected to ${radio.name} (${radio.hwModel.replace('_', ' ')})!`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to connect to discovered radio.');
      if (onNotify) onNotify('Failed to connect to radio.');
    }
  };

  const handleClearDiscovered = () => {
    tactileAudio.playClick();
    meshtasticBleService.clearDiscoveredRadios();
    if (onNotify) onNotify('Cleared discovered BLE radios list.');
  };

  const handleConnectBle = async () => {
    tactileAudio.playClick();
    setErrorMsg(null);
    try {
      await meshtasticBleService.connectPhysicalBle();
      if (onNotify) onNotify('WebBluetooth connected to physical Meshtastic radio.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to connect via WebBluetooth. Try Simulated Radio or check Bluetooth permissions.');
      if (onNotify) onNotify('WebBluetooth connection failed or cancelled.');
    }
  };

  const handleConnectSimulated = () => {
    tactileAudio.playClick();
    setErrorMsg(null);
    meshtasticBleService.connectSimulated();
    if (onNotify) onNotify('Activated simulated Meshtastic BLE radio environment.');
  };

  const handleDisconnect = () => {
    tactileAudio.playClick();
    meshtasticBleService.disconnect();
    if (onNotify) onNotify('Disconnected Meshtastic BLE link.');
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    tactileAudio.playClick(1000);
    setIsSending(true);
    const targetNodeNum = selectedNode ? selectedNode.num : 0xffffffff;

    try {
      await meshtasticBleService.sendMessage(inputText.trim(), targetNodeNum, activeChatChannel);
      const sentMsg = meshtasticBleService.getState().messages.slice(-1)[0];
      if (sentMsg) {
        meshCloudSyncService.broadcastMessage(sentMsg).catch(() => {});
      }
      setInputText('');
      if (onNotify) {
        onNotify(targetNodeNum === 0xffffffff 
          ? 'Broadcasted message over Meshtastic LoRa channel.' 
          : `Sent direct message to ${selectedNode?.user.longName}`);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handlePing = (nodeNum: number) => {
    tactileAudio.playPing();
    meshtasticBleService.pingNode(nodeNum);
    if (onNotify) onNotify('Dispatched telemetry ping packet across mesh.');
  };

  // Filter and search discovered BLE radios
  const filteredRadios = useMemo(() => {
    return bleState.discoveredBleRadios.filter(radio => {
      // Filter tab
      if (filterMode === 'MESHTASTIC' && !radio.name.toLowerCase().includes('mesh') && !radio.name.toLowerCase().includes('beam') && !radio.name.toLowerCase().includes('heltec') && !radio.name.toLowerCase().includes('rak')) {
        return false;
      }
      if (filterMode === 'STRONG' && radio.rssi < -75) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          radio.name.toLowerCase().includes(q) ||
          radio.macAddress.toLowerCase().includes(q) ||
          radio.hwModel.toLowerCase().includes(q) ||
          radio.nodeNumHex.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => b.rssi - a.rssi);
  }, [bleState.discoveredBleRadios, filterMode, searchQuery]);

  // Helper for rendering signal strength meter bars
  const renderSignalBars = (bars: number, rssi: number) => {
    let activeColor = 'bg-emerald-400';
    let textColor = 'text-emerald-400';
    if (rssi < -88) {
      activeColor = 'bg-rose-500';
      textColor = 'text-rose-400';
    } else if (rssi < -78) {
      activeColor = 'bg-amber-400';
      textColor = 'text-amber-400';
    } else if (rssi < -68) {
      activeColor = 'bg-cyan-400';
      textColor = 'text-cyan-400';
    }

    return (
      <div className="flex items-end gap-0.5 h-4" title={`Signal: ${bars}/5 bars (${rssi} dBm)`}>
        {[1, 2, 3, 4, 5].map(step => {
          const isActive = bars >= step;
          const heightClass = 
            step === 1 ? 'h-1.5' :
            step === 2 ? 'h-2' :
            step === 3 ? 'h-2.5' :
            step === 4 ? 'h-3' : 'h-4';

          return (
            <div
              key={step}
              className={`w-1 rounded-xs transition-all ${
                isActive ? activeColor : 'bg-slate-800'
              } ${heightClass}`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bluetooth className="w-5 h-5 text-indigo-400 animate-pulse" />
            <span>WebBluetooth (BLE) Meshtastic Protocol Bridge</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700">
              LoRa 915 MHz
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Direct browser-to-hardware BLE GATT bridge for LilyGO T-Beam, Heltec V3, and RAK4631 transceivers.
          </p>
        </div>

        {/* Status / Connect Action Controls */}
        <div className="flex items-center gap-2">
          {bleState.isConnected ? (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-bold">{bleState.deviceName}</span>
                <span className="text-[10px] text-emerald-400">({bleState.deviceVoltage.toFixed(2)}V • {bleState.deviceBattery}%)</span>
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
              <button
                onClick={handleConnectBle}
                disabled={bleState.isConnecting}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                <Bluetooth className="w-3.5 h-3.5" />
                <span>{bleState.isConnecting ? 'Pairing BLE...' : 'Pair WebBluetooth'}</span>
              </button>

              <button
                onClick={handleConnectSimulated}
                className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 text-indigo-400" />
                <span>Virtual T-Beam</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Banner if any */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FEATURE: WebBluetooth Nearby Node Discovery & Signal Strength Scanner */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-950 to-slate-950 border border-indigo-800/60 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-900/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              bleState.isBleScanning 
                ? 'bg-indigo-900/60 border-indigo-500 text-indigo-300 animate-pulse' 
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}>
              <Signal className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Nearby Radio Node Discovery (WebBluetooth 2.4 GHz)</span>
                {bleState.isBleScanning && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-900/80 text-indigo-200 border border-indigo-600 text-[10px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                    Scanning RF Environment
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Continuous physical &amp; beacon BLE sweep discovering local Meshtastic nodes with real-time RSSI signal strength &amp; distance path loss.
              </p>
            </div>
          </div>

          {/* Scanner Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {bleState.isBleScanning ? (
              <button
                onClick={handleStopScan}
                className="px-3 py-1.5 rounded-xl bg-rose-900/80 hover:bg-rose-800 text-rose-100 border border-rose-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>Stop Discovery</span>
              </button>
            ) : (
              <button
                onClick={() => handleStartScan('PROXIMITY_SWEEP')}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/30 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Scan Nearby Radios</span>
              </button>
            )}

            <button
              onClick={() => handleStartScan('PHYSICAL_PICKER')}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Open browser WebBluetooth device selector"
            >
              <Bluetooth className="w-3.5 h-3.5 text-indigo-400" />
              <span>Native BLE Picker</span>
            </button>

            {bleState.discoveredBleRadios.length > 0 && (
              <button
                onClick={handleClearDiscovered}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs transition-all cursor-pointer"
                title="Clear scanned radio list"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Filter bar & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] font-bold ${
                filterMode === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Discovered ({bleState.discoveredBleRadios.length})
            </button>
            <button
              onClick={() => setFilterMode('MESHTASTIC')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] font-bold ${
                filterMode === 'MESHTASTIC'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              LoRa Meshtastic
            </button>
            <button
              onClick={() => setFilterMode('STRONG')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] font-bold ${
                filterMode === 'STRONG'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Strong Signal (&gt; -75 dBm)
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search callsign, MAC, or model..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Discovered Radio Grid */}
        {filteredRadios.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center space-y-2">
            <Activity className="w-8 h-8 text-indigo-400/50 mx-auto animate-pulse" />
            <div className="text-xs font-bold text-slate-300">No Nearby Radios Matching Filter</div>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Click &quot;Scan Nearby Radios&quot; to sweep the 2.4 GHz RF band for BLE advertisements from T-Beam, Heltec, and RAK4631 transceivers.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredRadios.map(radio => {
              const isSelected = selectedDiscoveredRadio?.id === radio.id;
              const isCurrent = radio.isCurrentlyConnected || (bleState.isConnected && bleState.deviceName?.includes(radio.hwModel.replace('_', ' ')));
              
              // Signal color token
              let signalColor = 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
              if (radio.rssi < -88) signalColor = 'text-rose-400 bg-rose-950/60 border-rose-800';
              else if (radio.rssi < -78) signalColor = 'text-amber-400 bg-amber-950/60 border-amber-800';
              else if (radio.rssi < -68) signalColor = 'text-cyan-400 bg-cyan-950/60 border-cyan-800';

              return (
                <div
                  key={radio.id}
                  onClick={() => setSelectedDiscoveredRadio(isSelected ? null : radio)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-3 ${
                    isCurrent
                      ? 'bg-gradient-to-br from-emerald-950/40 to-slate-950 border-emerald-600/80 shadow-md shadow-emerald-950/40'
                      : isSelected
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-950/40'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top: Name, Model Chip, Signal Bars */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-xs text-white flex items-center gap-1.5">
                          <Bluetooth className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate max-w-[170px]" title={radio.name}>
                            {radio.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 font-bold">
                            {radio.hwModel.replace('_', ' ')}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {radio.nodeNumHex}
                          </span>
                        </div>
                      </div>

                      {/* Visual Signal Strength Meter */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {renderSignalBars(radio.signalBars, radio.rssi)}
                        <span className={`text-[10px] px-1.5 py-0.2 rounded border font-bold ${signalColor}`}>
                          {radio.rssi} dBm
                        </span>
                      </div>
                    </div>

                    {/* Proximity / Link Quality Details */}
                    <div className="grid grid-cols-3 gap-1.5 mt-3 pt-2.5 border-t border-slate-900 text-[10px]">
                      <div>
                        <span className="text-slate-500 block">Quality</span>
                        <strong className="text-slate-200">{radio.signalPercent}%</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Est. Range</span>
                        <strong className="text-indigo-300">~{radio.distanceMeters}m</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">MAC</span>
                        <span className="text-slate-400 font-mono text-[9px] truncate block" title={radio.macAddress}>
                          {radio.macAddress.split(':').slice(-3).join(':')}
                        </span>
                      </div>
                    </div>

                    {/* Battery Percentage Indicator Bar */}
                    <div className="mt-3 pt-2.5 border-t border-slate-900 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <Battery className={`w-3.5 h-3.5 shrink-0 ${
                            radio.batteryPercent <= 25 ? 'text-rose-400 animate-pulse' :
                            radio.batteryPercent <= 55 ? 'text-amber-400' :
                            'text-emerald-400'
                          }`} />
                          <span className="text-slate-400 font-semibold">Battery Power</span>
                          {radio.batteryVoltage && (
                            <span className="text-slate-500 font-mono text-[9px]">
                              ({radio.batteryVoltage.toFixed(2)}V)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 font-mono">
                          <span className={`font-bold text-[11px] ${
                            radio.batteryPercent <= 25 ? 'text-rose-400' :
                            radio.batteryPercent <= 55 ? 'text-amber-400' :
                            'text-emerald-400'
                          }`}>
                            {radio.batteryPercent}%
                          </span>
                          <span className={`text-[8px] px-1 py-0.2 rounded border font-semibold ${
                            radio.batteryPercent <= 25 ? 'bg-rose-950/80 text-rose-300 border-rose-800' :
                            radio.batteryPercent <= 55 ? 'bg-amber-950/80 text-amber-300 border-amber-800' :
                            'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                          }`}>
                            {radio.batteryPercent <= 25 ? 'CRITICAL' : radio.batteryPercent <= 55 ? 'MODERATE' : 'NOMINAL'}
                          </span>
                        </div>
                      </div>

                      {/* Visual Battery Bar Meter */}
                      <div className="w-full h-2 bg-slate-900/90 rounded-full overflow-hidden p-[1px] border border-slate-800/90 relative">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            radio.batteryPercent <= 25
                              ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                              : radio.batteryPercent <= 55
                              ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                              : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                          }`}
                          style={{ width: `${Math.max(5, Math.min(100, radio.batteryPercent))}%` }}
                        />
                      </div>

                      {/* Expanded diagnostics if card is selected */}
                      {isSelected && (
                        <div className="mt-2 pt-2 border-t border-slate-900/80 text-[9px] text-slate-400 space-y-1">
                          <div className="flex items-center justify-between">
                            <span>Power Architecture:</span>
                            <span className="text-white font-mono">
                              {radio.hwModel === 'RAK4631' ? 'Solar MPPT + 18650 Li-Ion' : 'Internal 1S LiPo Cell'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Est. Node Autonomy:</span>
                            <span className="text-emerald-400 font-mono font-bold">
                              ~{Math.round((radio.batteryPercent / 100) * (radio.hwModel === 'RAK4631' ? 96 : 32))} hrs standby
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-900">
                    <span className="text-[9px] text-slate-500">
                      Seen {Math.max(1, Math.round((Date.now() - radio.lastSeen) / 1000))}s ago
                    </span>

                    {isCurrent ? (
                      <span className="px-2 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Connected</span>
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConnectDiscovered(radio);
                        }}
                        disabled={bleState.isConnecting}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        <Zap className="w-3 h-3" />
                        <span>Connect</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Radio Configuration & Quick Channel Admin Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-500 uppercase font-bold">Local Radio ID</div>
          <div className="text-sm font-bold text-white flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>!{bleState.myNodeNum.toString(16).padStart(8, '0')}</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>Primary Channel</span>
            <span className="text-[9px] text-slate-400">{bleState.channels.length} Configured</span>
          </div>
          <div className="text-sm font-bold text-indigo-300 flex items-center justify-between">
            <span className="truncate">{bleState.primaryChannel}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
              AES-256
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-500 uppercase font-bold">Modem Preset</div>
          <div className="flex gap-1 pt-0.5">
            {(['LONG_FAST', 'LONG_SLOW', 'MEDIUM_FAST', 'SHORT_FAST'] as const).map(p => (
              <button
                key={p}
                onClick={() => meshtasticBleService.setChannelPreset(p)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-all ${
                  bleState.modemPreset === p
                    ? 'bg-indigo-900 text-indigo-200 border border-indigo-500'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {p.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-500 uppercase font-bold">Packet Telemetry</div>
          <div className="text-sm font-bold text-slate-200 flex items-center gap-3">
            <span>TX: <strong className="text-cyan-400">{bleState.packetsSent}</strong></span>
            <span>RX: <strong className="text-emerald-400">{bleState.packetsReceived}</strong></span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-700/60 flex flex-col justify-between">
          <div className="text-[10px] text-indigo-300 uppercase font-bold flex items-center gap-1">
            <Key className="w-3 h-3 text-amber-400" />
            <span>Channels &amp; Admin</span>
          </div>
          <button
            id="btn-open-channel-admin"
            onClick={() => {
              setAdminTargetNode(null);
              setShowAdminModal(true);
            }}
            className="w-full mt-1 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Manage Channels</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FEATURE: Live LoRa Chirp Spread Spectrum (CSS) Waterfall & RF Analyzer    */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Waves className="w-4 h-4 text-emerald-400" />
            <span className="text-xs uppercase font-bold text-slate-300 tracking-wider">
              Live RF Spectrum Waterfall & Link Quality
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
              {(bleState.frequencySlotMhz || 906.875).toFixed(3)} MHz CSS
            </span>
          </div>
          <button
            onClick={() => setShowSpectrumWaterfall(!showSpectrumWaterfall)}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono transition-colors cursor-pointer"
          >
            {showSpectrumWaterfall ? 'Collapse Analyzer' : 'Expand RF Analyzer'}
          </button>
        </div>

        {showSpectrumWaterfall && (
          <MeshtasticSpectrumWaterfall state={bleState} onNotify={onNotify} />
        )}
      </div>

      {/* Cloud Multi-Operator Tactical Sync (Firebase Firestore) */}
      <MeshCloudSyncPanel onNotify={(title, msg) => onNotify?.(`[${title}] ${msg}`)} />

      {/* View Switcher: Tactical Mesh Map vs Node Directory & Chat */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            id="tab-btn-tactical-map"
            onClick={() => setMainViewTab('MAP')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              mainViewTab === 'MAP'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 border border-indigo-500'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Tactical Map &amp; LOS Plotter</span>
          </button>

          <button
            id="tab-btn-node-directory"
            onClick={() => setMainViewTab('DIRECTORY')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              mainViewTab === 'DIRECTORY'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 border border-indigo-500'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Node Directory &amp; Chat Console</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span>Active Nodes: <strong className="text-emerald-400">{bleState.nodes.length}</strong></span>
          <span>Waypoints: <strong className="text-pink-400">{bleState.waypoints?.length || 0}</strong></span>
          <span>Packets: <strong className="text-cyan-400">{bleState.packetsSent + bleState.packetsReceived}</strong></span>
        </div>
      </div>

      {mainViewTab === 'MAP' ? (
        <MeshtasticTacticalMapView
          state={bleState}
          onNotify={onNotify}
          onSelectNodeForChat={(node) => {
            setSelectedNode(node);
            setMainViewTab('DIRECTORY');
          }}
        />
      ) : (
        /* Main Two-Column Layout: Mesh Nodes Table + Live Chat/Telemetry */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Mesh Node Directory */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase font-bold text-slate-300 flex items-center gap-2 tracking-wider">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Mesh LoRa Node Directory ({bleState.nodes.length})</span>
            </h3>
            <span className="text-[10px] text-slate-500">Click node for private reply</span>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {bleState.nodes.map(node => {
              const isSelected = selectedNode?.num === node.num;
              const isLocal = node.num === bleState.myNodeNum;

              return (
                <div
                  key={node.num}
                  onClick={() => setSelectedNode(isSelected ? null : node)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-950/50'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${isLocal ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
                      <div className="font-bold text-sm text-white">{node.user.longName}</div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {node.user.shortName}
                      </span>
                      {isLocal && (
                        <span className="text-[9px] px-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                          LOCAL GCS
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                        {node.user.hwModel.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 font-bold">
                        {node.role || 'ROUTER_CLIENT'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAdminTargetNode(node);
                          setShowAdminModal(true);
                        }}
                        className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-indigo-300 hover:text-white border border-slate-700 cursor-pointer text-[10px] flex items-center gap-1"
                        title="Configure Node Admin & Radio Role"
                      >
                        <Settings2 className="w-3 h-3" />
                        <span className="text-[9px] font-bold">Admin</span>
                      </button>
                      {!isLocal && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePing(node.num);
                          }}
                          className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 cursor-pointer text-[10px]"
                          title="Ping Node"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2 pt-2 border-t border-slate-900 text-[11px] text-slate-400">
                    <div>
                      <span className="text-slate-500">Signal:</span>{' '}
                      <strong className="text-emerald-400">{node.snr > 0 ? `+${node.snr}` : node.snr} dB</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">RSSI:</span>{' '}
                      <strong className="text-cyan-400">{node.rssi} dBm</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Route:</span>{' '}
                      <strong className="text-amber-400">{node.hopsAway === 0 ? 'Direct' : `${node.hopsAway} Hop`}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">TX Power:</span>{' '}
                      <strong className="text-white font-mono">{node.txPowerDbm ?? 27} dBm</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Battery:</span>{' '}
                      <strong className="text-purple-400">{node.batteryLevel}% ({node.voltage}V)</strong>
                    </div>
                  </div>

                  {node.position && (
                    <div className="mt-1.5 text-[10px] text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-400" />
                      <span>
                        {(node.position.latitudeI / 1e7).toFixed(5)}°, {(node.position.longitudeI / 1e7).toFixed(5)}° • Alt: {node.position.altitude}m • {node.position.satsInView} Sats
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Mesh Chat & Command Console */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  LoRa Packet Log & Chat
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                To: <strong className={selectedNode ? 'text-indigo-300' : 'text-emerald-400'}>
                  {selectedNode ? selectedNode.user.longName : 'BROADCAST (All Nodes)'}
                </strong>
              </span>
            </div>

            {/* Channel Selector Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-2 border-b border-slate-900">
              {bleState.channels.map(chan => (
                <button
                  key={chan.index}
                  type="button"
                  onClick={() => setActiveChatChannel(chan.index)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer whitespace-nowrap ${
                    activeChatChannel === chan.index
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  #{chan.name || `CH-${chan.index}`}
                </button>
              ))}
            </div>

            {/* Messages Scroll Area */}
            <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1 text-xs">
              {bleState.messages.map(msg => {
                const isFromMe = msg.from === bleState.myNodeNum;

                return (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-xl border ${
                      isFromMe
                        ? 'bg-indigo-950/40 border-indigo-800/60 ml-4'
                        : 'bg-slate-900 border-slate-800 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-bold text-cyan-300">{msg.fromName}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1 py-0.2 rounded bg-indigo-950 text-indigo-400 text-[9px] font-mono">
                          CH {msg.channel}
                        </span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                        {msg.isAcked && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      </div>
                    </div>
                    <p className="text-slate-200 text-[11px] leading-relaxed">{msg.text}</p>
                    <div className="mt-1 flex items-center gap-2 text-[9px] text-slate-500 font-mono">
                      <span>SNR: +{msg.rxSnr} dB</span>
                      <span>RSSI: {msg.rxRssi} dBm</span>
                      <span>Hops: {msg.hopLimit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat Composer Input */}
          <form onSubmit={handleSendMessage} className="pt-2 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={selectedNode ? `Message ${selectedNode.user.shortName}...` : `Broadcast to #${bleState.channels[activeChatChannel]?.name || 'CH' + activeChatChannel}...`}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
            />
            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
      )}

      {/* Meshtastic Channel & OTA Admin Modal */}
      <MeshtasticChannelAdminModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        state={bleState}
        onNotify={onNotify}
        initialSelectedNode={adminTargetNode}
      />
    </div>
  );
};
