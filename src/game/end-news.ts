import type { CompanionKind, Friend } from '../storage/schema';
import type { BadgeTier } from './rewards';
import type { GrowthStep, LevelResult } from './progress';

/** What an end card's one green line may tell, most important first. */
export type News =
  | { kind: 'rescued'; friend: Friend }
  | { kind: 'badge'; world: number; tier: BadgeTier; upgrade: boolean }
  | { kind: 'parrotBadge' }
  | { kind: 'keys'; keys: string[] }
  | { kind: 'medal'; growth: GrowthStep }
  | { kind: 'wardrobe'; n: number }
  | { kind: 'companion'; companion: CompanionKind }
  | { kind: 'trend' }
  | { kind: 'find'; thing: string }
  | { kind: 'letter'; key: string; before: number; after: number }
  | { kind: 'faster' };

/** News that are rewards: several at once are told as the first and "and N more rewards". */
const REWARDS = new Set<News['kind']>(['rescued', 'badge', 'parrotBadge', 'keys', 'medal', 'wardrobe', 'companion']);

/** A rhythm this much better than a week ago is news. */
const TREND_UP = 1.05;

/** The news of a level, a practice or staying a while, in the green line's order. */
export function levelNews(r: LevelResult, rescued: Friend | null = null): News[] {
  const news: News[] = [];
  if (rescued) news.push({ kind: 'rescued', friend: rescued });
  if (r.badge) news.push({ kind: 'badge', ...r.badge });
  if (r.newKeys.length) news.push({ kind: 'keys', keys: r.newKeys });
  if (r.growth) news.push({ kind: 'medal', growth: r.growth });
  if (r.newAccessories.length) news.push({ kind: 'wardrobe', n: r.newAccessories.length });
  for (const companion of r.newCompanions) news.push({ kind: 'companion', companion });
  if (r.trend && r.trend > TREND_UP) news.push({ kind: 'trend' });
  return news;
}

/** The trained letter whose accuracy grew the most in a target range run, or null when none grew. */
export function bestLetter(report: { key: string; before: number; after: number }[]): News | null {
  let best: { key: string; before: number; after: number } | null = null;
  for (const k of report) if (k.after > k.before && (!best || k.after - k.before > best.after - best.before)) best = k;
  return best && { kind: 'letter', ...best };
}

/** The green line: the first news, and how many more rewards came with it (0 when the first is not a reward). */
export function greenLine(news: News[]): { news: News; more: number } | null {
  const first = news[0];
  if (!first) return null;
  return { news: first, more: REWARDS.has(first.kind) ? news.slice(1).filter((n) => REWARDS.has(n.kind)).length : 0 };
}
