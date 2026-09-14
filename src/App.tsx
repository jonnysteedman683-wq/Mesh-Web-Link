import React, { useState, useEffect } from 'react';
import { meshFabric } from './fabric/meshFabric';
import { AgentNode, MeshLink, MeshPacket, CollaborativeTask, NetworkMetrics, ChaosSettings, AgentRole, Region } from './types';
import { Navbar, ActiveTab } from './components/Navbar';
import { TopologyView } from './components/TopologyView';
import { DashboardView } from './components/DashboardView';
import { DataSharingView } from './components/DataSharingView';
import { DistributedTasksView } from './components/DistributedTasksView';
import { PacketInspectorView } from './components/PacketInspectorView';
import { ResilienceSandboxView } from './components/ResilienceSandboxView';
import { DirectiveStudioView } from './components/DirectiveStudioView';
import { TacticalRadarView } from './components/TacticalRadarView';
import { C4ISRWarRoomView } from './components/C4ISRWarRoomView';
import { EdgeSwarmEngineView } from './components/EdgeSwarmEngineView';
import { P2PMultiDeviceSyncView } from './components/P2PMultiDeviceSyncView';
import { CitadelEntranceView } from './components/CitadelEntranceView';
import { DroneSwarmView } from './components/DroneSwarmView';
import { AutoDebugView } from './components/AutoDebugView';
import { NewNodeModal } from './components/NewNodeModal';
import { TopWeatherAndDevicesBar } from './components/TopWeatherAndDevicesBar';
import { Geometric4DHomePage } from './components/Geometric4DHomePage';
import { SystemLogsView } from './components/SystemLogsView';
import { DeviceManagerModal } from './components/DeviceManagerModal';
import { AITacticalHubView } from './components/AITacticalHubView';
import { HardwareSdrBridgeView } from './components/HardwareSdrBridgeView';
import { MeshtasticBleView } from './components/MeshtasticBleView';
import { MavlinkStanagView } from './components/MavlinkStanagView';
import { AtakCotGatewayView } from './components/AtakCotGatewayView';
import { ElectronicWarfareView } from './components/ElectronicWarfareView';
import { MeshSelfHealingView } from './components/MeshSelfHealingView';
import { AgentOverlayNetworkView } from './components/AgentOverlayNetworkView';
import { SecurityWipeModal } from './components/SecurityWipeModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AnimatePresence, motion } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('meshtastic_ble');
  const [nodes, setNodes] = useState<AgentNode[]>(meshFabric.getNodes());
  const [links, setLinks] = useState<MeshLink[]>(meshFabric.getLinks());
  const [packets, setPackets] = useState<MeshPacket[]>(meshFabric.getPackets());
  const [tasks, setTasks] = useState<CollaborativeTask[]>(meshFabric.getTasks());
  const [metrics, setMetrics] = useState<NetworkMetrics>(meshFabric.getMetrics());
  const [chaosSettings, setChaosSettings] = useState<ChaosSettings>(meshFabric.getChaosSettings());
  const [isNewNodeModalOpen, setIsNewNodeModalOpen] = useState<boolean>(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState<boolean>(false);
  const [isSecurityWipeModalOpen, setIsSecurityWipeModalOpen] = useState<boolean>(false);
  const [opticsMode, setOpticsMode] = useState<'standard' | 'nvg' | 'amber'>('standard');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showTacticalToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  // Subscribe to Mesh Fabric state changes & heartbeat
  useEffect(() => {
    const unsubscribe = meshFabric.subscribe(() => {
      setNodes(meshFabric.getNodes());
      setLinks(meshFabric.getLinks());
      setPackets(meshFabric.getPackets());
      setTasks(meshFabric.getTasks());
      setMetrics(meshFabric.getMetrics());
      setChaosSettings(meshFabric.getChaosSettings());
    });

    const stopHeartbeat = meshFabric.startHeartbeat(3000);

    return () => {
      unsubscribe();
      stopHeartbeat();
    };
  }, []);

  // Handlers
  const handleSendProbe = async (sourceId: string, targetId: string) => {
    await meshFabric.sendEncryptedMessage(
      sourceId,
      targetId,
      JSON.stringify({
        probe: 'HEARTBEAT_DIAGNOSTIC_FRAME',
        timestamp: Date.now(),
        meshHopVerification: true,
      }),
      'heartbeat'
    );
  };

  const handleSendMessage = async (sourceId: string, targetId: string, content: string) => {
    await meshFabric.sendEncryptedMessage(sourceId, targetId, content, 'data_share');
  };

  const handleBroadcastMessage = async (sourceId: string, content: string) => {
    await meshFabric.broadcastEncryptedMessage(sourceId, content, 'data_share');
  };

  const handleDispatchTask = async (
    title: string,
    type: CollaborativeTask['type'],
    initiatorNodeId: string,
    assignedNodes: string[],
    payloadDescription: string
  ) => {
    await meshFabric.dispatchTask(title, type, initiatorNodeId, assignedNodes, payloadDescription);
  };

  const handleToggleSeverLink = (linkId: string) => {
    meshFabric.toggleSeverLink(linkId);
  };

  const handleToggleIsolateNode = (nodeId: string) => {
    meshFabric.toggleIsolateNode(nodeId);
  };

  const handleSetPacketLoss = (enabled: boolean, rate: number) => {
    meshFabric.setPacketLossChaos(enabled, rate);
  };

  const handleSetLatencyChaos = (enabled: boolean, addedMs: number) => {
    meshFabric.setLatencyChaos(enabled, addedMs);
  };

  const handleHealAll = () => {
    meshFabric.healAll();
  };

  const handleExecuteSecurityWipe = async () => {
    // 1. Reset client-side Mesh Fabric state and topology
    meshFabric.securityWipe();

    // 2. Trigger backend cryptographic wipe and re-keying
    try {
      await fetch('/api/mesh/security-wipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationCode: 'ZEROIZE',
          operatorCallsign: 'Commander'
        }),
      });
    } catch (err) {
      console.warn('Backend security wipe notification notice:', err);
    }

    showTacticalToast('EMERGENCY SECURITY WIPE COMPLETED: Cryptographic fabric zeroized and associations reset.');
  };

  const handleDeployNode = async (name: string, role: AgentRole, region: Region) => {
    await meshFabric.addNode(name, role, region);
  };

  const handleRunResilienceTest = async () => {
    const source = nodes.find(n => n.id === 'node-me') || nodes[0];
    const target = nodes.find(n => n.id === 'node-inquisitor') || nodes[nodes.length - 1];
    if (source && target && source.id !== target.id) {
      await meshFabric.sendEncryptedMessage(
        source.id,
        target.id,
        JSON.stringify({
          test: 'RESILIENCE_FAILOVER_VERIFICATION',
          epoch: Date.now(),
        }),
        'data_share'
      );
    }
  };

  const calculateRoute = (sourceId: string, targetId: string) => {
    return meshFabric.calculateRoute(sourceId, targetId);
  };

  const getOpticsFilterClass = () => {
    if (opticsMode === 'nvg') {
      return 'brightness-105 contrast-110 [filter:hue-rotate(80deg)_saturate(1.4)]';
    }
    if (opticsMode === 'amber') {
      return 'brightness-105 contrast-110 [filter:sepia(0.85)_hue-rotate(330deg)_saturate(2)]';
    }
    return '';
  };

  return (
    <div className={`min-h-screen ${activeTab === 'citadel' ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100 bg-tactical-grid'} flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 ${getOpticsFilterClass()}`}>
      {/* Universal Top Weather Telemetry & Tactical Device Control Bar */}
      <TopWeatherAndDevicesBar
        onGoHome={() => setActiveTab('home')}
        onOpenLogs={() => setActiveTab('logs')}
        onOpenDeviceModal={() => setIsDeviceModalOpen(true)}
        isCitadelMode={activeTab === 'citadel'}
      />

      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenCitadel={() => setActiveTab('citadel')}
        metrics={metrics}
        chaosSettings={chaosSettings}
        onOpenNewNodeModal={() => setIsNewNodeModalOpen(true)}
        onQuickHeal={handleHealAll}
        opticsMode={opticsMode}
        onToggleOptics={setOpticsMode}
        audioEnabled={audioEnabled}
        onToggleAudio={() => setAudioEnabled(prev => !prev)}
        onOpenSecurityWipe={() => setIsSecurityWipeModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className={`flex-1 w-full mx-auto ${activeTab === 'citadel' ? 'p-0' : activeTab === 'home' ? 'p-0' : 'max-w-7xl px-4 sm:px-6 lg:px-8 py-6'}`}>
        <ErrorBoundary onReset={() => setActiveTab('home')}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
            {activeTab === 'home' && (
              <Geometric4DHomePage
                onNavigateTab={setActiveTab}
                onOpenCitadel={() => setActiveTab('citadel')}
                onOpenDeviceModal={() => setIsDeviceModalOpen(true)}
                onNotify={showTacticalToast}
              />
            )}

            {activeTab === 'ai_intel' && (
              <AITacticalHubView />
            )}

            {activeTab === 'agent_overlay' && (
              <AgentOverlayNetworkView />
            )}

            {activeTab === 'logs' && (
              <SystemLogsView onNotify={showTacticalToast} />
            )}

            {activeTab === 'topology' && (
              <TopologyView
                nodes={nodes}
                links={links}
                packets={packets}
                chaosSettings={chaosSettings}
                onSendProbe={handleSendProbe}
                onToggleSeverLink={handleToggleSeverLink}
                onToggleIsolateNode={handleToggleIsolateNode}
              />
            )}

            {activeTab === 'studio' && (
              <DirectiveStudioView nodes={nodes} />
            )}

            {activeTab === 'radar' && (
              <TacticalRadarView nodes={nodes} />
            )}

            {activeTab === 'c4isr' && (
              <C4ISRWarRoomView nodes={nodes} />
            )}

            {activeTab === 'drones' && (
              <DroneSwarmView onNotify={showTacticalToast} />
            )}

            {activeTab === 'swarm_engine' && (
              <EdgeSwarmEngineView nodes={nodes} />
            )}

            {activeTab === 'p2p_mesh' && (
              <P2PMultiDeviceSyncView onNotify={showTacticalToast} />
            )}

            {activeTab === 'meshtastic_ble' && (
              <div className="space-y-4">
                {/* Track 3 Fast Quick-Switch Ribbon */}
                <div className="bg-slate-900/90 border border-indigo-900/60 rounded-2xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 font-bold text-[10px] tracking-wider">
                      TRACK 3 PROTOCOL SUITE
                    </span>
                    <span className="text-slate-300 font-bold hidden sm:inline">Tactical Field Radios, Autopilots & TAK Hub</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setActiveTab('meshtastic_ble')}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-600 text-white font-bold cursor-pointer shadow-md shadow-indigo-600/30 text-xs"
                    >
                      Meshtastic BLE
                    </button>
                    <button
                      onClick={() => setActiveTab('mavlink_stanag')}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 cursor-pointer text-xs"
                    >
                      STANAG / MAVLink
                    </button>
                    <button
                      onClick={() => setActiveTab('atak_cot')}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 border border-slate-800 cursor-pointer text-xs"
                    >
                      ATAK CoT Gateway
                    </button>
                    <button
                      onClick={() => setActiveTab('sdr_hardware')}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer text-xs"
                    >
                      SDR & RF Waterfall
                    </button>
                  </div>
                </div>
                <MeshtasticBleView onNotify={showTacticalToast} />
              </div>
            )}

            {activeTab === 'mavlink_stanag' && (
              <div className="space-y-4">
                {/* Track 3 Fast Quick-Switch Ribbon */}
                <div className="bg-slate-900/90 border border-cyan-900/60 rounded-2xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold text-[10px] tracking-wider">
                      TRACK 3 PROTOCOL SUITE
                    </span>
                    <span className="text-slate-300 font-bold hidden sm:inline">Tactical Field Radios, Autopilots & TAK Hub</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setActiveTab('meshtastic_ble')}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-indigo-300 border border-slate-800 cursor-pointer text-xs"
                    >
                      Meshtastic BLE
                    </button>
                    <button
                      onClick={() => setActiveTab('mavlink_stanag')}
                      className="px-2.5 py-1.5 rounded-xl bg-cyan-600 text-slate-950 font-bold cursor-pointer shadow-md shadow-cyan-600/30 text-xs"
                    >
                      STANAG / MAVLink
                    </button>
                    <button
                      onClick={() => setActiveTab('atak_cot')}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 border border-slate-800 cursor-pointer text-xs"
                    >
                      ATAK CoT Gateway
                    </button>
                    <button
                      onClick={() => setActiveTab('sdr_hardware')}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer text-xs"
                    >
                      SDR & RF Waterfall
                    </button>
                  </div>
                </div>
                <MavlinkStanagView onNotify={showTacticalToast} />
              </div>
            )}

            {activeTab === 'atak_cot' && (
              <div className="space-y-4">
                {/* Track 3 Fast Quick-Switch Ribbon */}
                <div className="bg-slate-900/90 border border-emerald-900/60 rounded-2xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold text-[10px] tracking-wider">
                      TRACK 3 PROTOCOL SUITE
                    </span>
                    <span className="text-slate-300 font-bold hidden sm:inline">Tactical Field Radios, Autopilots & TAK Hub</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setActiveTab('meshtastic_ble')}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-indigo-300 border border-slate-800 cursor-pointer text-xs"
                    >
                      Meshtastic BLE
                    </button>
                    <button
                      onClick={() => setActiveTab('mavlink_stanag')}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 cursor-pointer text-xs"
                    >
                      STANAG / MAVLink
                    </button>
                    <button
                      onClick={() => setActiveTab('atak_cot')}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer shadow-md shadow-emerald-600/30 text-xs"
                    >
                      ATAK CoT Gateway
                    </button>
                    <button
                      onClick={() => setActiveTab('sdr_hardware')}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer text-xs"
                    >
                      SDR & RF Waterfall
                    </button>
                  </div>
                </div>
                <AtakCotGatewayView onNotify={showTacticalToast} />
              </div>
            )}

            {activeTab === 'sdr_hardware' && (
              <HardwareSdrBridgeView 
                onNotify={showTacticalToast}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'electronic_warfare' && (
              <ElectronicWarfareView 
                onNotify={showTacticalToast}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'self_healing' && (
              <MeshSelfHealingView 
                onNotify={showTacticalToast}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'dashboard' && (
              <DashboardView
                nodes={nodes}
                links={links}
                metrics={metrics}
                chaosSettings={chaosSettings}
                onSendProbe={handleSendProbe}
                onToggleIsolateNode={handleToggleIsolateNode}
                onToggleSeverLink={handleToggleSeverLink}
              />
            )}

            {activeTab === 'sharing' && (
              <DataSharingView
                nodes={nodes}
                packets={packets}
                onSendMessage={handleSendMessage}
                onBroadcastMessage={handleBroadcastMessage}
                calculateRoute={calculateRoute}
              />
            )}

            {activeTab === 'tasks' && (
              <DistributedTasksView
                nodes={nodes}
                tasks={tasks}
                onDispatchTask={handleDispatchTask}
              />
            )}

            {activeTab === 'inspector' && (
              <PacketInspectorView
                packets={packets}
                nodes={nodes}
              />
            )}

            {activeTab === 'chaos' && (
              <ResilienceSandboxView
                nodes={nodes}
                links={links}
                chaosSettings={chaosSettings}
                onToggleSeverLink={handleToggleSeverLink}
                onToggleIsolateNode={handleToggleIsolateNode}
                onSetPacketLoss={handleSetPacketLoss}
                onSetLatencyChaos={handleSetLatencyChaos}
                onHealAll={handleHealAll}
                onRunResilienceTest={handleRunResilienceTest}
              />
            )}

            {activeTab === 'auto_debug' && (
              <AutoDebugView onNotify={showTacticalToast} />
            )}

            {activeTab === 'citadel' && (
              <CitadelEntranceView
                onBackToTactical={() => setActiveTab('c4isr')}
                onGoHome={() => setActiveTab('home')}
                onNotify={showTacticalToast}
              />
            )}
          </motion.div>
        </AnimatePresence>
        </ErrorBoundary>
      </main>

      {/* Deploy Agent Modal */}
      <NewNodeModal
        isOpen={isNewNodeModalOpen}
        onClose={() => setIsNewNodeModalOpen(false)}
        onDeploy={handleDeployNode}
      />

      {/* Tactical Hardware Device Manager Modal */}
      <DeviceManagerModal
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
        onNotify={showTacticalToast}
      />

      {/* Emergency Security Wipe Modal */}
      <SecurityWipeModal
        isOpen={isSecurityWipeModalOpen}
        onClose={() => setIsSecurityWipeModalOpen(false)}
        onConfirmWipe={handleExecuteSecurityWipe}
        targetNodeCount={nodes.length}
      />

      {/* C4ISR Tactical Telemetry Footer */}
      <footer className={`border-t py-3.5 px-4 sm:px-6 lg:px-8 text-xs font-mono transition-colors ${
        activeTab === 'citadel' 
          ? 'bg-white border-slate-200 text-slate-500' 
          : 'border-slate-900 bg-slate-950/90 text-slate-500'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className={`font-semibold ${activeTab === 'citadel' ? 'text-slate-700' : 'text-slate-400'}`}>
              {activeTab === 'citadel' ? 'THE CITADEL // HARDENED SOVEREIGN ENCLAVE' : 'OPERATIONAL SECURITY LEVEL: CNSA 2.0 / TOP SECRET'}
            </span>
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <span>STANAG 5516 LINK-16</span>
            <span>•</span>
            <span>ECDH P-256 / AES-256-GCM</span>
            <span>•</span>
            <span>DIJKSTRA SHORTEST PATH</span>
            <span>•</span>
            <span className={activeTab === 'citadel' ? 'text-indigo-600 font-bold' : 'text-cyan-400'}>
              {activeTab === 'citadel' ? 'CITADEL ATTESTED SECURE' : 'HARDENED MESH LINK FABRIC'}
            </span>
          </div>
        </div>
      </footer>

      {/* Offline PWA & Disconnected Field Mode Floating Indicator */}
      <OfflineIndicator />

      {/* Real-Time P2P Mesh Sync Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-14 right-6 z-50 max-w-md p-3.5 rounded-lg bg-slate-900/95 border border-cyan-500/50 shadow-2xl backdrop-blur-md text-xs font-mono text-cyan-200 flex items-center space-x-3 pointer-events-auto"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
            <div className="flex-1">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">P2P WEBRTC FABRIC SYNC</div>
              <div className="text-slate-100 mt-0.5">{toastMessage}</div>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-500 hover:text-slate-300 ml-2"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
