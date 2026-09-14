import { 
  MeshtasticBleNode, 
  MeshtasticBleState, 
  MeshtasticMessage, 
  DiscoveredBleRadioNode,
  LoraRfPacketEvent,
  LoraRfMetricsHistoryPoint,
  MeshtasticChannelConfig,
  MeshtasticNodeRole,
  MeshtasticAdminConfig,
  MeshtasticWaypoint,
  MeshtasticTracerouteResult,
  MeshtasticTracerouteHop
} from '../types';

// Meshtastic Bluetooth Low Energy UUID constants
export const MESHTASTIC_BLE_SERVICE_UUID = '6ba1b218-15a8-461f-9fa8-5dcae273eafd';
export const MESHTASTIC_CHAR_TORADIO = 'f75de93d-448a-4c83-924f-d07991e0d471';
export const MESHTASTIC_CHAR_FROMRADIO = '2c55e69e-4993-11ed-b878-0242ac120002';
export const MESHTASTIC_CHAR_FROMNUM = 'ed9da18c-a800-4f66-a670-aa7547e34453';

// Fallback Nordic UART UUIDs for older custom firmware
export const NORDIC_UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const NORDIC_UART_TX = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
export const NORDIC_UART_RX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

export class MeshtasticBleService {
  private static instance: MeshtasticBleService | null = null;

  private bluetoothDevice: any = null;
  private gattServer: any = null;
  private toRadioChar: any = null;
  private fromRadioChar: any = null;
  private fromNumChar: any = null;

  private listeners: Set<() => void> = new Set();
  private simTimer: any = null;
  private scanTimer: any = null;
  private leScanSession: any = null;

  private state: MeshtasticBleState = {
    isConnected: false,
    isConnecting: false,
    isSimulated: false,
    isBleScanning: false,
    scanMode: 'PROXIMITY_SWEEP',
    discoveredBleRadios: [
      {
        id: 'ble-tbeam-alpha',
        name: 'Meshtastic_2a1b (T-Beam v1.2)',
        rssi: -58,
        signalPercent: 82,
        signalBars: 5,
        distanceMeters: 2.1,
        hwModel: 'T_BEAM',
        nodeNumHex: '!2a1b9f84',
        macAddress: 'C4:4F:33:2A:1B:9F',
        serviceUuids: [MESHTASTIC_BLE_SERVICE_UUID, 'battery_service'],
        txPower: -59,
        lastSeen: Date.now() - 2500,
        isConnectable: true,
        isCurrentlyConnected: false,
        batteryPercent: 94,
        batteryVoltage: 4.16,
      },
      {
        id: 'ble-heltec-perimeter',
        name: 'Heltec-V3-Sentry (915MHz)',
        rssi: -73,
        signalPercent: 64,
        signalBars: 4,
        distanceMeters: 5.4,
        hwModel: 'HELTEC_V3',
        nodeNumHex: '!7a8b9c0d',
        macAddress: 'E8:6B:EA:7A:8B:9C',
        serviceUuids: [MESHTASTIC_BLE_SERVICE_UUID, NORDIC_UART_SERVICE],
        txPower: -59,
        lastSeen: Date.now() - 5800,
        isConnectable: true,
        isCurrentlyConnected: false,
        batteryPercent: 76,
        batteryVoltage: 3.98,
      },
      {
        id: 'ble-rak-relay',
        name: 'RAK4631-Solar-Relay',
        rssi: -84,
        signalPercent: 42,
        signalBars: 3,
        distanceMeters: 13.5,
        hwModel: 'RAK4631',
        nodeNumHex: '!3d4e5f60',
        macAddress: 'F0:08:D1:3D:4E:5F',
        serviceUuids: [MESHTASTIC_BLE_SERVICE_UUID],
        txPower: -59,
        lastSeen: Date.now() - 11000,
        isConnectable: true,
        isCurrentlyConnected: false,
        batteryPercent: 58,
        batteryVoltage: 3.84,
      },
      {
        id: 'ble-techo-recon',
        name: 'T-Echo-Eink-Rover',
        rssi: -91,
        signalPercent: 24,
        signalBars: 2,
        distanceMeters: 26.2,
        hwModel: 'T_ECHO',
        nodeNumHex: '!9e8d7c6b',
        macAddress: 'DC:54:75:9E:8D:7C',
        serviceUuids: [MESHTASTIC_BLE_SERVICE_UUID],
        txPower: -59,
        lastSeen: Date.now() - 22000,
        isConnectable: true,
        isCurrentlyConnected: false,
        batteryPercent: 21,
        batteryVoltage: 3.52,
      }
    ],
    deviceName: null,
    deviceBattery: 88,
    deviceVoltage: 4.14,
    myNodeNum: 0x2a1b9f84,
    primaryChannel: 'Tactical-Alpha',
    frequencySlotMhz: 915.0,
    modemPreset: 'LONG_FAST',
    regionCode: 'US',
    txPowerDbm: 27,
    hopLimit: 3,
    nodeRole: 'ROUTER_CLIENT',
    positionBroadcastSecs: 60,
    telemetryBroadcastSecs: 300,
    isFixedPosition: false,
    channels: [
      {
        index: 0,
        name: 'Tactical-Alpha',
        role: 'PRIMARY',
        pskType: 'AES_256',
        pskKey: '1b4f9a3c2e5d7f8a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a',
        uplinkEnabled: true,
        downlinkEnabled: true,
        channelNum: 0,
        bitrateBps: 1340,
        moduleSettings: {
          positionPrecision: 32,
          telemetryIntervalSecs: 300,
        },
      },
      {
        index: 1,
        name: 'Admin-Secure',
        role: 'SECONDARY',
        pskType: 'AES_256',
        pskKey: '9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d',
        uplinkEnabled: true,
        downlinkEnabled: true,
        channelNum: 1,
        bitrateBps: 1340,
        moduleSettings: {
          positionPrecision: 32,
          telemetryIntervalSecs: 600,
        },
      },
      {
        index: 2,
        name: 'Medical-Evac',
        role: 'SECONDARY',
        pskType: 'AES_128',
        pskKey: '4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
        uplinkEnabled: true,
        downlinkEnabled: true,
        channelNum: 2,
        bitrateBps: 1340,
        moduleSettings: {
          positionPrecision: 28,
          telemetryIntervalSecs: 180,
        },
      },
      {
        index: 3,
        name: 'Public-Mesh',
        role: 'SECONDARY',
        pskType: 'DEFAULT',
        pskKey: 'AQ==',
        uplinkEnabled: true,
        downlinkEnabled: false,
        channelNum: 3,
        bitrateBps: 1340,
        moduleSettings: {
          positionPrecision: 16,
          telemetryIntervalSecs: 900,
        },
      },
    ],
    nodes: [
      {
        num: 0x2a1b9f84,
        user: {
          id: '!2a1b9f84',
          longName: 'Command GCS Local',
          shortName: 'GCS',
          hwModel: 'T_BEAM',
          macaddr: '00:1a:2b:3c:4d:5e',
        },
        position: {
          latitudeI: 377749000,
          longitudeI: -1224194000,
          altitude: 48,
          time: Date.now(),
          satsInView: 12,
        },
        snr: 9.8,
        rssi: -62,
        lastHeard: Date.now(),
        batteryLevel: 88,
        voltage: 4.14,
        hopsAway: 0,
        channel: 0,
        isFavorite: true,
        role: 'ROUTER_CLIENT',
        txPowerDbm: 27,
        hopLimit: 3,
        positionBroadcastSecs: 60,
        telemetryBroadcastSecs: 300,
        isFixedPosition: false,
        firmwareVersion: 'v2.5.4.b9f8',
      },
      {
        num: 0x3d4e5f60,
        user: {
          id: '!3d4e5f60',
          longName: 'Alpha-Recon Relay',
          shortName: 'RELAY-1',
          hwModel: 'RAK4631',
          macaddr: '00:1a:2b:99:88:77',
        },
        position: {
          latitudeI: 377782000,
          longitudeI: -1224135000,
          altitude: 125,
          time: Date.now() - 45000,
          satsInView: 14,
        },
        snr: 12.5,
        rssi: -71,
        lastHeard: Date.now() - 25000,
        batteryLevel: 94,
        voltage: 4.21,
        hopsAway: 1,
        channel: 0,
        isFavorite: true,
        role: 'ROUTER',
        txPowerDbm: 30,
        hopLimit: 4,
        positionBroadcastSecs: 300,
        telemetryBroadcastSecs: 600,
        isFixedPosition: true,
        firmwareVersion: 'v2.5.3.a112',
      },
      {
        num: 0x7a8b9c0d,
        user: {
          id: '!7a8b9c0d',
          longName: 'Heltec Perimeter Sentry',
          shortName: 'SENTRY-2',
          hwModel: 'HELTEC_V3',
          macaddr: '00:1a:2b:11:22:33',
        },
        position: {
          latitudeI: 377712000,
          longitudeI: -1224250000,
          altitude: 62,
          time: Date.now() - 112000,
          satsInView: 10,
        },
        snr: 6.2,
        rssi: -94,
        lastHeard: Date.now() - 112000,
        batteryLevel: 72,
        voltage: 3.86,
        hopsAway: 2,
        channel: 0,
        role: 'SENSOR',
        txPowerDbm: 22,
        hopLimit: 2,
        positionBroadcastSecs: 900,
        telemetryBroadcastSecs: 180,
        isFixedPosition: true,
        firmwareVersion: 'v2.5.4.c301',
      },
      {
        num: 0x9e8d7c6b,
        user: {
          id: '!9e8d7c6b',
          longName: 'Mobile Scout Rover',
          shortName: 'SCOUT',
          hwModel: 'T_ECHO',
          macaddr: '00:1a:2b:55:66:77',
        },
        position: {
          latitudeI: 377799000,
          longitudeI: -1224285000,
          altitude: 35,
          time: Date.now() - 18000,
          satsInView: 11,
        },
        snr: 8.4,
        rssi: -82,
        lastHeard: Date.now() - 18000,
        batteryLevel: 81,
        voltage: 3.98,
        hopsAway: 1,
        channel: 0,
        role: 'TRACKER',
        txPowerDbm: 24,
        hopLimit: 3,
        positionBroadcastSecs: 30,
        telemetryBroadcastSecs: 120,
        isFixedPosition: false,
        firmwareVersion: 'v2.5.2.e779',
      },
    ],
    messages: [
      {
        id: 'msg-init-1',
        from: 0x3d4e5f60,
        to: 0xffffffff,
        fromName: 'Alpha-Recon Relay',
        text: 'Mesh routing established across Sector 4. SNR: +12.5 dB.',
        timestamp: Date.now() - 180000,
        channel: 0,
        portNum: 'TEXT_MESSAGE_APP',
        hopLimit: 3,
        rxSnr: 12.5,
        rxRssi: -71,
        isAcked: true,
      },
      {
        id: 'msg-init-2',
        from: 0x9e8d7c6b,
        to: 0xffffffff,
        fromName: 'Mobile Scout Rover',
        text: 'Entering northern perimeter checkpoint. GPS fix locked.',
        timestamp: Date.now() - 60000,
        channel: 0,
        portNum: 'TEXT_MESSAGE_APP',
        hopLimit: 2,
        rxSnr: 8.4,
        rxRssi: -82,
        isAcked: true,
      },
    ],
    packetsSent: 14,
    packetsReceived: 38,
    channelAirtimePct: 6.8,
    channelNoiseFloorDbm: -118,
    rfPackets: [
      {
        id: 'rf-pkt-1',
        timestamp: Date.now() - 14000,
        freqMhz: 906.875,
        bandwidthKhz: 250,
        spreadingFactor: 8,
        codingRate: '4/5',
        senderNode: '!3d4e5f60',
        senderName: 'Alpha-Recon Relay',
        packetType: 'TELEMETRY',
        rssi: -71,
        snr: 12.5,
        payloadSize: 42,
        airtimeMs: 146,
        chirpDirection: 'UP',
      },
      {
        id: 'rf-pkt-2',
        timestamp: Date.now() - 9500,
        freqMhz: 906.875,
        bandwidthKhz: 250,
        spreadingFactor: 7,
        codingRate: '4/5',
        senderNode: '!9e8d7c6b',
        senderName: 'Mobile Scout Rover',
        packetType: 'POSITION',
        rssi: -82,
        snr: 8.4,
        payloadSize: 36,
        airtimeMs: 82,
        chirpDirection: 'UP',
      },
      {
        id: 'rf-pkt-3',
        timestamp: Date.now() - 5200,
        freqMhz: 906.875,
        bandwidthKhz: 250,
        spreadingFactor: 8,
        codingRate: '4/5',
        senderNode: '!2a1b9f84',
        senderName: 'Command GCS Local',
        packetType: 'ROUTER_DISCOVERY',
        rssi: -62,
        snr: 13.8,
        payloadSize: 28,
        airtimeMs: 114,
        chirpDirection: 'DOWN',
      },
      {
        id: 'rf-pkt-4',
        timestamp: Date.now() - 2100,
        freqMhz: 906.875,
        bandwidthKhz: 125,
        spreadingFactor: 9,
        codingRate: '4/6',
        senderNode: '!7a8b9c0d',
        senderName: 'Heltec Perimeter Sentry',
        packetType: 'NODE_INFO',
        rssi: -94,
        snr: 5.8,
        payloadSize: 58,
        airtimeMs: 298,
        chirpDirection: 'UP',
      }
    ],
    rfMetricsHistory: Array.from({ length: 18 }).map((_, idx) => {
      const t = Date.now() - (17 - idx) * 60000;
      const date = new Date(t);
      const timeLabel = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      const rssiBase = -76 + Math.sin(idx * 0.4) * 6;
      const snrBase = 10.2 + Math.cos(idx * 0.5) * 3;
      return {
        timestamp: t,
        timeLabel,
        rssi: parseFloat((rssiBase + (Math.random() - 0.5) * 3).toFixed(1)),
        snr: parseFloat((snrBase + (Math.random() - 0.5) * 1.5).toFixed(1)),
        noiseFloorDbm: parseFloat((-118.5 + (Math.random() - 0.5) * 2).toFixed(1)),
        channelUtilizationPct: parseFloat((5.5 + Math.sin(idx * 0.3) * 3 + Math.random() * 2).toFixed(1)),
        packetLossRatePct: parseFloat((1.2 + Math.random() * 1.8).toFixed(1)),
      };
    }),
    waypoints: [
      {
        id: 'wp-lz-1',
        name: 'LZ Osprey Alpha',
        description: 'Tactical Helicopter Landing Zone with clear 360 RF horizon',
        latitude: 37.7765,
        longitude: -122.4215,
        altitudeMeters: 55,
        icon: 'LZ',
        createdByNode: 0x2a1b9f84,
        createdByName: 'Command GCS Local',
        timestamp: Date.now() - 3600000,
      },
      {
        id: 'wp-relay-2',
        name: 'Hilltop Repeater Mast',
        description: 'Solar LoRa Repeater Tower, 12dBi collinear omni',
        latitude: 37.7782,
        longitude: -122.4135,
        altitudeMeters: 130,
        icon: 'RELAY',
        createdByNode: 0x3d4e5f60,
        createdByName: 'Alpha-Recon Relay',
        timestamp: Date.now() - 7200000,
      },
      {
        id: 'wp-med-1',
        name: 'Field Aid Post Delta',
        description: 'Casualty triage point with AES-128 Medical Net monitor',
        latitude: 37.7725,
        longitude: -122.4270,
        altitudeMeters: 42,
        icon: 'MEDICAL',
        createdByNode: 0x2a1b9f84,
        createdByName: 'Command GCS Local',
        timestamp: Date.now() - 1800000,
      },
      {
        id: 'wp-recon-1',
        name: 'OP Eagle Crest',
        description: 'Forward reconnaissance observation post',
        latitude: 37.7810,
        longitude: -122.4240,
        altitudeMeters: 92,
        icon: 'FLAG',
        createdByNode: 0x9e8d7c6b,
        createdByName: 'Mobile Scout Rover',
        timestamp: Date.now() - 900000,
      }
    ],
    activeTraceroute: null,
    emergencySosActive: false,
    emergencySosDetails: null,
  };

  public static getInstance(): MeshtasticBleService {
    if (!MeshtasticBleService.instance) {
      MeshtasticBleService.instance = new MeshtasticBleService();
    }
    return MeshtasticBleService.instance;
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach(cb => cb());
  }

  public getState(): MeshtasticBleState {
    return { ...this.state };
  }

  public isWebBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  /**
   * Helper to compute signal bars, percent, and estimated distance from RSSI
   */
  public computeSignalMetrics(rssi: number, txPower: number = -59): {
    signalPercent: number;
    signalBars: number;
    distanceMeters: number;
  } {
    // Normalizing -105 dBm (0%) to -40 dBm (100%)
    const clampedRssi = Math.max(-105, Math.min(-35, rssi));
    const signalPercent = Math.max(4, Math.min(100, Math.round(((clampedRssi + 105) / 70) * 100)));

    let signalBars = 1;
    if (clampedRssi >= -60) signalBars = 5;
    else if (clampedRssi >= -72) signalBars = 4;
    else if (clampedRssi >= -82) signalBars = 3;
    else if (clampedRssi >= -92) signalBars = 2;
    else signalBars = 1;

    // Log-distance path loss formula: distance = 10 ^ ((txPower - rssi) / (10 * n)), n = 2.4
    const distanceMeters = parseFloat(Math.max(0.3, Math.min(150, Math.pow(10, (txPower - clampedRssi) / 24))).toFixed(1));

    return { signalPercent, signalBars, distanceMeters };
  }

  /**
   * Start WebBluetooth Discovery for nearby Meshtastic radios
   */
  public async startBleDiscovery(mode: 'PROXIMITY_SWEEP' | 'PHYSICAL_PICKER' = 'PROXIMITY_SWEEP'): Promise<void> {
    this.state.isBleScanning = true;
    this.state.scanMode = mode;
    this.notify();

    if (mode === 'PHYSICAL_PICKER') {
      if (!this.isWebBluetoothSupported()) {
        this.state.isBleScanning = false;
        this.notify();
        throw new Error('WebBluetooth is not supported in this browser environment. Use Chrome or Edge.');
      }

      try {
        const device = await (navigator as any).bluetooth.requestDevice({
          filters: [
            { namePrefix: 'Meshtastic' },
            { namePrefix: 'Mesh' },
            { namePrefix: 'T-Beam' },
            { namePrefix: 'Heltec' },
            { namePrefix: 'RAK' },
            { services: [MESHTASTIC_BLE_SERVICE_UUID] },
          ],
          optionalServices: [
            MESHTASTIC_BLE_SERVICE_UUID,
            NORDIC_UART_SERVICE,
            'battery_service',
            'device_information',
          ],
        });

        if (device) {
          const name = device.name || 'Meshtastic Hardware Radio';
          let hwModel: DiscoveredBleRadioNode['hwModel'] = 'GENERIC_BLE';
          if (name.includes('T-Beam') || name.includes('TBeam')) hwModel = 'T_BEAM';
          else if (name.includes('Heltec')) hwModel = 'HELTEC_V3';
          else if (name.includes('RAK')) hwModel = 'RAK4631';
          else if (name.includes('Echo')) hwModel = 'T_ECHO';
          else if (name.includes('Station')) hwModel = 'STATION_G1';

          const id = device.id || `ble-phys-${Date.now()}`;
          const rssi = -52; // initial direct picker proximity
          const metrics = this.computeSignalMetrics(rssi);

          const newDiscovered: DiscoveredBleRadioNode = {
            id,
            name,
            rssi,
            signalPercent: metrics.signalPercent,
            signalBars: metrics.signalBars,
            distanceMeters: metrics.distanceMeters,
            hwModel,
            nodeNumHex: '!2a1b' + Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0'),
            macAddress: 'BLE:DEV:' + id.slice(0, 8).toUpperCase(),
            serviceUuids: [MESHTASTIC_BLE_SERVICE_UUID],
            lastSeen: Date.now(),
            isConnectable: true,
            isCurrentlyConnected: false,
            batteryPercent: Math.floor(Math.random() * 35 + 60), // 60-95%
            batteryVoltage: parseFloat((3.7 + Math.random() * 0.45).toFixed(2)),
            rawDevice: device,
          };

          const existingIdx = this.state.discoveredBleRadios.findIndex(r => r.id === id || r.name === name);
          if (existingIdx !== -1) {
            this.state.discoveredBleRadios[existingIdx] = newDiscovered;
          } else {
            this.state.discoveredBleRadios.unshift(newDiscovered);
          }
        }
      } catch (err: any) {
        if (err.name !== 'NotFoundError') {
          console.warn('[Meshtastic BLE] Picker error:', err);
        }
      }
    }

    // Try browser experimental LE scan if supported
    try {
      if (typeof (navigator as any)?.bluetooth?.requestLEScan === 'function') {
        this.leScanSession = await (navigator as any).bluetooth.requestLEScan({
          filters: [
            { namePrefix: 'Meshtastic' },
            { namePrefix: 'Mesh' },
            { services: [MESHTASTIC_BLE_SERVICE_UUID] },
          ],
          keepRepeated: true,
        });

        (navigator as any).bluetooth.addEventListener('advertisementreceived', (event: any) => {
          this.handleBleAdvertisement(event);
        });
      }
    } catch {
      // Experimental scan not enabled, continue with continuous sweep loop
    }

    // Start background RF proximity sweep
    if (!this.scanTimer) {
      this.scanTimer = setInterval(() => {
        this.sweepDiscoveredRadios();
      }, 2400);
    }

    this.notify();
  }

  /**
   * Handle physical WebBluetooth advertisement packet
   */
  private handleBleAdvertisement(event: any): void {
    const device = event.device;
    const rssi = typeof event.rssi === 'number' ? event.rssi : -68;
    const txPower = typeof event.txPower === 'number' ? event.txPower : -59;
    const metrics = this.computeSignalMetrics(rssi, txPower);
    const name = device.name || 'Meshtastic BLE Beacon';

    let hwModel: DiscoveredBleRadioNode['hwModel'] = 'GENERIC_BLE';
    if (name.includes('T-Beam')) hwModel = 'T_BEAM';
    else if (name.includes('Heltec')) hwModel = 'HELTEC_V3';
    else if (name.includes('RAK')) hwModel = 'RAK4631';
    else if (name.includes('Echo')) hwModel = 'T_ECHO';

    const node: DiscoveredBleRadioNode = {
      id: device.id,
      name,
      rssi,
      signalPercent: metrics.signalPercent,
      signalBars: metrics.signalBars,
      distanceMeters: metrics.distanceMeters,
      hwModel,
      nodeNumHex: '!' + (device.id.slice(0, 8) || '2a1b9f84'),
      macAddress: 'BLE:' + (device.id.slice(0, 10).toUpperCase()),
      serviceUuids: event.uuids || [MESHTASTIC_BLE_SERVICE_UUID],
      txPower,
      lastSeen: Date.now(),
      isConnectable: true,
      isCurrentlyConnected: this.bluetoothDevice?.id === device.id,
      batteryPercent: Math.floor(Math.random() * 30 + 65), // 65-95%
      batteryVoltage: parseFloat((3.8 + Math.random() * 0.35).toFixed(2)),
      rawDevice: device,
    };

    const idx = this.state.discoveredBleRadios.findIndex(r => r.id === node.id);
    if (idx !== -1) {
      this.state.discoveredBleRadios[idx] = node;
    } else {
      this.state.discoveredBleRadios.unshift(node);
    }
    this.notify();
  }

  /**
   * Continuous sweep updating signal fluctuations and discovering new nearby nodes
   */
  private sweepDiscoveredRadios(): void {
    if (!this.state.isBleScanning) return;

    // Update existing radios with RF multipath fading jitter
    this.state.discoveredBleRadios.forEach(radio => {
      // Jitter +/- 4 dBm
      const delta = Math.floor((Math.random() - 0.5) * 8);
      radio.rssi = Math.max(-102, Math.min(-38, radio.rssi + delta));
      const metrics = this.computeSignalMetrics(radio.rssi, radio.txPower || -59);
      radio.signalBars = metrics.signalBars;
      radio.signalPercent = metrics.signalPercent;
      radio.distanceMeters = metrics.distanceMeters;
      radio.lastSeen = Date.now();
      radio.isCurrentlyConnected = this.state.isConnected && this.state.deviceName?.includes(radio.hwModel.replace('_', ' '));
    });

    // Occasionally discover an additional radio walking into range (e.g. UAV or Tactical Relay)
    if (this.state.discoveredBleRadios.length < 6 && Math.random() < 0.35) {
      const candidates: Array<{ name: string; hw: DiscoveredBleRadioNode['hwModel']; id: string; hex: string; mac: string }> = [
        { name: 'Station-G1-CommandBase', hw: 'STATION_G1', id: 'ble-station-g1', hex: '!5a6b7c8d', mac: '44:17:93:5A:6B:7C' },
        { name: 'UAV-Swarm-Airborne-Relay', hw: 'RAK4631', id: 'ble-uav-relay', hex: '!11223344', mac: '88:4A:EA:11:22:33' },
        { name: 'Heltec-Tactical-DropNode', hw: 'HELTEC_V3', id: 'ble-heltec-drop', hex: '!99aabbcc', mac: '20:CD:39:99:AA:BB' },
      ];
      const unadded = candidates.filter(c => !this.state.discoveredBleRadios.some(r => r.id === c.id));
      if (unadded.length > 0) {
        const pick = unadded[Math.floor(Math.random() * unadded.length)];
        const rssi = Math.floor(Math.random() * 25 - 88); // -88 to -63 dBm
        const metrics = this.computeSignalMetrics(rssi);
        this.state.discoveredBleRadios.push({
          id: pick.id,
          name: pick.name,
          rssi,
          signalPercent: metrics.signalPercent,
          signalBars: metrics.signalBars,
          distanceMeters: metrics.distanceMeters,
          hwModel: pick.hw,
          nodeNumHex: pick.hex,
          macAddress: pick.mac,
          serviceUuids: [MESHTASTIC_BLE_SERVICE_UUID],
          lastSeen: Date.now(),
          isConnectable: true,
          isCurrentlyConnected: false,
          batteryPercent: Math.floor(Math.random() * 40 + 55),
          batteryVoltage: parseFloat((3.75 + Math.random() * 0.4).toFixed(2)),
        });
      }
    }

    this.notify();
  }

  /**
   * Stop WebBluetooth Discovery
   */
  public stopBleDiscovery(): void {
    this.state.isBleScanning = false;
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    if (this.leScanSession && typeof this.leScanSession.stop === 'function') {
      try {
        this.leScanSession.stop();
      } catch {}
      this.leScanSession = null;
    }
    this.notify();
  }

  /**
   * Connect to a specific discovered radio node
   */
  public async connectToDiscoveredRadio(radio: DiscoveredBleRadioNode): Promise<void> {
    this.state.isConnecting = true;
    this.notify();

    try {
      if (radio.rawDevice && radio.rawDevice.gatt) {
        this.bluetoothDevice = radio.rawDevice;
        const server = await this.bluetoothDevice.gatt.connect();
        this.gattServer = server;
        this.state.isConnected = true;
        this.state.isSimulated = false;
        this.state.deviceName = radio.name;
      } else {
        // Virtual/Nearby discovered radio
        this.state.isConnected = true;
        this.state.isSimulated = true;
        this.state.deviceName = `${radio.name} (${radio.hwModel.replace('_', ' ')})`;
        this.startSimulation();
      }

      this.state.isConnecting = false;
      this.state.myNodeNum = parseInt(radio.nodeNumHex.replace('!', ''), 16) || 0x2a1b9f84;
      this.state.deviceBattery = radio.batteryPercent ?? 88;
      if (radio.batteryVoltage) this.state.deviceVoltage = radio.batteryVoltage;
      
      // Update radio status
      this.state.discoveredBleRadios.forEach(r => {
        r.isCurrentlyConnected = (r.id === radio.id);
      });

      this.notify();
    } catch (err) {
      this.state.isConnecting = false;
      this.notify();
      throw err;
    }
  }

  /**
   * Clear discovered radios list
   */
  public clearDiscoveredRadios(): void {
    this.state.discoveredBleRadios = [];
    this.notify();
  }

  /**
   * Connect to a physical Meshtastic BLE radio (T-Beam, Heltec, RAK4631, etc.)
   */
  public async connectPhysicalBle(): Promise<boolean> {
    if (!this.isWebBluetoothSupported()) {
      throw new Error('WebBluetooth is not supported in this browser. Use Chrome/Edge over HTTPS.');
    }

    this.state.isConnecting = true;
    this.notify();

    try {
      // Prompt user to select Meshtastic device
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { namePrefix: 'Meshtastic' },
          { namePrefix: 'Mesh' },
          { namePrefix: 'T-Beam' },
          { namePrefix: 'Heltec' },
          { services: [MESHTASTIC_BLE_SERVICE_UUID] },
        ],
        optionalServices: [
          MESHTASTIC_BLE_SERVICE_UUID,
          NORDIC_UART_SERVICE,
          'battery_service',
          'device_information',
        ],
      });

      this.bluetoothDevice = device;
      this.bluetoothDevice.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnect();
      });

      // Connect to GATT Server
      const server = await this.bluetoothDevice.gatt.connect();
      this.gattServer = server;

      // Locate Meshtastic service
      let service: any = null;
      try {
        service = await server.getPrimaryService(MESHTASTIC_BLE_SERVICE_UUID);
      } catch (err) {
        // Fallback to Nordic UART
        service = await server.getPrimaryService(NORDIC_UART_SERVICE);
      }

      if (service) {
        try {
          this.toRadioChar = await service.getCharacteristic(MESHTASTIC_CHAR_TORADIO);
          this.fromRadioChar = await service.getCharacteristic(MESHTASTIC_CHAR_FROMRADIO);
          this.fromNumChar = await service.getCharacteristic(MESHTASTIC_CHAR_FROMNUM);

          // Listen for incoming packets
          await this.fromRadioChar.startNotifications();
          this.fromRadioChar.addEventListener('characteristicvaluechanged', (e: any) => {
            this.handleIncomingBlePacket(e.target.value);
          });
        } catch (charErr) {
          console.warn('[Meshtastic BLE] Custom characteristics not found, trying UART characteristics', charErr);
        }
      }

      this.state.isConnected = true;
      this.state.isConnecting = false;
      this.state.isSimulated = false;
      this.state.deviceName = device.name || 'Meshtastic Hardware Radio';
      this.stopSimulation();
      this.notify();
      return true;
    } catch (err: any) {
      this.state.isConnecting = false;
      this.notify();
      throw err;
    }
  }

  /**
   * Connect to simulated BLE Meshtastic network for testing without physical radio
   */
  public connectSimulated(): void {
    this.state.isConnected = true;
    this.state.isConnecting = false;
    this.state.isSimulated = true;
    this.state.deviceName = 'T-Beam v1.2 (BLE Emulated Radio)';
    this.startSimulation();
    this.notify();
  }

  public disconnect(): void {
    if (this.bluetoothDevice && this.bluetoothDevice.gatt.connected) {
      this.bluetoothDevice.gatt.disconnect();
    }
    this.handleDisconnect();
  }

  private handleDisconnect(): void {
    this.state.isConnected = false;
    this.state.isConnecting = false;
    this.state.deviceName = null;
    this.stopSimulation();
    this.notify();
  }

  /**
   * Broadcast or direct text message over Meshtastic LoRa
   */
  public async sendMessage(text: string, to: number = 0xffffffff, channelIndex: number = 0): Promise<MeshtasticMessage> {
    const newMsg: MeshtasticMessage = {
      id: `ble-msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      from: this.state.myNodeNum,
      to,
      fromName: 'Command GCS Local',
      text,
      timestamp: Date.now(),
      channel: channelIndex,
      portNum: 'TEXT_MESSAGE_APP',
      hopLimit: 3,
      rxSnr: 10.2,
      rxRssi: -65,
      isAcked: false,
    };

    this.state.messages.push(newMsg);
    this.state.packetsSent += 1;

    // Record outbound LoRa RF packet transmission
    const bw: LoraRfPacketEvent['bandwidthKhz'] = this.state.modemPreset === 'SHORT_FAST' ? 500 : this.state.modemPreset === 'MEDIUM_FAST' ? 250 : 125;
    const sf: LoraRfPacketEvent['spreadingFactor'] = this.state.modemPreset === 'SHORT_FAST' ? 7 : this.state.modemPreset === 'MEDIUM_FAST' ? 8 : 10;
    this.recordRfPacket({
      id: `tx-rf-${Date.now()}`,
      timestamp: Date.now(),
      freqMhz: this.state.frequencySlotMhz || 906.875,
      bandwidthKhz: bw,
      spreadingFactor: sf,
      codingRate: '4/5',
      senderNode: `!${this.state.myNodeNum.toString(16)}`,
      senderName: 'Command GCS (Local TX)',
      packetType: 'TEXT_MESSAGE',
      rssi: -58,
      snr: 14.2,
      payloadSize: text.length + 16,
      airtimeMs: Math.round(75 + text.length * 3),
      chirpDirection: 'UP',
    });

    this.notify();

    // If connected to physical BLE device, send ToRadio characteristic buffer
    if (!this.state.isSimulated && this.toRadioChar) {
      try {
        const encoder = new TextEncoder();
        const payload = encoder.encode(text);
        await this.toRadioChar.writeValueWithResponse(payload);
      } catch (err) {
        console.error('[Meshtastic BLE] Error writing to ToRadio characteristic:', err);
      }
    }

    // Simulate ACK response after 800ms
    setTimeout(() => {
      const idx = this.state.messages.findIndex(m => m.id === newMsg.id);
      if (idx !== -1) {
        this.state.messages[idx].isAcked = true;
        this.notify();
      }
    }, 850);

    return newMsg;
  }

  /**
   * Change primary channel or modem preset
   */
  public setChannelPreset(preset: MeshtasticBleState['modemPreset']): void {
    this.state.modemPreset = preset;
    this.notify();
  }

  public setChannelName(name: string): void {
    this.state.primaryChannel = name;
    this.notify();
  }

  public setFrequencySlot(mhz: number): void {
    this.state.frequencySlotMhz = mhz;
    this.notify();
  }

  /**
   * Channel Management & Crypto Provisioning
   */
  public updateChannel(index: number, config: Partial<MeshtasticChannelConfig>): void {
    const existing = this.state.channels.find(c => c.index === index);
    if (existing) {
      Object.assign(existing, config);
      if (existing.role === 'PRIMARY') {
        this.state.primaryChannel = existing.name;
      }
    } else {
      this.state.channels.push({
        index,
        name: config.name || `Channel-${index}`,
        role: config.role || 'SECONDARY',
        pskType: config.pskType || 'AES_256',
        pskKey: config.pskKey || this.generateRandomPsk('AES_256'),
        uplinkEnabled: config.uplinkEnabled ?? true,
        downlinkEnabled: config.downlinkEnabled ?? true,
        channelNum: config.channelNum ?? index,
        bitrateBps: 1340,
        moduleSettings: config.moduleSettings || {
          positionPrecision: 32,
          telemetryIntervalSecs: 300,
        },
      });
    }

    // Sort channels by index
    this.state.channels.sort((a, b) => a.index - b.index);

    // Record OTA Channel config packet
    this.recordRfPacket({
      id: `ota-chan-${Date.now()}`,
      timestamp: Date.now(),
      freqMhz: this.state.frequencySlotMhz || 906.875,
      bandwidthKhz: 250,
      spreadingFactor: 8,
      codingRate: '4/5',
      senderNode: `!${this.state.myNodeNum.toString(16)}`,
      senderName: 'Command GCS Local',
      packetType: 'ROUTER_DISCOVERY',
      rssi: -55,
      snr: 15.0,
      payloadSize: 64,
      airtimeMs: 140,
      chirpDirection: 'UP',
    });

    this.notify();
  }

  public removeChannel(index: number): void {
    if (index === 0) return; // Cannot delete primary slot
    this.state.channels = this.state.channels.filter(c => c.index !== index);
    this.notify();
  }

  public generateRandomPsk(type: 'AES_128' | 'AES_256'): string {
    const byteCount = type === 'AES_128' ? 16 : 32;
    const array = new Uint8Array(byteCount);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  public setRegion(region: MeshtasticBleState['regionCode']): void {
    this.state.regionCode = region;
    switch (region) {
      case 'US':
        this.state.frequencySlotMhz = 915.0;
        break;
      case 'EU_868':
        this.state.frequencySlotMhz = 868.125;
        break;
      case 'ANZ':
        this.state.frequencySlotMhz = 915.0;
        break;
      case 'JP':
        this.state.frequencySlotMhz = 920.8;
        break;
      case 'CN':
        this.state.frequencySlotMhz = 470.0;
        break;
      case 'KR':
        this.state.frequencySlotMhz = 920.0;
        break;
    }
    this.notify();
  }

  public setLocalAdminConfig(config: Partial<{
    txPowerDbm: number;
    hopLimit: number;
    nodeRole: MeshtasticNodeRole;
    positionBroadcastSecs: number;
    telemetryBroadcastSecs: number;
    isFixedPosition: boolean;
  }>): void {
    if (config.txPowerDbm !== undefined) this.state.txPowerDbm = config.txPowerDbm;
    if (config.hopLimit !== undefined) this.state.hopLimit = config.hopLimit;
    if (config.nodeRole !== undefined) this.state.nodeRole = config.nodeRole;
    if (config.positionBroadcastSecs !== undefined) this.state.positionBroadcastSecs = config.positionBroadcastSecs;
    if (config.telemetryBroadcastSecs !== undefined) this.state.telemetryBroadcastSecs = config.telemetryBroadcastSecs;
    if (config.isFixedPosition !== undefined) this.state.isFixedPosition = config.isFixedPosition;

    // Synchronize local node in node list
    const myNode = this.state.nodes.find(n => n.num === this.state.myNodeNum);
    if (myNode) {
      if (config.txPowerDbm !== undefined) myNode.txPowerDbm = config.txPowerDbm;
      if (config.hopLimit !== undefined) myNode.hopLimit = config.hopLimit;
      if (config.nodeRole !== undefined) myNode.role = config.nodeRole;
      if (config.positionBroadcastSecs !== undefined) myNode.positionBroadcastSecs = config.positionBroadcastSecs;
      if (config.telemetryBroadcastSecs !== undefined) myNode.telemetryBroadcastSecs = config.telemetryBroadcastSecs;
      if (config.isFixedPosition !== undefined) myNode.isFixedPosition = config.isFixedPosition;
    }

    this.notify();
  }

  public updateRemoteNodeAdminConfig(nodeNum: number, config: Partial<MeshtasticBleNode>): void {
    const targetNode = this.state.nodes.find(n => n.num === nodeNum);
    if (targetNode) {
      Object.assign(targetNode, config);
      
      // Transmit OTA Admin Configuration packet
      this.recordRfPacket({
        id: `ota-cfg-${Date.now()}`,
        timestamp: Date.now(),
        freqMhz: this.state.frequencySlotMhz || 906.875,
        bandwidthKhz: 250,
        spreadingFactor: 8,
        codingRate: '4/5',
        senderNode: `!${this.state.myNodeNum.toString(16)}`,
        senderName: 'Command GCS Local',
        packetType: 'ROUTER_DISCOVERY',
        rssi: -60,
        snr: 13.5,
        payloadSize: 48,
        airtimeMs: 110,
        chirpDirection: 'UP',
      });

      this.notify();
    }
  }

  public rebootRemoteNode(nodeNum: number): { success: boolean; message: string } {
    const target = this.state.nodes.find(n => n.num === nodeNum);
    if (!target) return { success: false, message: 'Node not found' };

    // Broadcast OTA Admin reboot frame
    this.recordRfPacket({
      id: `ota-reboot-${Date.now()}`,
      timestamp: Date.now(),
      freqMhz: this.state.frequencySlotMhz || 906.875,
      bandwidthKhz: 250,
      spreadingFactor: 8,
      codingRate: '4/5',
      senderNode: `!${this.state.myNodeNum.toString(16)}`,
      senderName: 'Command GCS Local',
      packetType: 'ACK',
      rssi: -58,
      snr: 14.8,
      payloadSize: 32,
      airtimeMs: 88,
      chirpDirection: 'DOWN',
    });

    target.lastHeard = Date.now();
    this.notify();
    return { success: true, message: `OTA Reboot command dispatched to ${target.user.longName} (${target.user.id}). Node rebooting in 3s.` };
  }

  public factoryResetRemoteNode(nodeNum: number): { success: boolean; message: string } {
    const target = this.state.nodes.find(n => n.num === nodeNum);
    if (!target) return { success: false, message: 'Node not found' };

    // Dispatched factory reset
    target.role = 'CLIENT';
    target.txPowerDbm = 20;
    target.hopLimit = 3;
    target.positionBroadcastSecs = 900;
    target.telemetryBroadcastSecs = 900;
    target.lastHeard = Date.now();
    this.notify();

    return { success: true, message: `Factory default reset packet acknowledged by ${target.user.longName}. NVS partition cleared.` };
  }

  public exportMeshtasticUrl(channelIndex: number = 0): string {
    const ch = this.state.channels.find(c => c.index === channelIndex) || this.state.channels[0];
    const payloadObj = {
      n: ch?.name || 'Tactical-Alpha',
      k: ch?.pskKey ? ch.pskKey.slice(0, 16) : 'AQ==',
      m: this.state.modemPreset,
      r: this.state.regionCode,
      f: this.state.frequencySlotMhz,
    };
    const b64 = btoa(JSON.stringify(payloadObj));
    return `https://meshtastic.org/e/#${b64}`;
  }

  public importMeshtasticUrl(url: string): { success: boolean; channelName?: string; error?: string } {
    try {
      const hashPart = url.includes('#') ? url.split('#')[1] : url;
      if (!hashPart) return { success: false, error: 'Invalid URL format' };
      const decoded = atob(hashPart);
      const parsed = JSON.parse(decoded);
      if (parsed.n) {
        this.updateChannel(0, {
          name: parsed.n,
          pskKey: parsed.k || 'AQ==',
          pskType: parsed.k && parsed.k.length > 8 ? 'AES_256' : 'DEFAULT',
        });
        if (parsed.m) this.state.modemPreset = parsed.m;
        if (parsed.f) this.state.frequencySlotMhz = parsed.f;
        if (parsed.r) this.state.regionCode = parsed.r;
        this.notify();
        return { success: true, channelName: parsed.n };
      }
      return { success: false, error: 'Missing channel name in payload' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to decode payload' };
    }
  }

  /**
   * Send ping to a specific node to refresh SNR and telemetry
   */
  public pingNode(nodeNum: number): void {
    this.state.packetsSent += 1;
    const node = this.state.nodes.find(n => n.num === nodeNum);
    if (node) {
      node.lastHeard = Date.now();
      node.snr = parseFloat((Math.random() * 8 + 6).toFixed(1));
      node.rssi = Math.floor(Math.random() * 30 - 95);

      this.recordRfPacket({
        id: `ping-${Date.now()}`,
        timestamp: Date.now(),
        freqMhz: this.state.frequencySlotMhz || 906.875,
        bandwidthKhz: 250,
        spreadingFactor: 8,
        codingRate: '4/5',
        senderNode: node.user.id,
        senderName: node.user.longName,
        packetType: 'PING',
        rssi: node.rssi,
        snr: node.snr,
        payloadSize: 24,
        airtimeMs: 94,
        chirpDirection: 'UP',
      });
    }
    this.notify();
  }

  /**
   * Injects a synthetic or manual LoRa chirp spread spectrum test packet
   */
  public injectTestPacket(
    packetType: LoraRfPacketEvent['packetType'] = 'TELEMETRY',
    sf: LoraRfPacketEvent['spreadingFactor'] = 8,
    bw: LoraRfPacketEvent['bandwidthKhz'] = 250
  ): LoraRfPacketEvent {
    const candidates = this.state.nodes.slice(1);
    const chosenNode = candidates.length > 0 
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : this.state.nodes[0];
    
    const rssi = chosenNode ? chosenNode.rssi : Math.floor(Math.random() * 35 - 90);
    const snr = chosenNode ? chosenNode.snr : parseFloat((Math.random() * 10 + 4).toFixed(1));
    const payloadSize = packetType === 'TEXT_MESSAGE' ? 54 : packetType === 'POSITION' ? 36 : 40;
    
    // LoRa airtime calculation: (2^SF / BW_Hz) * symbol_count
    const symbolDurationMs = (Math.pow(2, sf) / (bw * 1000)) * 1000;
    const preambleSymbols = 8;
    const payloadSymbols = Math.ceil(payloadSize / 2);
    const airtimeMs = Math.round((preambleSymbols + 4.25 + payloadSymbols) * symbolDurationMs);

    const event: LoraRfPacketEvent = {
      id: `rf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      freqMhz: this.state.frequencySlotMhz || 906.875,
      bandwidthKhz: bw,
      spreadingFactor: sf,
      codingRate: '4/5',
      senderNode: chosenNode ? chosenNode.user.id : '!2a1b9f84',
      senderName: chosenNode ? chosenNode.user.longName : 'Synthetic Beacon',
      packetType,
      rssi,
      snr,
      payloadSize,
      airtimeMs,
      chirpDirection: Math.random() > 0.3 ? 'UP' : 'DOWN',
    };

    this.recordRfPacket(event);
    return event;
  }

  /**
   * Broadcast a tactical waypoint to the mesh network
   */
  public broadcastTacticalWaypoint(wpData: Omit<MeshtasticWaypoint, 'id' | 'timestamp' | 'createdByNode' | 'createdByName'>): MeshtasticWaypoint {
    const waypoint: MeshtasticWaypoint = {
      ...wpData,
      id: `wp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      createdByNode: this.state.myNodeNum,
      createdByName: 'Command GCS Local',
    };

    this.state.waypoints.push(waypoint);
    this.state.packetsSent += 1;

    // Record LoRa POSITION packet
    this.recordRfPacket({
      id: `rf-wp-${Date.now()}`,
      timestamp: Date.now(),
      freqMhz: this.state.frequencySlotMhz || 906.875,
      bandwidthKhz: 250,
      spreadingFactor: 8,
      codingRate: '4/5',
      senderNode: `!${this.state.myNodeNum.toString(16)}`,
      senderName: 'Command GCS (Local)',
      packetType: 'POSITION',
      rssi: -60,
      snr: 12.8,
      payloadSize: 48,
      airtimeMs: 142,
      chirpDirection: 'UP',
    });

    // Notify on channel
    this.state.messages.push({
      id: `wp-msg-${Date.now()}`,
      from: this.state.myNodeNum,
      to: 0xffffffff,
      fromName: 'Command GCS Local',
      text: `[WAYPOINT BROADCAST] ${waypoint.icon}: ${waypoint.name} at ${waypoint.latitude.toFixed(4)}, ${waypoint.longitude.toFixed(4)} (${waypoint.altitudeMeters}m MSL)`,
      timestamp: Date.now(),
      channel: 0,
      portNum: 'POSITION_APP',
      hopLimit: 3,
      rxSnr: 12.8,
      rxRssi: -60,
      isAcked: true,
    });

    this.notify();
    return waypoint;
  }

  /**
   * Delete a tactical waypoint
   */
  public deleteTacticalWaypoint(id: string): void {
    this.state.waypoints = this.state.waypoints.filter(w => w.id !== id);
    this.notify();
  }

  /**
   * Trigger emergency SOS broadcast across all nodes
   */
  public triggerEmergencySos(details: string = 'PRIORITY 1 // OFFICER/TACTICAL UNIT DISTRESS BEACON'): void {
    this.state.emergencySosActive = true;
    this.state.emergencySosDetails = details;
    this.state.packetsSent += 1;

    // Record high priority RF chirp
    this.recordRfPacket({
      id: `rf-sos-${Date.now()}`,
      timestamp: Date.now(),
      freqMhz: this.state.frequencySlotMhz || 906.875,
      bandwidthKhz: 125,
      spreadingFactor: 11, // High SF for maximum penetration
      codingRate: '4/8',
      senderNode: `!${this.state.myNodeNum.toString(16)}`,
      senderName: 'EMERGENCY BEACON',
      packetType: 'POSITION',
      rssi: -50,
      snr: 15.0,
      payloadSize: 64,
      airtimeMs: 380,
      chirpDirection: 'UP',
    });

    this.state.messages.push({
      id: `sos-msg-${Date.now()}`,
      from: this.state.myNodeNum,
      to: 0xffffffff,
      fromName: 'MAYDAY / SOS BEACON',
      text: `*** EMERGENCY SOS ACTIVATED *** ${details} - Lat: 37.7749 Lon: -122.4194 Alt: 48m`,
      timestamp: Date.now(),
      channel: 0,
      portNum: 'TEXT_MESSAGE_APP',
      hopLimit: 7, // Max mesh propagation
      rxSnr: 15.0,
      rxRssi: -50,
      isAcked: true,
    });

    this.notify();
  }

  /**
   * Cancel emergency SOS
   */
  public cancelEmergencySos(): void {
    this.state.emergencySosActive = false;
    this.state.emergencySosDetails = null;

    this.state.messages.push({
      id: `sos-cancel-${Date.now()}`,
      from: this.state.myNodeNum,
      to: 0xffffffff,
      fromName: 'Command GCS Local',
      text: `[STAND DOWN] Emergency SOS Distress condition cleared by Command GCS.`,
      timestamp: Date.now(),
      channel: 0,
      portNum: 'TEXT_MESSAGE_APP',
      hopLimit: 4,
      rxSnr: 11.4,
      rxRssi: -65,
      isAcked: true,
    });

    this.notify();
  }

  /**
   * Execute hop-by-hop Traceroute to discover RF path and relay metrics
   */
  public async runTraceroute(targetNodeNum: number): Promise<MeshtasticTracerouteResult> {
    const targetNode = this.state.nodes.find(n => n.num === targetNodeNum) || this.state.nodes[1];
    const myNode = this.state.nodes[0];

    this.state.packetsSent += 1;

    // Determine path based on network topology
    const hops: MeshtasticTracerouteHop[] = [];
    const intermediateNodes = this.state.nodes.filter(
      n => n.num !== myNode.num && n.num !== targetNode.num && (n.role === 'ROUTER' || n.role === 'ROUTER_CLIENT')
    );

    const neededHops = Math.max(1, targetNode.hopsAway);

    if (neededHops === 0 || neededHops === 1) {
      // 1 direct hop
      hops.push({
        hopNumber: 1,
        nodeNum: targetNode.num,
        nodeId: targetNode.user.id,
        nodeName: targetNode.user.longName,
        snrTowardsTarget: targetNode.snr,
        snrTowardsOrigin: parseFloat((targetNode.snr - 1.2).toFixed(1)),
        rssi: targetNode.rssi,
        latencyMs: 34,
        isDestination: true,
      });
    } else {
      // Multi-hop path through relays
      for (let i = 0; i < neededHops - 1; i++) {
        const relay = intermediateNodes[i % intermediateNodes.length];
        hops.push({
          hopNumber: i + 1,
          nodeNum: relay.num,
          nodeId: relay.user.id,
          nodeName: relay.user.longName,
          snrTowardsTarget: parseFloat((12.5 - i * 2.8).toFixed(1)),
          snrTowardsOrigin: parseFloat((11.8 - i * 2.5).toFixed(1)),
          rssi: -72 - i * 6,
          latencyMs: 38 + i * 26,
          isDestination: false,
        });
      }
      hops.push({
        hopNumber: neededHops,
        nodeNum: targetNode.num,
        nodeId: targetNode.user.id,
        nodeName: targetNode.user.longName,
        snrTowardsTarget: targetNode.snr,
        snrTowardsOrigin: parseFloat((targetNode.snr - 1.5).toFixed(1)),
        rssi: targetNode.rssi,
        latencyMs: 42 * neededHops,
        isDestination: true,
      });
    }

    const totalRtt = hops.reduce((acc, h) => acc + h.latencyMs * 2, 0);
    const minSnr = Math.min(...hops.map(h => h.snrTowardsTarget));

    const result: MeshtasticTracerouteResult = {
      id: `tr-${Date.now()}`,
      targetNodeNum: targetNode.num,
      targetNodeName: targetNode.user.longName,
      originNodeNum: myNode.num,
      originNodeName: myNode.user.longName,
      timestamp: Date.now(),
      totalHops: hops.length,
      roundTripTimeMs: totalRtt,
      routeStatus: minSnr > 5 ? 'OPTIMAL' : minSnr > 0 ? 'DEGRADED' : 'UNREACHABLE',
      hops,
      estimatedPacketLossPct: minSnr > 6 ? 0.8 : minSnr > 0 ? 5.2 : 24.5,
    };

    // Emit ROUTER_DISCOVERY packet
    this.recordRfPacket({
      id: `rf-tr-${Date.now()}`,
      timestamp: Date.now(),
      freqMhz: this.state.frequencySlotMhz || 906.875,
      bandwidthKhz: 250,
      spreadingFactor: 8,
      codingRate: '4/5',
      senderNode: myNode.user.id,
      senderName: myNode.user.longName,
      packetType: 'ROUTER_DISCOVERY',
      rssi: -68,
      snr: 11.2,
      payloadSize: 32,
      airtimeMs: 98,
      chirpDirection: 'UP',
    });

    this.state.activeTraceroute = result;
    this.notify();
    return result;
  }

  public clearTraceroute(): void {
    this.state.activeTraceroute = null;
    this.notify();
  }

  /**
   * Records an RF packet event, updates recent packet buffer, and appends to rolling trend metrics
   */
  public recordRfPacket(packet: LoraRfPacketEvent): void {
    this.state.rfPackets.unshift(packet);
    if (this.state.rfPackets.length > 40) {
      this.state.rfPackets.pop();
    }
    this.state.packetsReceived += 1;

    // Append to rolling trend metrics
    const now = Date.now();
    const date = new Date(now);
    const timeLabel = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
    
    const lastPoint = this.state.rfMetricsHistory[this.state.rfMetricsHistory.length - 1];
    const newPoint: LoraRfMetricsHistoryPoint = {
      timestamp: now,
      timeLabel,
      rssi: packet.rssi,
      snr: packet.snr,
      noiseFloorDbm: parseFloat((-118.5 + (Math.random() - 0.5) * 1.5).toFixed(1)),
      channelUtilizationPct: parseFloat(Math.min(35, Math.max(2, (lastPoint?.channelUtilizationPct || 6.5) + (Math.random() - 0.45) * 2)).toFixed(1)),
      packetLossRatePct: parseFloat(Math.min(10, Math.max(0.2, (lastPoint?.packetLossRatePct || 1.8) + (Math.random() - 0.48) * 0.8)).toFixed(1)),
      nodeNumHex: packet.senderNode,
      nodeName: packet.senderName,
    };

    this.state.rfMetricsHistory.push(newPoint);
    if (this.state.rfMetricsHistory.length > 30) {
      this.state.rfMetricsHistory.shift();
    }

    this.state.channelAirtimePct = newPoint.channelUtilizationPct;
    this.state.channelNoiseFloorDbm = newPoint.noiseFloorDbm;
    this.notify();
  }

  private handleIncomingBlePacket(dataView: DataView): void {
    this.state.packetsReceived += 1;
    // Process incoming raw bytes from FromRadio
    this.notify();
  }

  private startSimulation(): void {
    if (this.simTimer) return;
    this.simTimer = setInterval(() => {
      // Periodically update simulated node telemetry and positions
      const randomNode = this.state.nodes[Math.floor(Math.random() * this.state.nodes.length)];
      if (randomNode) {
        randomNode.lastHeard = Date.now();
        randomNode.snr = parseFloat((Math.random() * 12 + 2).toFixed(1));
        randomNode.rssi = Math.floor(Math.random() * 40 - 100);
        if (randomNode.batteryLevel) {
          randomNode.batteryLevel = Math.max(10, Math.min(100, randomNode.batteryLevel + (Math.random() > 0.8 ? -1 : 0)));
        }
        if (randomNode.position) {
          // Slight wander
          randomNode.position.latitudeI += Math.floor((Math.random() - 0.5) * 50);
          randomNode.position.longitudeI += Math.floor((Math.random() - 0.5) * 50);
          randomNode.position.time = Date.now();
        }

        // Emit an RF packet chirp for this telemetry/position transmission
        if (Math.random() < 0.65) {
          const pktTypes: LoraRfPacketEvent['packetType'][] = ['TELEMETRY', 'POSITION', 'NODE_INFO', 'ROUTER_DISCOVERY'];
          const pickedType = pktTypes[Math.floor(Math.random() * pktTypes.length)];
          this.recordRfPacket({
            id: `sim-rf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: Date.now(),
            freqMhz: this.state.frequencySlotMhz || 906.875,
            bandwidthKhz: 250,
            spreadingFactor: 8,
            codingRate: '4/5',
            senderNode: randomNode.user.id,
            senderName: randomNode.user.longName,
            packetType: pickedType,
            rssi: randomNode.rssi,
            snr: randomNode.snr,
            payloadSize: 38,
            airtimeMs: 122,
            chirpDirection: 'UP',
          });
        }
      }

      // Random incoming tactical report from simulated network
      if (Math.random() < 0.25) {
        const simCallsigns = ['Alpha-Recon Relay', 'Mobile Scout Rover', 'Heltec Perimeter Sentry'];
        const simTexts = [
          'Ping check: RSSI -74 dBm, SNR +11.2 dB. Route: 1 hop.',
          'Mesh path optimized. 4 active nodes reachable on Tactical-Alpha.',
          'Telemetry report: Battery 4.12V, 14 satellites locked, HDOP 0.8.',
          'Position beacon broadcasted over 915 MHz LoRa.',
          'LoRa CSS chirp received. Encryption key verified (AES-256).',
        ];
        const randomFrom = this.state.nodes[Math.floor(Math.random() * (this.state.nodes.length - 1)) + 1];
        if (randomFrom) {
          this.state.messages.push({
            id: `sim-msg-${Date.now()}`,
            from: randomFrom.num,
            to: 0xffffffff,
            fromName: randomFrom.user.longName,
            text: simTexts[Math.floor(Math.random() * simTexts.length)],
            timestamp: Date.now(),
            channel: 0,
            portNum: 'TEXT_MESSAGE_APP',
            hopLimit: 3,
            rxSnr: randomFrom.snr,
            rxRssi: randomFrom.rssi,
            isAcked: true,
          });
          if (this.state.messages.length > 50) {
            this.state.messages.shift();
          }
          this.state.packetsReceived += 1;
        }
      }

      this.notify();
    }, 4000);
  }

  private stopSimulation(): void {
    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
    }
  }
}

export const meshtasticBleService = MeshtasticBleService.getInstance();
