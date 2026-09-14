import React, { useState, useEffect } from 'react';
import { ExternalAgent, ExternalTelemetryRecord } from '../types';
import { 
  Radio, 
  Cpu, 
  Terminal, 
  Copy, 
  Check, 
  X, 
  Plus, 
  RefreshCw, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  Send,
  Code
} from 'lucide-react';

interface AgentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentGatewayModal: React.FC<AgentGatewayModalProps> = ({ isOpen, onClose }) => {
  const [agents, setAgents] = useState<ExternalAgent[]>([]);
  const [telemetryLogs, setTelemetryLogs] = useState<ExternalTelemetryRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'connected' | 'connect_code' | 'inject_test'>('connected');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Form for testing injection
  const [newAgentName, setNewAgentName] = useState<string>('Local Edge Drone 01');
  const [newAgentRole, setNewAgentRole] = useState<'squad' | 'swarm' | 'specialist'>('swarm');
  const [newAgentType, setNewAgentType] = useState<string>('ROS / Autonomous Drone Worker');
  const [injectTelemetry, setInjectTelemetry] = useState<string>('Edge LiDAR sensor reading: 360-deg sweep nominal. Obstacle clearance: 14.2m.');

  const fetchAgentsAndLogs = async () => {
    setIsLoading(true);
    try {
      const [agentsRes, logsRes] = await Promise.all([
        fetch('/api/mesh/agents/list'),
        fetch('/api/mesh/agents/telemetry-log')
      ]);

      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgents(data.agents || []);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setTelemetryLogs(logsData.submissions || []);
      }
    } catch (e) {
      console.warn("Failed to fetch external agent data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAgentsAndLogs();
      const interval = setInterval(fetchAgentsAndLogs, 6000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleRegisterNewAgent = async () => {
    try {
      const res = await fetch('/api/mesh/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAgentName,
          role: newAgentRole,
          type: newAgentType,
          capabilities: ['real_telemetry', 'hardware_sensor', 'crypto_attestation'],
        }),
      });
      if (res.ok) {
        await fetchAgentsAndLogs();
        setActiveTab('connected');
      }
    } catch (e) {
      console.error("Failed to register agent:", e);
    }
  };

  const handleInjectTelemetry = async (agentId?: string) => {
    const targetAgentId = agentId || agents[0]?.id || 'ext-test-agent';
    try {
      await fetch('/api/mesh/agents/submit-telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: targetAgentId,
          missionId: 'hybrid-live-feed',
          unitId: 'node-swarm-sensor',
          status: 'success',
          summary: injectTelemetry,
          signatureHash: `sha256:${Array.from({ length: 8 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')}`,
        }),
      });
      await fetchAgentsAndLogs();
    } catch (e) {
      console.error("Failed to inject telemetry:", e);
    }
  };

  const curlRegisterExample = `curl -X POST http://localhost:3000/api/mesh/agents/register \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Autonomous Drone Alpha","role":"swarm","type":"Python Edge Agent"}'`;

  const curlTelemetryExample = `curl -X POST http://localhost:3000/api/mesh/agents/submit-telemetry \\
  -H "Content-Type: application/json" \\
  -d '{"agentId":"ext-agent-YOUR_ID","summary":"LiDAR obstacle sweep clear. Latency: 3ms.","unitId":"node-swarm-sensor"}'`;

  const pythonScriptExample = `import time, requests, hashlib

SERVER = "http://localhost:3000"

# 1. Register with Mesh Fabric
reg = requests.post(f"{SERVER}/api/mesh/agents/register", json={
    "name": "Python Autonomous Worker",
    "role": "swarm",
    "type": "External Robotics Client"
}).json()
agent_id = reg["agent"]["id"]
print(f"Connected to Mesh Fabric! Agent ID: {agent_id}")

while True:
    # 2. Heartbeat & Telemetry
    requests.post(f"{SERVER}/api/mesh/agents/heartbeat", json={
        "agentId": agent_id,
        "telemetry": "All systems nominal. RF signal -82dBm."
    })
    time.sleep(5)`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <span>External Agent & Swarm Gateway</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Hybrid Active
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Connect external autonomous scripts, drones, and AI workers into the live mesh topology via REST / Webhook
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-nav tabs */}
        <div className="px-6 border-b border-slate-800 bg-slate-900/50 flex space-x-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('connected')}
            className={`py-3 border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'connected'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Connected External Agents ({agents.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('connect_code')}
            className={`py-3 border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'connect_code'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Connection Snippets (Python / cURL)</span>
          </button>
          <button
            onClick={() => setActiveTab('inject_test')}
            className={`py-3 border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'inject_test'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register & Test Ingestion</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'connected' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Real external workers registered with the Mesh Link Gateway endpoint:
                </p>
                <button
                  onClick={fetchAgentsAndLogs}
                  disabled={isLoading}
                  className="flex items-center space-x-1.5 px-2.5 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh List</span>
                </button>
              </div>

              {agents.length === 0 ? (
                <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-xl p-8 text-center space-y-3">
                  <div className="mx-auto w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                    <Radio className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-300">No External Agents Registered Yet</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    You can register a real script using Python or cURL, or use the "Register & Test Ingestion" tab to spin up a mock agent instance.
                  </p>
                  <button
                    onClick={() => setActiveTab('inject_test')}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Quick Register Test Agent</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-400">
                            <Cpu className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-100">{agent.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">{agent.id}</div>
                          </div>
                        </div>
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                          agent.status === 'online' 
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${agent.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                          <span className="capitalize">{agent.status}</span>
                        </span>
                      </div>

                      <div className="text-xs text-slate-400">
                        <span className="text-slate-500">Type:</span> {agent.type}
                      </div>

                      {agent.lastTelemetry && (
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-emerald-300 font-mono">
                          <span className="text-slate-500 block text-[10px]">LATEST TELEMETRY FEED:</span>
                          "{agent.lastTelemetry}"
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[10px] font-mono text-slate-500">
                        <span>Role: {agent.role.toUpperCase()}</span>
                        <span>Heartbeat: {Math.round((Date.now() - agent.lastHeartbeat) / 1000)}s ago</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Ingested Telemetry Feed */}
              {telemetryLogs.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Real-Time External Ingestion Stream ({telemetryLogs.length} Events)</span>
                  </h4>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-48 overflow-y-auto font-mono text-xs space-y-2">
                    {telemetryLogs.map((log, i) => (
                      <div key={i} className="flex items-start justify-between p-2 rounded bg-slate-900/60 border border-slate-800/80">
                        <div className="space-y-0.5">
                          <span className="text-emerald-400 text-[11px] font-semibold">[{log.agentId}]</span>
                          <p className="text-slate-300">{log.summary}</p>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0 ml-4">
                          {log.signatureHash.substring(0, 16)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'connect_code' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-200">How to Hook Up Your Own Physical or Python Agents</h4>
                <p className="text-xs text-slate-400 mt-1">
                  You can run real Python scripts on your machine, connect ROS robotics, or LangGraph swarms. They will authenticate and stream real telemetry directly into this live mesh UI!
                </p>
              </div>

              {/* Python Script */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-emerald-400 flex items-center space-x-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>agent.py (Autonomous Worker Loop)</span>
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(pythonScriptExample);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="flex items-center space-x-1 text-slate-400 hover:text-slate-200"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>
                <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
                  {pythonScriptExample}
                </pre>
              </div>

              {/* cURL Example */}
              <div className="space-y-2">
                <span className="font-mono text-xs text-emerald-400 flex items-center space-x-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>cURL Quick Register</span>
                </span>
                <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-300 overflow-x-auto">
                  {curlRegisterExample}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'inject_test' && (
            <div className="space-y-6">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <h4 className="text-sm font-semibold text-slate-200">Register a New Agent Node in the Fabric</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">Agent Node Name</label>
                    <input
                      type="text"
                      value={newAgentName}
                      onChange={(e) => setNewAgentName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">Mesh Role</label>
                    <select
                      value={newAgentRole}
                      onChange={(e) => setNewAgentRole(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="swarm">Autonomous Swarm Worker</option>
                      <option value="squad">Tactical Squad Worker</option>
                      <option value="specialist">Specialist & Audit Node</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Agent Hardware / Framework Type</label>
                  <input
                    type="text"
                    value={newAgentType}
                    onChange={(e) => setNewAgentType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={handleRegisterNewAgent}
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors flex items-center justify-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Agent into Live Mesh</span>
                </button>
              </div>

              {/* Test Telemetry Stream Injection */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <h4 className="text-sm font-semibold text-slate-200">Inject Simulated Physical Telemetry Feed</h4>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Telemetry Payload</label>
                  <textarea
                    rows={2}
                    value={injectTelemetry}
                    onChange={(e) => setInjectTelemetry(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  onClick={() => handleInjectTelemetry()}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center space-x-2"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Send Attested Telemetry Feed</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>API Gateway Active at /api/mesh/agents/*</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
          >
            Close Gateway
          </button>
        </div>
      </div>
    </div>
  );
};
