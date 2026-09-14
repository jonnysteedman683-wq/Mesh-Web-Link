import React, { useState } from 'react';
import { Download, Smartphone, CheckCircle, X, ShieldAlert, WifiOff } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { tactileAudio } from '../services/tactileAudio';

interface PWAInstallButtonProps {
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already running as an installed standalone PWA, suppress button
  if (isInstalled && !installSuccess) {
    return null;
  }

  const handleInstall = async () => {
    tactileAudio.playClick(1000);
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      tactileAudio.playVerificationSuccess();
    }
  };

  const handleOpenIOSGuide = () => {
    tactileAudio.playClick(800);
    setShowIOSGuide(true);
  };

  return (
    <>
      {isInstallable && (
        <button
          onClick={handleInstall}
          title="Install Tactical PWA for Standalone & Offline Operation"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:text-cyan-200 text-xs font-mono font-medium transition-all shadow-xs cursor-pointer ${className}`}
        >
          <Download className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Install PWA</span>
        </button>
      )}

      {isIOS && !isInstallable && (
        <button
          onClick={handleOpenIOSGuide}
          title="Install on iOS Home Screen"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-mono font-medium transition-all cursor-pointer ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
          <span>iOS Install</span>
        </button>
      )}

      {/* iOS Installation Instructions Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-cyan-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100 font-mono">
                  Install PWA on iOS / iPad
                </h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 font-sans leading-relaxed">
              <p>To operate Mesh Link in air-gapped standalone field mode on iOS Safari:</p>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2 font-mono text-[11px]">
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[10px]">1</span>
                  <span>Tap the <strong>Share</strong> button (box with upward arrow) in the Safari toolbar.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[10px]">2</span>
                  <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[10px]">3</span>
                  <span>Tap <strong>Add</strong> to launch with dedicated standalone cache.</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold py-2 text-xs font-mono transition-all cursor-pointer shadow-xs"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
