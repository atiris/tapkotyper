import { STAR_STEPS } from '../game/levels';
import { type Finger, type Layout, LAYOUTS, homeKey, stepsFor } from '../keyboard/layouts';
import type { LayoutId } from '../storage/schema';
import { DIACRITICS, SPACE, lessonGroups, median, reactionLimit, shiftKeyOf } from './lessons';

/**
 * The placement check ("How am I doing on the keyboard?"): a calm copy run in stages along the
 * lesson order. A stage passes on accuracy, the reaction of its new keys and the touch-typing
 * signal; the check stops at the first stage that does not pass.
 */

/** One press of the check: the character the target expected, right or wrong, when (ms) and where in which target. */
export interface PlacementPress {
  ch: string;
  ok: boolean;
  /** Reaction ms (since the press before), as the key statistics measure it. */
  rt: number;
  /** `performance.now()` ms of the press. */
  at: number;
  /** The target's id and the place of the character in it. */
  target: number;
  pos: number;
}

/** One stage: the newest group in focus, the words from every key up to it. */
export interface PlacementStage {
  group: string[];
  keys: string[];
}

/** The stages of a layout: one per lesson group, without diacritics when the parent turned them off. */
export function placementStages(layout: LayoutId, noDiacritics: boolean): PlacementStage[] {
  const keys: string[] = [];
  return lessonGroups(layout).flatMap((g) => {
    const group = g.filter((k) => !(noDiacritics && DIACRITICS.has(k)));
    if (!group.length) return [];
    keys.push(...group);
    return [{ group, keys: [...keys] }];
  });
}

/** Presses a stage needs at least, of them correct presses of its new keys, and the most targets it takes. */
export const STAGE_PRESSES = 25;
export const STAGE_FOCUS_PRESSES = 5;
export const STAGE_TARGETS = 8;
/** Seconds of typing after which the check ends at the latest. */
export const PLACEMENT_SECONDS = 240;
/** A stage's accuracy: the three-star step. */
export const STAGE_ACCURACY = STAR_STEPS.find((s) => s.stars === 3)!.from;

/** The lesson keys a typed character trains: the letter (lower case) and, for a capital, its Shift. */
export function lessonKeysOf(layout: LayoutId, ch: string): string[] {
  const shift = shiftKeyOf(LAYOUTS[layout], ch);
  return shift ? [ch.toLowerCase(), shift] : [ch];
}

/** Reaction times of correct presses that are not the first key of a target (that one is reading time). */
const typingRts = (presses: PlacementPress[]): number[] => presses.filter((x) => x.ok && x.pos > 0).map((x) => x.rt);

/** The median reaction of the check's correct presses (first keys of targets left out), Infinity without any. */
export function placementReaction(presses: PlacementPress[]): number {
  return median(typingRts(presses));
}

/** A stage's accuracy and the median reaction of its new keys (null when none was typed right). */
export function stageScore(presses: PlacementPress[], group: string[], layout: LayoutId): { accuracy: number; reaction: number | null } {
  const ok = presses.filter((x) => x.ok).length;
  const own = typingRts(presses.filter((x) => lessonKeysOf(layout, x.ch).some((k) => group.includes(k))));
  return { accuracy: presses.length ? ok / presses.length : 0, reaction: own.length ? median(own) : null };
}

/** The stage passes on accuracy and reaction; with no new key typed right the reaction does not decide. */
export function stagePasses(presses: PlacementPress[], group: string[], layout: LayoutId, difficulty: number): boolean {
  const s = stageScore(presses, group, layout);
  return s.accuracy >= STAGE_ACCURACY && (s.reaction === null || s.reaction <= reactionLimit(difficulty));
}

// ---- the touch-typing signal ---------------------------------------------------------------

/**
 * The limits of the touch-typing signal. `fit`: the signal fails when the travel from the previous
 * key explains the intervals this much better than the ten-finger reach does. `contrast`: it fails
 * when near same-finger pairs are not slower than far pairs of two fingers by at least this ratio.
 * A measure decides only with enough intervals (`minIntervals`, `minPairs` in each contrast group).
 */
export const TOUCH_SIGNAL = {
  fit: 0.2,
  contrast: 0.95,
  minIntervals: 60,
  minPairs: 12,
  /** Longer intervals are pauses, not typing. */
  pauseMs: 2500,
  /** A near pair is at most this far apart, a far pair at least this far (key widths). */
  nearMax: 1.5,
  farMin: 2,
} as const;

/** Where a key sits (key widths from the left edge, rows from the top) and which finger types it. */
export interface KeySpot {
  x: number;
  y: number;
  finger: Finger;
}

/** The left edge of the first character key of each row (standard stagger); the left Shift is no character key. */
const ROW_START = [0, 1.5, 1.75, 2.25];

/** The spot of a character typed with one key and no Shift; null for anything else (capitals, dead keys, space). */
export function keySpot(layout: Layout, ch: string): KeySpot | null {
  if (ch === SPACE) return null;
  const steps = stepsFor(layout, ch);
  if (steps.length !== 1 || steps[0].shift) return null;
  for (let y = 0; y < ROW_START.length; y++) {
    const row = layout.rows[y].filter((d) => d.base !== 'shift');
    const i = row.findIndex((d) => d.code === steps[0].code);
    if (i >= 0) return { x: ROW_START[y] + i + 0.5, y, finger: row[i].finger };
  }
  return null;
}

const distance = (a: KeySpot, b: KeySpot) => Math.hypot(a.x - b.x, a.y - b.y);
const handOf = (f: Finger) => (f <= 4 ? 0 : 1);

/** One interval between two keys of a word typed right one after the other. */
export interface Interval {
  from: string;
  to: string;
  ms: number;
}

/**
 * The intervals the signal reads: correct presses right after the correct press of the character
 * before them in the same word (the first key of a word is reading time), no pauses.
 */
export function intervals(presses: PlacementPress[]): Interval[] {
  const out: Interval[] = [];
  for (let i = 1; i < presses.length; i++) {
    const a = presses[i - 1], b = presses[i];
    if (!a.ok || !b.ok || a.target !== b.target || b.pos !== a.pos + 1 || a.ch === SPACE || b.ch === SPACE) continue;
    const ms = b.at - a.at;
    if (ms > 0 && ms <= TOUCH_SIGNAL.pauseMs) out.push({ from: a.ch, to: b.ch, ms });
  }
  return out;
}

/** A pair of keys as the signal sees it: same hand, the pecking travel and the ten-finger cost. */
interface Pair {
  sameHand: boolean;
  sameFinger: boolean;
  offHome: boolean;
  travel: number;
  /** Distance of the second key from its finger's home key, plus one for a pair on one finger. */
  cost: number;
}

function pairOf(layout: Layout, from: string, to: string): Pair | null {
  const a = keySpot(layout, from), b = keySpot(layout, to);
  if (!a || !b || from === to) return null;
  const home = (s: KeySpot) => {
    const h = homeKey(layout, s.finger);
    return h ? keySpot(layout, h) ?? s : s;
  };
  const sameFinger = a.finger === b.finger;
  return {
    sameHand: handOf(a.finger) === handOf(b.finger),
    sameFinger,
    offHome: homeKey(layout, a.finger) !== from || homeKey(layout, b.finger) !== to,
    travel: distance(a, b),
    cost: distance(b, home(b)) + (sameFinger ? 1 : 0),
  };
}

/** Which contrast group a pair is in: near on one finger, far on two fingers (one of the keys off its home key), or none. */
export function contrastGroup(layout: Layout, from: string, to: string): 'near' | 'far' | null {
  const p = pairOf(layout, from, to);
  if (!p || !p.sameHand || !p.offHome) return null;
  if (p.sameFinger && p.travel <= TOUCH_SIGNAL.nearMax) return 'near';
  if (!p.sameFinger && p.travel >= TOUCH_SIGNAL.farMin) return 'far';
  return null;
}

/** Contrast pairs in a target: how many near and far pairs its words hold. */
export function contrastPairs(layout: Layout, target: string): { near: number; far: number } {
  const n = { near: 0, far: 0 };
  const chars = [...target];
  for (let i = 1; i < chars.length; i++) {
    const g = contrastGroup(layout, chars[i - 1], chars[i]);
    if (g) n[g]++;
  }
  return n;
}

/** Average ranks (ties share their rank). */
function ranks(v: number[]): number[] {
  const order = v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(v.length);
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
    for (let k = i; k <= j; k++) r[order[k][1]] = (i + j) / 2;
    i = j + 1;
  }
  return r;
}

/** Spearman's rank correlation; 0 when either side does not vary. */
export function spearman(a: number[], b: number[]): number {
  const ra = ranks(a), rb = ranks(b);
  const ma = ra.reduce((s, x) => s + x, 0) / ra.length, mb = rb.reduce((s, x) => s + x, 0) / rb.length;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < ra.length; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2;
    db += (rb[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

/** Both measures (null when a measure has too few intervals) and the decision. */
export interface TouchSignal {
  fit: number | null;
  contrast: number | null;
  pass: boolean;
}

/**
 * Does the timing look like ten fingers that do not need the eyes? Measured against the student's
 * own times only (ranks and ratios), so the tempo does not matter. `fit`: the rank correlation of
 * the same-hand intervals with the pecking travel minus the one with the ten-finger cost; `contrast`:
 * the median of near same-finger pairs over the median of far two-finger pairs.
 */
export function touchSignal(presses: PlacementPress[], layoutId: LayoutId): TouchSignal {
  const layout = LAYOUTS[layoutId];
  const pairs = intervals(presses).flatMap((iv) => {
    const p = pairOf(layout, iv.from, iv.to);
    return p && p.sameHand ? [{ ...p, ms: iv.ms, group: contrastGroup(layout, iv.from, iv.to) }] : [];
  });
  const L = TOUCH_SIGNAL;
  const ms = pairs.map((p) => p.ms);
  const fit = pairs.length >= L.minIntervals ? spearman(ms, pairs.map((p) => p.travel)) - spearman(ms, pairs.map((p) => p.cost)) : null;
  const near = pairs.filter((p) => p.group === 'near').map((p) => p.ms), far = pairs.filter((p) => p.group === 'far').map((p) => p.ms);
  const contrast = near.length >= L.minPairs && far.length >= L.minPairs ? median(near) / median(far) : null;
  return { fit, contrast, pass: !(fit !== null && fit >= L.fit) && !(contrast !== null && contrast < L.contrast) };
}

// ---- the check -----------------------------------------------------------------------------

/** How the check ended: every stage passed, a stage did not, the timing looked like eyes on the keys, or the time ran out. */
export type PlacementEnd = 'all' | 'stage' | 'signal' | 'time';

/**
 * The check's course: presses come in, after each target it decides whether the stage goes on,
 * the next one starts or the check ends.
 */
export class PlacementCheck {
  readonly stages: PlacementStage[];
  readonly presses: PlacementPress[] = [];
  /** The current stage, and the stages passed. */
  stage = 0;
  passed = 0;
  end: PlacementEnd | null = null;
  signal: TouchSignal = { fit: null, contrast: null, pass: true };
  private stageFrom = 0;
  private targets = 0;

  constructor(readonly layout: LayoutId, noDiacritics: boolean, readonly difficulty: number) {
    this.stages = placementStages(layout, noDiacritics);
  }

  get current(): PlacementStage {
    return this.stages[Math.min(this.stage, this.stages.length - 1)];
  }

  press(p: PlacementPress): void {
    if (!this.end) this.presses.push(p);
  }

  /** A target is typed: the stage goes on, or it is judged and the next one starts or the check ends. Returns whether the check goes on. */
  targetDone(): boolean {
    if (this.end) return false;
    this.targets++;
    const own = this.presses.slice(this.stageFrom);
    const focus = own.filter((x) => x.ok && lessonKeysOf(this.layout, x.ch).some((k) => this.current.group.includes(k))).length;
    if (this.targets < STAGE_TARGETS && (own.length < STAGE_PRESSES || focus < STAGE_FOCUS_PRESSES)) return true;
    this.signal = touchSignal(this.presses, this.layout);
    if (!this.signal.pass) this.end = 'signal';
    else if (!stagePasses(own, this.current.group, this.layout, this.difficulty)) this.end = 'stage';
    else {
      this.passed++;
      this.stage++;
      this.stageFrom = this.presses.length;
      this.targets = 0;
      if (this.stage >= this.stages.length) this.end = 'all';
    }
    return !this.end;
  }

  /** The time is up: the stage being typed does not count. */
  stop(): void {
    if (this.end) return;
    this.signal = touchSignal(this.presses, this.layout);
    this.end = this.signal.pass ? 'time' : 'signal';
  }

  /**
   * The keys the check opens: every key of the passed stages; none when the signal failed, and none
   * when only the first stage passed (its keys are every new player's, and its few presses prove nothing).
   */
  get keys(): string[] {
    return this.end === 'signal' || this.passed < 2 ? [] : this.stages[this.passed - 1].keys;
  }

  /** Share of the stages done, for the progress bar. */
  get progress(): number {
    return this.end ? 1 : this.stage / this.stages.length;
  }
}

// ---- the result ----------------------------------------------------------------------------

/** Presses a key needs in the run to be ranked strong or weak, and how many of each are shown. */
export const RANKED_PRESSES = 5;
export const RANKED_MAX = 5;

/**
 * The strong and weak keys of this run (not the stored statistics): every key with enough presses,
 * ranked by accuracy, then by its median reaction against the limit. Weak: under the stage accuracy
 * or slower than the limit; strong: the rest.
 */
export function strongWeak(presses: PlacementPress[], layout: LayoutId, difficulty: number): { strong: string[]; weak: string[] } {
  const by = new Map<string, PlacementPress[]>();
  for (const x of presses) for (const k of lessonKeysOf(layout, x.ch)) by.set(k, [...(by.get(k) ?? []), x]);
  const limit = reactionLimit(difficulty);
  const rows = [...by].filter(([, list]) => list.length >= RANKED_PRESSES).map(([key, list]) => {
    const rts = typingRts(list);
    return { key, accuracy: list.filter((x) => x.ok).length / list.length, speed: rts.length ? median(rts) / limit : 1 };
  });
  rows.sort((a, b) => b.accuracy - a.accuracy || a.speed - b.speed);
  const weak = (r: (typeof rows)[number]) => r.accuracy < STAGE_ACCURACY || r.speed > 1;
  return {
    strong: rows.filter((r) => !weak(r)).slice(0, RANKED_MAX).map((r) => r.key),
    weak: rows.filter(weak).reverse().slice(0, RANKED_MAX).map((r) => r.key),
  };
}

/** The auto difficulty after a check: the highest up to `max` whose reaction limit leaves a fifth to spare over the check's reaction; never lower. */
export function placementDifficulty(current: number, reaction: number, max: number): number {
  for (let d = max; d > current; d--) if (reactionLimit(d) >= 1.2 * reaction) return d;
  return current;
}

/** A level in the first world went so well (accuracy, reaction of correct presses) that the turtle offers the check. */
export const OFFER_ACCURACY = 0.97;
export const OFFER_REACTION = 0.7;

export function offersPlacement(accuracy: number, rts: number[], difficulty: number): boolean {
  return rts.length > 0 && accuracy >= OFFER_ACCURACY && median(rts) <= OFFER_REACTION * reactionLimit(difficulty);
}
