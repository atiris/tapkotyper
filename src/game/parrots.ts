import type { Profile } from '../storage/schema';

/** Chance per day that one won parrot flies away. */
export const FLY_CHANCE = 0.2;
/** Days after the last win when the parrots drop straight to the floor. */
export const DROP_DAYS = 21;
/** How many below the best count the parrots may fly away to. */
const FLY_RANGE = 3;
/** Points of the Parrot badge in the treasure chest. */
export const PARROT_POINTS = 7;

/** Seconds of play a parrot round lasts at least, in every world; each mistake adds MISS_ADD_S, up to PARROT_MAX_S. */
export const PARROT_MIN_S = 120;
export const PARROT_MAX_S = 180;
export const MISS_ADD_S = 10;

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
  if (!pr.parrotsWon.includes(world)) pr.parrotsWon.push(world);
  pr.parrotsEarned++;
  pr.parrotBest = Math.max(pr.parrotBest, pr.parrots.length);
  pr.parrotWonAt = today;
  pr.parrotFlown = pr.parrotFlown.filter((w) => w !== world);
  return !had && hasParrotBadge(p);
}

/** Service: a random parrot at home flies away, told on the map like a rolled one; returns its world, null when none is home. */
export function sendParrotAway(p: Profile, rand: () => number = Math.random): number | null {
  const pr = p.progress;
  if (!pr.parrots.length) return null;
  const w = pr.parrots.splice(Math.floor(rand() * pr.parrots.length), 1)[0];
  pr.parrotFlown = [...new Set([...pr.parrotFlown, w])];
  return w;
}

/** Service: the parrot of a random finished world without it comes home, as if its round was won; returns the world, null when none misses it. */
export function bringParrotHome(p: Profile, today: string, rand: () => number = Math.random): number | null {
  const missing = p.progress.worldsDone.filter((w) => !p.progress.parrots.includes(w));
  if (!missing.length) return null;
  const w = missing[Math.floor(rand() * missing.length)];
  winParrot(p, w, today);
  return w;
}

/** Mistakes a parrot round bears, 5 plus the story's `tier` (0-2); one more and the parrot flies off. */
export function parrotPatience(tier: number): number {
  return 5 + tier;
}

/** The parrot flew off after too many mistakes: it leaves home, if it lived there. */
export function loseParrot(p: Profile, world: number): void {
  p.progress.parrots = p.progress.parrots.filter((w) => w !== world);
}

/** Size of a parrot round: how many words and their letters. */
export interface ParrotSize {
  words: number;
  len: [number, number];
}

/** By the story's tier (0-2) and the world's place in it (0-4): harder stories take more and longer words. */
export function parrotSize(tier: number, place: number): ParrotSize {
  const early = place <= 1;
  const len: [number, number][] = [early ? [2, 4] : [3, 5], early ? [4, 5] : [4, 6], early ? [5, 6] : [5, 7]];
  return { words: 5 + tier, len: len[tier] };
}

/** Steps of one block: a pair of words twice, A B A B. */
export const BLOCK = 4;

/**
 * One parrot round: the words in pairs, each pair twice (A B A B C D C D E F E F G A G A B C B C),
 * round and round the list until the round's time is up; it ends with a whole block.
 */
export class ParrotRound {
  /** Index of the current step. */
  at = 0;
  /** The time is up: the round ends with the block it is in. */
  private closing = false;

  constructor(readonly words: string[]) {}

  /** The word of step `i`. */
  wordAt(i: number): string {
    const n = this.words.length, first = (Math.floor(i / BLOCK) * 2) % n;
    return this.words[(first + (i % 2)) % n];
  }

  get current(): string | null {
    return this.done ? null : this.wordAt(this.at);
  }

  get done(): boolean {
    return this.closing && this.at % BLOCK === 0;
  }

  /** The current word is typed. */
  advance(): void {
    if (!this.done) this.at++;
  }

  /** The time is up: the round finishes the block it is in (at once between blocks). */
  close(): void {
    this.closing = true;
  }
}
