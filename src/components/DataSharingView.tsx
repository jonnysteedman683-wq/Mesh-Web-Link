import React, { useState, useEffect } from 'react';
import { AgentNode, MeshPacket } from '../types';
import { CryptoEngine } from '../crypto/cryptoEngine';
import { 
  Lock, 
  Send, 
  Radio, 
  ShieldCheck, 
  CheckCircle, 
  FileCode, 
  ArrowRight, 
  Key, 
  Eye, 
  EyeOff, 
  Layers, 
  Copy, 
  Check 
} from 'lucide-react';

interface DataSharingViewProps {
  nodes: AgentNode[];
  packets: MeshPacket[];
  onSendMessage: (sourceId: string, targetId: string, content: string) => Promise<void>;
  onBroadcastMessage: (sourceId: string, content: string) => Promise<void>;
  calculateRoute: (sourceId: string, targetId: string) => string[] | null;
}

const TEMPLATES = [
  {
    label: 'State Vector Clock Delta',
    content: JSON.stringify(
      {
        syncEpoch: 482,
        vectorClock: { alpha: 14, beta: 29, gamma: 51, delta: 12 },
        crdtDelta: { key: 'mesh.routing.preference', value: 'shortest_rtt_first', version: 9 },
      },
      null,
      2
    ),
  },
  {
    label: 'Agent Security Attestation',
    content: JSON.stringify(
      {
        attestationType: 'BYZANTINE_RESILIENCE_CHECK',
        timestampUtc: new Date().toISOString(),
        verifiedPeers: ['node-alpha', 'node-beta', 'node-gamma'],
        signatureProof: 'ed25519_p256_0x7fa99c1e084bf..',
      },
      null,
      2
    ),
  },
  {
    label: 'Confidential Task Payload',
    content: JSON.stringify(
      {
        taskCategory: 'FEDERATED_EMBEDDING_INFERENCE',
        tensorDim: [1, 1536],
        encryptionEnclave: 'hardware_backed_webcrypto',
        priority: 'HIGH',
      },
      null,
      2
    ),
  },
];

export const DataSharingView: React.FC<DataSharingViewProps> = ({
  nodes,
  packets,
  onSendMessage,
  onBroadcastMessage,
  calculateRoute,
}) => {
  const [sourceId, setSourceId] = useState<string>(nodes[0]?.id || 'node-alpha');
  const [targetId, setTargetId] = useState<string>(nodes[1]?.id || 'node-beta');
  const [isBroadcast, setIsBroadcast] = useState<boolean>(false);
  const [content, setContent] = useState<string>(TEMPLATES[0].content);
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [revealedPackets, setRevealedPackets] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live preview crypto state
  const [cryptoPreview, setCryptoPreview] = useState<{
    ivHex: string;
    ciphertextBase64: string;
    senderFp: string;
    recipientFp: string;
  } | null>(null);

  // Re-generate live crypto preview whenever content or endpoints change
  useEffect(() => {
    let isCurrent = true;
    const generatePreview = async () => {
      try {
        const dest = isBroadcast ? 'all-nodes' : targetId;
        const result = await CryptoEngine.encryptPayload(content, sourceId, dest);
        if (isCurrent) {
          setCryptoPreview({
            ivHex: result.ivHex,
            ciphertextBase64: result.ciphertextBase64,
            senderFp: result.senderFingerprint,
            recipientFp: result.recipientFingerprint,
          });
        }
      } catch (err) {
        // Fallback for preview
      }
    };

    generatePreview();
    return () => {
      isCurrent = false;
    };
  }, [content, sourceId, targetId, isBroadcast]);

  const route = !isBroadcast ? calculateRoute(sourceId, targetId) : null;

  const handleSend = async () => {
    if (!content.trim() || isTransmitting) return;
    setIsTransmitting(true);
    try {
      if (isBroadcast) {
        await onBroadcastMessage(sourceId, content);
      } else {
        await onSendMessage(sourceId, targetId, content);
      }
    } finally {
      setIsTransmitting(false);
    }
  };

  const toggleReveal = (pktId: string) => {
    setRevealedPackets(prev => ({
      ...prev,
      [pktId]: !prev[pktId],
    }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const dataPackets = packets.filter(p => p.type === 'data_share');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Encrypted Agent Data Sharing & Communication Fabric</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Send authentic authenticated AES-256-GCM payloads with ephemeral IVs across the distributed multi-hop mesh
        </p>
      </div>

      {/* Grid: Composer on Left (5 cols), Live Encrypted Stream on Right (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Data Transmission Composer */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              <span>Compose Encrypted Transmission</span>
            </h3>

            {/* Template Selector */}
            <div>
              <span className="text-xs text-slate-400 block mb-1.5 font-medium">
                Load Preset Payload Template:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setContent(tmpl.content)}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Source & Destination Selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Transmitting Node (Sender):
                </label>
                <select
                  value={sourceId}
                  onChange={e => setSourceId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-emerald-500 font-mono"
                >
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-400">
                    Recipient Target:
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsBroadcast(!isBroadcast)}
                    className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${
                      isBroadcast ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {isBroadcast ? 'Broadcast Active' : 'Switch to Broadcast'}
                  </button>
                </div>
                {isBroadcast ? (
                  <div className="w-full bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 text-xs rounded-lg px-2.5 py-2 font-mono flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <span>All Active Mesh Nodes</span>
                  </div>
                ) : (
                  <select
                    value={targetId}
                    onChange={e => setTargetId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    {nodes
                      .filter(n => n.id !== sourceId)
                      .map(n => (
                        <option key={n.id} value={n.id}>
                          {n.name} ({n.id})
                        </option>
                      ))}
                  </select>
                )}
              </div>
            </div>

            {/* Multi-Hop Path Preview */}
            {!isBroadcast && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="font-mono text-[11px] uppercase">Fabric Route Path:</span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {route ? `${route.length - 1} Hops` : 'NO ROUTE (PARTITIONED)'}
                  </span>
                </div>
                {route ? (
                  <div className="flex items-center flex-wrap gap-1 font-mono text-[11px]">
                    {route.map((hop, idx) => (
                      <React.Fragment key={hop}>
                        <span className={`px-2 py-0.5 rounded ${
                          idx === 0
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : idx === route.length - 1
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {hop}
                        </span>
                        {idx < route.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-slate-600" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  <div className="text-rose-400 text-xs">
                    Links are severed between these agents. Repair links in Resilience Sandbox or Topology.
                  </div>
                )}
              </div>
            )}

            {/* Payload Editor */}
            <div>
              <label className="text-xs text-slate-400 block mb-1 font-medium">
                Plaintext Data Payload (Encrypted in transit):
              </label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={5}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono rounded-lg p-3 focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                placeholder="Enter string or JSON payload to encrypt and share..."
              />
            </div>

            {/* Live Cryptographic Preview Box */}
            {cryptoPreview && (
              <div className="bg-slate-950/90 border border-slate-800/80 rounded-lg p-3 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                    <Lock className="w-3 h-3" />
                    WebCrypto Real-Time Pipeline
                  </span>
                  <span className="text-[10px] text-slate-500">AES-256-GCM / 128-bit Tag</span>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Generated 96-bit IV (Hex):</span>
                  <span className="text-cyan-300 text-[11px] select-all block truncate">
                    0x{cryptoPreview.ivHex}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Ciphertext (Base64 Encrypted):</span>
                  <span className="text-purple-300 text-[11px] select-all block truncate">
                    {cryptoPreview.ciphertextBase64}
                  </span>
                </div>
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={isTransmitting || (!isBroadcast && !route)}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs shadow-md transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isTransmitting
                  ? 'Encrypting & Routing...'
                  : isBroadcast
                  ? 'Broadcast Encrypted Frame to All Agents'
                  : 'Transmit Encrypted Frame Across Fabric'}
              </span>
            </button>
          </div>
        </div>

        {/* Right Column: Transmission Feed & Decryption Log */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Distributed Transmission Feed</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {dataPackets.length} Transmissions Logged
              </span>
            </div>

            {dataPackets.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                <FileCode className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                No data transmissions yet. Transmit an encrypted frame using the composer!
              </div>
            ) : (
              <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                {dataPackets.map(pkt => {
                  const isRevealed = revealedPackets[pkt.id];
                  const sender = nodes.find(n => n.id === pkt.sourceId);
                  const recipient = nodes.find(n => n.id === pkt.targetId);

                  return (
                    <div
                      key={pkt.id}
                      className="bg-slate-950 border border-slate-800/90 rounded-xl p-4 space-y-3 transition-colors hover:border-slate-700"
                    >
                      {/* Top Header of Packet Card */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-cyan-400 font-semibold">
                            {pkt.id}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {new Date(pkt.startTime).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                            pkt.status === 'delivered'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : pkt.status === 'in_flight'
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {pkt.status.toUpperCase()}
                          </span>

                          {pkt.isVerified && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <CheckCircle className="w-2.5 h-2.5" />
                              VERIFIED
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Source ➔ Destination & Hops */}
                      <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-xs">
                        <div className="flex items-center space-x-2">
                          <div className="font-semibold text-slate-200">
                            {sender?.name || pkt.sourceId}
                          </div>
                          <span className="text-slate-600">➔</span>
                          <div className="font-semibold text-slate-200">
                            {recipient?.name || pkt.targetId}
                          </div>
                        </div>

                        <div className="text-[11px] font-mono text-slate-400">
                          Route: {pkt.route.join(' ➔ ')}
                        </div>
                      </div>

                      {/* Cryptographic Content Display */}
                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-[10px] uppercase">
                            {isRevealed ? 'Decrypted Verified Payload:' : 'Encrypted Ciphertext (AES-256-GCM):'}
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => toggleReveal(pkt.id)}
                              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                            >
                              {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              <span>{isRevealed ? 'Show Ciphertext' : 'Decrypt & Inspect'}</span>
                            </button>
                            <button
                              onClick={() => copyToClipboard(isRevealed ? (pkt.decryptedContent || '') : pkt.payload.ciphertextBase64, pkt.id)}
                              className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                              title="Copy Payload"
                            >
                              {copiedKey === pkt.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>

                        {isRevealed ? (
                          <pre className="bg-slate-900 border border-slate-800 p-2.5 rounded text-emerald-300 text-[11px] overflow-x-auto whitespace-pre-wrap">
                            {pkt.decryptedContent || 'Decrypting at recipient node...'}
                          </pre>
                        ) : (
                          <div className="bg-slate-900 border border-slate-800 p-2.5 rounded text-purple-300 text-[11px] truncate">
                            {pkt.payload.ciphertextBase64}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 pt-1">
                          <span>IV: 0x{pkt.payload.ivHex.substring(0, 16)}...</span>
                          <span>Sender FP: {pkt.payload.senderFingerprint}</span>
                          <span>Len: {pkt.payload.plaintextLength} bytes</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
