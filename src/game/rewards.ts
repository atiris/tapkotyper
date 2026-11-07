import { Rng } from '../engine/rng';
import { accessories, type Slot } from '../gfx/assets';
import { SLOTS, randomItem } from '../gfx/tapko';
import { keyMastery, practiceOrder } from '../learning/lessons';
import { COMPANION_KINDS, type CompanionKind, type Profile } from '../storage/schema';
import { LEVELS, MAX_LEVEL_STARS, WORLDS, worldLevels } from './levels';
import { WORLD_THINGS } from './modes/aim-things';
import { PARROT_POINTS, hasParrotBadge } from './parrots';

/**
 * Accessory unlock positions: levels, worlds and the stars earned in all. The accessories listed here are
 * dealt onto the positions at random per player (see `unlockRules`), fixed from the start.
 */
const BY_LEVEL: Record<string, string> = {
  'w1-1': 'cap', 'w1-2': 'sneakers', 'w1-3': 'round-glasses', 'w1-4': 'scarf',
  'w2-1': 'crown', 'w2-2': 'star-glasses', 'w2-3': 'bow-tie', 'w2-4': 'butterfly-wings',
  'w3-1': 'rain-boots', 'w3-2': 'knit-vest', 'w3-3': 'backpack', 'w3-4': 'explorer-vest',
  'w4-1': 'wand', 'w4-2': 'star-cape', 'w4-3': 'boots', 'w4-4': 'lantern',
  'w5-1': 'beanie', 'w5-2': 'neckerchief', 'w5-3': 'balloon', 'w5-4': 'hair-bow',
  'w6-2': 'hero-cape', 'w7-2': 'chain', 'w8-2': 'raincoat', 'w9-2': 'medallion', 'w10-2': 'hair-clip',
  'w11-2': 'walking-stick', 'w12-2': 'white-gloves', 'w13-2': 'black-gloves', 'w14-2': 'eye-mask', 'w15-2': 'carnival-mask',
};
/** By world index; the garden and the lake give none (the child already wears the flower wreath from the first world, the lake gives its lily). */
const BY_WORLD: Record<number, string> = {
  0: 'flower-wreath', 1: 'explorer-hat', 2: 'wizard-hat', 3: 'green-boots', 4: 'dragon-wings',
  5: 'hard-hat', 6: 'goggles', 7: 'umbrella', 8: 'jetpack', 9: 'antenna-band',
  11: 'feather', 13: 'harp', 14: 'fairy-wings',
};
/** Level positions that also open with this many worlds whose every level has all its stars, whichever comes first. */
const BY_PERFECT: Record<string, number> = { 'w13-2': 1, 'w14-2': 2, 'w15-2': 3 };
/** Positions by the stars earned in all (`starsEarned`, replays add), as shares of all story levels' stars. */
const BY_STARS: [number, string][] = [[0.5, 'heart-glasses'], [0.9, 'star-shirt'], [1.2, 'pink-sneakers'], [1.5, 'sunglasses']];
/** Accessories a story scene names; they stay on their position for every player. */
export const STORY_ACCESSORIES = ['flower-wreath', 'umbrella', 'raincoat', 'feather', 'harp', 'fairy-wings'];

/** Story rewards per world. */
export const WORLD_REWARDS = ['invitation', 'landing', 'force', 'egg', 'hatched', 'friends', 'legs', 'raincoat', 'key', 'home', 'wreath', 'feather', 'lily', 'harp', 'wings'];

/** A world's badge: the world done and enough of its stars; a done world with fewer stars has none yet. */
export type BadgeTier = 'bronze' | 'silver' | 'gold';
/** World stars (of 5 levels x 5) for each badge, worst first. */
export const BADGE_STARS: Record<BadgeTier, number> = { bronze: 10, silver: 15, gold: 20 };

/** The most stars one world gives. */
export const MAX_WORLD_STARS = Math.max(...WORLDS.map((_, w) => worldLevels(w).length)) * MAX_LEVEL_STARS;

export function worldStars(p: Profile, world: number): number {
  return worldLevels(world).reduce((a, l) => a + (p.progress.levels[l.id] ?? 0), 0);
}

/** The badge of a world, null until the world is done with at least the bronze stars. */
export function badgeTier(p: Profile, world: number): BadgeTier | null {
  if (!p.progress.worldsDone.includes(world)) return null;
  const stars = worldStars(p, world);
  return stars >= BADGE_STARS.gold ? 'gold' : stars >= BADGE_STARS.silver ? 'silver' : stars >= BADGE_STARS.bronze ? 'bronze' : null;
}

export interface UnlockRule {
  acc: string;
  rule: { kind: 'level'; id: string; perfect?: number } | { kind: 'world'; world: number } | { kind: 'stars'; stars: number };
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
    ...Object.entries(BY_LEVEL).map(([id, acc]) => ({ acc, rule: { kind: 'level' as const, id, ...(BY_PERFECT[id] ? { perfect: BY_PERFECT[id] } : {}) } })),
    ...Object.entries(BY_WORLD).map(([world, acc]) => ({ acc, rule: { kind: 'world' as const, world: Number(world) } })),
    ...BY_STARS.map(([share, acc]) => ({ acc, rule: { kind: 'stars' as const, stars: Math.round(share * LEVEL_STARS) } })),
  ];
  // Its own stream, so the accessory deal does not depend on the character prices.
  const dealt = shuffle(positions.map((r) => r.acc).filter((a) => !STORY_ACCESSORIES.includes(a)), new Rng(p.seed ^ 0x9e3779b9));
  return positions.map((r) => (STORY_ACCESSORIES.includes(r.acc) ? r : { ...r, acc: dealt.pop()! }));
}

/** All stars of the story levels, the most "My progress" shows; the journeys' stars are a bonus outside it. */
export const LEVEL_STARS = LEVELS.length * MAX_LEVEL_STARS;

/** Worlds whose every level has all its stars. */
export function perfectWorlds(p: Profile): number {
  return WORLDS.filter((_, w) => worldLevels(w).every((l) => (p.progress.levels[l.id] ?? 0) >= MAX_LEVEL_STARS)).length;
}

export function hasAccessory(p: Profile, id: string): boolean {
  return p.progress.rewards.includes(`acc:${id}`);
}

/** Stars each next character kind costs on top of the previous one, at random per player. */
export const KIND_STEP: [number, number] = [30, 43];

/**
 * The best stars of the built-in story levels, out of `LEVEL_STARS`; stars kept under any other id
 * (a hero's journey too) do not count here. The journeys' stars count among the stars earned since the
 * start (`starsEarned`).
 */
export function totalStars(p: Profile): number {
  return LEVELS.reduce((a, l) => a + (p.progress.levels[l.id] ?? 0), 0);
}

/** Points of the treasure chest: a world badge by its tier, one for each rare thing found at a range, and the Parrot badge. */
export const BADGE_POINTS: Record<BadgeTier, number> = { bronze: 1, silver: 2, gold: 3 };
export const MAX_CHEST = WORLDS.length * BADGE_POINTS.gold + WORLD_THINGS.length + PARROT_POINTS;

export function chestPoints(p: Profile): number {
  const badges = WORLDS.reduce((a, _, w) => {
    const tier = badgeTier(p, w);
    return a + (tier ? BADGE_POINTS[tier] : 0);
  }, 0);
  return badges + WORLD_THINGS.filter((th) => p.progress.rangeFinds.includes(th.id)).length + (hasParrotBadge(p) ? PARROT_POINTS : 0);
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
  const perfect = perfectWorlds(p);
  const fresh: string[] = [];
  for (const { acc, rule } of unlockRules(p)) {
    if (hasAccessory(p, acc)) continue;
    const ok = rule.kind === 'level' ? (p.progress.levels[rule.id] ?? 0) > 0 || (!!rule.perfect && perfect >= rule.perfect)
      : rule.kind === 'world' ? p.progress.worldsDone.includes(rule.world)
      : p.progress.starsEarned >= rule.stars;
    if (ok) {
      p.progress.rewards.push(`acc:${acc}`);
      fresh.push(acc);
    }
  }
  return fresh;
}

/** The random character opens with this many stars earned in all: a fifth of all stars of the levels and journeys. */
export const RANDOM_KIND_STARS = Math.round(LEVEL_STARS / 5);
/** The random choice of the body areas opens step by step up to this share of the practice order's keys mastered. */
const RANDOM_SLOTS_SHARE = 0.9;

export function randomKindOpen(p: Profile): boolean {
  return p.progress.starsEarned >= RANDOM_KIND_STARS;
}

/** Mastered keys each body area's random choice opens at: even steps up to 0.9 of the practice order, dealt to the areas by the player's seed. */
export function randomSlotKeys(p: Profile): Record<Slot, number> {
  const max = Math.round(RANDOM_SLOTS_SHARE * practiceOrder(p).length);
  const steps = shuffle(SLOTS.map((_, i) => Math.round((max * (i + 1)) / SLOTS.length)), new Rng(p.seed ^ 0x5bd1e995));
  return Object.fromEntries(SLOTS.map((slot, i) => [slot, steps[i]])) as Record<Slot, number>;
}

/** Keys of the practice order the child masters. */
export function masteredKeys(p: Profile): number {
  return practiceOrder(p).filter((k) => keyMastery(p, k)).length;
}

export function randomSlotOpen(p: Profile, slot: Slot): boolean {
  return masteredKeys(p) >= randomSlotKeys(p)[slot];
}

/**
 * Dresses the character for a mission (a story level or a hero's journey) into `world`: a random owned character when
 * its random choice is on and the world is another than last time, a random owned item or none for every body area whose
 * random choice is on. Areas without it keep what the child picked.
 */
export function dressForMission(p: Profile, world: number, rand: () => number = Math.random): void {
  const c = p.companion;
  if (c.randomKind && randomKindOpen(p) && world !== p.progress.missionWorld) {
    const others = p.progress.companionsUnlocked.filter((k) => k !== c.kind);
    if (others.length) c.kind = p.avatar = others[Math.floor(rand() * others.length)];
  }
  p.progress.missionWorld = world;
  const slotOf = (id: string) => accessories().find((a) => a.id === id)?.slot;
  for (const slot of SLOTS) {
    if (!c.randomSlots.includes(slot) || !randomSlotOpen(p, slot)) continue;
    c.accessories = [...c.accessories.filter((id) => slotOf(id) !== slot), ...randomItem(slot, (id) => hasAccessory(p, id), rand)];
  }
}
