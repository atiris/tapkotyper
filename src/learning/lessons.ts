import { keyName } from '../keyboard/key-names';
import { type Layout, type KeyDef, LAYOUTS, fingerFor, keyByCode, shiftKeyFor, stepsFor } from '../keyboard/layouts';
import type { KeyStat, LayoutId, Profile } from '../storage/schema';

/** Lesson key of the space bar (typed with a thumb). */
export const SPACE = ' ';
/** Pseudo-keys of the two Shifts, each measured on the capitals it serves: left Shift on right-hand letters. */
export const SHIFT_L = 'ShiftL';
export const SHIFT_R = 'ShiftR';
/** Punctuation the lesson path teaches (the US apostrophe included). */
export const PUNCTUATION = new Set(['.', ',', '?', '-', '!', ':', "'"]);

/**
 * Lesson groups: keys that unlock together. The home row and the first reaches
 * come in mirrored pairs (same finger, other hand), the rest one by one. Space comes
 * with the first pair, period and comma with the letters, each Shift in the middle.
 */
const SK_GROUPS = [
  ['f', 'j', SPACE], ['d', 'k'], ['s', 'l'], ['a', 'ô'], ['g', 'h'], ['e', 'i'], ['r', 'u'], ['.'], ['o'], ['t'], ['n'], [','], ['c'], ['v'], ['m'], ['p'], [SHIFT_L],
  ['b'], ['z'], [SHIFT_R], ['y'], ['w'], ['x'], ['q'], ['?'], ['-'],
  ['á'], ['!'], [':'], ['í'], ['é'], ['ý'], ['ž'], ['ť'], ['č'], ['š'], ['ľ'], ['ú'], ['ä'], ['ň'], ['ó'], ['ĺ'], ['ŕ'], ['ď'],
  ['1'], ['2'], ['3'], ['4'], ['5'], ['6'], ['7'], ['8'], ['9'], ['0'],
];

const US_GROUPS = [
  ['f', 'j', SPACE], ['d', 'k'], ['s', 'l'], ['a', ';'], ['g', 'h'], ['e', 'i'], ['r', 'u'], ['.'], ['o'], ['t'], ['n'], [','], ["'"], ['c'], ['v'], ['m'], ['p'], [SHIFT_L],
  ['b'], ['y'], [SHIFT_R], ['w'], ['x'], ['q'], ['z'], ['?'], [':'],
  ['1'], ['!'], ['2'], ['3'], ['4'], ['5'], ['6'], ['7'], ['8'], ['9'], ['0'], ['-'],
];

export const DIACRITICS = new Set([...'áäčďéíĺľňóôŕšťúýž']);

export function lessonGroups(layout: LayoutId): string[][] {
  return layout === 'us-qwerty' ? US_GROUPS : SK_GROUPS;
}

export function lessonOrder(layout: LayoutId): string[] {
  return lessonGroups(layout).flat();
}

export function firstKeys(layout: LayoutId): string[] {
  return [...lessonGroups(layout)[0]];
}

/** Keys each step of the free practice slider adds. */
export const PRACTICE_STEP = 3;

/** The lesson order the free practice picker steps through; no diacritics when the parent turned them off. */
export function practiceOrder(profile: Profile): string[] {
  return lessonOrder(profile.layout).filter((k) => !(profile.settings.noDiacritics && DIACRITICS.has(k)));
}

/** The free practice slider's key sets: the first three keys of the order, three more each step, the last one the whole order. */
export function practiceSteps(order: string[]): string[][] {
  const steps: string[][] = [];
  for (let n = PRACTICE_STEP; n - PRACTICE_STEP < order.length; n += PRACTICE_STEP) steps.push(order.slice(0, n));
  return steps;
}

/** Index of the smallest step that holds all these keys; keys outside the order do not count. */
export function stepHolding(steps: string[][], keys: string[]): number {
  const all = steps[steps.length - 1] ?? [];
  const inOrder = keys.filter((k) => all.includes(k));
  return Math.max(0, steps.findIndex((s) => inOrder.every((k) => s.includes(k))));
}

/**
 * The one accuracy scale of the game, the share of right presses: under `fair` "let's practise",
 * from `fair` "almost" (2 stars, a key ready for the next one, a mastered key, a world's keys),
 * from `good` "it goes" (3 stars, the finger guide fades), from `great` "super" (4 stars). Only the
 * windows (how many last presses) differ; speed is measured and shown, never a condition.
 */
export const ACCURACY = { fair: 0.89, good: 0.94, great: 0.97 } as const;

/** Key statistics look at the last presses only, so old habits stop counting; a key is mastered over this window. */
export const STATS_WINDOW = 100;
/** What a mastered key takes, for texts: `n` presses, and `right` right ones among the last `n`. */
export const MASTERED_TEXT = { n: STATS_WINDOW, right: Math.round(ACCURACY.fair * STATS_WINDOW) };
/** Recent presses window after which the finger guide fades for a key. */
export const MASTERY_WINDOW = 40;
/** A key is ready for the next one after fewer presses than full mastery. */
export const READY_WINDOW = 25;
/** Space, punctuation and the Shifts come up less often than letters, so they get ready sooner. */
export const LIGHT_READY_WINDOW = 12;

/** A letter key (not space, punctuation, a digit or a Shift). */
export function isLetterKey(key: string): boolean {
  return /^\p{L}$/u.test(key);
}

function readyWindow(key: string): number {
  return isLetterKey(key) || /^\d$/.test(key) ? READY_WINDOW : LIGHT_READY_WINDOW;
}

/** The Shift pseudo-key a capital letter needs: the other hand's Shift. Null for anything else. */
export function shiftKeyOf(layout: Layout, ch: string): string | null {
  const lower = ch.toLowerCase();
  if (lower === ch || !isLetterKey(lower)) return null;
  const f = fingerFor(layout, lower);
  return f == null ? null : f <= 4 ? SHIFT_R : SHIFT_L;
}

/** The lesson key a keyboard key teaches (Shift keys as their pseudo-keys), null for dead keys. */
export function lessonKeyOf(def: KeyDef): string | null {
  if (def.base === 'shift') return def.code === 'ShiftLeft' ? SHIFT_L : SHIFT_R;
  return [...def.base].length === 1 ? def.base : null;
}

/** Punctuation lesson keys the layout can type, each with the key (and Shift) that types it. */
export function punctuationKeys(layout: Layout): { key: string; base: string; shift: boolean }[] {
  return [...PUNCTUATION].flatMap((key) => {
    const [step] = stepsFor(layout, key);
    const def = step && keyByCode(layout, step.code);
    return def ? [{ key, base: def.base, shift: step.shift }] : [];
  });
}

/** Median reaction limit: 1600 ms at difficulty 1 down to 800 ms at 10. */
export function reactionLimit(difficulty: number): number {
  const d = Math.min(10, Math.max(1, difficulty));
  return 1600 - ((d - 1) * 800) / 9;
}

export function median(values: number[]): number {
  if (!values.length) return Infinity;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function recentAccuracy(stat: KeyStat | undefined): number {
  if (!stat || !stat.recent.length) return 0;
  return stat.recent.filter((v) => v > 0).length / stat.recent.length;
}

/** Share of right presses among a key's last `size` presses; null with fewer presses. */
function windowAccuracy(stat: KeyStat | undefined, size: number): number | null {
  if (!stat || stat.recent.length < size) return null;
  return stat.recent.slice(-size).filter((v) => v > 0).length / size;
}

/** Typed surely: the last 40 presses at least "it goes" right; the finger guide fades for it. */
export function isFluent(stat: KeyStat | undefined): boolean {
  return (windowAccuracy(stat, MASTERY_WINDOW) ?? 0) >= ACCURACY.good;
}

/** 0 (new) .. 1 (fluent) used to fade the finger guide and to dose capitals by the Shifts. */
export function masteryLevel(stat: KeyStat | undefined): number {
  if (!stat || !stat.recent.length) return 0;
  if (isFluent(stat)) return 1;
  const fill = Math.min(1, stat.recent.length / MASTERY_WINDOW);
  return Math.min(0.9, fill * recentAccuracy(stat));
}

/** Accurate enough to move on: the last presses (25, or 12 for a light key) at least "almost" right; speed does not decide. */
export function isReady(stat: KeyStat | undefined, size = READY_WINDOW): boolean {
  return (windowAccuracy(stat, size) ?? 0) >= ACCURACY.fair;
}

export interface KeyMastery {
  /** Accuracy and median reaction time (ms) of the last STATS_WINDOW presses. */
  accuracy: number;
  medianMs: number;
}

/**
 * A key is mastered when it has at least 100 recorded presses and its last 100 are at least
 * "almost" right (ACCURACY.fair): the presses the heat map judges it by. Speed does not decide;
 * the median reaction is kept for showing. Null while it is not.
 */
export function keyMastery(profile: Profile, key: string): KeyMastery | null {
  const recent = profile.stats.keys[key]?.recent;
  if (!recent || recent.length < STATS_WINDOW) return null;
  const win = recent.slice(-STATS_WINDOW);
  const ok = win.filter((v) => v > 0);
  const accuracy = ok.length / win.length;
  if (accuracy < ACCURACY.fair) return null;
  return { accuracy, medianMs: median(ok) };
}

/** The names of the keys the child masters: every key (and Shift) a mastered key of the practice order is typed with. */
export function masteredKeyNames(profile: Profile): Set<string> {
  const layout = LAYOUTS[profile.layout];
  return new Set(practiceOrder(profile).filter((k) => keyMastery(profile, k)).flatMap((k) => lessonKeyNames(layout, k)));
}

/** The key is ready for the next one, by its own window. */
export function isKeyReady(profile: Profile, key: string): boolean {
  return isReady(profile.stats.keys[key], readyWindow(key));
}

/** The lesson group of the key unlocked last (push order), so a gap the keyboard check left comes after the newest keys. */
function newestUnlocked(profile: Profile): string[] | undefined {
  const last = profile.progress.unlockedKeys[profile.progress.unlockedKeys.length - 1];
  return lessonGroups(profile.layout).find((g) => g.includes(last));
}

/**
 * Unlocks the first lesson group with a locked key (a gap first) when every unlocked key of the
 * newest group is ready. Returns the newly unlocked keys (empty when nothing changed).
 */
export function advanceLesson(profile: Profile): string[] {
  const groups = lessonGroups(profile.layout);
  const unlocked = profile.progress.unlockedKeys;
  const newest = newestUnlocked(profile)?.filter((k) => unlocked.includes(k));
  if (newest && !newest.every((k) => isKeyReady(profile, k))) return [];
  const skip = (k: string) => profile.settings.noDiacritics && DIACRITICS.has(k);
  const next = groups.find((g) => g.some((k) => !unlocked.includes(k) && !skip(k)));
  if (!next) return [];
  const fresh = next.filter((k) => !unlocked.includes(k) && !skip(k));
  unlocked.push(...fresh);
  return fresh;
}

/**
 * Keys of the newest unlocked group that are not ready yet: they hold the next letters back.
 * Empty with the parent's own key choice, where nothing unlocks by itself.
 */
export function notReadyKeys(profile: Profile): string[] {
  return newestGroup(profile).filter((k) => !isKeyReady(profile, k));
}

/**
 * The weak keys the target range trains: the ones not ready, else the three known letters with
 * the lowest recent accuracy (named apart from the stats' `weakKeys`, which ranks any keys).
 */
export function aimKeys(profile: Profile): string[] {
  const held = notReadyKeys(profile);
  if (held.length) return held;
  const acc = (k: string) => recentAccuracy(profile.stats.keys[k]);
  return activeKeys(profile).filter(isLetterKey).sort((a, b) => acc(a) - acc(b)).slice(0, 3);
}

/** Recent accuracy of keys together (their mean), 0 without keys. */
export function keysAccuracy(profile: Profile, keys: string[]): number {
  return keys.length ? keys.reduce((s, k) => s + recentAccuracy(profile.stats.keys[k]), 0) / keys.length : 0;
}

/** The unlocked keys of the most recently unlocked lesson group (the keys being learned now). */
export function newestGroup(profile: Profile): string[] {
  if (profile.settings.activeKeysMode === 'manual') return [];
  const unlocked = profile.progress.unlockedKeys;
  return newestUnlocked(profile)?.filter((k) => unlocked.includes(k)) ?? [];
}

/** Keys used for words right now: the parent's pick or the unlocked lesson keys. */
export function activeKeys(profile: Profile): string[] {
  if (profile.settings.activeKeysMode === 'manual' && profile.settings.manualKeys.length) return profile.settings.manualKeys;
  return profile.progress.unlockedKeys;
}

/**
 * The names of the keys (keyName) a lesson key is typed with, its own key last: the Shift of a shifted character, the
 * dead key of a composed letter; a Shift pseudo-key is its Shift.
 */
export function lessonKeyNames(layout: Layout, key: string): string[] {
  if (key === SHIFT_L) return ['ls'];
  if (key === SHIFT_R) return ['rs'];
  return stepsFor(layout, key).flatMap((step) => [shiftKeyFor(layout, step), step.code])
    .flatMap((code) => (code ? [keyName(layout, code)] : [])).filter((n): n is string => n !== null);
}

/** The profile types on another layout: the progress stays, but only with keys the new layout teaches. */
export function useLayout(profile: Profile, id: LayoutId): void {
  profile.layout = id;
  const order = lessonOrder(id);
  profile.progress.unlockedKeys = order.slice(0, Math.max(2, profile.progress.unlockedKeys.filter((k) => order.includes(k)).length));
}

/** Unlocked keys that were not introduced yet, in lesson order (each is shown alone first). */
export function keysToIntroduce(profile: Profile): string[] {
  if (profile.settings.activeKeysMode === 'manual') return [];
  return profile.progress.unlockedKeys.filter((k) => !profile.progress.introducedKeys.includes(k));
}

/** The lesson keys that teach these named keys (keyName): for each the first key of the practice order typed on it, else the first one needing it (a Shift, a dead key). */
export function lessonKeysFor(profile: Profile, names: string[]): string[] {
  const layout = LAYOUTS[profile.layout];
  const order = practiceOrder(profile).map((k) => ({ k, names: lessonKeyNames(layout, k) }));
  return [...new Set(names.flatMap((n) => {
    const key = order.find((o) => o.names.at(-1) === n) ?? order.find((o) => o.names.includes(n));
    return key ? [key.k] : [];
  }))];
}
