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

    // Footstep SFX — duck the volume briefly so it doesn't clip
    const input = window._input || {};
    const isMoving = (input.up || input.down || input.left || input.right);
    if (isMoving && (performance.now() - this.lastFootstep) > 360) {
      this.lastFootstep = performance.now();
      this.footstep();
    }
  }

  footstep() {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'square';
    o.frequency.value = 80 + Math.random() * 40;
    g.gain.setValueAtTime(0, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.02, this.ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.08);
    o.connect(g); g.connect(this.master);
    o.start(); o.stop(this.ctx.currentTime + 0.1);
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
}
