// Fully synthesized ambience (no audio files): steppe wind, birds, hearth
// crackle, hoof beats and small UI cues in a pentatonic scale.

type SceneName = 'outside' | 'inside';

class AudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  wind: GainNode | null = null;
  fire: GainNode | null = null;
  noise: AudioBuffer | null = null;
  enabled = true;
  scene: SceneName = 'outside';
  birdTimer = 0;
  crackleTimer = 0;
  hoofPhase = 0;

  start() {
    if (this.ctx) {
      this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.8 : 0;
    this.master.connect(ctx.destination);

    // Brown-ish noise buffer reused by everything
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
    this.noise = buf;

    // Wind: filtered noise with a slow LFO on the filter
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 500;
    bp.Q.value = 0.6;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(bp.frequency);
    this.wind = ctx.createGain();
    this.wind.gain.value = 0.5;
    src.connect(bp).connect(this.wind).connect(this.master);
    src.start();
    lfo.start();

    // Hearth: low rumble, crackles are scheduled in update()
    const fsrc = ctx.createBufferSource();
    fsrc.buffer = buf;
    fsrc.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 180;
    this.fire = ctx.createGain();
    this.fire.gain.value = 0;
    fsrc.connect(lp).connect(this.fire).connect(this.master);
    fsrc.start();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(on ? 0.8 : 0, this.ctx.currentTime, 0.2);
  }

  setScene(s: SceneName) {
    this.scene = s;
    if (!this.ctx || !this.wind || !this.fire) return;
    const t = this.ctx.currentTime;
    this.wind.gain.setTargetAtTime(s === 'outside' ? 0.5 : 0.12, t, 0.4);
    this.fire.gain.setTargetAtTime(s === 'inside' ? 0.5 : 0, t, 0.4);
  }

  private tone(freq: number, at: number, dur: number, vol = 0.12, type: OscillatorType = 'sine', slideTo?: number) {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(this.master);
    o.start(at);
    o.stop(at + dur + 0.05);
  }

  private burst(at: number, dur: number, vol: number, freq: number, type: BiquadFilterType = 'bandpass') {
    if (!this.ctx || !this.master || !this.noise) return;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(at, Math.random() * 2);
    s.stop(at + dur + 0.02);
  }

  bird() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const base = 2600 + Math.random() * 1600;
    const n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      this.tone(base, t + i * 0.11, 0.08, 0.025, 'sine', base * (1.2 + Math.random() * 0.3));
    }
  }

  /** Called every frame. dayness 0..1, hoofSpeed in m/s while riding. */
  update(dt: number, dayness: number, hoofSpeed: number) {
    if (!this.ctx || !this.enabled) return;
    this.birdTimer -= dt;
    if (this.scene === 'outside' && this.birdTimer <= 0) {
      this.birdTimer = 3 + Math.random() * 6;
      if (Math.random() < dayness) this.bird();
    }
    this.crackleTimer -= dt;
    if (this.scene === 'inside' && this.crackleTimer <= 0) {
      this.crackleTimer = 0.05 + Math.random() * 0.4;
      this.burst(this.ctx.currentTime, 0.04, 0.3 * Math.random(), 1800 + Math.random() * 2500, 'highpass');
    }
    if (hoofSpeed > 0.5) {
      const rate = hoofSpeed > 9 ? 2.6 : 1.7; // gallop vs walk cadence (beats/s)
      this.hoofPhase += dt * rate;
      if (this.hoofPhase >= 1) {
        this.hoofPhase -= 1;
        const t = this.ctx.currentTime;
        const pattern = hoofSpeed > 9 ? [0, 0.07, 0.15] : [0, 0.25];
        for (const p of pattern) this.burst(t + p, 0.09, 0.35, 140, 'lowpass');
      }
    }
  }

  click() {
    if (!this.ctx) return;
    this.tone(880, this.ctx.currentTime, 0.12, 0.05, 'triangle');
  }

  tick() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(587, t, 0.25, 0.06, 'triangle');
    this.tone(880, t + 0.09, 0.35, 0.05, 'triangle');
  }

  success() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Major pentatonic phrase
    [392, 440, 587, 659, 784].forEach((f, i) => this.tone(f, t + i * 0.12, 0.7, 0.06, 'triangle'));
  }

  pour() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 6; i++) this.burst(t + i * 0.08, 0.25, 0.25, 900 + Math.random() * 900);
  }

  bubble() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(300 + Math.random() * 300, t, 0.08, 0.04, 'sine', 700);
  }
}

export const audio = new AudioEngine();
