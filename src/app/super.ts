import { accessories } from '../gfx/assets';
import { LEVELS, WORLDS, keysNeeded, levelById, storyOf } from '../game/levels';
import { PAW_MAX } from '../game/paw';
import { markSimulated } from '../game/progress';
import { WORLD_REWARDS } from '../game/rewards';
import { lessonGroups, lessonOrder, practiceOrder } from '../learning/lessons';
import { COMPANION_KINDS, type Lang, SUPER_ID, type Profile } from '../storage/schema';
import { newProfile } from '../storage/store';

/** Typed on the start screen (no field) fast enough to prove it is not a learner. */
export const SUPER_PASSWORD = 'supertapkotyper';
/** The whole password within this time: about 210 characters per minute. */
const SUPER_MS = 4000;

/**
 * Listens for the super password on a start page; returns the cleanup.
 * Only a fluent typist reaches the speed, so a child practising the word does not.
 */
export function listenForSuperPassword(onUnlock: () => void): () => void {
  let typed: { ch: string; at: number }[] = [];
  const onKey = (e: KeyboardEvent) => {
    if (e.repeat || [...e.key].length !== 1 || e.target instanceof HTMLInputElement) return;
    typed = [...typed, { ch: e.key.toLowerCase(), at: performance.now() }].slice(-SUPER_PASSWORD.length);
    if (typed.map((x) => x.ch).join('') === SUPER_PASSWORD && typed[typed.length - 1].at - typed[0].at <= SUPER_MS) {
      typed = [];
      onUnlock();
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}

/**
 * A temporary player with every world, level, key and accessory open. It lives in
 * memory only: it never touches real players' statistics and a reload ends it.
 */
export function superProfile(lang: Lang): Profile {
  const p = newProfile('', lang, undefined, 'fox', 'Super Tapko');
  p.id = SUPER_ID;
  const keys = lessonOrder(p.layout);
  p.progress.unlockedKeys = [...keys];
  p.progress.introducedKeys = [...keys];
  p.progress.worldsDone = WORLDS.map((_, i) => i);
  p.progress.rewards = [...accessories().map((a) => `acc:${a.id}`), ...WORLD_REWARDS];
  p.progress.levels = Object.fromEntries(LEVELS.map((l) => [l.id, 0]));
  p.progress.pawHelp = PAW_MAX;
  p.progress.companionsUnlocked = [...COMPANION_KINDS];
  p.settings.wardrobeLimit = false;
  return p;
}

/** What a running level offers the service menu. */
export interface ServiceLevel {
  /** The level plays (not paused, not on a card, not finished) and ends by itself with a result. */
  canSimulate(): boolean;
  /** Plays the rest of the level by itself with `mistakes` wrong keys; nothing of the run counts in the statistics. */
  simulate(mistakes: number): void;
}

/** The level running now, for the service menu; null outside a level. */
export const service = { level: null as ServiceLevel | null };

/**
 * Opens a level for a stored player from the service menu: every earlier level of its story
 * without stars gets one (marked simulated), the earlier worlds of the story are done, and the
 * keys the level and its story need are unlocked and introduced. Key statistics stay untouched;
 * the account gets its mark for good.
 */
export function openLevelFor(p: Profile, id: string): void {
  const def = levelById(id);
  if (!def) return;
  const story = storyOf(def.world);
  const filled = LEVELS.filter((l) => story.worlds.includes(l.world) && (l.world < def.world || (l.world === def.world && l.index < def.index)) && !p.progress.levels[l.id]);
  for (const l of filled) p.progress.levels[l.id] = 1;
  for (const w of story.worlds) if (w < def.world && !p.progress.worldsDone.includes(w)) p.progress.worldsDone.push(w);
  const order = practiceOrder(p);
  const need = Math.min(order.length, Math.max(keysNeeded(p, def), story.opensAtKeys ?? 0));
  const unlocked = p.progress.unlockedKeys;
  for (const group of lessonGroups(p.layout)) {
    if (unlocked.filter((k) => order.includes(k)).length >= need) break;
    for (const k of group) if (order.includes(k) && !unlocked.includes(k)) unlocked.push(k);
  }
  for (const k of unlocked) if (!p.progress.introducedKeys.includes(k)) p.progress.introducedKeys.push(k);
  markSimulated(p, ...filled.map((l) => l.id));
}
