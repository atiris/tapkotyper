import type { Profile } from '../storage/schema';

/** Chance per day that one won parrot flies away. */
export const FLY_CHANCE = 0.2;
/** Days after the last win when the parrots drop straight to the floor. */
export const DROP_DAYS = 21;
/** How many below the best count the parrots may fly away to. */
const FLY_RANGE = 3;
/** Points of the Parrot badge in the treasure chest. */
export const PARROT_POINTS = 7;

/** Rounds of the learning phase: every word in turn. */
export const LEARN_ROUNDS = 3;
/** Repetitions a wrong key adds to its word, and at most for one word. */
export const SLIP_ADD = 2;
export const SLIP_MAX = 6;

/** Days from `from` to `to`, both local `YYYY-MM-DD` dates. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

/** No parrot flies away while this many or fewer are at home: three below the best count, at least one. */
export function parrotFloor(best: number): number {
  return Math.max(1, best - FLY_RANGE);
}

/** Every finished world has its parrot at home (and there is at least one). */
export function hasParrotBadge(p: Profile): boolean {
  const { parrots, worldsDone } = p.progress;
  return parrots.length > 0 && worldsDone.every((w) => parrots.includes(w));
}

/**
 * Lets won parrots fly away: one roll per day since the last check (only today the first time),
 * each one a FLY_CHANCE that a random parrot leaves, never below the floor; DROP_DAYS after the last
 * win they drop to the floor at once. The flown worlds wait in `parrotFlown` for the map; returns them.
 */
export function flyAway(p: Profile, today: string, rand: () => number = Math.random): number[] {
  const pr = p.progress;
  const floor = parrotFloor(pr.parrotBest);
  const flown: number[] = [];
  const leave = () => {
    const w = pr.parrots.splice(Math.floor(rand() * pr.parrots.length), 1)[0];
    flown.push(w);
  };
  const rolls = pr.parrotCheckedAt ? Math.max(0, daysBetween(pr.parrotCheckedAt, today)) : 1;
  for (let i = 0; i < rolls && pr.parrots.length > floor; i++) if (rand() < FLY_CHANCE) leave();
  if (pr.parrotWonAt && daysBetween(pr.parrotWonAt, today) >= DROP_DAYS) while (pr.parrots.length > floor) leave();
  pr.parrotCheckedAt = today;
  pr.parrotFlown = [...new Set([...pr.parrotFlown, ...flown])];
  return flown;
}

/** The world's parrot round is finished: its parrot is at home; returns whether this win brought the badge. */
export function winParrot(p: Profile, world: number, today: string): boolean {
  const pr = p.progress;
  const had = hasParrotBadge(p);
  if (!pr.parrots.includes(world)) pr.parrots.push(world);
  if (!pr.parrotsMet.includes(world)) pr.parrotsMet.push(world);
  pr.parrotBest = Math.max(pr.parrotBest, pr.parrots.length);
  pr.parrotWonAt = today;
  pr.parrotFlown = pr.parrotFlown.filter((w) => w !== world);
  return !had && hasParrotBadge(p);
}

/** Mistakes a parrot round bears, 4 plus the story's number (1-3) for its index `story` (0-2); one more and the parrot flies off. */
export function parrotPatience(story: number): number {
  return 5 + story;
}

/** The parrot flew off after too many mistakes: it leaves its perch (and home, if it lived there). */
export function loseParrot(p: Profile, world: number): void {
  const pr = p.progress;
  pr.parrots = pr.parrots.filter((w) => w !== world);
  if (!pr.parrotsMet.includes(world)) pr.parrotsMet.push(world);
}

/** Size of a parrot round: how many words, their letters and the repetitions of each in phase 2. */
export interface ParrotSize {
  words: number;
  len: [number, number];
  repeats: number;
}

/** By the story's order (0-2) and the world's place in it (0-4): later stories take more and longer words. */
export function parrotSize(story: number, place: number): ParrotSize {
  const early = place <= 1;
  const len: [number, number][] = [early ? [2, 4] : [3, 5], early ? [4, 5] : [4, 6], early ? [5, 6] : [5, 7]];
  return { words: 3 + story, len: len[story], repeats: 3 + story };
}

export interface ParrotStep {
  word: string;
  /** 1 learning (the words in turn), 2 repeating (each word several times in a row). */
  phase: 1 | 2;
}

/**
 * One parrot round: the words in turn LEARN_ROUNDS times, then each one `repeats` times in a row;
 * a wrong key brings its word SLIP_ADD more times right after it, at most SLIP_MAX more per word.
 */
export class ParrotRound {
  readonly steps: ParrotStep[];
  /** Index of the current step. */
  at = 0;
  private added = new Map<string, number>();

  constructor(readonly words: string[], repeats: number) {
    this.steps = [
      ...Array.from({ length: LEARN_ROUNDS }, () => words.map((word) => ({ word, phase: 1 as const }))).flat(),
      ...words.flatMap((word) => Array.from({ length: repeats }, () => ({ word, phase: 2 as const }))),
    ];
  }

  get current(): ParrotStep | null {
    return this.steps[this.at] ?? null;
  }

  get upcoming(): ParrotStep | null {
    return this.steps[this.at + 1] ?? null;
  }

  get done(): boolean {
    return this.at >= this.steps.length;
  }

  progress(): number {
    return this.steps.length ? this.at / this.steps.length : 1;
  }

  /** The current word is typed. */
  advance(): void {
    if (!this.done) this.at++;
  }

  /** A wrong key: its word comes SLIP_ADD more times right after it, up to SLIP_MAX per word; returns how many were added. */
  slip(): number {
    const cur = this.current;
    if (!cur) return 0;
    const n = Math.min(SLIP_ADD, SLIP_MAX - (this.added.get(cur.word) ?? 0));
    if (n <= 0) return 0;
    this.added.set(cur.word, (this.added.get(cur.word) ?? 0) + n);
    this.steps.splice(this.at + 1, 0, ...Array.from({ length: n }, () => ({ word: cur.word, phase: cur.phase })));
    return n;
  }
}
