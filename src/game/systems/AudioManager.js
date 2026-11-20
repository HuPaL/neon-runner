/**
 * Procedural audio (Web Audio API). No audio files are shipped, so there are
 * no licensing concerns and nothing that can fail to load.
 *
 * Autoplay policy: the AudioContext is created lazily inside the first real
 * user gesture (see attachUnlockListeners), so browsers never block or warn.
 * The game is fully playable when audio is muted or unavailable.
 */

const UNLOCK_EVENTS = ['pointerup', 'touchend', 'keydown', 'click'];
const NOTE = (n) => 440 * 2 ** ((n - 69) / 12); // MIDI -> Hz

// A-minor synthwave loop, 16 sixteenth-notes per bar.
const BPM = 118;
const STEP = 60 / BPM / 4;
const BASS = [33, 0, 33, 0, 33, 0, 45, 0, 36, 0, 36, 0, 36, 0, 48, 0, 31, 0, 31, 0, 31, 0, 43, 0, 29, 0, 29, 0, 29, 0, 41, 0];
const ARP = [69, 72, 76, 72, 69, 72, 76, 81, 67, 71, 74, 71, 67, 71, 74, 79, 65, 69, 72, 69, 65, 69, 72, 77, 64, 67, 71, 67, 64, 67, 71, 76];

export class AudioManager {
  /** @param {{get:Function,set:Function}} storage */
  constructor(storage) {
    this.storage = storage;
    this.muted = Boolean(storage.get('muted'));
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.noiseBuffer = null;
    this.unlocked = false;
    this.musicWanted = false;
    this.musicTimer = null;
    this.nextStepTime = 0;
    this.step = 0;
    this.listeners = new Set();
    this._onUnlock = this._onUnlock.bind(this);
    this._onVisibility = this._onVisibility.bind(this);
  }

  /** Registers one-shot gesture listeners that create/resume the AudioContext. */
  attachUnlockListeners() {
    if (typeof window === 'undefined') return;
    for (const ev of UNLOCK_EVENTS) window.addEventListener(ev, this._onUnlock, { capture: true, passive: true });
    document.addEventListener('visibilitychange', this._onVisibility);
  }

  _detachUnlockListeners() {
    for (const ev of UNLOCK_EVENTS) window.removeEventListener(ev, this._onUnlock, { capture: true });
  }

  _onUnlock() {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) {
          this._detachUnlockListeners();
          return; // audio unsupported: silently stay silent
        }
        this.ctx = new Ctor();
        this._buildGraph();
      }
      // Listeners stay attached for the whole session: iOS Safari can move a running
      // context to 'interrupted' (call, alarm) and only a new gesture can resume it.
      // The running case returns immediately, so the cost is negligible.
      if (this.ctx.state === 'running') {
        if (!this.unlocked) {
          this.unlocked = true;
          if (this.musicWanted && !this.muted) this._startScheduler();
        }
        return;
      }
      Promise.resolve(this.ctx.resume())
        .then(() => {
          if (this.ctx.state !== 'running') return;
          this.unlocked = true;
          if (this.musicWanted && !this.muted) this._startScheduler();
        })
        .catch(() => {});
    } catch {
      this._detachUnlockListeners();
    }
  }

  _onVisibility() {
    if (!this.ctx || !this.unlocked) return;
    if (document.hidden) this.ctx.suspend().catch(() => {});
    else this.ctx.resume().catch(() => {});
  }

  _buildGraph() {
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.6;
    this.master.connect(ctx.destination);
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.32;
    this.musicGain.connect(this.master);
    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);
    const len = ctx.sampleRate * 0.5;
    this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  get ready() {
    return Boolean(this.ctx && this.unlocked && !this.muted);
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    this.storage.set('muted', this.muted);
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.6;
    if (this.muted) this._stopScheduler();
    else if (this.musicWanted && this.unlocked) this._startScheduler();
    for (const fn of this.listeners) fn(this.muted);
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /** Lowers music while the game is paused. */
  duckMusic(ducked) {
    if (!this.musicGain) return;
    this.musicGain.gain.setTargetAtTime(ducked ? 0.08 : 0.32, this.ctx.currentTime, 0.05);
  }

  // ---------------------------------------------------------------- music

  startMusic() {
    this.musicWanted = true;
    if (this.unlocked && !this.muted) this._startScheduler();
  }

  stopMusic() {
    this.musicWanted = false;
    this._stopScheduler();
  }

  _startScheduler() {
    if (this.musicTimer !== null || !this.ctx) return;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.musicTimer = setInterval(() => this._schedule(), 40);
  }

  _stopScheduler() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  _schedule() {
    const ctx = this.ctx;
    // If the tab was throttled and we fell behind, skip ahead instead of bursting.
    if (this.nextStepTime < ctx.currentTime - 0.5) this.nextStepTime = ctx.currentTime + 0.05;
    while (this.nextStepTime < ctx.currentTime + 0.18) {
      this._playStep(this.step, this.nextStepTime);
      this.step = (this.step + 1) % 32;
      this.nextStepTime += STEP;
    }
  }

  _playStep(step, t) {
    if (step % 4 === 0) this._kick(t);
    if (step % 4 === 2) this._hat(t);
    const bass = BASS[step];
    if (bass) this._tone(NOTE(bass), t, STEP * 1.8, 'sawtooth', 0.5, this.musicGain, 600);
    this._tone(NOTE(ARP[step]), t, STEP * 0.9, 'triangle', 0.22, this.musicGain, 2400);
  }

  _kick(t) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g).connect(this.musicGain);
    o.start(t);
    o.stop(t + 0.18);
  }

  _hat(t) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    src.connect(hp).connect(g).connect(this.musicGain);
    src.start(t);
    src.stop(t + 0.06);
  }

  _tone(freq, t, dur, type, vol, dest, cutoff = 0) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (cutoff) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = cutoff;
      o.connect(f);
      node = f;
    }
    node.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  _sweep(from, to, dur, type, vol, delay = 0) {
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // ------------------------------------------------------------------ sfx

  play(name) {
    if (!this.ready) return;
    switch (name) {
      case 'jump':
        this._sweep(280, 620, 0.11, 'square', 0.18);
        break;
      case 'doubleJump':
        this._sweep(420, 960, 0.14, 'square', 0.18);
        break;
      case 'crystal':
        this._sweep(880, 1320, 0.09, 'sine', 0.3);
        this._sweep(1320, 1760, 0.12, 'sine', 0.25, 0.07);
        break;
      case 'hit': {
        this._sweep(220, 40, 0.45, 'sawtooth', 0.5);
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.6, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
        src.connect(g).connect(this.sfxGain);
        src.start();
        src.stop(this.ctx.currentTime + 0.45);
        break;
      }
      case 'click':
        this._sweep(660, 880, 0.04, 'square', 0.12);
        break;
      case 'levelUp':
        [0, 0.09, 0.18, 0.27].forEach((d, i) => this._sweep(NOTE(72 + i * 4), NOTE(72 + i * 4) * 1.01, 0.14, 'square', 0.16, d));
        break;
      default:
        break;
    }
  }

  destroy() {
    this._stopScheduler();
    if (typeof window !== 'undefined') {
      this._detachUnlockListeners();
      document.removeEventListener('visibilitychange', this._onVisibility);
    }
    this.listeners.clear();
    if (this.ctx) this.ctx.close().catch(() => {});
  }
}
