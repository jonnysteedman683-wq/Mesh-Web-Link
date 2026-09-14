import React, { useState, useRef, useMemo } from 'react';
import { 
  MeshtasticBleState, 
  MeshtasticBleNode, 
  MeshtasticWaypoint, 
  MeshtasticTracerouteResult 
} from '../types';
import { 
  MapPin, 
  Navigation, 
  Radio, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Crosshair, 
  Route, 
  Maximize2, 
  Compass, 
  Activity, 
  ShieldAlert, 
  Zap, 
  CheckCircle2, 
  X, 
  Battery, 
  Signal, 
  Mountain,
  Eye,
  Send,
  Flag,
  Share2
} from 'lucide-react';
import { meshtasticBleService } from '../services/meshtasticBleService';
import { meshCloudSyncService } from '../services/meshCloudSyncService';
import { tactileAudio } from '../services/tactileAudio';

interface MeshtasticTacticalMapViewProps {
  state: MeshtasticBleState;
  onNotify?: (msg: string) => void;
  onSelectNodeForChat?: (node: MeshtasticBleNode) => void;
}

export const MeshtasticTacticalMapView: React.FC<MeshtasticTacticalMapViewProps> = ({
  state,
  onNotify,
  onSelectNodeForChat,
}) => {
  const [selectedNode, setSelectedNode] = useState<MeshtasticBleNode | null>(null);
  const [losTargetNode, setLosTargetNode] = useState<MeshtasticBleNode | null>(null);
  const [showWaypointForm, setShowWaypointForm] = useState<boolean>(false);
  const [wpName, setWpName] = useState<string>('');
  const [wpDesc, setWpDesc] = useState<string>('');
  const [wpLat, setWpLat] = useState<string>('37.7750');
  const [wpLon, setWpLon] = useState<string>('-122.4200');
  const [wpAlt, setWpAlt] = useState<string>('60');
  const [wpIcon, setWpIcon] = useState<MeshtasticWaypoint['icon']>('LZ');
  const [isTracing, setIsTracing] = useState<boolean>(false);
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [showCoverageRings, setShowCoverageRings] = useState<boolean>(true);
  const [showTerrainContours, setShowTerrainContours] = useState<boolean>(true);
  const [selectedWaypoint, setSelectedWaypoint] = useState<MeshtasticWaypoint | null>(null);

  // Compute map bounds from all nodes and waypoints
  const { centerLat, centerLon, geoPoints } = useMemo(() => {
    const points: { id: string; name: string; lat: number; lon: number; isNode: boolean; node?: MeshtasticBleNode }[] = [];
    
    state.nodes.forEach(n => {
      if (n.position) {
        points.push({
          id: n.user.id,
          name: n.user.longName,
          lat: n.position.latitudeI / 1e7,
          lon: n.position.longitudeI / 1e7,
          isNode: true,
          node: n,
        });
      }
    });

    state.waypoints.forEach(w => {
      points.push({
        id: w.id,
        name: w.name,
        lat: w.latitude,
        lon: w.longitude,
        isNode: false,
      });
    });

    if (points.length === 0) {
      return { centerLat: 37.7749, centerLon: -122.4194, geoPoints: [] };
    }

    const avgLat = points.reduce((acc, p) => acc + p.lat, 0) / points.length;
    const avgLon = points.reduce((acc, p) => acc + p.lon, 0) / points.length;

    return { centerLat: avgLat, centerLon: avgLon, geoPoints: points };
  }, [state.nodes, state.waypoints]);

  // Convert GPS Coordinates to SVG X, Y coordinates
  // Equirectangular projection local flat scale centered on centerLat, centerLon
  const coordToSvg = (lat: number, lon: number): { x: number; y: number } => {
    const latSpan = 0.025 / mapZoom;
    const lonSpan = 0.035 / mapZoom;

    // SVG viewBox is 800 x 550
    const x = 400 + ((lon - centerLon) / lonSpan) * 360;
    const y = 275 - ((lat - centerLat) / latSpan) * 230;
    return { x, y };
  };

  // Calculate distance, bearing, and 1st Fresnel zone clearance between 2 nodes
  const losMetrics = useMemo(() => {
    const origin = state.nodes[0]; // Local GCS
    const target = losTargetNode || (selectedNode && selectedNode.num !== origin.num ? selectedNode : state.nodes[1]);

    if (!origin?.position || !target?.position) {
      return null;
    }

    const lat1 = origin.position.latitudeI / 1e7;
    const lon1 = origin.position.longitudeI / 1e7;
    const alt1 = origin.position.altitude || 40;

    const lat2 = target.position.latitudeI / 1e7;
    const lon2 = target.position.longitudeI / 1e7;
    const alt2 = target.position.altitude || 50;

    // Haversine distance
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distKm = R * c;
    const distMiles = distKm * 0.621371;

    // Azimuth bearing
    const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
    const x =
      Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
      Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
    let bearingDeg = (Math.atan2(y, x) * 180) / Math.PI;
    if (bearingDeg < 0) bearingDeg += 360;

    // 1st Fresnel Zone Radius (meters): F1 = 17.32 * sqrt(d_km / (4 * f_ghz))
    const freqGhz = (state.frequencySlotMhz || 906.875) / 1000;
    const fresnelRadiusMeters = 17.32 * Math.sqrt(distKm / (4 * freqGhz));
    const clearance60PctMeters = fresnelRadiusMeters * 0.6;

    // Free space path loss FSPL (dB) = 20*log10(d_km) + 20*log10(f_mhz) + 32.44
    const fsplDb = 20 * Math.log10(Math.max(0.01, distKm)) + 20 * Math.log10(state.frequencySlotMhz || 906.875) + 32.44;

    const elevationDiff = alt2 - alt1;
    const linkStatus: 'LINE_OF_SIGHT_CLEAR' | 'MARGINAL_OBSTRUCTION' | 'DIFFRACTION_REQUIRED' =
      target.snr > 4 ? 'LINE_OF_SIGHT_CLEAR' : target.snr > -2 ? 'MARGINAL_OBSTRUCTION' : 'DIFFRACTION_REQUIRED';

    return {
      target,
      distKm,
      distMiles,
      bearingDeg,
      fresnelRadiusMeters,
      clearance60PctMeters,
      fsplDb,
      elevationDiff,
      linkStatus,
    };
  }, [state.nodes, selectedNode, losTargetNode, state.frequencySlotMhz]);

  // Handle Traceroute Execution
  const handleRunTraceroute = async (targetNode: MeshtasticBleNode) => {
    tactileAudio.playNodeConnect();
    setIsTracing(true);
    if (onNotify) onNotify(`Executing hop-by-hop mesh traceroute to ${targetNode.user.longName}...`);

    try {
      const res = await meshtasticBleService.runTraceroute(targetNode.num);
      tactileAudio.playSuccess();
      if (onNotify) {
        onNotify(`Traceroute complete: ${res.totalHops} hops (${res.roundTripTimeMs}ms RTT). Status: ${res.routeStatus}`);
      }
    } catch (err: any) {
      console.error(err);
      if (onNotify) onNotify('Traceroute failed: ' + err.message);
    } finally {
      setIsTracing(false);
    }
  };

  // Handle Add Waypoint
  const handleCreateWaypoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wpName.trim()) return;

    tactileAudio.playClick();
    const newWp = meshtasticBleService.broadcastTacticalWaypoint({
      name: wpName.trim(),
      description: wpDesc.trim(),
      latitude: parseFloat(wpLat) || 37.775,
      longitude: parseFloat(wpLon) || -122.42,
      altitudeMeters: parseFloat(wpAlt) || 50,
      icon: wpIcon,
    });

    if (newWp) {
      meshCloudSyncService.broadcastWaypoint({
        id: newWp.id,
        title: newWp.name,
        latitude: newWp.latitude,
        longitude: newWp.longitude,
        altitude: newWp.altitudeMeters,
        category: newWp.icon,
        description: newWp.description,
        createdBy: 'Operator',
        createdAt: Date.now()
      }).catch(() => {});
    }

    if (onNotify) onNotify(`Broadcasted waypoint '${wpName}' to mesh network & cloud sync.`);
    setShowWaypointForm(false);
    setWpName('');
    setWpDesc('');
  };

  // Handle Emergency SOS Toggle
  const handleToggleSos = () => {
    tactileAudio.playWarning();
    if (state.emergencySosActive) {
      meshtasticBleService.cancelEmergencySos();
      meshCloudSyncService.standDownEmergencySos().catch(() => {});
      if (onNotify) onNotify('Emergency SOS cleared. Returning to normal radio traffic.');
    } else {
      meshtasticBleService.triggerEmergencySos('MAYDAY MAYDAY // TAC-TEAM ALPHA DISTRESS BEACON');
      meshCloudSyncService.triggerEmergencySos({
        initiatorName: 'TAC-TEAM ALPHA',
        initiatorNodeNum: state.myNodeNum,
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: 45,
        emergencyType: 'TAC_DISTRESS_MAYDAY',
        message: 'MAYDAY MAYDAY // TAC-TEAM ALPHA DISTRESS BEACON'
      }).catch(() => {});
      if (onNotify) onNotify('EMERGENCY SOS BROADCASTED TO ALL NODES & CLOUD OPERATORS.');
    }
  };

  return (
    <div className="space-y-4" id="meshtastic-tactical-map-view">
      {/* Emergency SOS Banner */}
      {state.emergencySosActive && (
        <div className="p-4 rounded-xl bg-red-950/90 border-2 border-red-500 animate-pulse text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl shadow-red-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-red-600 text-white font-black animate-bounce">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-red-300">
                ACTIVE DISTRESS BEACON // HOP LIMIT 7 PRIORITY ROUTE
              </div>
              <div className="text-sm font-bold text-white">
                {state.emergencySosDetails || 'OFFICER DOWN // SEARCH & RESCUE ACTIVATED'}
              </div>
            </div>
          </div>
          <button
            onClick={handleToggleSos}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider rounded-lg border border-red-400 cursor-pointer shadow-lg transition-all"
          >
            Cancel / Stand Down SOS
          </button>
        </div>
      )}

      {/* Map Control Header */}
      <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-800">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Geospatial Mesh Tactical Plotter</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                MGRS / WGS-84
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Center: {centerLat.toFixed(4)}°N, {Math.abs(centerLon).toFixed(4)}°W | Altitude: MSL
            </div>
          </div>
        </div>

        {/* View Controls & Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setMapZoom(Math.max(0.6, mapZoom - 0.2))}
              className="px-2 py-0.5 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
              title="Zoom Out"
            >
              -
            </button>
            <span className="px-1 text-indigo-300 font-bold">{mapZoom.toFixed(1)}x</span>
            <button
              onClick={() => setMapZoom(Math.min(2.5, mapZoom + 0.2))}
              className="px-2 py-0.5 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
              title="Zoom In"
            >
              +
            </button>
          </div>

          <button
            onClick={() => setShowCoverageRings(!showCoverageRings)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
              showCoverageRings
                ? 'bg-indigo-950 text-indigo-200 border-indigo-700'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            RF Coverage Rings
          </button>

          <button
            onClick={() => setShowTerrainContours(!showTerrainContours)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
              showTerrainContours
                ? 'bg-emerald-950 text-emerald-200 border-emerald-700'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Terrain Elevation
          </button>

          <button
            onClick={() => setShowWaypointForm(!showWaypointForm)}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Drop Waypoint</span>
          </button>

          <button
            onClick={handleToggleSos}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              state.emergencySosActive
                ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                : 'bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{state.emergencySosActive ? 'Active SOS' : 'Emergency SOS'}</span>
          </button>
        </div>
      </div>

      {/* Main Map + Side Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left / Center Column: SVG Tactical Map Canvas */}
        <div className="lg:col-span-8 space-y-3">
          <div className="relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl h-[520px] select-none">
            {/* Compass Rose Header Overlay */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300">
              <Navigation className="w-3.5 h-3.5 text-indigo-400 rotate-45" />
              <span>HEADING 000° TRUE (GRID NORTH)</span>
            </div>

            {/* Live Frequency & SF Overlay */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-emerald-300">{(state.frequencySlotMhz || 906.875).toFixed(3)} MHz</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300">{state.modemPreset}</span>
            </div>

            {/* SVG Visual Canvas */}
            <svg
              className="w-full h-full cursor-crosshair"
              viewBox="0 0 800 550"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                {/* Tactical Grid Pattern */}
                <pattern id="tacGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                  <circle cx="0" cy="0" r="1.5" fill="#334155" />
                </pattern>

                {/* Mesh RF Signal Line Gradients */}
                <linearGradient id="rfLinkGreen" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
                </linearGradient>

                <linearGradient id="rfLinkAmber" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.4" />
                </linearGradient>

                <linearGradient id="rfLinkRed" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.4" />
                </linearGradient>

                <linearGradient id="tracerouteGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
              </defs>

              {/* Background Tactical Grid */}
              <rect width="800" height="550" fill="url(#tacGrid)" />

              {/* Simulated Topographic Elevation Contours */}
              {showTerrainContours && (
                <g opacity="0.15" stroke="#38bdf8" fill="none" strokeWidth="1">
                  <ellipse cx="400" cy="275" rx="360" ry="240" strokeDasharray="4 8" />
                  <ellipse cx="400" cy="275" rx="270" ry="180" strokeDasharray="6 6" />
                  <ellipse cx="400" cy="275" rx="180" ry="120" />
                  <ellipse cx="400" cy="275" rx="90" ry="60" stroke="#06b6d4" strokeWidth="1.5" />
                  <path d="M 120 420 Q 250 310 400 390 T 700 350" stroke="#0ea5e9" strokeWidth="0.8" />
                  <path d="M 150 160 Q 320 220 500 140 T 720 200" stroke="#0ea5e9" strokeWidth="0.8" />
                </g>
              )}

              {/* Concentric Distance Rings from Local GCS (Node 0) */}
              {showCoverageRings && (
                <g>
                  {/* Origin is GCS Node */}
                  {(() => {
                    const origin = state.nodes[0];
                    if (!origin?.position) return null;
                    const { x, y } = coordToSvg(origin.position.latitudeI / 1e7, origin.position.longitudeI / 1e7);
                    return (
                      <g stroke="#6366f1" strokeOpacity="0.25" fill="none">
                        <circle cx={x} cy={y} r="70" strokeDasharray="3 3" />
                        <text x={x + 75} y={y - 5} fill="#818cf8" fontSize="9" fontFamily="monospace" opacity="0.6">
                          1.5 km
                        </text>

                        <circle cx={x} cy={y} r="140" strokeDasharray="4 4" />
                        <text x={x + 145} y={y - 5} fill="#818cf8" fontSize="9" fontFamily="monospace" opacity="0.6">
                          3.0 km
                        </text>

                        <circle cx={x} cy={y} r="220" strokeDasharray="5 5" />
                        <text x={x + 225} y={y - 5} fill="#818cf8" fontSize="9" fontFamily="monospace" opacity="0.6">
                          5.0 km
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}

              {/* Draw Mesh Links between Nodes */}
              {state.nodes.map((nodeA, i) => {
                if (!nodeA.position) return null;
                const posA = coordToSvg(nodeA.position.latitudeI / 1e7, nodeA.position.longitudeI / 1e7);

                return state.nodes.slice(i + 1).map((nodeB) => {
                  if (!nodeB.position) return null;
                  const posB = coordToSvg(nodeB.position.latitudeI / 1e7, nodeB.position.longitudeI / 1e7);

                  // Determine link color by SNR
                  const avgSnr = (nodeA.snr + nodeB.snr) / 2;
                  const strokeColor = avgSnr > 7 ? 'url(#rfLinkGreen)' : avgSnr > 2 ? 'url(#rfLinkAmber)' : 'url(#rfLinkRed)';
                  const strokeWidth = avgSnr > 7 ? 2 : 1.2;

                  // Check if this link is part of the active traceroute
                  const isTracedLink = state.activeTraceroute?.hops.some(
                    (h, idx, arr) => {
                      const prevHop = idx > 0 ? arr[idx - 1] : { nodeNum: state.myNodeNum };
                      return (
                        (h.nodeNum === nodeA.num && prevHop.nodeNum === nodeB.num) ||
                        (h.nodeNum === nodeB.num && prevHop.nodeNum === nodeA.num)
                      );
                    }
                  );

                  return (
                    <g key={`link-${nodeA.num}-${nodeB.num}`}>
                      <line
                        x1={posA.x}
                        y1={posA.y}
                        x2={posB.x}
                        y2={posB.y}
                        stroke={isTracedLink ? 'url(#tracerouteGlow)' : strokeColor}
                        strokeWidth={isTracedLink ? 3.5 : strokeWidth}
                        strokeDasharray={isTracedLink ? '6 3' : 'none'}
                        className={isTracedLink ? 'animate-pulse' : ''}
                      />
                      {/* Midpoint SNR Badge */}
                      <rect
                        x={(posA.x + posB.x) / 2 - 18}
                        y={(posA.y + posB.y) / 2 - 9}
                        width="36"
                        height="16"
                        rx="4"
                        fill="#020617"
                        stroke={avgSnr > 5 ? '#10b981' : '#eab308'}
                        strokeWidth="0.8"
                        opacity="0.85"
                      />
                      <text
                        x={(posA.x + posB.x) / 2}
                        y={(posA.y + posB.y) / 2 + 3}
                        fill="#f8fafc"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {avgSnr > 0 ? `+${avgSnr.toFixed(0)}` : avgSnr.toFixed(0)}dB
                      </text>
                    </g>
                  );
                });
              })}

              {/* Line-of-Sight (LOS) Fresnel Zone Vector between Selected Nodes */}
              {losMetrics && (() => {
                const origin = state.nodes[0];
                const target = losMetrics.target;
                if (!origin.position || !target.position) return null;
                const p1 = coordToSvg(origin.position.latitudeI / 1e7, origin.position.longitudeI / 1e7);
                const p2 = coordToSvg(target.position.latitudeI / 1e7, target.position.longitudeI / 1e7);

                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                const angleRad = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                const angleDeg = (angleRad * 180) / Math.PI;
                const distPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);

                return (
                  <g>
                    {/* Fresnel clearance ellipse */}
                    <ellipse
                      cx={midX}
                      cy={midY}
                      rx={distPx / 2}
                      ry={Math.min(30, distPx * 0.14)}
                      transform={`rotate(${angleDeg}, ${midX}, ${midY})`}
                      fill="#06b6d4"
                      fillOpacity="0.08"
                      stroke="#06b6d4"
                      strokeWidth="1.2"
                      strokeDasharray="4 4"
                    />

                    {/* Direct Optical LOS line */}
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="#38bdf8"
                      strokeWidth="2"
                      strokeDasharray="5 5"
                      className="animate-pulse"
                    />
                  </g>
                );
              })()}

              {/* Waypoint Markers */}
              {state.waypoints.map((wp) => {
                const pos = coordToSvg(wp.latitude, wp.longitude);
                const isSelected = selectedWaypoint?.id === wp.id;

                const iconColors = {
                  LZ: '#10b981',
                  RELAY: '#818cf8',
                  MEDICAL: '#f43f5e',
                  HAZARD: '#f59e0b',
                  BASE: '#06b6d4',
                  FLAG: '#ec4899',
                };

                const color = iconColors[wp.icon] || '#818cf8';

                return (
                  <g
                    key={wp.id}
                    className="cursor-pointer transition-transform hover:scale-110"
                    onClick={() => {
                      tactileAudio.playClick();
                      setSelectedWaypoint(wp);
                      setSelectedNode(null);
                    }}
                  >
                    <circle cx={pos.x} cy={pos.y} r="14" fill={color} fillOpacity="0.2" />
                    <circle cx={pos.x} cy={pos.y} r="6" fill={color} stroke="#ffffff" strokeWidth="1.5" />
                    <text
                      x={pos.x}
                      y={pos.y - 12}
                      fill="#f8fafc"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {wp.name}
                    </text>
                  </g>
                );
              })}

              {/* Node Markers */}
              {state.nodes.map((node) => {
                if (!node.position) return null;
                const pos = coordToSvg(node.position.latitudeI / 1e7, node.position.longitudeI / 1e7);
                const isLocal = node.num === state.myNodeNum;
                const isSelected = selectedNode?.num === node.num;

                // Color by role
                const roleColors: Record<string, string> = {
                  ROUTER: '#818cf8',
                  ROUTER_CLIENT: '#06b6d4',
                  REPEATER: '#38bdf8',
                  TRACKER: '#10b981',
                  SENSOR: '#f59e0b',
                  TAK: '#f43f5e',
                  CLIENT_MUTE: '#94a3b8',
                };
                const nodeColor = isLocal ? '#a855f7' : roleColors[node.role || 'ROUTER_CLIENT'] || '#818cf8';

                return (
                  <g
                    key={`node-pin-${node.num}`}
                    className="cursor-pointer transition-transform hover:scale-110"
                    onClick={() => {
                      tactileAudio.playClick();
                      setSelectedNode(node);
                      setSelectedWaypoint(null);
                    }}
                  >
                    {/* Pulsing signal halo */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={isSelected ? '24' : '18'}
                      fill={nodeColor}
                      fillOpacity={isSelected ? '0.35' : '0.15'}
                      className={isSelected ? 'animate-ping' : ''}
                    />

                    {/* Outer ring */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={isSelected ? '12' : '9'}
                      fill="#020617"
                      stroke={nodeColor}
                      strokeWidth={isSelected ? '2.5' : '1.8'}
                    />

                    {/* Center Core dot */}
                    <circle cx={pos.x} cy={pos.y} r="3.5" fill={nodeColor} />

                    {/* Node Callout Label */}
                    <rect
                      x={pos.x - 35}
                      y={pos.y + 12}
                      width="70"
                      height="16"
                      rx="4"
                      fill="#020617"
                      stroke="#334155"
                      strokeWidth="0.8"
                      opacity="0.9"
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 24}
                      fill="#f1f5f9"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {node.user.shortName}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Bottom Legend Overlay */}
            <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-300">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span>Router</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span>Client</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span>Tracker</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span>Local GCS</span>
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <span>Links: <strong className="text-emerald-400">&gt;+7dB</strong> / <strong className="text-amber-400">2..7dB</strong> / <strong className="text-red-400">&lt;2dB</strong></span>
                <span>Active Nodes: <strong className="text-white">{state.nodes.length}</strong></span>
              </div>
            </div>
          </div>

          {/* Active Traceroute Diagnostic Bar */}
          {state.activeTraceroute && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-indigo-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Route className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Mesh Traceroute Result: {state.activeTraceroute.targetNodeName}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      state.activeTraceroute.routeStatus === 'OPTIMAL'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {state.activeTraceroute.routeStatus}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                  <span>RTT: <strong className="text-white">{state.activeTraceroute.roundTripTimeMs} ms</strong></span>
                  <span>Total Hops: <strong className="text-indigo-400">{state.activeTraceroute.totalHops}</strong></span>
                  <button
                    onClick={() => meshtasticBleService.clearTraceroute()}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Hop Sequence Timeline */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] font-mono">
                <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-800/80 shrink-0">
                  <div className="text-slate-400 text-[9px]">ORIGIN</div>
                  <div className="font-bold text-white">{state.activeTraceroute.originNodeName}</div>
                </div>

                {state.activeTraceroute.hops.map((hop, idx) => (
                  <React.Fragment key={`hop-${hop.nodeNum}`}>
                    <div className="text-slate-600 font-bold">→</div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 shrink-0">
                      <div className="text-indigo-400 text-[9px] flex items-center justify-between">
                        <span>HOP {hop.hopNumber}</span>
                        <span className="text-emerald-400">+{hop.snrTowardsTarget}dB</span>
                      </div>
                      <div className="font-bold text-slate-200">{hop.nodeName}</div>
                      <div className="text-[9px] text-slate-500">{hop.latencyMs}ms delay</div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Node Inspector & Line of Sight Calculator */}
        <div className="lg:col-span-4 space-y-4">
          {/* Selected Node or Local Radio Telemetry Card */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold uppercase text-white tracking-wider">
                  {selectedNode ? selectedNode.user.longName : 'Local Radio GCS'}
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                {selectedNode ? selectedNode.user.id : `!${state.myNodeNum.toString(16)}`}
              </span>
            </div>

            {/* Coordinate & Altitude readout */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Latitude</span>
                <span className="text-white font-bold">
                  {selectedNode?.position
                    ? (selectedNode.position.latitudeI / 1e7).toFixed(5)
                    : (state.nodes[0]?.position ? (state.nodes[0].position.latitudeI / 1e7).toFixed(5) : '37.77490')}°N
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Longitude</span>
                <span className="text-white font-bold">
                  {selectedNode?.position
                    ? (selectedNode.position.longitudeI / 1e7).toFixed(5)
                    : (state.nodes[0]?.position ? (state.nodes[0].position.longitudeI / 1e7).toFixed(5) : '-122.41940')}°W
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Altitude MSL</span>
                <span className="text-emerald-400 font-bold">
                  {selectedNode?.position?.altitude || 48} meters
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">GPS Sats Locked</span>
                <span className="text-cyan-400 font-bold">
                  {selectedNode?.position?.satsInView || 12} Sats
                </span>
              </div>
            </div>

            {/* Signal & Hardware Stats */}
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">SNR Link Margin:</span>
                <strong className="text-emerald-400 font-mono">
                  {selectedNode ? (selectedNode.snr > 0 ? `+${selectedNode.snr}` : selectedNode.snr) : '+10.2'} dB
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Receive RSSI:</span>
                <strong className="text-slate-200 font-mono">{selectedNode?.rssi || -65} dBm</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Battery Level:</span>
                <strong className="text-purple-400 font-mono">
                  {selectedNode?.batteryLevel || state.deviceBattery}% ({selectedNode?.voltage || state.deviceVoltage}V)
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Hardware Model:</span>
                <span className="text-white font-mono text-[11px]">
                  {selectedNode?.user.hwModel.replace('_', ' ') || 'T-Beam ESP32'}
                </span>
              </div>
            </div>

            {/* Node Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                disabled={isTracing || !selectedNode || selectedNode.num === state.myNodeNum}
                onClick={() => selectedNode && handleRunTraceroute(selectedNode)}
                className="py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-indigo-600/30"
              >
                <Route className="w-3.5 h-3.5" />
                <span>{isTracing ? 'Tracing...' : 'Run Traceroute'}</span>
              </button>

              <button
                onClick={() => {
                  if (selectedNode && onSelectNodeForChat) {
                    onSelectNodeForChat(selectedNode);
                  }
                }}
                className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-slate-700"
              >
                <Send className="w-3.5 h-3.5 text-cyan-400" />
                <span>Direct Message</span>
              </button>
            </div>
          </div>

          {/* Line-of-Sight (LOS) & 1st Fresnel Clearance Box */}
          {losMetrics && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Mountain className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold uppercase text-white tracking-wider">
                    RF Propagation &amp; LOS Clearance
                  </span>
                </div>
                <span className="text-[10px] font-mono text-cyan-300">
                  {losMetrics.distKm.toFixed(2)} km
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Azimuth Bearing:</span>
                  <span className="font-mono text-white font-bold">{losMetrics.bearingDeg.toFixed(1)}° True</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Distance:</span>
                  <span className="font-mono text-white font-bold">{losMetrics.distMiles.toFixed(2)} miles</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">1st Fresnel Radius (F₁):</span>
                  <span className="font-mono text-cyan-400 font-bold">{losMetrics.fresnelRadiusMeters.toFixed(1)} m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">60% Clearance Radius:</span>
                  <span className="font-mono text-emerald-400 font-bold">{losMetrics.clearance60PctMeters.toFixed(1)} m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Free-Space Path Loss:</span>
                  <span className="font-mono text-amber-400 font-bold">{losMetrics.fsplDb.toFixed(1)} dB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Elevation Δ:</span>
                  <span className="font-mono text-white font-bold">
                    {losMetrics.elevationDiff > 0 ? `+${losMetrics.elevationDiff}` : losMetrics.elevationDiff} m
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                  <span className="text-slate-400">Link Status:</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      losMetrics.linkStatus === 'LINE_OF_SIGHT_CLEAR'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {losMetrics.linkStatus.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Active Tactical Waypoints List */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-white tracking-wider flex items-center gap-2">
                <Flag className="w-3.5 h-3.5 text-pink-400" />
                <span>Tactical Waypoints ({state.waypoints.length})</span>
              </span>
              <button
                onClick={() => setShowWaypointForm(true)}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
              >
                + New Waypoint
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {state.waypoints.map((wp) => (
                <div
                  key={wp.id}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span className="text-[10px] px-1 py-0.2 rounded bg-indigo-950 text-indigo-300 font-mono">
                        {wp.icon}
                      </span>
                      <span>{wp.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {wp.latitude.toFixed(4)}°N, {wp.longitude.toFixed(4)}°W ({wp.altitudeMeters}m)
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      meshtasticBleService.deleteTacticalWaypoint(wp.id);
                      meshCloudSyncService.deleteWaypoint(wp.id).catch(() => {});
                    }}
                    className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400 cursor-pointer"
                    title="Delete Waypoint"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Drop Tactical Waypoint Form */}
      {showWaypointForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Broadcast Tactical Waypoint
                </h3>
              </div>
              <button
                onClick={() => setShowWaypointForm(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWaypoint} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Waypoint Name / Designation</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LZ Alpha Victor"
                  value={wpName}
                  onChange={(e) => setWpName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Description / Tactical Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Cleared landing zone, 360 security perimeter"
                  value={wpDesc}
                  onChange={(e) => setWpDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={wpLat}
                    onChange={(e) => setWpLat(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={wpLon}
                    onChange={(e) => setWpLon(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Alt (m MSL)</label>
                  <input
                    type="number"
                    required
                    value={wpAlt}
                    onChange={(e) => setWpAlt(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Waypoint Icon / Designation</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['LZ', 'RELAY', 'MEDICAL', 'HAZARD', 'BASE', 'FLAG'] as MeshtasticWaypoint['icon'][]).map(
                    (iconType) => (
                      <button
                        type="button"
                        key={iconType}
                        onClick={() => setWpIcon(iconType)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          wpIcon === iconType
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {iconType}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowWaypointForm(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Broadcast Waypoint</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
