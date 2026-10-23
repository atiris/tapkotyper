import { assetUrl, hasMusic, musicTracks } from '../gfx/assets';
import { nextTrack } from './tracks';

export type Sfx = 'key' | 'wrong' | 'word' | 'reward' | 'click' | 'whoosh' | 'pop' | 'beat' | 'cheer' | 'bzzt' | 'note' | 'plop' | 'squeak';
/** Quick sound switch: normal, quiet (20 % of normal) or off. */
export type SoundLevel = 'normal' | 'quiet' | 'off';

export const SOUND_LEVELS: SoundLevel[] = ['normal', 'quiet', 'off'];
const LEVEL_GAIN: Record<SoundLevel, number> = { normal: 1, quiet: 0.2, off: 0 };
const SOUND_KEY = 'tapkotyper:sound';
const FADE = 1.2;

/**
 * Sound effects are synthesized; music plays the generated tracks when present,
 * otherwise a calm pentatonic loop. Nothing plays before the first user gesture.
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private sfxGain!: GainNode;
  private musicGain!: GainNode;
  private sfxVolume = 0.7;
  private musicVolume = 0.5;
  level: SoundLevel = 'normal';
  private track: string | null = null;
  private current: { el?: HTMLAudioElement; gain: GainNode; stop: () => void } | null = null;
  private listeners: (() => void)[] = [];

  constructor() {
    try {
      const saved = localStorage.getItem(SOUND_KEY) as SoundLevel | null;
      if (saved && SOUND_LEVELS.includes(saved)) this.level = saved;
    } catch { /* private mode */ }
    // iOS Safari takes only a tap's end (pointerup, touchend, click) as the gesture that may start sound.
    const events = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
    const unlock = () => {
      const ctx = this.ensure();
      if (!ctx) return;
      const unlocked = () => {
        if (ctx.state === 'running') for (const ev of events) window.removeEventListener(ev, unlock, { capture: true });
      };
      if (ctx.state !== 'running') void ctx.resume().then(unlocked, () => undefined);
      // A silent frame inside the gesture wakes the audio output; a waiting track tries to play again.
      const blip = ctx.createBufferSource();
      blip.buffer = ctx.createBuffer(1, 1, 22050);
      blip.connect(ctx.destination);
      blip.start();
      if (this.current?.el?.paused) void this.current.el.play().catch(() => undefined);
      unlocked();
    };
    for (const ev of events) window.addEventListener(ev, unlock, { capture: true });
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor() as AudioContext;
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain.connect(this.ctx.destination);
    this.musicGain.connect(this.ctx.destination);
    this.applyVolumes();
    if (this.track) {
      const t = this.track;
      this.track = null;
      this.music(t);
    }
    return this.ctx;
  }

  setVolumes(sfx: number, music: number): void {
    this.sfxVolume = sfx;
    this.musicVolume = music;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const k = LEVEL_GAIN[this.level];
    this.sfxGain.gain.setTargetAtTime(this.sfxVolume * 0.6 * k, now, 0.05);
    this.musicGain.gain.setTargetAtTime(this.musicVolume * 0.55 * k, now, 0.2);
  }

  /** Next quick sound level: normal -> quiet -> off -> normal. */
  cycleLevel(): SoundLevel {
    this.level = SOUND_LEVELS[(SOUND_LEVELS.indexOf(this.level) + 1) % SOUND_LEVELS.length];
    try { localStorage.setItem(SOUND_KEY, this.level); } catch { /* private mode */ }
    this.applyVolumes();
    this.listeners.forEach((l) => l());
    return this.level;
  }

  onLevelChange(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => (this.listeners = this.listeners.filter((l) => l !== fn));
  }

  /** Crossfades to a music track (`music-<name>`); null stops the music. */
  music(name: string | null): void {
    if (name === this.track) return;
    this.track = name;
    const ctx = this.ctx;
    if (!ctx) return;
    const old = this.current;
    if (old) {
      old.gain.gain.setTargetAtTime(0, ctx.currentTime, FADE / 3);
      setTimeout(() => old.stop(), FADE * 1000 + 200);
    }
    this.current = null;
    if (!name) return;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.musicGain);
    gain.gain.setTargetAtTime(1, ctx.currentTime, FADE / 3);
    if (hasMusic(`music-${name}`)) {
      const el = new Audio(assetUrl(`music-${name}.mp3`));
      el.loop = true;
      el.crossOrigin = 'anonymous';
      const src = ctx.createMediaElementSource(el);
      src.connect(gain);
      void el.play().catch(() => undefined);
      this.current = { el, gain, stop: () => { el.pause(); el.src = ''; src.disconnect(); gain.disconnect(); } };
    } else {
      const stop = synthLoop(ctx, gain, name);
      this.current = { gain, stop: () => { stop(); gain.disconnect(); } };
    }
  }

  /** Plays the next random track of the whole library and returns its name; the next screen or level sets its own track again. */
  shuffleTrack(): string | null {
    const next = nextTrack(musicTracks(), this.track);
    if (next) this.music(next);
    return next;
  }

  sfx(kind: Sfx): void {
    const ctx = this.ctx;
    if (!ctx || this.level === 'off' || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const tone = (freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, slide?: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t + start);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + start + dur);
      g.gain.setValueAtTime(0, t + start);
      g.gain.linearRampToValueAtTime(vol, t + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
      o.connect(g).connect(this.sfxGain);
      o.start(t + start);
      o.stop(t + start + dur + 0.05);
    };
    switch (kind) {
      case 'key': tone(880 + Math.random() * 60, 0, 0.07, 'triangle', 0.12); break;
      case 'wrong': tone(300, 0, 0.18, 'sine', 0.12, 240); break;
      case 'bzzt': tone(150, 0, 0.16, 'square', 0.03, 120); tone(150, 0.08, 0.12, 'square', 0.025, 110); break;
      case 'word': tone(660, 0, 0.12, 'triangle', 0.2); tone(990, 0.08, 0.18, 'triangle', 0.18); break;
      case 'pop': tone(520, 0, 0.12, 'sine', 0.25, 1040); break;
      case 'plop': tone(260, 0, 0.16, 'sine', 0.16, 120); break;
      case 'squeak': tone(1100, 0, 0.09, 'triangle', 0.14, 1600); tone(1300, 0.1, 0.12, 'triangle', 0.12, 900); break;
      case 'whoosh': tone(200, 0, 0.35, 'sine', 0.12, 900); break;
      case 'beat': tone(440, 0, 0.08, 'sine', 0.12); break;
      // A bell-like note of a pentatonic scale, a little song as the notes add up.
      case 'note': { const f = [523, 587, 659, 784, 880][Math.floor(Math.random() * 5)]; tone(f, 0, 0.5, 'sine', 0.16); tone(f * 2, 0, 0.3, 'sine', 0.05); break; }
      case 'cheer': [587, 740, 880, 1175].forEach((f, i) => tone(f, i * 0.07, 0.2, 'triangle', 0.12)); break;
      case 'click': tone(700, 0, 0.05, 'square', 0.05); break;
      case 'reward': [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.35, 'triangle', 0.18)); break;
    }
  }
}

/** A calm pentatonic sequencer: soft pad + plucks, 70-90 BPM. */
function synthLoop(ctx: AudioContext, out: GainNode, name: string): () => void {
  const roots: Record<string, number> = { menu: 261.6, meadow: 196, space: 146.8, planet: 174.6, dragons: 155.6, egg: 220, junkyard: 174.6, workshop: 261.6, raintown: 146.8, robocity: 220, robohome: 196, break: 130.8, relaxing: 130.8 };
  const root = roots[name] ?? 220;
  const bpm = name === 'break' || name === 'relaxing' ? 62 : name === 'egg' ? 90 : 78;
  const scale = [0, 2, 4, 7, 9, 12, 14, 16];
  const beat = 60 / bpm;
  let step = 0;
  let next = ctx.currentTime + 0.1;
  const note = (freq: number, at: number, dur: number, vol: number, type: OscillatorType) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + Math.min(0.4, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.001, at + dur);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + dur + 0.1);
  };
  const timer = setInterval(() => {
    while (next < ctx.currentTime + 0.5) {
      if (step % 8 === 0) {
        const chord = [0, 4, 7].map((i) => root * 2 ** ((i + (step % 32 >= 16 ? 5 : 0)) / 12) / 2);
        chord.forEach((f) => note(f, next, beat * 8, 0.05, 'sine'));
      }
      if ((step * 7) % 3 !== 1) {
        const deg = scale[(step * 5 + Math.floor(step / 8)) % scale.length];
        note(root * 2 ** (deg / 12), next, beat * 1.5, 0.08, 'triangle');
      }
      next += beat / 2;
      step++;
    }
  }, 120);
  return () => clearInterval(timer);
}

export const audio = new AudioEngine();
