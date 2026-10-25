import { accessories } from '../gfx/assets';
import { LEVELS, WORLDS } from '../game/levels';
import { WORLD_THINGS } from '../game/modes/aim-things';
import { PAW_MAX } from '../game/paw';
import { WORLD_REWARDS } from '../game/rewards';
import { lessonOrder } from '../learning/lessons';
import { STATS_WINDOW, recordPress, recordSession } from '../learning/stats';
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

/** What the service menu's progress filling sets; the shares are 0..1. */
export interface ProgressFill {
  /** Keys of the lesson path the player knows. */
  keys: number;
  /** The last finished world (index); -1 = none. */
  lastWorld: number;
  /** Share of the finished worlds' stars. */
  stars: number;
  /** Accuracy of every known key, give or take a little. */
  accuracy: number;
  /** Share of the finished worlds' range finds. */
  ranges: number;
}

/** Presses written for each known key: a full statistics window. */
const FILL_PRESSES = STATS_WINDOW;
/** A key's accuracy may differ from the asked one by up to this much either way. */
const FILL_SPREAD = 0.05;
/** The rhythm of the filled session, correct characters per minute. */
const FILL_CPM = 100;

/** `n` items of `list` picked at random. */
function pick<T>(list: T[], n: number, rand: () => number): T[] {
  const rest = [...list];
  return Array.from({ length: Math.min(n, rest.length) }, () => rest.splice(Math.floor(rand() * rest.length), 1)[0]);
}

/**
 * Fills the super player's progress for a test or a demonstration: exactly the asked keys and
 * finished worlds; the stars, the range finds and each key's accuracy spread at random to give
 * the asked shares. Every finished level keeps at least one star. Only for the super player,
 * which is never stored.
 */
export function fillProgress(p: Profile, f: ProgressFill, rand: () => number = Math.random): void {
  const pr = p.progress;
  const order = lessonOrder(p.layout);
  const keys = order.slice(0, Math.max(0, Math.min(order.length, Math.round(f.keys))));
  pr.unlockedKeys = [...keys];
  pr.introducedKeys = [...keys];
  pr.worldsDone = WORLDS.map((_, i) => i).filter((i) => i <= f.lastWorld);
  const done = LEVELS.filter((l) => pr.worldsDone.includes(l.world));
  const stars = new Map(done.map((l) => [l.id, 1]));
  let extra = Math.round(f.stars * 3 * done.length) - done.length;
  while (extra > 0) {
    const room = done.filter((l) => stars.get(l.id)! < 3);
    const l = room[Math.floor(rand() * room.length)];
    stars.set(l.id, stars.get(l.id)! + 1);
    extra--;
  }
  pr.levels = Object.fromEntries(LEVELS.map((l) => [l.id, stars.get(l.id) ?? 0]));
  pr.levelsFinished = done.length;
  pr.starsEarned = [...stars.values()].reduce((a, b) => a + b, 0);
  pr.rewards = [...accessories().map((a) => `acc:${a.id}`), ...WORLD_REWARDS.filter((_, i) => pr.worldsDone.includes(i))];
  const things = WORLD_THINGS.filter((th) => pr.worldsDone.includes(th.world!));
  pr.rangeFinds = pick(things, Math.round(f.ranges * things.length), rand).map((th) => th.id);
  p.stats = { keys: {}, sessions: [] };
  pr.trainedSeconds = 0;
  let chars = 0;
  let errors = 0;
  for (const key of keys) {
    const acc = Math.max(0, Math.min(1, f.accuracy + (rand() * 2 - 1) * FILL_SPREAD));
    const wrong = new Set(pick([...Array(FILL_PRESSES).keys()], Math.round(FILL_PRESSES * (1 - acc)), rand));
    const other = order.find((k) => k !== key) ?? key;
    for (let i = 0; i < FILL_PRESSES; i++) recordPress(p, key, wrong.has(i) ? other : key, 250 + rand() * 200);
    chars += FILL_PRESSES - wrong.size;
    errors += wrong.size;
  }
  if (chars + errors) recordSession(p, ((chars + errors) / FILL_CPM) * 60, chars, errors, FILL_CPM);
}
