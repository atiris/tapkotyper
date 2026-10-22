import { type Layout, type KeyDef, fingerFor, stepsFor, keyByCode } from '../keyboard/layouts';
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

/** Recent presses window used by the mastery rule. */
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

export function isMastered(stat: KeyStat | undefined, difficulty: number): boolean {
  if (!stat || stat.recent.length < MASTERY_WINDOW) return false;
  const window = stat.recent.slice(-MASTERY_WINDOW);
  const ok = window.filter((v) => v > 0);
  return ok.length / window.length >= 0.92 && median(ok) <= reactionLimit(difficulty);
}

/** 0 (new) .. 1 (mastered) used to fade the finger guide. */
export function masteryLevel(stat: KeyStat | undefined, difficulty: number): number {
  if (!stat || !stat.recent.length) return 0;
  if (isMastered(stat, difficulty)) return 1;
  const fill = Math.min(1, stat.recent.length / MASTERY_WINDOW);
  return Math.min(0.9, fill * recentAccuracy(stat));
}

/** Accurate and steady enough to move on: the last presses (25, or 12 for a light key), 90 % right, calm rhythm. */
export function isReady(stat: KeyStat | undefined, difficulty: number, size = READY_WINDOW): boolean {
  if (!stat || stat.recent.length < size) return false;
  const window = stat.recent.slice(-size);
  const ok = window.filter((v) => v > 0);
  return ok.length / window.length >= 0.9 && median(ok) <= reactionLimit(difficulty);
}

/**
 * Unlocks the next lesson group when every key of the newest unlocked group is
 * ready. Returns the newly unlocked keys (empty when nothing changed).
 */
export function advanceLesson(profile: Profile): string[] {
  const groups = lessonGroups(profile.layout);
  const unlocked = profile.progress.unlockedKeys;
  const newest = [...groups].reverse().find((g) => g.some((k) => unlocked.includes(k)));
  if (newest && !newest.every((k) => isReady(profile.stats.keys[k], profile.settings.difficulty, readyWindow(k)))) return [];
  const skip = (k: string) => profile.settings.noDiacritics && DIACRITICS.has(k);
  const next = groups.find((g) => g.some((k) => !unlocked.includes(k) && !skip(k)));
  if (!next) return [];
  const fresh = next.filter((k) => !unlocked.includes(k) && !skip(k));
  unlocked.push(...fresh);
  return fresh;
}

/** The most recently unlocked lesson group (the keys being learned now). */
export function newestGroup(profile: Profile): string[] {
  if (profile.settings.activeKeysMode === 'manual') return [];
  const unlocked = profile.progress.unlockedKeys;
  const group = [...lessonGroups(profile.layout)].reverse().find((g) => g.some((k) => unlocked.includes(k)));
  return group ? group.filter((k) => unlocked.includes(k)) : [];
}

/** Keys used for words right now: the parent's pick or the unlocked lesson keys. */
export function activeKeys(profile: Profile): string[] {
  if (profile.settings.activeKeysMode === 'manual' && profile.settings.manualKeys.length) return profile.settings.manualKeys;
  return profile.progress.unlockedKeys;
}

/** Unlocked keys that were not introduced yet, in lesson order (each is shown alone first). */
export function keysToIntroduce(profile: Profile): string[] {
  if (profile.settings.activeKeysMode === 'manual') return [];
  return profile.progress.unlockedKeys.filter((k) => !profile.progress.introducedKeys.includes(k));
}
