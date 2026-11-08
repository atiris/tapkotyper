/**
 * Rytmus, the beat game, without drawing or sound: the finger lanes, the tempo and its steps, the
 * catch window around each beat, the letters' order, the lanes' letter changes, the song's bars
 * and drops on one clock, and the beat measure of rhythm (`.specify/game/rhythm.md`).
 */
import type { Finger } from '../keyboard/layouts';

/** The slowest and the fastest tempo, letters a minute (the tempo ring is full at the fastest). */
export const TEMPO_MIN = 30;
export const TEMPO_MAX = 120;
/** A round's base tempo step between rounds: this share of the base. */
const TEMPO_STEP = 0.1;
/**
 * Within a round the tempo drifts bar by bar, at most this share of the base in half a round (10 %
 * up or down in half of it), and never further than this share from the base either way.
 */
const DRIFT_PER_HALF = 0.1;
const DRIFT_MAX = 0.2;
/** Landings in one phrase: the tempo's direction and the window change only between phrases. */
export const PHRASE = 16;
/** Seconds of song a round lasts by default, and the share of it a hard round grows by at most (a phrase for each step down). */
export const ROUND_S = 60;
const EXTRA_SHARE = 1 / 3;
/** The catch window: this many letter beats on each side of the beat, at the start, per step and at most. */
export const W_START = 0.35;
const W_STEP = 0.05;
const W_MAX = 0.5;
/** A phrase's step: caught at least this share of its letters, and of the catches at least `UP_IN_TIME` in time to go up, `KEEP_IN_TIME` to stay. */
const STEP_CAUGHT = 0.9;
const UP_IN_TIME = 0.7;
const KEEP_IN_TIME = 0.4;
/** Where in the window a catch is "in time" (the middle half), and where it is only a little off (up to three quarters). */
const IN_TIME = 0.5;
const NEAR = 0.75;
/** Below this tempo the music plays twice as fast and a letter lands on every second beat. */
const DOUBLE_BELOW = 60;
/** Seconds before its first letter leaves the cloud that a phrase is planned (and its tempo decided). */
const PLAN_AHEAD_S = 0.2;
/** Seconds of quiet before the count-in bar. */
const LEAD_S = 0.6;
/** The first round's tempo: this share of the usual speed, at most the world's target tempo. */
const START_SHARE = 0.7;
/** Seconds around a lane's letter change in which none of its letters may be in the air (the cloud dissolves, a new one comes). */
export const CHANGE_S = 1.2;
/** Weight of a weak letter (the lowest third by recent accuracy, at most three) in the free phrases. */
const WEAK_WEIGHT = 1.5;
/** Landings the HUD's rhythm ring looks back at, the fewest it shows a number for, and the fewest a round's score needs. */
export const RING_WINDOW = 16;
/** The beat measure: a mean distance from the child's own steady moment of this many beats or less is 100, this many or more 0. */
const MAO_FULL = 0.1;
const MAO_ZERO = 0.3;
export const RING_MIN = 8;
export const SCORE_MIN = 12;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** One lane: a finger and its letters, the first one falling at the start, the others its later letters. */
export interface Lane {
  finger: Finger;
  letters: string[];
}

/** Left hand: little finger 0 to index 3; right hand: index 6 to little finger 9. */
const isLeft = (f: Finger) => f < 5;

/**
 * The lanes of a round: one per finger of the letters (thumbs never), in keyboard order from the
 * left little finger; a finger's letters keep their order (the lesson order).
 */
export function laneSetup(letters: readonly string[], fingerOf: (ch: string) => Finger | null): Lane[] {
  const lanes = new Map<Finger, string[]>();
  for (const ch of letters) {
    const f = fingerOf(ch);
    if (f === null || f === 4 || f === 5) continue;
    const list = lanes.get(f) ?? [];
    if (!list.includes(ch)) list.push(ch);
    lanes.set(f, list);
  }
  return [...lanes.entries()].sort((a, b) => a[0] - b[0]).map(([finger, l]) => ({ finger, letters: l }));
}

/** Lanes of a story's Rytmus, its first world to its last: story 1 two to four, story 2 four to six, story 3 four to eight. */
const LANES_BY_TIER: readonly (readonly [number, number])[] = [[2, 4], [4, 6], [4, 8]];

/** How many lanes the world at `place` of a story with `worlds` worlds (its `tier`) plays: spread from the story's first count to its last. */
export function laneCount(tier: number, place: number, worlds: number): number {
  const [from, to] = LANES_BY_TIER[tier];
  return from + Math.floor(((to - from) * place) / Math.max(1, worlds - 1));
}

/** Letter changes a round of the world at `place` has: none in the first half of the story's worlds, else the story's tier + 1. */
export function changeCount(tier: number, place: number, worlds: number): number {
  return place >= worlds / 2 ? tier + 1 : 0;
}

/**
 * The `n` lanes a round plays, of all the fingers' lanes: those with the newest letters (latest in
 * `order`, the lesson order), still in keyboard order from the left; the others are the spare lanes
 * the letter changes may take letters from.
 */
export function pickLanes(all: readonly Lane[], n: number, order: readonly string[]): { lanes: Lane[]; spare: Lane[] } {
  const newest = (l: Lane) => Math.max(...l.letters.map((c) => order.indexOf(c)));
  const picked = new Set([...all].sort((a, b) => newest(b) - newest(a)).slice(0, n));
  return { lanes: all.filter((l) => picked.has(l)), spare: all.filter((l) => !picked.has(l)) };
}

/** Seconds per letter at a tempo. */
export const beatOf = (tempo: number) => 60 / tempo;

/** Music beats per letter: two below 60 letters a minute, so the music never drags. */
export const beatsPerLetter = (tempo: number) => (tempo < DOUBLE_BELOW ? 2 : 1);

/** Seconds a letter falls from its cloud to the basket: the next one is always in the air already. */
export function fallSeconds(T: number): number {
  return Math.max(1.6, Math.min(3, 2.5 * T), 1.3 * T);
}

const clampTempo = (x: number) => Math.round(Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, x)));

/** A tempo `level` steps of 10 % of `base` away from it (a round's base from the last one's). */
export function tempoAt(base: number, level: number): number {
  return clampTempo(base * (1 + TEMPO_STEP * level));
}

/** Where a phrase's tempo goes: up, kept, gently down (half the drift speed) or down. */
export type Step = -1 | -0.5 | 0 | 1;

/**
 * The tempo `seconds` later going `dir` from `tempo`: at most 10 % of the round's `base` in half the
 * round (`roundS`, half of that on a gentle step), never further than 20 % from the base, nor out of the tempo range.
 */
export function drift(tempo: number, dir: Step, seconds: number, base: number, roundS: number): number {
  const to = tempo + dir * base * DRIFT_PER_HALF * (seconds / (roundS / 2));
  const lo = Math.max(TEMPO_MIN, base * (1 - DRIFT_MAX)), hi = Math.min(TEMPO_MAX, base * (1 + DRIFT_MAX));
  return Math.max(Math.min(lo, tempo), Math.min(Math.max(hi, tempo), to));
}

/** The next round's base: one step (10 %) from this round's base towards where its tempo went (`now`). */
export function nextBase(base: number, now: number): number {
  const dir = Math.abs(now - base) < 0.5 ? 0 : Math.sign(now - base);
  return tempoAt(base, dir);
}

/** Days from `from` to `to`, both local dates `YYYY-MM-DD`. */
function days(from: string, to: string): number {
  const d = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  return Math.round((d(to) - d(from)) / 86_400_000);
}

/**
 * A round's base tempo: the child's one kept tempo of all worlds (null before the first round), else
 * 70 % of the usual speed (letters a minute), at most the played world's `target`; a new child 30.
 */
export function startTempo(kept: number | null, usualCpm: number, target: number): number {
  if (kept !== null) return clampTempo(kept);
  return clampTempo(Math.min(target, usualCpm * START_SHARE));
}

/**
 * A phrase's step by its timing, never by wrong keys: with 90 % of its letters `caught` it goes up when
 * 70 % of the catches were in time (`inTime`), stays from 40 %, goes gently down below; misses step it down.
 */
export function phraseStep(caught: number, inTime: number): Step {
  if (caught < STEP_CAUGHT) return -1;
  return inTime >= UP_IN_TIME ? 1 : inTime >= KEEP_IN_TIME ? 0 : -0.5;
}

/** The world's target tempo: its story's words a minute as letters (five a word). */
export function targetTempo(wordsPerMinute: number): number {
  return clampTempo(wordsPerMinute * 5);
}

/** Where a press at `at` stands to a beat at `land` with letter beat `T` and window `w` (beats each side): before the window, in it, or after it. */
export function judge(at: number, land: number, T: number, w: number): 'early' | 'catch' | 'late' {
  if (at < land - w * T) return 'early';
  return at <= land + w * T ? 'catch' : 'late';
}

/**
 * How a catch `offset` seconds from its beat stands in its window (`w` beats each side, letter beat `T`), as
 * dance games tell it: in the middle half "in time", a little early or late "slower" or "faster", at the
 * window's edges "early" or "late".
 */
export function timing(offset: number, w: number, T: number): 'inTime' | 'slower' | 'faster' | 'early' | 'late' {
  const r = offset / (w * T);
  if (Math.abs(r) <= IN_TIME) return 'inTime';
  if (Math.abs(r) <= NEAR) return r < 0 ? 'slower' : 'faster';
  return r < 0 ? 'early' : 'late';
}

/** The next phrase's window: wider after a full step down; other steps keep it (a good rhythm is never made harder to hit). */
export function stepWindow(w: number, dir: Step): number {
  return Math.round(Math.min(W_MAX, dir === -1 ? w + W_STEP : w) * 100) / 100;
}

/** Weights of the lanes in the free phrases: the lowest third by recent accuracy (at most three) a little more often. */
export function laneWeights(accuracy: readonly number[]): number[] {
  const weak = Math.min(3, Math.ceil(accuracy.length / 3));
  const order = accuracy.map((a, i) => [a, i] as const).sort((a, b) => a[0] - b[0]).slice(0, weak).map(([, i]) => i);
  return accuracy.map((_, i) => (order.includes(i) ? WEAK_WEIGHT : 1));
}

/** `n` items of `motif`, round and round. */
const cycle = (motif: number[], n = PHRASE) => Array.from({ length: n }, (_, i) => motif[i % motif.length]);

/** Dictionary words a free phrase needs before it is made of words. */
const WORDS_MIN = 3;

/**
 * A free phrase made of dictionary words: whole words one after another that only use the lanes'
 * letters now (`letters`, one per lane), the rest filled by `fill`; null with too few such words.
 */
function wordLanes(words: readonly string[], letters: readonly string[], rand: () => number, fill: (out: number[]) => number): number[] | null {
  const fit = words.filter((w) => [...w].every((c) => letters.includes(c)));
  if (fit.length < WORDS_MIN) return null;
  const out: number[] = [];
  const shortest = Math.min(...fit.map((w) => w.length));
  while (PHRASE - out.length >= shortest) {
    const left = fit.filter((w) => w.length <= PHRASE - out.length);
    const word = left[Math.floor(rand() * left.length)];
    for (const c of word) out.push(letters.indexOf(c));
  }
  while (out.length < PHRASE) out.push(fill(out));
  return out;
}

/**
 * The lanes of one phrase's letters, from easy to harder: the two index fingers in turn, mirror
 * pairs of the hands, neighbours of one hand, then free: dictionary words of the lanes' letters now
 * (`words`, `letters`) when there are enough of them, else weighted letters, never the same twice
 * in a row unless `repeats`. A pattern the lanes cannot make is free too.
 */
export function phraseLanes(
  phrase: number, lanes: readonly Lane[], weights: readonly number[], rand: () => number, repeats: boolean,
  words: readonly string[] = [], letters: readonly string[] = lanes.map((l) => l.letters[0]),
): number[] {
  const left = lanes.map((_, i) => i).filter((i) => isLeft(lanes[i].finger));
  const right = lanes.map((_, i) => i).filter((i) => !isLeft(lanes[i].finger));
  if (phrase === 0 && left.length && right.length) return cycle([left[left.length - 1], right[0]]);
  // Mirror pairs: the left finger f with the right finger 9 - f, outside in.
  const pairs = left.flatMap((i) => right.filter((j) => lanes[j].finger === 9 - lanes[i].finger).map((j) => [i, j]));
  if (phrase === 1 && pairs.length > 1) return cycle(pairs.flat());
  if (phrase === 2 && left.length > 1 && right.length > 1) {
    const l = left.slice(-2), r = right.slice(0, 2);
    return cycle([l[0], l[1], l[0], l[1], r[1], r[0], r[1], r[0]]);
  }
  const pick = (out: number[]) => {
    const prev = out[out.length - 1];
    const open = weights.map((w, i) => (repeats || i !== prev || lanes.length < 2 ? w : 0));
    const sum = open.reduce((a, b) => a + b, 0);
    let x = rand() * sum, i = 0;
    while (i < open.length - 1 && (x -= open[i]) >= 0) i++;
    return i;
  };
  const fromWords = wordLanes(words, letters, rand, pick);
  if (fromWords) return fromWords;
  const out: number[] = [];
  while (out.length < PHRASE) out.push(pick(out));
  return out;
}

/** A letter on a lane, and the finger that types it (the lane's colour). */
export interface LaneLetter {
  letter: string;
  finger: Finger;
}

/** A lane's letter changes at `at` (song seconds) to `letter`, typed by `finger`. */
export interface LaneChange extends LaneLetter {
  at: number;
  lane: number;
}

/**
 * The round's letter changes: `count` of them spread evenly over the round, the lanes taking turns.
 * A lane takes a letter not on any lane now, of its own finger or of a spare lane's (`spare`), whose
 * finger sits between its neighbours' so the lanes stay in keyboard order; one not shown yet first.
 * A change no lane can take is left out.
 */
export function planChanges(lanes: readonly Lane[], spare: readonly Lane[], count: number, roundS = ROUND_S): LaneChange[] {
  const now: LaneLetter[] = lanes.map((l) => ({ letter: l.letters[0], finger: l.finger }));
  const pool: LaneLetter[] = [...lanes, ...spare].flatMap((l) => l.letters.map((letter) => ({ letter, finger: l.finger })));
  const shown = new Set(now.map((c) => c.letter));
  const out: LaneChange[] = [];
  let turn = 0;
  for (let k = 0; k < count; k++) {
    for (let tries = 0; tries < now.length; tries++) {
      const lane = turn++ % now.length;
      const lo = lane ? now[lane - 1].finger : -1, hi = lane < now.length - 1 ? now[lane + 1].finger : 10;
      const fits = pool.filter((c) => c.finger > lo && c.finger < hi && !now.some((x) => x.letter === c.letter));
      if (!fits.length) continue;
      const next = fits.find((c) => !shown.has(c.letter)) ?? fits[0];
      now[lane] = next;
      shown.add(next.letter);
      out.push({ at: (roundS * (k + 1)) / (count + 1), lane, ...next });
      break;
    }
  }
  return out;
}

/** A lane's letter and finger for a drop that leaves its cloud at `release`: the last change before it. */
export function laneNow(lanes: readonly Lane[], changes: readonly LaneChange[], lane: number, release: number): LaneLetter {
  let now: LaneLetter = { letter: lanes[lane].letters[0], finger: lanes[lane].finger };
  for (const c of changes) if (c.lane === lane && c.at <= release) now = c;
  return now;
}

/** No letter of the lane may be in the air while its cloud changes. */
function blocked(changes: readonly LaneChange[], lane: number, release: number, land: number): boolean {
  return changes.some((c) => c.lane === lane && release <= c.at + CHANGE_S && land >= c.at);
}

/** One letter of the song: its lane, letter and finger, when it leaves its cloud and is on its beat, its letter beat, window and phrase. */
export interface Drop {
  index: number;
  lane: number;
  letter: string;
  finger: Finger;
  release: number;
  land: number;
  T: number;
  w: number;
  phrase: number;
}

/** One bar of the music: its start, its beat (seconds), its number and phrase; the count-in and the closing bar are marked. */
export interface Bar {
  index: number;
  start: number;
  beat: number;
  phrase: number;
  kind: 'count' | 'play' | 'end';
}

/**
 * A phrase: its tempo at its start (letters a minute, rounded), where its tempo is going and the exact
 * tempo after it, its catch window (beats each side), its first beat, the beat after its last and its first drop.
 */
export interface Phrase {
  tempo: number;
  dir: Step;
  after: number;
  w: number;
  start: number;
  end: number;
  first: number;
}

export interface SongSetup {
  lanes: readonly Lane[];
  changes: readonly LaneChange[];
  weights: readonly number[];
  /** The round's base tempo: the phrases step around it. */
  tempo: number;
  rand: () => number;
  roundS?: number;
  /** Dictionary words the free phrases are made of where the lanes' letters allow. */
  words?: readonly string[];
}

/**
 * The round's song on one clock (seconds from the start): a count-in bar, then phrases of 16
 * landings, each at its own tempo, until the round's time; a closing bar after the last landing.
 * A phrase is planned just before its first letter leaves its cloud; its tempo drifts (see `drift`) and
 * its window follows the step `decide` gives then (the phrase before, judged on its letters resolved by
 * then), and a full step down makes the round a phrase longer, up to a third.
 */
export class Song {
  readonly drops: Drop[] = [];
  readonly bars: Bar[] = [];
  readonly phrases: Phrase[] = [];
  roundS: number;
  private readonly baseS: number;
  /** The song is planned to its end: no phrase comes any more. */
  closed = false;

  constructor(private s: SongSetup) {
    this.roundS = this.baseS = s.roundS ?? ROUND_S;
    const b = beatOf(s.tempo) / beatsPerLetter(s.tempo);
    this.bars.push({ index: 0, start: LEAD_S, beat: b, phrase: 0, kind: 'count' });
    this.addPhrase(s.tempo, 0, W_START, LEAD_S + 4 * b);
  }

  /** When the song is over: the end of its closing bar. */
  get end(): number {
    const last = this.bars[this.bars.length - 1];
    return this.closed ? last.start + 4 * last.beat : Infinity;
  }

  /** The time the next phrase must be planned by (its first letter leaves the cloud then), Infinity once closed. */
  get due(): number {
    if (this.closed) return Infinity;
    const p = this.phrases[this.phrases.length - 1];
    return p.end - fallSeconds(beatOf(p.after)) - PLAN_AHEAD_S;
  }

  /** At song time `now`, plans the next phrase when it is due; `decide` gives the step from the current phrase. */
  tick(now: number, decide: () => Step): void {
    if (now < this.due) return;
    const p = this.phrases[this.phrases.length - 1];
    const start = p.end;
    if (start > this.roundS) return this.close();
    const dir = decide();
    if (dir === -1) this.roundS = Math.min(this.baseS * (1 + EXTRA_SHARE), this.roundS + (p.end - p.start));
    this.addPhrase(p.after, dir, stepWindow(p.w, dir), start, now);
  }

  /**
   * A phrase from `start` at `tempo`, drifting `dir` bar by bar (see `drift`); no letter leaves its
   * cloud before `now` (a slower next tempo falls a little longer than the time left).
   */
  private addPhrase(tempo: number, dir: Step, w: number, start: number, now = 0): void {
    const phrase = this.phrases.length;
    const bpl = beatsPerLetter(tempo), perBar = 4 / bpl;
    const ph: Phrase = { tempo: Math.round(tempo), dir, after: tempo, w, start, end: start, first: this.drops.length };
    this.phrases.push(ph);
    const F0 = fallSeconds(beatOf(tempo));
    const letters = this.s.lanes.map((_, i) => laneNow(this.s.lanes, this.s.changes, i, Math.max(now, start - F0)).letter);
    const lanes = phraseLanes(phrase, this.s.lanes, this.s.weights, this.s.rand, start >= this.roundS / 2, this.s.words, letters);
    let landed = 0;
    let at = start;
    for (let i = 0; i < PHRASE; i++) {
      // A bar keeps one tempo; the next one drifts a little.
      if (i > 0 && i % perBar === 0) tempo = drift(tempo, dir, perBar * beatOf(tempo), this.s.tempo, this.baseS);
      const T = beatOf(tempo), F = fallSeconds(T);
      const land = at;
      if (land > this.roundS) break;
      if (i % perBar === 0) this.bars.push({ index: this.bars.length, start: land, beat: T / bpl, phrase, kind: 'play' });
      at += T;
      let lane = lanes[i];
      // A lane whose cloud changes meanwhile gives its letter to the nearest lane that is free.
      const release = Math.max(now, land - F);
      if (blocked(this.s.changes, lane, release, land)) {
        const free = this.s.lanes.map((_, j) => j).filter((j) => !blocked(this.s.changes, j, release, land)).sort((a, b) => Math.abs(a - lane) - Math.abs(b - lane));
        if (free.length) lane = free[0];
      }
      this.drops.push({ index: this.drops.length, lane, ...laneNow(this.s.lanes, this.s.changes, lane, release), release, land, T, w, phrase });
      landed++;
    }
    ph.end = at;
    ph.after = drift(tempo, dir, perBar * beatOf(tempo), this.s.tempo, this.baseS);
    if (landed < PHRASE) this.close();
  }

  /** The closing bar, a beat after the last landing. */
  private close(): void {
    if (this.closed) return;
    this.closed = true;
    const last = this.drops[this.drops.length - 1];
    const tempo = this.phrases[last.phrase].tempo;
    const b = last.T / beatsPerLetter(tempo);
    this.bars.push({ index: this.bars.length, start: last.land + last.T, beat: b, phrase: last.phrase, kind: 'end' });
  }
}

/** A landing as the beat measure sees it: the catch's offset from the landing (seconds, negative = early) or null when it was missed. */
export interface Landing {
  offset: number | null;
  T: number;
}

/** Accuracy caps the rhythm: no cap from 95 %, none left at 75 %. */
export function accuracyCap(accuracy: number): number {
  return 100 * clamp01((accuracy - 0.75) / (0.95 - 0.75));
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * The beat measure of rhythm, 0-100, or null with fewer than `min` landings: the catches' offsets
 * relative to the beat, around their median (the child's own steady lean), their mean distance
 * (MAO) from 0.1 beat (100) to 0.3 (0), times the share caught, never above the accuracy's cap.
 */
export function beatScore(landings: readonly Landing[], accuracy: number, min = SCORE_MIN): number | null {
  if (landings.length < min) return null;
  const rel = landings.filter((l) => l.offset !== null).map((l) => l.offset! / l.T);
  if (!rel.length) return 0;
  const bias = median(rel);
  const mao = rel.reduce((s, o) => s + Math.abs(o - bias), 0) / rel.length;
  const raw = 100 * clamp01((MAO_ZERO - mao) / (MAO_ZERO - MAO_FULL)) * (rel.length / landings.length);
  return Math.round(Math.min(raw, accuracyCap(accuracy)));
}

/** The word for a rhythm score. */
export function rhythmWord(score: number): 'searching' | 'nice' | 'smooth' | 'clockwork' {
  return score >= 90 ? 'clockwork' : score >= 70 ? 'smooth' : score >= 40 ? 'nice' : 'searching';
}


/** A round earns a rhythm note with this rhythm score and accuracy, and with time pressure. */
const NOTE_RHYTHM = 80;
const NOTE_ACCURACY = 0.95;
/** One note fades for every this many days without a Rytmus round, counted from the day after the last. */
const NOTE_FADE_DAYS = 3;

/** Whether a round (its rhythm score, null without one, and its accuracy) earns a note. */
export function earnsNote(score: number | null, accuracy: number): boolean {
  return score !== null && score >= NOTE_RHYTHM && accuracy >= NOTE_ACCURACY;
}

/** Notes faded by `today` since the last round on `at` (played Monday: none on Thursday, one on Friday, two on Monday). */
export function notesDue(at: string | null, today: string): number {
  return at ? Math.max(0, Math.floor((days(at, today) - 1) / NOTE_FADE_DAYS)) : 0;
}

/** The notes left after the fades due by today (`faded` of them already gone since the last round): each fade takes a random note. */
export function fadeNotes<N>(notes: readonly N[], faded: number, at: string | null, today: string, rand: () => number): N[] {
  const left = [...notes];
  for (let k = faded; k < notesDue(at, today) && left.length; k++) left.splice(Math.floor(rand() * left.length), 1);
  return left;
}
