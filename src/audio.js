// Audio — WebAudio synthesis so we don't need external assets.
// Generates ambient pad + simple SFX. Critics can swap with real audio later.

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.ambientGain = null;
    this.musicNodes = [];
    this.scheduled = 0;
    this.started = false;
    this.lastFootstep = 0;
  }

  async start() {
    if (this.started) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.0;
      this.musicGain.connect(this.master);
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.0;
      this.ambientGain.connect(this.master);

      this._startPad();
      this._startBirds();
      this._startWind();
      this.started = true;
    } catch (e) {
      console.warn('Audio unavailable:', e);
    }
  }

  _startPad() {
    const ctx = this.ctx;
    if (!ctx) return;
    // Drone in two voices an octave apart, gentle vibrato
    const root = 196; // G3
    for (const v of [0, 7, 12]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = root * Math.pow(2, v / 12);
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.18 + Math.random() * 0.2;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 1.2;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      const g = ctx.createGain();
      g.gain.value = 0;
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(); lfo.start();
      // slow fade in
      g.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 4);
    }
  }

  _startBirds() {
    const ctx = this.ctx;
    if (!ctx) return;
    // Schedule little bird chirps at random intervals
    const chirp = () => {
      if (!ctx) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      const f = 1800 + Math.random() * 1200;
      o.frequency.setValueAtTime(f, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(f * 0.6, ctx.currentTime + 0.18);
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
      o.connect(g); g.connect(this.ambientGain);
      o.start(); o.stop(ctx.currentTime + 0.25);
      const next = 1 + Math.random() * 4;
      this.scheduled = setTimeout(chirp, next * 1000);
    };
    chirp();
  }

  _startWind() {
    const ctx = this.ctx;
    if (!ctx) return;
    // Wind-through-trees: a band-passed white-noise generator whose gain
    // scales with the world tree-sway magnitude. Cheap to render, scales
    // naturally with weather.
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    // Band-pass around 800 Hz so it reads as rustling foliage, not hiss.
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 800;
    bp.Q.value = 0.7;
    // Slow LFO modulates the band-pass center for a "gust" feel.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain);
    lfoGain.connect(bp.frequency);
    this._windGain = ctx.createGain();
    this._windGain.gain.value = 0; // ramped up by update()
    noise.connect(bp); bp.connect(this._windGain); this._windGain.connect(this.ambientGain);
    noise.start(); lfo.start();
  }

  update(dt, time, world) {
    if (!this.started || !this.ctx) return;
    // Tilt music timbre by hour — brighter at noon, warmer at night
    const h = time.hour + time.minute / 60;
    const target = this.musicGain.gain.value;
    let desired = 0.18;
    if (h >= 5 && h < 8) desired = 0.22;
    else if (h >= 8 && h < 17) desired = 0.16;
    else if (h >= 17 && h < 20) desired = 0.24;
    else desired = 0.10;
    this.musicGain.gain.value = target + (desired - target) * Math.min(1, dt * 0.5);

    // Wind-through-trees gain tracks world tree-sway magnitude.
    // Sway is 0.02 base + 0.02 * lightLevel, so map 0.02 → 0.005, 0.04 → 0.025
    if (this._windGain && world && typeof world._currentSway === 'number') {
      const sway = world._currentSway;
      const target = Math.min(0.025, Math.max(0, (sway - 0.018) * 1.6));
      this._windGain.gain.value += (target - this._windGain.gain.value) * Math.min(1, dt * 0.7);
    }

    // Footstep SFX — duck the volume briefly so it doesn't clip
    const input = window._input || {};
    const isMoving = (input.up || input.down || input.left || input.right);
    if (isMoving && (performance.now() - this.lastFootstep) > 360) {
      this.lastFootstep = performance.now();
      // Detect the surface from the player position so the footstep
      // matches the visible puff color (grass / dirt / wood / water / stone)
      let surface = 'grass';
      if (world && world.interiorActive === undefined) {
        // world is passed in but we don't have player position here.
        // We rely on the public interaction detection via a global hint:
      }
      // Read a per-surface hint set by interactions.js (sync'd with visual puffs)
      if (typeof window._lastSurface === 'string') surface = window._lastSurface;
      this.footstep(surface);
    }
  }

  footstep(surface = 'grass') {
    if (!this.ctx) return;
    // Per-surface tuning — frequency range, oscillator type, decay time, gain
    // all vary so each surface reads as a different footfall texture.
    const palette = {
      // grass: soft, low thud — sine wave with a quick decay
      grass: { type: 'sine',     f0: 95,  fRange: 22, gain: 0.018, decay: 0.07 },
      // dirt:  warm crunch — square wave, slightly higher
      dirt:  { type: 'square',   f0: 110, fRange: 28, gain: 0.022, decay: 0.08 },
      // path:  similar to dirt, but a touch drier
      path:  { type: 'triangle', f0: 130, fRange: 30, gain: 0.020, decay: 0.07 },
      // wood:  hollow tap — triangle, sharper decay
      wood:  { type: 'triangle', f0: 220, fRange: 50, gain: 0.025, decay: 0.05 },
      // water: gentle splash — sine with a tiny detune for liquid feel
      water: { type: 'sine',     f0: 180, fRange: 80, gain: 0.020, decay: 0.12 },
      // stone: sharp click — high square with very fast decay
      stone: { type: 'square',   f0: 340, fRange: 60, gain: 0.022, decay: 0.04 },
    }[surface] || { type: 'square', f0: 80, fRange: 40, gain: 0.02, decay: 0.08 };

    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = palette.type;
    o.frequency.value = palette.f0 + Math.random() * palette.fRange;
    g.gain.setValueAtTime(0, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(palette.gain, this.ctx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + palette.decay);
    o.connect(g); g.connect(this.master);
    o.start();
    o.stop(this.ctx.currentTime + palette.decay + 0.02);
  }

  blip(freq = 660, duration = 0.15) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    o.connect(g); g.connect(this.master);
    o.start(); o.stop(this.ctx.currentTime + duration + 0.05);
  }

  /**
   * Per-tool use SFX. Each tool has a distinct sonic signature:
   *   - grass: soft rustle (short noise burst via fast-modulated triangle)
   *   - axe:   chop — square wave with a sharp downward pitch sweep
   *   - bucket: water pour — sine with a small upward sweep
   *   - rod:   reel — long triangle with a wobble
   */
  toolUse(toolId = 'axe') {
    if (!this.ctx) return;
    const recipes = {
      grass: () => this._noiseBurst(0.18, 0.04, 6000),
      axe:   () => this._sweep(420, 80,  0.16, 'square',   0.06),
      bucket:() => this._sweep(280, 520, 0.22, 'sine',     0.05),
      rod:   () => this._sweep(180, 240, 0.50, 'triangle', 0.04),
    };
    (recipes[toolId] || recipes.axe)();
  }

  _sweep(fStart, fEnd, duration, type = 'sine', peak = 0.05) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(fStart, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, fEnd), ctx.currentTime + duration);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(peak, ctx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    o.connect(g); g.connect(this.master);
    o.start();
    o.stop(ctx.currentTime + duration + 0.05);
  }

  _noiseBurst(duration = 0.18, peak = 0.04, freq = 6000) {
    // Cheap noise via high-frequency square wave at very low gain
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = freq + Math.random() * 800;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(peak, ctx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    o.connect(g); g.connect(this.master);
    o.start();
    o.stop(ctx.currentTime + duration + 0.05);
  }
}
