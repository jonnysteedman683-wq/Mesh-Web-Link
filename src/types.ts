export type AgentRole = 
  | 'command_me'
  | 'coordinator'
  | 'squad'
  | 'swarm'
  | 'specialist'
  | 'security_sentinel'
  | 'mesh_bridge'
  | 'compute_worker'
  | 'vector_store'
  | 'ingestion_node'
  | 'consensus_leader';

export type NodeStatus = 'ONLINE' | 'CONNECTING' | 'DEGRADED' | 'DISCONNECTED' | 'ISOLATED';

export type Region = 'us-east-1' | 'eu-central-1' | 'ap-southeast-1' | 'sa-east-1' | 'us-west-2' | 'edge-mobile';

export interface AgentNode {
  id: string;
  name: string;
  role: AgentRole;
  region: Region;
  status: NodeStatus;
  ipAddress: string;
  fingerprint: string; // SHA-256 of public key
  publicKeyRaw: string; // Base64 or Hex
  cryptoKeyPair?: CryptoKeyPair;
  uptimeSeconds: number;
  cpuPercent: number;
  memoryMb: number;
  maxMemoryMb: number;
  activeThreads: number;
  queueBacklog: number;
  packetsSent: number;
  packetsReceived: number;
  cryptoOpsSec: number;
  x: number; // For visual canvas
  y: number;
  tier?: 'command' | 'coordinator' | 'execution';
  unitGroup?: 'me' | 'coordinators' | 'squads' | 'swarms' | 'specialists';
  description?: string;
}

export interface MeshLink {
  id: string;
  sourceId: string;
  targetId: string;
  status: 'active' | 'degraded' | 'severed' | 're-routing';
  latencyMs: number;
  jitterMs: number;
  packetLossPercent: number;
  bandwidthMbps: number;
  cipherSuite: string;
  keyExchangeStatus: 'established' | 'negotiating' | 'expired';
  sharedSecretFingerprint: string;
  bytesTransferred: number;
  packetsInFlight: number;
}

export interface EncryptedPayload {
  ivHex: string;
  ciphertextBase64: string;
  tagBase64?: string;
  plaintextLength: number;
  timestamp: number;
  senderFingerprint: string;
  recipientFingerprint: string;
}

export interface MeshPacket {
  id: string;
  sourceId: string;
  targetId: string;
  currentHopId: string;
  route: string[]; // List of agent IDs representing multi-hop path
  hopIndex: number;
  type: 'data_share' | 'task_dispatch' | 'task_result' | 'heartbeat' | 'consensus_vote' | 'key_exchange';
  payload: EncryptedPayload;
  decryptedContent?: string;
  isVerified: boolean;
  status: 'in_flight' | 'delivered' | 'dropped' | 'rerouted';
  startTime: number;
  deliveredTime?: number;
  ttl: number;
}

export interface CollaborativeTask {
  id: string;
  title: string;
  type: 'distributed_hash' | 'consensus_audit' | 'federated_telemetry' | 'state_vector_sync';
  initiatorNodeId: string;
  assignedNodes: string[];
  status: 'pending' | 'executing' | 'aggregated' | 'completed' | 'failed';
  progress: number;
  payloadDescription: string;
  encryptedResults: Record<string, string>; // nodeId -> encrypted result
  aggregatedPlaintext?: string;
  startTime: number;
  completedTime?: number;
}

export interface CoordinatorFailoverScenario {
  id: 'omnisary_blackout' | 'hermes_blackout' | 'inquisitor_blackout' | 'dual_blackout';
  title: string;
  description: string;
  offlineCoordinators: string[];
  fallbackCoordinator: string;
  adoptedUnits: string[];
  expectedImpact: string;
}

export interface FailoverEventLog {
  id: string;
  timestamp: number;
  stage: 'heartbeat_loss' | 'consensus_election' | 'handshake_renewal' | 'directive_rerouted' | 'dossier_delivered';
  message: string;
  sourceNodeId: string;
  targetNodeId?: string;
  status: 'info' | 'warning' | 'success' | 'danger';
}

export interface NetworkMetrics {
  totalNodes: number;
  onlineNodes: number;
  totalLinks: number;
  activeLinks: number;
  avgLatencyMs: number;
  avgPacketLoss: number;
  totalThroughputKbps: number;
  totalPacketsSent: number;
  totalPacketsDelivered: number;
  meshHealthScore: number; // 0-100
  securityIndexScore: number; // 0-100
  totalCryptoOps: number;
}

export interface ChaosSettings {
  packetLossEnabled: boolean;
  packetLossRate: number; // 0 - 100%
  highLatencySimulation: boolean;
  addedLatencyMs: number;
  severedLinks: string[]; // Link IDs
  isolatedNodes: string[]; // Node IDs
}

export interface MissionRulesOfEngagement {
  clearanceLevel: 'LEVEL_1_ROUTINE' | 'LEVEL_2_RESTRICTED' | 'LEVEL_3_CONFIDENTIAL' | 'LEVEL_4_SECRET' | 'LEVEL_5_QUANTUM_TOP_SECRET';
  attestationQuorum: 'majority' | 'strict_unanimous' | 'zero_knowledge_proof';
  failoverPolicy: 'auto_succession' | 'strict_primary_only';
  cryptoStandard: 'AES-256-GCM + ECDH-P256' | 'ChaCha20-Poly1305 + X25519';
  timeoutMs: number;
}

export interface MissionDirectiveConfig {
  id: string;
  codename: string;
  directiveText: string;
  sectorTarget: string;
  rulesOfEngagement: MissionRulesOfEngagement;
  assignedCoordinators: string[];
  assignedUnits: string[];
}

export interface MissionDossier {
  id: string;
  directiveConfig: MissionDirectiveConfig;
  status: 'planning' | 'dispatching' | 'delegating' | 'executing' | 'auditing' | 'completed' | 'failed';
  progress: number;
  startTime: number;
  completedTime?: number;
  initiatorNodeId: 'node-me';
  auditSynthesisLead: string;
  unitReports: Record<string, {
    unitName: string;
    coordinator: string;
    payloadCiphertext: string;
    verifiedPlaintext: string;
    signatureHash: string;
    timestamp: number;
  }>;
  merkleRootHash: string;
  executiveSummary: string;
  isGeminiPowered?: boolean;
  coordinatorPlans?: Record<string, string>;
}

export interface ExternalAgent {
  id: string;
  name: string;
  role: 'squad' | 'swarm' | 'specialist';
  type: string;
  registeredAt: number;
  lastHeartbeat: number;
  status: 'online' | 'busy' | 'offline';
  publicKey?: string;
  capabilities: string[];
  lastTelemetry?: string;
}

export interface ExternalTelemetryRecord {
  agentId: string;
  missionId: string;
  unitId: string;
  status: 'success' | 'warning' | 'error';
  summary: string;
  metrics: Record<string, any>;
  signatureHash: string;
  timestamp: number;
}

export interface PhysicalPeerDevice {
  id: string;
  callsign: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  joinedAt: number;
  lastPing: number;
  latencyMs: number;
  p2pStatus: 'connecting' | 'connected' | 'data_channel_open' | 'failed' | 'fallback_websocket';
  isSelf: boolean;
  dataSentBytes: number;
  dataReceivedBytes: number;
  activeChannelLabel?: string;
  assignedNodeId?: string;
  batteryLevel?: number;
}

export interface P2PMessagePacket {
  id: string;
  fromPeerId: string;
  fromCallsign: string;
  toPeerId: string; // 'broadcast' or specific peer ID
  type: 'p2p_ping' | 'p2p_pong' | 'p2p_chat' | 'telemetry_sync' | 'tactical_marker' | 'link16_tadil' | 'webrtc_benchmark' | 'defcon_sync' | 'jammer_sync';
  payload: any;
  timestamp: number;
  wireProtocol: 'WebRTC_DataChannel' | 'WebSocket_Relay';
}

export interface P2PBenchmarkResult {
  packetsSent: number;
  packetsReceived: number;
  packetLossPercent: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  throughputKbps: number;
  completedAt: number;
  wireProtocol: 'WebRTC_DataChannel' | 'WebSocket_Relay';
}

// ---------------------------------------------------------------------
// Telemetry Ingestion, Auto-Verification Loop & RF Action Interfaces
// ---------------------------------------------------------------------
export interface AttestedVerificationRecord {
  id: string;
  sourceType: 'telemetry' | 'jammer' | 'radar_ping' | 'rf_scan' | 'p2p_sync' | 'citadel_audit' | 'biometric_attestation';
  sourceName: string;
  timestamp: number;
  rawPayload: any;
  hashProof: string; // SHA-256 integrity digest
  verificationStatus: 'VERIFIED' | 'FLAGGED' | 'CORRUPTED';
  checksPassed: {
    hashIntegrity: boolean;
    frequencyBandValid: boolean;
    timestampDriftPassed: boolean;
    spectrumPowerPassed: boolean;
    quorumAttested: boolean;
  };
  metrics: {
    latencyMs?: number;
    rssi?: number;
    rfFreqMhz?: number;
    jamPowerWatts?: number;
    detectedTargets?: number;
  };
  auditorNotes: string;
}

export interface BiometricSessionState {
  isVerified: boolean;
  operatorId: string;
  operatorName: string;
  clearanceLevel: 'LEVEL_1_ROUTINE' | 'LEVEL_3_LEDGER' | 'LEVEL_4_ARCHITECT' | 'LEVEL_5_OMEGA';
  sessionToken: string;
  attestedAt: number;
  expiresAt: number;
  signatureHash: string;
  modality: 'TACTILE_PATTERN_MATRIX' | 'VASCULAR_DERMAL_SWEEP' | 'FIDO2_WEBAUTHN_HARDWARE_PASSKEY';
  vitalTelemetry?: {
    hrvBpm: number;
    dermalConductanceUsiemens: number;
    ridgeClarityPercent: number;
    quantumEntropyUnits: number;
  };
}

// ---------------------------------------------------------------------
// Citadel Entrance & White-Background Subsystem Interfaces
// ---------------------------------------------------------------------
export type CitadelSubPage = 'vaults' | 'bank' | 'intelligence' | 'consensus' | 'zero_trust' | 'post_quantum' | 'qkd_satcom' | 'kinetic_dew' | 'quantum_teleport';

export interface CitadelVaultItem {
  id: string;
  name: string;
  type: 'axiom_vault' | 'main_vault' | 'omega_vault' | 'crypt_vault';
  classification: string;
  balanceUsd: number;
  keysCount: number;
  status: 'LOCKED' | 'ARMED' | 'SYNCED';
  lastAttestation: string;
  encryptedHash: string;
  allocatedCompute: string;
  securityTier: 'TIER-I PRIMAL' | 'TIER-II CORE' | 'TIER-III OMEGA';
}

export interface CitadelBankAccounts {
  bankBalance: {
    totalUsd: number;
    clearedUsd: number;
    pendingEscrowUsd: number;
    fiatTreasuryIban: string;
    reserveRatio: number;
    dailyYieldUsd: number;
  };
  cashBalance: {
    physicalReserveUsd: number;
    hardVaultLocation: string;
    palletDenominations: string[];
    emergencyBearerBonds: number;
    lastAuditTimestamp: number;
  };
  resourcesBalance: {
    titaniumAlloyTons: number;
    opticalFiberKm: number;
    rfPowerFuelCellsKwh: number;
    satelliteBandwidthGhz: number;
    rareEarthMagnetKg: number;
    quantumEntropyEntropyUnits: number;
  };
  assets?: CitadelAssetItem[];
}

export interface CitadelAssetItem {
  id: string;
  name: string;
  category: 'sovereign_gold' | 'strategic_facilities' | 'crypto_collateral' | 'satellite_rights' | 'rare_earth' | 'debt_securities';
  valuationUsd: number;
  liquidityTier: 'TIER-1 (INSTANT)' | 'TIER-2 (48H)' | 'TIER-3 (STRATEGIC)';
  custodyLocation: string;
  yieldApyPercent: number;
  attestedAuditHash: string;
  allocationPercent: number;
  quantityDescription: string;
  lastValuationDate: string;
}

// ---------------------------------------------------------------------
// Weather, Linked Devices & System Logs Interfaces
// ---------------------------------------------------------------------
export interface WeatherReport {
  stationId: string;
  stationName: string;
  coordinates: string;
  tempCelsius: number;
  tempFahrenheit: number;
  condition: 'Clear Skies' | 'Partly Cloudy' | 'Dense Fog' | 'High-Altitude Cirrus' | 'Ionospheric Storm' | 'Overcast' | 'Live Satellite Telemetry' | string;
  humidityPercent: number;
  barometricPressureHpa: number;
  windSpeedKts: number;
  windDirectionDeg: number;
  windCompass: string;
  dewPointCelsius: number;
  visibilityKm: number;
  tacticalRfIndex: 'OPTIMAL' | 'MODERATE' | 'ATTENUATED' | 'DEGRADED';
  updatedAt: number;
}

export type LinkedDeviceType = 
  | 'uav_recon'
  | 'command_terminal'
  | 'field_tablet'
  | 'satellite_transceiver'
  | 'rf_jammer_pod'
  | 'sensor_beacon'
  | 'biometric_monitor';

export interface LinkedDevice {
  id: string; // e.g. DEV-8802
  name: string;
  type: LinkedDeviceType;
  macAddress: string;
  ipAddress: string;
  status: 'CONNECTED' | 'SYNCING' | 'STANDBY' | 'DISCONNECTED';
  batteryPercent: number;
  signalRssi: number; // dBm
  hardwareModel: string;
  cryptoSuite: string;
  roleDescription: string;
  lastHeartbeat: number;
  isPrimary: boolean;
}

export interface SystemLogEntry {
  id: string;
  timestamp: number;
  level: 'INFO' | 'WARN' | 'CRITICAL' | 'SEC_AUDIT' | 'RF_EMISSION' | 'DEVICE_LINK' | 'ALERT';
  subsystem: 'WEATHER' | 'METEOROLOGY' | 'DEVICES' | 'RADAR' | 'JAMMER' | 'CITADEL' | '4D_ENGINE' | 'MESH_FABRIC' | 'AUTO_CHECK' | 'BIOMETRIC' | 'DRONES' | 'DIAGNOSTICS' | 'HARDWARE_SDR' | 'HARDWARE_HID' | 'TACTICAL_GNSS' | 'CRYPTO' | 'SWARM' | 'SATCOM';
  message: string;
  details?: any;
  hashSignature?: string;
}

// -------------------------------------------------------------
// TACTICAL DRONES & SWARM RECONNAISSANCE
// -------------------------------------------------------------
export type DroneFlightMode = 'AUTONOMOUS_ORBIT' | 'WAYPOINT_PATROL' | 'PERIMETER_SURVEILLANCE' | 'RETURN_TO_BASE' | 'EMERGENCY_LAND' | 'RF_RELAY_STATION' | 'FAILSAFE_RETURN';
export type DronePayloadType = 'EO_IR_OPTICAL' | 'LIDAR_MAPPING' | 'SIGINT_INTERCEPT' | 'MESH_RF_EXTENDER' | 'EW_COUNTERMEASURE';

export interface DroneSwarmUnit {
  id: string; // e.g., UAV-STRIKE-01
  callsign: string; // e.g., Shadow-1
  model: string; // e.g., MQ-9M AeroScan
  flightMode: DroneFlightMode;
  batteryPercent: number;
  altitudeMeters: number;
  groundSpeedKts: number;
  headingDeg: number;
  latitude: number;
  longitude: number;
  rfLinkQualityPercent: number;
  rssiDbm: number;
  payload: DronePayloadType;
  payloadStatus: 'ACTIVE' | 'STANDBY' | 'CALIBRATING' | 'JAMMED';
  gpsLockSatellites: number;
  targetSector: string;
  isArmed: boolean;
  isolationStatus: 'HEALTHY' | 'ISOLATED' | 'FAILSAFE_RETURN';
  lastTelemetryPing: number;
  flightPath: Array<{ x: number; y: number }>;
}

// -------------------------------------------------------------
// AUTO DEBUGGING, ERROR TRACING & ISOLATION SYSTEM
// -------------------------------------------------------------
export type FaultSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'FATAL';
export type FaultDomain = 'WEBAUTHN' | 'WEB_CRYPTO' | 'MESH_NETWORK' | 'WEATHER_TELEMETRY' | 'MEMORY_HEAP' | 'UI_RENDER' | 'P2P_DATALINK' | 'DRONE_UAV';

export interface DiagnosticFaultTrace {
  id: string; // TRACE-9821
  timestamp: number;
  domain: FaultDomain;
  severity: FaultSeverity;
  errorMessage: string;
  stackTrace?: string;
  culpritComponent: string;
  isolated: boolean;
  autoHealed: boolean;
  telemetrySnapshot: {
    memoryUsedMb?: number;
    activeNodes?: number;
    networkLatencyMs?: number;
    cryptoOpsSec?: number;
    userAgent?: string;
  };
  remediationAction?: string;
}

export interface CitadelIntelligence {
  recon: {
    activeScouts: number;
    orbitalPasses: number;
    rfInterceptsCount: number;
    targetSectors: Array<{ sector: string; threatIndex: number; coverage: string; lastPing: string }>;
  };
  intel: {
    interceptBriefs: Array<{ id: string; codename: string; classification: string; summary: string; reliability: 'A1' | 'B2' | 'C3'; timestamp: string }>;
    adversarySignals: Array<{ signal: string; freqMhz: number; origin: string; modulation: string }>;
  };
  status: {
    defenseReadiness: 'OPTIMAL' | 'ELEVATED' | 'CRITICAL';
    citadelIntegrity: number; // 0-100%
    activeGuards: number;
    cryptographicSeal: 'SEALED_VALID' | 'TAMPER_CHECK';
    lastSelfAudit: string;
    automatedCheckLoopFrequencyMs: number;
  };
}

// -------------------------------------------------------------
// PHASE 1: HARDWARE & PHYSICAL LAYER (L1/L2) TYPES
// -------------------------------------------------------------
export type HardwareDriverType = 
  | 'WEBSERIAL_LORA' 
  | 'WEBUSB_RTLSDR' 
  | 'WEBUSB_HACKRF' 
  | 'WEBUSB_LIMESDR' 
  | 'WEBHID_TACTICAL_CONTROLLER' 
  | 'WEBBLUETOOTH_MESHTASTIC' 
  | 'NMEA_SERIAL_GPS' 
  | 'HARDWARE_EMULATION';

export interface HardwareDriverInfo {
  id: string;
  driverType: HardwareDriverType;
  name: string;
  vendorId?: string;
  productId?: string;
  endpointCount?: number;
  sampleRateSps: number;
  centerFreqMhz: number;
  bandwidthKhz: number;
  lnaGainDb: number;
  vgaGainDb?: number;
  biasTeeEnabled: boolean;
  directSamplingMode: 'OFF' | 'I_BRANCH' | 'Q_BRANCH';
  activeIqBufferSamples: number;
  iqDroppedFrames: number;
  isRealUsbAttached?: boolean;
  usbSpeed?: string;
  throughputMBps?: number;
  demodMode?: 'WBFM' | 'NBFM' | 'AM' | 'CW' | 'LORA_CHIRP';
  audioMonitorActive?: boolean;
  audioVolume?: number;
  squelchThresholdDbm?: number;
  snrDb?: number;
  evmPercent?: number;
  isRecordingSigint?: boolean;
  recordedFramesCount?: number;
  waterfallPalette?: 'CYAN_TACTICAL' | 'VIRIDIS' | 'INFERNO' | 'TURBO' | 'PHOSPHOR_GREEN';
}

export interface IqConstellationPoint {
  i: number;
  q: number;
  magnitude: number;
  phaseRad: number;
}

export interface NmeaGpsFix {
  valid: boolean;
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  speedKnots: number;
  bearingDegrees: number;
  satellitesInView: number;
  satellitesLocked: number;
  hdop: number;
  fixType: 'NO_FIX' | '2D_FIX' | '3D_FIX' | 'DGPS' | 'RTK_FIXED' | 'RTK_FLOAT';
  rawNmeaSentence: string;
  lastUpdated: number;
}

export interface WebHidControllerState {
  connected: boolean;
  productName: string;
  vendorId: number;
  productId: number;
  ptzAxes: { x: number; y: number; z: number; throttle: number };
  emergencyZeroizeSwitch: boolean;
  pttVoiceActive: boolean;
  frequencyJogDialDelta: number;
  hardwareButtonStates: boolean[];
}

// -------------------------------------------------------------
// PHASE 2: ADVANCED CRYPTO, ZERO-TRUST & PBFT CONSENSUS TYPES
// -------------------------------------------------------------
export type DoubleRatchetState = {
  dhRatchetKeyPair: { publicKeyHex: string; privateKeyHex?: string };
  dhRemotePublicKeyHex: string;
  rootKeyHex: string;
  sendChainKeyHex: string;
  recvChainKeyHex: string;
  sendCount: number;
  recvCount: number;
  previousCounter: number;
};

export interface ShamirKeyShare {
  shareIndex: number;
  threshold: number;
  totalShares: number;
  shareHex: string;
  ownerNodeId: string;
  ownerCallsign: string;
  signature: string;
  timestamp: number;
}

export type PbftPhase = 'PRE_PREPARE' | 'PREPARE' | 'COMMIT' | 'FINALIZED' | 'VIEW_CHANGE';

export interface PbftBlockProposal {
  blockNumber: number;
  viewNumber: number;
  proposalDigest: string;
  proposerNodeId: string;
  timestamp: number;
  transactions: Array<{
    txId: string;
    type: 'KEY_ROTATION' | 'DIRECTIVE' | 'LEDGER_ENTRY' | 'SHUTDOWN_ORDNANCE' | 'ACCESS_GRANT';
    sourceNode: string;
    targetNode?: string;
    payloadSummary: string;
    signature: string;
  }>;
  prePrepareSignatures: Record<string, string>; // nodeId -> signature
  prepareSignatures: Record<string, string>;
  commitSignatures: Record<string, string>;
  phase: PbftPhase;
  quorumReached: boolean;
}

export interface ZkRangeProofResult {
  proofId: string;
  variableName: string;
  minimumAllowed: number;
  maximumAllowed: number;
  isWithinBounds: boolean;
  commitmentPedersenHex: string;
  proofDigestHex: string;
  verifiedAt: number;
  verifierWitnessCount: number;
}

// ---------------------------------------------------------------------
// PHASE 4: DIRECTED ENERGY (DEW), HYPERSONIC INTERCEPT & QUANTUM TELEPORTATION
// ---------------------------------------------------------------------
export type DewWeaponType = 'TACTICAL_FIBER_LASER_100KW' | 'HIGH_POWER_MICROWAVE_PHASED' | 'KINETIC_RAILGUN_HYPERVELOCITY';

export interface DirectedEnergyWeaponUnit {
  unitId: string;
  name: string;
  type: DewWeaponType;
  opticalWavelengthNm: number;
  continuousPowerKw: number;
  capacitorChargePercent: number;
  coolingLoopTempC: number;
  maxCoolingTempC: number;
  thermalBloomingFactor: number; // 0..1
  beamJitterMicrorad: number;
  targetLockedTrackId?: string;
  firingState: 'STANDBY' | 'ACQUIRING' | 'CHARGING' | 'ENGAGING_LASER' | 'COOLING_DOWN';
  dwellTimeRemainingMs: number;
  shotsFiredCount: number;
  interceptionsConfirmed: number;
}

export interface HypersonicThreatTrack {
  trackId: string;
  classification: 'HGV_AVANGARD_CLASS' | 'HCM_SCRAMJET_CRUISE' | 'SWARM_CLUSTER_MIRV' | 'BALLISTIC_BOOSTER';
  originLaunchVector: string;
  currentPosition: { lat: number; lng: number; altKm: number };
  velocityMach: number;
  headingDeg: number;
  climbRateMs: number;
  skipGlideManeuvering: boolean;
  plasmaSheathBlackout: boolean;
  predictedImpactCoordinates: { lat: number; lng: number };
  timeToImpactSeconds: number;
  assignedInterceptorUnitId?: string;
  interceptProbabilityPk: number; // 0..100%
  interceptGeometryStatus: 'SEARCH' | 'CALCULATING_SOLUTION' | 'INTERCEPT_VECTOR_LOCKED' | 'ENGAGED' | 'TARGET_NEUTRALIZED';
}

export type BellState = 'PHI_PLUS' | 'PHI_MINUS' | 'PSI_PLUS' | 'PSI_MINUS'; // (|00>+|11>)/sqrt(2), etc.
export type BellMeasurementOutcome = '00' | '01' | '10' | '11';

export interface QuantumTeleportationChannel {
  channelId: string;
  nodeAliceId: string;
  nodeBobId: string;
  bellPairState: BellState;
  entanglementFidelityPercent: number;
  transmittedQubitState: {
    alphaAmplitude: string; // e.g. "0.800|0>"
    betaAmplitude: string;  // e.g. "0.600e^(i*pi/3)|1>"
    blochThetaRad: number;
    blochPhiRad: number;
  };
  bellStateMeasurementOutcome?: BellMeasurementOutcome;
  pauliCorrectionApplied: 'I' | 'SIGMA_X' | 'SIGMA_Z' | 'SIGMA_XZ';
  teleportedStateVerified: boolean;
  quantumRepeatersInPath: number;
  lastTeleportTimestamp: number;
  status: 'IDLE' | 'ENTANGLING' | 'MEASURING_BSM' | 'CLASSICAL_FEEDBACK' | 'TELEPORTED_VALID';
}

export type PqcAlgorithm = 'ML-KEM-768' | 'ML-KEM-1024' | 'ML-DSA-65' | 'ML-DSA-87';

export interface PqcKeyExchangeState {
  algorithm: PqcAlgorithm;
  publicKeyHex: string;
  privateKeySeedHex: string;
  encapsulatedCiphertextHex: string;
  sharedDerivedSecretHex: string;
  dilithiumSignatureHex: string;
  latticeRingDimension: number;
  modulusQ: number;
  securityBits: number;
  timestamp: number;
  isVerified: boolean;
}

export type QuantumBasis = 'RECTILINEAR' | 'DIAGONAL'; // + vs x
export type PhotonPolarization = 'H' | 'V' | 'D_POS' | 'D_NEG'; // 0, 90, 45, 135 deg

export interface QkdPhotonPulse {
  index: number;
  aliceBit: 0 | 1;
  aliceBasis: QuantumBasis;
  polarization: PhotonPolarization;
  eveInterception: boolean;
  eveBasisMeasured?: QuantumBasis;
  bobBasis: QuantumBasis;
  bobMeasuredBit?: 0 | 1;
  basisMatch: boolean;
  isError: boolean;
}

export interface QkdSessionState {
  sessionId: string;
  protocol: 'BB84' | 'E91_ENTANGLEMENT';
  opticalChannelMhz: number;
  totalPhotonsTransmitted: number;
  eveEavesdroppingActive: boolean;
  pulses: QkdPhotonPulse[];
  siftedBitsCount: number;
  errorBitsCount: number;
  qberPercent: number;
  qberThresholdExceeded: boolean;
  privacyAmplifiedKeyHex: string;
  keyGenerationRateBps: number;
  status: 'TRANSMITTING' | 'SIFTING' | 'ERROR_CORRECTION' | 'KEY_ESTABLISHED' | 'COMPROMISED_EVE';
}

export interface SatcomOrbitalPass {
  satId: string;
  name: string;
  constellation: 'STARLINK-GEN2' | 'ONEWEB' | 'MIL-SAT-UHF' | 'O3B-MPOWER';
  orbitType: 'LEO' | 'MEO' | 'GEO';
  altitudeKm: number;
  azimuthDeg: number;
  elevationDeg: number;
  slantRangeKm: number;
  dopplerShiftKhz: number;
  uplinkFreqMhz: number;
  downlinkFreqMhz: number;
  carrierToNoiseDbHz: number;
  laserIslActive: boolean;
  connectedMeshGatewayId: string;
  signalStrengthDbm: number;
  linkStatus: 'LOCKED' | 'ACQUIRING' | 'OCCLUDED' | 'HANDOVER';
}

export interface MultiDomainSwarmMission {
  missionId: string;
  codename: string;
  domain: 'CROSS_DOMAIN_SYNC' | 'AIR_SPACE' | 'SUB_SURFACE' | 'SURFACE_TACTICAL';
  flockCohesion: number; // 0..1
  flockSeparation: number; // 0..1
  flockAlignment: number; // 0..1
  targetCoordinates: { lat: number; lng: number; altMeters: number };
  activeUnits: Array<{
    unitId: string;
    callsign: string;
    domainType: 'UAV_RECON' | 'UGV_ASSAULT' | 'UUV_SONAR' | 'SATCOM_LEO';
    position: { lat: number; lng: number; altMeters: number };
    batteryPercent: number;
    neuralUtilityScore: number;
    assignedObjective: string;
  }>;
  consensusScore: number;
  pqcAttestationHash: string;
  status: 'PLANNING' | 'ENGAGED' | 'RTB' | 'COMPLETED';
}

// ==========================================
// TRACK 3: HARDWARE FIELD PROTOCOLS
// ==========================================

// --- 1. Meshtastic WebBluetooth (BLE) Types ---
export type MeshtasticNodeRole = 
  | 'CLIENT' 
  | 'CLIENT_MUTE' 
  | 'ROUTER' 
  | 'ROUTER_CLIENT' 
  | 'REPEATER' 
  | 'TRACKER' 
  | 'SENSOR' 
  | 'TAK' 
  | 'CLIENT_HIDDEN';

export interface MeshtasticChannelConfig {
  index: number; // 0 to 7
  name: string; // e.g. "LongFast", "Tactical-Alpha", "Admin"
  role: 'PRIMARY' | 'SECONDARY' | 'DISABLED';
  pskType: 'DEFAULT' | 'AES_128' | 'AES_256' | 'NONE';
  pskKey: string; // Base64 or Hex key
  uplinkEnabled: boolean;
  downlinkEnabled: boolean;
  bitrateBps?: number;
  channelNum?: number; // LoRa frequency slot
  moduleSettings?: {
    positionPrecision?: number;
    telemetryIntervalSecs?: number;
  };
}

export interface MeshtasticAdminConfig {
  targetNodeNum: number;
  role: MeshtasticNodeRole;
  txPowerDbm: number; // 10..30 dBm
  hopLimit: number; // 1..7
  positionBroadcastSecs: number; // e.g. 30, 60, 300, 900
  telemetryBroadcastSecs: number; // e.g. 60, 300, 1800
  isFixedPosition: boolean;
  fixedLatitude?: number;
  fixedLongitude?: number;
  fixedAltitude?: number;
  regionCode: 'US' | 'EU_868' | 'ANZ' | 'JP' | 'CN' | 'KR';
  bluetoothPin: string;
}

export interface MeshtasticBleNode {
  num: number; // 32-bit Node ID (e.g. 0x2a1b9f84)
  user: {
    id: string; // !2a1b9f84
    longName: string;
    shortName: string;
    hwModel: 'T_BEAM' | 'HELTEC_V3' | 'RAK4631' | 'T_ECHO' | 'STATION_G2' | 'SIMULATED_BLE';
    macaddr: string;
  };
  position?: {
    latitudeI: number; // integer 1e-7 deg
    longitudeI: number;
    altitude: number; // meters MSL
    time: number;
    satsInView: number;
  };
  snr: number; // dB
  rssi: number; // dBm
  lastHeard: number; // Unix timestamp ms
  batteryLevel?: number; // 0..100%
  voltage?: number; // Volts (e.g. 4.12V)
  hopsAway: number;
  channel: number;
  isFavorite?: boolean;
  role?: MeshtasticNodeRole;
  txPowerDbm?: number;
  hopLimit?: number;
  positionBroadcastSecs?: number;
  telemetryBroadcastSecs?: number;
  isFixedPosition?: boolean;
  firmwareVersion?: string;
}

export interface MeshtasticMessage {
  id: string;
  from: number;
  to: number; // 0xffffffff for broadcast
  fromName: string;
  text: string;
  timestamp: number;
  channel: number;
  portNum: 'TEXT_MESSAGE_APP' | 'TELEMETRY_APP' | 'POSITION_APP' | 'ROUTING_APP';
  hopLimit: number;
  rxSnr: number;
  rxRssi: number;
  isAcked?: boolean;
}

export interface DiscoveredBleRadioNode {
  id: string; // Unique BLE device identifier or MAC
  name: string; // e.g. "Meshtastic_2a1b", "T-Beam-915", "Heltec-V3-Sentry"
  rssi: number; // dBm (-30 dBm to -100 dBm)
  signalPercent: number; // 0..100%
  signalBars: number; // 1..5 bars
  distanceMeters: number; // estimated distance from path loss model
  hwModel: 'T_BEAM' | 'HELTEC_V3' | 'RAK4631' | 'T_ECHO' | 'STATION_G1' | 'GENERIC_BLE';
  nodeNumHex: string; // e.g. "!2a1b9f84"
  macAddress: string;
  serviceUuids: string[];
  txPower?: number; // advertised txPower in dBm
  lastSeen: number; // timestamp
  isConnectable: boolean;
  isCurrentlyConnected: boolean;
  batteryPercent: number; // 0..100%
  batteryVoltage?: number; // Volts e.g. 4.12V
  rawDevice?: any; // Native WebBluetooth BluetoothDevice reference
}

export interface LoraRfPacketEvent {
  id: string;
  timestamp: number;
  freqMhz: number;
  bandwidthKhz: 125 | 250 | 500;
  spreadingFactor: 7 | 8 | 9 | 10 | 11 | 12;
  codingRate: '4/5' | '4/6' | '4/7' | '4/8';
  senderNode: string;
  senderName: string;
  packetType: 'TELEMETRY' | 'POSITION' | 'TEXT_MESSAGE' | 'NODE_INFO' | 'ROUTER_DISCOVERY' | 'ACK' | 'PING';
  rssi: number; // dBm e.g. -78
  snr: number; // dB e.g. +9.4
  payloadSize: number; // bytes
  airtimeMs: number; // time on air in ms
  chirpDirection: 'UP' | 'DOWN';
}

export interface LoraRfMetricsHistoryPoint {
  timestamp: number;
  timeLabel: string;
  rssi: number;
  snr: number;
  noiseFloorDbm: number;
  channelUtilizationPct: number;
  packetLossRatePct: number;
  nodeNumHex?: string;
  nodeName?: string;
}

export interface MeshtasticWaypoint {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  icon: 'FLAG' | 'BASE' | 'LZ' | 'HAZARD' | 'MEDICAL' | 'RELAY';
  createdByNode: number;
  createdByName: string;
  timestamp: number;
  expireSecs?: number;
}

export interface MeshtasticTracerouteHop {
  hopNumber: number;
  nodeNum: number;
  nodeId: string;
  nodeName: string;
  snrTowardsTarget: number; // dB
  snrTowardsOrigin?: number; // dB
  rssi?: number;
  latencyMs: number;
  isDestination: boolean;
}

export interface MeshtasticTracerouteResult {
  id: string;
  targetNodeNum: number;
  targetNodeName: string;
  originNodeNum: number;
  originNodeName: string;
  timestamp: number;
  totalHops: number;
  roundTripTimeMs: number;
  routeStatus: 'OPTIMAL' | 'DEGRADED' | 'UNREACHABLE';
  hops: MeshtasticTracerouteHop[];
  estimatedPacketLossPct: number;
}

export interface MeshtasticBleState {
  isConnected: boolean;
  isConnecting: boolean;
  isSimulated: boolean;
  isBleScanning: boolean;
  scanMode: 'PROXIMITY_SWEEP' | 'PHYSICAL_PICKER';
  discoveredBleRadios: DiscoveredBleRadioNode[];
  deviceName: string | null;
  deviceBattery: number;
  deviceVoltage: number;
  myNodeNum: number;
  primaryChannel: string;
  frequencySlotMhz: number;
  modemPreset: 'LONG_FAST' | 'LONG_SLOW' | 'MEDIUM_FAST' | 'SHORT_FAST';
  regionCode: 'US' | 'EU_868' | 'ANZ' | 'JP' | 'CN' | 'KR';
  txPowerDbm: number;
  hopLimit: number;
  nodeRole: MeshtasticNodeRole;
  positionBroadcastSecs: number;
  telemetryBroadcastSecs: number;
  isFixedPosition: boolean;
  channels: MeshtasticChannelConfig[];
  nodes: MeshtasticBleNode[];
  messages: MeshtasticMessage[];
  packetsSent: number;
  packetsReceived: number;
  rfPackets: LoraRfPacketEvent[];
  rfMetricsHistory: LoraRfMetricsHistoryPoint[];
  channelAirtimePct: number;
  channelNoiseFloorDbm: number;
  waypoints: MeshtasticWaypoint[];
  activeTraceroute?: MeshtasticTracerouteResult | null;
  emergencySosActive: boolean;
  emergencySosDetails?: string | null;
}

// --- 2. STANAG 4586 / MAVLink v2 Telemetry Types ---
export type MavlinkFlightMode = 
  | 'STABILIZE' 
  | 'ACRO' 
  | 'ALT_HOLD' 
  | 'AUTO' 
  | 'GUIDED' 
  | 'LOITER' 
  | 'RTL' 
  | 'LAND' 
  | 'POSHOLD' 
  | 'BRAKE';

export interface MavlinkTelemetry {
  systemId: number;
  componentId: number;
  isArmed: boolean;
  flightMode: MavlinkFlightMode;
  batteryVoltage: number; // Volts
  batteryRemainingPercent: number; // 0..100
  batteryCurrentA: number;
  // Kinematics & Attitude
  rollDeg: number; // -180..180
  pitchDeg: number; // -90..90
  yawDeg: number; // 0..360
  climbRateMps: number;
  groundSpeedMps: number;
  airSpeedMps: number;
  headingDeg: number;
  // Position
  lat: number;
  lng: number;
  altRelativeMeters: number;
  altMslMeters: number;
  // GNSS Quality
  gpsFixType: 'NO_GPS' | '2D_FIX' | '3D_FIX' | 'DGPS' | 'RTK_FLOAT' | 'RTK_FIXED';
  satellitesVisible: number;
  hdop: number;
  vdop: number;
  // Link
  rssiPercent: number;
  packetDropRate: number;
  cpuLoadPercent: number;
  lastHeartbeatMs: number;
}

export interface MavlinkPacketLog {
  timestamp: number;
  seq: number;
  sysId: number;
  compId: number;
  msgId: number;
  msgName: string;
  payloadSummary: string;
  rawHex: string;
}

export interface MavlinkConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  isSimulated: boolean;
  portName: string | null;
  baudRate: number;
  protocolVersion: 'MAVLink_v2' | 'STANAG_4586_GCS';
  telemetry: MavlinkTelemetry;
  packetLogs: MavlinkPacketLog[];
  activeCommands: string[];
}

// --- 3. ATAK / CoT (Cursor-on-Target) Types ---
export interface AtakCotEvent {
  uid: string;
  type: string; // e.g. "a-f-A-M-F-Q" (Friendly Airborne Drone)
  time: string; // ISO 8601 UTC
  start: string;
  stale: string;
  how: 'm-g' | 'm-r' | 'h-e';
  point: {
    lat: number;
    lon: number;
    hae: number; // Height Above Ellipsoid (meters)
    ce: number; // Circular Error (meters)
    le: number; // Linear Error (meters)
  };
  detail: {
    callsign: string;
    endpoint?: string;
    groupName?: string;
    role?: string;
    battery?: number;
    courseDeg?: number;
    speedMps?: number;
    remarks?: string;
    colorHex?: string;
    classification?: 'FRIENDLY' | 'HOSTILE' | 'UNKNOWN' | 'NEUTRAL';
  };
  rawXml?: string;
}

export interface AtakCotGatewayState {
  isStreaming: boolean;
  multicastGroup: string; // e.g. "239.2.3.1:6969"
  takServerAddress: string;
  connectedClients: number;
  eventsSent: number;
  eventsReceived: number;
  latestEvents: AtakCotEvent[];
  autoSyncDroneSwarm: boolean;
  autoSyncMeshNodes: boolean;
  autoSyncSdrEmitters: boolean;
}

// --- 4. Multi-Operator Tactical Mesh Cloud Sync (Firebase Firestore) ---
export interface MeshMission {
  id: string;
  code: string;
  name: string;
  ownerId: string;
  frequency: string;
  modemPreset: string;
  operatorCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface MeshMissionNode {
  id: string;
  missionId: string;
  num: number;
  shortName: string;
  longName: string;
  hwModel: string;
  role: string;
  snr: number;
  rssi: number;
  batteryLevel: number;
  voltage: number;
  channelUtilization: number;
  airUtilTx: number;
  latitude: number;
  longitude: number;
  altitude: number;
  lastHeard: number;
  reportedBy: string;
}

export interface MeshMissionWaypoint {
  id: string;
  missionId: string;
  title: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  category: string;
  color?: string;
  description?: string;
  createdBy: string;
  createdAt: number;
}

export interface MeshMissionMessage {
  id: string;
  missionId: string;
  from: number;
  fromName: string;
  to?: number;
  text: string;
  channel?: number;
  rxSnr?: number;
  rxRssi?: number;
  hopLimit?: number;
  isAcked?: boolean;
  senderOperator: string;
  timestamp: number;
}

export interface MeshMissionSos {
  id: string;
  missionId: string;
  active: boolean;
  initiatorName?: string;
  initiatorNodeNum?: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  emergencyType?: string;
  message?: string;
  timestamp: number;
  acknowledgedBy?: string;
}

export interface MeshCloudSyncState {
  isConnected: boolean;
  isSyncing: boolean;
  activeMission: MeshMission | null;
  availableMissions: MeshMission[];
  cloudNodesCount: number;
  cloudWaypointsCount: number;
  cloudMessagesCount: number;
  activeSosAlert: MeshMissionSos | null;
  lastSyncedTimestamp: number | null;
  error: string | null;
}

