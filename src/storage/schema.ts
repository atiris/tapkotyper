// Storage schema v2. These types are the data contract of `localStorage['tapkotyper:v1']`
// and of exported `.json` files. Older shapes are upgraded by the migrations in store.ts.

export type Lang = 'sk' | 'en';
export type LayoutId = 'sk-qwertz' | 'sk-qwerty' | 'us-qwerty';
export type CompanionKind = 'fox' | 'cat' | 'bunny' | 'owl' | 'dog' | 'bear' | 'panda' | 'penguin' | 'lion';
export type FontChoice = 'lexend' | 'atkinson' | 'opendyslexic';

export const COMPANION_KINDS: CompanionKind[] = ['fox', 'cat', 'bunny', 'owl', 'dog', 'bear', 'panda', 'penguin', 'lion'];

/** One day of practice of a key. */
export interface KeyDay {
  /** Local date `YYYY-MM-DD`. */
  date: string;
  presses: number;
  errors: number;
  /** Sum and count of reaction times (ms) of correct presses. */
  rtSum: number;
  rtCount: number;
}

export interface KeyStat {
  /** All presses and errors ever (shown as totals only). */
  presses: number;
  errors: number;
  /** Last presses, newest last: reaction ms for a correct press, 0 for an error. */
  recent: number[];
  /** What was typed instead of this key lately, newest last. */
  recentWrong: string[];
  /** Days with practice, oldest first. */
  days: KeyDay[];
}

export interface SessionRecord {
  /** Local date `YYYY-MM-DD`. */
  date: string;
  /** Active play seconds. */
  seconds: number;
  chars: number;
  errors: number;
  /** Smoothed rhythm, correct characters per minute. */
  cpm: number;
}

/** Share of targets taken from the parent's own words and text. */
export type OwnMix = 'off' | 'some' | 'half' | 'most';

export interface Settings {
  activeKeysMode: 'auto' | 'manual';
  manualKeys: string[];
  wordLen: [number, number];
  difficulty: number;
  /** The app raises difficulty and word length step by step as the child gets better. */
  autoDifficulty: boolean;
  autoWordLen: boolean;
  noDiacritics: boolean;
  noTimePressure: boolean;
  sessionMinutes: number;
  guide: 'auto' | 'on' | 'off';
  /** The parent locked the guide visibility; the child cannot toggle it. */
  guideLocked: boolean;
  sfxVolume: number;
  musicVolume: number;
  font: FontChoice;
  largeText: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  /** Ask for fullscreen on the first key press or click after the app starts. */
  autoFullscreen: boolean;
  /** The parent's own words and text, mixed into the targets by `ownMix`. */
  ownWords: string[];
  ownText: string;
  ownMix: OwnMix;
  /** Read the target to type and the narrator's lines aloud. */
  readAloud: boolean;
  /** "Just typing" reads the child's own typed words aloud (with `readAloud` on). */
  speakTyped: boolean;
}

/** A little friend helped in a rescue mission: a dragon (story 1), a robot (story 2) or a forest friend (story 3). */
export interface Friend {
  kind: 'dragon' | 'robot' | 'forest';
  name: string;
  hue: number;
  date: string;
}

export interface Progress {
  unlockedKeys: string[];
  /** Keys whose "new key" introduction was shown. */
  introducedKeys: string[];
  /** Level id -> best stars (1-3). */
  levels: Record<string, number>;
  worldsDone: number[];
  /** Unlocked reward ids: accessories (`acc:<id>`) and story rewards. */
  rewards: string[];
  friends: Friend[];
  /** Ids of the last preparation tips shown, newest last. */
  lastTips: string[];
  /** Story scenes already seen (they stay skippable). */
  scenesSeen: string[];
  /** Automatic steps up in difficulty or word length earned so far (each one is a medal). */
  growth: number;
  /** Seconds of good play collected toward the next automatic step. */
  growthSeconds: number;
  /** Paw helps charged by mistake-free streaks (the paw types a few words). */
  pawHelp: number;
  /** The child chose that the paw helps on its own in hard moments. */
  pawAuto: boolean;
  /** Companion kinds the child may pick: the starting kind first, then the ones earned by stars. */
  companionsUnlocked: CompanionKind[];
  /** Seconds of training ever (story levels and practice), the time `recordSession` counts. */
  trainedSeconds: number;
  /** Story levels and rescue missions finished ever. */
  levelsFinished: number;
  /** Stars earned ever, every finished run counts. */
  starsEarned: number;
}

/** When a surprise tells its answer. */
export type SurpriseTrigger = 'level' | 'minutes' | 'levels' | 'stars' | 'random';

/**
 * A rule for a real reward a parent hid: the game asks `q` and tells `a` when the trigger is met,
 * always together with the question.
 */
export interface Surprise {
  id: string;
  q: string;
  a: string;
  trigger: SurpriseTrigger;
  /** Minutes, levels or stars to collect (counting triggers). */
  n?: number;
  /** The story level id (trigger `level`). */
  level?: string;
  /** Count again after the reveal (or fire on every finish of the level, or go back to the pool). */
  repeat: boolean;
  createdAt: number;
  /** The counter (trained seconds, finished levels or earned stars) when counting started: creation or the last reveal. */
  progressFrom?: number;
  /** Local date of the reveal of a rule that does not repeat; it is never shown again. */
  doneAt?: string;
  /** Local date the answer was shown last. */
  lastShownAt?: string;
}

/** The character the child plays as. */
export interface Companion {
  /** The child's nickname in the game; empty means the player's name (see `nickname`). */
  name: string;
  kind: CompanionKind;
  /** Equipped accessory ids. */
  accessories: string[];
}

export type TaskKind = 'practice' | 'story';

/**
 * A task from a teacher or parent, taken from a link: its own words and text, how long, and
 * what to play; with the play collected so far over all its runs.
 */
export interface Task {
  id: string;
  title: string;
  words: string[];
  text: string;
  minutes: number;
  /** Free practice of the task's words only, or the next story levels with them mixed in. */
  kind: TaskKind;
  /** Class or group label the teacher typed, for example "5.A". */
  group?: string;
  seconds: number;
  chars: number;
  errors: number;
  /** Rhythm of the last run, correct characters per minute. */
  cpm: number;
  /** Local date the task was finished. */
  doneAt?: string;
}

export interface Profile {
  id: string;
  /** The child's real name: shown to parents and teachers and in result codes. */
  name: string;
  /** 32-bit hash of the name at creation; deals the per-player character prices and accessories. */
  seed: number;
  avatar: CompanionKind;
  companion: Companion;
  customMessages: string[];
  surprises: Surprise[];
  /** Tasks from links, newest first. */
  tasks: Task[];
  layout: LayoutId;
  language: Lang;
  settings: Settings;
  progress: Progress;
  stats: { keys: Record<string, KeyStat>; sessions: SessionRecord[] };
  createdAt: number;
}

/** The password on the parent screen: SHA-256 of salt + password, both hex. A lock on the page, not encryption. */
export interface ParentLock {
  salt: string;
  hash: string;
}

export interface StoreData {
  version: 2;
  profiles: Profile[];
  lastProfileId: string | null;
  language: Lang | null;
  /** One password for the whole device; the super player is never asked. */
  parentLock?: ParentLock;
}

export const GUEST_ID = 'guest';
/** The temporary super player (see app/super.ts); never stored. */
export const SUPER_ID = 'super';

export function defaultSettings(): Settings {
  return {
    activeKeysMode: 'auto',
    manualKeys: [],
    wordLen: [2, 6],
    difficulty: 3,
    autoDifficulty: true,
    autoWordLen: true,
    noDiacritics: false,
    noTimePressure: false,
    sessionMinutes: 15,
    guide: 'auto',
    guideLocked: false,
    sfxVolume: 0.7,
    musicVolume: 0.5,
    font: 'lexend',
    largeText: false,
    reduceMotion: false,
    highContrast: false,
    autoFullscreen: false,
    ownWords: [],
    ownText: '',
    ownMix: 'some',
    readAloud: false,
    speakTyped: true,
  };
}

export function emptyKeyStat(): KeyStat {
  return { presses: 0, errors: 0, recent: [], recentWrong: [], days: [] };
}
