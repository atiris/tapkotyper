/**
 * The magpie: now and then it takes one thing of the target ranges' collection, and the map tells it
 * (`.specify/game/target-range.md`). It is never seen; the figure on the map only says it came.
 */
import type { Profile } from '../storage/schema';
import { daysBetween } from './parrots';

/** Days from one visit of the magpie to the next, at random within. */
export const MAGPIE_DAYS: readonly [number, number] = [7, 14];

/** The local date `days` after `date` (both `YYYY-MM-DD`). */
function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}

const nextVisit = (today: string, rand: () => number) =>
  addDays(today, MAGPIE_DAYS[0] + Math.floor(rand() * (MAGPIE_DAYS[1] - MAGPIE_DAYS[0] + 1)));

/**
 * Checked when the player becomes active, like the parrots and the notes: once the magpie's day is
 * here it takes one random thing of the collection, and comes again 7 to 14 days later. It takes one at
 * most until the child types again, however long the child was away. Returns the thing taken.
 */
export function magpieVisit(p: Profile, today: string, rand: () => number = Math.random): string | null {
  const pr = p.progress;
  if (!pr.magpieDue) {
    pr.magpieDue = nextVisit(today, rand);
    return null;
  }
  if (daysBetween(pr.magpieDue, today) < 0) return null;
  if (pr.magpieTrained >= 0 && pr.trainedSeconds <= pr.magpieTrained) return null;
  if (!pr.rangeFinds.length) {
    pr.magpieDue = nextVisit(today, rand);
    return null;
  }
  const [id] = pr.rangeFinds.splice(Math.floor(rand() * pr.rangeFinds.length), 1);
  pr.magpieTaken = id;
  pr.magpieTrained = pr.trainedSeconds;
  pr.magpieDue = nextVisit(today, rand);
  return id;
}

/** The thing the magpie took that the map has not told yet (it counts as told now), null when none. */
export function untoldMagpie(p: Profile): string | null {
  const id = p.progress.magpieTaken || null;
  p.progress.magpieTaken = '';
  return id;
}
