import React, { useState, useEffect } from 'react';
import { LinkedDevice, LinkedDeviceType, BiometricSessionState } from '../types';
import { deviceManager } from '../services/deviceManager';
import { meshFabric } from '../fabric/meshFabric';
import { verificationLoopManager } from '../services/verificationLoopManager';
import { systemLogManager } from '../services/systemLogManager';
import { tactileAudio } from '../services/tactileAudio';
import { 
  X, 
  Plus, 
  Cpu, 
  Radio, 
  Tablet, 
  Server, 
  Activity, 
  ShieldAlert, 
  CheckCircle2, 
  Trash2, 
  Power, 
  RefreshCw, 
  Wifi, 
  Battery, 
  Layers,
  Key,
  Fingerprint,
  ShieldCheck
} from 'lucide-react';

interface DeviceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify?: (msg: string) => void;
}

export const DeviceManagerModal: React.FC<DeviceManagerModalProps> = ({
  isOpen,
  onClose,
  onNotify
}) => {
  const [devices, setDevices] = useState<LinkedDevice[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // New device form state
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<LinkedDeviceType>('uav_recon');
  const [newMac, setNewMac] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newCrypto, setNewCrypto] = useState('AES-256-GCM / ECC P-384');
  const [biometricSession, setBiometricSession] = useState<BiometricSessionState | null>(() => meshFabric.getBiometricSession());
  const [isSyncingBiometrics, setIsSyncingBiometrics] = useState<boolean>(false);

  useEffect(() => {
    setDevices(deviceManager.getDevices());
    const unsub = deviceManager.subscribe(devs => setDevices(devs));
    const unsubFabric = meshFabric.subscribe(() => setBiometricSession(meshFabric.getBiometricSession()));
    return () => {
      unsub();
      unsubFabric();
    };
  }, []);

  const handleSyncDevicesWithBiometrics = async () => {
    if (!biometricSession?.isVerified) return;
    setIsSyncingBiometrics(true);
    tactileAudio.playScanTick();

    setTimeout(async () => {
      tactileAudio.playVerificationSuccess();
      setIsSyncingBiometrics(false);

      await verificationLoopManager.verifyAndPersistResult(
        'biometric_attestation',
        `Mutual Biometric Handshake: ${devices.length} Devices`,
        {
          operatorId: biometricSession.operatorId,
          clearanceLevel: biometricSession.clearanceLevel,
          deviceIds: devices.map(d => d.id),
          token: biometricSession.sessionToken,
          protocol: 'STANAG-4586 Level-4 Biometric Interconnect'
        },
        { latencyMs: 12, rssi: -45 },
        `Cryptographic zero-trust ring synchronized with biometric token for ${devices.length} linked devices.`
      );

      systemLogManager.log(
        'DEVICE_LINK',
        'DEVICES',
        `Biometric Mutual Handshake completed for ${devices.length} devices under ${biometricSession.operatorName} [${biometricSession.clearanceLevel}].`,
        { deviceCount: devices.length, token: biometricSession.sessionToken }
      );

      if (onNotify) {
        onNotify(`Zero-Trust Handshake complete: ${devices.length} devices synchronized with Biometric clearance.`);
      }
    }, 850);
  };

  if (!isOpen) return null;

  const handleAddDeviceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newId.trim() || `DEV-${Math.floor(1000 + Math.random() * 9000)}`;
    const cleanName = newName.trim() || `Tactical Linked Node ${cleanId}`;
    const cleanMac = newMac.trim() || `00:${Math.floor(10 + Math.random() * 89)}:44:${Math.floor(10 + Math.random() * 89)}:${Math.floor(10 + Math.random() * 89)}:${Math.floor(10 + Math.random() * 89)}`;

    deviceManager.addDevice({
      id: cleanId,
      name: cleanName,
      type: newType,
      macAddress: cleanMac,
      ipAddress: `10.240.${Math.floor(Math.random() * 5)}.${Math.floor(10 + Math.random() * 200)}`,
      status: 'CONNECTED',
      batteryPercent: 100,
      signalRssi: -50 - Math.floor(Math.random() * 25),
      hardwareModel: newModel.trim() || 'Mil-Spec Standard SDR Unit',
      cryptoSuite: newCrypto,
      roleDescription: newRole.trim() || 'Assigned mission-critical linked telemetry node',
      isPrimary: false
    });

    if (onNotify) {
      onNotify(`Device ${cleanName} (${cleanId}) linked successfully.`);
    }

    // Reset form
    setNewId('');
    setNewName('');
    setNewModel('');
    setNewRole('');
    setIsAdding(false);
  };

  const getDeviceIcon = (type: LinkedDeviceType) => {
    switch (type) {
      case 'uav_recon': return <Radio className="w-4 h-4 text-cyan-400" />;
      case 'command_terminal': return <Server className="w-4 h-4 text-indigo-400" />;
      case 'field_tablet': return <Tablet className="w-4 h-4 text-emerald-400" />;
      case 'satellite_transceiver': return <Wifi className="w-4 h-4 text-purple-400" />;
      case 'rf_jammer_pod': return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'biometric_monitor': return <Activity className="w-4 h-4 text-amber-400" />;
      default: return <Cpu className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-700/50 text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Mission Linked Devices</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/60 text-cyan-300 font-mono">
                  {devices.length} Devices Set
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Configure, authenticate, and manage connected tactical node IDs, device types, and names for operations
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdding ? 'Cancel' : 'Set New Device'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form to Set Devices We Need */}
        {isAdding && (
          <form onSubmit={handleAddDeviceSubmit} className="p-6 bg-slate-950/90 border-b border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>Add / Set Required Device</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Auto-assigns crypto keypair & IP address</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Device ID (e.g. DEV-8801)</label>
                <input
                  type="text"
                  placeholder="DEV-UAV-02"
                  value={newId}
                  onChange={e => setNewId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Device Name</label>
                <input
                  type="text"
                  placeholder="Skylark High-Altitude Scout"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Device Type</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as LinkedDeviceType)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none cursor-pointer"
                >
                  <option value="uav_recon">UAV Recon Scout</option>
                  <option value="command_terminal">Command Terminal</option>
                  <option value="field_tablet">Field Commander Tablet</option>
                  <option value="satellite_transceiver">SATCOM Transceiver</option>
                  <option value="rf_jammer_pod">RF Jammer / EA Pod</option>
                  <option value="biometric_monitor">Biometric / Vitals Node</option>
                  <option value="sensor_beacon">Sensor Beacon / Sonar</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Hardware Model</label>
                <input
                  type="text"
                  placeholder="Teledyne FLIR Black Hornet 4"
                  value={newModel}
                  onChange={e => setNewModel(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">MAC / Serial (Optional)</label>
                <input
                  type="text"
                  placeholder="00:1B:44:99:A1:02"
                  value={newMac}
                  onChange={e => setNewMac(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Crypto Suite</label>
                <select
                  value={newCrypto}
                  onChange={e => setNewCrypto(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none cursor-pointer"
                >
                  <option value="AES-256-GCM / ECC P-384">AES-256-GCM / ECC P-384</option>
                  <option value="Kyber-1024 / CNSA 2.0">Kyber-1024 / CNSA 2.0 (Post-Quantum)</option>
                  <option value="ChaCha20-Poly1305">ChaCha20-Poly1305</option>
                  <option value="STANAG 5516 / Link-16">STANAG 5516 / Link-16</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-mono text-xs">Role & Operational Task</label>
              <input
                type="text"
                placeholder="Tactical high-resolution video stream and electronic emission surveyor"
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Link Device to Fabric</span>
              </button>
            </div>
          </form>
        )}

        {/* Biometric Trust Ring Interconnect Banner */}
        <div className="px-6 pt-4 pb-2">
          <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
            biometricSession?.isVerified
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              : 'bg-slate-950/60 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg border ${
                biometricSession?.isVerified
                  ? 'bg-emerald-900/60 border-emerald-500/60 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-500'
              }`}>
                <Fingerprint className={`w-4 h-4 ${biometricSession?.isVerified ? 'animate-pulse text-emerald-400' : ''}`} />
              </div>
              <div>
                <div className="text-xs font-bold font-mono tracking-wider flex items-center gap-2">
                  <span className={biometricSession?.isVerified ? 'text-emerald-300' : 'text-slate-300'}>
                    BIOMETRIC INTERCONNECT RING:
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    biometricSession?.isVerified
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {biometricSession?.isVerified ? biometricSession.clearanceLevel.replace('_', ' ') : 'STANDBY // UNATTESTED'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                  {biometricSession?.isVerified
                    ? `Operator ${biometricSession.operatorName} attested. Zero-trust ring ready for device synchronization.`
                    : 'Vault gate scan required to issue cryptographic multi-device attestation token.'}
                </div>
              </div>
            </div>

            {biometricSession?.isVerified && (
              <button
                onClick={handleSyncDevicesWithBiometrics}
                disabled={isSyncingBiometrics}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isSyncingBiometrics ? 'Attesting Devices...' : 'Sync Device Trust Ring'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Devices List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {devices.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-mono text-xs">
              No devices linked. Click "Set New Device" to pair required tactical equipment.
            </div>
          ) : (
            devices.map(device => (
              <div
                key={device.id}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-3 min-w-[260px] flex-1">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 mt-0.5">
                    {getDeviceIcon(device.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">{device.name}</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 font-bold">
                        {device.id}
                      </span>
                      {device.isPrimary && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-300 font-mono font-semibold">
                          PRIMARY
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
                      <span>Type: <strong className="text-slate-200 capitalize">{device.type.replace('_', ' ')}</strong></span>
                      <span>•</span>
                      <span>Model: <strong className="text-slate-200">{device.hardwareModel}</strong></span>
                      <span>•</span>
                      <span>IP: <strong className="text-slate-300">{device.ipAddress}</strong></span>
                      <span>•</span>
                      <span>MAC: <strong className="text-slate-400">{device.macAddress}</strong></span>
                    </div>

                    <div className="text-xs text-slate-300 pt-0.5">
                      {device.roleDescription}
                    </div>

                    <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 pt-0.5">
                      <Key className="w-3 h-3 text-cyan-500" />
                      <span>{device.cryptoSuite}</span>
                    </div>
                  </div>
                </div>

                {/* Right Metrics & Controls */}
                <div className="flex items-center space-x-4">
                  <div className="text-right space-y-1 text-xs font-mono">
                    <div className="flex items-center justify-end space-x-1.5">
                      <Battery className={`w-3.5 h-3.5 ${device.batteryPercent > 50 ? 'text-emerald-400' : 'text-amber-400'}`} />
                      <span className="text-slate-200 font-bold">{device.batteryPercent}%</span>
                      <span className="text-slate-500">|</span>
                      <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-slate-200">{device.signalRssi} dBm</span>
                    </div>

                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => deviceManager.toggleDeviceConnection(device.id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          device.status === 'CONNECTED'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                            : device.status === 'STANDBY'
                            ? 'bg-amber-950 text-amber-300 border-amber-700/60'
                            : 'bg-rose-950 text-rose-300 border-rose-700/60'
                        }`}
                        title="Toggle connection status"
                      >
                        {device.status}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 border-l border-slate-800 pl-3">
                    <button
                      onClick={() => {
                        deviceManager.updateDevice(device.id, {
                          batteryPercent: Math.min(100, device.batteryPercent + 5),
                          signalRssi: -45 - Math.floor(Math.random() * 20)
                        });
                        if (onNotify) onNotify(`Refreshed telemetry for ${device.id}`);
                      }}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Ping & refresh telemetry"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Unlink and remove device ${device.name} (${device.id})?`)) {
                          deviceManager.removeDevice(device.id);
                          if (onNotify) onNotify(`Device ${device.id} unlinked.`);
                        }
                      }}
                      className="p-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 border border-rose-900/40 transition-colors cursor-pointer"
                      title="Unlink device"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs font-mono text-slate-400">
          <div>STANAG-5516 / Zero-Trust Cryptographic Pairing Active</div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
