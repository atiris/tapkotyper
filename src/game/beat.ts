/**
 * Rytmus, the beat game, without drawing or sound: the finger lanes, the tempo and its steps, the
 * catch window around each landing, the letters' order, the lanes' letter changes, the song's bars
 * and drops on one clock, and the beat measure of rhythm (`.specify/game/rhythm.md`).
 */
import type { Finger } from '../keyboard/layouts';
import type { RhythmRecord } from '../storage/schema';

/** Tempo steps in letters a minute. */
export const TEMPI = [30, 36, 42, 48, 54, 60, 70, 80, 90, 100, 110, 120] as const;
/** Landings in one phrase: the tempo changes only between phrases. */
export const PHRASE = 16;
/** Seconds of song a round lasts. */
export const ROUND_S = 180;
/** The catch window around a landing, in letter beats: from half a beat before to a quarter after. */
export const ZONE_BEFORE = 0.5;
export const ZONE_AFTER = 0.25;
/** A catch this close to its landing (in letter beats) is "in time". */
export const IN_TIME = 0.12;
/** Below this tempo the music plays twice as fast and a letter lands on every second beat. */
const DOUBLE_BELOW = 60;
/** Seconds before its first letter leaves the cloud that a phrase is planned (and its tempo decided). */
const PLAN_AHEAD_S = 0.2;
/** Seconds of quiet before the count-in bar. */
const LEAD_S = 0.6;
/** A kept tempo older than this many days starts one step lower. */
const KEPT_DAYS = 7;
/** The first round's tempo: this share of the usual speed, between the first step and this one. */
const START_SHARE = 0.7;
const START_MAX = 60;
/** Seconds around a lane's letter change in which none of its letters may be in the air (the cloud dissolves, a new one comes). */
export const CHANGE_S = 1.2;
/** Weight of a weak letter (the lowest third by recent accuracy, at most three) in the free phrases. */
const WEAK_WEIGHT = 1.5;
/** Landings the HUD's rhythm ring looks back at, the fewest it shows a number for, and the fewest a round's score needs. */
export const RING_WINDOW = 16;
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

/** Seconds per letter at a tempo. */
export const beatOf = (tempo: number) => 60 / tempo;

/** Music beats per letter: two below 60 letters a minute, so the music never drags. */
export const beatsPerLetter = (tempo: number) => (tempo < DOUBLE_BELOW ? 2 : 1);

/** Seconds a letter falls from its cloud to the basket: the next one is always in the air already. */
export function fallSeconds(T: number): number {
  return Math.max(1.6, Math.min(3, 2.5 * T), 1.3 * T);
}

/** The tempo one step up (+1) or down (-1), within the steps. */
export function stepTempo(tempo: number, dir: -1 | 0 | 1): number {
  const i = TEMPI.findIndex((x) => x >= tempo);
  const at = i < 0 ? TEMPI.length - 1 : i;
  return TEMPI[Math.max(0, Math.min(TEMPI.length - 1, at + dir))];
}

/** The highest step at or below `x`, at least the first. */
const stepAtOrBelow = (x: number) => [...TEMPI].reverse().find((s) => s <= x) ?? TEMPI[0];

/** Days from `from` to `to`, both local dates `YYYY-MM-DD`. */
function days(from: string, to: string): number {
  const d = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  return Math.round((d(to) - d(from)) / 86_400_000);
}

/**
 * A round's first tempo: the world's kept tempo (one step lower after a week without playing),
 * else the step at or below 70 % of the usual speed (letters a minute), at most 60; a new child 30.
 */
export function startTempo(kept: RhythmRecord | undefined, usualCpm: number, today: string): number {
  if (kept) return days(kept.at, today) > KEPT_DAYS ? stepTempo(kept.tempo, -1) : stepTempo(kept.tempo, 0);
  return Math.min(START_MAX, stepAtOrBelow(usualCpm * START_SHARE));
}

/** A phrase's step: up with accuracy >= 95 % and caught >= 90 %, down with accuracy < 85 % or caught < 70 %; errors weigh more than misses. */
export function phraseStep(accuracy: number, caught: number): -1 | 0 | 1 {
  if (accuracy < 0.85 || caught < 0.7) return -1;
  return accuracy >= 0.95 && caught >= 0.9 ? 1 : 0;
}

/** The world's target tempo: the smallest step at or above its story's words a minute as letters (five a word). */
export function targetTempo(wordsPerMinute: number): number {
  return TEMPI.find((s) => s >= wordsPerMinute * 5) ?? TEMPI[TEMPI.length - 1];
}

/** Where a press at `at` stands to a landing at `land` with letter beat `T`: before the window, in it, or after it. */
export function judge(at: number, land: number, T: number): 'early' | 'catch' | 'late' {
  if (at < land - ZONE_BEFORE * T) return 'early';
  return at <= land + ZONE_AFTER * T ? 'catch' : 'late';
}

/** Weights of the lanes in the free phrases: the lowest third by recent accuracy (at most three) a little more often. */
export function laneWeights(accuracy: readonly number[]): number[] {
  const weak = Math.min(3, Math.ceil(accuracy.length / 3));
  const order = accuracy.map((a, i) => [a, i] as const).sort((a, b) => a[0] - b[0]).slice(0, weak).map(([, i]) => i);
  return accuracy.map((_, i) => (order.includes(i) ? WEAK_WEIGHT : 1));
}

/** `n` items of `motif`, round and round. */
const cycle = (motif: number[], n = PHRASE) => Array.from({ length: n }, (_, i) => motif[i % motif.length]);

/**
 * The lanes of one phrase's letters, from easy to harder: the two index fingers in turn, mirror
 * pairs of the hands, neighbours of one hand, then free (weighted, never the same letter twice in
 * a row unless `repeats`). A pattern the lanes cannot make is free too.
 */
export function phraseLanes(phrase: number, lanes: readonly Lane[], weights: readonly number[], rand: () => number, repeats: boolean): number[] {
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
  const out: number[] = [];
  for (let k = 0; k < PHRASE; k++) {
    const prev = out[k - 1];
    const open = weights.map((w, i) => (repeats || i !== prev || lanes.length < 2 ? w : 0));
    const sum = open.reduce((a, b) => a + b, 0);
    let x = rand() * sum, i = 0;
    while (i < open.length - 1 && (x -= open[i]) >= 0) i++;
    out.push(i);
  }
  return out;
}

/** A lane's letter changes at `at` (song seconds) to `letter`. */
export interface LaneChange {
  at: number;
  lane: number;
  letter: string;
}

/**
 * The round's letter changes: `count` of them (a story's tier + 1) spread evenly over the round,
 * taking turns on the lanes whose finger has another letter; none when no lane has one.
 */
export function planChanges(lanes: readonly Lane[], count: number, roundS = ROUND_S): LaneChange[] {
  const open = lanes.map((_, i) => i).filter((i) => lanes[i].letters.length > 1);
  if (!open.length) return [];
  const turns = new Map<number, number>();
  return Array.from({ length: count }, (_, k) => {
    const lane = open[k % open.length];
    const n = (turns.get(lane) ?? 0) + 1;
    turns.set(lane, n);
    const letters = lanes[lane].letters;
    return { at: (roundS * (k + 1)) / (count + 1), lane, letter: letters[n % letters.length] };
  });
}

/** The letter of a lane for a drop that leaves its cloud at `release`: the last change before it. */
export function laneLetter(lanes: readonly Lane[], changes: readonly LaneChange[], lane: number, release: number): string {
  let letter = lanes[lane].letters[0];
  for (const c of changes) if (c.lane === lane && c.at <= release) letter = c.letter;
  return letter;
}

/** No letter of the lane may be in the air while its cloud changes. */
function blocked(changes: readonly LaneChange[], lane: number, release: number, land: number): boolean {
  return changes.some((c) => c.lane === lane && release <= c.at + CHANGE_S && land >= c.at);
}

/** One letter of the song: its lane and letter, when it leaves its cloud and lands, its letter beat and phrase. */
export interface Drop {
  index: number;
  lane: number;
  letter: string;
  release: number;
  land: number;
  T: number;
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

/** A phrase: its tempo, its first landing and its first drop. */
export interface Phrase {
  tempo: number;
  start: number;
  first: number;
}

export interface SongSetup {
  lanes: readonly Lane[];
  changes: readonly LaneChange[];
  weights: readonly number[];
  tempo: number;
  rand: () => number;
  roundS?: number;
}

/**
 * The round's song on one clock (seconds from the start): a count-in bar, then phrases of 16
 * landings, each at its own tempo, until the round's time; a closing bar after the last landing.
 * A phrase is planned just before its first letter leaves its cloud; its tempo is the one
 * `decide` gives then (the step of the phrase before, judged on its letters resolved by then).
 */
export class Song {
  readonly drops: Drop[] = [];
  readonly bars: Bar[] = [];
  readonly phrases: Phrase[] = [];
  readonly roundS: number;
  /** The song is planned to its end: no phrase comes any more. */
  closed = false;

  constructor(private s: SongSetup) {
    this.roundS = s.roundS ?? ROUND_S;
    const b = beatOf(s.tempo) / beatsPerLetter(s.tempo);
    this.bars.push({ index: 0, start: LEAD_S, beat: b, phrase: 0, kind: 'count' });
    this.addPhrase(s.tempo, LEAD_S + 4 * b);
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
    const T = beatOf(p.tempo);
    return p.start + PHRASE * T - fallSeconds(T) - PLAN_AHEAD_S;
  }

  /** At song time `now`, plans the next phrase when it is due; `decide` gives the step from the current phrase. */
  tick(now: number, decide: () => -1 | 0 | 1): void {
    if (now < this.due) return;
    const p = this.phrases[this.phrases.length - 1];
    const start = p.start + PHRASE * beatOf(p.tempo);
    if (start > this.roundS) return this.close();
    this.addPhrase(stepTempo(p.tempo, decide()), start, now);
  }

  /** A phrase from `start`; no letter leaves its cloud before `now` (a slower next tempo falls a little longer than the time left). */
  private addPhrase(tempo: number, start: number, now = 0): void {
    const phrase = this.phrases.length;
    const T = beatOf(tempo), F = fallSeconds(T), bpl = beatsPerLetter(tempo);
    this.phrases.push({ tempo, start, first: this.drops.length });
    const lanes = phraseLanes(phrase, this.s.lanes, this.s.weights, this.s.rand, start >= this.roundS / 2);
    let landed = 0;
    for (let i = 0; i < PHRASE; i++) {
      const land = start + i * T;
      if (land > this.roundS) break;
      let lane = lanes[i];
      // A lane whose cloud changes meanwhile gives its letter to the nearest lane that is free.
      const release = Math.max(now, land - F);
      if (blocked(this.s.changes, lane, release, land)) {
        const free = this.s.lanes.map((_, j) => j).filter((j) => !blocked(this.s.changes, j, release, land)).sort((a, b) => Math.abs(a - lane) - Math.abs(b - lane));
        if (free.length) lane = free[0];
      }
      this.drops.push({ index: this.drops.length, lane, letter: laneLetter(this.s.lanes, this.s.changes, lane, release), release, land, T, phrase });
      landed++;
    }
    const bars = Math.ceil((landed * bpl) / 4);
    for (let k = 0; k < bars; k++) this.bars.push({ index: this.bars.length, start: start + k * 4 * T / bpl, beat: T / bpl, phrase, kind: 'play' });
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
 * (MAO) from 0.06 beat (100) to 0.25 (0), times the share caught, never above the accuracy's cap.
 */
export function beatScore(landings: readonly Landing[], accuracy: number, min = SCORE_MIN): number | null {
  if (landings.length < min) return null;
  const rel = landings.filter((l) => l.offset !== null).map((l) => l.offset! / l.T);
  if (!rel.length) return 0;
  const bias = median(rel);
  const mao = rel.reduce((s, o) => s + Math.abs(o - bias), 0) / rel.length;
  const raw = 100 * clamp01((0.25 - mao) / (0.25 - 0.06)) * (rel.length / landings.length);
  return Math.round(Math.min(raw, accuracyCap(accuracy)));
}

/** The word for a rhythm score. */
export function rhythmWord(score: number): 'searching' | 'nice' | 'smooth' | 'clockwork' {
  return score >= 90 ? 'clockwork' : score >= 70 ? 'smooth' : score >= 40 ? 'nice' : 'searching';
}

/** The basket's picture (0 empty .. 4 full) for `caught` letters of the `planned` a round at its start tempo brings. */
export function basketFill(caught: number, planned: number): number {
  if (!caught) return 0;
  return Math.min(4, Math.max(1, Math.floor((5 * caught) / Math.max(1, planned))));
}
