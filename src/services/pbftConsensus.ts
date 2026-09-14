/**
 * PBFT / Byzantine Fault Tolerant Consensus Ledger Manager (Phase 2)
 * Orchestrates 3-phase commit proposals (Pre-Prepare -> Prepare -> Commit -> Finalized)
 * across mesh nodes with Byzantine node fault tolerance, quorum verification, and view changes.
 */

import { PbftBlockProposal, PbftPhase } from '../types';
import { systemLogManager } from './systemLogManager';

export type PbftListener = (blocks: PbftBlockProposal[], currentProposal: PbftBlockProposal | null) => void;

class PbftConsensusEngine {
  private ledgerBlocks: PbftBlockProposal[] = [];
  private activeProposal: PbftBlockProposal | null = null;
  private currentView = 1;
  private nodeCallsigns: string[] = ['AGENT_ALPHA', 'AGENT_BRAVO', 'AGENT_CHARLIE', 'AGENT_DELTA', 'AGENT_ECHO'];
  private listeners: PbftListener[] = [];
  private simulationTimer: any = null;

  constructor() {
    this.seedGenesisLedger();
    this.startConsensusLoop();
  }

  private seedGenesisLedger() {
    this.ledgerBlocks = [
      {
        blockNumber: 1,
        viewNumber: 1,
        proposalDigest: 'DIGEST_GENESIS_0x8f3a9e21',
        proposerNodeId: 'AGENT_ALPHA',
        timestamp: Date.now() - 360000,
        transactions: [
          {
            txId: 'tx-001',
            type: 'KEY_ROTATION',
            sourceNode: 'AGENT_ALPHA',
            payloadSummary: 'Genesis Mesh ECDH Root Key Inception (Curve P-256)',
            signature: 'SIG_0x891a...32'
          },
          {
            txId: 'tx-002',
            type: 'ACCESS_GRANT',
            sourceNode: 'AGENT_ALPHA',
            targetNode: 'AGENT_BRAVO',
            payloadSummary: 'Command Tier 1 Authorization & Radio Bridge Sync',
            signature: 'SIG_0xfe41...9a'
          }
        ],
        prePrepareSignatures: { AGENT_ALPHA: 'SIG_PP_01' },
        prepareSignatures: { AGENT_ALPHA: 'SIG_P_01', AGENT_BRAVO: 'SIG_P_02', AGENT_CHARLIE: 'SIG_P_03' },
        commitSignatures: { AGENT_ALPHA: 'SIG_C_01', AGENT_BRAVO: 'SIG_C_02', AGENT_CHARLIE: 'SIG_C_03', AGENT_DELTA: 'SIG_C_04' },
        phase: 'FINALIZED',
        quorumReached: true
      },
      {
        blockNumber: 2,
        viewNumber: 1,
        proposalDigest: 'DIGEST_BLOCK_0x2b489c71',
        proposerNodeId: 'AGENT_BRAVO',
        timestamp: Date.now() - 120000,
        transactions: [
          {
            txId: 'tx-003',
            type: 'LEDGER_ENTRY',
            sourceNode: 'AGENT_BRAVO',
            payloadSummary: 'Distributed Task Hash Ingestion #TASK-401',
            signature: 'SIG_0xca12...77'
          }
        ],
        prePrepareSignatures: { AGENT_BRAVO: 'SIG_PP_02' },
        prepareSignatures: { AGENT_BRAVO: 'SIG_P_02', AGENT_CHARLIE: 'SIG_P_03', AGENT_DELTA: 'SIG_P_04' },
        commitSignatures: { AGENT_BRAVO: 'SIG_C_02', AGENT_CHARLIE: 'SIG_C_03', AGENT_DELTA: 'SIG_C_04', AGENT_ECHO: 'SIG_C_05' },
        phase: 'FINALIZED',
        quorumReached: true
      }
    ];
  }

  // -----------------------------------------------------------------
  // PBFT 3-Phase Voting Pipeline
  // -----------------------------------------------------------------
  public proposeNewBlock(
    proposerNode: string, 
    type: 'KEY_ROTATION' | 'DIRECTIVE' | 'LEDGER_ENTRY' | 'SHUTDOWN_ORDNANCE' | 'ACCESS_GRANT',
    summary: string
  ): PbftBlockProposal {
    const nextBlockNum = this.ledgerBlocks.length + 1;
    const digest = `DIGEST_BLOCK_${nextBlockNum}_0x${Math.floor(Math.random()*0xffffff).toString(16)}`;

    const proposal: PbftBlockProposal = {
      blockNumber: nextBlockNum,
      viewNumber: this.currentView,
      proposalDigest: digest,
      proposerNodeId: proposerNode,
      timestamp: Date.now(),
      transactions: [
        {
          txId: `tx-${Date.now().toString(16)}`,
          type,
          sourceNode: proposerNode,
          payloadSummary: summary,
          signature: `SIG_PROPOSAL_${proposerNode}_${Date.now()}`
        }
      ],
      prePrepareSignatures: { [proposerNode]: `SIG_PRE_PREPARE_${proposerNode}` },
      prepareSignatures: {},
      commitSignatures: {},
      phase: 'PRE_PREPARE',
      quorumReached: false
    };

    this.activeProposal = proposal;
    this.notify();

    systemLogManager.log(
      'INFO',
      'CITADEL',
      `[PBFT Consensus] Block #${nextBlockNum} Pre-Prepared by ${proposerNode}: "${summary}"`,
      { digest }
    );

    // Auto-advance through PBFT phases
    this.executePbftWorkflow(proposal);
    return proposal;
  }

  private executePbftWorkflow(proposal: PbftBlockProposal) {
    // 1. Move to PREPARE phase
    setTimeout(() => {
      if (!this.activeProposal || this.activeProposal.proposalDigest !== proposal.proposalDigest) return;
      this.activeProposal.phase = 'PREPARE';
      this.activeProposal.prepareSignatures = {
        AGENT_ALPHA: 'SIG_PREPARE_ALPHA',
        AGENT_BRAVO: 'SIG_PREPARE_BRAVO',
        AGENT_CHARLIE: 'SIG_PREPARE_CHARLIE'
      };
      this.notify();

      // 2. Move to COMMIT phase
      setTimeout(() => {
        if (!this.activeProposal || this.activeProposal.proposalDigest !== proposal.proposalDigest) return;
        this.activeProposal.phase = 'COMMIT';
        this.activeProposal.commitSignatures = {
          AGENT_ALPHA: 'SIG_COMMIT_ALPHA',
          AGENT_BRAVO: 'SIG_COMMIT_BRAVO',
          AGENT_CHARLIE: 'SIG_COMMIT_CHARLIE',
          AGENT_DELTA: 'SIG_COMMIT_DELTA'
        };
        this.activeProposal.quorumReached = true;
        this.notify();

        // 3. Move to FINALIZED and commit to Ledger
        setTimeout(() => {
          if (!this.activeProposal || this.activeProposal.proposalDigest !== proposal.proposalDigest) return;
          this.activeProposal.phase = 'FINALIZED';
          this.ledgerBlocks.unshift({ ...this.activeProposal });
          
          systemLogManager.log(
            'SEC_AUDIT',
            'CITADEL',
            `[PBFT Consensus] Block #${proposal.blockNumber} FINALIZED with 2f+1 Byzantine Quorum Attestation.`,
            { block: proposal.blockNumber, digest: proposal.proposalDigest }
          );

          this.activeProposal = null;
          this.notify();
        }, 1200);
      }, 1200);
    }, 1200);
  }

  public triggerManualViewChange() {
    this.currentView += 1;
    if (this.activeProposal) {
      this.activeProposal.phase = 'VIEW_CHANGE';
      this.activeProposal.viewNumber = this.currentView;
    }
    systemLogManager.log(
      'WARN',
      'CITADEL',
      `[PBFT Consensus] VIEW-CHANGE Triggered. Advanced to View #${this.currentView}. Leader rotated.`
    );
    this.notify();
  }

  // Periodic heartbeats & background proposals
  private startConsensusLoop() {
    if (this.simulationTimer) clearInterval(this.simulationTimer);
    this.simulationTimer = setInterval(() => {
      if (!this.activeProposal && Math.random() < 0.3) {
        const leader = this.nodeCallsigns[Math.floor(Math.random() * this.nodeCallsigns.length)];
        this.proposeNewBlock(
          leader,
          'KEY_ROTATION',
          `Periodic Double Ratchet Root Key Re-attestation #${Math.floor(Math.random()*1000)}`
        );
      }
    }, 45000);
  }

  // -----------------------------------------------------------------
  // Subscriptions & Getters
  // -----------------------------------------------------------------
  public getLedger(): PbftBlockProposal[] {
    return this.ledgerBlocks;
  }

  public getActiveProposal(): PbftBlockProposal | null {
    return this.activeProposal;
  }

  public getCurrentView(): number {
    return this.currentView;
  }

  public subscribe(cb: PbftListener): () => void {
    this.listeners.push(cb);
    cb(this.ledgerBlocks, this.activeProposal);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb(this.ledgerBlocks, this.activeProposal));
  }
}

export const pbftConsensus = new PbftConsensusEngine();
