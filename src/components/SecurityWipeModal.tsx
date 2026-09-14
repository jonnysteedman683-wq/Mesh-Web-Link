import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, KeyRound, Trash2, CheckCircle2, Lock, Flame } from 'lucide-react';

interface SecurityWipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmWipe: () => Promise<void>;
  targetNodeCount?: number;
}

export const SecurityWipeModal: React.FC<SecurityWipeModalProps> = ({
  isOpen,
  onClose,
  onConfirmWipe,
  targetNodeCount = 6,
}) => {
  const [confirmationInput, setConfirmationInput] = useState<string>('');
  const [isWiping, setIsWiping] = useState<boolean>(false);
  const [wipeSuccess, setWipeSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const REQUIRED_PASSPHRASE = 'ZEROIZE';

  const handleExecuteWipe = async () => {
    if (confirmationInput.trim().toUpperCase() !== REQUIRED_PASSPHRASE) {
      setError(`Passphrase mismatch. You must type "${REQUIRED_PASSPHRASE}" to proceed.`);
      return;
    }

    setIsWiping(true);
    setError(null);

    try {
      await onConfirmWipe();
      setWipeSuccess(true);
      setTimeout(() => {
        setWipeSuccess(false);
        setConfirmationInput('');
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err?.message || 'Failed to execute security wipe.');
      setIsWiping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-rose-600/60 rounded-2xl p-6 max-w-lg w-full shadow-2xl shadow-rose-950/50 space-y-5 text-zinc-100 relative overflow-hidden">
        {/* Top Warning Glow Header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 animate-pulse" />

        <div className="flex items-start space-x-3.5 border-b border-zinc-800 pb-4">
          <div className="p-3 bg-rose-950/80 border border-rose-600/40 rounded-xl text-rose-400 shrink-0">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-rose-400 uppercase tracking-wider font-tactical">
                Protocol: Emergency Security Wipe
              </h2>
              <span className="px-1.5 py-0.5 text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-700/60 rounded font-bold">
                DESTRUCTIVE
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Zeroize cryptographic keys • Reset all node associations • Purge packet buffers
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isWiping}
            className="text-zinc-500 hover:text-zinc-300 text-lg font-bold p-1 cursor-pointer disabled:opacity-30"
          >
            &times;
          </button>
        </div>

        {/* Warning Body Description */}
        <div className="space-y-3 font-mono text-xs text-zinc-300">
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3.5 space-y-2 text-rose-200">
            <div className="flex items-center space-x-2 text-rose-400 font-bold uppercase">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Critical Security Advisory</span>
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-300">
              Executing a Security Wipe immediately revokes all authenticated mesh links, regenerates new cryptographic keypairs (Ed25519 & ECDH), zeroizes pending task queues, purges the in-memory CRDT blackboard, and disconnects all external node peers.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">TARGET NODES</span>
              <span className="font-bold text-zinc-200">{targetNodeCount} Mesh Nodes to Zeroize</span>
            </div>
            <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">CRYPTOGRAPHIC IMPACT</span>
              <span className="font-bold text-rose-400">Keys Re-keyed / Purged</span>
            </div>
          </div>

          {/* Passphrase Input Confirmation */}
          <div className="space-y-2 pt-2">
            <label className="block text-zinc-400 text-xs">
              Type <span className="text-rose-400 font-bold tracking-wider">{REQUIRED_PASSPHRASE}</span> below to confirm cryptographic zeroization:
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => {
                  setConfirmationInput(e.target.value.toUpperCase());
                  setError(null);
                }}
                placeholder="ZEROIZE"
                disabled={isWiping || wipeSuccess}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-9 pr-3 py-2.5 text-xs font-mono font-bold tracking-widest text-zinc-100 uppercase focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-zinc-700 disabled:opacity-50"
              />
            </div>
            {error && (
              <p className="text-[11px] text-rose-400 font-semibold flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isWiping}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 font-mono"
          >
            Cancel / Abort
          </button>

          <button
            type="button"
            onClick={handleExecuteWipe}
            disabled={confirmationInput.trim() !== REQUIRED_PASSPHRASE || isWiping || wipeSuccess}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer font-tactical shadow-lg ${
              wipeSuccess
                ? 'bg-emerald-600 text-white shadow-emerald-950'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {isWiping ? (
              <>
                <Flame className="w-4 h-4 animate-spin text-amber-300" />
                <span>Zeroizing Fabric...</span>
              </>
            ) : wipeSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Fabric Zeroized!</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Authorize Security Wipe</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
