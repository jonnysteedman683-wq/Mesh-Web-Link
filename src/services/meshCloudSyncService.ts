import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  Unsubscribe 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { meshtasticBleService } from './meshtasticBleService';
import { 
  MeshMission, 
  MeshMissionNode, 
  MeshMissionWaypoint, 
  MeshMissionMessage, 
  MeshMissionSos, 
  MeshCloudSyncState,
  MeshtasticBleNode,
  MeshtasticWaypoint,
  MeshtasticMessage 
} from '../types';
import { tactileAudio } from './tactileAudio';

class MeshCloudSyncService {
  private state: MeshCloudSyncState = {
    isConnected: false,
    isSyncing: false,
    activeMission: null,
    availableMissions: [],
    cloudNodesCount: 0,
    cloudWaypointsCount: 0,
    cloudMessagesCount: 0,
    activeSosAlert: null,
    lastSyncedTimestamp: null,
    error: null
  };

  private listeners: Set<(state: MeshCloudSyncState) => void> = new Set();
  private unsubs: Unsubscribe[] = [];
  private isPushingLocal: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    // Listen to Firebase Auth state
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        this.updateState({ isConnected: true, error: null });
        await this.fetchAvailableMissions();
      } else {
        this.leaveMission();
        this.updateState({ isConnected: false, activeMission: null, availableMissions: [] });
      }
    });

    // Wire up local Meshtastic BLE changes to automatically sync up to active mission
    meshtasticBleService.subscribe(() => {
      const bleState = meshtasticBleService.getState();
      if (!this.state.activeMission || !auth.currentUser || this.isPushingLocal) return;

      // Sync local nodes if connected
      if (bleState.isConnected && bleState.nodes.length > 0) {
        this.syncLocalNodesToCloud(bleState.nodes);
      }
    });
  }

  public getState(): MeshCloudSyncState {
    return { ...this.state };
  }

  public subscribe(listener: (state: MeshCloudSyncState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private updateState(patch: Partial<MeshCloudSyncState>) {
    this.state = { ...this.state, ...patch };
    this.notify();
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach(cb => cb(s));
  }

  /**
   * Fetch list of available active tactical missions in Firestore
   */
  public async fetchAvailableMissions(): Promise<MeshMission[]> {
    if (!auth.currentUser) return [];
    const missionsPath = 'mesh_missions';

    try {
      this.updateState({ isSyncing: true });
      const coll = collection(db, missionsPath);
      const snapshot = await getDocs(coll);
      
      const missions: MeshMission[] = [];
      snapshot.forEach(d => {
        missions.push({ id: d.id, ...d.data() } as MeshMission);
      });

      // Default mission if none exists
      if (missions.length === 0) {
        const defaultMission = await this.createMission(
          'Joint Ops Task Force (Alpha)',
          'OP-TASKFORCE-ALPHA',
          '915.000 MHz',
          'LONG_FAST'
        );
        missions.push(defaultMission);
      }

      this.updateState({ availableMissions: missions, isSyncing: false });
      return missions;
    } catch (err) {
      this.updateState({ isSyncing: false, error: 'Failed to fetch cloud missions' });
      handleFirestoreError(err, OperationType.LIST, missionsPath);
    }
  }

  /**
   * Create a new Tactical Mesh Mission Room
   */
  public async createMission(
    name: string,
    code: string,
    frequency: string = '915.000 MHz',
    modemPreset: string = 'LONG_FAST'
  ): Promise<MeshMission> {
    const uid = auth.currentUser?.uid || 'commander-local';
    const missionId = `mission-${code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
    const missionPath = `mesh_missions/${missionId}`;

    const newMission: MeshMission = {
      id: missionId,
      code: code.toUpperCase(),
      name,
      ownerId: uid,
      frequency,
      modemPreset,
      operatorCount: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      this.updateState({ isSyncing: true });
      const docRef = doc(db, 'mesh_missions', missionId);
      await setDoc(docRef, newMission);
      
      tactileAudio.playSuccess();
      await this.joinMission(missionId);
      return newMission;
    } catch (err) {
      this.updateState({ isSyncing: false, error: 'Failed to initialize mission' });
      handleFirestoreError(err, OperationType.CREATE, missionPath);
    }
  }

  /**
   * Join an existing tactical mission and establish live multi-operator real-time listeners
   */
  public async joinMission(missionId: string): Promise<boolean> {
    const targetMission = this.state.availableMissions.find(m => m.id === missionId);
    const missionPath = `mesh_missions/${missionId}`;

    try {
      this.updateState({ isSyncing: true });

      // Clean up previous listeners
      this.leaveMission();

      let activeMission = targetMission;
      if (!activeMission) {
        const mDoc = await getDoc(doc(db, 'mesh_missions', missionId));
        if (mDoc.exists()) {
          activeMission = { id: mDoc.id, ...mDoc.data() } as MeshMission;
        }
      }

      if (!activeMission) {
        throw new Error(`Mission ${missionId} not found`);
      }

      this.updateState({
        activeMission,
        isSyncing: false,
        lastSyncedTimestamp: Date.now()
      });

      // 1. Subscribe to Mesh Nodes in this Mission
      const nodesPath = `mesh_missions/${missionId}/nodes`;
      const nodesUnsub = onSnapshot(collection(db, 'mesh_missions', missionId, 'nodes'), (snapshot) => {
        const cloudNodes: MeshMissionNode[] = [];
        snapshot.forEach(d => {
          cloudNodes.push({ id: d.id, ...d.data() } as MeshMissionNode);
        });

        this.updateState({ cloudNodesCount: cloudNodes.length, lastSyncedTimestamp: Date.now() });
        this.mergeCloudNodesToLocal(cloudNodes);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, nodesPath);
      });
      this.unsubs.push(nodesUnsub);

      // 2. Subscribe to Tactical Waypoints
      const waypointsPath = `mesh_missions/${missionId}/waypoints`;
      const waypointsUnsub = onSnapshot(collection(db, 'mesh_missions', missionId, 'waypoints'), (snapshot) => {
        const cloudWaypoints: MeshtasticWaypoint[] = [];
        snapshot.forEach(d => {
          const data = d.data() as MeshMissionWaypoint;
          cloudWaypoints.push({
            id: data.id,
            name: data.title,
            latitude: data.latitude,
            longitude: data.longitude,
            altitudeMeters: data.altitude ?? 50,
            icon: (data.category as any) || 'FLAG',
            description: data.description,
            createdByNode: 0x00000000,
            createdByName: data.createdBy,
            timestamp: data.createdAt
          });
        });

        this.updateState({ cloudWaypointsCount: cloudWaypoints.length, lastSyncedTimestamp: Date.now() });
        this.mergeCloudWaypointsToLocal(cloudWaypoints);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, waypointsPath);
      });
      this.unsubs.push(waypointsUnsub);

      // 3. Subscribe to Multi-Operator Messages & LoRa Packets
      const messagesPath = `mesh_missions/${missionId}/messages`;
      const msgsQuery = query(
        collection(db, 'mesh_missions', missionId, 'messages'),
        orderBy('timestamp', 'asc'),
        limit(50)
      );

      const msgsUnsub = onSnapshot(msgsQuery, (snapshot) => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data() as MeshMissionMessage;
            this.mergeCloudMessageToLocal(data);
          }
        });
        this.updateState({ cloudMessagesCount: snapshot.size, lastSyncedTimestamp: Date.now() });
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, messagesPath);
      });
      this.unsubs.push(msgsUnsub);

      // 4. Subscribe to Emergency SOS Status
      const sosPath = `mesh_missions/${missionId}/sos`;
      const sosUnsub = onSnapshot(collection(db, 'mesh_missions', missionId, 'sos'), (snapshot) => {
        let activeSos: MeshMissionSos | null = null;
        snapshot.forEach(d => {
          const data = d.data() as MeshMissionSos;
          if (data.active) {
            activeSos = data;
          }
        });

        this.updateState({ activeSosAlert: activeSos });
        if (activeSos) {
          tactileAudio.playAlarm();
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, sosPath);
      });
      this.unsubs.push(sosUnsub);

      tactileAudio.playNodeConnect();
      return true;
    } catch (err) {
      this.updateState({ isSyncing: false, error: 'Failed to join mission' });
      handleFirestoreError(err, OperationType.GET, missionPath);
    }
  }

  /**
   * Leave active mission and stop sync listeners
   */
  public leaveMission() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    this.updateState({
      activeMission: null,
      cloudNodesCount: 0,
      cloudWaypointsCount: 0,
      cloudMessagesCount: 0,
      activeSosAlert: null
    });
  }

  /**
   * Push local BLE discovered nodes into Firestore
   */
  public async syncLocalNodesToCloud(nodes: MeshtasticBleNode[]) {
    if (!this.state.activeMission || !auth.currentUser) return;
    const missionId = this.state.activeMission.id;
    const userCallsign = auth.currentUser.displayName || auth.currentUser.email || 'Operator-Alpha';

    this.isPushingLocal = true;
    try {
      for (const node of nodes) {
        const nodeId = `node-${node.num}`;
        const nodeRef = doc(db, 'mesh_missions', missionId, 'nodes', nodeId);

        const lat = node.position ? node.position.latitudeI / 1e7 : 37.7749;
        const lon = node.position ? node.position.longitudeI / 1e7 : -122.4194;
        const alt = node.position?.altitude ?? 84;

        const nodeData: MeshMissionNode = {
          id: nodeId,
          missionId,
          num: node.num,
          shortName: node.user.shortName,
          longName: node.user.longName,
          hwModel: node.user.hwModel,
          role: node.role || 'ROUTER_CLIENT',
          snr: node.snr,
          rssi: node.rssi,
          batteryLevel: node.batteryLevel ?? 85,
          voltage: node.voltage ?? 4.12,
          channelUtilization: 14,
          airUtilTx: 3,
          latitude: lat,
          longitude: lon,
          altitude: alt,
          lastHeard: node.lastHeard,
          reportedBy: userCallsign
        };

        await setDoc(nodeRef, nodeData, { merge: true });
      }
    } catch (err) {
      console.warn('Silent cloud node sync issue:', err);
    } finally {
      this.isPushingLocal = false;
    }
  }

  /**
   * Broadcast a tactical waypoint to cloud Firestore
   */
  public async broadcastWaypoint(waypoint: {
    id: string;
    title: string;
    latitude: number;
    longitude: number;
    altitude?: number;
    category: string;
    description?: string;
    createdBy?: string;
    createdAt?: number;
  }): Promise<boolean> {
    if (!this.state.activeMission || !auth.currentUser) return false;
    const missionId = this.state.activeMission.id;
    const waypointPath = `mesh_missions/${missionId}/waypoints/${waypoint.id}`;

    try {
      const wRef = doc(db, 'mesh_missions', missionId, 'waypoints', waypoint.id);
      const data: MeshMissionWaypoint = {
        id: waypoint.id,
        missionId,
        title: waypoint.title,
        latitude: waypoint.latitude,
        longitude: waypoint.longitude,
        altitude: waypoint.altitude,
        category: waypoint.category,
        description: waypoint.description || '',
        createdBy: auth.currentUser.displayName || waypoint.createdBy || 'Operator',
        createdAt: waypoint.createdAt || Date.now()
      };

      await setDoc(wRef, data);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, waypointPath);
    }
  }

  /**
   * Delete a tactical waypoint from cloud Firestore
   */
  public async deleteWaypoint(waypointId: string): Promise<boolean> {
    if (!this.state.activeMission || !auth.currentUser) return false;
    const missionId = this.state.activeMission.id;
    const waypointPath = `mesh_missions/${missionId}/waypoints/${waypointId}`;

    try {
      const wRef = doc(db, 'mesh_missions', missionId, 'waypoints', waypointId);
      await deleteDoc(wRef);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, waypointPath);
    }
  }

  /**
   * Broadcast a transmitted or received LoRa packet into cloud
   */
  public async broadcastMessage(msg: MeshtasticMessage): Promise<boolean> {
    if (!this.state.activeMission || !auth.currentUser) return false;
    const missionId = this.state.activeMission.id;
    const msgId = msg.id || `msg-${Date.now()}`;
    const messagePath = `mesh_missions/${missionId}/messages/${msgId}`;

    try {
      const mRef = doc(db, 'mesh_missions', missionId, 'messages', msgId);
      const data: MeshMissionMessage = {
        id: msgId,
        missionId,
        from: msg.from,
        fromName: msg.fromName,
        to: msg.to,
        text: msg.text,
        channel: msg.channel,
        rxSnr: msg.rxSnr,
        rxRssi: msg.rxRssi,
        hopLimit: msg.hopLimit,
        isAcked: msg.isAcked,
        senderOperator: auth.currentUser.displayName || 'Operator',
        timestamp: msg.timestamp
      };

      await setDoc(mRef, data);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, messagePath);
    }
  }

  /**
   * Trigger emergency SOS across cloud mission
   */
  public async triggerEmergencySos(details: {
    initiatorName: string;
    initiatorNodeNum: number;
    latitude: number;
    longitude: number;
    altitude: number;
    emergencyType: string;
    message: string;
  }): Promise<boolean> {
    if (!this.state.activeMission || !auth.currentUser) return false;
    const missionId = this.state.activeMission.id;
    const sosId = 'active-distress-beacon';
    const sosPath = `mesh_missions/${missionId}/sos/${sosId}`;

    try {
      const sRef = doc(db, 'mesh_missions', missionId, 'sos', sosId);
      const data: MeshMissionSos = {
        id: sosId,
        missionId,
        active: true,
        initiatorName: details.initiatorName,
        initiatorNodeNum: details.initiatorNodeNum,
        latitude: details.latitude,
        longitude: details.longitude,
        altitude: details.altitude,
        emergencyType: details.emergencyType,
        message: details.message,
        timestamp: Date.now()
      };

      await setDoc(sRef, data);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, sosPath);
    }
  }

  /**
   * Stand down / acknowledge active emergency distress beacon
   */
  public async standDownEmergencySos(): Promise<boolean> {
    if (!this.state.activeMission || !auth.currentUser) return false;
    const missionId = this.state.activeMission.id;
    const sosId = 'active-distress-beacon';
    const sosPath = `mesh_missions/${missionId}/sos/${sosId}`;

    try {
      const sRef = doc(db, 'mesh_missions', missionId, 'sos', sosId);
      await setDoc(sRef, {
        id: sosId,
        missionId,
        active: false,
        timestamp: Date.now(),
        acknowledgedBy: auth.currentUser.displayName || auth.currentUser.email || 'Command-Post'
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, sosPath);
    }
  }

  // --- Internal Ingestion & Merging ---

  private mergeCloudNodesToLocal(cloudNodes: MeshMissionNode[]) {
    const bleState = meshtasticBleService.getState();
    const existingNums = new Set(bleState.nodes.map(n => n.num));

    const validHwModels: ('T_BEAM' | 'HELTEC_V3' | 'RAK4631' | 'T_ECHO' | 'STATION_G2' | 'SIMULATED_BLE')[] = [
      'T_BEAM', 'HELTEC_V3', 'RAK4631', 'T_ECHO', 'STATION_G2', 'SIMULATED_BLE'
    ];

    cloudNodes.forEach(cNode => {
      // If we don't have this node locally from direct BLE, or cloud has newer data, ingest it!
      if (!existingNums.has(cNode.num)) {
        const hw = validHwModels.includes(cNode.hwModel as any)
          ? (cNode.hwModel as any)
          : 'HELTEC_V3';

        const synthesized: MeshtasticBleNode = {
          num: cNode.num,
          user: {
            id: `!${cNode.num.toString(16).padStart(8, '0')}`,
            longName: `${cNode.longName} [Cloud Sync]`,
            shortName: cNode.shortName,
            macaddr: `AA:BB:CC:DD:${cNode.num.toString(16).slice(-2)}`,
            hwModel: hw
          },
          position: {
            latitudeI: Math.round(cNode.latitude * 1e7),
            longitudeI: Math.round(cNode.longitude * 1e7),
            altitude: cNode.altitude,
            time: Math.floor(cNode.lastHeard / 1000),
            satsInView: 8
          },
          snr: cNode.snr,
          rssi: cNode.rssi,
          lastHeard: cNode.lastHeard,
          batteryLevel: cNode.batteryLevel,
          voltage: cNode.voltage,
          hopsAway: 2,
          channel: 0,
          role: (cNode.role as any) || 'ROUTER_CLIENT'
        };

        (meshtasticBleService as any).state.nodes.push(synthesized);
      }
    });

    (meshtasticBleService as any).notify();
  }

  private mergeCloudWaypointsToLocal(cloudWaypoints: MeshtasticWaypoint[]) {
    const bleState = meshtasticBleService.getState();
    const existingIds = new Set((bleState.waypoints || []).map(w => w.id));

    let updated = false;
    const currentList = [...(bleState.waypoints || [])];

    cloudWaypoints.forEach(cw => {
      if (!existingIds.has(cw.id)) {
        currentList.push(cw);
        updated = true;
      }
    });

    if (updated) {
      (meshtasticBleService as any).state.waypoints = currentList;
      (meshtasticBleService as any).notify();
    }
  }

  private mergeCloudMessageToLocal(cloudMsg: MeshMissionMessage) {
    const bleState = meshtasticBleService.getState();
    const alreadyExists = bleState.messages.some(m => m.id === cloudMsg.id);
    if (alreadyExists) return;

    // Check if message is from this operator
    const isMe = auth.currentUser && (cloudMsg.senderOperator === auth.currentUser.displayName || cloudMsg.from === bleState.myNodeNum);
    if (isMe) return;

    const synthesizedMsg: MeshtasticMessage = {
      id: cloudMsg.id,
      from: cloudMsg.from,
      fromName: `${cloudMsg.fromName} (via ${cloudMsg.senderOperator})`,
      to: cloudMsg.to || 0xFFFFFFFF,
      text: cloudMsg.text,
      timestamp: cloudMsg.timestamp,
      rxSnr: cloudMsg.rxSnr ?? 8.5,
      rxRssi: cloudMsg.rxRssi ?? -78,
      hopLimit: cloudMsg.hopLimit ?? 3,
      channel: cloudMsg.channel ?? 0,
      portNum: 'TEXT_MESSAGE_APP',
      isAcked: true
    };

    (meshtasticBleService as any).state.messages.push(synthesizedMsg);
    (meshtasticBleService as any).notify();
    tactileAudio.playClick(950);
  }
}

export const meshCloudSyncService = new MeshCloudSyncService();
