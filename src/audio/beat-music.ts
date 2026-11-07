import type { BeatOut } from './audio';
import type { Bar } from '../game/beat';

/** The meadow's key: G. Chords per bar (I V vi IV), as semitones over the root and whether minor. */
const ROOT = 196;
const CHORDS: [number, boolean][] = [[0, false], [7, false], [9, true], [5, false]];
/** The pentatonic scale of the melody, semitones over the root. */
const PENTA = [0, 2, 4, 7, 9];
/** Sections of eight bars, A A B A C A round and round, and each section's two-bar melody (pentatonic steps, -1 a rest). */
const SECTIONS = 'AABACA';
const MELODY: Record<string, number[]> = {
  A: [4, -1, 3, -1, 2, -1, 3, 4, 5, -1, 4, -1, 3, -1, -1, -1],
  B: [2, 3, 4, -1, 6, -1, 5, -1, 4, -1, 3, 2, -1, 1, -1, -1],
  C: [7, -1, -1, 6, 5, -1, 4, -1, 3, 4, 5, -1, 4, -1, -1, -1],
};

const semis = (f: number, s: number) => f * 2 ** (s / 12);
const penta = (step: number) => PENTA[step % 5] + 12 * Math.floor(step / 5);

/** One note: an oscillator through a short envelope into the output, at context time `at`. */
function tone(o: BeatOut, at: number, freq: number, dur: number, vol: number, type: OscillatorType, slide?: number): void {
  const { ctx } = o;
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, at + dur);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  osc.connect(g).connect(o.out);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

/** The chord of a bar: the progression runs one chord a bar from the first playing bar. */
const chordOf = (bar: Bar): [number, boolean] => CHORDS[Math.max(0, bar.index - 1) % CHORDS.length];

type Note = [number, (at: number) => void];

/**
 * Rytmus's music, generated from patterns on the song's clock so every landing is exactly on a
 * beat: a soft kick, shaker eighths, a bass on the chord's root, a marimba melody per section, a
 * woodblock count-in, a run before a faster phrase and a closing chord. A caught letter rings a bell
 * note of the bar's chord on its landing. At most about six sounds at once, for weak computers.
 */
export class BeatMusic {
  /** Song seconds scheduled so far. */
  private until = -Infinity;
  private noise: AudioBuffer | null = null;

  /** Schedules the notes between the last call and `to` (song seconds), none before `from`; `perf` maps song time to `performance.now()`. */
  schedule(o: BeatOut, bars: readonly Bar[], from: number, to: number, perf: (s: number) => number): void {
    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i];
      if (bar.start > to) break;
      if (bar.start + 4 * bar.beat <= this.until) continue;
      for (const [t, play] of this.notes(o, bar, bars[i + 1])) {
        if (t > this.until && t <= to && t >= from - 0.05) play(o.at(perf(t)));
      }
    }
    this.until = Math.max(this.until, to);
  }

  /** A caught letter's bell at song time `s` (its landing, or now when caught after it). */
  bell(o: BeatOut, bars: readonly Bar[], s: number, perf: (s: number) => number): void {
    const bar = [...bars].reverse().find((b) => b.start <= s) ?? bars[0];
    const [shift, minor] = chordOf(bar);
    const at = o.at(perf(s));
    const f = semis(ROOT * 4, shift + [0, minor ? 3 : 4, 7][Math.floor(s * 7) % 3]);
    tone(o, at, f, 0.45, 0.09, 'sine');
    tone(o, at, f * 2, 0.25, 0.03, 'sine');
  }

  /** The bar's notes as (song time, play at context time). */
  private notes(o: BeatOut, bar: Bar, next: Bar | undefined): Note[] {
    const b = bar.beat, out: Note[] = [];
    const add = (t: number, play: (at: number) => void) => out.push([bar.start + t, play]);
    if (bar.kind === 'count') {
      for (let k = 0; k < 4; k++) add(k * b, (at) => tone(o, at, k === 0 ? 1250 : 900, 0.06, 0.12, 'square'));
      return out;
    }
    const [shift, minor] = chordOf(bar);
    const root = semis(ROOT, shift), third = minor ? 3 : 4;
    if (bar.kind === 'end') {
      add(0, (at) => {
        for (const s of [0, third, 7]) tone(o, at, semis(root * 2, s), 2.2, 0.08, 'triangle');
        tone(o, at, root / 2, 2.2, 0.16, 'triangle');
      });
      return out;
    }
    for (const k of [0, 2]) add(k * b, (at) => tone(o, at, 110, 0.2, 0.32, 'sine', 45));
    add(0, (at) => tone(o, at, root / 2, 1.8 * b, 0.16, 'triangle'));
    add(2 * b, (at) => tone(o, at, semis(root / 2, 7), 1.8 * b, 0.12, 'triangle'));
    for (let e = 0; e < 8; e++) add((e * b) / 2, (at) => this.shaker(o, at, e % 2 === 0));
    const section = SECTIONS[Math.floor(Math.max(0, bar.index - 1) / 8) % SECTIONS.length];
    const half = (bar.index - 1) % 2;
    MELODY[section].slice(half * 8, half * 8 + 8).forEach((step, e) => {
      if (step >= 0) add((e * b) / 2, (at) => tone(o, at, semis(ROOT * 2, penta(step)), 0.4, 0.07, 'triangle'));
    });
    // A faster phrase comes: a quick run up on the last beat.
    if (next?.kind === 'play' && next.phrase !== bar.phrase && next.beat < b - 1e-6) {
      for (let k = 0; k < 4; k++) add(3 * b + (k * b) / 4, (at) => tone(o, at, semis(ROOT * 2, penta(5 + k)), 0.18, 0.05, 'sine'));
    }
    return out;
  }

  /** A soft shaker: a breath of filtered noise, louder on the beat. */
  private shaker(o: BeatOut, at: number, beat: boolean): void {
    const { ctx } = o;
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.06), ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    }
    const src = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.noise;
    hp.type = 'highpass';
    hp.frequency.value = 6000;
    g.gain.value = beat ? 0.1 : 0.055;
    src.connect(hp).connect(g).connect(o.out);
    src.start(at);
  }
}
