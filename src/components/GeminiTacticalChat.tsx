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
  ExternalLink, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  Radio, 
  Layers, 
  Cpu, 
  Zap, 
  Database,
  Search,
  MessageSquare,
  Compass
} from 'lucide-react';
import { auth, saveChatMessageToCloud, subscribeToSessionMessages } from '../services/firebase';

export type GeminiModelType = 'gemini-3.1-pro-preview' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite';

export type TacticalRole = 
  | 'C4ISR Intelligence Officer' 
  | 'Drone Swarm Coordinator' 
  | 'Threat & EW Specialist' 
  | 'Cryptographic Auditor' 
  | 'Geospatial Strategist';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  modelName?: string;
  persona?: string;
  sources?: { title: string; url: string }[];
  searchQueries?: string[];
  timestamp: number;
  isGrounded?: boolean;
}

interface GeminiTacticalChatProps {
  currentDefcon?: number;
  activeSector?: string;
  onDispatchAction?: (commandText: string) => void;
}

export const GeminiTacticalChat: React.FC<GeminiTacticalChatProps> = ({
  currentDefcon = 3,
  activeSector = 'Sector 7-G',
  onDispatchAction,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-welcome',
      role: 'model',
      content: `Tactical Intelligence Node online. Authenticated to Mesh Link Connection Fabric. All perimeter swarms, spectrum sensors, and Merkle ledgers are reporting green. How can I assist Central Command?`,
      modelName: 'gemini-3.5-flash',
      persona: 'C4ISR Intelligence Officer',
      timestamp: Date.now() - 30000,
    }
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<GeminiModelType>('gemini-3.5-flash');
  const [selectedRole, setSelectedRole] = useState<TacticalRole>('C4ISR Intelligence Officer');
  const [searchGroundingActive, setSearchGroundingActive] = useState<boolean>(false);
  const [mapsGroundingActive, setMapsGroundingActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);
  const [sessionId, setSessionId] = useState<string>(() => `session-${Date.now()}`);
  const [cloudSynced, setCloudSynced] = useState<boolean>(false);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Firestore sync subscription if user authenticated
  useEffect(() => {
    if (auth.currentUser) {
      const unsub = subscribeToSessionMessages(sessionId, (firestoreMsgs) => {
        if (firestoreMsgs && firestoreMsgs.length > 0) {
          setMessages(firestoreMsgs as ChatMessage[]);
          setCloudSynced(true);
        }
      });
      return () => unsub();
    }
  }, [sessionId]);

  // Web Speech API Voice Recognition setup
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
        // Direct execute voice query
        handleSendMessage(transcript);
      };

      recog.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
        setIsListening(false);
      };

      recog.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recog;
    }
  }, []);

  const toggleVoiceListen = () => {
    if (!recognitionRef.current) {
      setSpeechNotice('Tactical voice input unavailable in this browser or sandboxed environment. Please use text input or open in dedicated tab.');
      setTimeout(() => setSpeechNotice(null), 4500);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.warn('Failed to start speech recognition:', e);
        setIsListening(false);
      }
    }
  };

  const speakText = (text: string) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, '').slice(0, 250);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputText).trim();
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

    // Save user message to cloud Firestore
    saveChatMessageToCloud(sessionId, userMsg);

    try {
      // 1. If Google Search Grounding is activated
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
          content: data.text || 'Live search completed.',
          modelName: 'gemini-3.5-flash [Google Search Grounded]',
          persona: selectedRole,
          sources: data.sources || [],
          searchQueries: data.searchQueries || [],
          timestamp: Date.now(),
          isGrounded: true,
        };

        setMessages([...newHistory, aiMsg]);
        saveChatMessageToCloud(sessionId, aiMsg);
        speakText(aiMsg.content);
        return;
      }

      // 2. If Google Maps Grounding is activated
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
          content: data.text || 'Geospatial intelligence computed.',
          modelName: 'gemini-3.5-flash [Google Maps Grounded]',
          persona: selectedRole,
          sources: data.sources || [],
          timestamp: Date.now(),
          isGrounded: true,
        };

        setMessages([...newHistory, aiMsg]);
        saveChatMessageToCloud(sessionId, aiMsg);
        speakText(aiMsg.content);
        return;
      }

      // 3. Multi-turn Chat Conversation
      const systemPrompt = `You are an elite tactical AI agent operating with role "${selectedRole}" inside C4ISR Defense Command.
Current DEFCON: ${currentDefcon}. Active Sector: ${activeSector}.
Respond concisely with high operational clarity, structured analysis, and military-grade situational awareness.`;

      const formatted = newHistory.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: formatted,
          model: selectedModel,
          rolePersona: selectedRole,
          systemPrompt,
        })
      });

      const data = await resp.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'model',
        content: data.text || 'Directive acknowledged.',
        modelName: selectedModel,
        persona: selectedRole,
        timestamp: Date.now(),
      };

      setMessages([...newHistory, aiMsg]);
      saveChatMessageToCloud(sessionId, aiMsg);
      speakText(aiMsg.content);

    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: 'Tactical link timeout. Autonomous mesh fallback node engaged.',
        modelName: selectedModel,
        persona: selectedRole,
        timestamp: Date.now(),
      };
      setMessages([...newHistory, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(`session-${Date.now()}`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl text-slate-100">
      {/* Top Header & Tactical Controls */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold tracking-wide text-indigo-300">GEMINI C4ISR AI CORE</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 rounded font-mono">
                ONLINE
              </span>
              {auth.currentUser && (
                <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                  <Database className="w-2.5 h-2.5" /> FIRESTORE SYNC
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Role: {selectedRole} | DEFCON {currentDefcon}
            </p>
          </div>
        </div>

        {/* Model & Persona Selection */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Model Switcher */}
          <div className="flex items-center bg-slate-950 border border-slate-700/80 rounded-lg p-0.5">
            <button
              onClick={() => setSelectedModel('gemini-3.1-pro-preview')}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-all ${
                selectedModel === 'gemini-3.1-pro-preview'
                  ? 'bg-purple-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="gemini-3.1-pro-preview: Strategic deep reasoning & complex battle planning"
            >
              Pro 3.1
            </button>
            <button
              onClick={() => setSelectedModel('gemini-3.5-flash')}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-all ${
                selectedModel === 'gemini-3.5-flash'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="gemini-3.5-flash: Fast, high-accuracy general C4ISR operations"
            >
              Flash 3.5
            </button>
            <button
              onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-all ${
                selectedModel === 'gemini-3.1-flash-lite'
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="gemini-3.1-flash-lite: Ultra-fast low-latency telemetry processing"
            >
              Flash Lite
            </button>
          </div>

          {/* Role Persona Dropdown */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as TacticalRole)}
            className="bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500"
          >
            <option value="C4ISR Intelligence Officer">C4ISR Intel Officer</option>
            <option value="Drone Swarm Coordinator">Swarm Coordinator</option>
            <option value="Threat & EW Specialist">EW / Threat Specialist</option>
            <option value="Cryptographic Auditor">Merkle / Crypto Auditor</option>
            <option value="Geospatial Strategist">Geospatial Strategist</option>
          </select>

          {/* Audio TTS Toggle */}
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              ttsEnabled
                ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title={ttsEnabled ? 'Tactical Voice TTS Enabled' : 'Voice TTS Muted'}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Clear Chat */}
          <button
            onClick={clearChat}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-rose-400 hover:border-rose-900 transition-colors"
            title="Clear Chat Thread"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grounding & Capability Ribbon */}
      <div className="bg-slate-900/40 border-b border-slate-800/80 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          {/* Google Search Grounding Button */}
          <button
            onClick={() => {
              setSearchGroundingActive(!searchGroundingActive);
              if (!searchGroundingActive) setMapsGroundingActive(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono transition-all ${
              searchGroundingActive
                ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-sm'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Google Search Grounding</span>
            {searchGroundingActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            )}
          </button>

          {/* Google Maps Grounding Button */}
          <button
            onClick={() => {
              setMapsGroundingActive(!mapsGroundingActive);
              if (!mapsGroundingActive) setSearchGroundingActive(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono transition-all ${
              mapsGroundingActive
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Google Maps Grounding</span>
            {mapsGroundingActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
          <span>Active Grid: {activeSector}</span>
          <span>•</span>
          <span className="text-indigo-400">Encrypted AES-GCM</span>
        </div>
      </div>

      {/* Messages Scrollable Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-sm scrollbar-thin scrollbar-thumb-slate-800">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1 px-1 text-[11px] font-mono text-slate-400">
                {!isUser && (
                  <span className="text-indigo-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {msg.persona || 'C4ISR AI'}
                  </span>
                )}
                {isUser && <span className="text-emerald-400 font-bold">COMMANDER</span>}
                <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                {msg.modelName && (
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700">
                    {msg.modelName}
                  </span>
                )}
              </div>

              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 border whitespace-pre-wrap leading-relaxed ${
                  isUser
                    ? 'bg-indigo-600/90 text-white border-indigo-500/60 shadow-md rounded-tr-none'
                    : 'bg-slate-900/95 text-slate-200 border-slate-800 shadow-sm rounded-tl-none font-mono text-xs'
                }`}
              >
                {msg.content}

                {/* Grounded Search / Maps Citations */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-800/80">
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
                          className="inline-flex items-center gap-1 bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-sky-300 hover:text-sky-200 text-[11px] px-2 py-0.5 rounded transition-colors"
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
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 bg-slate-900/60 border border-indigo-500/30 p-3 rounded-lg w-fit animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Processing C4ISR tactical telemetry & running intelligence model...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Tactical Prompts */}
      <div className="px-4 py-1.5 bg-slate-950/90 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono no-scrollbar">
        <span className="text-slate-500 shrink-0">Directives:</span>
        <button
          onClick={() => handleSendMessage('Run full perimeter threat analysis on radar contacts')}
          className="bg-slate-900 hover:bg-indigo-950/70 border border-slate-800 hover:border-indigo-700 px-2 py-1 rounded text-slate-300 whitespace-nowrap transition-colors"
        >
          Perimeter Threat Analysis
        </button>
        <button
          onClick={() => handleSendMessage('Coordinate 512-drone swarm to establish RF data relay over Sector 7-G')}
          className="bg-slate-900 hover:bg-indigo-950/70 border border-slate-800 hover:border-indigo-700 px-2 py-1 rounded text-slate-300 whitespace-nowrap transition-colors"
        >
          Swarm RF Relay Sync
        </button>
        <button
          onClick={() => {
            setSearchGroundingActive(true);
            handleSendMessage('Latest real-time global electronic warfare and GPS jamming incidents');
          }}
          className="bg-slate-900 hover:bg-sky-950/70 border border-slate-800 hover:border-sky-700 px-2 py-1 rounded text-sky-300 whitespace-nowrap transition-colors"
        >
          Live OSINT EW Incidents
        </button>
        <button
          onClick={() => {
            setMapsGroundingActive(true);
            handleSendMessage('Geospatial terrain analysis for high-altitude UAV corridor in Geneva Alps');
          }}
          className="bg-slate-900 hover:bg-emerald-950/70 border border-slate-800 hover:border-emerald-700 px-2 py-1 rounded text-emerald-300 whitespace-nowrap transition-colors"
        >
          Maps Terrain Analysis
        </button>
      </div>

      {/* Speech Notice Banner */}
      {speechNotice && (
        <div className="px-4 py-2 bg-amber-950/80 border-t border-amber-700/60 text-amber-300 text-xs font-mono flex items-center justify-between">
          <span>{speechNotice}</span>
          <button 
            onClick={() => setSpeechNotice(null)} 
            className="text-amber-400 hover:text-white px-2 py-0.5 text-[10px] rounded bg-amber-900 border border-amber-700 cursor-pointer"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Input Field & Voice Button */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleVoiceListen}
          className={`p-2.5 rounded-lg border transition-all ${
            isListening
              ? 'bg-rose-600 border-rose-500 text-white animate-pulse shadow-lg shadow-rose-600/30'
              : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white hover:border-indigo-500'
          }`}
          title={isListening ? 'Listening (Click to stop)' : 'Voice Conversation (Click to speak)'}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage();
            }
          }}
          placeholder={
            isListening
              ? 'Listening to spoken command...'
              : searchGroundingActive
              ? 'Search live real-world defense intelligence...'
              : mapsGroundingActive
              ? 'Enter location/sector for Google Maps tactical analysis...'
              : 'Dispatch directive or query C4ISR intelligence core...'
          }
          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />

        <button
          type="button"
          onClick={() => handleSendMessage()}
          disabled={isLoading || !inputText.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <span>DISPATCH</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
