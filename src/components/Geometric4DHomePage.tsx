import React, { useRef, useEffect, useState, useMemo } from 'react';
import { 
  Castle, 
  Radio, 
  Cpu, 
  FileText, 
  CloudSun, 
  ShieldAlert, 
  Layers, 
  RotateCw, 
  Maximize2, 
  Sliders, 
  Sparkles, 
  Zap, 
  Compass, 
  Activity, 
  Terminal, 
  ChevronRight,
  Sun,
  Lock,
  Boxes,
  Plane,
  Bug,
  X,
  ZoomIn,
  ZoomOut,
  Eye,
  Bot,
  Antenna,
  Radar,
  Network
} from 'lucide-react';
import { weatherManager } from '../services/weatherManager';
import { deviceManager } from '../services/deviceManager';
import { systemLogManager } from '../services/systemLogManager';
import { GeminiHomePageChatWindow } from './GeminiHomePageChatWindow';

interface Geometric4DHomePageProps {
  onNavigateTab: (tab: any) => void;
  onOpenCitadel: () => void;
  onOpenDeviceModal: () => void;
  onNotify?: (msg: string) => void;
}

type GeometryShape = 'hex_duoprism' | 'hex_hyperprism' | 'hex_lattice';
type ColorTheme = 'cyan' | 'gold' | 'emerald' | 'amethyst';

export const Geometric4DHomePage: React.FC<Geometric4DHomePageProps> = ({
  onNavigateTab,
  onOpenCitadel,
  onOpenDeviceModal,
  onNotify
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 4D Rotation parameters & controls
  const [shape, setShape] = useState<GeometryShape>('hex_duoprism');
  const [theme, setTheme] = useState<ColorTheme>('cyan');
  const [rotSpeedXY, setRotSpeedXY] = useState(0.008);
  const [rotSpeedZW, setRotSpeedZW] = useState(0.012);
  const [rotSpeedXW, setRotSpeedXW] = useState(0.006); // 4D hyper-rotation
  const [barThickness, setBarThickness] = useState(4);
  const [wSliceOffset, setWSliceOffset] = useState(0.0); // W-dimension slicing
  const [isRotating, setIsRotating] = useState(true);
  const [cameraDistance, setCameraDistance] = useState(4.2); // Zoomed out for 100% full view
  const [showTuningOverlay, setShowTuningOverlay] = useState(false); // Toggle controls box with X button

  // Mouse interaction state
  const mouseState = useRef({
    isDragging: false,
    lastX: 0,
    lastY: 0,
    rotX: 0.35,
    rotY: 0.45
  });

  // Rotation angles in 4D space
  const anglesRef = useRef({
    xy: 0,
    zw: 0,
    xw: 0,
    yw: 0
  });

  // Live telemetry summary for quick launch cards
  const weather = weatherManager.getWeather();
  const devices = deviceManager.getDevices();
  const connectedDevicesCount = devices.filter(d => d.status === 'CONNECTED').length;

  // -------------------------------------------------------------------
  // 4D Geometry Generation for Hexagonal Bar / Border Entities
  // -------------------------------------------------------------------
  const geometryData = useMemo(() => {
    // A 4D point has (x, y, z, w)
    interface Point4D {
      x: number;
      y: number;
      z: number;
      w: number;
    }
    interface Edge4D {
      u: number;
      v: number;
      type: 'hex_ring' | 'axial_bar' | 'hyper_brace';
    }

    const vertices: Point4D[] = [];
    const edges: Edge4D[] = [];

    const hexCorners = 6;
    const r = 1.0;

    if (shape === 'hex_duoprism') {
      // 4D Hexagonal Duoprism: Hexagon in (X,Y) cross Hexagon in (Z,W)
      // 36 vertices: (cos(a), sin(a), cos(b), sin(b))
      for (let i = 0; i < hexCorners; i++) {
        const theta1 = (i * 2 * Math.PI) / hexCorners;
        const x = r * Math.cos(theta1);
        const y = r * Math.sin(theta1);

        for (let j = 0; j < hexCorners; j++) {
          const theta2 = (j * 2 * Math.PI) / hexCorners;
          const z = r * Math.cos(theta2);
          const w = r * Math.sin(theta2);

          vertices.push({ x, y, z, w });
        }
      }

      // Edges: along first hexagon ring and second hexagon ring
      for (let i = 0; i < hexCorners; i++) {
        for (let j = 0; j < hexCorners; j++) {
          const u = i * hexCorners + j;
          // Connect to next in first ring
          const nextI = ((i + 1) % hexCorners) * hexCorners + j;
          edges.push({ u, v: nextI, type: 'hex_ring' });

          // Connect to next in second ring
          const nextJ = i * hexCorners + ((j + 1) % hexCorners);
          edges.push({ u, v: nextJ, type: 'axial_bar' });
        }
      }
    } else if (shape === 'hex_hyperprism') {
      // 4D Hexagonal Hyperprism: Hexagon extruded into Z and then W
      // 24 vertices: Hexagon in (X,Y) at z in {-0.8, 0.8}, w in {-0.8, 0.8}
      const zVals = [-0.8, 0.8];
      const wVals = [-0.8, 0.8];

      for (const w of wVals) {
        for (const z of zVals) {
          for (let i = 0; i < hexCorners; i++) {
            const theta = (i * 2 * Math.PI) / hexCorners;
            vertices.push({
              x: r * Math.cos(theta),
              y: r * Math.sin(theta),
              z,
              w
            });
          }
        }
      }

      // Connect hexagonal rings
      // 4 rings total (each has 6 vertices)
      for (let ring = 0; ring < 4; ring++) {
        const base = ring * 6;
        for (let i = 0; i < 6; i++) {
          edges.push({ u: base + i, v: base + ((i + 1) % 6), type: 'hex_ring' });
        }
      }

      // Connect along Z (ring 0 to 1, ring 2 to 3)
      for (let i = 0; i < 6; i++) {
        edges.push({ u: 0 + i, v: 6 + i, type: 'axial_bar' });
        edges.push({ u: 12 + i, v: 18 + i, type: 'axial_bar' });
      }

      // Connect along W (ring 0 to 2, ring 1 to 3)
      for (let i = 0; i < 6; i++) {
        edges.push({ u: 0 + i, v: 12 + i, type: 'hyper_brace' });
        edges.push({ u: 6 + i, v: 18 + i, type: 'hyper_brace' });
      }
    } else {
      // Hexagonal Lattice: Nested inner & outer hexagonal bars with hyper-diagonal borders
      const radii = [0.6, 1.2];
      const wLevels = [-0.7, 0, 0.7];

      for (const w of wLevels) {
        for (const radius of radii) {
          for (let i = 0; i < hexCorners; i++) {
            const theta = (i * 2 * Math.PI) / hexCorners;
            vertices.push({
              x: radius * Math.cos(theta),
              y: radius * Math.sin(theta),
              z: (radius === 0.6 ? -0.5 : 0.5) * (w === 0 ? 0.9 : 0.4),
              w
            });
          }
        }
      }

      // Connect rings
      const totalRings = wLevels.length * radii.length;
      for (let rIdx = 0; rIdx < totalRings; rIdx++) {
        const base = rIdx * 6;
        for (let i = 0; i < 6; i++) {
          edges.push({ u: base + i, v: base + ((i + 1) % 6), type: 'hex_ring' });
        }
      }

      // Radial bars between inner and outer hex
      for (let wIdx = 0; wIdx < wLevels.length; wIdx++) {
        const innerBase = wIdx * 12;
        const outerBase = innerBase + 6;
        for (let i = 0; i < 6; i++) {
          edges.push({ u: innerBase + i, v: outerBase + i, type: 'axial_bar' });
        }
      }
    }

    return { vertices, edges };
  }, [shape]);

  // -------------------------------------------------------------------
  // 4D Rotation and Rendering Engine on HTML5 Canvas
  // -------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      // Resize canvas to container
      const width = canvas.parentElement?.clientWidth || 800;
      const height = canvas.parentElement?.clientHeight || 540;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      // Clear with dark atmospheric gradient
      ctx.fillStyle = '#030712'; // Tailwind slate-950
      ctx.fillRect(0, 0, width, height);

      // Draw subtle background cyber-grid
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Update 4D rotation angles if active
      if (isRotating) {
        anglesRef.current.xy += rotSpeedXY;
        anglesRef.current.zw += rotSpeedZW;
        anglesRef.current.xw += rotSpeedXW;
        anglesRef.current.yw += rotSpeedXW * 0.7;
      }

      const { xy, zw, xw, yw } = anglesRef.current;
      const { rotX, rotY } = mouseState.current;

      // Color pallette by theme
      let primaryColor = '#22d3ee'; // cyan-400
      let borderGlowColor = 'rgba(34, 211, 238, 0.85)';
      let barFillColor = 'rgba(6, 182, 212, 0.25)';
      let nodeColor = '#a5f3fc';

      if (theme === 'gold') {
        primaryColor = '#f59e0b'; // amber-500
        borderGlowColor = 'rgba(245, 158, 11, 0.85)';
        barFillColor = 'rgba(217, 119, 6, 0.25)';
        nodeColor = '#fef3c7';
      } else if (theme === 'emerald') {
        primaryColor = '#10b981'; // emerald-500
        borderGlowColor = 'rgba(16, 185, 129, 0.85)';
        barFillColor = 'rgba(5, 150, 105, 0.25)';
        nodeColor = '#d1fae5';
      } else if (theme === 'amethyst') {
        primaryColor = '#a855f7'; // purple-500
        borderGlowColor = 'rgba(168, 85, 247, 0.85)';
        barFillColor = 'rgba(147, 51, 234, 0.25)';
        nodeColor = '#f3e8ff';
      }

      // 4D Transformation Function
      const project4D = (p: { x: number; y: number; z: number; w: number }) => {
        let { x, y, z, w } = p;
        w += wSliceOffset; // W-axis slice adjustment

        // 1. Rotate in XY plane
        const cosXY = Math.cos(xy);
        const sinXY = Math.sin(xy);
        const x1 = x * cosXY - y * sinXY;
        const y1 = x * sinXY + y * cosXY;

        // 2. Rotate in ZW plane
        const cosZW = Math.cos(zw);
        const sinZW = Math.sin(zw);
        const z1 = z * cosZW - w * sinZW;
        const w1 = z * sinZW + w * cosZW;

        // 3. Rotate in XW hyper-plane (4D inversion!)
        const cosXW = Math.cos(xw);
        const sinXW = Math.sin(xw);
        const x2 = x1 * cosXW - w1 * sinXW;
        const w2 = x1 * sinXW + w1 * cosXW;

        // 4. Rotate in YW hyper-plane
        const cosYW = Math.cos(yw);
        const sinYW = Math.sin(yw);
        const y2 = y1 * cosYW - w2 * sinYW;
        const w3 = y1 * sinYW + w2 * cosYW;

        // 4D to 3D Stereographic / Perspective Projection
        // camera in 4D at distance d4
        const d4 = 3.2;
        const denom4D = Math.max(0.2, d4 - w3);
        const factor4D = d4 / denom4D;
        const x3D = x2 * factor4D;
        const y3D = y2 * factor4D;
        const z3D = z1 * factor4D;

        // Apply 3D mouse orbit rotation
        const cosMy = Math.cos(rotY);
        const sinMy = Math.sin(rotY);
        const x3D_rot = x3D * cosMy + z3D * sinMy;
        const z3D_temp = -x3D * sinMy + z3D * cosMy;

        const cosMx = Math.cos(rotX);
        const sinMx = Math.sin(rotX);
        const y3D_rot = y3D * cosMx - z3D_temp * sinMx;
        const z3D_final = y3D * sinMx + z3D_temp * cosMx;

        // 3D to 2D Screen Projection
        const d3 = cameraDistance;
        const denom3D = Math.max(0.2, d3 + z3D_final);
        const factor3D = d3 / denom3D;
        // Scaled to 0.20 so 4D shape is 100% completely visible and never cut off during rotation
        const scale = Math.min(width, height) * 0.20;

        const screenX = width / 2 + x3D_rot * factor3D * scale;
        const screenY = height / 2 + y3D_rot * factor3D * scale;

        return {
          screenX,
          screenY,
          depth: z3D_final,
          wDepth: w3,
          factor: factor3D
        };
      };

      // Project all vertices
      const projected = geometryData.vertices.map(project4D);

      // Depth sort edges for clean volumetric bar occlusions
      interface RenderEdge {
        u: number;
        v: number;
        depth: number;
        type: string;
      }
      const renderEdges: RenderEdge[] = geometryData.edges.map(e => ({
        u: e.u,
        v: e.v,
        type: e.type,
        depth: (projected[e.u].depth + projected[e.v].depth) / 2
      }));
      renderEdges.sort((a, b) => b.depth - a.depth);

      // Render Hexagonal volumetric Bar/Border Entities
      renderEdges.forEach(edge => {
        const p1 = projected[edge.u];
        const p2 = projected[edge.v];

        const avgDepth = edge.depth;
        // Alpha calculation based on depth
        const alpha = Math.max(0.2, Math.min(0.95, (avgDepth + 2.5) / 5.0));

        const dx = p2.screenX - p1.screenX;
        const dy = p2.screenY - p1.screenY;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) return;

        const nx = -dy / dist;
        const ny = dx / dist;

        const thickness = barThickness * ((p1.factor + p2.factor) / 2);

        // 1. Draw Volumetric Bar Body with Hex/Polygon border
        ctx.beginPath();
        ctx.moveTo(p1.screenX + nx * thickness, p1.screenY + ny * thickness);
        ctx.lineTo(p2.screenX + nx * thickness, p2.screenY + ny * thickness);
        ctx.lineTo(p2.screenX - nx * thickness, p2.screenY - ny * thickness);
        ctx.lineTo(p1.screenX - nx * thickness, p1.screenY - ny * thickness);
        ctx.closePath();

        // Fill with translucent gradient
        ctx.fillStyle = barFillColor;
        ctx.fill();

        // 2. Stroke Glowing Outer Border Entity
        ctx.strokeStyle = borderGlowColor;
        ctx.lineWidth = Math.max(1, thickness * 0.4);
        ctx.stroke();

        // 3. Central bright core laser line
        ctx.beginPath();
        ctx.moveTo(p1.screenX, p1.screenY);
        ctx.lineTo(p2.screenX, p2.screenY);
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });

      // Render Vertex Hexagonal Border Entities (Joints)
      projected.forEach(p => {
        const rNode = Math.max(2.5, 4.5 * p.factor);
        ctx.save();
        ctx.translate(p.screenX, p.screenY);

        // Draw hexagonal border joint
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const hx = rNode * Math.cos(angle);
          const hy = rNode * Math.sin(angle);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();

        ctx.fillStyle = '#030712';
        ctx.fill();
        ctx.strokeStyle = nodeColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
      });

      // Ambient 4D coordinate HUD text on canvas
      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.font = '10px monospace';
      ctx.fillText(`4D HYPER-MANIFOLD: [XY: ${xy.toFixed(2)}, ZW: ${zw.toFixed(2)}, XW: ${xw.toFixed(2)}]`, 16, 24);
      ctx.fillText(`GEOMETRY: ${shape.toUpperCase()} // BARS: ${geometryData.edges.length} // VERTICES: ${geometryData.vertices.length}`, 16, 40);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [shape, theme, rotSpeedXY, rotSpeedZW, rotSpeedXW, barThickness, wSliceOffset, isRotating, cameraDistance, geometryData]);

  // Mouse drag handlers for orbiting
  const handleMouseDown = (e: React.MouseEvent) => {
    mouseState.current.isDragging = true;
    mouseState.current.lastX = e.clientX;
    mouseState.current.lastY = e.clientY;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseState.current.isDragging) return;
    const dx = e.clientX - mouseState.current.lastX;
    const dy = e.clientY - mouseState.current.lastY;
    mouseState.current.rotY += dx * 0.008;
    mouseState.current.rotX += dy * 0.008;
    mouseState.current.lastX = e.clientX;
    mouseState.current.lastY = e.clientY;
  };

  const handleMouseUp = () => {
    mouseState.current.isDragging = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? 0.3 : -0.3;
    setCameraDistance(prev => Math.max(2.5, Math.min(8.0, prev + delta)));
  };

  return (
    <div className="space-y-8 animate-in fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      
      {/* 4D Hero Visualizer & Spatial Console */}
      <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xl">
        
        {/* Top Header overlay */}
        <div className="p-6 pb-2 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-2xl bg-cyan-950 border border-cyan-700/60 text-cyan-400 shadow-inner">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-extrabold text-white tracking-tight">
                  4D Space Geometric Hyper-Hexagonal Manifold
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono font-bold">
                  ℝ⁴ 100% VISIBLE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Interactive real-time 4-dimensional polytope projection featuring physical volumetric hexagonal bars and luminous border entities
              </p>
            </div>
          </div>

          {/* Quick Shape & Theme Selectors */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800">
              <button
                onClick={() => setShape('hex_duoprism')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  shape === 'hex_duoprism'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Duoprism
              </button>
              <button
                onClick={() => setShape('hex_hyperprism')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  shape === 'hex_hyperprism'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Hyperprism
              </button>
              <button
                onClick={() => setShape('hex_lattice')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  shape === 'hex_lattice'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Hex Lattice
              </button>
            </div>

            {/* Theme Selector */}
            <div className="flex items-center space-x-1.5 bg-slate-950 rounded-xl p-1 border border-slate-800">
              <button
                onClick={() => setTheme('cyan')}
                className={`w-5 h-5 rounded-full bg-cyan-400 border-2 transition-transform cursor-pointer ${theme === 'cyan' ? 'border-white scale-110' : 'border-transparent'}`}
                title="Cyan Tactical Theme"
              />
              <button
                onClick={() => setTheme('gold')}
                className={`w-5 h-5 rounded-full bg-amber-400 border-2 transition-transform cursor-pointer ${theme === 'gold' ? 'border-white scale-110' : 'border-transparent'}`}
                title="Citadel Sovereign Gold Theme"
              />
              <button
                onClick={() => setTheme('emerald')}
                className={`w-5 h-5 rounded-full bg-emerald-400 border-2 transition-transform cursor-pointer ${theme === 'emerald' ? 'border-white scale-110' : 'border-transparent'}`}
                title="Emerald Quantum Theme"
              />
              <button
                onClick={() => setTheme('amethyst')}
                className={`w-5 h-5 rounded-full bg-purple-500 border-2 transition-transform cursor-pointer ${theme === 'amethyst' ? 'border-white scale-110' : 'border-transparent'}`}
                title="Amethyst Void Theme"
              />
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800 space-x-1">
              <button
                onClick={() => setCameraDistance(prev => Math.min(8.0, prev + 0.4))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-900 transition-colors cursor-pointer"
                title="Zoom Out (Full 100% View)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCameraDistance(prev => Math.max(2.5, prev - 0.4))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-900 transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Continuous Rotation Toggle */}
            <button
              onClick={() => setIsRotating(!isRotating)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isRotating
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Toggle 4D continuous rotation"
            >
              <RotateCw className={`w-4 h-4 ${isRotating ? 'animate-spin-slow' : ''}`} />
            </button>

            {/* Toggle Tuning Controls Overlay */}
            <button
              onClick={() => setShowTuningOverlay(!showTuningOverlay)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                showTuningOverlay
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title={showTuningOverlay ? 'Hide Tuning Box' : 'Show 4D Tuning Controls'}
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>{showTuningOverlay ? 'Hide Box' : 'Show Tuning Box'}</span>
            </button>
          </div>
        </div>

        {/* 4D Canvas Container */}
        <div 
          className="relative w-full h-[480px] md:h-[520px] cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <canvas ref={canvasRef} className="w-full h-full block" />

          {/* Interactive 4D Tuning Controls Overlay (Collapsible bottom bar with X close button) */}
          {showTuningOverlay ? (
            <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800/90 text-xs font-mono text-slate-300 flex flex-wrap items-center justify-between gap-4 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
              
              {/* 4D Hyper-Rotation Sliders */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500">XY Plane:</span>
                  <input
                    type="range"
                    min="0"
                    max="0.03"
                    step="0.002"
                    value={rotSpeedXY}
                    onChange={e => setRotSpeedXY(parseFloat(e.target.value))}
                    className="w-20 accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-slate-500">ZW Plane:</span>
                  <input
                    type="range"
                    min="0"
                    max="0.03"
                    step="0.002"
                    value={rotSpeedZW}
                    onChange={e => setRotSpeedZW(parseFloat(e.target.value))}
                    className="w-20 accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-cyan-400 font-bold">XW Hyper-Plane:</span>
                  <input
                    type="range"
                    min="0"
                    max="0.03"
                    step="0.002"
                    value={rotSpeedXW}
                    onChange={e => setRotSpeedXW(parseFloat(e.target.value))}
                    className="w-20 accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-amber-400 font-bold">W-Slice Offset:</span>
                  <input
                    type="range"
                    min="-1.0"
                    max="1.0"
                    step="0.05"
                    value={wSliceOffset}
                    onChange={e => setWSliceOffset(parseFloat(e.target.value))}
                    className="w-20 accent-amber-400 cursor-pointer"
                  />
                  <span className="text-slate-400 text-[11px]">{wSliceOffset.toFixed(2)}</span>
                </div>
              </div>

              {/* Bar thickness, Distance, Reset Orbit & Close X button */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500">Bar Border:</span>
                  <input
                    type="range"
                    min="2"
                    max="8"
                    step="1"
                    value={barThickness}
                    onChange={e => setBarThickness(parseInt(e.target.value))}
                    className="w-16 accent-cyan-400 cursor-pointer"
                  />
                  <span className="text-slate-400">{barThickness}px</span>
                </div>

                <button
                  onClick={() => {
                    mouseState.current.rotX = 0.35;
                    mouseState.current.rotY = 0.45;
                    setWSliceOffset(0.0);
                    setCameraDistance(4.2);
                    if (onNotify) onNotify('4D hyper-manifold camera reset to 100% full view.');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Reset Orbit
                </button>

                {/* X button to remove/close the box for a clear view of the 4D shape */}
                <button
                  onClick={() => setShowTuningOverlay(false)}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/80 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                  title="Remove box for unobstructed view of 4D shape"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Floating reopen button when box is dismissed */
            <button
              onClick={() => setShowTuningOverlay(true)}
              className="absolute bottom-4 right-4 px-3.5 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 hover:text-white font-mono text-xs flex items-center gap-2 shadow-xl backdrop-blur-md transition-all cursor-pointer animate-in fade-in"
              title="Open 4D Tuning Controls"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Show 4D Tuning Box</span>
            </button>
          )}
        </div>
      </div>

      {/* Gemini AI Tactical Chat & Multi-Agent Order Dispatch Window */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
            <Bot className="w-4 h-4 text-cyan-400" />
            <span>Gemini Tactical AI & Agent Order Dispatch</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">Query real-time status • Express operational orders to mesh agents</span>
        </div>
        <GeminiHomePageChatWindow 
          onNotify={onNotify}
          onNavigateTab={onNavigateTab}
        />
      </div>

      {/* Mission Launchpad Grid: Direct portals across all subsystems */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>Mission Command Launchpad & Subsystems</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">Select portal to engage tactical operations</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Card 1: The Citadel Sovereign Enclave */}
          <div 
            onClick={onOpenCitadel}
            className="p-6 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 shadow-xl hover:shadow-2xl transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-800 border border-indigo-200">
                  <Castle className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-900 text-white font-mono font-bold text-[10px]">
                  WHITE BG ENCLAVE
                </span>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  The Citadel Sovereign Enclave
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Hardened subterranean vaults, Sovereign Bank with multi-tier institutional Assets, and intelligence reconnaissance
                </p>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-indigo-700">
              <span>Enter Vaults, Bank Assets & Intel</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: C4ISR Tactical War Room & Electronic Jammer */}
          <div 
            onClick={() => onNavigateTab('c4isr')}
            className="p-6 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-800/60 text-cyan-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-mono font-bold text-[10px] border border-cyan-800">
                  DEFCON 1 ACTIVE
                </span>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white group-hover:text-cyan-400 transition-colors">
                  C4ISR War Room & RF Jammer
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  STANAG-5516 Link-16 datalink, airborne directed microwave jamming pod AN/ALQ-99, and threat interceptor matrix
                </p>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-cyan-400">
              <span>Open Tactical Battle Console</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Autonomous Swarm Radar & Active Ping */}
          <div 
            onClick={() => onNavigateTab('radar')}
            className="p-6 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-800/60 text-emerald-400">
                  <Radio className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-mono font-bold text-[10px] border border-emerald-800">
                  DOPPLER 5.8 GHz
                </span>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white group-hover:text-emerald-400 transition-colors">
                  Autonomous Radar & Active Ping
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Multi-target sweeps, 360-degree sector sweeps, and microwave Doppler radar pulse generation with round-trip resolution
                </p>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-emerald-400">
              <span>Launch Doppler Radar Screen</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: Connected / Linked Devices Management */}
          <div 
            onClick={onOpenDeviceModal}
            className="p-6 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-indigo-950 border border-indigo-800/60 text-indigo-400">
                  <Cpu className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 font-mono font-bold text-[10px] border border-indigo-800">
                  {connectedDevicesCount}/{devices.length} LINKED
                </span>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white group-hover:text-indigo-400 transition-colors">
                  Set Devices & Hardware IDs
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Manage connected device IDs, device types, names, hardware MAC pairings, and set devices needed for active operations
                </p>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-indigo-400">
              <span>Configure Mission Devices</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 5: System Telemetry & Cryptographic Audit Logs */}
          <div 
            onClick={() => onNavigateTab('logs')}
            className="p-6 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-amber-950 border border-amber-800/60 text-amber-400">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 font-mono font-bold text-[10px] border border-amber-800">
                  SHA-256 AUDIT
                </span>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white group-hover:text-amber-400 transition-colors">
                  System Event & Audit Logs
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Real-time tamper-evident log stream covering telemetry pulses, device link events, banking ledgers, and 4D state shifts
                </p>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-amber-400">
              <span>Inspect Audit Logs Section</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 6: Weather & Atmospheric Propagation Center */}
          <div 
            onClick={() => onNavigateTab('c4isr')}
            className="p-6 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/50 shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-sky-950 border border-sky-800/60 text-sky-400">
                  <CloudSun className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-950 text-sky-300 font-mono font-bold text-[10px] border border-sky-800">
                  {weather.tempCelsius}°C // {weather.condition}
                </span>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white group-hover:text-sky-400 transition-colors">
                  Atmospheric & RF Weather Center
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {weather.stationName} — Barometer {weather.barometricPressureHpa} hPa, Wind {weather.windSpeedKts} kts, RF Index {weather.tacticalRfIndex}
                </p>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-sky-400">
              <span>Inspect Propagation Matrix</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 7: Autonomous UAV Drone Swarm & Recon */}
          <div 
            onClick={() => onNavigateTab('drones')}
            className="p-6 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-800/60 text-cyan-400">
                  <Plane className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-mono font-bold text-[10px] border border-cyan-800">
                  UAV SWARM AIRFRAME
                </span>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white group-hover:text-cyan-400 transition-colors">
                  Aerial Drone Swarm & Recon
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Airborne reconnaissance squadron, STANAG waypoint routing, battery telemetry, and SIGINT/LiDAR sensor packages
                </p>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-cyan-400">
              <span>Command Drone Swarm</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 8: Auto Debugging & Fault Isolation */}
          <div 
            onClick={() => onNavigateTab('auto_debug')}
            className="p-6 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-amber-950 border border-amber-800/60 text-amber-400">
                  <Bug className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 font-mono font-bold text-[10px] border border-amber-800">
                  AUTO-HEAL ENGINE
                </span>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white group-hover:text-amber-400 transition-colors">
                  Auto Debug, Tracing & Isolation
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Uncaught error interceptors, WebCrypto tag anomaly isolation, call-stack inspection, and automated circuit resets
                </p>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-amber-400">
              <span>Inspect Diagnostics & Traces</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 9: Physical Hardware SDR & LoRa WebSerial Bridge */}
          <div 
            onClick={() => onNavigateTab('sdr_hardware')}
            className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 hover:to-cyan-950/70 border border-slate-800 hover:border-cyan-500/50 shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-700/60 text-cyan-300">
                  <Antenna className="w-6 h-6 animate-pulse" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-mono font-bold text-[10px] border border-cyan-700">
                  WEBSERIAL USB / BLE
                </span>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white group-hover:text-cyan-400 transition-colors">
                  Hardware SDR & LoRa Bridge
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Connect physical USB SDRs, Meshtastic LoRa radios, live FFT spectrum waterfall & STANAG-5516 airwave broadcasting
                </p>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-cyan-400">
              <span>Open Hardware SDR Console</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 10: Electronic Warfare & TDoA Emitter Triangulation */}
          <div 
            onClick={() => onNavigateTab('electronic_warfare')}
            className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/40 hover:to-purple-950/70 border border-slate-800 hover:border-purple-500/50 shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-purple-950 border border-purple-700/60 text-purple-300">
                  <Radar className="w-6 h-6 animate-pulse" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 font-mono font-bold text-[10px] border border-purple-700">
                  TDoA & STANAG FHSS
                </span>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white group-hover:text-purple-400 transition-colors">
                  Electronic Warfare & TDoA
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Hyperbolic time-difference-of-arrival geolocation, RF jamming detection, CEP ellipses & 1,200 hops/s FHSS anti-jamming matrix
                </p>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-purple-400">
              <span>Open SIGINT EW Console</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 11: Dynamic Mesh Self-Healing & Route Rebalancer */}
          <div 
            onClick={() => onNavigateTab('self_healing')}
            className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 hover:to-cyan-950/70 border border-slate-800 hover:border-cyan-500/50 shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-700/60 text-cyan-300">
                  <Network className="w-6 h-6 animate-pulse" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-mono font-bold text-[10px] border border-cyan-700">
                  DIJKSTRA ETX
                </span>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white group-hover:text-cyan-400 transition-colors">
                  Self-Healing Route Healer
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Autonomous Dijkstra/Bellman-Ford shortest-path re-routing, sub-50ms node failover, ETX metric rebalancing & stress injection
                </p>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-cyan-400">
              <span>Open Graph Rebalancer</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 12: Gemini C4ISR Tactical AI Hub */}
          <div 
            onClick={() => onNavigateTab('ai_intel')}
            className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 hover:to-indigo-950/70 border border-slate-800 hover:border-indigo-500/50 shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-indigo-950 border border-indigo-700/60 text-indigo-300">
                  <Bot className="w-6 h-6 animate-pulse" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 font-mono font-bold text-[10px] border border-indigo-700">
                  GEMINI 3.5 & 3.1
                </span>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white group-hover:text-indigo-400 transition-colors">
                  AI Tactical Hub & Voice Intel
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Multi-turn battle chat, live tactical voice dialog, Google Search & Maps GEOINT grounding with Firestore sync
                </p>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-indigo-400">
              <span>Engage AI Tactical Coordinator</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 13: P2P Agent Overlay Network */}
          <div 
            onClick={() => onNavigateTab('agent_overlay')}
            className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 hover:to-emerald-950/70 border border-slate-800 hover:border-emerald-500/50 shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-700/60 text-emerald-300">
                  <Layers className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-mono font-bold text-[10px] border border-emerald-700">
                  OVERLAY SYNC
                </span>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white group-hover:text-emerald-400 transition-colors">
                  Agent Overlay Network
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Virtual peer-to-peer overlay routing, RPC streaming execution, and cross-node CRDT synchronization
                </p>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-emerald-400">
              <span>Open Overlay Fabric</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
