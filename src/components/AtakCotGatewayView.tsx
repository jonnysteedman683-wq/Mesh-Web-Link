import React, { useState, useEffect } from 'react';
import { Share2, DownloadCloud, UploadCloud, Copy, Check, Radio, Crosshair, Shield, Play, Pause, FileCode, CheckCircle2, AlertCircle } from 'lucide-react';
import { atakCotGatewayService } from '../services/atakCotGatewayService';
import { AtakCotEvent, AtakCotGatewayState } from '../types';
import { tactileAudio } from '../services/tactileAudio';

interface AtakCotGatewayViewProps {
  onNotify?: (msg: string) => void;
}

export const AtakCotGatewayView: React.FC<AtakCotGatewayViewProps> = ({ onNotify }) => {
  const [state, setState] = useState<AtakCotGatewayState>(atakCotGatewayService.getState());
  const [selectedEvent, setSelectedEvent] = useState<AtakCotEvent | null>(null);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const [newMarkerCallsign, setNewMarkerCallsign] = useState<string>('');
  const [newMarkerRemarks, setNewMarkerRemarks] = useState<string>('');
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);

  useEffect(() => {
    const unsub = atakCotGatewayService.subscribe(() => {
      setState(atakCotGatewayService.getState());
    });
    return () => unsub();
  }, []);

  const handleToggleStreaming = () => {
    tactileAudio.playClick();
    const active = atakCotGatewayService.toggleStreaming();
    if (onNotify) onNotify(active ? 'Cursor-on-Target (CoT) multicast broadcast resumed.' : 'CoT stream paused.');
  };

  const handleCopyXml = (evt: AtakCotEvent) => {
    tactileAudio.playClick(1100);
    const xml = evt.rawXml || atakCotGatewayService.generateCotXml(evt);
    navigator.clipboard.writeText(xml);
    setCopiedUid(evt.uid);
    setTimeout(() => setCopiedUid(null), 2500);
    if (onNotify) onNotify(`Copied Cursor-on-Target XML for [${evt.detail.callsign}]`);
  };

  const handleExportZip = async () => {
    tactileAudio.playClick();
    setIsExportingZip(true);
    try {
      const zipBlob = await atakCotGatewayService.exportAtakMissionPackageZip();
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ATAK_Mission_Package_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      if (onNotify) onNotify('Exported full ATAK Mission Package (.zip with MANIFEST/manifest.xml).');
    } catch (err) {
      console.error(err);
      if (onNotify) onNotify('Failed to create ATAK mission package zip.');
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleExportConcatenatedXml = () => {
    tactileAudio.playClick();
    const xml = atakCotGatewayService.exportConcatenatedCotXml();
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tactical_cot_stream_${Date.now()}.cot`;
    a.click();
    URL.revokeObjectURL(a.href);
    if (onNotify) onNotify('Downloaded raw .cot XML events file.');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    tactileAudio.playClick();
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = atakCotGatewayService.parseAndImportCotXml(text);
        if (onNotify) onNotify(`Imported CoT event: ${imported.detail.callsign} (${imported.type})`);
      } catch (err: any) {
        console.error(err);
        if (onNotify) onNotify(`CoT Import error: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleBroadcastMarker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMarkerCallsign.trim()) return;

    tactileAudio.playPing();
    const lat = 37.7760 + (Math.random() - 0.5) * 0.008;
    const lon = -122.4180 + (Math.random() - 0.5) * 0.008;

    const event = atakCotGatewayService.broadcastCustomEvent(
      newMarkerCallsign.trim(),
      lat,
      lon,
      50,
      'a-f-G-U-C',
      newMarkerRemarks.trim() || 'Tactical Team Marker'
    );

    setNewMarkerCallsign('');
    setNewMarkerRemarks('');
    if (onNotify) onNotify(`Broadcasted CoT target: ${event.detail.callsign}`);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-400" />
            <span>ATAK / Cursor-on-Target (CoT) Gateway</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700">
              DoD MIL-STD XML
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Interoperability broker for ATAK-CIV, WinTAK, and TAK Server multicast UDP streams.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleToggleStreaming}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              state.isStreaming
                ? 'bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300'
                : 'bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-400'
            }`}
          >
            {state.isStreaming ? <Pause className="w-3.5 h-3.5 text-emerald-400" /> : <Play className="w-3.5 h-3.5" />}
            <span>{state.isStreaming ? 'Stream Active (Multicast)' : 'Stream Paused'}</span>
          </button>

          <button
            onClick={handleExportZip}
            disabled={isExportingZip}
            className="px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <DownloadCloud className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isExportingZip ? 'Packing ZIP...' : 'Export Mission Package (.zip)'}</span>
          </button>

          <button
            onClick={handleExportConcatenatedXml}
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
            <span>Raw .cot</span>
          </button>

          <label className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer">
            <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import .cot</span>
            <input
              type="file"
              accept=".cot,.xml"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Network Broker Telemetry Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-500 uppercase font-bold">Multicast Channel</div>
          <div className="text-sm font-bold text-white flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>{state.multicastGroup}</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-500 uppercase font-bold">TAK Server Gateway</div>
          <div className="text-sm font-bold text-cyan-300 flex items-center justify-between">
            <span className="truncate">{state.takServerAddress}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              TLS 8089
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-500 uppercase font-bold">Connected TAK Clients</div>
          <div className="text-sm font-bold text-emerald-300 flex items-center gap-2">
            <span>{state.connectedClients} Handhelds</span>
            <span className="text-[10px] text-slate-500">(ATAK-CIV / WinTAK)</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-500 uppercase font-bold">CoT Throughput</div>
          <div className="text-sm font-bold text-slate-200 flex items-center gap-3">
            <span>TX: <strong className="text-cyan-400">{state.eventsSent}</strong></span>
            <span>RX: <strong className="text-emerald-400">{state.eventsReceived}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: CoT Events List + Live XML Inspector & Marker Broadcast */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Active Cursor-on-Target Tracks */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase font-bold text-slate-300 flex items-center gap-2 tracking-wider">
              <Crosshair className="w-4 h-4 text-emerald-400" />
              <span>Active CoT Tracks ({state.latestEvents.length})</span>
            </h3>
            <span className="text-[10px] text-slate-500">Click to inspect CoT XML</span>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {state.latestEvents.map(evt => {
              const isSelected = selectedEvent?.uid === evt.uid;
              const isFriendly = evt.detail.classification === 'FRIENDLY';
              const isHostile = evt.detail.classification === 'HOSTILE';

              return (
                <div
                  key={evt.uid}
                  onClick={() => setSelectedEvent(isSelected ? null : evt)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-950/60 border-emerald-500 shadow-md shadow-emerald-950/50'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        isFriendly ? 'bg-emerald-400' : isHostile ? 'bg-rose-500 animate-ping' : 'bg-amber-400'
                      }`} />
                      <span className="font-bold text-sm text-white">{evt.detail.callsign}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {evt.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        isFriendly
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : isHostile
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {evt.detail.classification || 'TRACK'}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyXml(evt);
                        }}
                        className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-800 cursor-pointer"
                        title="Copy XML"
                      >
                        {copiedUid === evt.uid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 mt-1.5">{evt.detail.remarks}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-900 text-[10px] text-slate-400">
                    <div>
                      <span className="text-slate-500">Lat:</span>{' '}
                      <strong className="text-slate-200">{evt.point.lat.toFixed(5)}°</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Lon:</span>{' '}
                      <strong className="text-slate-200">{evt.point.lon.toFixed(5)}°</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">HAE Alt:</span>{' '}
                      <strong className="text-cyan-300">{evt.point.hae.toFixed(0)}m</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Speed:</span>{' '}
                      <strong className="text-amber-300">{evt.detail.speedMps ? `${evt.detail.speedMps.toFixed(1)} m/s` : 'Stationary'}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: CoT XML Inspector & Broadcast Custom Target */}
        <div className="lg:col-span-5 space-y-4">
          {/* Custom Marker Composer */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Broadcast Tactical CoT Target
              </span>
            </div>

            <form onSubmit={handleBroadcastMarker} className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Target Callsign</label>
                <input
                  type="text"
                  value={newMarkerCallsign}
                  onChange={e => setNewMarkerCallsign(e.target.value)}
                  placeholder="e.g. OP-CHECKPOINT-BRAVO"
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase">Tactical Remarks</label>
                <input
                  type="text"
                  value={newMarkerRemarks}
                  onChange={e => setNewMarkerRemarks(e.target.value)}
                  placeholder="e.g. Ingress rally point, cleared by drone swarm"
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={!newMarkerCallsign.trim()}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-40 shadow-md shadow-emerald-600/30"
              >
                Transmit CoT Target into Multicast Stream
              </button>
            </form>
          </div>

          {/* CoT XML Inspector */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Cursor-on-Target XML Inspector
              </span>
              <span className="text-[10px] text-slate-400">
                {selectedEvent ? selectedEvent.detail.callsign : 'Select track on left'}
              </span>
            </div>

            <pre className="p-2.5 rounded-lg bg-black text-[10px] text-emerald-400 font-mono overflow-x-auto max-h-[160px] select-all leading-tight">
              {selectedEvent 
                ? (selectedEvent.rawXml || atakCotGatewayService.generateCotXml(selectedEvent))
                : (state.latestEvents[0] ? (state.latestEvents[0].rawXml || atakCotGatewayService.generateCotXml(state.latestEvents[0])) : '<!-- No events -->')}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
