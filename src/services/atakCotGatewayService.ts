import JSZip from 'jszip';
import { AtakCotEvent, AtakCotGatewayState } from '../types';

export class AtakCotGatewayService {
  private static instance: AtakCotGatewayService | null = null;
  private listeners: Set<() => void> = new Set();
  private streamTimer: any = null;

  private state: AtakCotGatewayState = {
    isStreaming: true,
    multicastGroup: '239.2.3.1:6969',
    takServerAddress: 'tak.c4isr.tactical.mil:8089',
    connectedClients: 6,
    eventsSent: 142,
    eventsReceived: 89,
    latestEvents: [
      {
        uid: 'UAV-ALPHA-RECON',
        type: 'a-f-A-M-F-Q', // Friendly Military Fixed-Wing/Drone
        time: new Date().toISOString(),
        start: new Date().toISOString(),
        stale: new Date(Date.now() + 120000).toISOString(),
        how: 'm-g',
        point: {
          lat: 37.7758,
          lon: -122.4182,
          hae: 120.4,
          ce: 1.5,
          le: 2.0,
        },
        detail: {
          callsign: 'RECON-01',
          endpoint: '10.0.4.11:4242',
          groupName: 'AIR_ASSAULT',
          role: 'Team Lead',
          battery: 88,
          courseDeg: 135.0,
          speedMps: 18.2,
          remarks: 'Conducting electro-optical sector sweep.',
          colorHex: '#06b6d4',
          classification: 'FRIENDLY',
        },
      },
      {
        uid: 'UGV-PERIMETER-SCOUT',
        type: 'a-f-G-E-V-A', // Friendly Ground Vehicle
        time: new Date(Date.now() - 15000).toISOString(),
        start: new Date(Date.now() - 15000).toISOString(),
        stale: new Date(Date.now() + 105000).toISOString(),
        how: 'm-g',
        point: {
          lat: 37.7732,
          lon: -122.4215,
          hae: 45.0,
          ce: 2.0,
          le: 3.5,
        },
        detail: {
          callsign: 'SCOUT-UGV',
          endpoint: '10.0.4.14:4242',
          groupName: 'GROUND_RECON',
          role: 'Scout',
          battery: 76,
          courseDeg: 45.0,
          speedMps: 6.5,
          remarks: 'Checkpoint Charlie secured. FLIR clear.',
          colorHex: '#10b981',
          classification: 'FRIENDLY',
        },
      },
      {
        uid: 'SIGINT-RF-UNKNOWN-EMITTER',
        type: 'a-u-G-I-U', // Unknown Ground Signal Intelligence Emitter
        time: new Date(Date.now() - 40000).toISOString(),
        start: new Date(Date.now() - 40000).toISOString(),
        stale: new Date(Date.now() + 80000).toISOString(),
        how: 'm-r',
        point: {
          lat: 37.7789,
          lon: -122.4145,
          hae: 62.0,
          ce: 18.0,
          le: 25.0,
        },
        detail: {
          callsign: 'INTERCEPT-915MHZ',
          groupName: 'ELECTRONIC_WARFARE',
          remarks: 'Unidentified pulsed burst at 915.250 MHz (LoRa CSS). TDoA confidence 86%.',
          colorHex: '#f59e0b',
          classification: 'UNKNOWN',
        },
      },
    ],
    autoSyncDroneSwarm: true,
    autoSyncMeshNodes: true,
    autoSyncSdrEmitters: true,
  };

  public static getInstance(): AtakCotGatewayService {
    if (!AtakCotGatewayService.instance) {
      AtakCotGatewayService.instance = new AtakCotGatewayService();
    }
    return AtakCotGatewayService.instance;
  }

  constructor() {
    this.startStreamingLoop();
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach(cb => cb());
  }

  public getState(): AtakCotGatewayState {
    return { ...this.state };
  }

  public toggleStreaming(): boolean {
    this.state.isStreaming = !this.state.isStreaming;
    if (this.state.isStreaming) {
      this.startStreamingLoop();
    } else {
      this.stopStreamingLoop();
    }
    this.notify();
    return this.state.isStreaming;
  }

  public setMulticastGroup(group: string): void {
    this.state.multicastGroup = group;
    this.notify();
  }

  public setTakServerAddress(addr: string): void {
    this.state.takServerAddress = addr;
    this.notify();
  }

  public setAutoSyncOptions(droneSwarm: boolean, meshNodes: boolean, sdrEmitters: boolean): void {
    this.state.autoSyncDroneSwarm = droneSwarm;
    this.state.autoSyncMeshNodes = meshNodes;
    this.state.autoSyncSdrEmitters = sdrEmitters;
    this.notify();
  }

  /**
   * Generates standard Cursor-on-Target XML representation for an event
   */
  public generateCotXml(event: AtakCotEvent): string {
    const course = event.detail.courseDeg !== undefined ? ` course="${event.detail.courseDeg.toFixed(1)}"` : '';
    const speed = event.detail.speedMps !== undefined ? ` speed="${event.detail.speedMps.toFixed(1)}"` : '';
    const battery = event.detail.battery !== undefined ? `<status battery="${event.detail.battery}"/>` : '';
    const endpoint = event.detail.endpoint ? ` endpoint="${event.detail.endpoint}"` : '';

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<event version="2.0" uid="${event.uid}" type="${event.type}" time="${event.time}" start="${event.start}" stale="${event.stale}" how="${event.how}">
  <point lat="${event.point.lat.toFixed(6)}" lon="${event.point.lon.toFixed(6)}" hae="${event.point.hae.toFixed(1)}" ce="${event.point.ce.toFixed(1)}" le="${event.point.le.toFixed(1)}"/>
  <detail>
    <contact callsign="${event.detail.callsign}"${endpoint}/>
    <track${speed}${course}/>
    ${battery}
    <remarks>${event.detail.remarks || 'Tactical C4ISR CoT track'}</remarks>
  </detail>
</event>`.trim();
  }

  /**
   * Broadcast a newly created CoT marker into the stream
   */
  public broadcastCustomEvent(
    callsign: string,
    lat: number,
    lon: number,
    altMeters: number,
    type: string = 'a-f-G-U-C', // Friendly Ground Combat
    remarks: string = 'Tactical Point of Interest'
  ): AtakCotEvent {
    const now = new Date();
    const staleTime = new Date(now.getTime() + 180000);

    const event: AtakCotEvent = {
      uid: `COT-${callsign.replace(/\s+/g, '-').toUpperCase()}-${Date.now().toString().slice(-4)}`,
      type,
      time: now.toISOString(),
      start: now.toISOString(),
      stale: staleTime.toISOString(),
      how: 'h-e', // Human entered
      point: {
        lat,
        lon,
        hae: altMeters,
        ce: 5.0,
        le: 5.0,
      },
      detail: {
        callsign,
        groupName: 'SPECIAL_TACTICAL',
        remarks,
        colorHex: '#38bdf8',
        classification: 'FRIENDLY',
      },
    };

    event.rawXml = this.generateCotXml(event);
    this.state.latestEvents.unshift(event);
    if (this.state.latestEvents.length > 25) {
      this.state.latestEvents.pop();
    }
    this.state.eventsSent += 1;
    this.notify();
    return event;
  }

  /**
   * Parse uploaded .cot or .xml file and add to state
   */
  public parseAndImportCotXml(xmlText: string): AtakCotEvent {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const eventElem = doc.querySelector('event');
    if (!eventElem) {
      throw new Error('Invalid Cursor-on-Target XML: Missing <event> root element.');
    }

    const pointElem = eventElem.querySelector('point');
    const contactElem = eventElem.querySelector('contact');
    const remarksElem = eventElem.querySelector('remarks');
    const trackElem = eventElem.querySelector('track');
    const statusElem = eventElem.querySelector('status');

    const uid = eventElem.getAttribute('uid') || `IMPORTED-COT-${Date.now()}`;
    const type = eventElem.getAttribute('type') || 'a-u-G';
    const lat = parseFloat(pointElem?.getAttribute('lat') || '0');
    const lon = parseFloat(pointElem?.getAttribute('lon') || '0');
    const hae = parseFloat(pointElem?.getAttribute('hae') || '0');
    const callsign = contactElem?.getAttribute('callsign') || uid;
    const speed = parseFloat(trackElem?.getAttribute('speed') || '0');
    const course = parseFloat(trackElem?.getAttribute('course') || '0');
    const battery = parseInt(statusElem?.getAttribute('battery') || '100', 10);
    const remarks = remarksElem?.textContent || 'Imported CoT track';

    const event: AtakCotEvent = {
      uid,
      type,
      time: eventElem.getAttribute('time') || new Date().toISOString(),
      start: eventElem.getAttribute('start') || new Date().toISOString(),
      stale: eventElem.getAttribute('stale') || new Date(Date.now() + 120000).toISOString(),
      how: (eventElem.getAttribute('how') as any) || 'm-g',
      point: { lat, lon, hae, ce: 10, le: 10 },
      detail: {
        callsign,
        remarks,
        speedMps: speed,
        courseDeg: course,
        battery,
        classification: type.startsWith('a-f') ? 'FRIENDLY' : type.startsWith('a-h') ? 'HOSTILE' : 'UNKNOWN',
        colorHex: type.startsWith('a-f') ? '#10b981' : type.startsWith('a-h') ? '#ef4444' : '#f59e0b',
      },
      rawXml: xmlText,
    };

    this.state.latestEvents.unshift(event);
    this.state.eventsReceived += 1;
    this.notify();
    return event;
  }

  /**
   * Export all active CoT events as an ATAK Mission Package (.zip containing MANIFEST/manifest.xml and .cot files)
   */
  public async exportAtakMissionPackageZip(): Promise<Blob> {
    const zip = new JSZip();

    // 1. MANIFEST/manifest.xml
    const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<MissionPackageManifest version="2">
  <Configuration>
    <Parameter name="name" value="C4ISR_TACTICAL_EXPORT_${Date.now()}"/>
    <Parameter name="uid" value="${crypto.randomUUID()}"/>
    <Parameter name="onReceiveDelete" value="false"/>
  </Configuration>
  <Contents>
    ${this.state.latestEvents.map((evt, idx) => `
    <Content ignore="false" zipEntry="cot/event_${idx + 1}_${evt.uid}.cot">
      <Parameter name="contentType" value="application/x-cot+xml"/>
    </Content>`).join('')}
  </Contents>
</MissionPackageManifest>`.trim();

    zip.file('MANIFEST/manifest.xml', manifestXml);

    // 2. Individual .cot files
    const cotFolder = zip.folder('cot');
    this.state.latestEvents.forEach((evt, idx) => {
      const xml = this.generateCotXml(evt);
      cotFolder?.file(`event_${idx + 1}_${evt.uid}.cot`, xml);
    });

    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  }

  /**
   * Export all events as a single concatenated CoT XML stream
   */
  public exportConcatenatedCotXml(): string {
    return this.state.latestEvents.map(evt => this.generateCotXml(evt)).join('\n\n');
  }

  private startStreamingLoop(): void {
    if (this.streamTimer) return;
    this.streamTimer = setInterval(() => {
      if (!this.state.isStreaming) return;

      // Update positions with subtle kinematic drift
      this.state.latestEvents.forEach(evt => {
        if (evt.detail.speedMps && evt.detail.courseDeg !== undefined) {
          const headingRad = (evt.detail.courseDeg * Math.PI) / 180;
          const dLat = Math.cos(headingRad) * evt.detail.speedMps * 0.000002;
          const dLon = Math.sin(headingRad) * evt.detail.speedMps * 0.000002;
          evt.point.lat += dLat;
          evt.point.lon += dLon;
          evt.time = new Date().toISOString();
        }
      });

      this.state.eventsSent += 1;
      this.notify();
    }, 2500);
  }

  private stopStreamingLoop(): void {
    if (this.streamTimer) {
      clearInterval(this.streamTimer);
      this.streamTimer = null;
    }
  }
}

export const atakCotGatewayService = AtakCotGatewayService.getInstance();
