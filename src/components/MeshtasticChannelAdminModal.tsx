import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Key,
  Shield,
  Radio,
  Sliders,
  RefreshCw,
  Share2,
  Download,
  Upload,
  Cpu,
  RotateCcw,
  AlertTriangle,
  Check,
  Copy,
  QrCode,
  Zap,
  Globe,
  Settings2,
  Lock,
  Unlock,
  Layers,
  Flame,
  Power
} from 'lucide-react';
import QRCode from 'qrcode';
import { 
  MeshtasticBleState, 
  MeshtasticBleNode, 
  MeshtasticChannelConfig, 
  MeshtasticNodeRole 
} from '../types';
import { meshtasticBleService } from '../services/meshtasticBleService';

interface MeshtasticChannelAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: MeshtasticBleState;
  onNotify?: (msg: string) => void;
  initialSelectedNode?: MeshtasticBleNode | null;
}

type ModalTab = 'CHANNELS' | 'OTA_ADMIN' | 'RF_REGION';

export const MeshtasticChannelAdminModal: React.FC<MeshtasticChannelAdminModalProps> = ({
  isOpen,
  onClose,
  state,
  onNotify,
  initialSelectedNode
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('CHANNELS');
  
  // Channel Tab State
  const [selectedChannelIndex, setSelectedChannelIndex] = useState<number>(0);
  const selectedChannel = state.channels.find(c => c.index === selectedChannelIndex) || state.channels[0];
  const [channelName, setChannelName] = useState<string>('');
  const [pskType, setPskType] = useState<MeshtasticChannelConfig['pskType']>('AES_256');
  const [pskKey, setPskKey] = useState<string>('');
  const [uplink, setUplink] = useState<boolean>(true);
  const [downlink, setDownlink] = useState<boolean>(true);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [importUrlInput, setImportUrlInput] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // OTA Admin Tab State
  const [selectedNodeNum, setSelectedNodeNum] = useState<number>(
    initialSelectedNode ? initialSelectedNode.num : state.myNodeNum
  );
  const targetNode = state.nodes.find(n => n.num === selectedNodeNum) || state.nodes[0];
  const [nodeRole, setNodeRole] = useState<MeshtasticNodeRole>('ROUTER_CLIENT');
  const [txPower, setTxPower] = useState<number>(27);
  const [hopLimit, setHopLimit] = useState<number>(3);
  const [posBroadcast, setPosBroadcast] = useState<number>(60);
  const [telemetryBroadcast, setTelemetryBroadcast] = useState<number>(300);
  const [isFixedPos, setIsFixedPos] = useState<boolean>(false);
  const [confirmFactoryReset, setConfirmFactoryReset] = useState<boolean>(false);
  const [rebootingNodeId, setRebootingNodeId] = useState<number | null>(null);

  // Sync state when channel changes
  useEffect(() => {
    if (selectedChannel) {
      setChannelName(selectedChannel.name);
      setPskType(selectedChannel.pskType);
      setPskKey(selectedChannel.pskKey);
      setUplink(selectedChannel.uplinkEnabled);
      setDownlink(selectedChannel.downlinkEnabled);
    }
  }, [selectedChannelIndex, selectedChannel]);

  // Sync state when target node changes
  useEffect(() => {
    if (targetNode) {
      setNodeRole(targetNode.role || 'ROUTER_CLIENT');
      setTxPower(targetNode.txPowerDbm ?? 27);
      setHopLimit(targetNode.hopLimit ?? 3);
      setPosBroadcast(targetNode.positionBroadcastSecs ?? 60);
      setTelemetryBroadcast(targetNode.telemetryBroadcastSecs ?? 300);
      setIsFixedPos(targetNode.isFixedPosition ?? false);
    }
  }, [selectedNodeNum, targetNode]);

  // Generate QR code for sharing current channel config
  useEffect(() => {
    if (!isOpen) return;
    const url = meshtasticBleService.exportMeshtasticUrl(selectedChannelIndex);
    QRCode.toDataURL(url, {
      width: 240,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#f8fafc',
      },
    })
      .then(dataUri => setQrCodeDataUrl(dataUri))
      .catch(err => console.error('Failed to generate QR code', err));
  }, [isOpen, selectedChannelIndex, state.channels, state.modemPreset, state.regionCode]);

  if (!isOpen) return null;

  // Handle saving channel configuration
  const handleSaveChannel = () => {
    meshtasticBleService.updateChannel(selectedChannelIndex, {
      name: channelName,
      pskType,
      pskKey,
      uplinkEnabled: uplink,
      downlinkEnabled: downlink,
    });
    if (onNotify) {
      onNotify(`LoRa Channel Slot ${selectedChannelIndex} (${channelName}) configuration updated over BLE.`);
    }
  };

  // Handle generating random PSK
  const handleGeneratePsk = (type: 'AES_128' | 'AES_256') => {
    const key = meshtasticBleService.generateRandomPsk(type);
    setPskType(type);
    setPskKey(key);
    if (onNotify) {
      onNotify(`Generated new 256-bit ${type} cryptographic pre-shared key.`);
    }
  };

  // Handle OTA Node Config Save
  const handleSaveNodeAdmin = () => {
    if (!targetNode) return;
    meshtasticBleService.updateRemoteNodeAdminConfig(targetNode.num, {
      role: nodeRole,
      txPowerDbm: txPower,
      hopLimit,
      positionBroadcastSecs: posBroadcast,
      telemetryBroadcastSecs: telemetryBroadcast,
      isFixedPosition: isFixedPos,
    });

    if (targetNode.num === state.myNodeNum) {
      meshtasticBleService.setLocalAdminConfig({
        nodeRole,
        txPowerDbm: txPower,
        hopLimit,
        positionBroadcastSecs: posBroadcast,
        telemetryBroadcastSecs: telemetryBroadcast,
        isFixedPosition: isFixedPos,
      });
    }

    if (onNotify) {
      onNotify(`OTA Admin packet dispatched to ${targetNode.user.longName}: Role ${nodeRole}, ${txPower} dBm, Hops ${hopLimit}.`);
    }
  };

  // Handle Remote Reboot
  const handleRemoteReboot = () => {
    if (!targetNode) return;
    setRebootingNodeId(targetNode.num);
    const res = meshtasticBleService.rebootRemoteNode(targetNode.num);
    if (onNotify) onNotify(res.message);
    setTimeout(() => {
      setRebootingNodeId(null);
    }, 4000);
  };

  // Handle Factory Reset
  const handleFactoryReset = () => {
    if (!targetNode) return;
    const res = meshtasticBleService.factoryResetRemoteNode(targetNode.num);
    setConfirmFactoryReset(false);
    if (onNotify) onNotify(res.message);
  };

  // Copy helpers
  const handleCopyKey = () => {
    navigator.clipboard.writeText(pskKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyUrl = () => {
    const url = meshtasticBleService.exportMeshtasticUrl(selectedChannelIndex);
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Handle Import URL
  const handleImportUrl = () => {
    if (!importUrlInput.trim()) return;
    const res = meshtasticBleService.importMeshtasticUrl(importUrlInput.trim());
    if (res.success) {
      if (onNotify) onNotify(`Successfully imported Meshtastic channel profile "${res.channelName}".`);
      setImportUrlInput('');
    } else {
      if (onNotify) onNotify(`Error importing channel: ${res.error}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="meshtastic-channel-admin-modal" 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Meshtastic LoRa Channel & OTA Node Administration
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  BLE GATT ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Configure LoRa cryptographic channels, hardware transmit roles, and dispatch over-the-air admin commands.
              </p>
            </div>
          </div>
          <button
            id="btn-close-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-800 bg-slate-950/60 flex gap-6 text-xs">
          <button
            id="tab-btn-channels"
            onClick={() => setActiveTab('CHANNELS')}
            className={`py-3 flex items-center gap-2 border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'CHANNELS'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4 text-amber-400" />
            <span>LoRa Channels & PSK Encryption</span>
          </button>

          <button
            id="tab-btn-ota-admin"
            onClick={() => setActiveTab('OTA_ADMIN')}
            className={`py-3 flex items-center gap-2 border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'OTA_ADMIN'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Over-The-Air (OTA) Node Admin</span>
          </button>

          <button
            id="tab-btn-rf-region"
            onClick={() => setActiveTab('RF_REGION')}
            className={`py-3 flex items-center gap-2 border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'RF_REGION'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>Radio Frequency & LoRa Region</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ========================================================================= */}
          {/* TAB 1: Channels & Cryptographic Key Management                           */}
          {/* ========================================================================= */}
          {activeTab === 'CHANNELS' && (
            <div className="space-y-6">
              {/* Channel Slot Selector Strip */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Channel Slot Directory (8 Hardware Slots Available)</span>
                  <button
                    onClick={() => {
                      const nextSlot = state.channels.length;
                      if (nextSlot < 8) {
                        meshtasticBleService.updateChannel(nextSlot, {
                          name: `Channel-${nextSlot}`,
                          role: 'SECONDARY',
                          pskType: 'AES_256',
                          pskKey: meshtasticBleService.generateRandomPsk('AES_256'),
                        });
                        setSelectedChannelIndex(nextSlot);
                      }
                    }}
                    disabled={state.channels.length >= 8}
                    className="text-indigo-400 hover:text-indigo-300 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                  >
                    + Add Secondary Channel
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {state.channels.map((chan) => {
                    const isSelected = chan.index === selectedChannelIndex;
                    return (
                      <div
                        key={chan.index}
                        onClick={() => setSelectedChannelIndex(chan.index)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-950/70 border-indigo-500 shadow-md shadow-indigo-950/50'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500">
                            Slot {chan.index}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            chan.role === 'PRIMARY'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-900 text-slate-400 border border-slate-800'
                          }`}>
                            {chan.role}
                          </span>
                        </div>
                        <div className="font-bold text-sm text-white mt-1 truncate" title={chan.name}>
                          {chan.name}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                          <Lock className="w-3 h-3 text-amber-400" />
                          <span>{chan.pskType}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Channel Detailed Config Card */}
              {selectedChannel && (
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Slot {selectedChannel.index}: {selectedChannel.name} Configuration
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowQrModal(true)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-700 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Tactical QR Code</span>
                      </button>
                      <button
                        onClick={handleCopyUrl}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                        <span>{copiedUrl ? 'URL Copied' : 'Share URL'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Channel Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400">Channel Name (max 11 chars)</label>
                      <input
                        type="text"
                        maxLength={11}
                        value={channelName}
                        onChange={e => setChannelName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Encryption Algorithm Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400">Cryptographic Standard (PSK)</label>
                      <select
                        value={pskType}
                        onChange={e => setPskType(e.target.value as MeshtasticChannelConfig['pskType'])}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="AES_256">AES-256 (Military Standard / 256-bit)</option>
                        <option value="AES_128">AES-128 (Standard / 128-bit)</option>
                        <option value="DEFAULT">Default Public Key (AQ==)</option>
                        <option value="NONE">Unencrypted (Cleartext Mesh)</option>
                      </select>
                    </div>
                  </div>

                  {/* PSK Key Input & Key Generator */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="text-slate-400">Pre-Shared Key (Hex / Base64)</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleGeneratePsk('AES_256')}
                          className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Zap className="w-3 h-3" />
                          Generate Random 256-bit Key
                        </button>
                        <button
                          onClick={handleCopyKey}
                          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedKey ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={pskKey}
                      onChange={e => setPskKey(e.target.value)}
                      placeholder="e.g. 1b4f9a3c2e5d7f8a..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Uplink / Downlink Toggles */}
                  <div className="flex items-center gap-6 pt-2 border-t border-slate-800/80 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={uplink}
                        onChange={e => setUplink(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-slate-300">Uplink Enabled (Transmit packets onto LoRa mesh)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={downlink}
                        onChange={e => setDownlink(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-slate-300">Downlink Enabled (Receive mesh traffic)</span>
                    </label>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    {selectedChannel.index > 0 ? (
                      <button
                        onClick={() => meshtasticBleService.removeChannel(selectedChannel.index)}
                        className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        Delete Slot {selectedChannel.index}
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500">Primary Slot 0 cannot be deleted</span>
                    )}

                    <button
                      id="btn-save-channel-config"
                      onClick={handleSaveChannel}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
                    >
                      Save & Broadcast Channel Config
                    </button>
                  </div>
                </div>
              )}

              {/* Import Channel Section */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Import Channel Profile URL</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={importUrlInput}
                    onChange={e => setImportUrlInput(e.target.value)}
                    placeholder="Paste Meshtastic URL (e.g. https://meshtastic.org/e/#...)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleImportUrl}
                    className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Import
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: Over-The-Air (OTA) Node Remote Administration                     */}
          {/* ========================================================================= */}
          {activeTab === 'OTA_ADMIN' && (
            <div className="space-y-6">
              {/* Target Node Selector */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Target Mesh Node for OTA Configuration
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {state.nodes.map(n => {
                    const isSelected = n.num === selectedNodeNum;
                    const isLocal = n.num === state.myNodeNum;

                    return (
                      <div
                        key={n.num}
                        onClick={() => setSelectedNodeNum(n.num)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-950/70 border-cyan-500 shadow-md shadow-cyan-950/50'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500">{n.user.id}</span>
                          {isLocal && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                              LOCAL
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-sm text-white mt-1 truncate" title={n.user.longName}>
                          {n.user.longName}
                        </div>
                        <div className="mt-1 text-[10px] text-slate-400 flex items-center justify-between">
                          <span>{n.user.hwModel.replace('_', ' ')}</span>
                          <span className="text-cyan-400 font-semibold">{n.role || 'ROUTER_CLIENT'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Node Remote Settings Card */}
              {targetNode && (
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{targetNode.user.longName}</span>
                        <span className="text-xs text-slate-400">({targetNode.user.id})</span>
                      </h4>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Firmware: {targetNode.firmwareVersion || 'v2.5.4'} • Battery: {targetNode.batteryLevel}% ({targetNode.voltage}V) • SNR: +{targetNode.snr} dB
                      </div>
                    </div>

                    {/* Remote Admin Action Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRemoteReboot}
                        disabled={rebootingNodeId === targetNode.num}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${rebootingNodeId === targetNode.num ? 'animate-spin' : ''}`} />
                        <span>{rebootingNodeId === targetNode.num ? 'Rebooting...' : 'OTA Reboot'}</span>
                      </button>

                      <button
                        onClick={() => setConfirmFactoryReset(true)}
                        className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Factory Reset</span>
                      </button>
                    </div>
                  </div>

                  {/* Settings Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Node Operating Role */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-semibold">Node Role</label>
                      <select
                        value={nodeRole}
                        onChange={e => setNodeRole(e.target.value as MeshtasticNodeRole)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="ROUTER_CLIENT">ROUTER_CLIENT (Standard mesh node with routing)</option>
                        <option value="ROUTER">ROUTER (High-altitude relay tower, always repeats)</option>
                        <option value="REPEATER">REPEATER (Low power blind repeater, no local packets)</option>
                        <option value="CLIENT">CLIENT (Standard phone-connected node)</option>
                        <option value="TRACKER">TRACKER (High rate GPS beacon for vehicles/scouts)</option>
                        <option value="SENSOR">SENSOR (Environmental telemetry weather station)</option>
                        <option value="TAK">TAK (ATAK / WinTAK military situational awareness node)</option>
                        <option value="CLIENT_MUTE">CLIENT_MUTE (Silent receiver, does not repeat)</option>
                      </select>
                      <p className="text-[10px] text-slate-500">
                        Controls whether node forwards mesh packets for other radios and its sleep profile.
                      </p>
                    </div>

                    {/* Transmit Power Slider */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-semibold">TX Output Power</span>
                        <span className="text-emerald-400 font-bold">{txPower} dBm ({Math.round(Math.pow(10, txPower / 10))} mW)</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={30}
                        step={1}
                        value={txPower}
                        onChange={e => setTxPower(parseInt(e.target.value))}
                        className="w-full accent-emerald-500 bg-slate-900"
                      />
                      <div className="flex justify-between text-[9px] text-slate-500">
                        <span>10 dBm (10mW)</span>
                        <span>22 dBm (158mW)</span>
                        <span>30 dBm (1000mW Max)</span>
                      </div>
                    </div>

                    {/* Hop Limit */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-semibold">Default Hop Limit</span>
                        <span className="text-cyan-400 font-bold">{hopLimit} Hops</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={7}
                        step={1}
                        value={hopLimit}
                        onChange={e => setHopLimit(parseInt(e.target.value))}
                        className="w-full accent-cyan-500 bg-slate-900"
                      />
                      <div className="flex justify-between text-[9px] text-slate-500">
                        <span>1 (Direct only)</span>
                        <span>3 (Standard default)</span>
                        <span>7 (Maximum mesh reach)</span>
                      </div>
                    </div>

                    {/* GPS Position Broadcast Interval */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-semibold">Position Broadcast Interval</label>
                      <select
                        value={posBroadcast}
                        onChange={e => setPosBroadcast(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value={15}>15 seconds (Tactical High Frequency)</option>
                        <option value={30}>30 seconds (Active Recon)</option>
                        <option value={60}>60 seconds (Standard Patrol)</option>
                        <option value={300}>5 minutes (Base Camp)</option>
                        <option value={900}>15 minutes (Solar Relay Tower)</option>
                        <option value={0}>Disabled (Silent Ops / No GPS TX)</option>
                      </select>
                    </div>

                    {/* Telemetry Sensor Broadcast Interval */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-semibold">Telemetry & Battery Interval</label>
                      <select
                        value={telemetryBroadcast}
                        onChange={e => setTelemetryBroadcast(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value={60}>1 minute</option>
                        <option value={180}>3 minutes</option>
                        <option value={300}>5 minutes (Standard)</option>
                        <option value={600}>10 minutes</option>
                        <option value={1800}>30 minutes (Power Saver)</option>
                      </select>
                    </div>

                    {/* Fixed Position Relay Toggle */}
                    <div className="space-y-1.5 flex flex-col justify-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isFixedPos}
                          onChange={e => setIsFixedPos(e.target.checked)}
                          className="rounded border-slate-700 bg-slate-900 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span className="text-xs text-slate-200 font-semibold">
                          Fixed Position Beacon Mode (Tower / Mountain Relay)
                        </span>
                      </label>
                      <p className="text-[10px] text-slate-500">
                        Locks GPS coordinates in non-volatile flash to preserve satellite power on stationary towers.
                      </p>
                    </div>
                  </div>

                  {/* Save OTA Admin Settings */}
                  <div className="flex items-center justify-end pt-3 border-t border-slate-800">
                    <button
                      id="btn-save-node-admin"
                      onClick={handleSaveNodeAdmin}
                      className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-cyan-600/30 cursor-pointer"
                    >
                      Dispatch OTA Admin Configuration
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: Radio Frequency & LoRa Regional Presets                            */}
          {/* ========================================================================= */}
          {activeTab === 'RF_REGION' && (
            <div className="space-y-5">
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    LoRa Regional Band & Frequency Slot
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">LoRa Regulatory Region</label>
                    <select
                      value={state.regionCode}
                      onChange={e => {
                        meshtasticBleService.setRegion(e.target.value as MeshtasticBleState['regionCode']);
                        if (onNotify) onNotify(`Switched LoRa region to ${e.target.value}. Frequency calibrated.`);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="US">US (902 - 928 MHz, Center: 915.0 MHz)</option>
                      <option value="EU_868">EU_868 (868 - 870 MHz, Center: 868.125 MHz)</option>
                      <option value="ANZ">ANZ (Australia / New Zealand 915 - 928 MHz)</option>
                      <option value="JP">JP (Japan 920 - 928 MHz)</option>
                      <option value="CN">CN (China 470 - 510 MHz)</option>
                      <option value="KR">KR (Korea 920 - 923 MHz)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">Modem Speed & Chirp Preset</label>
                    <select
                      value={state.modemPreset}
                      onChange={e => {
                        meshtasticBleService.setChannelPreset(e.target.value as MeshtasticBleState['modemPreset']);
                        if (onNotify) onNotify(`Modem preset adjusted to ${e.target.value}.`);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="LONG_FAST">LONG_FAST (Optimal range + speed / Default Meshtastic)</option>
                      <option value="LONG_SLOW">LONG_SLOW (Maximum sensitivity / Extreme long distance)</option>
                      <option value="MEDIUM_FAST">MEDIUM_FAST (Moderate speed / Balanced airtime)</option>
                      <option value="SHORT_FAST">SHORT_FAST (High speed throughput / Short airtime)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 text-xs text-slate-400 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Configured Center Frequency:</span>
                    <strong className="text-emerald-400 font-mono">{(state.frequencySlotMhz || 915.0).toFixed(3)} MHz</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Channel Bandwidth:</span>
                    <strong className="text-white font-mono">
                      {state.modemPreset === 'SHORT_FAST' ? '500 kHz' : state.modemPreset === 'MEDIUM_FAST' ? '250 kHz' : '125 kHz'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Default Spreading Factor:</span>
                    <strong className="text-cyan-400 font-mono">
                      {state.modemPreset === 'SHORT_FAST' ? 'SF7' : state.modemPreset === 'MEDIUM_FAST' ? 'SF8' : 'SF10'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Connected to {state.deviceName || 'Local Meshtastic BLE'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* QR Code Sharing Sub-Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full space-y-4 text-center font-mono shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-indigo-400" />
                <span>Tactical Channel QR Code</span>
              </h4>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white p-3 rounded-xl inline-block mx-auto shadow-inner">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="Meshtastic Channel QR" className="w-48 h-48 block mx-auto" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-500 text-xs">
                  Generating QR...
                </div>
              )}
            </div>

            <div>
              <div className="text-xs font-bold text-white">{selectedChannel?.name}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Scan with official Meshtastic Android / iOS app camera to join this encrypted mesh.
              </div>
            </div>

            <button
              onClick={handleCopyUrl}
              className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? 'Copied Channel Link' : 'Copy Channel Link'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Two-Step Factory Reset Confirmation Dialog */}
      {confirmFactoryReset && targetNode && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-rose-600/60 rounded-2xl p-6 max-w-md w-full space-y-4 font-mono shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Confirm Factory Default Reset</h4>
                <p className="text-xs text-rose-300">Irreversible NVS Flash Wipe</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to dispatch a factory reset frame over LoRa to{' '}
              <strong className="text-white">{targetNode.user.longName}</strong> ({targetNode.user.id})?
              All saved channel keys, network configurations, and stored packets will be permanently wiped.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmFactoryReset(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleFactoryReset}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Confirm Factory Wipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
