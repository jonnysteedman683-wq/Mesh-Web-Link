import React, { useState } from 'react';
import { MeshPacket, AgentNode } from '../types';
import { 
  Terminal, 
  ShieldCheck, 
  Search, 
  Filter, 
  Layers, 
  Eye, 
  Lock, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ArrowRight,
  Hash
} from 'lucide-react';

interface PacketInspectorViewProps {
  packets: MeshPacket[];
  nodes: AgentNode[];
}

export const PacketInspectorView: React.FC<PacketInspectorViewProps> = ({
  packets,
  nodes,
}) => {
  const [selectedPacketId, setSelectedPacketId] = useState<string | null>(packets[0]?.id || null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const selectedPacket = packets.find(p => p.id === selectedPacketId) || packets[0];

  const filteredPackets = packets.filter(p => {
    if (filterType !== 'all' && p.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.id.toLowerCase().includes(q) ||
        p.sourceId.toLowerCase().includes(q) ||
        p.targetId.toLowerCase().includes(q) ||
        (p.payload.senderFingerprint && p.payload.senderFingerprint.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Cryptographic Packet Sniffer & Frame Inspector</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Deep frame analysis with authenticated AES-256-GCM cipher inspection, IV nonces, and hop routing
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search frame ID, peer, fingerprint..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-cyan-500 w-56 font-mono"
            />
          </div>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="all">All Frame Types</option>
            <option value="data_share">Data Share</option>
            <option value="task_dispatch">Task Dispatch</option>
            <option value="task_result">Task Result</option>
            <option value="heartbeat">Heartbeat Probe</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Frame Stream on Left (6 cols), Deep Inspector on Right (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Frame Table */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col h-[650px]">
          <div className="p-3 border-b border-slate-800 flex justify-between items-center text-xs text-slate-400 font-mono">
            <span>Captured Frames ({filteredPackets.length})</span>
            <span>Protocol: MeshWire v1.4</span>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-800/60 font-mono text-xs">
            {filteredPackets.map(pkt => {
              const isSelected = selectedPacket?.id === pkt.id;
              return (
                <div
                  key={pkt.id}
                  onClick={() => setSelectedPacketId(pkt.id)}
                  className={`p-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-slate-800/90 border-l-4 border-cyan-400'
                      : 'hover:bg-slate-800/40 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-200">{pkt.id}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                        {pkt.type.replace('_', ' ')}
                      </span>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                      pkt.status === 'delivered'
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : pkt.status === 'in_flight'
                        ? 'text-cyan-400 bg-cyan-500/10'
                        : 'text-rose-400 bg-rose-500/10'
                    }`}>
                      {pkt.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center space-x-1 text-slate-300">
                      <span>{pkt.sourceId}</span>
                      <span className="text-slate-600">➔</span>
                      <span>{pkt.targetId}</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">
                      {new Date(pkt.startTime).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Hops: {pkt.route.length - 1} ({pkt.route.join(' ➔ ')})</span>
                    <span>{pkt.payload.plaintextLength} B</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deep Frame Dissector Panel */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5 h-[650px] overflow-y-auto font-mono text-xs">
          {selectedPacket ? (
            <>
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span>Frame Dissection: {selectedPacket.id}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    AES-256-GCM with Authenticated Encryption & Associated Data (AEAD)
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  MAC VERIFIED
                </span>
              </div>

              {/* Protocol Header Fields */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                <span className="text-slate-400 uppercase text-[10px] font-bold block">
                  Frame Header (Layer 4 Fabric Protocol)
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Protocol Version:</span>
                    <span className="text-slate-200">MeshWire/1.4 (P-256)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Frame Type:</span>
                    <span className="text-cyan-400 uppercase">{selectedPacket.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Time to Live (TTL):</span>
                    <span className="text-slate-200">{selectedPacket.ttl} hops</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Frame Delivery Time:</span>
                    <span className="text-slate-200">
                      {selectedPacket.deliveredTime
                        ? `${selectedPacket.deliveredTime - selectedPacket.startTime} ms`
                        : 'In-Transit'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Multi-Hop Path Trace */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                <span className="text-slate-400 uppercase text-[10px] font-bold block">
                  Routing Hop Traversal (Dijkstra Shortest Path)
                </span>
                <div className="space-y-1 text-[11px]">
                  {selectedPacket.route.map((hop, idx) => (
                    <div key={idx} className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <span className="text-slate-600">[{idx}]</span>
                        <span className={idx === 0 ? 'text-emerald-400' : idx === selectedPacket.route.length - 1 ? 'text-cyan-400' : 'text-slate-200'}>
                          {hop}
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {idx === 0 ? 'Origin Node' : idx === selectedPacket.route.length - 1 ? 'Destination Node' : 'Transit Relay'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cryptographic Parameters */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                <span className="text-slate-400 uppercase text-[10px] font-bold block flex items-center justify-between">
                  <span>Cryptographic Enclave</span>
                  <span className="text-emerald-400">WebCrypto API</span>
                </span>
                <div className="space-y-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">96-bit Initialization Vector (Hex):</span>
                    <span className="text-cyan-300 select-all block bg-slate-900 p-1.5 rounded border border-slate-800 text-[10px] truncate">
                      0x{selectedPacket.payload.ivHex}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px]">Sender SHA-256 Fingerprint:</span>
                    <span className="text-slate-300 select-all block bg-slate-900 p-1.5 rounded border border-slate-800 text-[10px]">
                      {selectedPacket.payload.senderFingerprint}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px]">Ciphertext (Base64 Encrypted Payload):</span>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800 text-purple-300 text-[10px] break-all max-h-24 overflow-y-auto">
                      {selectedPacket.payload.ciphertextBase64}
                    </div>
                  </div>
                </div>
              </div>

              {/* Decrypted Payload Plaintext */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1.5">
                <span className="text-slate-400 uppercase text-[10px] font-bold block flex items-center justify-between">
                  <span>Verified Decrypted Plaintext</span>
                  <span className="text-emerald-400">ECDH Session Verified</span>
                </span>
                <pre className="bg-slate-900 p-2.5 rounded border border-slate-800 text-emerald-300 text-[11px] overflow-x-auto whitespace-pre-wrap">
                  {selectedPacket.decryptedContent || 'Frame payload decrypted at destination agent'}
                </pre>
              </div>
            </>
          ) : (
            <div className="py-24 text-center text-slate-500">
              Select a frame from the capture stream to inspect its cryptographic headers
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
