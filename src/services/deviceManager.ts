import { LinkedDevice } from '../types';
import { systemLogManager } from './systemLogManager';

export type DeviceListener = (devices: LinkedDevice[]) => void;

class DeviceManager {
  private devices: LinkedDevice[] = [];
  private listeners: DeviceListener[] = [];
  private readonly STORAGE_KEY = 'mesh_citadel_linked_devices_v1';

  constructor() {
    this.loadDevices();
    if (this.devices.length === 0) {
      this.seedInitialDevices();
    }
  }

  private loadDevices() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = window.localStorage.getItem(this.STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            this.devices = parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Could not load linked devices', e);
    }
  }

  private saveDevices() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.devices));
      }
    } catch (e) {
      // ignore
    }
  }

  private seedInitialDevices() {
    const now = Date.now();
    this.devices = [
      {
        id: 'DEV-UAV-01',
        name: 'Hermes Recon UAV',
        type: 'uav_recon',
        macAddress: '00:1B:44:11:3A:B7',
        ipAddress: '10.240.1.14',
        status: 'CONNECTED',
        batteryPercent: 94,
        signalRssi: -58,
        hardwareModel: 'AeroVironment Puma 3 AE',
        cryptoSuite: 'AES-256-GCM / ECC P-384',
        roleDescription: 'Forward optical & multi-spectral RF reconnaissance scout',
        lastHeartbeat: now - 3500,
        isPrimary: true
      },
      {
        id: 'DEV-CMD-ALPHA',
        name: 'Tactical Command Console',
        type: 'command_terminal',
        macAddress: '70:85:C2:59:E1:90',
        ipAddress: '10.240.0.2',
        status: 'CONNECTED',
        batteryPercent: 100,
        signalRssi: -42,
        hardwareModel: 'Mil-Spec Rugged Server Station',
        cryptoSuite: 'Kyber-1024 / CNSA 2.0',
        roleDescription: 'Central C4ISR coordination & DEFCON authority terminal',
        lastHeartbeat: now - 1200,
        isPrimary: true
      },
      {
        id: 'DEV-TABLET-09',
        name: 'Field Squad Commander Tablet',
        type: 'field_tablet',
        macAddress: 'AC:DE:48:00:11:22',
        ipAddress: '10.240.2.88',
        status: 'CONNECTED',
        batteryPercent: 78,
        signalRssi: -64,
        hardwareModel: 'Panasonic Toughbook G2',
        cryptoSuite: 'ChaCha20-Poly1305',
        roleDescription: 'Squad level real-time map & target designation display',
        lastHeartbeat: now - 6200,
        isPrimary: false
      },
      {
        id: 'DEV-SAT-04',
        name: 'MilStar SATCOM Transceiver',
        type: 'satellite_transceiver',
        macAddress: '02:00:4C:4F:4F:50',
        ipAddress: '10.240.4.10',
        status: 'CONNECTED',
        batteryPercent: 99,
        signalRssi: -49,
        hardwareModel: 'L3Harris AN/PRC-117G Manpack',
        cryptoSuite: 'STANAG 5516 / Link-16',
        roleDescription: 'High-bandwidth low-earth orbit uplink & relay bridge',
        lastHeartbeat: now - 4100,
        isPrimary: false
      },
      {
        id: 'DEV-JAMMER-07',
        name: 'Airborne EA Pod (AN/ALQ-99)',
        type: 'rf_jammer_pod',
        macAddress: '3C:5A:B4:98:23:45',
        ipAddress: '10.240.3.55',
        status: 'STANDBY',
        batteryPercent: 88,
        signalRssi: -68,
        hardwareModel: 'Northrop Grumman Jamming Pod Subsystem',
        cryptoSuite: 'Hardware-Enclaved RF Direct',
        roleDescription: 'Direct high-power microwave electronic attack pod',
        lastHeartbeat: now - 8500,
        isPrimary: false
      },
      {
        id: 'DEV-BIO-12',
        name: 'Operator Bio-Telemetry Vital Node',
        type: 'biometric_monitor',
        macAddress: 'F4:D4:88:65:10:E2',
        ipAddress: '10.240.5.120',
        status: 'CONNECTED',
        batteryPercent: 65,
        signalRssi: -52,
        hardwareModel: 'Garmin Tactix 7 Pro Bio-Link',
        cryptoSuite: 'BLE 5.3 Encrypted Mesh',
        roleDescription: 'Real-time heart rate, stress, and GPS telemetry feed',
        lastHeartbeat: now - 2100,
        isPrimary: false
      }
    ];
    this.saveDevices();
  }

  public subscribe(cb: DeviceListener): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach(cb => {
      try {
        cb([...this.devices]);
      } catch (err) {
        console.error('Device listener error', err);
      }
    });
  }

  public getDevices(): LinkedDevice[] {
    return [...this.devices];
  }

  public addDevice(newDevice: Omit<LinkedDevice, 'lastHeartbeat'>): LinkedDevice {
    const device: LinkedDevice = {
      ...newDevice,
      lastHeartbeat: Date.now()
    };
    this.devices.push(device);
    this.saveDevices();
    this.notify();

    systemLogManager.log(
      'DEVICE_LINK',
      'DEVICES',
      `New device linked: ${device.name} (${device.id}) [${device.type.toUpperCase()}]`,
      { deviceId: device.id, type: device.type, mac: device.macAddress }
    );

    return device;
  }

  public updateDevice(id: string, updates: Partial<LinkedDevice>): boolean {
    const idx = this.devices.findIndex(d => d.id === id);
    if (idx === -1) return false;

    this.devices[idx] = {
      ...this.devices[idx],
      ...updates,
      lastHeartbeat: Date.now()
    };
    this.saveDevices();
    this.notify();

    systemLogManager.log(
      'INFO',
      'DEVICES',
      `Device ${id} updated: ${Object.keys(updates).join(', ')}`,
      { deviceId: id, updates }
    );

    return true;
  }

  public removeDevice(id: string): boolean {
    const existing = this.devices.find(d => d.id === id);
    if (!existing) return false;

    this.devices = this.devices.filter(d => d.id !== id);
    this.saveDevices();
    this.notify();

    systemLogManager.log(
      'WARN',
      'DEVICES',
      `Device unlinked from mesh: ${existing.name} (${id})`,
      { deviceId: id }
    );

    return true;
  }

  public toggleDeviceConnection(id: string): boolean {
    const dev = this.devices.find(d => d.id === id);
    if (!dev) return false;

    const nextStatus: LinkedDevice['status'] = 
      dev.status === 'CONNECTED' ? 'STANDBY' : dev.status === 'STANDBY' ? 'DISCONNECTED' : 'CONNECTED';

    return this.updateDevice(id, { status: nextStatus });
  }
}

export const deviceManager = new DeviceManager();
