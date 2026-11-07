import type { CompanionKind } from '../storage/schema';
import type { BadgeTier } from './rewards';
import type { GrowthStep, LevelResult } from './progress';

/** What an end card's one green line may tell, most important first. */
export type News =
  | { kind: 'badge'; world: number; tier: BadgeTier; upgrade: boolean }
  | { kind: 'parrotBadge' }
  | { kind: 'keys'; keys: string[] }
  | { kind: 'medal'; growth: GrowthStep }
  | { kind: 'wardrobe'; n: number }
  | { kind: 'companion'; companion: CompanionKind }
  | { kind: 'trend' }
  | { kind: 'find'; thing: string }
  | { kind: 'mastered'; key: string }
  | { kind: 'letter'; key: string; before: number; after: number }
  | { kind: 'faster' }
  | { kind: 'journeyHome'; story: string };

/** News that are rewards: several at once are told as the first and "and N more rewards". */
const REWARDS = new Set<News['kind']>(['badge', 'parrotBadge', 'keys', 'medal', 'wardrobe', 'companion']);

/** A speed this much better than a week ago is news. */
const TREND_UP = 1.05;

/** The news of a level, a practice or staying a while, in the green line's order. */
export function levelNews(r: LevelResult): News[] {
  const news: News[] = [];
  if (r.badge) news.push({ kind: 'badge', ...r.badge });
  if (r.newKeys.length) news.push({ kind: 'keys', keys: r.newKeys });
  if (r.growth) news.push({ kind: 'medal', growth: r.growth });
  if (r.newAccessories.length) news.push({ kind: 'wardrobe', n: r.newAccessories.length });
  for (const companion of r.newCompanions) news.push({ kind: 'companion', companion });
  if (r.trend && r.trend > TREND_UP) news.push({ kind: 'trend' });
  return news;
}

/** The trained letter whose accuracy grew the most in a target range run or a drill, or null when none grew by a whole percent (the card shows whole percents). */
export function bestLetter(report: { key: string; before: number; after: number }[]): News | null {
  const grew = (k: { before: number; after: number }) => Math.round(k.after * 100) - Math.round(k.before * 100);
  let best: { key: string; before: number; after: number } | null = null;
  for (const k of report) if (grew(k) > 0 && (!best || grew(k) > grew(best))) best = k;
  return best && { kind: 'letter', ...best };
}

/** How one key of a short drill went: its recent accuracy before and after, its presses in the run, whether the run mastered it. */
export interface DrillKey {
  key: string;
  before: number;
  after: number;
  presses: number;
  mastered: boolean;
}

/** Most keys the drill card shows one by one, and the presses a key needs in the run to be shown. */
export const DRILL_ROW_KEYS = 3;
export const DRILL_MIN_PRESSES = 5;

/** One row of the drill card: a key (null: all the trained keys together) with its accuracy before and after. */
export interface DrillRow {
  key: string | null;
  before: number;
  after: number;
}

/** The drill card's rows: up to three keys one by one (only those pressed enough), more keys as one row of their mean. */
export function drillRows(report: DrillKey[]): DrillRow[] {
  if (report.length > DRILL_ROW_KEYS) {
    const mean = (f: (k: DrillKey) => number) => report.reduce((s, k) => s + f(k), 0) / report.length;
    return [{ key: null, before: mean((k) => k.before), after: mean((k) => k.after) }];
  }
  return report.filter((k) => k.presses >= DRILL_MIN_PRESSES).map(({ key, before, after }) => ({ key, before, after }));
}

/** The accuracy grew by a whole percent (the card shows whole percents). */
export function drillImproved(row: { before: number; after: number }): boolean {
  return Math.round(row.after * 100) > Math.round(row.before * 100);
}

/** The news of a drill: the rewards first, then a key the run mastered, else its most improved key (pressed enough), then the rest. */
export function drillNews(r: LevelResult, report: DrillKey[]): News[] {
  const news = levelNews(r);
  const done = report.find((k) => k.mastered);
  const better = bestLetter(report.filter((k) => k.presses >= DRILL_MIN_PRESSES).map(({ key, before, after }) => ({ key, before, after })));
  const own: News[] = done ? [{ kind: 'mastered', key: done.key }] : better ? [better] : [];
  const at = news.findIndex((n) => !REWARDS.has(n.kind));
  news.splice(at < 0 ? news.length : at, 0, ...own);
  return news;
}

/** The green line: the first news, and how many more rewards came with it (0 when the first is not a reward). */
export function greenLine(news: News[]): { news: News; more: number } | null {
  const first = news[0];
  if (!first) return null;
  return { news: first, more: REWARDS.has(first.kind) ? news.slice(1).filter((n) => REWARDS.has(n.kind)).length : 0 };
}
