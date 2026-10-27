import type { Profile, Surprise, SurpriseTrigger } from '../storage/schema';
import { localDate } from '../learning/stats';
import type { LevelDef } from './levels';

export const SURPRISES_MAX = 50;
export const SURPRISE_LEN = 200;
/** Highest minutes, levels or stars a counting rule may wait for. */
export const SURPRISE_N_MAX = 999;

/** Order in which rules take the one surprise of a level run. */
export const TRIGGERS: SurpriseTrigger[] = ['level', 'minutes', 'levels', 'stars'];

type Counting = 'minutes' | 'levels' | 'stars';

const counting = (s: Surprise): s is Surprise & { trigger: Counting } => s.trigger === 'minutes' || s.trigger === 'levels' || s.trigger === 'stars';

/** The profile's counter a counting trigger follows: trained seconds, finished levels or earned stars. */
export function counterOf(p: Profile, trigger: SurpriseTrigger): number {
  const pr = p.progress;
  return trigger === 'minutes' ? pr.trainedSeconds : trigger === 'levels' ? pr.levelsFinished : trigger === 'stars' ? pr.starsEarned : 0;
}

/** How long a told surprise stays on the map by default, and at most when not for ever: days after the day it was told. */
export const SHOW_DAYS = 1;
export const SHOW_DAYS_MAX = 15;

/** A new rule, counting from now. */
export function newSurprise(p: Profile, rule: Pick<Surprise, 'q' | 'a' | 'trigger' | 'n' | 'level' | 'repeat' | 'announce' | 'showDays'>): Surprise {
  const id = Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
  return { id, ...rule, createdAt: Date.now(), progressFrom: counterOf(p, rule.trigger) };
}

/** A parent changed when the rule fires: it waits again, counting from now. */
export function restartSurprise(p: Profile, s: Surprise): void {
  s.progressFrom = counterOf(p, s.trigger);
  delete s.doneAt;
}

/** Progress of a counting rule in its own units (whole minutes, levels, stars); `have` stops at `need`. */
export function surpriseCount(p: Profile, s: Surprise): { have: number; need: number } {
  const need = s.n ?? 1;
  const got = counterOf(p, s.trigger) - (s.progressFrom ?? 0);
  return { have: Math.max(0, Math.min(need, Math.floor(s.trigger === 'minutes' ? got / 60 : got))), need };
}

const reached = (p: Profile, s: Surprise) => {
  const c = surpriseCount(p, s);
  return c.have >= c.need;
};

/** Counting rules still waiting, in trigger order, the oldest first. */
function countingOpen(p: Profile): Surprise[] {
  return p.surprises.filter((s) => !s.doneAt && counting(s)).sort((x, y) => TRIGGERS.indexOf(x.trigger) - TRIGGERS.indexOf(y.trigger));
}

/**
 * The rule asked about on the get-ready card of this run: the one of this level, else a
 * counting rule (one already reached first). Drills have none.
 */
export function surpriseFor(p: Profile, def: LevelDef, drill: boolean): Surprise | null {
  if (drill) return null;
  const level = p.surprises.find((s) => !s.doneAt && s.trigger === 'level' && s.level === def.id);
  if (level) return level;
  const open = countingOpen(p);
  return open.find((s) => reached(p, s)) ?? open[0] ?? null;
}

/** The level waits with a surprise the map shows ahead. */
export function surpriseAnnounced(p: Profile, levelId: string): boolean {
  return p.surprises.some((s) => s.announce && s.trigger === 'level' && s.level === levelId && !s.doneAt);
}

/** Whole days from one local date (YYYY-MM-DD) to another. */
function daysBetween(from: string, to: string): number {
  const day = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  return Math.round((day(to) - day(from)) / 86_400_000);
}

/**
 * Surprises told in a story level of the world that the map still shows `today`: on the day of the
 * last telling and the surprise's days after it (deleted ones are gone).
 */
export function surprisesWonIn(p: Profile, world: number, today = localDate()): Surprise[] {
  return p.surprises.filter((s) => {
    if (!s.worlds?.includes(world)) return false;
    const days = s.showDays ?? SHOW_DAYS;
    return days === 'forever' || !s.lastShownAt || daysBetween(s.lastShownAt, today) <= days;
  });
}

/** A story level of the world told the answer. */
export function surpriseWonIn(s: Surprise, world: number): void {
  if (!s.worlds?.includes(world)) s.worlds = [...(s.worlds ?? []), world];
}

/** The answer was told: done, or counting again from now. */
function reveal(p: Profile, s: Surprise, today: string): void {
  s.lastShownAt = today;
  if (!s.repeat) s.doneAt = today;
  else if (counting(s)) s.progressFrom = counterOf(p, s.trigger);
}

/**
 * The one surprise on the results of a finished run, `asked` being the rule from `surpriseFor`:
 * a rule that fired (its answer is told and recorded), else the asked rule still waiting.
 */
export function surpriseOutcome(p: Profile, asked: Surprise | null, drill: boolean, today = localDate()): { rule: Surprise; revealed: boolean } | null {
  if (drill) return null;
  const fired = asked?.trigger === 'level' ? asked : countingOpen(p).find((s) => reached(p, s));
  if (fired) {
    reveal(p, fired, today);
    return { rule: fired, revealed: true };
  }
  return asked ? { rule: asked, revealed: false } : null;
}
