import { t } from '../i18n/i18n';
import { LAYOUTS } from '../keyboard/layouts';
import { ACCURACY, activeKeys, aimKeys, isKeyReady, isLetterKey, lessonKeyNames, masteredKeyNames, practiceOrder } from '../learning/lessons';
import { type Profile, SUPER_ID, type TaskSpec } from '../storage/schema';
import { changeCount, laneCount, targetTempo } from './beat';
import { PARROT_MIN_S, type ParrotSize, parrotSize } from './parrots';

export type WorldId = 'meadow' | 'space' | 'planet' | 'dragons' | 'egg' | 'junkyard' | 'workshop' | 'raintown' | 'robocity' | 'robohome'
  | 'garden' | 'forestpath' | 'lilylake' | 'musictree' | 'moonball';
export const WORLDS: WorldId[] = ['meadow', 'space', 'planet', 'dragons', 'egg', 'junkyard', 'workshop', 'raintown', 'robocity', 'robohome',
  'garden', 'forestpath', 'lilylake', 'musictree', 'moonball'];

/**
 * The keys a world asks the child to master before it opens, by place (keyName): the keys of the worlds before it. Every
 * game of the world may use them. Each holds the keys every layout's lesson order reaches by the world's need count
 * (`needCount`), or never teaches; the source the worlds are designed with is `.specify/learning/world-keys.md`.
 */
const N2 = ['f0', 'j0', 'sp', 'd0', 'k0'];
const N3 = [...N2, 's0', 'l0', 'a0', 'l1', 'g0'];
const N4 = [...N3, 'h0', 'e0', 'i0', 'r0', 'u0'];
const N7 = [...N3, 'h0', 'e0', 'i0', 'r0'];
const N8 = [...N7, 'u0', 'm2', 'o0', 't0', 'n0'];
const N9 = [...N8, 'm1', 'c0', 'v0', 'm0'];
const N11 = [...N8, 'm1'];
const N12 = [...N11, 'c0', 'v0', 'm0', 'p0', 'ls', 'b0'];
const N13 = [...N12, 'y0', 'rs', 'z0', 'w0', 'x0', 'q0', 'm3', 'l2'];
const N14 = [...N13, '80', '90', '70', '60', '50', '40', '30', '20'];
export const WORLD_KEYS: readonly (readonly string[])[] = [
  [], N2, N3, N4, [...N4, 'm2', 'o0', 't0'],
  N3, N7, N8, N9, [...N9, 'p0', 'ls', 'b0', 'y0', 'rs'],
  N11, N12, N13, N14, [...N14, '00', 'p1', 'p2', 'l3', '02', '10', '01'],
];

/** How many keys of the lesson order the worlds before teach: the story's opening count for its first world (none for the first story), else the last level's of the world before. */
export function needCount(p: Profile, world: number): number {
  const story = storyOf(world);
  if (world === story.worlds[0]) return Math.min(story.opensAtKeys ?? 0, practiceOrder(p).length);
  const before = worldLevels(world - 1);
  return keysNeeded(p, before[before.length - 1]);
}

/** The world's keys to master (its need) the profile's practice order teaches: a key it never has (no diacritics, another layout) is left out. */
export function worldKeys(p: Profile, world: number): string[] {
  const layout = LAYOUTS[p.layout];
  const taught = new Set(practiceOrder(p).flatMap((k) => lessonKeyNames(layout, k)));
  return WORLD_KEYS[world].filter((n) => taught.has(n));
}

/** The world's keys the child does not master yet. */
export function worldKeysMissing(p: Profile, world: number): string[] {
  const known = masteredKeyNames(p);
  return worldKeys(p, world).filter((n) => !known.has(n));
}

/** The keys the profile's practice order teaches in the world: from the keys of the worlds before to its last level's, its first level's own new keys too. */
export function worldNewKeys(p: Profile, world: number): string[] {
  const layout = LAYOUTS[p.layout];
  const levels = worldLevels(world);
  const names = (n: number) => new Set(practiceOrder(p).slice(0, n).flatMap((k) => lessonKeyNames(layout, k)));
  const before = names(needCount(p, world));
  return [...names(keysNeeded(p, levels[levels.length - 1]))].filter((n) => !before.has(n));
}

/** The world's keys that hold it closed: the ones not mastered. They guard the way in: a world with a level played stays open. */
function keysHolding(p: Profile, world: number): string[] {
  if (worldLevels(world).some((l) => p.progress.levels[l.id])) return [];
  return worldKeysMissing(p, world);
}

/** A world's name. */
export function worldName(world: number): string {
  return t(`worlds.${WORLDS[world]}`);
}

/** A world's opening story, told on its first level. */
export function worldStory(world: number): string {
  return t(`story.world.${WORLDS[world]}`);
}

export interface StoryDef {
  id: 'dragon' | 'robot' | 'fairy';
  /** The story's difficulty step (0-2): its level lengths, words a minute, slips and parrot rounds. */
  tier: 0 | 1 | 2;
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
  { id: 'dragon', tier: 0, title: 'map.storyName', worlds: [0, 1, 2, 3, 4], opensAtKeys: null, keys: [3, 3, 4, 5, 5, 7, 8, 9, 10, 10, 12, 13, 14, 15, 15, 16, 17, 17, 18, 18, 19, 19, 20, 20, 20] },
  { id: 'robot', tier: 1, title: 'map.storyRobot', worlds: [5, 6, 7, 8, 9], opensAtKeys: 10, keys: ramp(10, 34, 25) },
  { id: 'fairy', tier: 2, title: 'map.storyFairy', worlds: [10, 11, 12, 13, 14], opensAtKeys: 20, keys: ramp(20, 62, 25) },
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
  | 'wind' | 'mud' | 'boulders' | 'spell'
  | 'copyloop'
  | 'practice' | 'freetype' | 'aim' | 'parrot' | 'rhythm' | 'task' | 'placement';

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
  /** The target range: the weak keys its words train. */
  focus?: string[];
  /** A part of its story's hero's journey. */
  journey?: JourneyPart;
  /** A teacher's task: its game, words or text and limit; `world` is only its backdrop. */
  task?: TaskSpec;
}

/** Which part of a story's hero's journey a level is, of how many, the part's own story line (an i18n key) and the world whose map picture the panel before it shows. */
export interface JourneyPart {
  story: StoryDef['id'];
  part: number;
  parts: number;
  line?: string;
  picture: number;
}

/** One part of a story's own hero's journey: what it plays, the world of its background, its own story line (an i18n key) and the world of its picture where that differs. */
export interface JourneyStep {
  kind: LevelKind;
  variant: string;
  world: number;
  line?: string;
  picture?: number;
}

/** Seconds of active play a level lasts at least, by the story's tier (dragon, robot, fairy): the difficulty grows with the story. */
const STORY_MIN_S = [120, 180, 240];
/** A calm step is a quarter shorter, a super level a quarter longer. */
const CALM_SHARE = 0.75;
const SUPER_SHARE = 1.25;
/** Words a minute of a slow but practising child, by the story's tier: the words a level asks for in its minimum. */
const STORY_WPM = [8, 10, 12];

/** The calm steps of the world rhythm: waiting words (the meadow's poppies, the rocket world's meteors to hop on, the planet's swamp, the mountain's sticky puddles) and the valley's overgrown path. */
const CALM_KINDS: LevelKind[] = ['poppies', 'hop', 'swamp', 'thicket', 'mud'];
/** Copy levels: a growing or a clean line, and the mountain's spell ribbon. */
const COPY_KINDS: LevelKind[] = ['invitation', 'command', 'spells', 'lullaby', 'spell', 'copyloop'];

/** A hero's journey is as long as this many regular levels of its story, split evenly over its parts (the dragon story's: 6 minutes). */
const JOURNEY_SHARE = 3;

/** The level's story tier: a journey part counts by its story, every other level by its world's. */
function tierOf(l: Pick<LevelDef, 'world' | 'journey'>): number {
  return (l.journey ? STORIES.find((s) => s.id === l.journey!.story)! : storyOf(l.world)).tier;
}

/** Seconds of active play the level lasts at least (when it has a minimum length); a journey part its share of the journey's. */
export function minActiveS(l: Pick<LevelDef, 'world' | 'kind' | 'isSuper' | 'journey' | 'task'>): number {
  // A task's minutes are its own limit; the text limit has none.
  if (l.task) return l.task.limit === 'text' ? 0 : l.task.minutes * 60;
  // The parrot's round is as long in every world; its mistakes make it longer.
  if (l.kind === 'parrot') return PARROT_MIN_S;
  const base = STORY_MIN_S[tierOf(l)];
  if (l.journey) return (JOURNEY_SHARE * base) / l.journey.parts;
  if (CALM_KINDS.includes(l.kind)) return base * CALM_SHARE;
  return l.isSuper ? base * SUPER_SHARE : base;
}

/** Words the level asks for in its minimum time, at the story's slow pace; a journey part its share of the journey's. */
export function minWords(l: Pick<LevelDef, 'world' | 'kind' | 'isSuper' | 'journey'>): number {
  const tier = tierOf(l);
  if (l.journey) return Math.round((JOURNEY_SHARE * Math.round((STORY_WPM[tier] * STORY_MIN_S[tier]) / 60)) / l.journey.parts);
  return Math.round((STORY_WPM[tier] * minActiveS(l)) / 60);
}

/** How many words a target has at a level's place in its world: words, then phrases, a sentence at the super level once space and period are known. */
export function copyTarget(index: number, sentence: boolean): { words: number; min: number } {
  if (index <= 1) return { words: 1, min: 2 };
  return index >= 4 && sentence ? { words: 5, min: 3 } : { words: 3, min: 2 };
}

/** Dragons a flight level starts with; one more comes while the minimum is not played (`flockAfter`). On the dragon story's journey the little dragon alone needs two good flights. */
const FLOCK = 3;
export const JOURNEY_FLOCK = 2;

/** A kind's planned count in its own unit for `words` words; every other kind counts words. */
const UNITS: Partial<Record<LevelKind, (words: number, l: LevelDef) => number>> = {
  // A big asteroid is its word, three or four pieces and now and then a shielded one: about five words.
  asteroid: (w) => w / 5,
  // The great swamp's tasks are jumps, the log's words and the sentence on the shore (one task of about four words); the journey's swamp has no sentence.
  greatswamp: (w, l) => (l.journey ? w : w - 3),
  // A copy target is one word, a phrase of two or three, or a sentence of three to five (`copyTarget`).
  copyloop: (w, l) => {
    const size = copyTarget(l.index, true);
    return w / (size.words <= 1 ? 1 : (size.min + size.words) / 2);
  },
  // The valley's flying lessons, lullaby and take-off count dragons, not words (the exception).
  flight: (_, l) => (l.journey ? JOURNEY_FLOCK : FLOCK), lullaby: () => FLOCK, takeoff: () => FLOCK,
};

/** The planned count of a level: its minimum words in the kind's own unit. */
function plannedCount(l: LevelDef): number {
  const w = minWords(l);
  return Math.max(1, Math.round(UNITS[l.kind]?.(w, l) ?? w));
}

/** What the child does in a level; the map shows it as the icon of the level's dot. Sticky finger has no level yet. */
export type Activity = 'chase' | 'catch' | 'clean' | 'crossroads' | 'sticky';

/** The super level shows its own game's picture too; the map adds its crown. */
export function activityOf(l: LevelDef): Activity {
  if (COPY_KINDS.includes(l.kind)) return 'clean';
  if (CALM_KINDS.includes(l.kind)) return 'catch';
  if (l.kind === 'crossroads') return 'crossroads';
  return 'chase';
}

/** Practice, custom exercises, free typing, the target range, Rytmus (its song) and the placement check keep their own length; every other level (a task too: its minutes, the parrot its round's) has the minimum. */
export function hasMinLength(l: LevelDef): boolean {
  return l.kind !== 'practice' && l.kind !== 'freetype' && l.kind !== 'aim' && l.kind !== 'rhythm' && l.kind !== 'placement';
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

/** The journey's bar: part `part` of `parts` fills only its own slice, the part's progress mapped into it. */
export function journeyProgress(j: Pick<JourneyPart, 'part' | 'parts'>, share: number): number {
  return (j.part + Math.max(0, Math.min(1, share))) / j.parts;
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
  // The egg's mountain: the wind on the slope, sticky puddles (calm), crossroads, boulders, the spell of awakening (the first ribbon).
  def(4, 0, 'wind'), def(4, 1, 'mud'), def(4, 2, 'crossroads', 'mountain'), def(4, 3, 'boulders'), def(4, 4, 'spell'),
  // Worlds 6-15 are not built yet: every level plays the placeholder, cyclic copy, until its world is redone.
  ...WORLDS.slice(5).flatMap((_, w) => [0, 1, 2, 3, 4].map((i) => def(w + 5, i, 'copyloop'))),
];

export function levelById(id: string): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

/** The built-in level at `index` (0-4) of `world`. */
export function levelAt(world: number, index: number): LevelDef | undefined {
  return LEVELS.find((l) => l.world === world && l.index === index);
}

export function worldLevels(world: number): LevelDef[] {
  return LEVELS.filter((l) => l.world === world);
}

/** The story opens with enough known keys. */
export function storyOpen(p: Profile, story: StoryDef): boolean {
  return story.opensAtKeys === null || activeKeys(p).length >= story.opensAtKeys;
}

/** The first world of a story is reached with the story, every other one after the world before it, or when the placement check opened its first level. */
function worldReached(p: Profile, world: number): boolean {
  const story = storyOf(world);
  if (world !== story.worlds[0]) return p.progress.worldsDone.includes(world - 1) || (storyOpen(p, story) && placedLevel(p, worldLevels(world)[0]));
  return storyOpen(p, story);
}

/** A world opens once it is reached and the child knows the keys it counts on. */
export function isWorldUnlocked(p: Profile, world: number): boolean {
  return worldReached(p, world) && !keysHolding(p, world).length;
}

/** Why a world is closed: its story needs more keys, the world before it is not done, or the child does not know its keys (by name); null when open. */
export type WorldLock = { kind: 'world'; prev: number } | { kind: 'keys'; need: number; have: number } | { kind: 'need'; keys: string[] };

export function worldLock(p: Profile, world: number): WorldLock | null {
  const story = storyOf(world);
  if (!storyOpen(p, story)) return { kind: 'keys', need: story.opensAtKeys!, have: activeKeys(p).length };
  if (!worldReached(p, world)) return { kind: 'world', prev: world - 1 };
  const keys = keysHolding(p, world);
  return keys.length ? { kind: 'need', keys } : null;
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

/** Keys the child still needs for a level (0 = enough). */
export function keysMissing(p: Profile, l: LevelDef): number {
  return Math.max(0, keysNeeded(p, l) - activeKeys(p).length);
}

/** The placement check reached the keys the level needs: it is open without the stars before it. */
function placedLevel(p: Profile, l: LevelDef): boolean {
  return keysNeeded(p, l) <= p.progress.placementKeys;
}

/** The level before it has its star, earned by play: a level of a world opened by the world before, the next one after a star. */
function playedTo(p: Profile, l: LevelDef): boolean {
  if (l.index > 0) return (p.progress.levels[worldLevels(l.world)[l.index - 1].id] ?? 0) > 0;
  return storyOf(l.world).worlds[0] !== l.world && p.progress.worldsDone.includes(l.world - 1);
}

/**
 * The level before it has its star, or the placement check reached its keys (the first level opens
 * with its world). The super player is no exception: it opens what its filled progress opens.
 */
export function isLevelReached(p: Profile, l: LevelDef): boolean {
  if (!isWorldUnlocked(p, l.world)) return false;
  return l.index === 0 || playedTo(p, l) || placedLevel(p, l);
}

/** Reached and the child knows enough keys for it. */
export function isLevelUnlocked(p: Profile, l: LevelDef): boolean {
  return isLevelReached(p, l) && keysMissing(p, l) === 0;
}

/**
 * The next level to play: the first open level without stars, else the last open one; null when none
 * is open. After a placement check the first one played to (its star before it earned by play) comes
 * first, else the most advanced level the check opened (the largest key need).
 */
export function nextLevel(p: Profile): LevelDef | null {
  const open = LEVELS.filter((l) => isLevelUnlocked(p, l));
  const fresh = open.filter((l) => !p.progress.levels[l.id]);
  if (p.progress.placementKeys) {
    const played = fresh.find((l) => playedTo(p, l));
    if (played) return played;
    const placed = fresh.filter((l) => placedLevel(p, l));
    if (placed.length) return placed.reduce((best, l) => (keysNeeded(p, l) > keysNeeded(p, best) ? l : best));
  }
  return fresh[0] ?? open[open.length - 1] ?? null;
}

/** Most stars a level (and a hero's journey) gives. */
export const MAX_LEVEL_STARS = 5;

/**
 * Lowest accuracy for each count of stars, best first; below them 1 (finishing always gives one).
 * Two to four stars are the steps of the game's accuracy scale (ACCURACY), five stars half the mistakes of four.
 */
export type StarSteps = readonly { stars: number; from: number }[];
export const STAR_STEPS: StarSteps = [{ stars: 5, from: 0.985 }, { stars: 4, from: ACCURACY.great }, { stars: 3, from: ACCURACY.good }, { stars: 2, from: ACCURACY.fair }];
/** A hero's journey is a bit stricter, its own steps apart from the accuracy scale. */
export const JOURNEY_STAR_STEPS: StarSteps = [{ stars: 5, from: 0.99 }, { stars: 4, from: 0.9775 }, { stars: 3, from: 0.955 }, { stars: 2, from: 0.91 }];

export function starsFor(accuracy: number, steps = STAR_STEPS): number {
  return steps.find((s) => accuracy >= s.from)?.stars ?? 1;
}

/** Stories with a hero's journey of their own; every other story plays the first level of each of its worlds, in order. */
export const JOURNEYS: Partial<Record<StoryDef['id'], JourneyStep[]>> = {
  // The egg has hatched: Tapko takes the little dragon down the mountain, through the valley, the planet's
  // crystal meadow and its swamp back to his rocket on the shore, and takes off. World 1 is not on this planet.
  dragon: [
    { kind: 'boulders', variant: 'journey', world: 4, line: 'journey.dragon.down' },
    { kind: 'flight', variant: 'journey', world: 3, line: 'journey.dragon.valley' },
    { kind: 'crystals', variant: 'journey', world: 2, line: 'journey.dragon.crystals' },
    { kind: 'greatswamp', variant: 'journey', world: 2, line: 'journey.dragon.swamp' },
    // The take-off plays on the planet's shore, but it is the way into space: the rocket world's picture.
    { kind: 'command', variant: 'journey', world: 2, line: 'journey.dragon.launch', picture: 1 },
  ],
};

function journeySteps(story: StoryDef): JourneyStep[] {
  return JOURNEYS[story.id] ?? story.worlds.map((w) => {
    const first = worldLevels(w)[0];
    return { kind: first.kind, variant: first.variant, world: w };
  });
}

/** The id the journey's best stars are kept under in `progress.levels`. */
export const journeyId = (story: StoryDef): string => `journey-${story.id}`;

/** The story's hero's journey opens with its last world done. */
export function journeyOpen(p: Profile, story: StoryDef): boolean {
  return p.progress.worldsDone.includes(story.worlds[story.worlds.length - 1]);
}

/** One part of the story's hero's journey: a regular run of its kind with the part's share of the journey's minimum. */
export function journeyLevel(story: StoryDef, part: number): LevelDef {
  const steps = journeySteps(story);
  const s = steps[Math.max(0, Math.min(steps.length - 1, part))];
  const journey: JourneyPart = { story: story.id, part: steps.indexOf(s), parts: steps.length, picture: s.picture ?? s.world, ...(s.line ? { line: s.line } : {}) };
  const l: LevelDef = { id: journeyId(story), world: s.world, index: -1, kind: s.kind, count: 0, variant: s.variant, isSuper: false, journey };
  return { ...l, count: plannedCount(l) };
}

/** Free typing ("just typing") in a world the child has opened. */
export function freeTypeLevel(world: number): LevelDef {
  return { id: 'freetype', world, index: -1, kind: 'freetype', count: 0, variant: '', isSuper: false };
}

/** The world's target range, parrot and Rytmus are open the whole time the world is. */
export function aimOpen(p: Profile, world: number): boolean {
  return isWorldUnlocked(p, world);
}

/** Where the narrator's practice offer goes: this world's range, else the furthest open world's (the first one is always open). */
export function aimWorld(p: Profile, world: number): number {
  if (aimOpen(p, world)) return world;
  return WORLDS.reduce((best, _, w) => (aimOpen(p, w) ? w : best), 0);
}

/** The target range of a world: throws at a target through words with the weak keys; no stars. */
export function aimLevel(p: Profile, world: number): LevelDef {
  return { id: 'aim', world, index: -1, kind: 'aim', count: 0, variant: '', isSuper: false, focus: aimKeys(p) };
}

/** The parrot of a world: the same few words many times over, until the fingers know them; no stars. Open with the target range. */
export function parrotLevel(world: number): LevelDef {
  return { id: 'parrot', world, index: -1, kind: 'parrot', count: 0, variant: '', isSuper: false };
}

/** The parrot round's size by the world's story tier and its place in the story. */
export function parrotSizeOf(world: number): ParrotSize {
  const story = storyOf(world);
  return parrotSize(story.tier, story.worlds.indexOf(world));
}

/** Letters of the parrot's words: the keys of the world's last level the child knows already (the world is open before they all come). */
export function parrotKeys(p: Profile, world: number): string[] {
  const last = worldLevels(world)[4];
  const known = new Set(activeKeys(p));
  return practiceOrder(p).slice(0, keysNeeded(p, last)).filter((k) => isLetterKey(k) && known.has(k));
}

/** The letters of a world's Rytmus: the parrot's letters (the world's last level) that are ready; the super profile takes them all. */
export function rhythmLetters(p: Profile, world: number): string[] {
  const keys = parrotKeys(p, world);
  return p.id === SUPER_ID ? keys : keys.filter((k) => isKeyReady(p, k));
}

/** A world's Rytmus is open with the world, like its target range and parrot. */
export const rhythmOpen = aimOpen;

/** Seconds of song a world's Rytmus round lasts: half of its story's regular level. */
export function rhythmRoundS(world: number): number {
  return STORY_MIN_S[storyOf(world).tier] / 2;
}

/** A world's Rytmus lanes and letter changes, by its place in its story (`.specify/game/rhythm.md`). */
export function rhythmShape(world: number): { lanes: number; changes: number } {
  const story = storyOf(world), place = story.worlds.indexOf(world);
  return { lanes: laneCount(story.tier, place, story.worlds.length), changes: changeCount(story.tier, place, story.worlds.length) };
}

/** The tempo a world's Rytmus aims at: its story's slow pace, as letters a minute on a tempo step. */
export function rhythmTarget(world: number): number {
  return targetTempo(STORY_WPM[storyOf(world).tier]);
}

/** Rytmus of a world: letters fall to the beat into Tapko's basket; no stars. */
export function rhythmLevel(world: number): LevelDef {
  return { id: 'rhythm', world, index: -1, kind: 'rhythm', count: 0, variant: '', isSuper: false };
}

/** A teacher's task played in `world` (only a backdrop): no map place, no stars. */
export function taskLevel(spec: TaskSpec, world: number): LevelDef {
  return { id: 'task', world, index: -1, kind: 'task', count: 0, variant: spec.game, isSuper: false, task: spec };
}

/** The placement check: a calm copy run along the lesson order; no map place, no stars, no rewards. */
export function placementLevel(): LevelDef {
  return { id: 'placement', world: 0, index: -1, kind: 'placement', count: 0, variant: '', isSuper: false };
}

/** Seconds of the short drill of a few keys (the keys to practise, a key's details, the keyboard check's weak keys). */
export const DRILL_SECONDS = 120;

export function practiceLevel(seconds: number | null, phrases?: string[]): LevelDef & { seconds: number | null } {
  return { id: 'practice', world: 0, index: -1, kind: 'practice', count: 0, variant: '', isSuper: false, seconds, phrases };
}
