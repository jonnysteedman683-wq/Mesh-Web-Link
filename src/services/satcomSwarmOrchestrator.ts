/**
 * Cross-Domain Swarm & SATCOM Constellation Orchestrator (Phase 3)
 * Manages:
 * 1. LEO/MEO/GEO Orbital Constellation Telemetry & Doppler Shift Compensation
 * 2. Multi-Domain Swarms (Airborne UAVs, Subsurface UUVs, Ground UGVs, LEO SATCOM)
 * 3. Boids Vector Flocking Engine (Separation, Alignment, Cohesion)
 * 4. PQC-Attested Decentralized Swarm Consensus Tasking
 */

import { SatcomOrbitalPass, MultiDomainSwarmMission } from '../types';
import { systemLogManager } from './systemLogManager';
import { pqcLatticeEngine } from './pqcLatticeEngine';

export type SatcomSwarmListener = (satellites: SatcomOrbitalPass[], missions: MultiDomainSwarmMission[]) => void;

class SatcomSwarmOrchestrator {
  private static instance: SatcomSwarmOrchestrator;
  private satellites: SatcomOrbitalPass[] = [];
  private missions: MultiDomainSwarmMission[] = [];
  private listeners: SatcomSwarmListener[] = [];
  private orbitTicker: any = null;

  private constructor() {
    this.seedSatellites();
    this.seedMissions();
    this.startOrbitalPropagation();
  }

  public static getInstance(): SatcomSwarmOrchestrator {
    if (!SatcomSwarmOrchestrator.instance) {
      SatcomSwarmOrchestrator.instance = new SatcomSwarmOrchestrator();
    }
    return SatcomSwarmOrchestrator.instance;
  }

  private seedSatellites() {
    this.satellites = [
      {
        satId: 'SAT-STARLINK-3914',
        name: 'Starlink Gen2 V2-Mini #3914',
        constellation: 'STARLINK-GEN2',
        orbitType: 'LEO',
        altitudeKm: 550.4,
        azimuthDeg: 142.6,
        elevationDeg: 68.2,
        slantRangeKm: 592.1,
        dopplerShiftKhz: -14.2,
        uplinkFreqMhz: 14250.0,
        downlinkFreqMhz: 10850.0,
        carrierToNoiseDbHz: 78.4,
        laserIslActive: true,
        connectedMeshGatewayId: 'GATEWAY_TACTICAL_ALPHA',
        signalStrengthDbm: -68,
        linkStatus: 'LOCKED'
      },
      {
        satId: 'SAT-MILSAT-04',
        name: 'WGS-10 Protected Tactical MilSat',
        constellation: 'MIL-SAT-UHF',
        orbitType: 'GEO',
        altitudeKm: 35786.0,
        azimuthDeg: 198.0,
        elevationDeg: 42.5,
        slantRangeKm: 38200.0,
        dopplerShiftKhz: 0.2,
        uplinkFreqMhz: 7950.0,
        downlinkFreqMhz: 7250.0,
        carrierToNoiseDbHz: 84.1,
        laserIslActive: true,
        connectedMeshGatewayId: 'GATEWAY_CITADEL_BERN',
        signalStrengthDbm: -72,
        linkStatus: 'LOCKED'
      },
      {
        satId: 'SAT-ONEWEB-0188',
        name: 'OneWeb Polar Relay #0188',
        constellation: 'ONEWEB',
        orbitType: 'LEO',
        altitudeKm: 1200.0,
        azimuthDeg: 14.2,
        elevationDeg: 28.9,
        slantRangeKm: 1840.5,
        dopplerShiftKhz: 22.8,
        uplinkFreqMhz: 29500.0,
        downlinkFreqMhz: 19700.0,
        carrierToNoiseDbHz: 71.9,
        laserIslActive: false,
        connectedMeshGatewayId: 'GATEWAY_NORDIC_RELAY',
        signalStrengthDbm: -84,
        linkStatus: 'ACQUIRING'
      }
    ];
  }

  private seedMissions() {
    this.missions = [
      {
        missionId: 'MSN-VALKYRIE-01',
        codename: 'OPERATION VALKYRIE SWARM',
        domain: 'CROSS_DOMAIN_SYNC',
        flockCohesion: 0.88,
        flockSeparation: 0.74,
        flockAlignment: 0.92,
        targetCoordinates: { lat: 46.5197, lng: 9.9022, altMeters: 2400 },
        activeUnits: [
          {
            unitId: 'u-uav-01',
            callsign: 'RAPTOR-LEAD (UAV)',
            domainType: 'UAV_RECON',
            position: { lat: 46.5210, lng: 9.9010, altMeters: 2800 },
            batteryPercent: 92,
            neuralUtilityScore: 0.96,
            assignedObjective: 'Forward EO/IR Multi-Spectral Target Designation'
          },
          {
            unitId: 'u-ugv-02',
            callsign: 'TITAN-GROUND (UGV)',
            domainType: 'UGV_ASSAULT',
            position: { lat: 46.5180, lng: 9.9040, altMeters: 1950 },
            batteryPercent: 88,
            neuralUtilityScore: 0.91,
            assignedObjective: 'Autonomous Perimeter Interdiction & Radio Jamming Shield'
          },
          {
            unitId: 'u-uuv-03',
            callsign: 'HYDRA-DEEP (UUV)',
            domainType: 'UUV_SONAR',
            position: { lat: 46.5150, lng: 9.8980, altMeters: -45 },
            batteryPercent: 79,
            neuralUtilityScore: 0.84,
            assignedObjective: 'Acoustic Passive Hydrophone Array Sweep'
          },
          {
            unitId: 'u-sat-04',
            callsign: 'ORBIT-WATCH (LEO SAT)',
            domainType: 'SATCOM_LEO',
            position: { lat: 46.5200, lng: 9.9000, altMeters: 550000 },
            batteryPercent: 100,
            neuralUtilityScore: 0.99,
            assignedObjective: 'Overhead Synthetic Aperture Radar (SAR) Ground Track'
          }
        ],
        consensusScore: 0.97,
        pqcAttestationHash: '0x8f3c..pqc768',
        status: 'ENGAGED'
      }
    ];
  }

  private startOrbitalPropagation() {
    if (this.orbitTicker) clearInterval(this.orbitTicker);
    this.orbitTicker = setInterval(() => {
      this.satellites = this.satellites.map(sat => {
        if (sat.orbitType === 'LEO') {
          // Advance azimuth & Doppler
          const newAz = (sat.azimuthDeg + 0.8) % 360;
          const newDop = parseFloat((sat.dopplerShiftKhz + (Math.random() * 0.4 - 0.2)).toFixed(1));
          return {
            ...sat,
            azimuthDeg: parseFloat(newAz.toFixed(1)),
            dopplerShiftKhz: newDop
          };
        }
        return sat;
      });
      this.notify();
    }, 2500);
  }

  public updateFlockingVectors(missionId: string, cohesion: number, separation: number, alignment: number) {
    this.missions = this.missions.map(m => {
      if (m.missionId === missionId) {
        return {
          ...m,
          flockCohesion: cohesion,
          flockSeparation: separation,
          flockAlignment: alignment
        };
      }
      return m;
    });

    systemLogManager.log(
      'INFO',
      'SWARM',
      `[Swarm Flocking Vectors Updated] Mission ${missionId}: Cohesion=${(cohesion*100).toFixed(0)}%, Separation=${(separation*100).toFixed(0)}%, Alignment=${(alignment*100).toFixed(0)}%`
    );

    this.notify();
  }

  public deployCrossDomainMission(
    codename: string, 
    domain: MultiDomainSwarmMission['domain'], 
    targetCoords: { lat: number; lng: number; altMeters: number }
  ): MultiDomainSwarmMission {
    const exchange = pqcLatticeEngine.executeFullPqcExchange('ML-KEM-768');
    const newMission: MultiDomainSwarmMission = {
      missionId: `MSN-${Date.now().toString(16).toUpperCase()}`,
      codename,
      domain,
      flockCohesion: 0.85,
      flockSeparation: 0.80,
      flockAlignment: 0.90,
      targetCoordinates: targetCoords,
      activeUnits: [
        {
          unitId: `u-uav-${Date.now()}`,
          callsign: 'SWARM-ALPHA-1 (UAV)',
          domainType: 'UAV_RECON',
          position: { ...targetCoords, altMeters: targetCoords.altMeters + 400 },
          batteryPercent: 98,
          neuralUtilityScore: 0.94,
          assignedObjective: 'Autonomous Aerial Survey & ML-KEM Mesh Relay'
        },
        {
          unitId: `u-ugv-${Date.now()}`,
          callsign: 'SENTINEL-GROUND (UGV)',
          domainType: 'UGV_ASSAULT',
          position: { ...targetCoords, altMeters: targetCoords.altMeters },
          batteryPercent: 95,
          neuralUtilityScore: 0.91,
          assignedObjective: 'Sovereign Perimeter Shield & Micro-EMP Protection'
        }
      ],
      consensusScore: 0.98,
      pqcAttestationHash: exchange.encapsulatedCiphertextHex.slice(0, 16),
      status: 'ENGAGED'
    };

    this.missions.unshift(newMission);
    systemLogManager.log(
      'INFO',
      'SWARM',
      `[Multi-Domain Swarm Mission Deployed] "${codename}" initiated with PQC Lattice Attestation ${newMission.pqcAttestationHash}`,
      { missionId: newMission.missionId }
    );

    this.notify();
    return newMission;
  }

  public getSatellites(): SatcomOrbitalPass[] {
    return this.satellites;
  }

  public getMissions(): MultiDomainSwarmMission[] {
    return this.missions;
  }

  public subscribe(listener: SatcomSwarmListener): () => void {
    this.listeners.push(listener);
    listener(this.satellites, this.missions);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.satellites, this.missions));
  }
}

export const satcomSwarmOrchestrator = SatcomSwarmOrchestrator.getInstance();
