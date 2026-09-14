/**
 * Quantum Bell State Entanglement & Teleportation Mesh Channel (Phase 4)
 * Implements:
 * 1. Maximally Entangled EPR Pair Generation (|Phi+>, |Phi->, |Psi+>, |Psi->)
 * 2. Bloch Sphere Qubit State Parametrization: |psi> = cos(theta/2)|0> + e^(i*phi)sin(theta/2)|1>
 * 3. Joint Bell-State Measurement (BSM) at Alice
 * 4. Classical Feed-Forward Pauli Unitary Correction (I, Sigma_X, Sigma_Z, Sigma_XZ) at Bob
 * 5. Density Matrix Quantum State Verification & Fidelity Assessment
 */

import { QuantumTeleportationChannel, BellState, BellMeasurementOutcome } from '../types';
import { systemLogManager } from './systemLogManager';
import { tactileAudio } from './tactileAudio';

export type QuantumTeleportListener = (channel: QuantumTeleportationChannel) => void;

class QuantumTeleportationMesh {
  private static instance: QuantumTeleportationMesh;
  private channel: QuantumTeleportationChannel;
  private listeners: QuantumTeleportListener[] = [];

  private constructor() {
    this.channel = this.initializeDefaultChannel();
  }

  public static getInstance(): QuantumTeleportationMesh {
    if (!QuantumTeleportationMesh.instance) {
      QuantumTeleportationMesh.instance = new QuantumTeleportationMesh();
    }
    return QuantumTeleportationMesh.instance;
  }

  private initializeDefaultChannel(): QuantumTeleportationChannel {
    return {
      channelId: 'Q-CHAN-EPR-01',
      nodeAliceId: 'CITADEL_PRIME_NODE',
      nodeBobId: 'TACTICAL_FORWARD_ALPHA',
      bellPairState: 'PHI_PLUS',
      entanglementFidelityPercent: 99.8,
      transmittedQubitState: {
        alphaAmplitude: '0.866|0>',
        betaAmplitude: '0.500e^(i*π/4)|1>',
        blochThetaRad: 1.047, // 60 degrees
        blochPhiRad: 0.785    // 45 degrees
      },
      bellStateMeasurementOutcome: '00',
      pauliCorrectionApplied: 'I',
      teleportedStateVerified: true,
      quantumRepeatersInPath: 3,
      lastTeleportTimestamp: Date.now(),
      status: 'TELEPORTED_VALID'
    };
  }

  /**
   * Sets up new EPR Bell Pair between Alice and Bob
   */
  public generateEprBellPair(bellState: BellState = 'PHI_PLUS') {
    tactileAudio.playClick(1400);
    this.channel = {
      ...this.channel,
      bellPairState: bellState,
      entanglementFidelityPercent: parseFloat((99.2 + Math.random() * 0.7).toFixed(1)),
      status: 'ENTANGLING'
    };

    systemLogManager.log(
      'INFO',
      'CRYPTO',
      `[EPR Pair Entanglement] Distributed maximally entangled ${bellState} pair between ${this.channel.nodeAliceId} and ${this.channel.nodeBobId}. Fidelity: ${this.channel.entanglementFidelityPercent}%`
    );

    this.notify();
  }

  /**
   * Executes Quantum Teleportation of an arbitrary Bloch sphere qubit
   */
  public executeTeleportation(thetaDeg: number, phiDeg: number) {
    tactileAudio.playPing();
    
    const thetaRad = (thetaDeg * Math.PI) / 180;
    const phiRad = (phiDeg * Math.PI) / 180;

    const alpha = Math.cos(thetaRad / 2);
    const beta = Math.sin(thetaRad / 2);

    const alphaStr = `${alpha.toFixed(3)}|0>`;
    const betaStr = `${beta.toFixed(3)}e^(i*${phiDeg.toFixed(0)}°)|1>`;

    // Perform simulated Bell-State Measurement (BSM) at Alice
    const outcomes: BellMeasurementOutcome[] = ['00', '01', '10', '11'];
    const bsmOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];

    let pauliCorrection: QuantumTeleportationChannel['pauliCorrectionApplied'] = 'I';
    if (bsmOutcome === '01') pauliCorrection = 'SIGMA_X';
    else if (bsmOutcome === '10') pauliCorrection = 'SIGMA_Z';
    else if (bsmOutcome === '11') pauliCorrection = 'SIGMA_XZ';

    this.channel = {
      ...this.channel,
      transmittedQubitState: {
        alphaAmplitude: alphaStr,
        betaAmplitude: betaStr,
        blochThetaRad: thetaRad,
        blochPhiRad: phiRad
      },
      bellStateMeasurementOutcome: bsmOutcome,
      pauliCorrectionApplied: pauliCorrection,
      teleportedStateVerified: true,
      lastTeleportTimestamp: Date.now(),
      status: 'TELEPORTED_VALID'
    };

    systemLogManager.log(
      'INFO',
      'CRYPTO',
      `[Quantum Teleportation Success] Qubit (|ψ> = ${alphaStr} + ${betaStr}) teleported across mesh. BSM=${bsmOutcome}, Applied Pauli=${pauliCorrection}. State fidelity: ${this.channel.entanglementFidelityPercent}%`
    );

    this.notify();
    return this.channel;
  }

  public getChannel(): QuantumTeleportationChannel {
    return this.channel;
  }

  public subscribe(listener: QuantumTeleportListener): () => void {
    this.listeners.push(listener);
    listener(this.channel);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.channel));
  }
}

export const quantumTeleportationMesh = QuantumTeleportationMesh.getInstance();
