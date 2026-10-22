import { accessories } from '../gfx/assets';
import { LEVELS, WORLDS } from '../game/levels';
import { PAW_MAX } from '../game/paw';
import { WORLD_REWARDS } from '../game/rewards';
import { lessonOrder } from '../learning/lessons';
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
  const p = newProfile('Super Tapko', lang);
  p.id = SUPER_ID;
  const keys = lessonOrder(p.layout);
  p.progress.unlockedKeys = [...keys];
  p.progress.introducedKeys = [...keys];
  p.progress.worldsDone = WORLDS.map((_, i) => i);
  p.progress.rewards = [...accessories().map((a) => `acc:${a.id}`), ...WORLD_REWARDS];
  p.progress.levels = Object.fromEntries(LEVELS.map((l) => [l.id, 0]));
  p.progress.pawHelp = PAW_MAX;
  p.progress.companionsUnlocked = [...COMPANION_KINDS];
  return p;
}
