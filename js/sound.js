// ================================================================
// NEON BEAT – Sound Engine (Web Audio API hit SFX)
// ================================================================

class SoundEngine {
  constructor() {
    this._ctx = null;
    this._noiseBuffer = null;
  }

  _getCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }

  // Pre-generate a short white-noise buffer for percussion transient
  _getNoiseBuf(ctx) {
    if (this._noiseBuffer) return this._noiseBuffer;
    const sampleRate = ctx.sampleRate;
    const len = Math.ceil(sampleRate * 0.08);
    const buf = ctx.createBuffer(1, len, sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this._noiseBuffer = buf;
    return buf;
  }

  playHit(grade) {
    try {
      const ctx = this._getCtx();
      const now = ctx.currentTime;

      if (grade === 'PERFECT') {
        // Bright high-pitched ping + noise transient
        this._tone(ctx, now, 'sine', 1046, 0.30, 0.00, 0.13);
        this._tone(ctx, now, 'sine',  880, 0.15, 0.00, 0.09);
        this._noise(ctx, now, 2400, 1.2, 0.18, 0.06);
      } else {
        // Softer mid-pitched click
        this._tone(ctx, now, 'sine',  523, 0.22, 0.00, 0.10);
        this._noise(ctx, now, 1200, 1.0, 0.12, 0.05);
      }
    } catch (_) { /* audio unavailable */ }
  }

  _tone(ctx, when, type, freq, vol, attack, decay) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.001, when);
    gain.gain.linearRampToValueAtTime(vol, when + attack + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, when + attack + decay);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(when);
    osc.stop(when + attack + decay + 0.01);
  }

  _noise(ctx, when, filterFreq, q, vol, decay) {
    const src    = ctx.createBufferSource();
    src.buffer   = this._getNoiseBuf(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type  = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + decay);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(when);
    src.stop(when + decay + 0.01);
  }
}

export const soundEngine = new SoundEngine();
