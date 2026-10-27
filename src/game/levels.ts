import { activeKeys, aimKeys, isLetterKey, practiceOrder } from '../learning/lessons';
import { type Profile, SUPER_ID } from '../storage/schema';
import { type ParrotSize, parrotSize } from './parrots';
import type { Style } from './typing';

export type WorldId = 'meadow' | 'space' | 'planet' | 'dragons' | 'egg' | 'junkyard' | 'workshop' | 'raintown' | 'robocity' | 'robohome'
  | 'garden' | 'forestpath' | 'lilylake' | 'musictree' | 'moonball';
export const WORLDS: WorldId[] = ['meadow', 'space', 'planet', 'dragons', 'egg', 'junkyard', 'workshop', 'raintown', 'robocity', 'robohome',
  'garden', 'forestpath', 'lilylake', 'musictree', 'moonball'];

export interface StoryDef {
  id: 'dragon' | 'robot' | 'fairy';
  /** i18n key of the story title. */
  title: string;
  /** World indexes of the story, in order. */
  worlds: number[];
  /** The story opens when the child knows this many keys; null = open from the start. */
  opensAtKeys: number | null;
  /** Keys each level needs, world after world (five levels per world, the super-obstacle last). */
  keys: number[];
}

/** `n` key counts climbing evenly from `from` to `to`. */
const ramp = (from: number, to: number, n: number): number[] => Array.from({ length: n }, (_, i) => Math.round(from + ((to - from) * i) / (n - 1)));

/** Story rows on the map; each story goes on independently once it is open. */
export const STORIES: StoryDef[] = [
  { id: 'dragon', title: 'map.storyName', worlds: [0, 1, 2, 3, 4], opensAtKeys: null, keys: [3, 3, 4, 5, 5, 7, 8, 9, 10, 10, 12, 13, 14, 15, 15, 16, 17, 17, 18, 18, 19, 19, 20, 20, 20] },
  { id: 'robot', title: 'map.storyRobot', worlds: [5, 6, 7, 8, 9], opensAtKeys: 10, keys: ramp(10, 34, 25) },
  { id: 'fairy', title: 'map.storyFairy', worlds: [10, 11, 12, 13, 14], opensAtKeys: 20, keys: ramp(20, 62, 25) },
];

export function storyOf(world: number): StoryDef {
  return STORIES.find((s) => s.worlds.includes(world)) ?? STORIES[0];
}

/** Every world of the story is done. */
export function storyDone(p: Profile, story: StoryDef): boolean {
  return story.worlds.every((w) => p.progress.worldsDone.includes(w));
}

export type LevelKind =
  | 'meadow' | 'poppies' | 'invitation' | 'hedgehog'
  | 'space' | 'hop' | 'command' | 'asteroid'
  | 'swamp' | 'signs' | 'boulder'
  | 'shield' | 'wave'
  | 'slope' | 'mole'
  | 'junk' | 'knot'
  | 'belt' | 'battery'
  | 'rain' | 'storm'
  | 'doors' | 'gate'
  | 'rooms' | 'welcome'
  | 'buds' | 'flower'
  | 'birds' | 'owl'
  | 'lilies' | 'reflection'
  | 'notes' | 'treesong'
  | 'fireflies' | 'lastsong'
  | 'practice' | 'freetype' | 'aim' | 'parrot';

export interface LevelDef {
  id: string;
  /** Index into WORLDS. */
  world: number;
  /** 0-4 inside the world; 4 is the super-obstacle. */
  index: number;
  kind: LevelKind;
  /** Planned number of words (targets); a level that would end before its minimum length gets more. */
  count: number;
  /** Creature / object mix. */
  variant: string;
  isSuper: boolean;
  /** Free practice of the parent's own text: these targets in order, then the end. */
  phrases?: string[];
  /** How its targets are shown (copy typing when absent). */
  style?: Style;
  /** Every target is one chunk or word, never several with a space (the first level, before the space bar is taught). */
  noSpace?: boolean;
  /** A rescue mission: it plays its kind at the rescue camp. */
  rescue?: boolean;
  /** The target range: the weak keys its words train. */
  focus?: string[];
}

/** Story levels, super levels and rescue missions last at least this many seconds of active play. */
export const MIN_ACTIVE_S = 120;

/** A calm step is a short valley between two action levels. */
const CALM_ACTIVE_S = 60;
/** The calm steps of the world rhythm: waiting words (the meadow's poppies, the rocket world's meteors to hop on). */
const CALM_KINDS: LevelKind[] = ['poppies', 'hop'];

/** Seconds of active play the level lasts at least (when it has a minimum length). */
export function minActiveS(l: LevelDef): number {
  return CALM_KINDS.includes(l.kind) ? CALM_ACTIVE_S : MIN_ACTIVE_S;
}

/** What the child does in a level; the map shows it as the icon of the level's dot. */
export type Activity = 'chase' | 'catch' | 'clean' | 'crossroads' | 'listen' | 'remember' | 'super';

export function activityOf(l: LevelDef): Activity {
  if (l.isSuper) return 'super';
  if (CALM_KINDS.includes(l.kind)) return 'catch';
  if (l.kind === 'invitation' || l.kind === 'command') return 'clean';
  if (l.kind === 'signs') return 'crossroads';
  if (l.style === 'dictation' || l.style === 'mixed') return 'listen';
  if (l.style === 'memory') return 'remember';
  return 'chase';
}

/** Practice, custom exercises, free typing, the target range and the parrot keep their own length; every other level has the minimum. */
export function hasMinLength(l: LevelDef): boolean {
  return l.kind !== 'practice' && l.kind !== 'freetype' && l.kind !== 'aim' && l.kind !== 'parrot';
}

/**
 * The target count of a level while it plays: as long as the active seconds are under `min`
 * and fewer than `step` targets are left, `step` more come, so the mode never runs dry early.
 */
export function grownCount(count: number, done: number, active: number, step: number, min: number): number {
  return active < min && count - done < step ? count + step : count;
}

/** A level ends when its mode is done and the minimum of active play is reached. */
export function levelOver(modeFinished: boolean, active: number, min: number): boolean {
  return modeFinished && active >= min;
}

/**
 * The progress bar: the slower of the targets done and the minimum time played, so it never runs
 * ahead of either and ends exactly when `levelOver` does. The runtime keeps the bar from going back.
 */
export function shownProgress(modeProgress: number, active: number, min: number): number {
  if (min <= 0) return modeProgress;
  return Math.min(modeProgress, active / min);
}

const def = (world: number, index: number, kind: LevelKind, count: number, variant = '', style?: Style, noSpace = false): LevelDef =>
  ({ id: `w${world + 1}-${index + 1}`, world, index, kind, count, variant, isSuper: index === 4, ...(style ? { style } : {}), ...(noSpace ? { noSpace } : {}) });

export const LEVELS: LevelDef[] = [
  // The meadow plays the world rhythm: main game, calm step, main game with a gust, twist, super-obstacle.
  def(0, 0, 'meadow', 12, 'flyers', undefined, true), def(0, 1, 'poppies', 20), def(0, 2, 'meadow', 16, 'gust'), def(0, 3, 'invitation', 14), def(0, 4, 'hedgehog', 6),
  def(1, 0, 'space', 12, 'asteroids'), def(1, 1, 'hop', 16), def(1, 2, 'space', 16, 'strong'), def(1, 3, 'command', 12), def(1, 4, 'asteroid', 4),
  def(2, 0, 'swamp', 12), def(2, 1, 'signs', 10), def(2, 2, 'swamp', 14), def(2, 3, 'signs', 12), def(2, 4, 'boulder', 6),
  def(3, 0, 'shield', 12, '1'), def(3, 1, 'shield', 14, '2'), def(3, 2, 'shield', 16, '3'), def(3, 3, 'shield', 18, '3'), def(3, 4, 'wave', 14),
  def(4, 0, 'slope', 12, 'rocks'), def(4, 1, 'slope', 14, 'stumps'), def(4, 2, 'slope', 16, 'mix'), def(4, 3, 'slope', 18, 'mix'), def(4, 4, 'mole', 14),
  def(5, 0, 'junk', 12, 'tires'), def(5, 1, 'junk', 14, 'crates'), def(5, 2, 'junk', 14, 'mix'), def(5, 3, 'junk', 16, 'mix'), def(5, 4, 'knot', 6),
  def(6, 0, 'belt', 12, 'gears'), def(6, 1, 'belt', 14, 'bolts'), def(6, 2, 'belt', 16, 'mix'), def(6, 3, 'belt', 18, 'mix'), def(6, 4, 'battery', 12),
  def(7, 0, 'rain', 12), def(7, 1, 'rain', 14), def(7, 2, 'rain', 16), def(7, 3, 'rain', 18), def(7, 4, 'storm', 14),
  def(8, 0, 'doors', 10, '1'), def(8, 1, 'doors', 12, '2'), def(8, 2, 'doors', 14, '2'), def(8, 3, 'doors', 16, '3'), def(8, 4, 'gate', 8),
  def(9, 0, 'rooms', 10), def(9, 1, 'rooms', 12), def(9, 2, 'rooms', 14), def(9, 3, 'rooms', 16), def(9, 4, 'welcome', 14),
  // Story 3 trains listening and remembering; level 1 of the forest path and the lake starts with single short words.
  def(10, 0, 'buds', 10), def(10, 1, 'buds', 12), def(10, 2, 'buds', 14), def(10, 3, 'buds', 16), def(10, 4, 'flower', 6, '', 'dictation'),
  def(11, 0, 'birds', 10, 'short', 'dictation'), def(11, 1, 'birds', 12, '', 'dictation'), def(11, 2, 'birds', 14, '', 'dictation'), def(11, 3, 'birds', 16, '', 'dictation'), def(11, 4, 'owl', 3, '', 'dictation'),
  def(12, 0, 'lilies', 10, 'short', 'memory'), def(12, 1, 'lilies', 12, '', 'memory'), def(12, 2, 'lilies', 14, '', 'memory'), def(12, 3, 'lilies', 16, '', 'memory'), def(12, 4, 'reflection', 2, '', 'memory'),
  def(13, 0, 'notes', 10, '', 'mixed'), def(13, 1, 'notes', 12, '', 'mixed'), def(13, 2, 'notes', 14, '', 'mixed'), def(13, 3, 'notes', 16, '', 'mixed'), def(13, 4, 'treesong', 8, '', 'dictation'),
  def(14, 0, 'fireflies', 6, '', 'dictation'), def(14, 1, 'fireflies', 7, '', 'dictation'), def(14, 2, 'fireflies', 8, '', 'dictation'), def(14, 3, 'fireflies', 9, '', 'dictation'), def(14, 4, 'lastsong', 5, '', 'dictation'),
];

export function levelById(id: string): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function worldLevels(world: number): LevelDef[] {
  return LEVELS.filter((l) => l.world === world);
}

/** The story opens with enough known keys (the super profile needs none). */
export function storyOpen(p: Profile, story: StoryDef): boolean {
  return story.opensAtKeys === null || p.id === SUPER_ID || activeKeys(p).length >= story.opensAtKeys;
}

/** The first world of a story opens with the story, every other one after the world before it. */
export function isWorldUnlocked(p: Profile, world: number): boolean {
  const story = storyOf(world);
  if (world !== story.worlds[0]) return p.progress.worldsDone.includes(world - 1);
  return storyOpen(p, story);
}

/** Why a world is closed: the world before it is not done, or its story needs more keys; null when open. */
export type WorldLock = { kind: 'world'; prev: number } | { kind: 'keys'; need: number; have: number };

export function worldLock(p: Profile, world: number): WorldLock | null {
  if (isWorldUnlocked(p, world)) return null;
  const story = storyOf(world);
  if (world !== story.worlds[0]) return { kind: 'world', prev: world - 1 };
  return { kind: 'keys', need: story.opensAtKeys!, have: activeKeys(p).length };
}

/**
 * Keys a story level needs, so its words are varied enough: the dragon story climbs 3 to 20
 * (a gentle start, repeated counts are consolidation levels), the robot story 10 to 34 (the
 * letters and punctuation), the fairy story 20 to 62 (capitals, diacritics and digits too);
 * never more than the profile's whole lesson path, so a child who knows it all can play everything.
 */
export function keysNeeded(p: Profile, l: LevelDef): number {
  const story = storyOf(l.world);
  const need = story.keys[story.worlds.indexOf(l.world) * 5 + l.index];
  return Math.min(need, practiceOrder(p).length);
}

/** Keys the child still needs for a level (0 = enough); the super profile needs none. */
export function keysMissing(p: Profile, l: LevelDef): number {
  if (p.id === SUPER_ID) return 0;
  return Math.max(0, keysNeeded(p, l) - activeKeys(p).length);
}

/** The level before it has its star (the first level opens with its world). */
export function isLevelReached(p: Profile, l: LevelDef): boolean {
  if (p.id === SUPER_ID) return true;
  if (!isWorldUnlocked(p, l.world)) return false;
  if (l.index === 0) return true;
  const prev = worldLevels(l.world)[l.index - 1];
  return (p.progress.levels[prev.id] ?? 0) > 0;
}

/** Reached and the child knows enough keys for it. */
export function isLevelUnlocked(p: Profile, l: LevelDef): boolean {
  return isLevelReached(p, l) && keysMissing(p, l) === 0;
}

/** The next level to play: the first open level without stars, else the last open one; null when none is open. */
export function nextLevel(p: Profile): LevelDef | null {
  const open = LEVELS.filter((l) => isLevelUnlocked(p, l));
  return open.find((l) => !p.progress.levels[l.id]) ?? open[open.length - 1] ?? null;
}

/** Rescue missions (and the little friends) open with the first finished story. */
export function rescueUnlocked(p: Profile): boolean {
  return STORIES.some((s) => storyDone(p, s));
}

/** Stars from accuracy: 3 >= 95 %, 2 >= 85 %, else 1 (finishing always gives one). */
export function starsFor(accuracy: number): number {
  return accuracy >= 0.95 ? 3 : accuracy >= 0.85 ? 2 : 1;
}

/** Stars shown on the results card: `starsFor` with a half more from 80 % and from 90 %; never saved. */
export function halfStarsFor(accuracy: number): number {
  return accuracy >= 0.95 ? 3 : accuracy >= 0.9 ? 2.5 : accuracy >= 0.85 ? 2 : accuracy >= 0.8 ? 1.5 : 1;
}

const RESCUE_KINDS: { kind: LevelKind; world: number; variant: string; style?: Style }[] = [
  { kind: 'meadow', world: 0, variant: 'mix' }, { kind: 'space', world: 1, variant: 'mix' }, { kind: 'swamp', world: 2, variant: '' },
  { kind: 'signs', world: 2, variant: '' }, { kind: 'shield', world: 3, variant: '3' }, { kind: 'slope', world: 4, variant: 'mix' },
  { kind: 'junk', world: 5, variant: 'mix' }, { kind: 'belt', world: 6, variant: 'mix' }, { kind: 'rain', world: 7, variant: '' },
  { kind: 'doors', world: 8, variant: '2' }, { kind: 'rooms', world: 9, variant: '' },
  { kind: 'buds', world: 10, variant: '' }, { kind: 'birds', world: 11, variant: '', style: 'dictation' }, { kind: 'lilies', world: 12, variant: '', style: 'memory' },
  { kind: 'notes', world: 13, variant: '', style: 'mixed' }, { kind: 'fireflies', world: 14, variant: '', style: 'dictation' },
];

/** Endless rescue missions: a level kind from any world of a finished story; the friend helped follows the story. */
export function rescueLevel(p: Profile, seed: number): LevelDef {
  const open = RESCUE_KINDS.filter((r) => storyDone(p, storyOf(r.world)));
  const pool = open.length ? open : RESCUE_KINDS.filter((r) => STORIES[0].worlds.includes(r.world));
  const r = pool[Math.abs(seed) % pool.length];
  return { id: 'rescue', world: r.world, index: -1, kind: r.kind, count: r.kind === 'fireflies' ? 8 : 14, variant: r.variant, isSuper: false, rescue: true, ...(r.style ? { style: r.style } : {}) };
}

/** Free typing ("just typing") in a world the child has opened. */
export function freeTypeLevel(world: number): LevelDef {
  return { id: 'freetype', world, index: -1, kind: 'freetype', count: 0, variant: '', isSuper: false };
}

/** The world's target range opens with its super level done. */
export function aimOpen(p: Profile, world: number): boolean {
  return p.progress.worldsDone.includes(world);
}

/** Where the narrator's practice offer goes: this world's range, else the last finished world's; null before any. */
export function aimWorld(p: Profile, world: number): number | null {
  if (aimOpen(p, world)) return world;
  return p.progress.worldsDone.length ? Math.max(...p.progress.worldsDone) : null;
}

/** The target range of a world: throws at a target through words with the weak keys; no stars. */
export function aimLevel(p: Profile, world: number): LevelDef {
  return { id: 'aim', world, index: -1, kind: 'aim', count: 0, variant: '', isSuper: false, focus: aimKeys(p) };
}

/** The parrot of a world: the same few words many times over, until the fingers know them; no stars. Opens with the target range. */
export function parrotLevel(world: number): LevelDef {
  return { id: 'parrot', world, index: -1, kind: 'parrot', count: 0, variant: '', isSuper: false };
}

/** The parrot round's size by the world's story and its place in it. */
export function parrotSizeOf(world: number): ParrotSize {
  const story = storyOf(world);
  return parrotSize(STORIES.indexOf(story), story.worlds.indexOf(world));
}

/** Letters of the parrot's words: the keys of the world's last level. */
export function parrotKeys(p: Profile, world: number): string[] {
  const last = worldLevels(world)[4];
  return practiceOrder(p).slice(0, keysNeeded(p, last)).filter(isLetterKey);
}

export function practiceLevel(seconds: number | null, phrases?: string[]): LevelDef & { seconds: number | null } {
  return { id: 'practice', world: 0, index: -1, kind: 'practice', count: 0, variant: '', isSuper: false, seconds, phrases };
}
