import { activeKeys, aimKeys, isLetterKey, practiceOrder } from '../learning/lessons';
import { type Profile, SUPER_ID } from '../storage/schema';
import { type ParrotSize, parrotSize } from './parrots';

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
  | 'swamp' | 'crystals' | 'crossroads' | 'spells' | 'greatswamp'
  | 'flames' | 'thicket' | 'flight' | 'lullaby' | 'takeoff'
  | 'copyloop'
  | 'practice' | 'freetype' | 'aim' | 'parrot';

export interface LevelDef {
  id: string;
  /** Index into WORLDS. */
  world: number;
  /** 0-4 inside the world; 4 is the super-obstacle. */
  index: number;
  kind: LevelKind;
  /** Planned targets in the kind's own unit, for the level's `minWords`; a level that would end before its minimum length gets more. */
  count: number;
  /** Creature / object mix. */
  variant: string;
  isSuper: boolean;
  /** Free practice of the parent's own text: these targets in order, then the end. */
  phrases?: string[];
  /** Every target is one chunk or word, never several with a space (the first level, before the space bar is taught). */
  noSpace?: boolean;
  /** A rescue mission: it plays its kind at the rescue camp. */
  rescue?: boolean;
  /** The target range: the weak keys its words train. */
  focus?: string[];
}

/** Seconds of active play a level lasts at least, by story (dragon, robot, fairy): the difficulty grows with the story. */
const STORY_MIN_S = [120, 180, 240];
/** A calm step is a quarter shorter, a super level a quarter longer. */
const CALM_SHARE = 0.75;
const SUPER_SHARE = 1.25;
/** Words a minute of a slow but practising child, by story: the words a level asks for in its minimum. */
const STORY_WPM = [8, 10, 12];

/** The calm steps of the world rhythm: waiting words (the meadow's poppies, the rocket world's meteors to hop on, the planet's swamp) and the valley's overgrown path. */
const CALM_KINDS: LevelKind[] = ['poppies', 'hop', 'swamp', 'thicket'];
/** Copy levels: a growing or a clean line (the valley's calm path is one too). */
const COPY_KINDS: LevelKind[] = ['invitation', 'command', 'spells', 'thicket', 'lullaby', 'copyloop'];

/** Seconds of active play the level lasts at least (when it has a minimum length); a rescue mission always the story's full minimum. */
export function minActiveS(l: Pick<LevelDef, 'world' | 'kind' | 'isSuper' | 'rescue'>): number {
  const base = STORY_MIN_S[STORIES.indexOf(storyOf(l.world))];
  if (l.rescue) return base;
  if (CALM_KINDS.includes(l.kind)) return base * CALM_SHARE;
  return l.isSuper ? base * SUPER_SHARE : base;
}

/** Words the level asks for in its minimum time, at the story's slow pace. */
export function minWords(l: Pick<LevelDef, 'world' | 'kind' | 'isSuper' | 'rescue'>): number {
  return Math.round((STORY_WPM[STORIES.indexOf(storyOf(l.world))] * minActiveS(l)) / 60);
}

/** How many words a target has at a level's place in its world: words, then phrases, a sentence at the super level once space and period are known. */
export function copyTarget(index: number, sentence: boolean): { words: number; min: number } {
  if (index <= 1) return { words: 1, min: 2 };
  return index >= 4 && sentence ? { words: 5, min: 3 } : { words: 3, min: 2 };
}

/** Dragons a flight level starts with; one more comes while the minimum is not played (`flockAfter`). */
const FLOCK = 3;

/** A kind's planned count in its own unit for `words` words; every other kind counts words. */
const UNITS: Partial<Record<LevelKind, (words: number, l: LevelDef) => number>> = {
  // A big asteroid is its word, three or four pieces and now and then a shielded one: about five words.
  asteroid: (w) => w / 5,
  // The great swamp's tasks are jumps, the log's words and the sentence on the shore (one task of about four words).
  greatswamp: (w) => w - 3,
  // A copy target is one word, a phrase of two or three, or a sentence of three to five (`copyTarget`).
  copyloop: (w, l) => {
    const size = copyTarget(l.index, true);
    return w / (size.words <= 1 ? 1 : (size.min + size.words) / 2);
  },
  // The valley's flying lessons, lullaby and take-off count dragons, not words (the exception).
  flight: () => FLOCK, lullaby: () => FLOCK, takeoff: () => FLOCK,
};

/** The planned count of a level: its minimum words in the kind's own unit. */
function plannedCount(l: LevelDef): number {
  const w = minWords(l);
  return Math.max(1, Math.round(UNITS[l.kind]?.(w, l) ?? w));
}

/** What the child does in a level; the map shows it as the icon of the level's dot. */
export type Activity = 'chase' | 'catch' | 'clean' | 'crossroads' | 'super';

export function activityOf(l: LevelDef): Activity {
  if (l.isSuper) return 'super';
  if (COPY_KINDS.includes(l.kind)) return 'clean';
  if (CALM_KINDS.includes(l.kind)) return 'catch';
  if (l.kind === 'crossroads') return 'crossroads';
  return 'chase';
}

/** Practice, custom exercises, free typing, the target range and the parrot keep their own length; every other level has the minimum. */
export function hasMinLength(l: LevelDef): boolean {
  return l.kind !== 'practice' && l.kind !== 'freetype' && l.kind !== 'aim' && l.kind !== 'parrot';
}

/**
 * The target count of a level while it plays: as long as the active seconds are under `min` and
 * fewer than `step` targets are left, the ones missing to fill `min` at the child's pace so far
 * come (a whole `step` before the first is done, never more), so the mode never runs dry early
 * and a slow child is not given more than the minimum needs.
 */
export function grownCount(count: number, done: number, active: number, step: number, min: number): number {
  if (active >= min || count - done >= step) return count;
  const need = done > 0 ? Math.round(((min - active) * done) / active) : step;
  return count + Math.max(0, Math.min(step, need - (count - done)));
}

/** Seconds without a key, while a word waits to be typed, after which the minimum's clock stops (a slow child's keys come much closer). */
export const IDLE_STOP_S = 5;

/**
 * Seconds of active play a frame adds: none once the child has not typed for `IDLE_STOP_S` while a
 * word waits (a pause in typing, words left to fly by); the mode's own scenes without a word count.
 */
export function playedStep(dt: number, idleFor: number, wordWaits: boolean): number {
  return wordWaits && idleFor > IDLE_STOP_S ? 0 : dt;
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

const def = (world: number, index: number, kind: LevelKind, variant = '', noSpace = false): LevelDef => {
  const l: LevelDef = { id: `w${world + 1}-${index + 1}`, world, index, kind, count: 0, variant, isSuper: index === 4, ...(noSpace ? { noSpace } : {}) };
  return { ...l, count: plannedCount(l) };
};

export const LEVELS: LevelDef[] = [
  // The meadow plays the world rhythm: main game, calm step, main game with a gust, twist, super-obstacle.
  def(0, 0, 'meadow', 'flyers', true), def(0, 1, 'poppies'), def(0, 2, 'meadow', 'gust'), def(0, 3, 'invitation'), def(0, 4, 'hedgehog'),
  def(1, 0, 'space', 'asteroids'), def(1, 1, 'hop'), def(1, 2, 'space', 'strong'), def(1, 3, 'command'), def(1, 4, 'asteroid'),
  // The planet: the swamp after the landing (waiting words), the meadow's crystals (a stream), crossroads, spells (copy), the great swamp.
  def(2, 0, 'swamp'), def(2, 1, 'crystals'), def(2, 2, 'crossroads'), def(2, 3, 'spells'), def(2, 4, 'greatswamp'),
  // The valley: flames for the fire pit, the overgrown path (calm), flying lessons, the lullaby, the take-off.
  def(3, 0, 'flames'), def(3, 1, 'thicket'), def(3, 2, 'flight'), def(3, 3, 'lullaby'), def(3, 4, 'takeoff'),
  // Worlds 5-15 are not built yet: every level plays the placeholder, cyclic copy, until its world is redone.
  ...WORLDS.slice(4).flatMap((_, w) => [0, 1, 2, 3, 4].map((i) => def(w + 4, i, 'copyloop'))),
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

/** Stars from accuracy: 3 >= 96 %, 2 >= 89 %, else 1 (finishing always gives one). */
export function starsFor(accuracy: number): number {
  return accuracy >= 0.96 ? 3 : accuracy >= 0.89 ? 2 : 1;
}

/** Stars shown on the results card: `starsFor` with a half more from 84 % and from 93 %; never saved. */
export function halfStarsFor(accuracy: number): number {
  return accuracy >= 0.96 ? 3 : accuracy >= 0.93 ? 2.5 : accuracy >= 0.89 ? 2 : accuracy >= 0.84 ? 1.5 : 1;
}

const RESCUE_KINDS: { kind: LevelKind; world: number; variant: string }[] = [
  { kind: 'meadow', world: 0, variant: 'mix' }, { kind: 'space', world: 1, variant: 'mix' }, { kind: 'swamp', world: 2, variant: '' }, { kind: 'crystals', world: 2, variant: '' },
  { kind: 'flames', world: 3, variant: '' },
];

/** Endless rescue missions: a level kind of a built world (worlds not built yet have none); the friend helped follows its story. */
export function rescueLevel(seed: number): LevelDef {
  const r = RESCUE_KINDS[Math.abs(seed) % RESCUE_KINDS.length];
  const l: LevelDef = { id: 'rescue', world: r.world, index: -1, kind: r.kind, count: 0, variant: r.variant, isSuper: false, rescue: true };
  return { ...l, count: plannedCount(l) };
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
