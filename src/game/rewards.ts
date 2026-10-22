import { Rng } from '../engine/rng';
import { isMastered } from '../learning/lessons';
import { COMPANION_KINDS, type CompanionKind, type Profile } from '../storage/schema';
import { worldLevels } from './levels';

/**
 * Accessory unlock positions: levels, worlds and key mastery. The accessories listed here are
 * dealt onto the positions at random per player (see `unlockRules`), fixed from the start.
 */
const BY_LEVEL: Record<string, string> = {
  'w1-1': 'cap', 'w1-2': 'sneakers', 'w1-3': 'round-glasses', 'w1-4': 'scarf',
  'w2-1': 'crown', 'w2-2': 'star-glasses', 'w2-3': 'bow-tie', 'w2-4': 'butterfly-wings',
  'w3-1': 'rain-boots', 'w3-2': 'knit-vest', 'w3-3': 'backpack', 'w3-4': 'explorer-vest',
  'w4-1': 'wand', 'w4-2': 'star-cape', 'w4-3': 'boots', 'w4-4': 'lantern',
  'w5-1': 'beanie', 'w5-2': 'neckerchief', 'w5-3': 'balloon', 'w5-4': 'hair-bow',
  'w8-2': 'raincoat',
};
/** By world index; the garden and the lake give none (the child already wears the flower wreath from the first world, the lake gives its lily). */
const BY_WORLD: Record<number, string> = {
  0: 'flower-wreath', 1: 'explorer-hat', 2: 'wizard-hat', 3: 'green-boots', 4: 'dragon-wings',
  5: 'hard-hat', 6: 'goggles', 7: 'umbrella', 8: 'jetpack', 9: 'antenna-band',
  11: 'feather', 13: 'harp', 14: 'fairy-wings',
};
const BY_MASTERY: [number, string][] = [[8, 'heart-glasses'], [16, 'star-shirt'], [24, 'pink-sneakers'], [32, 'sunglasses']];
/** Accessories a story scene names; they stay on their position for every player. */
export const STORY_ACCESSORIES = ['flower-wreath', 'umbrella', 'raincoat', 'feather', 'harp', 'fairy-wings'];

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

function shuffle<T>(list: T[], rng: Rng): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Which position gives which accessory for this player: story accessories fixed, the rest dealt by the seed. */
export function unlockRules(p: Profile): UnlockRule[] {
  const positions: UnlockRule[] = [
    ...Object.entries(BY_LEVEL).map(([id, acc]) => ({ acc, rule: { kind: 'level' as const, id } })),
    ...Object.entries(BY_WORLD).map(([world, acc]) => ({ acc, rule: { kind: 'world' as const, world: Number(world) } })),
    ...BY_MASTERY.map(([keys, acc]) => ({ acc, rule: { kind: 'mastery' as const, keys } })),
  ];
  // Its own stream, so the accessory deal does not depend on the character prices.
  const dealt = shuffle(positions.map((r) => r.acc).filter((a) => !STORY_ACCESSORIES.includes(a)), new Rng(p.seed ^ 0x9e3779b9));
  return positions.map((r) => (STORY_ACCESSORIES.includes(r.acc) ? r : { ...r, acc: dealt.pop()! }));
}

export function masteredCount(p: Profile): number {
  return p.progress.unlockedKeys.filter((k) => isMastered(p.stats.keys[k], p.settings.difficulty)).length;
}

export function hasAccessory(p: Profile, id: string): boolean {
  return p.progress.rewards.includes(`acc:${id}`);
}

/** Stars each next character kind costs on top of the previous one, at random per player. */
export const KIND_STEP: [number, number] = [18, 26];

export function totalStars(p: Profile): number {
  return Object.values(p.progress.levels).reduce((a, b) => a + b, 0);
}

/** Stars (summed over all levels) each kind needs for this player, in the order they are earned; the starting kind costs 0. */
export function kindPrices(p: Profile): [CompanionKind, number][] {
  const start = p.progress.companionsUnlocked[0] ?? p.companion.kind;
  const rng = new Rng(p.seed);
  const order = shuffle(COMPANION_KINDS.filter((k) => k !== start), rng);
  let stars = 0;
  return [[start, 0], ...order.map((k): [CompanionKind, number] => [k, (stars += rng.int(KIND_STEP[0], KIND_STEP[1]))])];
}

/** Stars a kind needs; 0 for the starting kind. */
export function friendStars(p: Profile, kind: CompanionKind): number {
  return kindPrices(p).find(([k]) => k === kind)?.[1] ?? 0;
}

export function hasCompanion(p: Profile, kind: CompanionKind): boolean {
  return p.progress.companionsUnlocked.includes(kind);
}

/** Grants every companion kind the stars reach; returns the new ones. */
export function grantCompanions(p: Profile): CompanionKind[] {
  const stars = totalStars(p);
  const fresh = kindPrices(p).filter(([k, need]) => !hasCompanion(p, k) && need <= stars).map(([k]) => k);
  p.progress.companionsUnlocked.push(...fresh);
  return fresh;
}

/** Grants every accessory whose rule is met; returns the newly unlocked ids. */
export function grantAccessories(p: Profile): string[] {
  const mastered = masteredCount(p);
  const fresh: string[] = [];
  for (const { acc, rule } of unlockRules(p)) {
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
