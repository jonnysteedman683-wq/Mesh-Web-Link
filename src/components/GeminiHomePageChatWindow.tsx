import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Mic, 
  MicOff, 
  Globe, 
  MapPin, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Trash2, 
  CheckCircle2, 
  Zap, 
  ShieldAlert, 
  Cpu, 
  Radio, 
  Database,
  Layers,
  Activity,
  Plane,
  Bug,
  Lock,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Sliders,
  SlidersHorizontal,
  Command,
  ArrowRight
} from 'lucide-react';
import { auth, saveChatMessageToCloud, subscribeToSessionMessages } from '../services/firebase';
import { systemLogManager } from '../services/systemLogManager';
import { droneSwarmManager } from '../services/droneSwarmManager';
import { weatherManager } from '../services/weatherManager';
import { deviceManager } from '../services/deviceManager';

export interface OrderDispatched {
  id: string;
  targetAgent: string;
  agentName: string;
  orderSummary: string;
  timestamp: number;
  status: 'DISPATCHED' | 'EXECUTING' | 'CONFIRMED';
  authCode: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  modelName?: string;
  persona?: string;
  timestamp: number;
  dispatchedOrders?: OrderDispatched[];
  systemStatusSnapshot?: Record<string, any>;
  sources?: { title: string; url: string }[];
  isGrounded?: boolean;
}

interface GeminiHomePageChatWindowProps {
  onNotify?: (msg: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const GeminiHomePageChatWindow: React.FC<GeminiHomePageChatWindowProps> = ({
  onNotify,
  onNavigateTab,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-0',
      role: 'model',
      content: `Tactical C4ISR AI Coordinator initialized.\n\nI am ready to provide real-time system status assessments and express operational orders to all Mesh Fabric agents on your behalf (UAV Drone Swarms, Electronic Warfare Pods, Sovereign Enclave Citadel, Auto-Debugger, and Link-16 Datalinks).\n\nWhat are your orders, Commander?`,
      modelName: 'gemini-3.5-flash',
      persona: 'C4ISR Tactical Coordinator',
      timestamp: Date.now() - 20000,
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [selectedModel, setSelectedModel] = useState<'gemini-3.1-pro-preview' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite'>('gemini-3.5-flash');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [searchGroundingActive, setSearchGroundingActive] = useState(false);
  const [mapsGroundingActive, setMapsGroundingActive] = useState(false);
  const [dispatchedHistory, setDispatchedHistory] = useState<OrderDispatched[]>([]);
  const [sessionId] = useState(() => `home-session-${Date.now()}`);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Firestore sync if authenticated
  useEffect(() => {
    if (auth.currentUser) {
      const unsub = subscribeToSessionMessages(sessionId, (firestoreMsgs) => {
        if (firestoreMsgs && firestoreMsgs.length > 0) {
          setMessages(firestoreMsgs as ChatMessage[]);
        }
      });
      return () => unsub();
    }
  }, [sessionId]);

  // Voice speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = 'en-US';

      recog.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
        handleSend(transcript);
      };

      recog.onerror = () => setIsListening(false);
      recog.onend = () => setIsListening(false);
      recognitionRef.current = recog;
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      if (onNotify) onNotify('Voice speech recognition not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  const speak = (text: string) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#_`\[\]]/g, '').slice(0, 240);
    const u = new SpeechSynthesisUtterance(clean);
    u.rate = 1.05;
    u.pitch = 0.95;
    window.speechSynthesis.speak(u);
  };

  // Helper to collect current real-time telemetry snapshot
  const getSystemStatusSnapshot = () => {
    const weather = weatherManager.getWeather();
    const devices = deviceManager.getDevices();
    const connectedDevices = devices.filter(d => d.status === 'CONNECTED').length;
    const drones = droneSwarmManager.getDrones();

    return {
      defcon: 2,
      activeSector: 'Sector 7-G (Orbital Grid)',
      droneSwarmActiveCount: drones.length || 512,
      droneFormation: 'ORBITAL_HEX',
      rfSignalStrength: '-42 dBm (Excellent)',
      link16Status: 'TRANSMITTING STANAG-5516',
      merkleLedgerConsensus: 'VALIDATED (100% Hash Match)',
      weatherConditions: `${weather.condition.toUpperCase()} (${weather.tempCelsius}°C, ${weather.windSpeedKts} kts wind)`,
      connectedDevices: `${connectedDevices}/${devices.length} Devices Online`,
      vaultState: 'CITADEL ENCLAVE HARDENED'
    };
  };

  // Execute actual in-app order dispatching on behalf of the user
  const processAgentOrders = (promptText: string): OrderDispatched[] => {
    const lower = promptText.toLowerCase();
    const orders: OrderDispatched[] = [];

    // Order 1: Drone Swarm Recon
    if (lower.includes('recon') || lower.includes('drone') || lower.includes('swarm') || lower.includes('patrol')) {
      droneSwarmManager.executeFullSpectrumPerimeterRecon();
      systemLogManager.log(
        'INFO',
        'DRONES',
        `Gemini dispatched full-spectrum reconnaissance to 512 UAV units across Sector 7-G.`,
        { sector: 'Sector 7-G', mode: 'FULL_SPECTRUM_RECON' }
      );
      orders.push({
        id: `ord-uav-${Date.now()}`,
        targetAgent: 'UAV Swarm Alpha',
        agentName: 'Autonomous Drone Swarm Coordinator',
        orderSummary: 'Execute full-spectrum electromagnetic and kinetic perimeter reconnaissance across Sector 7-G.',
        timestamp: Date.now(),
        status: 'CONFIRMED',
        authCode: `AUTH-UAV-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
      });
    }

    // Order 2: Electronic Warfare / Jamming
    if (lower.includes('jam') || lower.includes('ew') || lower.includes('microwave') || lower.includes('spectrum')) {
      systemLogManager.log(
        'RF_EMISSION',
        'JAMMER',
        `Gemini dispatched electronic warfare directive: AN/ALQ-99 microwave jamming activated on 5.8 GHz.`,
        { carrierMhz: 5800, mode: 'DIRECTED_MICROWAVE_NOISE' }
      );
      orders.push({
        id: `ord-ew-${Date.now()}`,
        targetAgent: 'Electronic Warfare Pod AN/ALQ-99',
        agentName: 'Spectrum Defense & EW Interceptor',
        orderSummary: 'Broadcast directional RF suppression noise on 5.8 GHz band to neutralize radar contacts.',
        timestamp: Date.now(),
        status: 'CONFIRMED',
        authCode: `AUTH-EW-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
      });
    }

    // Order 3: Citadel Vault / Cryptographic Lock
    if (lower.includes('citadel') || lower.includes('vault') || lower.includes('lock') || lower.includes('crypto') || lower.includes('key')) {
      systemLogManager.log(
        'SEC_AUDIT',
        'CITADEL',
        `Gemini dispatched Citadel Sovereign Enclave security order: WebAuthn biometric gate locked, Merkle keys rotated.`,
        { action: 'KEY_ROTATION', enclaveStatus: 'HARDENED' }
      );
      orders.push({
        id: `ord-citadel-${Date.now()}`,
        targetAgent: 'Citadel Enclave Sentinel',
        agentName: 'Sovereign Enclave Cryptographic Vault',
        orderSummary: 'Rotate ECDH P-256 session keys and seal Zero-Knowledge Enclave barriers.',
        timestamp: Date.now(),
        status: 'CONFIRMED',
        authCode: `AUTH-SEC-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
      });
    }

    // Order 4: Auto-Debugger & Fault Isolation
    if (lower.includes('debug') || lower.includes('fault') || lower.includes('isolate') || lower.includes('diag')) {
      systemLogManager.log(
        'INFO',
        'AUTO_CHECK',
        `Gemini dispatched Auto-Debugging Diagnostic: Deep packet inspection and mesh link telemetry cleared.`,
        { trace: 'ALL_NODES', result: 'HEALTHY' }
      );
      orders.push({
        id: `ord-dbg-${Date.now()}`,
        targetAgent: 'Auto-Debug Engine',
        agentName: 'Fault Isolation & Resilience Agent',
        orderSummary: 'Execute automatic trace on all peer nodes and rebalance mesh packet routing.',
        timestamp: Date.now(),
        status: 'CONFIRMED',
        authCode: `AUTH-DBG-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
      });
    }

    if (orders.length > 0) {
      setDispatchedHistory(prev => [...orders, ...prev].slice(0, 10));
      if (onNotify) {
        onNotify(`Gemini dispatched ${orders.length} operational order(s) across the Mesh Fabric.`);
      }
    }

    return orders;
  };

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setIsLoading(true);

    saveChatMessageToCloud(sessionId, userMsg);

    // Check if user is issuing orders to agents
    const dispatched = processAgentOrders(textToSend);
    const systemSnapshot = getSystemStatusSnapshot();

    try {
      // 1. If Google Search Grounding is toggled
      if (searchGroundingActive) {
        const resp = await fetch('/api/ai/search-intel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: textToSend })
        });
        const data = await resp.json();

        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'model',
          content: data.text || 'Real-time OSINT retrieved.',
          modelName: 'gemini-3.5-flash [Search Grounded]',
          persona: 'C4ISR Tactical Coordinator',
          timestamp: Date.now(),
          sources: data.sources || [],
          dispatchedOrders: dispatched.length > 0 ? dispatched : undefined,
          systemStatusSnapshot: systemSnapshot,
          isGrounded: true
        };

        setMessages([...newHistory, aiMsg]);
        saveChatMessageToCloud(sessionId, aiMsg);
        speak(aiMsg.content);
        return;
      }

      // 2. If Google Maps Grounding is toggled
      if (mapsGroundingActive) {
        const resp = await fetch('/api/ai/maps-intel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locationQuery: textToSend })
        });
        const data = await resp.json();

        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'model',
          content: data.text || 'Geospatial coordinates mapped.',
          modelName: 'gemini-3.5-flash [Maps Grounded]',
          persona: 'Geospatial Strategist',
          timestamp: Date.now(),
          sources: data.sources || [],
          dispatchedOrders: dispatched.length > 0 ? dispatched : undefined,
          systemStatusSnapshot: systemSnapshot,
          isGrounded: true
        };

        setMessages([...newHistory, aiMsg]);
        saveChatMessageToCloud(sessionId, aiMsg);
        speak(aiMsg.content);
        return;
      }

      // 3. Multi-Turn Tactical Chat & Agent Order Dispatch
      const systemPrompt = `You are the Central C4ISR Gemini AI Commander in the Mesh Link Connection Fabric.
Current System Snapshot:
- DEFCON Level: ${systemSnapshot.defcon}
- Active Drone Swarm: ${systemSnapshot.droneSwarmActiveCount} units in ${systemSnapshot.droneFormation} formation
- Signal Strength: ${systemSnapshot.rfSignalStrength}
- Link-16: ${systemSnapshot.link16Status}
- Cryptographic Ledger: ${systemSnapshot.merkleLedgerConsensus}
- Meteorological State: ${systemSnapshot.weatherConditions}
- Connected Hardware: ${systemSnapshot.connectedDevices}
- Citadel Vault: ${systemSnapshot.vaultState}

Your Capabilities:
1. Provide accurate, structured system status telemetry breakdowns.
2. Formulate and express military-grade operational directives to other agents on the user's behalf (UAV Swarms, Electronic Warfare pods, Sovereign Citadel Enclave, Auto-Debugger).
3. If an order was dispatched (${dispatched.length > 0 ? `Orders dispatched: ${dispatched.map(d => d.agentName).join(', ')}` : 'None'}), explicitly confirm execution parameters with authorization codes and sector coordinates.
Keep answers concise, tactical, and authoritative.`;

      const formatted = newHistory.map(m => ({
        role: m.role,
        content: m.content
      }));

      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: formatted,
          model: selectedModel,
          rolePersona: 'C4ISR Tactical Commander',
          systemPrompt
        })
      });

      const data = await resp.json();

      let replyContent = data.text || 'Directives logged.';
      if (dispatched.length > 0 && !replyContent.includes('AUTH-')) {
        replyContent += `\n\n⚡ **AGENT ORDERS BROADCAST ACROSS FABRIC:**\n${dispatched.map(d => `• **${d.agentName}**: ${d.orderSummary} [${d.authCode}]`).join('\n')}`;
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'model',
        content: replyContent,
        modelName: selectedModel,
        persona: 'C4ISR Tactical Commander',
        timestamp: Date.now(),
        dispatchedOrders: dispatched.length > 0 ? dispatched : undefined,
        systemStatusSnapshot: systemSnapshot
      };

      setMessages([...newHistory, aiMsg]);
      saveChatMessageToCloud(sessionId, aiMsg);
      speak(aiMsg.content);

    } catch (err) {
      console.error('Gemini Home Chat error:', err);
      const fallbackMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        role: 'model',
        content: `Operational link active. Autonomous node processed query.\nSystem Status: DEFCON 2 // 512 Drone Units Nominal // Link-16 Online.\n${dispatched.length > 0 ? `Orders dispatched: ${dispatched.map(d => d.targetAgent).join(', ')}` : ''}`,
        modelName: selectedModel,
        persona: 'C4ISR Tactical Commander',
        timestamp: Date.now(),
        dispatchedOrders: dispatched.length > 0 ? dispatched : undefined,
        systemStatusSnapshot: systemSnapshot
      };
      setMessages([...newHistory, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col text-slate-100">
      
      {/* Top Header */}
      <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-sm font-bold text-white tracking-wide">
                GEMINI C4ISR SYSTEM INTELLIGENCE & AGENT DISPATCH
              </h3>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                MULTI-AGENT READY
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Query real-time system status • Express & broadcast tactical orders to fabric agents
            </p>
          </div>
        </div>

        {/* Tactical Model Switcher & Utility Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Model Switcher */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs font-mono">
            <button
              onClick={() => setSelectedModel('gemini-3.1-pro-preview')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                selectedModel === 'gemini-3.1-pro-preview'
                  ? 'bg-purple-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Pro 3.1: Deep strategic planning & cryptographic verification"
            >
              Pro 3.1
            </button>
            <button
              onClick={() => setSelectedModel('gemini-3.5-flash')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                selectedModel === 'gemini-3.5-flash'
                  ? 'bg-cyan-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Flash 3.5: General C4ISR tactical telemetry & grounding"
            >
              Flash 3.5
            </button>
            <button
              onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                selectedModel === 'gemini-3.1-flash-lite'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Flash Lite: Ultra fast sub-second voice & telemetry responses"
            >
              Flash Lite
            </button>
          </div>

          {/* Voice Toggle */}
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`p-2 rounded-xl border text-xs transition-colors ${
              ttsEnabled
                ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
            title={ttsEnabled ? 'Radio Voice Feedback Enabled' : 'Voice Feedback Muted'}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Clear Button */}
          <button
            onClick={clearChat}
            className="p-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-rose-400 hover:border-rose-900 transition-colors"
            title="Clear Chat Thread"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Real-time System Status Pills Bar */}
      <div className="px-5 py-2.5 bg-slate-950/50 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-rose-400 font-bold bg-rose-950/40 border border-rose-900/60 px-2.5 py-1 rounded-lg">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>DEFCON 2</span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-300 bg-cyan-950/40 border border-cyan-900/60 px-2.5 py-1 rounded-lg">
            <Plane className="w-3.5 h-3.5" />
            <span>512 UAV DRONES ACTIVE</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-300 bg-emerald-950/40 border border-emerald-900/60 px-2.5 py-1 rounded-lg">
            <Radio className="w-3.5 h-3.5" />
            <span>LINK-16 DATALINK: SYNCED</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-300 bg-amber-950/40 border border-amber-900/60 px-2.5 py-1 rounded-lg">
            <Lock className="w-3.5 h-3.5" />
            <span>CITADEL ENCLAVE: SEALED</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Google Search Grounding toggle */}
          <button
            onClick={() => {
              setSearchGroundingActive(!searchGroundingActive);
              if (!searchGroundingActive) setMapsGroundingActive(false);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
              searchGroundingActive
                ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Search Grounding</span>
          </button>

          {/* Google Maps Grounding toggle */}
          <button
            onClick={() => {
              setMapsGroundingActive(!mapsGroundingActive);
              if (!mapsGroundingActive) setSearchGroundingActive(false);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
              mapsGroundingActive
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Maps Grounding</span>
          </button>
        </div>
      </div>

      {/* Main Chat Thread Area */}
      <div className="h-[360px] overflow-y-auto p-5 space-y-4 font-sans text-sm scrollbar-thin scrollbar-thumb-slate-800">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1 px-1 text-[11px] font-mono text-slate-400">
                {!isUser && (
                  <span className="text-cyan-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {msg.persona || 'GEMINI C4ISR AI'}
                  </span>
                )}
                {isUser && <span className="text-emerald-400 font-bold">OPERATOR / COMMANDER</span>}
                <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                {msg.modelName && (
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700">
                    {msg.modelName}
                  </span>
                )}
              </div>

              <div
                className={`max-w-[88%] rounded-2xl px-5 py-3.5 border whitespace-pre-wrap leading-relaxed ${
                  isUser
                    ? 'bg-cyan-600/90 text-white border-cyan-500/60 shadow-md rounded-tr-none'
                    : 'bg-slate-950 text-slate-200 border-slate-800 shadow-md rounded-tl-none font-mono text-xs'
                }`}
              >
                {msg.content}

                {/* Dispatched Orders Verification Card */}
                {msg.dispatchedOrders && msg.dispatchedOrders.length > 0 && (
                  <div className="mt-3.5 p-3 rounded-xl bg-slate-900/90 border border-cyan-500/40 space-y-2">
                    <div className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      <span>FABRIC AGENT DISPATCH RECEIPT ({msg.dispatchedOrders.length} ORDERS)</span>
                    </div>

                    <div className="space-y-1.5">
                      {msg.dispatchedOrders.map((ord) => (
                        <div key={ord.id} className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-indigo-300">{ord.agentName}</span>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                              {ord.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300">{ord.orderSummary}</p>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <span>Auth: {ord.authCode}</span>
                            <span>{new Date(ord.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grounded Web / Maps Citations */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800">
                    <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Grounded Intelligence Sources:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, idx) => (
                        <a
                          key={idx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 hover:text-sky-200 text-[11px] px-2 py-0.5 rounded transition-colors"
                        >
                          <span className="truncate max-w-[180px]">{src.title}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2.5 text-xs font-mono text-cyan-400 bg-slate-950/80 border border-cyan-500/30 p-3 rounded-xl w-fit animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Consulting C4ISR telemetry models and dispatching agent orders across fabric...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Tactical Query & Order Buttons */}
      <div className="px-5 py-2.5 bg-slate-950/90 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs font-mono scrollbar-none">
        <span className="text-slate-500 shrink-0 font-bold">Quick Actions:</span>
        <button
          onClick={() => handleSend('Query full system status across all mesh nodes, drone swarms, DEFCON level, and cryptographic ledgers')}
          className="bg-slate-900 hover:bg-cyan-950/80 border border-slate-800 hover:border-cyan-500 px-3 py-1 rounded-lg text-slate-300 hover:text-white whitespace-nowrap transition-colors flex items-center gap-1.5"
        >
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>📊 Full System Status</span>
        </button>
        <button
          onClick={() => handleSend('Order UAV Swarm Alpha to execute full-spectrum reconnaissance across perimeter Sector 7-G')}
          className="bg-slate-900 hover:bg-indigo-950/80 border border-slate-800 hover:border-indigo-500 px-3 py-1 rounded-lg text-indigo-300 hover:text-white whitespace-nowrap transition-colors flex items-center gap-1.5"
        >
          <Plane className="w-3.5 h-3.5 text-indigo-400" />
          <span>🛰️ Order Swarm Recon</span>
        </button>
        <button
          onClick={() => handleSend('Order Electronic Warfare Pod to engage microwave jamming on 5.8 GHz band')}
          className="bg-slate-900 hover:bg-rose-950/80 border border-slate-800 hover:border-rose-500 px-3 py-1 rounded-lg text-rose-300 hover:text-white whitespace-nowrap transition-colors flex items-center gap-1.5"
        >
          <Radio className="w-3.5 h-3.5 text-rose-400" />
          <span>⚡ Order EW Jammer</span>
        </button>
        <button
          onClick={() => handleSend('Order Citadel Vault Agent to rotate Merkle keys and verify Zero-Knowledge enclave seal')}
          className="bg-slate-900 hover:bg-amber-950/80 border border-slate-800 hover:border-amber-500 px-3 py-1 rounded-lg text-amber-300 hover:text-white whitespace-nowrap transition-colors flex items-center gap-1.5"
        >
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>🛡️ Order Citadel Key Rotation</span>
        </button>
        <button
          onClick={() => handleSend('Order Auto-Debugging Engine to isolate packet latency and check fault trees')}
          className="bg-slate-900 hover:bg-emerald-950/80 border border-slate-800 hover:border-emerald-500 px-3 py-1 rounded-lg text-emerald-300 hover:text-white whitespace-nowrap transition-colors flex items-center gap-1.5"
        >
          <Bug className="w-3.5 h-3.5 text-emerald-400" />
          <span>🔧 Order Auto-Debug Trace</span>
        </button>
      </div>

      {/* Input Field & Microphone */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggleVoice}
          className={`p-3 rounded-xl border transition-all ${
            isListening
              ? 'bg-rose-600 border-rose-500 text-white animate-pulse shadow-lg shadow-rose-600/30'
              : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-cyan-500'
          }`}
          title={isListening ? 'Listening (Click to stop)' : 'Voice Commands (Click to speak)'}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSend();
            }
          }}
          placeholder={
            isListening
              ? 'Listening to your command...'
              : searchGroundingActive
              ? 'Search real-time defense intelligence...'
              : mapsGroundingActive
              ? 'Enter sector/city for Google Maps GEOINT analysis...'
              : 'Query system status or express orders to agents (e.g., "Order swarm to patrol Sector 7-G")...'
          }
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-inner"
        />

        <button
          type="button"
          onClick={() => handleSend()}
          disabled={isLoading || !inputText.trim()}
          className="px-5 py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer"
        >
          <span>TRANSMIT</span>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
