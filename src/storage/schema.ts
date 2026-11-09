// Storage schema. These types are the data contract of `localStorage['tapkotyper:v1']`
// and of exported `.json` files. No migrations while the game is in alpha: missing fields get defaults.

export type Lang = 'sk' | 'en';
/** How much the game draws: automatic (simple once this device was measured slow), always full, or simple. */
export type GraphicsChoice = 'auto' | 'full' | 'simple';
/** A language as players and settings point to it: an official one, or an own one made in the translator (`own:<id>`). */
export type LangRef = Lang | `own:${string}`;
/** The look of the whole device: `system` follows the browser's color scheme. */
export type Theme = 'system' | 'light' | 'dark';
/** The quick sound switch: full, quiet, only where sound matters (Rytmus, dictation) or off. */
export type SoundLevel = 'normal' | 'quiet' | 'important' | 'off';
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

/** One rhythm note: the world whose Rytmus earned it, and its number (its picture and lean). */
export interface RhythmNote {
  world: number;
  n: number;
}

/** What a world keeps of its last Rytmus round. */
export interface RhythmRecord {
  /** Its rhythm score (0-100), null without one (too few landings, no time pressure). */
  rhythm: number | null;
  /** The highest tempo ever held for a whole phrase in this world. */
  top: number;
}

export interface SessionRecord {
  /** Local date `YYYY-MM-DD`. */
  date: string;
  /** Active play seconds. */
  seconds: number;
  chars: number;
  errors: number;
  /** Smoothed speed, correct characters per minute. */
  cpm: number;
  /** How even the typing was (0-100), weighted by `rhythmChars`, the characters of the levels that had a score; absent or null = none. */
  rhythm?: number | null;
  rhythmChars?: number;
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
  /** The teacher turtle now and then tells one thing about the app on the map. */
  appTips: boolean;
  sessionMinutes: number;
  /** The parent's choice: the child cannot skip the stretch break (the big one added to it may still end early). */
  breaksLocked: boolean;
  guide: 'auto' | 'on' | 'off';
  /** The parent locked the guide visibility; the child cannot toggle it. */
  guideLocked: boolean;
  /** Which finger types the digit row: ergonomic (each finger the key nearly above its own, the default) or the historically taught standard one. */
  fingering: 'ergonomic' | 'standard';
  /** The outline hands on the on-screen keyboard: shown, emphasized (full lines) or hidden. */
  hands: 'on' | 'bold' | 'off';
  sfxVolume: number;
  musicVolume: number;
  font: FontChoice;
  largeText: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  /** How much the game draws (engine/graphics.ts); automatic turns simple on a device measured slow. */
  graphics: GraphicsChoice;
  /** The player's look and quick sound level; picking the player brings them back, and the start page keeps the last player's. */
  theme: Theme;
  sound: SoundLevel;
  /** Ask for fullscreen on the first key press or click after the app starts. */
  autoFullscreen: boolean;
  /** After the next finished level (not a map game) the turtle offers the keyboard check; any answer turns it off. */
  offerPlacement: boolean;
  /** The parent's own words and text, mixed into the targets by `ownMix`. */
  ownWords: string[];
  ownText: string;
  ownMix: OwnMix;
  /** Read the target to type and the narrator's lines aloud. */
  readAloud: boolean;
  /** "Just typing" reads the child's own typed words aloud (with `readAloud` on). */
  speakTyped: boolean;
  /** Wardrobe time is earned by practice and runs out (see game/wardrobe-time.ts). */
  wardrobeLimit: boolean;
  /** Language of the word list the targets come from; the interface language is `Profile.language`. */
  wordLang: LangRef;
  /** Language of the word list mixed with the own words and text of the custom exercise. */
  ownWordLang: LangRef;
  /** Key caps and key marks use a font that tells l, I and 1 apart. */
  keyFont: boolean;
  /** Which measures the levels' top bar shows: Presnosť, Rytmus, Rýchlosť (Rytmus the game always shows all three). */
  hudAccuracy: boolean;
  hudRhythm: boolean;
  hudSpeed: boolean;
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
  /** Ids of the last preparation tips shown, newest last. */
  lastTips: string[];
  /** Story scenes and control-key cards (`key-escape`, `key-tab`, `key-backspace`) already seen. */
  scenesSeen: string[];
  /** Automatic steps up in difficulty or word length earned so far (each one is a medal). */
  growth: number;
  /** Seconds of good play collected toward the next automatic step. */
  growthSeconds: number;
  /** Companion kinds the child may pick: the starting kind first, then the ones earned by stars. */
  companionsUnlocked: CompanionKind[];
  /** Seconds of training ever (story levels and practice), the time `recordSession` counts. */
  trainedSeconds: number;
  /** Story levels and hero's journeys finished ever. */
  levelsFinished: number;
  /** Stars earned ever, every finished run counts. */
  starsEarned: number;
  /** Wardrobe time left in seconds, earned by training (`0..WARDROBE_MAX`, may hold fractions). */
  wardrobeSeconds: number;
  /** The world of the last mission (a story level or a hero's journey); -1 before any. */
  missionWorld: number;
  /** Ids of the world things hit in the middle at the target range (its collection). */
  rangeFinds: string[];
  /**
   * The magpie (game/magpie.ts): the local date of its next visit ('' before the first check), the typing
   * time (`trainedSeconds`) when it took a thing last (-1 before any), and the thing taken the map has not told ('').
   */
  magpieDue: string;
  magpieTrained: number;
  magpieTaken: string;
  /** The most points in one run of the target range (its base time), and when it was set (ms, null before any). */
  rangeRecord: number;
  rangeRecordAt: number | null;
  /** Worlds whose parrot is won (at home). */
  parrots: number[];
  /** Worlds whose parrot round was ever won, the parrot at home or flown away since. */
  parrotsWon: number[];
  /** Parrot rounds won ever, every win counts (the parrot already at home too). */
  parrotsEarned: number;
  /** Most parrots ever at home at once. */
  parrotBest: number;
  /** Local date of the last parrot round won, null before any. */
  parrotWonAt: string | null;
  /** Local date the fly-away was rolled last, null before the first roll. */
  parrotCheckedAt: string | null;
  /** Worlds whose parrot flew away and the map has not told yet. */
  parrotFlown: number[];
  /** Aro (the Parrot badge) sits on the map's perch: he landed there and has not flown off since. */
  parrotPerched: boolean;
  /** Rytmus per world (by its index): the last round's rhythm, the highest tempo held. */
  rhythm: Record<string, RhythmRecord>;
  /** The base tempo (letters a minute) every world's next Rytmus round starts from, null before the first round. */
  rhythmTempo: number | null;
  /** Worlds whose Rytmus held the world's target tempo for a whole phrase, accurately (the check under its node). */
  rhythmWon: number[];
  /**
   * Rhythm notes (one per great Rytmus round, of the world it was played in), the last round's local
   * date `YYYY-MM-DD` and the notes faded since then: a random one fades for every three days (beat.ts fadeNotes).
   */
  rhythmNoteList: RhythmNote[];
  rhythmNotesAt: string | null;
  rhythmNotesFaded: number;
  /** Of the notes faded since the last round, how many the map has told. */
  rhythmNotesTold: number;
  /** The treble clef went with notes flown since the map told it last. */
  rhythmClefLost: boolean;
  /** The teacher turtle's tips read (ids) and when the last one was read (ms, 0 before any). */
  appTips: { seen: string[]; lastAt: number };
  /** The turtle asked on the map whether to check what the student already knows. */
  placementAsked: boolean;
  /** Keys the placement check reached (the most of all checks): levels needing no more open without stars. */
  placementKeys: number;
}

/** When a surprise tells its answer. */
export type SurpriseTrigger = 'level' | 'minutes' | 'levels' | 'stars';

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
  /** The map shows a golden box on the level ahead (trigger `level`). */
  announce?: boolean;
  /** Worlds whose story levels told the answer; the map keeps it there under an open box. */
  worlds?: number[];
  /** Days after the day it was told that the map still shows it there (0: that day only); missing: 1. */
  showDays?: number | 'forever';
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
  /** The player's nickname, shown everywhere the game shows the player; never empty. */
  name: string;
  kind: CompanionKind;
  /** Equipped accessory ids. */
  accessories: string[];
  /** A random owned character on a mission into another world than the last one (`progress.missionWorld`). */
  randomKind: boolean;
  /** Body areas (`Slot`) that get a random owned item, or none, on every mission. */
  randomSlots: string[];
}

/** The game a task plays: the words games use the task's words, the text games its text. */
export type TaskGame = 'chase' | 'catch' | 'copy' | 'ribbon' | 'transcribe';
/** When a task ends: when its time is up, when its text is all typed, or the whole text and then on until the time is up. */
export type TaskLimit = 'time' | 'text' | 'both';

/** A task as the teacher made it and its link carries. */
export interface TaskSpec {
  id: string;
  title: string;
  /** Class or group label the teacher typed, for example "5.A". */
  group?: string;
  game: TaskGame;
  /** The words of a words game; empty for a text game. */
  words: string[];
  /** The text of a text game; empty for a words game. */
  text: string;
  limit: TaskLimit;
  /** Minutes of the limits `time` and `both`; kept but unused for `text`. */
  minutes: number;
  /** When the task's words run out, words of the dictionary the student can type come; off: the task's words repeat. */
  dictionary: boolean;
  /** Words with letters the student does not know yet are left out; off: those letters are learned before the task. */
  knownOnly: boolean;
  /** The world behind the task: the student's current one or any (only as a backdrop). */
  world: 'current' | 'random';
}

/** One finished run of a task. */
export interface TaskRun {
  seconds: number;
  chars: number;
  errors: number;
  /** Speed, correct characters per minute. */
  cpm: number;
  /** Local date the run finished. */
  doneAt: string;
  /** Which finished run it was, 1 for the first. */
  try: number;
}

/**
 * A task from a teacher, taken from a link or a code: what the teacher made, how many runs were
 * finished (a run is one sitting) and the best of them, which is handed in.
 */
export interface Task extends TaskSpec {
  /** Finished runs so far. */
  finished: number;
  best?: TaskRun;
}

/** A task the teacher made on the teacher page and keeps there. */
export interface TeacherTask extends TaskSpec {
  madeAt: number;
}

/** A task noted on a phone from the teacher's QR code: its code, to send it home. */
export interface NotedTask {
  code: string;
  title: string;
  at: number;
}

export interface Profile {
  id: string;
  /** Optional real name, shown to the mentor only (in result codes the nickname stands in when it is empty). */
  name: string;
  /** 32-bit hash of the name (or the nickname without one) at creation; deals the per-player character prices and accessories. */
  seed: number;
  avatar: CompanionKind;
  companion: Companion;
  customMessages: string[];
  surprises: Surprise[];
  /** Tasks from links and codes, newest first. */
  tasks: Task[];
  layout: LayoutId;
  language: LangRef;
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
  profiles: Profile[];
  lastProfileId: string | null;
  language: LangRef | null;
  theme: Theme;
  /** One password for the whole device; the super player is never asked. */
  parentLock?: ParentLock;
  /** When the super player last removed or changed the password without the current one (ms since epoch). */
  lockRemovedAt?: number;
  /** Tasks made on the teacher page in this browser, newest first; never sent anywhere. */
  teacherTasks: TeacherTask[];
  /** Tasks noted on a phone without a keyboard, newest first. */
  notedTasks: NotedTask[];
  /** How many keys held at once this device's keyboard reports (sticky finger's check), and when it was checked (ISO time); none before the check. */
  rollover?: Rollover;
}

export interface Rollover {
  max: number;
  checked: string;
}

export const GUEST_ID = 'guest';
/** The temporary super player (see app/super.ts); never stored. */
export const SUPER_ID = 'super';

export function defaultSettings(wordLang: LangRef): Settings {
  return {
    activeKeysMode: 'auto',
    manualKeys: [],
    wordLen: [2, 6],
    difficulty: 3,
    autoDifficulty: true,
    autoWordLen: true,
    noDiacritics: false,
    noTimePressure: false,
    appTips: true,
    sessionMinutes: 15,
    breaksLocked: false,
    guide: 'auto',
    guideLocked: false,
    fingering: 'ergonomic',
    hands: 'on',
    sfxVolume: 0.7,
    musicVolume: 0.5,
    font: 'lexend',
    largeText: false,
    reduceMotion: false,
    highContrast: false,
    graphics: 'auto',
    theme: 'system',
    sound: 'off',
    autoFullscreen: false,
    offerPlacement: false,
    ownWords: [],
    ownText: '',
    ownMix: 'some',
    readAloud: false,
    speakTyped: true,
    wardrobeLimit: true,
    wordLang,
    ownWordLang: wordLang,
    keyFont: true,
    hudAccuracy: true,
    hudRhythm: false,
    hudSpeed: false,
  };
}

export function emptyKeyStat(): KeyStat {
  return { presses: 0, errors: 0, recent: [], recentWrong: [], days: [] };
}
