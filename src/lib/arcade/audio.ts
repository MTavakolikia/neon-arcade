// ─── Neon Arcade · Web Audio engine ──────────────────────────────────────────
// Everything is synthesized live: layered procedural BGM + game SFX.
// No audio files, no downloads — pure oscillators, noise and envelopes.

export type MusicProfile = 'off' | 'menu' | 'game' | 'streak' | 'victory';

type LayerName = 'bass' | 'arp' | 'pad' | 'drums';

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12); // midi → Hz

// A-minor progression: Am — F — C — G (midi roots)
const CHORD_ROOTS = [57, 53, 60, 55];
const CHORDS: number[][] = [
  [57, 60, 64], // Am
  [53, 57, 60], // F
  [55, 60, 64], // C  (keep smooth voice leading)
  [55, 59, 62], // G
];
const ARP_PATTERNS = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 3, 0, 2, 1, 2]; // indices into chord+octaves

class ArcadeAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private arpFilter: BiquadFilterNode | null = null;
  private layers: Partial<Record<LayerName, GainNode>> = {};
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextStepTime = 0;
  private profile: MusicProfile = 'off';
  private lastProfile: MusicProfile = 'menu';

  musicOn = true;
  sfxOn = true;
  hapticsOn = true;
  volume = 0.8;

  private stepDur = 60 / 112 / 4; // 112 BPM, 16th notes

  // ── lifecycle ──────────────────────────────────────────────────────────────
  init() {
    if (typeof window === 'undefined') return;
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(ctx.destination);

    // gentle limiter-ish soft clip via compressor
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 24;
    comp.ratio.value = 6;
    comp.connect(this.master);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicOn ? 0.55 : 0;
    this.musicBus.connect(comp);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxOn ? 0.9 : 0;
    this.sfxBus.connect(comp);

    for (const name of ['bass', 'arp', 'pad', 'drums'] as LayerName[]) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(this.musicBus);
      this.layers[name] = g;
    }

    this.arpFilter = ctx.createBiquadFilter();
    this.arpFilter.type = 'lowpass';
    this.arpFilter.frequency.value = 900;
    this.arpFilter.Q.value = 6;
    this.arpFilter.connect(this.layers.arp!);

    // pre-render 1s of white noise
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buf;

    this.nextStepTime = ctx.currentTime + 0.06;
    this.timer = setInterval(this.scheduler, 25);
  }

  setConfig(opts: { musicOn?: boolean; sfxOn?: boolean; hapticsOn?: boolean; volume?: number }) {
    if (opts.musicOn !== undefined) {
      this.musicOn = opts.musicOn;
      if (this.musicBus && this.ctx) this.musicBus.gain.setTargetAtTime(opts.musicOn && this.profile !== 'off' ? 0.55 : 0, this.ctx.currentTime, 0.2);
    }
    if (opts.sfxOn !== undefined) {
      this.sfxOn = opts.sfxOn;
      if (this.sfxBus && this.ctx) this.sfxBus.gain.setTargetAtTime(opts.sfxOn ? 0.9 : 0, this.ctx.currentTime, 0.05);
    }
    if (opts.hapticsOn !== undefined) this.hapticsOn = opts.hapticsOn;
    if (opts.volume !== undefined) {
      this.volume = opts.volume;
      if (this.master && this.ctx) this.master.gain.setTargetAtTime(opts.volume, this.ctx.currentTime, 0.1);
    }
  }

  setProfile(p: MusicProfile) {
    if (p === 'streak' && this.profile === 'victory') return;
    if (p === this.profile) return;
    this.profile = p;
    if (p !== 'off') this.lastProfile = p;
    this.init();
    if (!this.ctx || !this.musicBus) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(this.musicOn ? 0.55 : 0, t, 0.3);

    const gains: Record<MusicProfile, Record<LayerName, number>> = {
      off: { bass: 0, arp: 0, pad: 0, drums: 0 },
      menu: { bass: 0.35, arp: 0.10, pad: 0.5, drums: 0.10 },
      game: { bass: 0.45, arp: 0.42, pad: 0.32, drums: 0.42 },
      streak: { bass: 0.55, arp: 0.62, pad: 0.36, drums: 0.55 },
      victory: { bass: 0.5, arp: 0.7, pad: 0.55, drums: 0.6 },
    };
    const g = gains[p];
    for (const name of Object.keys(this.layers) as LayerName[]) {
      this.layers[name]?.gain.setTargetAtTime(g[name], t, p === 'off' ? 0.4 : 0.9);
    }
    if (this.arpFilter) this.arpFilter.frequency.setTargetAtTime(p === 'streak' ? 2400 : p === 'victory' ? 3000 : p === 'game' ? 1400 : 900, t, 0.8);
  }

  get currentProfile() {
    return this.profile;
  }

  vibrate(pattern: number | number[]) {
    if (!this.hapticsOn || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }

  // ── sequencer ──────────────────────────────────────────────────────────────
  private scheduler = () => {
    const ctx = this.ctx;
    if (!ctx) return;
    while (this.nextStepTime < ctx.currentTime + 0.12) {
      this.scheduleStep(this.step, this.nextStepTime);
      this.step = (this.step + 1) % 64;
      this.nextStepTime += this.stepDur;
    }
  };

  private scheduleStep(s: number, t: number) {
    const bar = Math.floor(s / 16) % 4;
    const inBar = s % 16;
    const chord = CHORDS[bar];
    const root = CHORD_ROOTS[bar];

    // Bass — syncopated root pattern
    if (inBar === 0 || inBar === 3 || inBar === 6 || inBar === 8 || inBar === 11 || inBar === 14) {
      const len = inBar === 0 ? this.stepDur * 2.4 : this.stepDur * 1.4;
      this.blip({
        freq: NOTE(root - 24), t, len, type: 'triangle', gain: 0.5, bus: this.layers.bass!,
        attack: 0.004, filter: 320,
      });
      if (inBar === 6 || inBar === 14) {
        this.blip({ freq: NOTE(root - 24 + 7), t: t + this.stepDur * 0.5, len: this.stepDur * 0.8, type: 'triangle', gain: 0.3, bus: this.layers.bass!, attack: 0.004, filter: 320 });
      }
    }

    // Arp — rolling 16ths through resonant filter
    if (this.profile === 'game' || this.profile === 'streak' || this.profile === 'victory' || this.profile === 'menu') {
      const idx = ARP_PATTERNS[inBar];
      const octave = idx >= 3 ? 2 : 1;
      const note = chord[idx % 3] + (octave - 1) * 12;
      this.blip({
        freq: NOTE(note), t, len: this.stepDur * 1.1, type: 'square', gain: 0.16,
        bus: this.layers.arp!, attack: 0.002, filterNode: this.arpFilter!, detune: 4,
      });
    }

    // Pad — one breath per bar
    if (inBar === 0) {
      const len = this.stepDur * 16;
      for (const note of chord) {
        this.blip({ freq: NOTE(note + 12), t, len, type: 'sawtooth', gain: 0.05, bus: this.layers.pad!, attack: 1.2, release: 2, detune: 8 });
        this.blip({ freq: NOTE(note + 12) * 1.003, t, len, type: 'sawtooth', gain: 0.04, bus: this.layers.pad!, attack: 1.6, release: 2, detune: -7 });
      }
    }

    // Drums — kick on 0/8, hats offbeat, ghost snare
    if (this.profile === 'game' || this.profile === 'streak' || this.profile === 'victory') {
      if (inBar === 0 || inBar === 8) this.kick(t, 0.5);
      if (inBar === 4 || inBar === 12) this.noiseHit(t, 0.16, 1800, this.stepDur * 1.5); // snare-ish
      if (inBar % 2 === 1) this.noiseHit(t, inBar % 4 === 3 ? 0.10 : 0.06, 8000, this.stepDur * 0.7); // hats
    } else if (this.profile === 'menu' && inBar % 4 === 1) {
      this.noiseHit(t, 0.04, 8000, this.stepDur * 0.6);
    }
  }

  // ── primitives ─────────────────────────────────────────────────────────────
  private blip(opts: {
    freq: number; t: number; len: number; type: OscillatorType; gain: number;
    bus: AudioNode; attack?: number; release?: number; detune?: number;
    filter?: number; filterNode?: BiquadFilterNode;
  }) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = opts.type;
    osc.frequency.value = opts.freq;
    if (opts.detune) osc.detune.value = opts.detune;
    const g = ctx.createGain();
    const a = opts.attack ?? 0.008;
    const r = opts.release ?? 0.08;
    g.gain.setValueAtTime(0, opts.t);
    g.gain.linearRampToValueAtTime(opts.gain, opts.t + a);
    g.gain.setValueAtTime(opts.gain, Math.max(opts.t + a, opts.t + opts.len - r));
    g.gain.linearRampToValueAtTime(0.0001, opts.t + opts.len + r);
    if (opts.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.filter;
      osc.connect(f); f.connect(g);
    } else if (opts.filterNode) {
      osc.connect(opts.filterNode);
      opts.filterNode.connect(g);
    } else {
      osc.connect(g);
    }
    g.connect(opts.bus);
    osc.start(opts.t);
    osc.stop(opts.t + opts.len + r + 0.05);
  }

  private kick(t: number, gain: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    osc.connect(g); g.connect(this.layers.drums!);
    osc.start(t); osc.stop(t + 0.3);
  }

  private noiseHit(t: number, gain: number, hp: number, len: number, lowpass?: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise!;
    const f = ctx.createBiquadFilter();
    f.type = lowpass ? 'lowpass' : 'highpass';
    f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f); f.connect(g); g.connect(this.layers.drums!);
    src.start(t, Math.random() * 0.4);
    src.stop(t + len + 0.05);
  }

  // ── SFX ────────────────────────────────────────────────────────────────────
  private get now() { return this.ctx?.currentTime ?? 0; }

  private sfxTone(o: { freq: number; endFreq?: number; type?: OscillatorType; dur: number; gain?: number; delay?: number; slideType?: 'exp' | 'lin' }) {
    if (!this.ctx || !this.sfxBus) return;
    const t = this.now + (o.delay ?? 0);
    const osc = this.ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.endFreq) {
      if (o.slideType === 'lin') osc.frequency.linearRampToValueAtTime(o.endFreq, t + o.dur);
      else osc.frequency.exponentialRampToValueAtTime(o.endFreq, t + o.dur);
    }
    const g = this.ctx.createGain();
    const peak = o.gain ?? 0.22;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); g.connect(this.sfxBus);
    osc.start(t); osc.stop(t + o.dur + 0.05);
  }

  private sfxNoise(o: { dur: number; gain?: number; from: number; to?: number; type?: BiquadFilterType; delay?: number }) {
    if (!this.ctx || !this.sfxBus || !this.noise) return;
    const t = this.now + (o.delay ?? 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = o.type ?? 'lowpass';
    f.frequency.setValueAtTime(o.from, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(o.gain ?? 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(this.sfxBus);
    src.start(t, Math.random() * 0.4);
    src.stop(t + o.dur + 0.05);
  }

  click() {
    this.sfxTone({ freq: 740, endFreq: 980, type: 'square', dur: 0.06, gain: 0.08 });
  }

  whoosh() {
    this.sfxNoise({ dur: 0.28, gain: 0.12, from: 400, to: 3200, type: 'bandpass' });
  }

  flip() {
    this.sfxNoise({ dur: 0.09, gain: 0.10, from: 900, to: 3800, type: 'bandpass' });
    this.sfxTone({ freq: 520, endFreq: 660, type: 'triangle', dur: 0.07, gain: 0.07, delay: 0.02 });
  }

  /** Bell chime; pitch climbs with streak */
  match(streak = 1) {
    const root = 523.25 * Math.pow(2, Math.min(streak - 1, 7) * 2 / 12);
    [1, 1.5, 2.02].forEach((m, i) => {
      this.sfxTone({ freq: root * m, type: 'sine', dur: 0.5 - i * 0.08, gain: 0.16 - i * 0.045, delay: i * 0.012 });
    });
    this.sfxTone({ freq: root * 2, type: 'triangle', dur: 0.18, gain: 0.05 });
  }

  miss() {
    this.sfxTone({ freq: 233, endFreq: 155, type: 'sawtooth', dur: 0.32, gain: 0.14 });
    this.sfxTone({ freq: 116, endFreq: 82, type: 'sine', dur: 0.34, gain: 0.16 });
    this.vibrate([30, 40, 30]);
  }

  /** Escalating streak fanfare — longer & brighter as streak grows */
  fanfare(streak = 3) {
    const base = 392 * Math.pow(2, Math.min(streak - 3, 5) / 12);
    const steps = Math.min(3 + Math.floor(streak / 2), 6);
    for (let i = 0; i < steps; i++) {
      const semi = [0, 4, 7, 12, 16, 19][i % 6] + Math.floor(i / 6) * 12;
      this.sfxTone({ freq: base * Math.pow(2, semi / 12), type: 'square', dur: 0.12, gain: 0.10, delay: i * 0.07 });
      this.sfxTone({ freq: base * Math.pow(2, semi / 12) * 2, type: 'sine', dur: 0.10, gain: 0.05, delay: i * 0.07 });
    }
  }

  victory() {
    const run = [0, 4, 7, 12, 7, 12, 16, 19, 24];
    run.forEach((semi, i) => {
      this.sfxTone({ freq: 523.25 * Math.pow(2, semi / 12), type: 'triangle', dur: 0.16, gain: 0.12, delay: i * 0.09 });
      this.sfxTone({ freq: 523.25 * Math.pow(2, (semi + 12) / 12), type: 'sine', dur: 0.14, gain: 0.05, delay: i * 0.09 });
    });
    [261.6, 329.6, 392, 523.25].forEach((f, i) => {
      this.sfxTone({ freq: f, type: 'sawtooth', dur: 1.4, gain: 0.045, delay: 0.85 + i * 0.03 });
    });
    this.sfxNoise({ dur: 0.6, gain: 0.05, from: 6000, to: 9000, type: 'highpass', delay: 0.85 });
  }

  coin() {
    this.sfxTone({ freq: 987.77, type: 'square', dur: 0.08, gain: 0.10 });
    this.sfxTone({ freq: 1318.5, type: 'square', dur: 0.28, gain: 0.10, delay: 0.08 });
  }

  levelUp() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.sfxTone({ freq: f, type: 'square', dur: 0.14, gain: 0.10, delay: i * 0.09 });
    });
  }

  purchase() {
    this.coin();
    this.sfxTone({ freq: 783.99, type: 'triangle', dur: 0.4, gain: 0.10, delay: 0.18 });
  }

  error() {
    this.sfxTone({ freq: 150, endFreq: 110, type: 'sawtooth', dur: 0.2, gain: 0.12 });
  }

  whack() {
    this.sfxNoise({ dur: 0.1, gain: 0.22, from: 3000, to: 400 });
    this.sfxTone({ freq: 180, endFreq: 70, type: 'sine', dur: 0.12, gain: 0.2 });
  }

  golden() {
    this.whack();
    [880, 1108, 1318].forEach((f, i) => this.sfxTone({ freq: f, type: 'sine', dur: 0.18, gain: 0.08, delay: 0.05 + i * 0.06 }));
  }

  bomb() {
    this.sfxNoise({ dur: 0.55, gain: 0.3, from: 2800, to: 60 });
    this.sfxTone({ freq: 90, endFreq: 34, type: 'sine', dur: 0.6, gain: 0.3 });
    this.vibrate([80, 30, 80]);
  }

  catchFruit() {
    this.sfxTone({ freq: 380, endFreq: 760, type: 'sine', dur: 0.09, gain: 0.12 });
  }

  /** Simon pads — a bright major arpeggio (C# minor-ish classic tones) */
  simonTone(i: number) {
    const freqs = [329.63, 415.3, 554.37, 659.26];
    this.sfxTone({ freq: freqs[i], type: 'triangle', dur: 0.32, gain: 0.16 });
    this.sfxTone({ freq: freqs[i] * 2, type: 'sine', dur: 0.22, gain: 0.06 });
  }

  merge(value: number) {
    const pitch = 240 + 46 * Math.log2(value);
    this.sfxTone({ freq: pitch, endFreq: pitch * 1.5, type: 'square', dur: 0.08, gain: 0.09 });
    this.sfxTone({ freq: pitch * 2, type: 'sine', dur: 0.12, gain: 0.05, delay: 0.02 });
  }

  spawn() {
    this.sfxTone({ freq: 300, endFreq: 380, type: 'triangle', dur: 0.05, gain: 0.05 });
  }

  gameStart() {
    this.whoosh();
    this.sfxTone({ freq: 440, endFreq: 880, type: 'triangle', dur: 0.25, gain: 0.1 });
  }

  gameOver() {
    [392, 349.23, 311.13, 261.63].forEach((f, i) => {
      this.sfxTone({ freq: f, type: 'triangle', dur: 0.3, gain: 0.12, delay: i * 0.18 });
    });
  }

  starPop(i: number) {
    this.sfxTone({ freq: 700 + i * 260, endFreq: 1200 + i * 260, type: 'sine', dur: 0.16, gain: 0.14, delay: i * 0.28 });
  }
}

export const audio = new ArcadeAudio();
