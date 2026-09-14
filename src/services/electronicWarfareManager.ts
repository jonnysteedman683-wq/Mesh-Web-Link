import { systemLogManager } from './systemLogManager';
import { droneSwarmManager } from './droneSwarmManager';

export type EmitterType = 
  | 'BARRAGE_JAMMER' 
  | 'GPS_SPOOFER' 
  | 'HOSTILE_RADAR' 
  | 'UAV_C2_UPLINK' 
  | 'SWEPT_FREQUENCY_JAMMER' 
  | 'CLANDESTINE_RELAY';

export type ThreatLevel = 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export type JammingMode = 'NONE' | 'SPOT_JAM' | 'BARRAGE_JAM' | 'SWEPT_CHIRP' | 'PULSE_DECEPTION';

export interface EwSensorStation {
  id: string;
  callsign: string;
  type: 'GROUND_STATION' | 'AIRBORNE_UAV' | 'TOWER_REPEATER' | 'MOBILE_PATROL';
  x: number; // 0 - 1000 coordinate grid (meters / scaled km)
  y: number;
  altitudeM: number;
  frequencyRangeMhz: [number, number];
  clockSyncDriftNs: number; // Nanosecond time precision for TDoA
  gainDbi: number;
  status: 'ONLINE' | 'INTERCEPTING' | 'JAMMED' | 'CALIBRATING';
  lastInterceptTime: number;
}

export interface EmitterTarget {
  id: string;
  name: string;
  type: EmitterType;
  threatLevel: ThreatLevel;
  frequencyMhz: number;
  bandwidthKhz: number;
  modulation: 'FMCW' | 'PULSE_DOPPLER' | 'QPSK' | 'CW_CARRIER' | 'CHIRP_SWEEP';
  erpWatts: number; // Effective Radiated Power
  pulseRepetitionFreqHz: number;
  trueX: number; // For simulation ground truth
  trueY: number;
  estimatedX: number; // TDoA estimated result
  estimatedY: number;
  cepRadiusMeters: number; // Circular Error Probable (50% / 95% radius)
  confidencePercent: number;
  isActive: boolean;
  isNeutralized: boolean;
  detectedAt: number;
  lastPingAt: number;
  tdoaTimeOffsetsNs: Record<string, number>; // Time offset from reference sensor in ns
  bearingAnglesDeg: Record<string, number>; // Angle from sensor in degrees
}

export interface FhssChannelMatrix {
  activeHopping: boolean;
  currentHopFrequencyMhz: number;
  hopRateHz: number; // e.g. 500 hops/sec
  dwellTimeMs: number;
  pseudoRandomSeed: string;
  channelPool: number[]; // e.g. [902.5, 908.2, 915.0, 922.4, 927.8...]
  hopIndex: number;
  antiJamMarginDb: number;
  spatialNullingBearingDeg: number;
}

export interface JammingAssessment {
  detectedMode: JammingMode;
  jammerToSignalRatioDb: number;
  affectedBandwidthMhz: number;
  linkIntegrityPercent: number;
  recommendedEccm: string;
}

export type EwUpdateListener = () => void;

class ElectronicWarfareManager {
  private sensors: EwSensorStation[] = [
    {
      id: 'sensor-alpha',
      callsign: 'SIGINT-ALPHA (HQ TOWER)',
      type: 'TOWER_REPEATER',
      x: 180,
      y: 220,
      altitudeM: 120,
      frequencyRangeMhz: [20, 3000],
      clockSyncDriftNs: 0.8,
      gainDbi: 18,
      status: 'INTERCEPTING',
      lastInterceptTime: Date.now()
    },
    {
      id: 'sensor-beta',
      callsign: 'SIGINT-BETA (WEST SENSOR POD)',
      type: 'GROUND_STATION',
      x: 780,
      y: 190,
      altitudeM: 45,
      frequencyRangeMhz: [20, 3000],
      clockSyncDriftNs: 1.2,
      gainDbi: 14,
      status: 'INTERCEPTING',
      lastInterceptTime: Date.now()
    },
    {
      id: 'sensor-gamma',
      callsign: 'SIGINT-GAMMA (SOUTH FORWARD OUTPOST)',
      type: 'MOBILE_PATROL',
      x: 320,
      y: 740,
      altitudeM: 25,
      frequencyRangeMhz: [20, 3000],
      clockSyncDriftNs: 1.5,
      gainDbi: 12,
      status: 'INTERCEPTING',
      lastInterceptTime: Date.now()
    },
    {
      id: 'sensor-delta',
      callsign: 'UAV-RECON-POD-4 (AIRBORNE)',
      type: 'AIRBORNE_UAV',
      x: 820,
      y: 710,
      altitudeM: 850,
      frequencyRangeMhz: [20, 6000],
      clockSyncDriftNs: 0.4,
      gainDbi: 22,
      status: 'INTERCEPTING',
      lastInterceptTime: Date.now()
    }
  ];

  private emitters: EmitterTarget[] = [
    {
      id: 'emitter-01',
      name: 'KRASUKHA-4 BARRAGE JAMMER (HOSTILE)',
      type: 'BARRAGE_JAMMER',
      threatLevel: 'CRITICAL',
      frequencyMhz: 915.0,
      bandwidthKhz: 26000,
      modulation: 'CHIRP_SWEEP',
      erpWatts: 1500,
      pulseRepetitionFreqHz: 4200,
      trueX: 530,
      trueY: 410,
      estimatedX: 524,
      estimatedY: 418,
      cepRadiusMeters: 14.5,
      confidencePercent: 94,
      isActive: true,
      isNeutralized: false,
      detectedAt: Date.now() - 320000,
      lastPingAt: Date.now(),
      tdoaTimeOffsetsNs: {},
      bearingAnglesDeg: {}
    },
    {
      id: 'emitter-02',
      name: 'GPS L1 SPOOFING BEACON',
      type: 'GPS_SPOOFER',
      threatLevel: 'HIGH',
      frequencyMhz: 1575.42,
      bandwidthKhz: 2046,
      modulation: 'CW_CARRIER',
      erpWatts: 250,
      pulseRepetitionFreqHz: 1023,
      trueX: 260,
      trueY: 480,
      estimatedX: 268,
      estimatedY: 472,
      cepRadiusMeters: 22.0,
      confidencePercent: 88,
      isActive: true,
      isNeutralized: false,
      detectedAt: Date.now() - 180000,
      lastPingAt: Date.now(),
      tdoaTimeOffsetsNs: {},
      bearingAnglesDeg: {}
    },
    {
      id: 'emitter-03',
      name: 'UNKNOWN HOSTILE DRONE C2 UPLINK',
      type: 'UAV_C2_UPLINK',
      threatLevel: 'HIGH',
      frequencyMhz: 2437.0,
      bandwidthKhz: 20000,
      modulation: 'QPSK',
      erpWatts: 80,
      pulseRepetitionFreqHz: 8000,
      trueX: 690,
      trueY: 340,
      estimatedX: 682,
      estimatedY: 346,
      cepRadiusMeters: 31.0,
      confidencePercent: 82,
      isActive: true,
      isNeutralized: false,
      detectedAt: Date.now() - 95000,
      lastPingAt: Date.now(),
      tdoaTimeOffsetsNs: {},
      bearingAnglesDeg: {}
    }
  ];

  private fhssMatrix: FhssChannelMatrix = {
    activeHopping: true,
    currentHopFrequencyMhz: 915.1875,
    hopRateHz: 800,
    dwellTimeMs: 1.25,
    pseudoRandomSeed: '0x7F4A-STANAG-5516-ECCM',
    channelPool: [
      902.5, 904.2, 907.8, 911.4, 915.1875, 918.6, 921.2, 924.5, 927.8, 
      1030.0, 1032.5, 1035.0, 1088.0, 1092.4, 1150.0, 1227.6
    ],
    hopIndex: 4,
    antiJamMarginDb: 28.5,
    spatialNullingBearingDeg: 142
  };

  private listeners: EwUpdateListener[] = [];
  private loopInterval: any = null;
  private fhssInterval: any = null;

  constructor() {
    this.recalculateTDoAForAll();
    this.startSimulationLoop();
    this.startFhssLoop();
  }

  // -------------------------------------------------------------
  // TDoA Hyperbolic Math & Geolocation Engine
  // -------------------------------------------------------------
  public recalculateTDoAForAll() {
    const SPEED_OF_LIGHT_SCALED = 0.3; // 0.3 grid units per nanosecond

    this.emitters.forEach(emitter => {
      if (!emitter.isActive) return;

      const offsets: Record<string, number> = {};
      const bearings: Record<string, number> = {};
      const distances: Record<string, number> = {};

      // Reference sensor is sensor-alpha
      const refSensor = this.sensors[0];
      const refDist = Math.hypot(emitter.trueX - refSensor.x, emitter.trueY - refSensor.y);
      const refTimeNs = refDist / SPEED_OF_LIGHT_SCALED;

      this.sensors.forEach(sensor => {
        const d = Math.hypot(emitter.trueX - sensor.x, emitter.trueY - sensor.y);
        distances[sensor.id] = d;

        const timeNs = d / SPEED_OF_LIGHT_SCALED;
        // Time Difference of Arrival (TDoA) relative to reference
        const noiseNs = (Math.random() - 0.5) * sensor.clockSyncDriftNs * 2;
        offsets[sensor.id] = Number((timeNs - refTimeNs + noiseNs).toFixed(2));

        // Angle of Arrival (AoA) bearing
        const rad = Math.atan2(emitter.trueY - sensor.y, emitter.trueX - sensor.x);
        let deg = (rad * 180) / Math.PI;
        if (deg < 0) deg += 360;
        bearings[sensor.id] = Number(deg.toFixed(1));
      });

      emitter.tdoaTimeOffsetsNs = offsets;
      emitter.bearingAnglesDeg = bearings;

      // Hyperbolic least-squares TDoA solver approximation with jitter
      const jitterFactor = Math.max(2, (100 - emitter.confidencePercent) / 3);
      emitter.estimatedX = Number((emitter.trueX + (Math.random() - 0.5) * jitterFactor).toFixed(1));
      emitter.estimatedY = Number((emitter.trueY + (Math.random() - 0.5) * jitterFactor).toFixed(1));
      emitter.cepRadiusMeters = Number((Math.hypot(emitter.trueX - emitter.estimatedX, emitter.trueY - emitter.estimatedY) * 1.8 + 4).toFixed(1));
      emitter.lastPingAt = Date.now();
    });

    this.notify();
  }

  // -------------------------------------------------------------
  // Emitter Threat Assessment & Jamming Analysis
  // -------------------------------------------------------------
  public getJammingAssessment(): JammingAssessment {
    const activeJammers = this.emitters.filter(e => e.isActive && !e.isNeutralized && (e.type === 'BARRAGE_JAMMER' || e.type === 'SWEPT_FREQUENCY_JAMMER'));
    
    if (activeJammers.length === 0) {
      return {
        detectedMode: 'NONE',
        jammerToSignalRatioDb: -18.2,
        affectedBandwidthMhz: 0,
        linkIntegrityPercent: 99.4,
        recommendedEccm: 'Spectrum Clean. Maintain standard crypto key refresh schedule.'
      };
    }

    const primary = activeJammers[0];
    const jsRatio = (primary.erpWatts / 100) * 8.5;
    const mode: JammingMode = primary.type === 'BARRAGE_JAMMER' ? 'BARRAGE_JAM' : 'SWEPT_CHIRP';
    const linkIntegrity = Math.max(12, Math.min(95, 100 - jsRatio * 2.2));

    return {
      detectedMode: mode,
      jammerToSignalRatioDb: Number(jsRatio.toFixed(1)),
      affectedBandwidthMhz: Number((primary.bandwidthKhz / 1000).toFixed(1)),
      linkIntegrityPercent: Number(linkIntegrity.toFixed(1)),
      recommendedEccm: `Active ${primary.name} detected. Activate STANAG-5516 FHSS 1200 hops/sec and steer adaptive spatial nulling to ${primary.bearingAnglesDeg['sensor-alpha'] || 140}° azimuth.`
    };
  }

  // -------------------------------------------------------------
  // Actions: ECCM & Jammer Countermeasures
  // -------------------------------------------------------------
  public triggerSpatialNulling(bearingDeg: number) {
    this.fhssMatrix.spatialNullingBearingDeg = bearingDeg;
    this.fhssMatrix.antiJamMarginDb = Math.min(45, this.fhssMatrix.antiJamMarginDb + 8.5);

    systemLogManager.log(
      'RF_EMISSION',
      'JAMMER',
      `Adaptive RF Spatial Nulling steered to ${bearingDeg.toFixed(1)}° azimuth. Anti-jam margin improved to +${this.fhssMatrix.antiJamMarginDb.toFixed(1)} dB.`,
      { bearingDeg, antiJamMargin: this.fhssMatrix.antiJamMarginDb }
    );

    this.notify();
  }

  public setFhssHopRate(rateHz: number) {
    this.fhssMatrix.hopRateHz = rateHz;
    this.fhssMatrix.dwellTimeMs = Number((1000 / rateHz).toFixed(2));
    this.notify();
  }

  public toggleFhss() {
    this.fhssMatrix.activeHopping = !this.fhssMatrix.activeHopping;
    systemLogManager.log(
      'INFO',
      'MESH_FABRIC',
      `Frequency Hopping Spread Spectrum (FHSS) ${this.fhssMatrix.activeHopping ? 'ACTIVATED' : 'PAUSED'}. Hop rate: ${this.fhssMatrix.hopRateHz} Hz.`,
      { active: this.fhssMatrix.activeHopping, rate: this.fhssMatrix.hopRateHz }
    );
    this.notify();
  }

  public neutralizeEmitter(emitterId: string) {
    const emitter = this.emitters.find(e => e.id === emitterId);
    if (emitter) {
      emitter.isNeutralized = true;
      emitter.isActive = false;

      systemLogManager.log(
        'SEC_AUDIT',
        'CITADEL',
        `Hostile RF Emitter [${emitter.name}] neutralized via targeted directional electronic beam suppression & UAV kinetic strike vectoring.`,
        { emitterId, type: emitter.type, location: [emitter.trueX, emitter.trueY] }
      );

      this.notify();
    }
  }

  public injectHostileEmitter(
    name: string, 
    type: EmitterType, 
    freqMhz: number, 
    erpWatts: number,
    x = Math.floor(200 + Math.random() * 600),
    y = Math.floor(200 + Math.random() * 600)
  ): EmitterTarget {
    const newEmitter: EmitterTarget = {
      id: `emitter-${Date.now()}`,
      name,
      type,
      threatLevel: type === 'BARRAGE_JAMMER' ? 'CRITICAL' : type === 'GPS_SPOOFER' ? 'HIGH' : 'ELEVATED',
      frequencyMhz: freqMhz,
      bandwidthKhz: type === 'BARRAGE_JAMMER' ? 20000 : 5000,
      modulation: type === 'BARRAGE_JAMMER' ? 'CHIRP_SWEEP' : 'QPSK',
      erpWatts,
      pulseRepetitionFreqHz: Math.floor(1000 + Math.random() * 5000),
      trueX: x,
      trueY: y,
      estimatedX: x,
      estimatedY: y,
      cepRadiusMeters: 25,
      confidencePercent: 75,
      isActive: true,
      isNeutralized: false,
      detectedAt: Date.now(),
      lastPingAt: Date.now(),
      tdoaTimeOffsetsNs: {},
      bearingAnglesDeg: {}
    };

    this.emitters.push(newEmitter);
    this.recalculateTDoAForAll();

    systemLogManager.log(
      'WARN',
      'RADAR',
      `New Unidentified RF Emitter intercepted: ${name} (${freqMhz} MHz, ${erpWatts}W ERP). TDoA triangulation running.`,
      { emitterId: newEmitter.id, freqMhz, erpWatts }
    );

    return newEmitter;
  }

  public moveSensor(sensorId: string, x: number, y: number) {
    const sensor = this.sensors.find(s => s.id === sensorId);
    if (sensor) {
      sensor.x = Math.max(50, Math.min(950, x));
      sensor.y = Math.max(50, Math.min(950, y));
      this.recalculateTDoAForAll();
    }
  }

  // -------------------------------------------------------------
  // Background Loops & Subscriptions
  // -------------------------------------------------------------
  private startSimulationLoop() {
    this.loopInterval = setInterval(() => {
      // Small sensor patrol drift for airborne UAV sensor
      const uav = this.sensors.find(s => s.type === 'AIRBORNE_UAV');
      if (uav) {
        const time = Date.now() / 8000;
        uav.x = 800 + Math.sin(time) * 90;
        uav.y = 700 + Math.cos(time) * 80;
      }

      this.recalculateTDoAForAll();
    }, 2000);
  }

  private startFhssLoop() {
    this.fhssInterval = setInterval(() => {
      if (!this.fhssMatrix.activeHopping) return;

      const pool = this.fhssMatrix.channelPool;
      this.fhssMatrix.hopIndex = (this.fhssMatrix.hopIndex + 1) % pool.length;
      this.fhssMatrix.currentHopFrequencyMhz = pool[this.fhssMatrix.hopIndex];
      this.notify();
    }, 250);
  }

  public getSensors(): EwSensorStation[] {
    return this.sensors;
  }

  public getEmitters(): EmitterTarget[] {
    return this.emitters;
  }

  public getFhssMatrix(): FhssChannelMatrix {
    return this.fhssMatrix;
  }

  public subscribe(cb: EwUpdateListener): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }
}

export const electronicWarfareManager = new ElectronicWarfareManager();
