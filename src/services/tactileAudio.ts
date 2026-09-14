/**
 * Tactile Audio & Haptic Feedback Engine
 * Utilizes Web Audio API (zero external assets needed) and Navigator Vibration API
 * to deliver crisp, realistic tactile interface sounds and physical vibration.
 */

class TactileAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Lazy AudioContext initialization on first user interaction
  }

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public triggerHaptic(pattern: number | number[] = 25) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignored if user hasn't interacted or unsupported
      }
    }
  }

  /** Subtle tactile micro-click on button/node touch */
  public playClick(pitch: number = 1200) {
    const ctx = this.getContext();
    if (!ctx) return;
    this.triggerHaptic(12);

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(pitch * 0.4, ctx.currentTime + 0.025);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch {
      // AudioContext error handling
    }
  }

  /** Resonant tactile pulse for pattern node connection */
  public playNodeConnect(index: number = 0) {
    const ctx = this.getContext();
    if (!ctx) return;
    this.triggerHaptic(20);

    const baseFreqs = [440, 523.25, 587.33, 659.25, 783.99, 880, 987.77, 1046.5, 1174.66];
    const freq = baseFreqs[index % baseFreqs.length];

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.11);
    } catch {}
  }

  /** Tactical laser beam / directed energy suppression pulse */
  public playLaserShot() {
    const ctx = this.getContext();
    if (!ctx) return;
    this.triggerHaptic(25);

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.19);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  }

  /** Tactical sonar/radar RF ping tone */
  public playPing(freq: number = 880) {
    const ctx = this.getContext();
    if (!ctx) return;
    this.triggerHaptic(18);

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.04);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.8, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch {}
  }

  /** Continuous or ticking biometric laser scan sweep */
  public playScanTick() {
    const ctx = this.getContext();
    if (!ctx) return;
    this.triggerHaptic(15);

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.03);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }

  /** Biometric verification success chime */
  public playVerificationSuccess() {
    const ctx = this.getContext();
    if (!ctx) return;
    this.triggerHaptic([30, 40, 60]);

    try {
      const chords = [523.25, 659.25, 783.99, 1046.5]; // C Major arpeggio
      chords.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + idx * 0.06;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.1, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.32);
      });
    } catch {}
  }

  /** Success notification chime */
  public playSuccess() {
    this.playVerificationSuccess();
  }

  /** Tactical warning / alert chirp */
  public playWarning() {
    const ctx = this.getContext();
    if (!ctx) return;
    this.triggerHaptic([40, 30, 80]);

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.19);
    } catch {}
  }

  /** Biometric pattern failure buzz */
  public playDenied() {
    const ctx = this.getContext();
    if (!ctx) return;
    this.triggerHaptic([60, 50, 60]);

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.setValueAtTime(110, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch {}
  }

  /** Emergency tactical alarm / motor cutoff klaxon */
  public playAlarm() {
    const ctx = this.getContext();
    if (!ctx) return;
    this.triggerHaptic([100, 50, 100, 50, 150]);

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1400, ctx.currentTime + 0.15);
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch {}
  }

  /** Heavy mechanical vault relay lock/unlock sound */
  public playVaultServo() {
    const ctx = this.getContext();
    if (!ctx) return;
    this.triggerHaptic([40, 80, 40]);

    try {
      // Sub-bass thump
      const oscLow = ctx.createOscillator();
      const gainLow = ctx.createGain();
      oscLow.type = 'sine';
      oscLow.frequency.setValueAtTime(90, ctx.currentTime);
      oscLow.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.18);
      gainLow.gain.setValueAtTime(0.18, ctx.currentTime);
      gainLow.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      oscLow.connect(gainLow);
      gainLow.connect(ctx.destination);
      oscLow.start();
      oscLow.stop(ctx.currentTime + 0.22);

      // High relay metallic latch
      const oscHigh = ctx.createOscillator();
      const gainHigh = ctx.createGain();
      oscHigh.type = 'triangle';
      oscHigh.frequency.setValueAtTime(2400, ctx.currentTime + 0.08);
      oscHigh.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.14);
      gainHigh.gain.setValueAtTime(0.08, ctx.currentTime + 0.08);
      gainHigh.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      oscHigh.connect(gainHigh);
      gainHigh.connect(ctx.destination);
      oscHigh.start(ctx.currentTime + 0.08);
      oscHigh.stop(ctx.currentTime + 0.2);
    } catch {}
  }
}

export const tactileAudio = new TactileAudioEngine();
