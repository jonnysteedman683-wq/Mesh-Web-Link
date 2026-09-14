/**
 * Drone Swarm & Aerial Reconnaissance Manager
 * Real-time telemetry, waypoint dispatch, payload management, and circuit-broken failsafes.
 */

import { DroneSwarmUnit, DroneFlightMode, DronePayloadType } from '../types';
import { systemLogManager } from './systemLogManager';
import { webCrypto } from './webCrypto';

type DroneListener = (drones: DroneSwarmUnit[]) => void;

export class DroneSwarmManager {
  private static instance: DroneSwarmManager;
  private drones: DroneSwarmUnit[] = [];
  private listeners: DroneListener[] = [];
  private telemetryInterval: any = null;
  private readonly STORAGE_KEY = 'mesh_drone_swarm_v1';

  private constructor() {
    this.initDrones();
    this.startTelemetryCycle();
  }

  public static getInstance(): DroneSwarmManager {
    if (!DroneSwarmManager.instance) {
      DroneSwarmManager.instance = new DroneSwarmManager();
    }
    return DroneSwarmManager.instance;
  }

  private initDrones() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.drones = JSON.parse(saved);
        return;
      } catch (e) {
        console.warn('Failed to parse cached drone telemetry', e);
      }
    }

    // Default Operational Swarm (Air Recon Squadron 9)
    this.drones = [
      {
        id: 'UAV-ALPHA-01',
        callsign: 'Valkyrie-One',
        model: 'MQ-9M Stealth Recon',
        flightMode: 'AUTONOMOUS_ORBIT',
        batteryPercent: 88,
        altitudeMeters: 4850,
        groundSpeedKts: 142,
        headingDeg: 275,
        latitude: 46.5204,
        longitude: 6.6342,
        rfLinkQualityPercent: 96,
        rssiDbm: -48,
        payload: 'EO_IR_OPTICAL',
        payloadStatus: 'ACTIVE',
        gpsLockSatellites: 18,
        targetSector: 'SECTOR-7 (JURA RIDGE)',
        isArmed: false,
        isolationStatus: 'HEALTHY',
        lastTelemetryPing: Date.now(),
        flightPath: [
          { x: 30, y: 40 },
          { x: 45, y: 55 },
          { x: 60, y: 45 },
          { x: 40, y: 35 },
          { x: 30, y: 40 }
        ]
      },
      {
        id: 'UAV-BRAVO-02',
        callsign: 'Ghost-Two',
        model: 'RQ-4X Global Eye',
        flightMode: 'WAYPOINT_PATROL',
        batteryPercent: 74,
        altitudeMeters: 8200,
        groundSpeedKts: 210,
        headingDeg: 45,
        latitude: 46.5812,
        longitude: 6.7201,
        rfLinkQualityPercent: 91,
        rssiDbm: -56,
        payload: 'SIGINT_INTERCEPT',
        payloadStatus: 'ACTIVE',
        gpsLockSatellites: 22,
        targetSector: 'SECTOR-12 (VALAIS AIRSPACE)',
        isArmed: false,
        isolationStatus: 'HEALTHY',
        lastTelemetryPing: Date.now(),
        flightPath: [
          { x: 70, y: 25 },
          { x: 80, y: 35 },
          { x: 75, y: 50 },
          { x: 65, y: 30 }
        ]
      },
      {
        id: 'UAV-CHARLIE-03',
        callsign: 'Apex-Relay',
        model: 'AeroVironment Puma AE-4',
        flightMode: 'RF_RELAY_STATION',
        batteryPercent: 62,
        altitudeMeters: 1850,
        groundSpeedKts: 65,
        headingDeg: 180,
        latitude: 46.4911,
        longitude: 6.5502,
        rfLinkQualityPercent: 98,
        rssiDbm: -42,
        payload: 'MESH_RF_EXTENDER',
        payloadStatus: 'ACTIVE',
        gpsLockSatellites: 16,
        targetSector: 'SECTOR-3 (LAKE GENEVA MESH GAP)',
        isArmed: false,
        isolationStatus: 'HEALTHY',
        lastTelemetryPing: Date.now(),
        flightPath: [
          { x: 50, y: 70 },
          { x: 52, y: 72 },
          { x: 48, y: 68 }
        ]
      },
      {
        id: 'UAV-DELTA-04',
        callsign: 'Spectre-Lidar',
        model: 'Skydio X10D Tactical',
        flightMode: 'PERIMETER_SURVEILLANCE',
        batteryPercent: 92,
        altitudeMeters: 420,
        groundSpeedKts: 38,
        headingDeg: 310,
        latitude: 46.5118,
        longitude: 6.6119,
        rfLinkQualityPercent: 89,
        rssiDbm: -62,
        payload: 'LIDAR_MAPPING',
        payloadStatus: 'ACTIVE',
        gpsLockSatellites: 14,
        targetSector: 'SECTOR-1 (CITADEL OUTER PERIMETER)',
        isArmed: false,
        isolationStatus: 'HEALTHY',
        lastTelemetryPing: Date.now(),
        flightPath: [
          { x: 25, y: 80 },
          { x: 35, y: 85 },
          { x: 30, y: 75 }
        ]
      }
    ];

    this.saveDrones();
  }

  private saveDrones() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.drones));
    } catch (e) {
      console.warn('Failed to save drones', e);
    }
  }

  private notify() {
    this.listeners.forEach(cb => cb([...this.drones]));
  }

  public subscribe(cb: DroneListener): () => void {
    this.listeners.push(cb);
    cb([...this.drones]);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  public getDrones(): DroneSwarmUnit[] {
    return [...this.drones];
  }

  /**
   * Continuous telemetry cycle updating battery, jitter, and coordinates
   */
  private startTelemetryCycle() {
    if (this.telemetryInterval) clearInterval(this.telemetryInterval);

    this.telemetryInterval = setInterval(() => {
      this.drones = this.drones.map(drone => {
        if (drone.isolationStatus === 'ISOLATED') return drone;

        // Micro telemetry drift
        const batteryDrain = Math.random() > 0.85 ? 0.2 : 0;
        const newBattery = Math.max(5, parseFloat((drone.batteryPercent - batteryDrain).toFixed(1)));
        const altJitter = Math.floor((Math.random() - 0.5) * 6);
        const headingJitter = Math.floor((Math.random() - 0.5) * 4);
        const rssiJitter = Math.floor((Math.random() - 0.5) * 3);

        return {
          ...drone,
          batteryPercent: newBattery,
          altitudeMeters: Math.max(50, drone.altitudeMeters + altJitter),
          headingDeg: (drone.headingDeg + headingJitter + 360) % 360,
          rssiDbm: Math.min(-30, Math.max(-95, drone.rssiDbm + rssiJitter)),
          rfLinkQualityPercent: Math.max(40, Math.min(100, drone.rfLinkQualityPercent + Math.floor((Math.random() - 0.5) * 2))),
          lastTelemetryPing: Date.now()
        };
      });

      this.notify();
    }, 2500);
  }

  /**
   * Set flight mode for a specific drone
   */
  public async setFlightMode(droneId: string, mode: DroneFlightMode): Promise<void> {
    this.drones = this.drones.map(d => (d.id === droneId ? { ...d, flightMode: mode } : d));
    this.saveDrones();
    this.notify();

    const drone = this.drones.find(d => d.id === droneId);
    systemLogManager.log(
      'INFO',
      'DRONES',
      `Flight Directive Updated for ${drone?.callsign || droneId}: set to [${mode}]`,
      { droneId, mode }
    );
  }

  /**
   * Switch optical/SIGINT payload
   */
  public async setPayload(droneId: string, payload: DronePayloadType): Promise<void> {
    this.drones = this.drones.map(d => (d.id === droneId ? { ...d, payload, payloadStatus: 'CALIBRATING' } : d));
    this.saveDrones();
    this.notify();

    setTimeout(() => {
      this.drones = this.drones.map(d => (d.id === droneId ? { ...d, payloadStatus: 'ACTIVE' } : d));
      this.saveDrones();
      this.notify();
    }, 1200);

    systemLogManager.log(
      'INFO',
      'DRONES',
      `Drone ${droneId} re-configured payload sensor package to: ${payload}`,
      { droneId, payload }
    );
  }

  /**
   * Execute full-spectrum electromagnetic and kinetic reconnaissance across perimeter sectors
   */
  public executeFullSpectrumPerimeterRecon(): void {
    const reconSectors = [
      {
        sector: 'SECTOR 7-G (NORTH PERIMETER & ORBITAL UPLINK)',
        mode: 'WAYPOINT_PATROL' as DroneFlightMode,
        payload: 'EO_IR_OPTICAL' as DronePayloadType,
        alt: 5400,
        speed: 165,
        path: [{ x: 20, y: 20 }, { x: 50, y: 15 }, { x: 80, y: 20 }, { x: 50, y: 30 }]
      },
      {
        sector: 'SECTOR 12 (EAST FLANK ELINT/SIGINT CORRIDOR)',
        mode: 'PERIMETER_SURVEILLANCE' as DroneFlightMode,
        payload: 'SIGINT_INTERCEPT' as DronePayloadType,
        alt: 8800,
        speed: 220,
        path: [{ x: 75, y: 20 }, { x: 85, y: 50 }, { x: 75, y: 80 }, { x: 65, y: 50 }]
      },
      {
        sector: 'SECTOR 3 (TACTICAL CORRIDOR DELTA MESH)',
        mode: 'RF_RELAY_STATION' as DroneFlightMode,
        payload: 'MESH_RF_EXTENDER' as DronePayloadType,
        alt: 2100,
        speed: 75,
        path: [{ x: 45, y: 65 }, { x: 55, y: 65 }, { x: 50, y: 75 }]
      },
      {
        sector: 'SECTOR 9 (SOUTHERN RECON GRID & KINETIC LOCK)',
        mode: 'PERIMETER_SURVEILLANCE' as DroneFlightMode,
        payload: 'LIDAR_MAPPING' as DronePayloadType,
        alt: 450,
        speed: 42,
        path: [{ x: 25, y: 75 }, { x: 50, y: 85 }, { x: 75, y: 75 }, { x: 50, y: 65 }]
      }
    ];

    this.drones = this.drones.map((drone, idx) => {
      const plan = reconSectors[idx % reconSectors.length];
      return {
        ...drone,
        flightMode: plan.mode,
        payload: plan.payload,
        payloadStatus: 'ACTIVE',
        targetSector: plan.sector,
        altitudeMeters: plan.alt,
        groundSpeedKts: plan.speed,
        isolationStatus: 'HEALTHY',
        rfLinkQualityPercent: Math.min(100, Math.max(92, drone.rfLinkQualityPercent + 5)),
        rssiDbm: Math.min(-35, drone.rssiDbm + 8),
        lastTelemetryPing: Date.now(),
        flightPath: plan.path
      };
    });

    this.saveDrones();
    this.notify();

    systemLogManager.log(
      'INFO',
      'DRONES',
      'OPERATION OMEGA RECON: Full-spectrum electromagnetic and kinetic reconnaissance initialized across 4 perimeter sectors.',
      {
        totalDronesEngaged: this.drones.length,
        sectorsTargeted: reconSectors.map(s => s.sector),
        sensorArray: ['EO/IR High-Res Optical', 'SIGINT/ELINT Spectrum Scanner', 'Mesh RF Data Extender', '3D LiDAR Kinetic Pointcloud']
      }
    );
  }

  /**
   * Emergency Return to Base (RTB) for single drone or entire swarm
   */
  public returnAllToBase(): void {
    this.drones = this.drones.map(d => ({
      ...d,
      flightMode: 'RETURN_TO_BASE'
    }));
    this.saveDrones();
    this.notify();

    systemLogManager.log(
      'WARN',
      'DRONES',
      'CRITICAL: Emergency RETURN_TO_BASE broadcast executed for entire aerial drone swarm.',
      { affectedUnits: this.drones.length }
    );
  }

  /**
   * Isolate compromised drone from mesh RF relay
   */
  public toggleDroneIsolation(droneId: string): void {
    this.drones = this.drones.map(d => {
      if (d.id !== droneId) return d;
      const nextStatus = d.isolationStatus === 'ISOLATED' ? 'HEALTHY' : 'ISOLATED';
      return {
        ...d,
        isolationStatus: nextStatus,
        flightMode: nextStatus === 'ISOLATED' ? 'FAILSAFE_RETURN' : 'AUTONOMOUS_ORBIT'
      };
    });
    this.saveDrones();
    this.notify();

    const target = this.drones.find(d => d.id === droneId);
    systemLogManager.log(
      target?.isolationStatus === 'ISOLATED' ? 'CRITICAL' : 'INFO',
      'DRONES',
      `Drone ${droneId} RF link isolation status toggled to: [${target?.isolationStatus}]`,
      { droneId, status: target?.isolationStatus }
    );
  }

  /**
   * Deploy a new drone into the swarm
   */
  public async deployDrone(callsign: string, model: string, payload: DronePayloadType): Promise<void> {
    const id = `UAV-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`;
    const newDrone: DroneSwarmUnit = {
      id,
      callsign,
      model,
      flightMode: 'AUTONOMOUS_ORBIT',
      batteryPercent: 100,
      altitudeMeters: Math.floor(Math.random() * 3000 + 1000),
      groundSpeedKts: Math.floor(Math.random() * 100 + 80),
      headingDeg: Math.floor(Math.random() * 360),
      latitude: 46.52 + (Math.random() - 0.5) * 0.1,
      longitude: 6.63 + (Math.random() - 0.5) * 0.1,
      rfLinkQualityPercent: 99,
      rssiDbm: -38,
      payload,
      payloadStatus: 'ACTIVE',
      gpsLockSatellites: 18,
      targetSector: 'SECTOR-ALPHA (EXPEDITIONARY)',
      isArmed: false,
      isolationStatus: 'HEALTHY',
      lastTelemetryPing: Date.now(),
      flightPath: [
        { x: 40 + Math.random() * 20, y: 40 + Math.random() * 20 },
        { x: 50 + Math.random() * 20, y: 50 + Math.random() * 20 }
      ]
    };

    this.drones.unshift(newDrone);
    this.saveDrones();
    this.notify();

    systemLogManager.log(
      'INFO',
      'DRONES',
      `Tactical aerial drone launched and synchronized into mesh fabric: ${callsign} (${id}).`,
      { newDrone }
    );
  }

  /**
   * Ingests real-time external telemetry from WebSerial GNSS or WebUSB SDR radio packets
   * into the battle grid drone swarm.
   */
  public ingestExternalTelemetry(telemetry: {
    id: string;
    callsign?: string;
    model?: string;
    latitude: number;
    longitude: number;
    altitudeMeters?: number;
    groundSpeedKts?: number;
    headingDeg?: number;
    rssiDbm?: number;
  }): void {
    const existingIndex = this.drones.findIndex(d => d.id === telemetry.id);
    const now = Date.now();

    if (existingIndex >= 0) {
      const drone = this.drones[existingIndex];
      this.drones[existingIndex] = {
        ...drone,
        latitude: telemetry.latitude,
        longitude: telemetry.longitude,
        altitudeMeters: telemetry.altitudeMeters ?? drone.altitudeMeters,
        groundSpeedKts: telemetry.groundSpeedKts ?? drone.groundSpeedKts,
        headingDeg: telemetry.headingDeg ?? drone.headingDeg,
        rssiDbm: telemetry.rssiDbm ?? drone.rssiDbm,
        lastTelemetryPing: now,
        flightPath: [
          ...drone.flightPath.slice(-15),
          { x: Math.round((telemetry.longitude % 1) * 100), y: Math.round((telemetry.latitude % 1) * 100) }
        ]
      };
    } else {
      const newUnit: DroneSwarmUnit = {
        id: telemetry.id,
        callsign: telemetry.callsign || `HARDWARE-NODE-${telemetry.id.slice(-4)}`,
        model: telemetry.model || 'External Hardware Radio/GNSS Node',
        flightMode: 'AUTONOMOUS_ORBIT',
        batteryPercent: 95,
        altitudeMeters: telemetry.altitudeMeters || 120,
        groundSpeedKts: telemetry.groundSpeedKts || 18,
        headingDeg: telemetry.headingDeg || 45,
        latitude: telemetry.latitude,
        longitude: telemetry.longitude,
        rfLinkQualityPercent: 98,
        rssiDbm: telemetry.rssiDbm || -55,
        payload: 'SIGINT_INTERCEPT',
        payloadStatus: 'ACTIVE',
        gpsLockSatellites: 14,
        targetSector: 'SECTOR-GRID (EXTERNAL INGEST)',
        isArmed: false,
        isolationStatus: 'HEALTHY',
        lastTelemetryPing: now,
        flightPath: [
          { x: 50, y: 50 }
        ]
      };
      this.drones.push(newUnit);
    }

    this.saveDrones();
    this.notify();
  }
}

export const droneSwarmManager = DroneSwarmManager.getInstance();
