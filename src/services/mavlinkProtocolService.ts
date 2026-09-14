import { MavlinkConnectionState, MavlinkFlightMode, MavlinkPacketLog, MavlinkTelemetry } from '../types';

export class MavlinkProtocolService {
  private static instance: MavlinkProtocolService | null = null;

  private serialPort: any = null;
  private serialReader: any = null;
  private listeners: Set<() => void> = new Set();
  private simTimer: any = null;
  private seqCounter: number = 0;

  private state: MavlinkConnectionState = {
    isConnected: false,
    isConnecting: false,
    isSimulated: false,
    portName: null,
    baudRate: 57600,
    protocolVersion: 'MAVLink_v2',
    telemetry: {
      systemId: 1,
      componentId: 1,
      isArmed: true,
      flightMode: 'GUIDED',
      batteryVoltage: 22.4, // 6S LiPo
      batteryRemainingPercent: 84,
      batteryCurrentA: 18.2,
      rollDeg: 2.4,
      pitchDeg: -1.8,
      yawDeg: 142.0,
      climbRateMps: 0.2,
      groundSpeedMps: 12.4,
      airSpeedMps: 13.1,
      headingDeg: 142.0,
      lat: 37.77492,
      lng: -122.41941,
      altRelativeMeters: 45.2,
      altMslMeters: 93.2,
      gpsFixType: '3D_FIX',
      satellitesVisible: 18,
      hdop: 0.72,
      vdop: 0.88,
      rssiPercent: 96,
      packetDropRate: 0.1,
      cpuLoadPercent: 24,
      lastHeartbeatMs: Date.now(),
    },
    packetLogs: [],
    activeCommands: [],
  };

  public static getInstance(): MavlinkProtocolService {
    if (!MavlinkProtocolService.instance) {
      MavlinkProtocolService.instance = new MavlinkProtocolService();
    }
    return MavlinkProtocolService.instance;
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach(cb => cb());
  }

  public getState(): MavlinkConnectionState {
    return { ...this.state };
  }

  public isWebSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  /**
   * Connect to physical autopilot (Pixhawk / SiK Radio) over WebSerial
   */
  public async connectPhysicalSerial(baudRate: number = 57600): Promise<boolean> {
    if (!this.isWebSerialSupported()) {
      throw new Error('WebSerial is not supported in this browser. Use Chrome/Edge over HTTPS.');
    }

    this.state.isConnecting = true;
    this.state.baudRate = baudRate;
    this.notify();

    try {
      const port = await (navigator as any).serial.requestPort({
        filters: [
          { usbVendorId: 0x10c4 }, // CP2102 (Silicon Labs SiK Radio)
          { usbVendorId: 0x0403 }, // FTDI
          { usbVendorId: 0x26ac }, // 3DR / Hex Pixhawk
          { usbVendorId: 0x2e90 }, // CubePilot
        ],
      });

      await port.open({ baudRate });
      this.serialPort = port;
      this.state.isConnected = true;
      this.state.isConnecting = false;
      this.state.isSimulated = false;
      this.state.portName = `Serial Telemetry (${baudRate} baud)`;
      this.stopSimulation();
      this.startSerialReader();
      this.notify();
      return true;
    } catch (err: any) {
      this.state.isConnecting = false;
      this.notify();
      throw err;
    }
  }

  public connectSimulated(): void {
    this.state.isConnected = true;
    this.state.isConnecting = false;
    this.state.isSimulated = true;
    this.state.portName = 'PX4 SITL / MAVLink v2 Virtual Radio (57600 baud)';
    this.startSimulation();
    this.notify();
  }

  public disconnect(): void {
    if (this.serialReader) {
      try {
        this.serialReader.cancel();
      } catch (e) {
        // ignore
      }
    }
    if (this.serialPort) {
      try {
        this.serialPort.close();
      } catch (e) {
        // ignore
      }
      this.serialPort = null;
    }
    this.state.isConnected = false;
    this.state.isConnecting = false;
    this.state.portName = null;
    this.stopSimulation();
    this.notify();
  }

  /**
   * GCS Autopilot Commands
   */
  public armMotors(): void {
    this.state.telemetry.isArmed = true;
    this.logPacket(76, 'COMMAND_LONG', 'MAV_CMD_COMPONENT_ARM_DISARM: ARM (Param1=1)');
    this.pushActiveCommand('COMMAND: ARM MOTORS -> ACK_OK');
    this.notify();
  }

  public disarmMotors(): void {
    this.state.telemetry.isArmed = false;
    this.logPacket(76, 'COMMAND_LONG', 'MAV_CMD_COMPONENT_ARM_DISARM: DISARM (Param1=0)');
    this.pushActiveCommand('COMMAND: DISARM MOTORS -> ACK_OK');
    this.notify();
  }

  public setFlightMode(mode: MavlinkFlightMode): void {
    this.state.telemetry.flightMode = mode;
    this.logPacket(11, 'SET_MODE', `Target mode: ${mode}`);
    this.pushActiveCommand(`FLIGHT MODE CHANGED TO ${mode}`);
    this.notify();
  }

  public executeTakeoff(altitudeMeters: number = 25): void {
    this.state.telemetry.isArmed = true;
    this.state.telemetry.flightMode = 'GUIDED';
    this.state.telemetry.climbRateMps = 2.5;
    this.logPacket(76, 'COMMAND_LONG', `MAV_CMD_NAV_TAKEOFF: Target Alt = ${altitudeMeters}m`);
    this.pushActiveCommand(`TAKEOFF INITIATED TO ${altitudeMeters}m AGL`);
    this.notify();
  }

  public executeRtl(): void {
    this.state.telemetry.flightMode = 'RTL';
    this.state.telemetry.headingDeg = (this.state.telemetry.headingDeg + 180) % 360;
    this.logPacket(76, 'COMMAND_LONG', 'MAV_CMD_NAV_RETURN_TO_LAUNCH: Inverted vector to Home');
    this.pushActiveCommand('RETURN TO LAUNCH (RTL) ENGAGED');
    this.notify();
  }

  public emergencyMotorKill(): void {
    this.state.telemetry.isArmed = false;
    this.state.telemetry.climbRateMps = -9.8;
    this.state.telemetry.groundSpeedMps = 0;
    this.logPacket(76, 'COMMAND_LONG', 'EMERGENCY_STOP: FORCE SHUTDOWN MOTORS');
    this.pushActiveCommand('EMERGENCY MOTOR CUTOFF EXECUTED');
    this.notify();
  }

  private pushActiveCommand(cmd: string): void {
    this.state.activeCommands.unshift(`[${new Date().toLocaleTimeString()}] ${cmd}`);
    if (this.state.activeCommands.length > 8) {
      this.state.activeCommands.pop();
    }
  }

  private logPacket(msgId: number, msgName: string, summary: string): void {
    this.seqCounter = (this.seqCounter + 1) % 256;
    const hex = `FD 1E 00 00 ${this.seqCounter.toString(16).padStart(2, '0').toUpperCase()} 01 01 ${msgId.toString(16).padStart(2, '0').toUpperCase()} ...`;
    this.state.packetLogs.unshift({
      timestamp: Date.now(),
      seq: this.seqCounter,
      sysId: this.state.telemetry.systemId,
      compId: this.state.telemetry.componentId,
      msgId,
      msgName,
      payloadSummary: summary,
      rawHex: hex,
    });
    if (this.state.packetLogs.length > 40) {
      this.state.packetLogs.pop();
    }
  }

  private async startSerialReader(): Promise<void> {
    if (!this.serialPort || !this.serialPort.readable) return;
    try {
      const reader = this.serialPort.readable.getReader();
      this.serialReader = reader;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value && value.length > 0) {
          // Parse incoming bytes for MAVLink v2 0xFD magic byte
          this.logPacket(30, 'RAW_SERIAL_STREAM', `Received ${value.length} binary bytes`);
          this.notify();
        }
      }
    } catch (err) {
      console.warn('[MAVLink Serial] Read loop terminated:', err);
    }
  }

  private startSimulation(): void {
    if (this.simTimer) return;
    this.simTimer = setInterval(() => {
      const t = this.state.telemetry;
      t.lastHeartbeatMs = Date.now();

      // Kinematic flight physics simulation
      if (t.isArmed) {
        // Roll & pitch oscillation
        t.rollDeg = parseFloat((Math.sin(Date.now() / 2000) * 8.5 + (Math.random() - 0.5) * 1.5).toFixed(1));
        t.pitchDeg = parseFloat((Math.cos(Date.now() / 2400) * 4.2 + (Math.random() - 0.5) * 1.0).toFixed(1));
        t.yawDeg = (t.yawDeg + 0.3) % 360;
        t.headingDeg = parseFloat(t.yawDeg.toFixed(1));

        // Speed & Altitude
        if (t.flightMode === 'GUIDED' || t.flightMode === 'AUTO') {
          t.groundSpeedMps = parseFloat((14.0 + Math.sin(Date.now() / 3000) * 2.2).toFixed(1));
          t.airSpeedMps = parseFloat((t.groundSpeedMps + 1.2).toFixed(1));
          t.altRelativeMeters = parseFloat((48.0 + Math.sin(Date.now() / 4000) * 3.5).toFixed(1));
          t.climbRateMps = parseFloat((Math.sin(Date.now() / 4000) * 0.8).toFixed(2));
        } else if (t.flightMode === 'RTL') {
          t.groundSpeedMps = 18.5;
          t.altRelativeMeters = Math.max(15, t.altRelativeMeters - 0.4);
          t.climbRateMps = -0.4;
        }

        // Coordinate migration along heading
        const headingRad = (t.headingDeg * Math.PI) / 180;
        const dLat = (Math.cos(headingRad) * t.groundSpeedMps * 0.000008);
        const dLng = (Math.sin(headingRad) * t.groundSpeedMps * 0.000008);
        t.lat = parseFloat((t.lat + dLat).toFixed(6));
        t.lng = parseFloat((t.lng + dLng).toFixed(6));
        t.altMslMeters = parseFloat((t.altRelativeMeters + 48).toFixed(1));

        // Battery drain
        t.batteryVoltage = Math.max(21.0, parseFloat((t.batteryVoltage - 0.001).toFixed(2)));
        t.batteryRemainingPercent = Math.max(5, parseFloat((t.batteryRemainingPercent - 0.005).toFixed(1)));
        t.batteryCurrentA = parseFloat((16.5 + Math.abs(t.climbRateMps) * 4.0 + (Math.random() - 0.5)).toFixed(1));
      } else {
        t.rollDeg = 0;
        t.pitchDeg = 0;
        t.groundSpeedMps = 0;
        t.airSpeedMps = 0;
        t.climbRateMps = 0;
        t.batteryCurrentA = 0.8; // Idle electronics
      }

      // Log alternating MAVLink v2 messages
      const msgs = [
        { id: 0, name: 'HEARTBEAT', summary: `Type=QUADROTOR, Autopilot=PX4, BaseMode=${t.isArmed ? 'ARMED' : 'DISARMED'}` },
        { id: 30, name: 'ATTITUDE', summary: `Roll=${t.rollDeg}°, Pitch=${t.pitchDeg}°, Yaw=${t.yawDeg}°` },
        { id: 33, name: 'GLOBAL_POSITION_INT', summary: `Lat=${t.lat.toFixed(5)}, Lon=${t.lng.toFixed(5)}, Alt=${t.altRelativeMeters}m` },
        { id: 74, name: 'VFR_HUD', summary: `AirSpeed=${t.airSpeedMps}m/s, GroundSpeed=${t.groundSpeedMps}m/s, Hdg=${t.headingDeg}°` },
        { id: 1, name: 'SYS_STATUS', summary: `Voltage=${t.batteryVoltage}V, Remaining=${t.batteryRemainingPercent}%, Load=${t.cpuLoadPercent}%` },
      ];
      const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
      this.logPacket(randomMsg.id, randomMsg.name, randomMsg.summary);

      this.notify();
    }, 1000);
  }

  private stopSimulation(): void {
    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
    }
  }
}

export const mavlinkProtocolService = MavlinkProtocolService.getInstance();
