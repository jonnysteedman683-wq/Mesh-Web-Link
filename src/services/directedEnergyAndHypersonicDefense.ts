/**
 * Directed Energy (DEW) Counter-UAS & Hypersonic Intercept Defense Grid (Phase 4)
 * Manages:
 * 1. 100kW High-Energy Laser (HEL) & Active Phased High-Power Microwave (HPM) Fire Control
 * 2. Hypersonic Glide Vehicle (HGV) Track Extrapolation & Kalman Filter Intercept Geometry
 * 3. Beam Thermal Blooming, Dwell-Time Countdown, and Hypervelocity Kinetic Neutralization
 */

import { DirectedEnergyWeaponUnit, HypersonicThreatTrack } from '../types';
import { systemLogManager } from './systemLogManager';
import { tactileAudio } from './tactileAudio';

export type DewDefenseListener = (
  weapons: DirectedEnergyWeaponUnit[],
  threats: HypersonicThreatTrack[]
) => void;

class DirectedEnergyAndHypersonicDefense {
  private static instance: DirectedEnergyAndHypersonicDefense;
  private weapons: DirectedEnergyWeaponUnit[] = [];
  private threats: HypersonicThreatTrack[] = [];
  private listeners: DewDefenseListener[] = [];
  private simulationInterval: any = null;

  private constructor() {
    this.seedWeapons();
    this.seedThreats();
    this.startDefenseLoop();
  }

  public static getInstance(): DirectedEnergyAndHypersonicDefense {
    if (!DirectedEnergyAndHypersonicDefense.instance) {
      DirectedEnergyAndHypersonicDefense.instance = new DirectedEnergyAndHypersonicDefense();
    }
    return DirectedEnergyAndHypersonicDefense.instance;
  }

  private seedWeapons() {
    this.weapons = [
      {
        unitId: 'DEW-HEL-ATHENA',
        name: 'ATHENA-100 High-Energy Tactical Fiber Laser',
        type: 'TACTICAL_FIBER_LASER_100KW',
        opticalWavelengthNm: 1064.0, // Nd:YAG / Ytterbium fiber wavelength
        continuousPowerKw: 100.0,
        capacitorChargePercent: 98,
        coolingLoopTempC: 38.4,
        maxCoolingTempC: 85.0,
        thermalBloomingFactor: 0.12,
        beamJitterMicrorad: 1.4,
        targetLockedTrackId: 'TRK-HGV-9901',
        firingState: 'STANDBY',
        dwellTimeRemainingMs: 0,
        shotsFiredCount: 14,
        interceptionsConfirmed: 12
      },
      {
        unitId: 'DEW-HPM-THOR',
        name: 'THOR Active Phased High-Power Microwave (HPM)',
        type: 'HIGH_POWER_MICROWAVE_PHASED',
        opticalWavelengthNm: 125000000.0, // 2.4 GHz microwave band in nm
        continuousPowerKw: 450.0,
        capacitorChargePercent: 100,
        coolingLoopTempC: 42.1,
        maxCoolingTempC: 90.0,
        thermalBloomingFactor: 0.02,
        beamJitterMicrorad: 8.5,
        firingState: 'STANDBY',
        dwellTimeRemainingMs: 0,
        shotsFiredCount: 28,
        interceptionsConfirmed: 26
      },
      {
        unitId: 'KIN-RAIL-ODIN',
        name: 'ODIN Hypervelocity Electromagnetic Kinetic Railgun',
        type: 'KINETIC_RAILGUN_HYPERVELOCITY',
        opticalWavelengthNm: 0,
        continuousPowerKw: 3200.0, // Peak pulse power (MW equivalent)
        capacitorChargePercent: 92,
        coolingLoopTempC: 51.2,
        maxCoolingTempC: 110.0,
        thermalBloomingFactor: 0.0,
        beamJitterMicrorad: 0.8,
        firingState: 'STANDBY',
        dwellTimeRemainingMs: 0,
        shotsFiredCount: 6,
        interceptionsConfirmed: 5
      }
    ];
  }

  private seedThreats() {
    this.threats = [
      {
        trackId: 'TRK-HGV-9901',
        classification: 'HGV_AVANGARD_CLASS',
        originLaunchVector: 'Vector 038° (High Northern Sub-Orbital)',
        currentPosition: { lat: 48.120, lng: 11.450, altKm: 34.2 },
        velocityMach: 14.6,
        headingDeg: 215.4,
        climbRateMs: -450.0,
        skipGlideManeuvering: true,
        plasmaSheathBlackout: true,
        predictedImpactCoordinates: { lat: 46.520, lng: 9.900 },
        timeToImpactSeconds: 42.8,
        assignedInterceptorUnitId: 'DEW-HEL-ATHENA',
        interceptProbabilityPk: 94.2,
        interceptGeometryStatus: 'INTERCEPT_VECTOR_LOCKED'
      },
      {
        trackId: 'TRK-HCM-4402',
        classification: 'HCM_SCRAMJET_CRUISE',
        originLaunchVector: 'Vector 112° (Low Coastal Ingress)',
        currentPosition: { lat: 45.880, lng: 12.100, altKm: 18.5 },
        velocityMach: 6.8,
        headingDeg: 290.1,
        climbRateMs: -12.0,
        skipGlideManeuvering: false,
        plasmaSheathBlackout: false,
        predictedImpactCoordinates: { lat: 46.522, lng: 9.905 },
        timeToImpactSeconds: 68.4,
        assignedInterceptorUnitId: 'KIN-RAIL-ODIN',
        interceptProbabilityPk: 88.7,
        interceptGeometryStatus: 'CALCULATING_SOLUTION'
      }
    ];
  }

  private startDefenseLoop() {
    if (this.simulationInterval) clearInterval(this.simulationInterval);
    this.simulationInterval = setInterval(() => {
      // 1. Advance hypersonic tracks
      this.threats = this.threats.map(t => {
        if (t.interceptGeometryStatus === 'TARGET_NEUTRALIZED') return t;

        const newTti = Math.max(0, parseFloat((t.timeToImpactSeconds - 1.0).toFixed(1)));
        const newAlt = Math.max(0, parseFloat((t.currentPosition.altKm - (t.velocityMach * 0.05)).toFixed(1)));
        
        return {
          ...t,
          timeToImpactSeconds: newTti,
          currentPosition: {
            ...t.currentPosition,
            altKm: newAlt,
            lat: parseFloat((t.currentPosition.lat + 0.005).toFixed(3)),
            lng: parseFloat((t.currentPosition.lng - 0.005).toFixed(3))
          }
        };
      });

      // 2. Advance active firing dwells & capacitors
      this.weapons = this.weapons.map(w => {
        if (w.firingState === 'ENGAGING_LASER' && w.dwellTimeRemainingMs > 0) {
          const nextDwell = Math.max(0, w.dwellTimeRemainingMs - 1000);
          const nextTemp = parseFloat((w.coolingLoopTempC + 4.2).toFixed(1));
          const nextCap = Math.max(0, w.capacitorChargePercent - 8);

          if (nextDwell === 0) {
            // Target destroyed
            this.confirmNeutralization(w.unitId, w.targetLockedTrackId);
            return {
              ...w,
              firingState: 'COOLING_DOWN',
              dwellTimeRemainingMs: 0,
              coolingLoopTempC: nextTemp,
              capacitorChargePercent: nextCap,
              shotsFiredCount: w.shotsFiredCount + 1,
              interceptionsConfirmed: w.interceptionsConfirmed + 1
            };
          }

          return {
            ...w,
            dwellTimeRemainingMs: nextDwell,
            coolingLoopTempC: nextTemp,
            capacitorChargePercent: nextCap
          };
        } else if (w.firingState === 'COOLING_DOWN') {
          const cooledTemp = Math.max(38.0, parseFloat((w.coolingLoopTempC - 2.5).toFixed(1)));
          const chargedCap = Math.min(100, w.capacitorChargePercent + 5);
          return {
            ...w,
            coolingLoopTempC: cooledTemp,
            capacitorChargePercent: chargedCap,
            firingState: cooledTemp <= 45.0 ? 'STANDBY' : 'COOLING_DOWN'
          };
        }
        return w;
      });

      this.notify();
    }, 1000);
  }

  public fireDirectedEnergyBeam(unitId: string, trackId: string, dwellMs: number = 3000) {
    tactileAudio.playVaultServo();
    this.weapons = this.weapons.map(w => {
      if (w.unitId === unitId) {
        return {
          ...w,
          targetLockedTrackId: trackId,
          firingState: 'ENGAGING_LASER',
          dwellTimeRemainingMs: dwellMs
        };
      }
      return w;
    });

    this.threats = this.threats.map(t => {
      if (t.trackId === trackId) {
        return {
          ...t,
          assignedInterceptorUnitId: unitId,
          interceptGeometryStatus: 'ENGAGED'
        };
      }
      return t;
    });

    systemLogManager.log(
      'ALERT',
      'JAMMER',
      `[DEW Fire Control Engaged] ${unitId} directed 100kW coherent laser beam onto target ${trackId} (Dwell: ${dwellMs}ms)`
    );

    this.notify();
  }

  private confirmNeutralization(unitId: string, trackId?: string) {
    if (!trackId) return;
    this.threats = this.threats.map(t => {
      if (t.trackId === trackId) {
        return {
          ...t,
          interceptGeometryStatus: 'TARGET_NEUTRALIZED',
          interceptProbabilityPk: 100.0
        };
      }
      return t;
    });

    systemLogManager.log(
      'INFO',
      'JAMMER',
      `[Hypersonic Target Neutralized] ${trackId} structural aerothermal failure confirmed by optical thermal bloom telemetry.`
    );
  }

  public injectHypersonicThreat(classification: HypersonicThreatTrack['classification'], velocityMach: number) {
    tactileAudio.playLaserShot();
    const newThreat: HypersonicThreatTrack = {
      trackId: `TRK-HGV-${Math.floor(1000 + Math.random() * 9000)}`,
      classification,
      originLaunchVector: `Vector ${(Math.random() * 360).toFixed(0)}° (Deep Sub-Orbital Boost)`,
      currentPosition: { lat: 48.500, lng: 12.500, altKm: 42.0 },
      velocityMach,
      headingDeg: parseFloat((Math.random() * 360).toFixed(1)),
      climbRateMs: -520.0,
      skipGlideManeuvering: true,
      plasmaSheathBlackout: velocityMach > 10.0,
      predictedImpactCoordinates: { lat: 46.520, lng: 9.900 },
      timeToImpactSeconds: parseFloat((35.0 + Math.random() * 30.0).toFixed(1)),
      interceptProbabilityPk: 91.5,
      interceptGeometryStatus: 'CALCULATING_SOLUTION'
    };

    this.threats.unshift(newThreat);
    systemLogManager.log(
      'CRITICAL',
      'RADAR',
      `[Hypersonic Threat Alert] New ${classification} detected traveling at Mach ${velocityMach} (Plasma blackout active).`
    );

    this.notify();
    return newThreat;
  }

  public getWeapons(): DirectedEnergyWeaponUnit[] {
    return this.weapons;
  }

  public getThreats(): HypersonicThreatTrack[] {
    return this.threats;
  }

  public subscribe(listener: DewDefenseListener): () => void {
    this.listeners.push(listener);
    listener(this.weapons, this.threats);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.weapons, this.threats));
  }
}

export const directedEnergyAndHypersonicDefense = DirectedEnergyAndHypersonicDefense.getInstance();
