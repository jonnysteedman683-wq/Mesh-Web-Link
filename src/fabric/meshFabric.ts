import { 
  AgentNode, 
  MeshLink, 
  MeshPacket, 
  CollaborativeTask, 
  NetworkMetrics, 
  ChaosSettings, 
  AgentRole, 
  Region,
  CoordinatorFailoverScenario,
  FailoverEventLog,
  MissionDirectiveConfig,
  MissionDossier,
  BiometricSessionState
} from '../types';
import { CryptoEngine } from '../crypto/cryptoEngine';
import { verificationLoopManager } from '../services/verificationLoopManager';

export class MeshFabricManager {
  private nodes: AgentNode[] = [];
  private links: MeshLink[] = [];
  private packets: MeshPacket[] = [];
  private tasks: CollaborativeTask[] = [];
  private failoverLogs: FailoverEventLog[] = [];
  private activeFailoverScenario: CoordinatorFailoverScenario | null = null;
  private missionDossiers: MissionDossier[] = [];
  private biometricSession: BiometricSessionState | null = null;
  private chaosSettings: ChaosSettings = {
    packetLossEnabled: false,
    packetLossRate: 15,
    highLatencySimulation: false,
    addedLatencyMs: 120,
    severedLinks: [],
    isolatedNodes: [],
  };
  private metrics: NetworkMetrics = {
    totalNodes: 6,
    onlineNodes: 6,
    totalLinks: 8,
    activeLinks: 8,
    avgLatencyMs: 24,
    avgPacketLoss: 0.1,
    totalThroughputKbps: 480,
    totalPacketsSent: 124,
    totalPacketsDelivered: 122,
    meshHealthScore: 99.4,
    securityIndexScore: 100,
    totalCryptoOps: 384,
  };

  private listeners: Array<() => void> = [];

  constructor() {
    this.initializeDefaultTopology();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.updateMetrics();
    this.listeners.forEach(l => l());
  }

  public getNodes(): AgentNode[] {
    return [...this.nodes];
  }

  public getLinks(): MeshLink[] {
    return [...this.links];
  }

  public getPackets(): MeshPacket[] {
    return [...this.packets];
  }

  public getTasks(): CollaborativeTask[] {
    return [...this.tasks];
  }

  public getMetrics(): NetworkMetrics {
    return { ...this.metrics };
  }

  public getChaosSettings(): ChaosSettings {
    return { ...this.chaosSettings };
  }

  public getBiometricSession(): BiometricSessionState | null {
    return this.biometricSession ? { ...this.biometricSession } : null;
  }

  public setBiometricSession(session: BiometricSessionState | null) {
    this.biometricSession = session;
    if (session && session.isVerified) {
      // Elevate node crypto throughput and propagate clearance state across mesh
      for (const node of this.nodes) {
        node.cryptoOpsSec = (node.cryptoOpsSec || 64) + 128;
      }
      // Send verified biometric attestation packet across the mesh fabric
      this.sendEncryptedMessage(
        'node-me',
        'node-inquisitor',
        `CITADEL_BIOMETRIC_ATTESTATION: ${session.operatorName} [${session.clearanceLevel}] sig:${session.signatureHash.substring(0, 12)}`,
        'key_exchange'
      ).catch(err => console.warn('Mesh biometric packet dispatch notice:', err));
    }
    this.notify();
  }

  private initializeDefaultTopology() {
    this.nodes = [
      {
        id: 'node-me',
        name: 'Central Command (Me)',
        role: 'command_me',
        region: 'us-east-1',
        status: 'ONLINE',
        ipAddress: '10.0.0.1',
        fingerprint: '00:ff:ca:fe:13:37:aa:01',
        publicKeyRaw: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA-COMMAND-ME',
        uptimeSeconds: 154200,
        cpuPercent: 19,
        memoryMb: 1024,
        maxMemoryMb: 8192,
        activeThreads: 16,
        queueBacklog: 0,
        packetsSent: 4890,
        packetsReceived: 4720,
        cryptoOpsSec: 240,
        x: 400,
        y: 55,
        tier: 'command',
        unitGroup: 'me',
        description: 'Operator & Root Authority Console',
      },
      // Tier 2: Coordinators
      {
        id: 'node-omnisary',
        name: 'Omnisary',
        role: 'coordinator',
        region: 'us-west-2',
        status: 'ONLINE',
        ipAddress: '10.240.12.10',
        fingerprint: '3f:89:ac:2e:99:d1:77:0b',
        publicKeyRaw: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA-OMNISARY',
        uptimeSeconds: 98200,
        cpuPercent: 32,
        memoryMb: 2048,
        maxMemoryMb: 8192,
        activeThreads: 28,
        queueBacklog: 2,
        packetsSent: 3410,
        packetsReceived: 3389,
        cryptoOpsSec: 188,
        x: 170,
        y: 190,
        tier: 'coordinator',
        unitGroup: 'coordinators',
        description: 'Strategic Coordinator & Tactical Squad Marshal',
      },
      {
        id: 'node-hermes',
        name: 'Hermes',
        role: 'coordinator',
        region: 'eu-central-1',
        status: 'ONLINE',
        ipAddress: '10.180.4.15',
        fingerprint: '7b:4e:11:8f:33:02:4a:d9',
        publicKeyRaw: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEB-HERMES',
        uptimeSeconds: 112000,
        cpuPercent: 44,
        memoryMb: 2410,
        maxMemoryMb: 8192,
        activeThreads: 36,
        queueBacklog: 3,
        packetsSent: 5120,
        packetsReceived: 5080,
        cryptoOpsSec: 260,
        x: 400,
        y: 190,
        tier: 'coordinator',
        unitGroup: 'coordinators',
        description: 'Rapid Relay Coordinator & Swarm Dispatcher',
      },
      {
        id: 'node-inquisitor',
        name: 'Inquisitor',
        role: 'coordinator',
        region: 'us-east-1',
        status: 'ONLINE',
        ipAddress: '10.240.12.25',
        fingerprint: '12:dd:45:90:ea:7b:31:c4',
        publicKeyRaw: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEC-INQUISITOR',
        uptimeSeconds: 135000,
        cpuPercent: 48,
        memoryMb: 3072,
        maxMemoryMb: 8192,
        activeThreads: 42,
        queueBacklog: 1,
        packetsSent: 6890,
        packetsReceived: 6910,
        cryptoOpsSec: 320,
        x: 630,
        y: 190,
        tier: 'coordinator',
        unitGroup: 'coordinators',
        description: 'Chief Auditor, Specialist Tasker & Results Synthesizer',
      },
      // Tier 3: Squads (ordered by Omnisary, with Hermes relay)
      {
        id: 'node-squad-alpha',
        name: 'Alpha Tactical Squad',
        role: 'squad',
        region: 'us-west-2',
        status: 'ONLINE',
        ipAddress: '10.240.100.1',
        fingerprint: 'aa:11:22:33:44:55:66:77',
        publicKeyRaw: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQED-SQUAD-ALPHA',
        uptimeSeconds: 52000,
        cpuPercent: 38,
        memoryMb: 1536,
        maxMemoryMb: 4096,
        activeThreads: 20,
        queueBacklog: 1,
        packetsSent: 1920,
        packetsReceived: 1890,
        cryptoOpsSec: 140,
        x: 90,
        y: 350,
        tier: 'execution',
        unitGroup: 'squads',
        description: 'Frontline Kinetic & Perimeter Squad (Ordered by Omnisary)',
      },
      {
        id: 'node-squad-bravo',
        name: 'Bravo Recon Squad',
        role: 'squad',
        region: 'us-west-2',
        status: 'ONLINE',
        ipAddress: '10.240.100.2',
        fingerprint: 'bb:22:33:44:55:66:77:88',
        publicKeyRaw: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEE-SQUAD-BRAVO',
        uptimeSeconds: 49000,
        cpuPercent: 29,
        memoryMb: 1280,
        maxMemoryMb: 4096,
        activeThreads: 14,
        queueBacklog: 0,
        packetsSent: 1480,
        packetsReceived: 1460,
        cryptoOpsSec: 98,
        x: 210,
        y: 390,
        tier: 'execution',
        unitGroup: 'squads',
        description: 'Forward Stealth Recon Squad (Ordered by Omnisary)',
      },
      // Tier 3: Swarms (ordered by Hermes)
      {
        id: 'node-swarm-sensor',
        name: 'Sensor Drone Swarm',
        role: 'swarm',
        region: 'edge-mobile',
        status: 'ONLINE',
        ipAddress: '192.168.20.10',
        fingerprint: 'cc:33:44:55:66:77:88:99',
        publicKeyRaw: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEF-SWARM-SENSOR',
        uptimeSeconds: 31000,
        cpuPercent: 58,
        memoryMb: 1024,
        maxMemoryMb: 2048,
        activeThreads: 32,
        queueBacklog: 4,
        packetsSent: 4210,
        packetsReceived: 4100,
        cryptoOpsSec: 210,
        x: 340,
        y: 400,
        tier: 'execution',
        unitGroup: 'swarms',
        description: 'Distributed Sensor & Signal Swarm (Ordered by Hermes)',
      },
      {
        id: 'node-swarm-compute',
        name: 'Compute Worker Swarm',
        role: 'swarm',
        region: 'ap-southeast-1',
        status: 'ONLINE',
        ipAddress: '10.199.50.44',
        fingerprint: 'dd:44:55:66:77:88:99:aa',
        publicKeyRaw: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEG-SWARM-COMPUTE',
        uptimeSeconds: 78000,
        cpuPercent: 74,
        memoryMb: 4096,
        maxMemoryMb: 8192,
        activeThreads: 64,
        queueBacklog: 6,
        packetsSent: 3890,
        packetsReceived: 3910,
        cryptoOpsSec: 410,
        x: 460,
        y: 390,
        tier: 'execution',
        unitGroup: 'swarms',
        description: 'Heavy Sharded Compute Swarm (Ordered by Hermes)',
      },
      // Tier 3: Specialists (ordered by Inquisitor)
      {
        id: 'node-spec-cipher',
        name: 'Cipher Specialist',
        role: 'specialist',
        region: 'eu-central-1',
        status: 'ONLINE',
        ipAddress: '10.180.80.9',
        fingerprint: 'ee:55:66:77:88:99:aa:bb',
        publicKeyRaw: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEH-SPEC-CIPHER',
        uptimeSeconds: 94000,
        cpuPercent: 42,
        memoryMb: 2048,
        maxMemoryMb: 8192,
        activeThreads: 24,
        queueBacklog: 1,
        packetsSent: 2310,
        packetsReceived: 2340,
        cryptoOpsSec: 360,
        x: 590,
        y: 390,
        tier: 'execution',
        unitGroup: 'specialists',
        description: 'Cryptanalysis & Proof Specialist (Ordered by Inquisitor)',
      },
      {
        id: 'node-spec-forensic',
        name: 'Forensic Specialist',
        role: 'specialist',
        region: 'sa-east-1',
        status: 'ONLINE',
        ipAddress: '10.220.14.7',
        fingerprint: 'ff:66:77:88:99:aa:bb:cc',
        publicKeyRaw: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEI-SPEC-FORENSIC',
        uptimeSeconds: 68000,
        cpuPercent: 36,
        memoryMb: 2560,
        maxMemoryMb: 8192,
        activeThreads: 18,
        queueBacklog: 0,
        packetsSent: 1890,
        packetsReceived: 1910,
        cryptoOpsSec: 195,
        x: 710,
        y: 350,
        tier: 'execution',
        unitGroup: 'specialists',
        description: 'Deep Audit Trail & Forensic Anomaly Specialist (Ordered by Inquisitor)',
      },
    ];

    this.links = [
      // 1. Me -> Coordinators
      {
        id: 'link-me-omnisary',
        sourceId: 'node-me',
        targetId: 'node-omnisary',
        status: 'active',
        latencyMs: 16,
        jitterMs: 1.1,
        packetLossPercent: 0.0,
        bandwidthMbps: 1200,
        cipherSuite: 'AES-256-GCM / ECDH-P256',
        keyExchangeStatus: 'established',
        sharedSecretFingerprint: '01:aa:bb:cc:dd:11',
        bytesTransferred: 5219040,
        packetsInFlight: 0,
      },
      {
        id: 'link-me-hermes',
        sourceId: 'node-me',
        targetId: 'node-hermes',
        status: 'active',
        latencyMs: 12,
        jitterMs: 0.9,
        packetLossPercent: 0.0,
        bandwidthMbps: 1500,
        cipherSuite: 'AES-256-GCM / ECDH-P256',
        keyExchangeStatus: 'established',
        sharedSecretFingerprint: '02:bb:cc:dd:ee:22',
        bytesTransferred: 7891230,
        packetsInFlight: 0,
      },
      {
        id: 'link-me-inquisitor',
        sourceId: 'node-me',
        targetId: 'node-inquisitor',
        status: 'active',
        latencyMs: 10,
        jitterMs: 0.8,
        packetLossPercent: 0.0,
        bandwidthMbps: 1500,
        cipherSuite: 'AES-256-GCM / ECDH-P256',
        keyExchangeStatus: 'established',
        sharedSecretFingerprint: '03:cc:dd:ee:ff:33',
        bytesTransferred: 9412090,
        packetsInFlight: 0,
      },

      // 2. Inter-coordinator links
      {
        id: 'link-omnisary-hermes',
        sourceId: 'node-omnisary',
        targetId: 'node-hermes',
        status: 'active',
        latencyMs: 24,
        jitterMs: 1.4,
        packetLossPercent: 0.0,
        bandwidthMbps: 1000,
        cipherSuite: 'AES-256-GCM / ECDH-P256',
        keyExchangeStatus: 'established',
        sharedSecretFingerprint: '11:22:33:44:55:66',
        bytesTransferred: 4192000,
        packetsInFlight: 0,
      },
      {
        id: 'link-hermes-inquisitor',
        sourceId: 'node-hermes',
        targetId: 'node-inquisitor',
        status: 'active',
        latencyMs: 22,
        jitterMs: 1.2,
        packetLossPercent: 0.0,
        bandwidthMbps: 1000,
        cipherSuite: 'AES-256-GCM / ECDH-P256',
        keyExchangeStatus: 'established',
        sharedSecretFingerprint: '22:33:44:55:66:77',
        bytesTransferred: 4891100,
        packetsInFlight: 0,
      },
      {
        id: 'link-omnisary-inquisitor',
        sourceId: 'node-omnisary',
        targetId: 'node-inquisitor',
        status: 'active',
        latencyMs: 38,
        jitterMs: 1.8,
        packetLossPercent: 0.1,
        bandwidthMbps: 850,
        cipherSuite: 'AES-256-GCM / ECDH-P256',
        keyExchangeStatus: 'established',
        sharedSecretFingerprint: '33:44:55:66:77:88',
        bytesTransferred: 3120900,
        packetsInFlight: 0,
      },

      // 3. Coordinators Ordering Execution Units
      // Omnisary orders Squads
      {
        id: 'link-omnisary-squad-alpha',
        sourceId: 'node-omnisary',
        targetId: 'node-squad-alpha',
        status: 'active',
        latencyMs: 14,
        jitterMs: 0.9,
        packetLossPercent: 0.0,
        bandwidthMbps: 800,
        cipherSuite: 'AES-256-GCM / ECDH-P256',
        keyExchangeStatus: 'established',
        sharedSecretFingerprint: '44:55:66:77:88:99',
        bytesTransferred: 2841000,
        packetsInFlight: 0,
      },
      {
        id: 'link-omnisary-squad-bravo',
        sourceId: 'node-omnisary',
        targetId: 'node-squad-bravo',
        status: 'active',
        latencyMs: 18,
        jitterMs: 1.1,
        packetLossPercent: 0.0,
        bandwidthMbps: 750,
        cipherSuite: 'AES-256-GCM / ECDH-P256',
        keyExchangeStatus: 'established',
        sharedSecretFingerprint: '55:66:77:88:99:aa',
        bytesTransferred: 2190000,
        packetsInFlight: 0,
      },

      // Hermes orders Swarms (& tactical fast relay to Alpha squad)
      {
        id: 'link-hermes-swarm-sensor',
        sourceId: 'node-hermes',
        targetId: 'node-swarm-sensor',
        status: 'active',
        latencyMs: 28,
        jitterMs: 1.9,
        packetLossPercent: 0.1,
        bandwidthMbps: 650,
        cipherSuite: 'AES-256-GCM / ECDH-P256',
        keyExchangeStatus: 'established',
        sharedSecretFingerprint: '66:77:88:99:aa:bb',
        bytesTransferred: 4120900,
        packetsInFlight: 0,
      },
      {
        id: 'link-hermes-swarm-compute',
        sourceId: 'node-hermes',
        targetId: 'node-swarm-compute',
        status: 'active',
        latencyMs: 42,
        jitterMs: 2.1,
        packetLossPercent: 0.0,
        bandwidthMbps: 900,
        cipherSuite: 'AES-256-GCM / ECDH-P256',
        keyExchangeStatus: 'established',
        sharedSecretFingerprint: '77:88:99:aa:bb:cc',
        bytesTransferred: 5890000,
        packetsInFlight: 0,
      },
      {
        id: 'link-hermes-squad-alpha',
        sourceId: 'node-hermes',
        targetId: 'node-squad-alpha',
        status: 'active',
        latencyMs: 31,
        jitterMs: 1.5,
        packetLossPercent: 0.0,
        bandwidthMbps: 700,
        cipherSuite: 'AES-256-GCM / ECDH-P256',
        keyExchangeStatus: 'established',
        sharedSecretFingerprint: '88:99:aa:bb:cc:dd',
        bytesTransferred: 1890000,
        packetsInFlight: 0,
      },

      // Inquisitor orders Specialists
      {
        id: 'link-inquisitor-spec-cipher',
        sourceId: 'node-inquisitor',
        targetId: 'node-spec-cipher',
        status: 'active',
        latencyMs: 15,
        jitterMs: 0.8,
        packetLossPercent: 0.0,
        bandwidthMbps: 1000,
        cipherSuite: 'AES-256-GCM / ECDH-P256',
        keyExchangeStatus: 'established',
        sharedSecretFingerprint: '99:aa:bb:cc:dd:ee',
        bytesTransferred: 3910000,
        packetsInFlight: 0,
      },
      {
        id: 'link-inquisitor-spec-forensic',
        sourceId: 'node-inquisitor',
        targetId: 'node-spec-forensic',
        status: 'active',
        latencyMs: 48,
        jitterMs: 2.3,
        packetLossPercent: 0.1,
        bandwidthMbps: 750,
        cipherSuite: 'AES-256-GCM / ECDH-P256',
        keyExchangeStatus: 'established',
        sharedSecretFingerprint: 'aa:bb:cc:dd:ee:ff',
        bytesTransferred: 3120000,
        packetsInFlight: 0,
      },

      // Dynamic Failover Standby Links (Activated when a coordinator goes offline)
      {
        id: 'link-hermes-squad-bravo',
        sourceId: 'node-hermes',
        targetId: 'node-squad-bravo',
        status: 'active',
        latencyMs: 29,
        jitterMs: 1.3,
        packetLossPercent: 0.0,
        bandwidthMbps: 750,
        cipherSuite: 'AES-256-GCM / ECDH-P256',
        keyExchangeStatus: 'established',
        sharedSecretFingerprint: 'f1:22:33:44:55:66',
        bytesTransferred: 980000,
        packetsInFlight: 0,
      },
      {
        id: 'link-omnisary-swarm-sensor',
        sourceId: 'node-omnisary',
        targetId: 'node-swarm-sensor',
        status: 'active',
        latencyMs: 34,
        jitterMs: 1.6,
        packetLossPercent: 0.0,
        bandwidthMbps: 700,
        cipherSuite: 'AES-256-GCM / ECDH-P256',
        keyExchangeStatus: 'established',
        sharedSecretFingerprint: 'f2:33:44:55:66:77',
        bytesTransferred: 1120000,
        packetsInFlight: 0,
      },
      {
        id: 'link-omnisary-swarm-compute',
        sourceId: 'node-omnisary',
        targetId: 'node-swarm-compute',
        status: 'active',
        latencyMs: 38,
        jitterMs: 1.7,
        packetLossPercent: 0.0,
        bandwidthMbps: 700,
        cipherSuite: 'AES-256-GCM / ECDH-P256',
        keyExchangeStatus: 'established',
        sharedSecretFingerprint: 'f3:44:55:66:77:88',
        bytesTransferred: 890000,
        packetsInFlight: 0,
      },
      {
        id: 'link-hermes-spec-cipher',
        sourceId: 'node-hermes',
        targetId: 'node-spec-cipher',
        status: 'active',
        latencyMs: 31,
        jitterMs: 1.4,
        packetLossPercent: 0.0,
        bandwidthMbps: 850,
        cipherSuite: 'AES-256-GCM / ECDH-P256',
        keyExchangeStatus: 'established',
        sharedSecretFingerprint: 'f4:55:66:77:88:99',
        bytesTransferred: 750000,
        packetsInFlight: 0,
      },
      {
        id: 'link-hermes-spec-forensic',
        sourceId: 'node-hermes',
        targetId: 'node-spec-forensic',
        status: 'active',
        latencyMs: 36,
        jitterMs: 1.5,
        packetLossPercent: 0.0,
        bandwidthMbps: 800,
        cipherSuite: 'AES-256-GCM / ECDH-P256',
        keyExchangeStatus: 'established',
        sharedSecretFingerprint: 'f5:66:77:88:99:aa',
        bytesTransferred: 620000,
        packetsInFlight: 0,
      },

      // 4. FEED RESULTS TO INQUISITOR (All Squads, Swarms, Specialists feed their results to Inquisitor!)
      {
        id: 'link-squad-alpha-inquisitor',
        sourceId: 'node-squad-alpha',
        targetId: 'node-inquisitor',
        status: 'active',
        latencyMs: 35,
        jitterMs: 1.6,
        packetLossPercent: 0.0,
        bandwidthMbps: 850,
        cipherSuite: 'AES-256-GCM / ECDH-P256',
        keyExchangeStatus: 'established',
        sharedSecretFingerprint: 'bb:cc:dd:ee:ff:00',
        bytesTransferred: 4210000,
        packetsInFlight: 0,
      },
      {
        id: 'link-squad-bravo-inquisitor',
        sourceId: 'node-squad-bravo',
        targetId: 'node-inquisitor',
        status: 'active',
        latencyMs: 38,
        jitterMs: 1.7,
        packetLossPercent: 0.0,
        bandwidthMbps: 800,
        cipherSuite: 'AES-256-GCM / ECDH-P256',
        keyExchangeStatus: 'established',
        sharedSecretFingerprint: 'cc:dd:ee:ff:00:11',
        bytesTransferred: 3100000,
        packetsInFlight: 0,
      },
      {
        id: 'link-swarm-sensor-inquisitor',
        sourceId: 'node-swarm-sensor',
        targetId: 'node-inquisitor',
        status: 'active',
        latencyMs: 32,
        jitterMs: 1.4,
        packetLossPercent: 0.0,
        bandwidthMbps: 900,
        cipherSuite: 'AES-256-GCM / ECDH-P256',
        keyExchangeStatus: 'established',
        sharedSecretFingerprint: 'dd:ee:ff:00:11:22',
        bytesTransferred: 5120000,
        packetsInFlight: 0,
      },
      {
        id: 'link-swarm-compute-inquisitor',
        sourceId: 'node-swarm-compute',
        targetId: 'node-inquisitor',
        status: 'active',
        latencyMs: 39,
        jitterMs: 1.8,
        packetLossPercent: 0.1,
        bandwidthMbps: 850,
        cipherSuite: 'AES-256-GCM / ECDH-P256',
        keyExchangeStatus: 'established',
        sharedSecretFingerprint: 'ee:ff:00:11:22:33',
        bytesTransferred: 6410000,
        packetsInFlight: 0,
      },
    ];

    // Seed initial tasks illustrating the Me -> Coordinators -> Execution -> Inquisitor -> Me pipeline
    this.tasks = [
      {
        id: 'task-pipeline-01',
        title: 'Operation Aegis: Tiered Perimeter Sweep & Cryptographic Verification',
        type: 'consensus_audit',
        initiatorNodeId: 'node-me',
        assignedNodes: [
          'node-omnisary',
          'node-hermes',
          'node-inquisitor',
          'node-squad-alpha',
          'node-swarm-sensor',
          'node-spec-cipher',
        ],
        status: 'completed',
        progress: 100,
        payloadDescription: 'Me directed Omnisary & Hermes to deploy Alpha Squad and Sensor Swarm. Telemetry and proofs fed into Inquisitor for synthesis and returned to Command (Me).',
        encryptedResults: {
          'node-squad-alpha': 'AES-GCM[tag=f7a1..]: Kinetic perimeter locked; zero breaches across US-West sector.',
          'node-swarm-sensor': 'AES-GCM[tag=11b3..]: 128 mobile drone sensors calibrated; optical sweep clear.',
          'node-spec-cipher': 'AES-GCM[tag=e209..]: All AEAD authentication tags verified (SHA-256 valid).',
          'node-inquisitor': 'AES-GCM[tag=99ff..]: Inquisitor audited & cross-correlated all unit feeds. Signature valid.',
        },
        aggregatedPlaintext: 'Verified by Inquisitor with zero discrepancies. Synthesis delivered back to Central Command (Me): Perimeter secure.',
        startTime: Date.now() - 360000,
        completedTime: Date.now() - 340000,
      },
      {
        id: 'task-pipeline-02',
        title: 'Tactical Recon & Forensic Deep-Audit',
        type: 'federated_telemetry',
        initiatorNodeId: 'node-omnisary',
        assignedNodes: [
          'node-squad-bravo',
          'node-swarm-compute',
          'node-spec-forensic',
          'node-inquisitor',
        ],
        status: 'completed',
        progress: 100,
        payloadDescription: 'Bravo Recon Squad and Compute Swarm fed findings to Inquisitor for forensic attestation.',
        encryptedResults: {
          'node-squad-bravo': 'AES-GCM[tag=aa12..]: Forward recon telemetry stream established.',
          'node-swarm-compute': 'AES-GCM[tag=440e..]: Sharded compute matrices processed 50,000 sensor vectors.',
          'node-spec-forensic': 'AES-GCM[tag=92c4..]: Audit trail verified clean with zero anomalous hops.',
          'node-inquisitor': 'AES-GCM[tag=ee88..]: Inquisitor generated final cryptographic dossier for Command (Me).',
        },
        aggregatedPlaintext: 'Synthesis completed by Inquisitor. Comprehensive report dispatched to Central Command (Me).',
        startTime: Date.now() - 180000,
        completedTime: Date.now() - 170000,
      },
    ];
  }

  // Coordinator Failover Scenarios Catalog
  public static readonly FAILOVER_SCENARIOS: CoordinatorFailoverScenario[] = [
    {
      id: 'omnisary_blackout',
      title: 'Omnisary Blackout ➔ Hermes Squad Adoption',
      description: 'Simulates sudden heartbeat failure of Omnisary. Hermes and Inquisitor trigger Byzantine quorum consensus, and Hermes adopts Alpha & Bravo Squads.',
      offlineCoordinators: ['node-omnisary'],
      fallbackCoordinator: 'node-hermes',
      adoptedUnits: ['node-squad-alpha', 'node-squad-bravo'],
      expectedImpact: 'Zero squad downtime; orders rerouted via Hermes; findings continue to feed Inquisitor.',
    },
    {
      id: 'hermes_blackout',
      title: 'Hermes Blackout ➔ Omnisary Swarm Adoption',
      description: 'Simulates network partition isolating Hermes. Omnisary detects heartbeat loss, immediately adopts Sensor and Compute Drone Swarms.',
      offlineCoordinators: ['node-hermes'],
      fallbackCoordinator: 'node-omnisary',
      adoptedUnits: ['node-swarm-sensor', 'node-swarm-compute'],
      expectedImpact: 'Autonomous swarms maintained; Omnisary directs telemetry sweeps and proofs.',
    },
    {
      id: 'inquisitor_blackout',
      title: 'Inquisitor Blackout ➔ Hermes Emergency Ingestion Hub',
      description: 'Simulates loss of Inquisitor. Hermes steps up as Emergency Ingestion & Audit Hub, verifying all subordinate proofs and delivering dossier back to Me.',
      offlineCoordinators: ['node-inquisitor'],
      fallbackCoordinator: 'node-hermes',
      adoptedUnits: ['node-spec-cipher', 'node-spec-forensic'],
      expectedImpact: 'Hermes adopts specialists & audits feeds; final brief delivered to Me without delay.',
    },
    {
      id: 'dual_blackout',
      title: 'Dual Blackout (Omnisary + Hermes) ➔ Inquisitor Sole Proxy',
      description: 'High-stress failure: both Omnisary and Hermes offline. Inquisitor initiates Emergency Sole Coordinator Proxy mode, managing all 6 execution units directly.',
      offlineCoordinators: ['node-omnisary', 'node-hermes'],
      fallbackCoordinator: 'node-inquisitor',
      adoptedUnits: [
        'node-squad-alpha',
        'node-squad-bravo',
        'node-swarm-sensor',
        'node-swarm-compute',
        'node-spec-cipher',
        'node-spec-forensic',
      ],
      expectedImpact: 'Inquisitor commands all squads, swarms & specialists directly and reports back to Me.',
    },
  ];

  public getFailoverLogs(): FailoverEventLog[] {
    return this.failoverLogs;
  }

  public getActiveFailoverScenario(): CoordinatorFailoverScenario | null {
    return this.activeFailoverScenario;
  }

  // Trigger Coordinator Failover Simulation
  public async triggerCoordinatorFailoverScenario(
    scenarioId: 'omnisary_blackout' | 'hermes_blackout' | 'inquisitor_blackout' | 'dual_blackout',
    onLogUpdate?: (log: FailoverEventLog) => void
  ): Promise<{ success: boolean; durationMs: number; logs: FailoverEventLog[]; dossierSummary: string }> {
    const startTime = Date.now();
    const scenario = MeshFabricManager.FAILOVER_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);

    this.activeFailoverScenario = scenario;
    this.failoverLogs = [];

    const addLog = (
      stage: FailoverEventLog['stage'],
      message: string,
      sourceNodeId: string,
      targetNodeId?: string,
      status: FailoverEventLog['status'] = 'info'
    ) => {
      const logEntry: FailoverEventLog = {
        id: `flog-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        timestamp: Date.now(),
        stage,
        message,
        sourceNodeId,
        targetNodeId,
        status,
      };
      this.failoverLogs.unshift(logEntry);
      if (this.failoverLogs.length > 50) this.failoverLogs.pop();
      onLogUpdate?.(logEntry);
      this.notify();
      return logEntry;
    };

    // 1. Isolate target coordinator(s)
    for (const offId of scenario.offlineCoordinators) {
      if (!this.chaosSettings.isolatedNodes.includes(offId)) {
        this.chaosSettings.isolatedNodes.push(offId);
      }
      const node = this.nodes.find(n => n.id === offId);
      if (node) {
        node.status = 'ISOLATED';
        node.description = `[SIMULATED FAILOVER BLACKOUT] Heartbeat missing. Isolated from fabric.`;
      }
    }

    addLog(
      'heartbeat_loss',
      `Heartbeat monitor: 3 consecutive timeouts from coordinator(s) [${scenario.offlineCoordinators.join(', ')}]. RTT > 3000ms. Declaring node offline.`,
      scenario.offlineCoordinators[0],
      undefined,
      'danger'
    );

    // 2. Consensus Quorum & Leader Election
    await new Promise(r => setTimeout(r, 600));
    const fallbackNode = this.nodes.find(n => n.id === scenario.fallbackCoordinator);
    if (fallbackNode) {
      fallbackNode.description = `[ACTIVE FAILOVER LEAD] Adopted jurisdiction over: ${scenario.adoptedUnits.join(', ')}`;
    }

    addLog(
      'consensus_election',
      `Byzantine Quorum Election: Surviving coordinator [${scenario.fallbackCoordinator}] ratified epoch consensus (Threshold: 100%). Designated as Emergency Failover Lead.`,
      scenario.fallbackCoordinator,
      'node-me',
      'warning'
    );

    // 3. Handshake Renewal & Link Renegotiation
    await new Promise(r => setTimeout(r, 700));
    addLog(
      'handshake_renewal',
      `Emergency ECDH-P256 shared secret renegotiated between [${scenario.fallbackCoordinator}] and adopted units: [${scenario.adoptedUnits.join(', ')}]. AES-256-GCM session established.`,
      scenario.fallbackCoordinator,
      scenario.adoptedUnits[0],
      'info'
    );

    // 4. Directive Rerouting via Central Command (Me)
    await new Promise(r => setTimeout(r, 600));
    addLog(
      'directive_rerouted',
      `Central Command (Me) dynamic route updated: Directives rerouted through fallback lead [${scenario.fallbackCoordinator}]. Launching mission execution...`,
      'node-me',
      scenario.fallbackCoordinator,
      'info'
    );

    // 5. Execute the resilient command pipeline
    const task = await this.executeHierarchicalCommandPipeline(
      `Failover Operation: ${scenario.title}`
    );

    // Wait for pipeline execution to complete
    await new Promise(r => setTimeout(r, 3800));

    const finalIngestionHub = scenario.id === 'inquisitor_blackout' ? 'node-hermes' : 'node-inquisitor';
    const dossierMsg = `Failover Attestation Complete: ${finalIngestionHub} collected and audited all proofs from surviving units with zero data loss. Delivered directly to Central Command (Me).`;

    addLog(
      'dossier_delivered',
      dossierMsg,
      finalIngestionHub,
      'node-me',
      'success'
    );

    return {
      success: true,
      durationMs: Date.now() - startTime,
      logs: this.failoverLogs,
      dossierSummary: dossierMsg,
    };
  }

  // Restore coordinator mesh back to normal
  public resetCoordinatorFailover() {
    this.activeFailoverScenario = null;
    this.chaosSettings.isolatedNodes = [];
    this.chaosSettings.severedLinks = [];

    // Reset node statuses and descriptions
    for (const node of this.nodes) {
      node.status = 'ONLINE';
      if (node.id === 'node-me') {
        node.description = 'Central Command (Me). Root authority and initiator of hierarchical mission directives.';
      } else if (node.id === 'node-omnisary') {
        node.description = 'Tactical Coordinator. Manages Alpha Tactical Squad and Bravo Recon Squad.';
      } else if (node.id === 'node-hermes') {
        node.description = 'Autonomous Swarm Relay. Coordinates Sensor Drone Swarm and Compute Worker Swarm.';
      } else if (node.id === 'node-inquisitor') {
        node.description = 'Audit & Synthesis Ingestion Hub. Commands specialists, audits unit proofs, reports back to Me.';
      } else if (node.tier === 'execution') {
        node.description = `Subordinate execution unit feeding encrypted results back to Inquisitor.`;
      }
    }

    const restoreLog: FailoverEventLog = {
      id: `flog-restore-${Date.now()}`,
      timestamp: Date.now(),
      stage: 'consensus_election',
      message: 'Coordinator Mesh Restored: Omnisary, Hermes, and Inquisitor are all ONLINE and back in primary jurisdictions.',
      sourceNodeId: 'node-me',
      status: 'success',
    };
    this.failoverLogs.unshift(restoreLog);
    this.notify();
  }

  // High-level hierarchical orchestration with dynamic failover support:
  // Step 1: Me -> Active Coordinators (Omnisary, Hermes, Inquisitor, or designated fallback)
  // Step 2: Active Coordinators order Squads, Swarms, Specialists
  // Step 3: Squads, Swarms, Specialists execute and feed results to Ingestion Hub (Inquisitor or fallback Hermes)
  // Step 4: Ingestion Hub synthesizes, verifies, and feeds report back to Me
  public async executeHierarchicalCommandPipeline(
    directive: string = 'Full-Spectrum Reconnaissance & Cryptographic Attestation'
  ): Promise<CollaborativeTask> {
    const isOmnisaryAlive = !this.chaosSettings.isolatedNodes.includes('node-omnisary');
    const isHermesAlive = !this.chaosSettings.isolatedNodes.includes('node-hermes');
    const isInquisitorAlive = !this.chaosSettings.isolatedNodes.includes('node-inquisitor');

    // Dynamic Coordinator Delegation Resolution
    const squadLeader = isOmnisaryAlive 
      ? 'node-omnisary' 
      : isHermesAlive 
      ? 'node-hermes' 
      : 'node-inquisitor';

    const swarmLeader = isHermesAlive 
      ? 'node-hermes' 
      : isOmnisaryAlive 
      ? 'node-omnisary' 
      : 'node-inquisitor';

    const specialistLeader = isInquisitorAlive 
      ? 'node-inquisitor' 
      : isHermesAlive 
      ? 'node-hermes' 
      : 'node-omnisary';

    const ingestionHub = isInquisitorAlive 
      ? 'node-inquisitor' 
      : isHermesAlive 
      ? 'node-hermes' 
      : 'node-omnisary';

    const hasFailover = !isOmnisaryAlive || !isHermesAlive || !isInquisitorAlive;

    const taskId = `task-hierarchical-${Date.now().toString(36)}`;
    const task: CollaborativeTask = {
      id: taskId,
      title: `${hasFailover ? '[FAILOVER RESILIENT] ' : ''}Directive: ${directive}`,
      type: 'consensus_audit',
      initiatorNodeId: 'node-me',
      assignedNodes: [
        squadLeader,
        swarmLeader,
        specialistLeader,
        ingestionHub,
        'node-squad-alpha',
        'node-squad-bravo',
        'node-swarm-sensor',
        'node-swarm-compute',
        'node-spec-cipher',
        'node-spec-forensic',
      ].filter((v, i, a) => a.indexOf(v) === i),
      status: 'executing',
      progress: 15,
      payloadDescription: `Hierarchy Flow: Me -> Active Coordinators (Squad Lead: ${squadLeader}, Swarm Lead: ${swarmLeader}) -> Units -> Ingestion Hub (${ingestionHub}) -> Me.`,
      encryptedResults: {},
      startTime: Date.now(),
    };

    this.tasks.unshift(task);
    this.notify();

    // Step 1: Me -> Active Coordinators
    if (isOmnisaryAlive) {
      await this.sendEncryptedMessage(
        'node-me',
        'node-omnisary',
        `[DIRECTIVE FROM ME] Marshall tactical squads for directive: "${directive}"`,
        'task_dispatch'
      );
    }

    if (isHermesAlive) {
      const extraSquadNote = !isOmnisaryAlive ? ' [FAILOVER: Lead Squads Alpha & Bravo]' : '';
      await this.sendEncryptedMessage(
        'node-me',
        'node-hermes',
        `[DIRECTIVE FROM ME] Marshal autonomous swarms${extraSquadNote} for directive: "${directive}"`,
        'task_dispatch'
      );
    }

    if (isInquisitorAlive) {
      const extraNote = !isOmnisaryAlive && !isHermesAlive ? ' [EMERGENCY SOLE PROXY: Lead all units]' : '';
      await this.sendEncryptedMessage(
        'node-me',
        'node-inquisitor',
        `[DIRECTIVE FROM ME] Task specialists, audit incoming feeds, and return synthesized brief to Me${extraNote}: "${directive}"`,
        'task_dispatch'
      );
    }

    // Step 2: Coordinators order their units
    setTimeout(async () => {
      task.progress = 35;
      this.notify();

      // Squad orders via assigned squadLeader
      const squadPrefix = squadLeader !== 'node-omnisary' ? `[FAILOVER ORDER VIA ${squadLeader.toUpperCase()}]` : '[ORDER VIA OMNISARY]';
      await this.sendEncryptedMessage(
        squadLeader,
        'node-squad-alpha',
        `${squadPrefix} Lock tactical sector Alpha; feed results to ${ingestionHub}.`,
        'task_dispatch'
      );
      await this.sendEncryptedMessage(
        squadLeader,
        'node-squad-bravo',
        `${squadPrefix} Sweep perimeter Bravo; feed findings to ${ingestionHub}.`,
        'task_dispatch'
      );

      // Swarm orders via assigned swarmLeader
      const swarmPrefix = swarmLeader !== 'node-hermes' ? `[FAILOVER ORDER VIA ${swarmLeader.toUpperCase()}]` : '[ORDER VIA HERMES]';
      await this.sendEncryptedMessage(
        swarmLeader,
        'node-swarm-sensor',
        `${swarmPrefix} Deploy sensor telemetry sweep; feed raw metrics to ${ingestionHub}.`,
        'task_dispatch'
      );
      await this.sendEncryptedMessage(
        swarmLeader,
        'node-swarm-compute',
        `${swarmPrefix} Execute distributed computation; feed cryptographic proofs to ${ingestionHub}.`,
        'task_dispatch'
      );

      // Specialist orders via assigned specialistLeader
      const specPrefix = specialistLeader !== 'node-inquisitor' ? `[FAILOVER ORDER VIA ${specialistLeader.toUpperCase()}]` : '[ORDER VIA INQUISITOR]';
      await this.sendEncryptedMessage(
        specialistLeader,
        'node-spec-cipher',
        `${specPrefix} Cryptographic verification duty; report AEAD proofs to ${ingestionHub}.`,
        'task_dispatch'
      );
      await this.sendEncryptedMessage(
        specialistLeader,
        'node-spec-forensic',
        `${specPrefix} Forensic anomaly sweep; report audit trail to ${ingestionHub}.`,
        'task_dispatch'
      );
    }, 1000);

    // Step 3: Squads, Swarms, Specialists feed their results to the designated ingestionHub
    setTimeout(async () => {
      task.progress = 70;
      const feeds = [
        { node: 'node-squad-alpha', msg: 'Alpha Squad: Kinetic perimeter cleared; zero intrusions.' },
        { node: 'node-squad-bravo', msg: 'Bravo Squad: Forward recon mapping completed; sector clear.' },
        { node: 'node-swarm-sensor', msg: 'Sensor Swarm: 256 edge drone sensors reporting nominal.' },
        { node: 'node-swarm-compute', msg: 'Compute Swarm: 10,000 proof iterations verified; hash valid.' },
        { node: 'node-spec-cipher', msg: 'Cipher Specialist: Zero key leaks; ECDH shared secrets intact.' },
        { node: 'node-spec-forensic', msg: 'Forensic Specialist: Audit trail clean; zero anomalies.' },
      ];

      for (const feed of feeds) {
        task.encryptedResults[feed.node] = `AES-GCM[verified]: ${feed.msg}`;
        await this.sendEncryptedMessage(
          feed.node,
          ingestionHub,
          feed.msg,
          'task_result'
        );
      }
      this.notify();
    }, 2200);

    // Step 4: Ingestion Hub synthesizes, verifies, and feeds report back to Me!
    setTimeout(async () => {
      task.progress = 100;
      task.status = 'completed';
      task.completedTime = Date.now();
      task.encryptedResults[ingestionHub] = `AES-GCM[synthesis]: ${ingestionHub} verified all 6 subordinate feeds. ECDH signature attached.`;
      task.aggregatedPlaintext = `Synthesis Complete: Squads, swarms, and specialists reported successfully to ${ingestionHub}. Comprehensive dossier verified and delivered to Central Command (Me).`;

      await this.sendEncryptedMessage(
        ingestionHub,
        'node-me',
        `[SYNTHESIS DELIVERED TO ME via ${ingestionHub}] All unit results verified across 3 tiers. Failover state: ${hasFailover ? 'Active (Self-Healed)' : 'Nominal'}. Network integrity 100%.`,
        'task_result'
      );

      this.notify();
    }, 3600);

    return task;
  }

  // Directive Templates Catalog
  public static readonly DIRECTIVE_TEMPLATES: MissionDirectiveConfig[] = [
    {
      id: 'template-omega-recon',
      codename: 'OPERATION OMEGA RECON',
      directiveText: 'Execute full-spectrum electromagnetic and kinetic reconnaissance across perimeter sectors.',
      sectorTarget: 'Sector 7-G (Orbital Uplink & Perimeter Grid)',
      rulesOfEngagement: {
        clearanceLevel: 'LEVEL_4_SECRET',
        attestationQuorum: 'strict_unanimous',
        failoverPolicy: 'auto_succession',
        cryptoStandard: 'AES-256-GCM + ECDH-P256',
        timeoutMs: 8000,
      },
      assignedCoordinators: ['node-omnisary', 'node-hermes', 'node-inquisitor'],
      assignedUnits: [
        'node-squad-alpha',
        'node-squad-bravo',
        'node-swarm-sensor',
        'node-swarm-compute',
        'node-spec-cipher',
        'node-spec-forensic',
      ],
    },
    {
      id: 'template-kinetic-lock',
      codename: 'OPERATION AEGIS ENCLAVE',
      directiveText: 'Deploy tactical squad perimeter blockade and verify cryptographic tamper-evident barriers.',
      sectorTarget: 'Tactical Corridor Delta-4',
      rulesOfEngagement: {
        clearanceLevel: 'LEVEL_3_CONFIDENTIAL',
        attestationQuorum: 'majority',
        failoverPolicy: 'auto_succession',
        cryptoStandard: 'AES-256-GCM + ECDH-P256',
        timeoutMs: 6000,
      },
      assignedCoordinators: ['node-omnisary', 'node-inquisitor'],
      assignedUnits: [
        'node-squad-alpha',
        'node-squad-bravo',
        'node-spec-cipher',
        'node-spec-forensic',
      ],
    },
    {
      id: 'template-autonomous-swarm-sweep',
      codename: 'OPERATION ZEPHYR MATRIX',
      directiveText: 'Deploy 512 autonomous sensor edge drones and distribute parallel cryptographic proofs.',
      sectorTarget: 'Edge Sensor Cluster Echo',
      rulesOfEngagement: {
        clearanceLevel: 'LEVEL_2_RESTRICTED',
        attestationQuorum: 'majority',
        failoverPolicy: 'auto_succession',
        cryptoStandard: 'AES-256-GCM + ECDH-P256',
        timeoutMs: 5000,
      },
      assignedCoordinators: ['node-hermes', 'node-inquisitor'],
      assignedUnits: [
        'node-swarm-sensor',
        'node-swarm-compute',
        'node-spec-cipher',
      ],
    },
    {
      id: 'template-quantum-audit',
      codename: 'OPERATION ZERO KNOWLEDGE SENTINEL',
      directiveText: 'Audit all multi-hop ECDH key agreements, check ephemeral entropy, and generate zero-knowledge attestation proof chain.',
      sectorTarget: 'Central Mesh Cryptographic Vault',
      rulesOfEngagement: {
        clearanceLevel: 'LEVEL_5_QUANTUM_TOP_SECRET',
        attestationQuorum: 'zero_knowledge_proof',
        failoverPolicy: 'auto_succession',
        cryptoStandard: 'AES-256-GCM + ECDH-P256',
        timeoutMs: 10000,
      },
      assignedCoordinators: ['node-inquisitor', 'node-omnisary', 'node-hermes'],
      assignedUnits: [
        'node-swarm-compute',
        'node-spec-cipher',
        'node-spec-forensic',
      ],
    },
  ];

  public getMissionDossiers(): MissionDossier[] {
    return this.missionDossiers;
  }

  // Execute custom mission directive designed by Command (Me)
  public async executeCustomMissionDirective(
    config: MissionDirectiveConfig,
    onProgressUpdate?: (dossier: MissionDossier) => void
  ): Promise<MissionDossier> {
    const isOmnisaryAlive = !this.chaosSettings.isolatedNodes.includes('node-omnisary');
    const isHermesAlive = !this.chaosSettings.isolatedNodes.includes('node-hermes');
    const isInquisitorAlive = !this.chaosSettings.isolatedNodes.includes('node-inquisitor');

    // Dynamic Coordinator Delegation Resolution
    const activeSquadLead = isOmnisaryAlive ? 'node-omnisary' : isHermesAlive ? 'node-hermes' : 'node-inquisitor';
    const activeSwarmLead = isHermesAlive ? 'node-hermes' : isOmnisaryAlive ? 'node-omnisary' : 'node-inquisitor';
    const activeSpecLead = isInquisitorAlive ? 'node-inquisitor' : isHermesAlive ? 'node-hermes' : 'node-omnisary';
    const auditSynthesisLead = isInquisitorAlive ? 'node-inquisitor' : isHermesAlive ? 'node-hermes' : 'node-omnisary';

    const dossier: MissionDossier = {
      id: `dossier-${Date.now().toString(36)}`,
      directiveConfig: config,
      status: 'dispatching',
      progress: 15,
      startTime: Date.now(),
      initiatorNodeId: 'node-me',
      auditSynthesisLead,
      unitReports: {},
      merkleRootHash: 'calculating...',
      executiveSummary: `Mission initiated by Central Command (Me). Dispatched to coordinator hierarchy.`,
    };

    this.missionDossiers.unshift(dossier);
    this.notify();
    onProgressUpdate?.(dossier);

    // Track as a CollaborativeTask so mesh inspector/task dashboard monitors it
    const task: CollaborativeTask = {
      id: `task-${dossier.id}`,
      title: `Directive: ${config.codename}`,
      type: 'consensus_audit',
      initiatorNodeId: 'node-me',
      assignedNodes: [
        ...config.assignedCoordinators,
        ...config.assignedUnits,
        auditSynthesisLead,
      ].filter((v, i, a) => a.indexOf(v) === i),
      status: 'executing',
      progress: 15,
      payloadDescription: `Custom Directive from Command (Me) [${config.rulesOfEngagement.clearanceLevel}]: "${config.directiveText}" Target: ${config.sectorTarget}`,
      encryptedResults: {},
      startTime: Date.now(),
    };
    this.tasks.unshift(task);

    // Phase 1: Me -> Active Coordinators
    for (const coordId of config.assignedCoordinators) {
      const actualTarget = this.chaosSettings.isolatedNodes.includes(coordId) ? auditSynthesisLead : coordId;
      await this.sendEncryptedMessage(
        'node-me',
        actualTarget,
        `[MISSION DIRECTIVE: ${config.codename}] Clearance: ${config.rulesOfEngagement.clearanceLevel}. Target Sector: ${config.sectorTarget}. Quorum: ${config.rulesOfEngagement.attestationQuorum}. Directive: "${config.directiveText}"`,
        'task_dispatch'
      );
    }

    // Phase 2: Coordinators delegate to assigned units with AI-assisted tactical planning
    let aiResponseData: any = null;
    let isGemini = false;
    try {
      const aiFetch = await fetch('/api/agents/ai-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directiveConfig: config,
          activeLeaders: {
            squad: activeSquadLead,
            swarm: activeSwarmLead,
            spec: activeSpecLead,
            audit: auditSynthesisLead,
          },
        }),
      });
      if (aiFetch.ok) {
        const json = await aiFetch.json();
        if (json.success && json.data) {
          aiResponseData = json.data;
          isGemini = !!json.isGeminiPowered;
          dossier.isGeminiPowered = isGemini;
          dossier.coordinatorPlans = json.data.coordinatorPlans;
        }
      }
    } catch (e) {
      console.warn("Backend AI dispatch unavailable, proceeding with local mesh orchestration:", e);
    }

    await new Promise(r => setTimeout(r, 800));
    dossier.status = 'delegating';
    dossier.progress = 40;
    task.progress = 40;
    this.notify();
    onProgressUpdate?.(dossier);

    for (const unitId of config.assignedUnits) {
      let supervisingCoord = activeSquadLead;
      if (unitId.includes('swarm')) supervisingCoord = activeSwarmLead;
      if (unitId.includes('spec')) supervisingCoord = activeSpecLead;

      const planSnippet = dossier.coordinatorPlans 
        ? (unitId.includes('swarm') ? dossier.coordinatorPlans.hermes : unitId.includes('spec') ? dossier.coordinatorPlans.inquisitor : dossier.coordinatorPlans.omnisary)
        : `Execute ${config.rulesOfEngagement.clearanceLevel} tactical procedures in ${config.sectorTarget}`;

      await this.sendEncryptedMessage(
        supervisingCoord,
        unitId,
        `[SUBORDINATE EXECUTION ORDER via ${supervisingCoord.toUpperCase()}] Sector: ${config.sectorTarget}. Plan: "${planSnippet}". Feed encrypted attestation to [${auditSynthesisLead}].`,
        'task_dispatch'
      );
    }

    // Phase 3: Units execute and feed results to auditSynthesisLead
    await new Promise(r => setTimeout(r, 1200));
    dossier.status = 'executing';
    dossier.progress = 70;
    task.progress = 70;
    this.notify();
    onProgressUpdate?.(dossier);

    const defaultUnitSummaries: Record<string, { name: string; coord: string; summary: string }> = {
      'node-squad-alpha': {
        name: 'Alpha Tactical Squad',
        coord: activeSquadLead,
        summary: aiResponseData?.unitReports?.['node-squad-alpha'] ||
          `Kinetic perimeter locked across ${config.sectorTarget}. Zero unauthorized telemetry vectors detected. Tactical readiness 100%.`,
      },
      'node-squad-bravo': {
        name: 'Bravo Recon Squad',
        coord: activeSquadLead,
        summary: aiResponseData?.unitReports?.['node-squad-bravo'] ||
          `Forward electromagnetic sweep completed for ${config.sectorTarget}. Waypoints Alpha-4 through Echo-9 verified secure.`,
      },
      'node-swarm-sensor': {
        name: 'Sensor Drone Swarm',
        coord: activeSwarmLead,
        summary: aiResponseData?.unitReports?.['node-swarm-sensor'] ||
          `256 edge drone sensors gathered multi-spectral telemetry. Ambient RF noise floor nominal; signature database matched.`,
      },
      'node-swarm-compute': {
        name: 'Compute Worker Swarm',
        coord: activeSwarmLead,
        summary: aiResponseData?.unitReports?.['node-swarm-compute'] ||
          `Distributed proof-of-transit iterations completed (128,000 hashes/sec). Consensus vector attested without collision.`,
      },
      'node-spec-cipher': {
        name: 'Cipher Specialist',
        coord: activeSpecLead,
        summary: aiResponseData?.unitReports?.['node-spec-cipher'] ||
          `AEAD verification successful using ${config.rulesOfEngagement.cryptoStandard}. Ephemeral ECDH shared secret fingerprints intact.`,
      },
      'node-spec-forensic': {
        name: 'Forensic Auditor',
        coord: activeSpecLead,
        summary: aiResponseData?.unitReports?.['node-spec-forensic'] ||
          `Audit log ledger integrity verified with zero anomalous peer hops. Cryptographic timestamp sequence strictly monotonic.`,
      },
    };

    for (const unitId of config.assignedUnits) {
      const details = defaultUnitSummaries[unitId] || {
        name: unitId,
        coord: 'Coordinator',
        summary: aiResponseData?.unitReports?.[unitId] || `Execution unit ${unitId} completed directive tasks in ${config.sectorTarget}.`,
      };

      const ciphertext = `AES-256-GCM[iv=${Math.random().toString(16).substring(2, 8)},tag=${Math.random().toString(16).substring(2, 6)}]: ${btoa(details.summary).substring(0, 32)}...`;
      const sigHash = `sha256:${Array.from({ length: 8 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')}`;

      dossier.unitReports[unitId] = {
        unitName: details.name,
        coordinator: details.coord,
        payloadCiphertext: ciphertext,
        verifiedPlaintext: details.summary,
        signatureHash: sigHash,
        timestamp: Date.now(),
      };

      task.encryptedResults[unitId] = ciphertext;

      await this.sendEncryptedMessage(
        unitId,
        auditSynthesisLead,
        details.summary,
        'task_result'
      );
    }

    // Phase 4: Inquisitor Auditing & Merkle Aggregation
    await new Promise(r => setTimeout(r, 1000));
    dossier.status = 'auditing';
    dossier.progress = 90;
    task.progress = 90;
    this.notify();
    onProgressUpdate?.(dossier);

    const calculatedMerkle = aiResponseData?.merkleRoot || `0x${Array.from({ length: 16 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')}`;
    dossier.merkleRootHash = calculatedMerkle;

    // Phase 5: Synthesis Delivered to Me
    await new Promise(r => setTimeout(r, 800));
    dossier.status = 'completed';
    dossier.progress = 100;
    dossier.completedTime = Date.now();
    task.status = 'completed';
    task.progress = 100;
    task.completedTime = Date.now();

    const summaryText = aiResponseData?.inquisitorExecutiveSynthesis ||
      `Mission ${config.codename} successfully executed across ${config.sectorTarget}. ${auditSynthesisLead} verified ${config.assignedUnits.length} subordinate proofs under ${config.rulesOfEngagement.clearanceLevel} clearance (${config.rulesOfEngagement.attestationQuorum} quorum). Merkle Root ${calculatedMerkle} confirmed and delivered to Command (Me).`;
    dossier.executiveSummary = summaryText;
    task.aggregatedPlaintext = summaryText;

    await this.sendEncryptedMessage(
      auditSynthesisLead,
      'node-me',
      `[MISSION ATTESTATION DELIVERED TO COMMAND (ME)] Directive: "${config.codename}". Merkle Root: ${calculatedMerkle}. All ${config.assignedUnits.length} unit feeds audited and verified. Network nominal.`,
      'task_result'
    );

    this.notify();
    onProgressUpdate?.(dossier);

    return dossier;
  }

  // Find shortest route between two nodes using Dijkstra / BFS
  public calculateRoute(sourceId: string, targetId: string): string[] | null {
    if (sourceId === targetId) return [sourceId];

    // Build adjacency list considering active links only
    const adj: Record<string, Array<{ neighbor: string; weight: number }>> = {};
    for (const n of this.nodes) {
      adj[n.id] = [];
    }

    for (const link of this.links) {
      if (link.status === 'severed') continue;
      if (this.chaosSettings.severedLinks.includes(link.id)) continue;
      if (this.chaosSettings.isolatedNodes.includes(link.sourceId) || this.chaosSettings.isolatedNodes.includes(link.targetId)) continue;

      let weight = link.latencyMs;
      if (this.chaosSettings.highLatencySimulation) {
        weight += this.chaosSettings.addedLatencyMs;
      }

      adj[link.sourceId]?.push({ neighbor: link.targetId, weight });
      adj[link.targetId]?.push({ neighbor: link.sourceId, weight });
    }

    // Dijkstra's algorithm
    const distances: Record<string, number> = {};
    const previous: Record<string, string | null> = {};
    const unvisited = new Set<string>();

    for (const n of this.nodes) {
      distances[n.id] = Infinity;
      previous[n.id] = null;
      unvisited.add(n.id);
    }

    distances[sourceId] = 0;

    while (unvisited.size > 0) {
      let currMinNode: string | null = null;
      let minDistance = Infinity;

      for (const nodeId of unvisited) {
        if (distances[nodeId] < minDistance) {
          minDistance = distances[nodeId];
          currMinNode = nodeId;
        }
      }

      if (!currMinNode || distances[currMinNode] === Infinity) break;
      if (currMinNode === targetId) break;

      unvisited.delete(currMinNode);

      const neighbors = adj[currMinNode] || [];
      for (const { neighbor, weight } of neighbors) {
        if (!unvisited.has(neighbor)) continue;
        const alt = distances[currMinNode] + weight;
        if (alt < distances[neighbor]) {
          distances[neighbor] = alt;
          previous[neighbor] = currMinNode;
        }
      }
    }

    if (distances[targetId] === Infinity) {
      return null; // Partitioned / No route
    }

    const path: string[] = [];
    let curr: string | null = targetId;
    while (curr) {
      path.unshift(curr);
      curr = previous[curr];
    }

    return path;
  }

  // Send encrypted message across the mesh fabric
  public async sendEncryptedMessage(
    sourceId: string,
    targetId: string,
    content: string,
    type: MeshPacket['type'] = 'data_share'
  ): Promise<MeshPacket> {
    const route = this.calculateRoute(sourceId, targetId);

    // Perform actual cryptographic encryption with WebCrypto
    const encrypted = await CryptoEngine.encryptPayload(content, sourceId, targetId);

    const packetId = `pkt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const packet: MeshPacket = {
      id: packetId,
      sourceId,
      targetId,
      currentHopId: sourceId,
      route: route || [sourceId, targetId],
      hopIndex: 0,
      type,
      payload: encrypted,
      decryptedContent: undefined,
      isVerified: false,
      status: route ? 'in_flight' : 'dropped',
      startTime: Date.now(),
      ttl: 64,
    };

    this.packets.unshift(packet);
    if (this.packets.length > 80) this.packets.pop();

    const sender = this.nodes.find(n => n.id === sourceId);
    if (sender) {
      sender.packetsSent += 1;
      sender.cryptoOpsSec += 1;
    }

    this.notify();

    // If route was found, simulate multi-hop delivery through the fabric
    if (route && route.length > 1) {
      this.simulateHopProgression(packet, content);
    } else if (!route) {
      packet.status = 'dropped';
      this.notify();
    }

    return packet;
  }

  // Broadcast encrypted message to all connected peers
  public async broadcastEncryptedMessage(
    sourceId: string,
    content: string,
    type: MeshPacket['type'] = 'data_share'
  ): Promise<MeshPacket[]> {
    const targets = this.nodes.filter(n => n.id !== sourceId && n.status === 'ONLINE');
    const sentPackets: MeshPacket[] = [];

    for (const target of targets) {
      const pkt = await this.sendEncryptedMessage(sourceId, target.id, content, type);
      sentPackets.push(pkt);
    }

    return sentPackets;
  }

  // Progress packet through its route hops
  private simulateHopProgression(packet: MeshPacket, originalPlaintext: string) {
    const stepDuration = 350; // ms per hop for clear visual feedback

    const hopTimer = setInterval(async () => {
      packet.hopIndex += 1;

      if (packet.hopIndex < packet.route.length) {
        packet.currentHopId = packet.route[packet.hopIndex];
        this.notify();
      } else {
        // Reached destination!
        clearInterval(hopTimer);

        // Check chaos packet loss
        if (
          this.chaosSettings.packetLossEnabled &&
          Math.random() * 100 < this.chaosSettings.packetLossRate
        ) {
          packet.status = 'dropped';
          this.notify();
          return;
        }

        // Perform authentic decryption at recipient node
        try {
          const decrypted = await CryptoEngine.decryptPayload(
            packet.payload.ciphertextBase64,
            packet.payload.ivHex,
            packet.sourceId,
            packet.targetId
          );
          packet.decryptedContent = decrypted;
          packet.isVerified = true;
          packet.status = 'delivered';
          packet.deliveredTime = Date.now();

          const recipient = this.nodes.find(n => n.id === packet.targetId);
          if (recipient) {
            recipient.packetsReceived += 1;
            recipient.cryptoOpsSec += 1;
          }

          // Trigger automated verification checking loop on telemetry & outcome emission
          verificationLoopManager.verifyAndPersistResult(
            'telemetry',
            `Hop Delivery: ${packet.sourceId} -> ${packet.targetId}`,
            {
              packetId: packet.id,
              type: packet.type,
              plaintext: packet.decryptedContent,
              routeHops: packet.route.length,
            },
            {
              latencyMs: Date.now() - packet.startTime,
              rssi: -68,
            },
            `Automated check loop verified AES-256-GCM payload delivery from ${packet.sourceId} to ${packet.targetId}.`
          );
        } catch {
          packet.decryptedContent = originalPlaintext; // fallback
          packet.isVerified = false;
          packet.status = 'delivered';
        }

        this.notify();
      }
    }, stepDuration);
  }

  // Dispatch a new collaborative task across agents
  public async dispatchTask(
    title: string,
    type: CollaborativeTask['type'],
    initiatorNodeId: string,
    assignedNodes: string[],
    payloadDescription: string
  ): Promise<CollaborativeTask> {
    const taskId = `task-${Date.now().toString(36)}`;
    const task: CollaborativeTask = {
      id: taskId,
      title,
      type,
      initiatorNodeId,
      assignedNodes,
      status: 'executing',
      progress: 5,
      payloadDescription,
      encryptedResults: {},
      startTime: Date.now(),
    };

    this.tasks.unshift(task);
    this.notify();

    // Broadcast encrypted task dispatch to all assigned nodes
    for (const nodeId of assignedNodes) {
      await this.sendEncryptedMessage(
        initiatorNodeId,
        nodeId,
        JSON.stringify({
          action: 'DISPATCH_TASK',
          taskId,
          taskType: type,
          spec: payloadDescription,
        }),
        'task_dispatch'
      );
    }

    // Progressively execute and return encrypted results
    this.simulateTaskExecution(task);
    return task;
  }

  private simulateTaskExecution(task: CollaborativeTask) {
    let currentProgress = 15;
    const interval = setInterval(async () => {
      currentProgress += 25;
      task.progress = Math.min(currentProgress, 95);

      // Node returns encrypted partial result
      const uncompletedNodes = task.assignedNodes.filter(id => !task.encryptedResults[id]);
      if (uncompletedNodes.length > 0) {
        const reportingNode = uncompletedNodes[0];
        const rawResult = `Subtask executed on ${reportingNode}: SHA-256[${Math.random().toString(36).substring(2, 10)}] verified at ${Date.now()}`;
        
        // Encrypt the result back to initiator
        const encrypted = await CryptoEngine.encryptPayload(rawResult, reportingNode, task.initiatorNodeId);
        task.encryptedResults[reportingNode] = `AES-GCM[tag=${encrypted.ciphertextBase64.substring(0, 8)}..]: ${rawResult}`;

        // Send encrypted result packet
        await this.sendEncryptedMessage(
          reportingNode,
          task.initiatorNodeId,
          rawResult,
          'task_result'
        );
      }

      if (currentProgress >= 100 && Object.keys(task.encryptedResults).length >= task.assignedNodes.length) {
        task.progress = 100;
        task.status = 'completed';
        task.completedTime = Date.now();
        task.aggregatedPlaintext = `Collaborative ${task.type} completed successfully with cryptographic consensus from all ${task.assignedNodes.length} distributed nodes.`;
        
        verificationLoopManager.verifyAndPersistResult(
          'telemetry',
          `Task Completed: ${task.title}`,
          {
            taskId: task.id,
            type: task.type,
            participatingNodes: task.assignedNodes,
            outcome: task.aggregatedPlaintext,
          },
          {
            latencyMs: Date.now() - task.startTime,
          },
          `Automated check loop validated multi-node cryptographic consensus for task: ${task.title}`
        );

        clearInterval(interval);
        this.notify();
      } else {
        this.notify();
      }
    }, 800);
  }

  // Create a new agent node dynamically
  public async addNode(
    name: string,
    role: AgentRole,
    region: Region
  ): Promise<AgentNode> {
    const id = `node-${Date.now().toString(36).substring(4)}`;
    const keyPair = await CryptoEngine.generateKeyPair();
    const pubKeyRaw = await CryptoEngine.exportPublicKey(keyPair.publicKey);
    const fingerprint = await CryptoEngine.computeFingerprint(pubKeyRaw);

    // Compute layout position based on existing nodes
    const angle = (this.nodes.length / 8) * Math.PI * 2;
    const centerX = 400;
    const centerY = 240;
    const radius = 170;
    const x = Math.round(centerX + Math.cos(angle) * radius);
    const y = Math.round(centerY + Math.sin(angle) * radius);

    const newNode: AgentNode = {
      id,
      name,
      role,
      region,
      status: 'ONLINE',
      ipAddress: `10.${Math.floor(Math.random() * 200) + 10}.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 250) + 1}`,
      fingerprint,
      publicKeyRaw: pubKeyRaw.substring(0, 48),
      cryptoKeyPair: keyPair,
      uptimeSeconds: 1,
      cpuPercent: Math.floor(Math.random() * 20) + 10,
      memoryMb: 256,
      maxMemoryMb: 2048,
      activeThreads: 8,
      queueBacklog: 0,
      packetsSent: 0,
      packetsReceived: 0,
      cryptoOpsSec: 15,
      x,
      y,
    };

    this.nodes.push(newNode);

    // Automatically establish encrypted links with 2 closest nodes to preserve mesh fabric
    const otherNodes = this.nodes.filter(n => n.id !== id);
    if (otherNodes.length > 0) {
      // Pick 2 random or nearest nodes
      const selectedPeers = otherNodes.slice(0, 2);
      for (const peer of selectedPeers) {
        const linkId = `link-${id}-${peer.id}`;
        const secret = await CryptoEngine.computeFingerprint(`${id}<->${peer.id}`);
        this.links.push({
          id: linkId,
          sourceId: id,
          targetId: peer.id,
          status: 'active',
          latencyMs: Math.floor(Math.random() * 40) + 15,
          jitterMs: parseFloat((Math.random() * 2 + 0.5).toFixed(1)),
          packetLossPercent: 0.0,
          bandwidthMbps: 800,
          cipherSuite: 'AES-256-GCM / ECDH-P256',
          keyExchangeStatus: 'established',
          sharedSecretFingerprint: secret,
          bytesTransferred: 0,
          packetsInFlight: 0,
        });
      }
    }

    this.notify();
    return newNode;
  }

  // Chaos controls
  public toggleSeverLink(linkId: string) {
    const idx = this.chaosSettings.severedLinks.indexOf(linkId);
    if (idx >= 0) {
      this.chaosSettings.severedLinks.splice(idx, 1);
    } else {
      this.chaosSettings.severedLinks.push(linkId);
    }

    const link = this.links.find(l => l.id === linkId);
    if (link) {
      link.status = this.chaosSettings.severedLinks.includes(linkId) ? 'severed' : 'active';
    }

    this.notify();
  }

  public toggleIsolateNode(nodeId: string) {
    const idx = this.chaosSettings.isolatedNodes.indexOf(nodeId);
    if (idx >= 0) {
      this.chaosSettings.isolatedNodes.splice(idx, 1);
    } else {
      this.chaosSettings.isolatedNodes.push(nodeId);
    }

    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.status = this.chaosSettings.isolatedNodes.includes(nodeId) ? 'ISOLATED' : 'ONLINE';
    }

    this.notify();
  }

  public setPacketLossChaos(enabled: boolean, rate: number = 15) {
    this.chaosSettings.packetLossEnabled = enabled;
    this.chaosSettings.packetLossRate = rate;
    this.notify();
  }

  public setLatencyChaos(enabled: boolean, addedMs: number = 120) {
    this.chaosSettings.highLatencySimulation = enabled;
    this.chaosSettings.addedLatencyMs = addedMs;
    this.notify();
  }

  public healAll() {
    this.chaosSettings.severedLinks = [];
    this.chaosSettings.isolatedNodes = [];
    this.chaosSettings.packetLossEnabled = false;
    this.chaosSettings.highLatencySimulation = false;

    this.links.forEach(l => {
      l.status = 'active';
    });

    this.nodes.forEach(n => {
      n.status = 'ONLINE';
    });

    this.notify();
  }

  // Update real-time metrics
  private updateMetrics() {
    const totalNodes = this.nodes.length;
    const onlineNodes = this.nodes.filter(n => n.status === 'ONLINE').length;
    const totalLinks = this.links.length;
    const activeLinks = this.links.filter(l => l.status === 'active' && !this.chaosSettings.severedLinks.includes(l.id)).length;

    let totalLat = 0;
    let validLinks = 0;
    for (const l of this.links) {
      if (l.status === 'active') {
        totalLat += l.latencyMs + (this.chaosSettings.highLatencySimulation ? this.chaosSettings.addedLatencyMs : 0);
        validLinks += 1;
      }
    }
    const avgLatencyMs = validLinks > 0 ? Math.round(totalLat / validLinks) : 0;

    const totalSent = this.packets.length;
    const delivered = this.packets.filter(p => p.status === 'delivered').length;
    const dropped = this.packets.filter(p => p.status === 'dropped').length;

    const packetLoss = totalSent > 0 ? parseFloat(((dropped / totalSent) * 100).toFixed(1)) : 0.1;

    // Calculate mesh health score
    let health = 100;
    if (totalNodes > 0) {
      health -= ((totalNodes - onlineNodes) / totalNodes) * 40;
    }
    if (totalLinks > 0) {
      health -= ((totalLinks - activeLinks) / totalLinks) * 35;
    }
    if (packetLoss > 5) {
      health -= Math.min(25, packetLoss * 0.8);
    }
    const meshHealthScore = Math.max(10, parseFloat(health.toFixed(1)));

    let totalCryptoOps = 0;
    for (const n of this.nodes) {
      totalCryptoOps += n.cryptoOpsSec;
    }

    this.metrics = {
      totalNodes,
      onlineNodes,
      totalLinks,
      activeLinks,
      avgLatencyMs,
      avgPacketLoss: packetLoss,
      totalThroughputKbps: Math.round(activeLinks * 64 + Math.random() * 20),
      totalPacketsSent: totalSent + 124,
      totalPacketsDelivered: delivered + 120,
      meshHealthScore,
      securityIndexScore: 100, // All links use authenticated AES-GCM + ECDH
      totalCryptoOps,
    };
  }

  // Master Security Wipe: Resets all node associations, clears link topologies, wipes queues, and resets fabric state
  public securityWipe(): void {
    // Purge in-flight packet buffers and queues
    this.packets = [];
    this.tasks = [];
    this.failoverLogs = [];
    this.missionDossiers = [];
    this.biometricSession = null;

    // Reset chaos settings
    this.chaosSettings = {
      packetLossEnabled: false,
      packetLossRate: 15,
      highLatencySimulation: false,
      addedLatencyMs: 120,
      severedLinks: [],
      isolatedNodes: [],
    };

    // Re-initialize default cryptographic baseline topology
    this.initializeDefaultTopology();
    this.notify();
  }

  // Periodic heartbeat loop to keep telemetry live and realistic
  public startHeartbeat(intervalMs: number = 3000): () => void {
    const timer = setInterval(() => {
      // Jiggle CPU, memory, and latency slightly
      for (const node of this.nodes) {
        if (node.status === 'ONLINE') {
          node.uptimeSeconds += 3;
          node.cpuPercent = Math.min(96, Math.max(8, node.cpuPercent + (Math.random() * 8 - 4)));
          node.memoryMb = Math.min(node.maxMemoryMb, Math.max(128, node.memoryMb + Math.floor(Math.random() * 20 - 10)));
          node.queueBacklog = Math.max(0, Math.floor(node.queueBacklog + (Math.random() * 3 - 1.5)));
        }
      }

      for (const link of this.links) {
        if (link.status === 'active') {
          link.latencyMs = Math.max(4, Math.round(link.latencyMs + (Math.random() * 4 - 2)));
          link.bytesTransferred += Math.floor(Math.random() * 10240) + 1024;
        }
      }

      this.notify();
    }, intervalMs);

    return () => clearInterval(timer);
  }
}

export const meshFabric = new MeshFabricManager();
