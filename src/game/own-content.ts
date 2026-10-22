import type { Profile, Surprise, SurpriseTrigger } from '../storage/schema';
import { localDate } from '../learning/stats';
import type { LevelDef } from './levels';

export const SURPRISES_MAX = 50;
export const SURPRISE_LEN = 200;
/** Highest minutes, levels or stars a counting rule may wait for. */
export const SURPRISE_N_MAX = 999;
/** Chance that a free question from the pool is asked after a level. */
export const RANDOM_CHANCE = 1 / 3;

/** Order in which rules take the one surprise of a level run. */
export const TRIGGERS: SurpriseTrigger[] = ['level', 'minutes', 'levels', 'stars', 'random'];

type Counting = 'minutes' | 'levels' | 'stars';

const counting = (s: Surprise): s is Surprise & { trigger: Counting } => s.trigger === 'minutes' || s.trigger === 'levels' || s.trigger === 'stars';

/** The profile's counter a counting trigger follows: trained seconds, finished levels or earned stars. */
export function counterOf(p: Profile, trigger: SurpriseTrigger): number {
  const pr = p.progress;
  return trigger === 'minutes' ? pr.trainedSeconds : trigger === 'levels' ? pr.levelsFinished : trigger === 'stars' ? pr.starsEarned : 0;
}

/** A new rule, counting from now. */
export function newSurprise(p: Profile, rule: Pick<Surprise, 'q' | 'a' | 'trigger' | 'n' | 'level' | 'repeat'>): Surprise {
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
 * The rule Tapko asks about on the get-ready card of this run: the one of this level, else a
 * counting rule (one already reached first). Drills have none.
 */
export function surpriseFor(p: Profile, def: LevelDef, drill: boolean): Surprise | null {
  if (drill) return null;
  const level = p.surprises.find((s) => !s.doneAt && s.trigger === 'level' && s.level === def.id);
  if (level) return level;
  const open = countingOpen(p);
  return open.find((s) => reached(p, s)) ?? open[0] ?? null;
}

/** The answer was told: done, or counting again from now. */
function reveal(p: Profile, s: Surprise, today: string): void {
  s.lastShownAt = today;
  if (!s.repeat) s.doneAt = today;
  else if (counting(s)) s.progressFrom = counterOf(p, s.trigger);
}

/**
 * The one surprise on the results of a finished run, `asked` being the rule from `surpriseFor`:
 * a rule that fired (its answer is told and recorded), else now and then a free question from
 * the pool (never twice a day), else the asked rule still waiting.
 */
export function surpriseOutcome(p: Profile, asked: Surprise | null, drill: boolean, rnd = Math.random, today = localDate()): { rule: Surprise; revealed: boolean } | null {
  if (drill) return null;
  const fired = asked?.trigger === 'level' ? asked : countingOpen(p).find((s) => reached(p, s));
  if (fired) {
    reveal(p, fired, today);
    return { rule: fired, revealed: true };
  }
  const pool = p.surprises.filter((s) => s.trigger === 'random');
  const open = pool.filter((s) => !s.doneAt);
  if (open.length && !pool.some((s) => s.lastShownAt === today) && rnd() < RANDOM_CHANCE) {
    const rule = open[Math.floor(rnd() * open.length)];
    reveal(p, rule, today);
    return { rule, revealed: true };
  }
  return asked ? { rule: asked, revealed: false } : null;
}
