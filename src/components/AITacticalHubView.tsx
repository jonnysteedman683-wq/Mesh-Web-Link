import React, { useState } from 'react';
import { 
  Bot, 
  Mic, 
  Globe, 
  MapPin, 
  Database, 
  Sparkles, 
  ShieldCheck, 
  Cpu, 
  Radio, 
  Layers, 
  Compass, 
  Search, 
  Volume2,
  FileText,
  Clock
} from 'lucide-react';
import { GeminiTacticalChat } from './GeminiTacticalChat';
import { auth } from '../services/firebase';

export const AITacticalHubView: React.FC = () => {
  const [activeSubSection, setActiveSubSection] = useState<'chat' | 'voice_recon' | 'osint_search' | 'geoint_maps' | 'cloud_sync'>('chat');

  return (
    <div className="w-full h-[calc(100vh-130px)] flex flex-col p-3 md:p-5 bg-slate-950 text-slate-100 gap-4 overflow-hidden">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 px-4 py-3 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-600/30 border border-indigo-400/50 flex items-center justify-center text-indigo-300">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-base md:text-lg font-bold tracking-tight text-white">
                GEMINI C4ISR TACTICAL INTELLIGENCE CENTER
              </h2>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded font-mono">
                MULTI-MODEL CORE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Multi-Turn Autonomous Chat • Live Voice Dialogue • Google Search Grounding • Google Maps GEOINT • Firebase Firestore
            </p>
          </div>
        </div>

        {/* Intelligence Mode Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveSubSection('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all ${
              activeSubSection === 'chat'
                ? 'bg-indigo-600 text-white font-semibold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Battle Chat</span>
          </button>
          <button
            onClick={() => setActiveSubSection('osint_search')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all ${
              activeSubSection === 'osint_search'
                ? 'bg-sky-600 text-white font-semibold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Search Grounding</span>
          </button>
          <button
            onClick={() => setActiveSubSection('geoint_maps')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all ${
              activeSubSection === 'geoint_maps'
                ? 'bg-emerald-600 text-white font-semibold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Maps Grounding</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0 overflow-hidden">
        {/* Left 2 Cols: Main Interactive Chat / Voice Hub */}
        <div className="lg:col-span-2 h-full flex flex-col min-h-0 overflow-hidden">
          <GeminiTacticalChat 
            currentDefcon={2}
            activeSector="Sector 7-G (Orbital Grid)"
          />
        </div>

        {/* Right 1 Col: Autonomous Agent Matrix & Grounding Feeds */}
        <div className="flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Active Model Stack Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-200 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" /> GEMINI MODEL MATRIX
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.5 rounded">
                READY
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-purple-500/30 flex items-start justify-between">
                <div>
                  <div className="font-bold text-purple-300">gemini-3.1-pro-preview</div>
                  <div className="text-[11px] text-slate-400">Complex Strategic Analysis & Merkle Proof Audit</div>
                </div>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                  DEEP REASONING
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-indigo-500/30 flex items-start justify-between">
                <div>
                  <div className="font-bold text-indigo-300">gemini-3.5-flash</div>
                  <div className="text-[11px] text-slate-400">General C4ISR + Search & Maps Grounding</div>
                </div>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">
                  GROUNDED
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-emerald-500/30 flex items-start justify-between">
                <div>
                  <div className="font-bold text-emerald-300">gemini-3.1-flash-lite</div>
                  <div className="text-[11px] text-slate-400">Low-Latency Real-Time Voice & Sensor Ingestion</div>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                  HIGH SPEED
                </span>
              </div>
            </div>
          </div>

          {/* Firebase Persistence Status Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-200 flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-400" /> FIRESTORE PERSISTENCE
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.5 rounded">
                CONNECTED
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">User Identity:</span>
                <span className="text-slate-200 font-bold">
                  {auth.currentUser ? (auth.currentUser.displayName || auth.currentUser.uid.slice(0, 8)) : 'Guest Operator'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Collections:</span>
                <span className="text-indigo-400">users, directives, telemetry, chat_sessions</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Security Rules:</span>
                <span className="text-emerald-400">Owner Write + Auth Read Enforced</span>
              </div>
            </div>
          </div>

          {/* Quick Voice & Grounding Instructions */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2 font-mono text-xs text-slate-300">
            <div className="font-bold text-slate-200 flex items-center gap-1.5 mb-1">
              <Sparkles className="w-4 h-4 text-indigo-400" /> TACTICAL AGENT CAPABILITIES
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              • <strong className="text-slate-200">Microphone button:</strong> Speaks directly into the mesh fabric using Web Speech API for voice command processing.
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              • <strong className="text-slate-200">Google Search:</strong> Retrieves verified live geopolitical and spectrum alerts with interactive citations.
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              • <strong className="text-slate-200">Google Maps:</strong> Resolves coordinates, tactical contours, and perimeter drone routes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
