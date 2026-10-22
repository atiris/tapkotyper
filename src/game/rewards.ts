import { isMastered } from '../learning/lessons';
import type { CompanionKind, Profile } from '../storage/schema';
import { worldLevels } from './levels';

/** Accessory unlocks: tied to levels, worlds and key mastery; never random. */
const BY_LEVEL: Record<string, string> = {
  'w1-1': 'cap', 'w1-2': 'sneakers', 'w1-3': 'round-glasses', 'w1-4': 'scarf',
  'w2-1': 'crown', 'w2-2': 'star-glasses', 'w2-3': 'bow-tie', 'w2-4': 'butterfly-wings',
  'w3-1': 'rain-boots', 'w3-2': 'knit-vest', 'w3-3': 'backpack', 'w3-4': 'explorer-vest',
  'w4-1': 'wand', 'w4-2': 'star-cape', 'w4-3': 'boots', 'w4-4': 'lantern',
  'w5-1': 'beanie', 'w5-2': 'neckerchief', 'w5-3': 'balloon', 'w5-4': 'hair-bow',
  'w8-2': 'raincoat',
};
/** By world index; the garden and the lake give none (Tapko already has the flower wreath, the lake gives its lily). */
const BY_WORLD: Record<number, string> = {
  0: 'flower-wreath', 1: 'explorer-hat', 2: 'wizard-hat', 3: 'green-boots', 4: 'dragon-wings',
  5: 'hard-hat', 6: 'goggles', 7: 'umbrella', 8: 'jetpack', 9: 'antenna-band',
  11: 'feather', 13: 'harp', 14: 'fairy-wings',
};
const BY_MASTERY: [number, string][] = [[8, 'heart-glasses'], [16, 'star-shirt'], [24, 'pink-sneakers'], [32, 'sunglasses']];

/** Story rewards per world. */
export const WORLD_REWARDS = ['invitation', 'landing', 'force', 'egg', 'hatched', 'friends', 'legs', 'raincoat', 'key', 'home', 'wreath', 'feather', 'lily', 'harp', 'wings'];

/** A world's badge: bronze when the world is done, better with the world's stars. */
export type BadgeTier = 'bronze' | 'silver' | 'gold';
export const BADGE_TIERS: BadgeTier[] = ['bronze', 'silver', 'gold'];
/** World stars (5 levels x 3) for a silver and a gold badge. */
export const BADGE_SILVER = 12;
export const BADGE_GOLD = 15;

export function worldStars(p: Profile, world: number): number {
  return worldLevels(world).reduce((a, l) => a + (p.progress.levels[l.id] ?? 0), 0);
}

/** The badge of a world, null until the world is done. */
export function badgeTier(p: Profile, world: number): BadgeTier | null {
  if (!p.progress.worldsDone.includes(world)) return null;
  const stars = worldStars(p, world);
  return stars >= BADGE_GOLD ? 'gold' : stars >= BADGE_SILVER ? 'silver' : 'bronze';
}

export interface UnlockRule {
  acc: string;
  rule: { kind: 'level'; id: string } | { kind: 'world'; world: number } | { kind: 'mastery'; keys: number };
}

export function unlockRules(): UnlockRule[] {
  return [
    ...Object.entries(BY_LEVEL).map(([id, acc]) => ({ acc, rule: { kind: 'level' as const, id } })),
    ...Object.entries(BY_WORLD).map(([world, acc]) => ({ acc, rule: { kind: 'world' as const, world: Number(world) } })),
    ...BY_MASTERY.map(([keys, acc]) => ({ acc, rule: { kind: 'mastery' as const, keys } })),
  ];
}

export function masteredCount(p: Profile): number {
  return p.progress.unlockedKeys.filter((k) => isMastered(p.stats.keys[k], p.settings.difficulty)).length;
}

export function hasAccessory(p: Profile, id: string): boolean {
  return p.progress.rewards.includes(`acc:${id}`);
}

/** Stars (summed over all levels) for each next companion kind. */
export const STARS_PER_FRIEND = 6;
/** The order other kinds are earned in; the starting kind is skipped (fox last, as it is the usual start). */
const FRIEND_ORDER: CompanionKind[] = ['cat', 'bunny', 'owl', 'dog', 'bear', 'panda', 'penguin', 'lion', 'fox'];

export function totalStars(p: Profile): number {
  return Object.values(p.progress.levels).reduce((a, b) => a + b, 0);
}

/** Stars a kind needs; 0 for the starting kind. */
export function friendStars(p: Profile, kind: CompanionKind): number {
  const start = p.progress.companionsUnlocked[0] ?? p.companion.kind;
  if (kind === start) return 0;
  return (FRIEND_ORDER.filter((k) => k !== start).indexOf(kind) + 1) * STARS_PER_FRIEND;
}

export function hasCompanion(p: Profile, kind: CompanionKind): boolean {
  return p.progress.companionsUnlocked.includes(kind);
}

/** Grants every companion kind the stars reach; returns the new ones. */
export function grantCompanions(p: Profile): CompanionKind[] {
  const stars = totalStars(p);
  const fresh = FRIEND_ORDER.filter((k) => !hasCompanion(p, k) && friendStars(p, k) <= stars);
  p.progress.companionsUnlocked.push(...fresh);
  return fresh;
}

/** Grants every accessory whose rule is met; returns the newly unlocked ids. */
export function grantAccessories(p: Profile): string[] {
  const mastered = masteredCount(p);
  const fresh: string[] = [];
  for (const { acc, rule } of unlockRules()) {
    if (hasAccessory(p, acc)) continue;
    const ok = rule.kind === 'level' ? (p.progress.levels[rule.id] ?? 0) > 0
      : rule.kind === 'world' ? p.progress.worldsDone.includes(rule.world)
      : mastered >= rule.keys;
    if (ok) {
      p.progress.rewards.push(`acc:${acc}`);
      fresh.push(acc);
    }
  }
  return fresh;
}
