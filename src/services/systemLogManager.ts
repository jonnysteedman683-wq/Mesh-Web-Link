import { SystemLogEntry } from '../types';

export type LogListener = (entry: SystemLogEntry) => void;

class SystemLogManager {
  private logs: SystemLogEntry[] = [];
  private listeners: LogListener[] = [];
  private readonly STORAGE_KEY = 'mesh_citadel_system_logs_v1';

  constructor() {
    this.loadLogs();
    if (this.logs.length === 0) {
      this.seedInitialLogs();
    }
  }

  private loadLogs() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = window.localStorage.getItem(this.STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            this.logs = parsed.slice(0, 300);
          }
        }
      }
    } catch (e) {
      console.warn('Could not load system logs', e);
    }
  }

  private saveLogs() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs.slice(0, 200)));
      }
    } catch (e) {
      // ignore quota limits
    }
  }

  private seedInitialLogs() {
    const now = Date.now();
    const initial: SystemLogEntry[] = [
      {
        id: 'log-101',
        timestamp: now - 320000,
        level: 'INFO',
        subsystem: 'WEATHER',
        message: 'Tactical Recon Station Alpha weather station telemetry locked: 19.4°C, 1014.2 hPa, RF Propagation Optimal.',
        details: { tempC: 19.4, pressure: 1014.2, rfIndex: 'OPTIMAL' },
        hashSignature: '0x3a9f..c290'
      },
      {
        id: 'log-102',
        timestamp: now - 280000,
        level: 'DEVICE_LINK',
        subsystem: 'DEVICES',
        message: 'Linked Device DEV-UAV-01 (Hermes Recon Drone) established authenticated link via ECC P-384.',
        details: { deviceId: 'DEV-UAV-01', rssi: -58, battery: 94 },
        hashSignature: '0x8f2d..911a'
      },
      {
        id: 'log-103',
        timestamp: now - 210000,
        level: 'SEC_AUDIT',
        subsystem: 'CITADEL',
        message: 'Citadel Sovereign Bank ledger balance verified: Cleared $128.4M, Physical Cash $38.5M, Assets $401.5M.',
        details: { auditedBy: 'ZKP-Attestation-Loop', quorum: '5-of-7' },
        hashSignature: '0x17b3..ff9e'
      },
      {
        id: 'log-104',
        timestamp: now - 150000,
        level: 'INFO',
        subsystem: '4D_ENGINE',
        message: '4D Geometric Hyper-Hexagonal space initialized with 4-plane rotational manifold (XY, ZW, XW, YW).',
        details: { geometry: 'Hexagonal-Hyperprism-4D', vertices: 24, bars: 36 },
        hashSignature: '0x99aa..21cb'
      },
      {
        id: 'log-105',
        timestamp: now - 90000,
        level: 'RF_EMISSION',
        subsystem: 'JAMMER',
        message: 'Airborne Electronic Warfare pod AN/ALQ-99 armed on 341.225 MHz with J/S ratio +26 dB.',
        details: { carrierMhz: 341.225, powerW: 450, mode: 'directed_hpm' },
        hashSignature: '0xbc41..67d4'
      },
      {
        id: 'log-106',
        timestamp: now - 35000,
        level: 'INFO',
        subsystem: 'AUTO_CHECK',
        message: 'Automatic verification loop completed cycle 842. All 16 STANAG-5516 checksums validated.',
        details: { cycle: 842, passed: true },
        hashSignature: '0x7e88..01af'
      }
    ];
    this.logs = initial;
    this.saveLogs();
  }

  public subscribe(cb: LogListener): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  public getLogs(): SystemLogEntry[] {
    return [...this.logs];
  }

  public log(
    level: SystemLogEntry['level'],
    subsystem: SystemLogEntry['subsystem'],
    message: string,
    details?: any
  ): SystemLogEntry {
    const entry: SystemLogEntry = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      level,
      subsystem,
      message,
      details,
      hashSignature: `0x${Math.random().toString(16).substring(2, 10)}..${Math.random().toString(16).substring(2, 6)}`
    };

    this.logs.unshift(entry);
    if (this.logs.length > 300) {
      this.logs.pop();
    }
    this.saveLogs();

    this.listeners.forEach(cb => {
      try {
        cb(entry);
      } catch (err) {
        console.error('Log listener error', err);
      }
    });

    return entry;
  }

  public clearLogs() {
    this.logs = [];
    this.saveLogs();
    const entry = this.log('INFO', 'AUTO_CHECK', 'System logs cleared by command user.');
    return entry;
  }
}

export const systemLogManager = new SystemLogManager();
