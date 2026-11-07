import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { newProfile } from '../storage/store';
import { LEVELS, STORIES, journeyLevel, worldLevels } from './levels';
import { AUTO_DIFFICULTY_MAX, GROWTH_TYPED_SHARE, MIN_OWN_KEYS, completeLevel, completePlacement, completeStay, grow, growthNeed, joinRuns } from './progress';
import { COMPANION_KINDS, emptyKeyStat } from '../storage/schema';
import { PlacementCheck } from '../learning/placement';
import { KIND_STEP, LEVEL_STARS, MAX_CHEST, MAX_STARS, RANDOM_KIND_STARS, STORY_ACCESSORIES, badgeTier, chestPoints, dressForMission, friendStars, grantAccessories, grantCompanions, hasAccessory, kindPrices, perfectWorlds, randomKindOpen, randomSlotKeys, totalStars, unlockRules } from './rewards';
import { accessories, loadManifest } from '../gfx/assets';
import { SLOTS } from '../gfx/tapko';
import { practiceOrder } from '../learning/lessons';

describe('automatic growth', () => {
  it('steps up after enough good play, difficulty and word length in turn', () => {
    const p = newProfile('Ema', 'sk');
    expect(grow(p, growthNeed(0) - 1, 1, 1)).toBeNull();
    expect(grow(p, 1, 1, 1)).toEqual({ kind: 'difficulty', value: 4, medal: 1 });
    expect(grow(p, growthNeed(1), 0.95, 1)).toEqual({ kind: 'wordLen', value: 7, medal: 2 });
    expect(p.settings.wordLen).toEqual([3, 7]);
  });

  it('ignores inaccurate play and settings a parent fixed', () => {
    const p = newProfile('Ema', 'sk');
    expect(grow(p, 999, 0.7, 1)).toBeNull();
    expect(p.progress.growthSeconds).toBe(0);
    p.settings.autoDifficulty = false;
    expect(grow(p, 999, 1, 1)?.kind).toBe('wordLen');
    expect(p.settings.difficulty).toBe(3);
  });

  it('adds no time when too many targets passed by untyped', () => {
    const p = newProfile('Ema', 'sk');
    expect(grow(p, 999, 1, GROWTH_TYPED_SHARE - 0.01)).toBeNull();
    expect(p.progress.growthSeconds).toBe(0);
    expect(grow(p, 60, 1, GROWTH_TYPED_SHARE)).toBeNull();
    expect(p.progress.growthSeconds).toBe(60);
  });

  it('stops at the automatic maximum', () => {
    const p = newProfile('Ema', 'sk');
    p.settings.autoWordLen = false;
    p.settings.difficulty = AUTO_DIFFICULTY_MAX;
    expect(grow(p, 9999, 1, 1)).toBeNull();
  });
});

describe('a level the paw typed for the child', () => {
  const run = { accuracy: 1, errors: 0, cpm: 60, seconds: 120 };

  it('earns one star, keeps a better best and adds no growth time', () => {
    const p = newProfile('Ema', 'sk');
    p.progress.levels['w1-1'] = 3;
    const r = completeLevel(p, LEVELS[0], { ...run, chars: MIN_OWN_KEYS - 1 }, 1);
    expect(r).toMatchObject({ byTapko: true, stars: 1, growth: null });
    expect(p.progress.levels['w1-1']).toBe(3);
    expect(p.progress.growthSeconds).toBe(0);
  });

  it('counts the level normally once the child typed enough keys', () => {
    const p = newProfile('Ema', 'sk');
    const r = completeLevel(p, LEVELS[0], { ...run, chars: MIN_OWN_KEYS }, 1);
    expect(r).toMatchObject({ byTapko: false, stars: 5 });
    expect(p.progress.levels['w1-1']).toBe(5);
    expect(p.progress.growthSeconds).toBe(120);
  });
});

describe("a hero's journey", () => {
  it('joins its parts into one run: keys and time added up, accuracy of all keys, speed by typing time', () => {
    const r = joinRuns({ accuracy: 1, chars: 90, errors: 0, cpm: 60, seconds: 60 }, { accuracy: 0.5, chars: 10, errors: 10, cpm: 120, seconds: 30 });
    expect(r).toEqual({ accuracy: 100 / 110, chars: 100, errors: 10, cpm: 80, seconds: 90 });
  });

  it('keeps its best stars under its own id with the stricter steps, and is no level of its world', () => {
    const p = newProfile('Ema', 'sk');
    p.progress.worldsDone = [0, 1, 2, 3, 4];
    const last = journeyLevel(STORIES[0], 4);
    const run = { chars: 97, errors: 3, cpm: 60, seconds: 240 };
    const r = completeLevel(p, last, { ...run, accuracy: 0.97 }, 1);
    expect(r).toMatchObject({ stars: 3, worldDone: null, badge: null });
    expect(p.progress.levels['journey-dragon']).toBe(3);
    expect(p.progress.levelsFinished).toBe(1);
    completeLevel(p, last, { ...run, accuracy: 0.9 }, 1);
    expect(p.progress.levels['journey-dragon']).toBe(3);
    expect(p.progress.worldsDone).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('characters earned by stars', () => {
  it('prices the kinds per player: start free, then 30-43 stars a step', () => {
    for (const name of ['Ema', 'Jano', 'Zuzka', 'Ondrej', 'Guest']) {
      const p = newProfile(name, 'sk', undefined, 'cat');
      const prices = kindPrices(p);
      expect(prices[0]).toEqual(['cat', 0]);
      expect(prices.map(([k]) => k).sort()).toEqual([...COMPANION_KINDS].sort());
      for (let i = 1; i < prices.length; i++) {
        const step = prices[i][1] - prices[i - 1][1];
        expect(step).toBeGreaterThanOrEqual(KIND_STEP[0]);
        expect(step).toBeLessThanOrEqual(KIND_STEP[1]);
      }
      expect(prices[prices.length - 1][1]).toBeLessThanOrEqual(MAX_STARS);
      expect(friendStars(p, 'cat')).toBe(0);
    }
  });

  it('gives the same name the same prices and other names other ones', () => {
    expect(kindPrices(newProfile('Ema', 'sk'))).toEqual(kindPrices(newProfile(' ema', 'en')));
    expect(kindPrices(newProfile('Ema', 'sk'))).not.toEqual(kindPrices(newProfile('Jano', 'sk')));
  });

  /** `n` stars over the first story levels, five each. */
  const starsIn = (n: number): Record<string, number> =>
    Object.fromEntries(LEVELS.slice(0, Math.ceil(n / 5)).map((l, i) => [l.id, Math.min(5, n - i * 5)]));

  it('unlocks the kinds the stars reach', () => {
    const p = newProfile('Ema', 'sk', undefined, 'cat');
    const [, [first, need]] = kindPrices(p);
    p.progress.levels = starsIn(need - 1);
    expect(grantCompanions(p)).toEqual([]);
    p.progress.levels = starsIn(need);
    expect(grantCompanions(p)).toEqual([first]);
    expect(p.progress.companionsUnlocked).toEqual(['cat', first]);
  });

  it('counts only the built-in levels and journeys', () => {
    const p = newProfile('Ema', 'sk', undefined, 'cat');
    const [, [, need]] = kindPrices(p);
    p.progress.levels = { 'journey-dragon': 3, 'pack:x:w1-1': need };
    expect(totalStars(p)).toBe(3);
    expect(grantCompanions(p)).toEqual([]);
  });
});

describe('accessories dealt per player', () => {
  const deal = (name: string) => unlockRules(newProfile(name, 'sk'));
  const at = (name: string, acc: string) => deal(name).find((r) => r.acc === acc)?.rule;

  it('deals every accessory exactly once with the story ones in place', () => {
    const base = deal('Ema').map((r) => r.acc).sort();
    expect(new Set(base).size).toBe(base.length);
    for (const name of ['Jano', 'Zuzka']) {
      expect(deal(name).map((r) => r.acc).sort()).toEqual(base);
      for (const acc of STORY_ACCESSORIES) expect(base).toContain(acc);
      expect(at(name, 'raincoat')).toEqual({ kind: 'level', id: 'w8-2' });
      expect(at(name, 'flower-wreath')).toEqual({ kind: 'world', world: 0 });
      expect(at(name, 'umbrella')).toEqual({ kind: 'world', world: 7 });
      expect(at(name, 'feather')).toEqual({ kind: 'world', world: 11 });
      expect(at(name, 'harp')).toEqual({ kind: 'world', world: 13 });
      expect(at(name, 'fairy-wings')).toEqual({ kind: 'world', world: 14 });
    }
  });

  it('gives the same name the same deal and other names other ones', () => {
    expect(deal('Ema')).toEqual(deal('EMA'));
    expect(deal('Ema')).not.toEqual(deal('Jano'));
  });

  it('grants the accessory dealt on a finished level', () => {
    const p = newProfile('Jano', 'sk');
    p.progress.levels['w1-1'] = 2;
    expect(grantAccessories(p)).toEqual([unlockRules(p).find((r) => r.rule.kind === 'level' && r.rule.id === 'w1-1')!.acc]);
  });

  it('grants four accessories by the stars earned in all: 50, 90, 120 and 150 % of the levels\' stars', () => {
    const p = newProfile('Jano', 'sk');
    const stars = unlockRules(p).filter((r) => r.rule.kind === 'stars').map((r) => r.rule.kind === 'stars' ? r.rule.stars : 0);
    expect(stars).toEqual([0.5, 0.9, 1.2, 1.5].map((s) => Math.round(s * LEVEL_STARS)));
    p.progress.starsEarned = stars[1];
    expect(grantAccessories(p)).toHaveLength(2);
  });

  it('opens the fairy levels\' accessories also by 1, 2 and 3 worlds with every star', () => {
    const p = newProfile('Jano', 'sk');
    const perfect = unlockRules(p).filter((r) => r.rule.kind === 'level' && r.rule.perfect);
    expect(perfect.map((r) => r.rule)).toEqual([{ kind: 'level', id: 'w13-2', perfect: 1 }, { kind: 'level', id: 'w14-2', perfect: 2 }, { kind: 'level', id: 'w15-2', perfect: 3 }]);
    for (const l of worldLevels(0)) p.progress.levels[l.id] = 5;
    expect(perfectWorlds(p)).toBe(1);
    expect(grantAccessories(p)).toContain(perfect[0].acc);
    expect(hasAccessory(p, perfect[1].acc)).toBe(false);
  });
});

describe('random outfit on a mission', () => {
  beforeAll(async () => {
    const manifest = readFileSync('public/assets/manifest.json', 'utf8');
    vi.stubGlobal('fetch', async () => new Response(manifest));
    await loadManifest();
    vi.unstubAllGlobals();
  });

  /** A player who earned the random character and masters every key, with two characters and the given items. */
  const player = () => {
    const p = newProfile('Jano', 'sk');
    p.progress.starsEarned = RANDOM_KIND_STARS;
    p.progress.companionsUnlocked = ['fox', 'cat'];
    for (const k of practiceOrder(p)) p.stats.keys[k] = { ...emptyKeyStat(), presses: 100, recent: Array(100).fill(500) };
    return p;
  };

  it('spreads the areas\' key steps evenly up to 0.9 of the practice order, one per area', () => {
    const p = newProfile('Jano', 'sk');
    const max = Math.round(0.9 * practiceOrder(p).length);
    expect(Object.values(randomSlotKeys(p)).sort((a, b) => a - b)).toEqual(SLOTS.map((_, i) => Math.round((max * (i + 1)) / SLOTS.length)));
    expect(randomKindOpen(p)).toBe(false);
  });

  it('changes the character only when the mission goes to another world', () => {
    const p = player();
    p.companion.randomKind = true;
    dressForMission(p, 0);
    expect(p.companion.kind).toBe('cat');
    dressForMission(p, 0);
    expect(p.companion.kind).toBe('cat');
    dressForMission(p, 1);
    expect(p.companion.kind).toBe('fox');
    expect(p.progress.missionWorld).toBe(1);
  });

  it('picks each random area anew and leaves the others as chosen', () => {
    const p = player();
    const head = accessories().find((a) => a.slot === 'head')!.id, eyes = accessories().find((a) => a.slot === 'eyes')!.id;
    p.progress.rewards.push(`acc:${head}`, `acc:${eyes}`);
    p.companion.accessories = [eyes];
    p.companion.randomSlots = ['head'];
    dressForMission(p, 0, () => 0.9);
    expect(p.companion.accessories.sort()).toEqual([eyes, head].sort());
    dressForMission(p, 0, () => 0.1);
    expect(p.companion.accessories).toEqual([eyes]);
    expect(p.companion.kind).toBe('fox');
  });
});

describe('world badges', () => {
  const run = { accuracy: 0.9, chars: 100, errors: 10, cpm: 60, seconds: 120 };
  const perfect = { ...run, accuracy: 1, errors: 0 };

  it('needs the world done and 10, 15 or 20 of its stars', () => {
    const p = newProfile('Ema', 'sk');
    const [l1, l2, l3, l4, gate] = worldLevels(0);
    // 90 % gives 2 stars: the world is done with 10 stars, just bronze.
    for (const l of [l1, l2, l3, l4]) expect(completeLevel(p, l, run, 1).badge).toBeNull();
    expect(badgeTier(p, 0)).toBeNull();
    expect(completeLevel(p, gate, run, 1).badge).toEqual({ world: 0, tier: 'bronze', upgrade: false });
    // 13 and 16 stars: a replay of any level of the done world makes the badge better.
    expect(completeLevel(p, l1, perfect, 1).badge).toBeNull();
    expect(completeLevel(p, l2, perfect, 1).badge).toEqual({ world: 0, tier: 'silver', upgrade: true });
    completeLevel(p, l3, perfect, 1);
    expect(completeLevel(p, l4, perfect, 1).badge).toEqual({ world: 0, tier: 'gold', upgrade: true });
    expect(completeLevel(p, gate, perfect, 1).badge).toBeNull();
  });

  it('gives a done world with fewer than 10 stars no badge, until a replay brings them', () => {
    const p = newProfile('Ema', 'sk');
    const poor = { ...run, accuracy: 0.5, errors: 100 };
    const [l1, , , , gate] = worldLevels(0);
    for (const l of worldLevels(0)) completeLevel(p, l, poor, 1);
    expect(p.progress.worldsDone).toEqual([0]);
    expect(badgeTier(p, 0)).toBeNull();
    expect(completeLevel(p, l1, perfect, 1).badge).toBeNull();
    expect(completeLevel(p, gate, perfect, 1).badge).toEqual({ world: 0, tier: 'bronze', upgrade: false });
  });
});

describe('staying a while', () => {
  it('gives no stars, level result or rewards, but keeps the play time for growth', () => {
    const p = newProfile('Ema', 'sk');
    const before = JSON.stringify(p.progress.levels);
    const r = completeStay(p, { accuracy: 1, chars: 400, errors: 0, cpm: 80, seconds: 300 }, 1);
    expect(r.stars).toBe(0);
    expect(r.worldDone).toBeNull();
    expect(r.badge).toBeNull();
    expect(r.newAccessories).toEqual([]);
    expect(JSON.stringify(p.progress.levels)).toBe(before);
    expect(p.progress.levelsFinished).toBe(0);
    expect(p.progress.starsEarned).toBe(0);
    expect(r.growth?.kind).toBe('difficulty');
  });
});

describe('the treasure chest and the stars of My progress', () => {
  // These maxima are shown to the player; a new level, world or range thing changes them on purpose.
  it('has fixed maxima', () => {
    expect(MAX_STARS).toBe(390);
    expect(MAX_CHEST).toBe(67);
  });

  it('counts a badge by its tier and a range find as one point', () => {
    const p = newProfile('Ema', 'sk');
    p.progress.worldsDone = [0, 1, 2];
    for (const l of worldLevels(0)) p.progress.levels[l.id] = 4;
    for (const l of worldLevels(1)) p.progress.levels[l.id] = 2;
    p.progress.rangeFinds = ['crown'];
    // Gold 3 (20 stars) + bronze 1 (10 stars) + no badge (no stars) + one find.
    expect(chestPoints(p)).toBe(5);
  });

  it('adds seven points while every finished world has its parrot', () => {
    const p = newProfile('Ema', 'sk');
    p.progress.worldsDone = [0];
    p.progress.parrots = [0];
    for (const l of worldLevels(0)) p.progress.levels[l.id] = 2;
    // Bronze 1 + the Parrot badge 7.
    expect(chestPoints(p)).toBe(8);
    p.progress.worldsDone.push(1);
    expect(chestPoints(p)).toBe(1);
  });
});

describe('placement check result', () => {
  const run = { accuracy: 1, chars: 100, errors: 0, cpm: 200, seconds: 60 };

  /** A check whose keys of the first `n` stages passed (or the keys `passed`), with presses of `rt` ms. */
  const check = (n: number, rt: number, end: PlacementCheck['end'] = 'misses', passed?: string[]) => {
    const c = new PlacementCheck('sk-qwertz', false, 3);
    for (let i = 0; i < 30; i++) c.press({ ch: 'f', ok: true, rt, at: i, target: 1, pos: 1 });
    c.passed.push(...(passed ?? c.groups.slice(0, n).flat()));
    c.end = end;
    return c;
  };

  it('unlocks the keys of the passed stages and raises the automatic difficulty', () => {
    const p = newProfile('Ema', 'sk');
    const r = completePlacement(p, check(4, 600), run);
    expect(p.progress.unlockedKeys).toEqual(['f', 'j', ' ', 'd', 'k', 's', 'l', 'a', 'ô']);
    expect(r.newKeys).toEqual(['d', 'k', 's', 'l', 'a', 'ô']);
    expect(p.progress.introducedKeys).toEqual(p.progress.unlockedKeys);
    expect(p.progress.placementKeys).toBe(9);
    expect(p.settings.difficulty).toBe(AUTO_DIFFICULTY_MAX);
    expect(r.stars).toBe(0);
    expect(p.progress.levelsFinished).toBe(0);
  });

  it('never takes keys away and changes nothing when the signal failed', () => {
    const p = newProfile('Ema', 'sk');
    completePlacement(p, check(4, 600), run);
    const r = completePlacement(p, check(2, 600), run);
    expect(r.newKeys).toEqual([]);
    // Only the first stage, the keys every new player has: nothing changes.
    const q = newProfile('Ema', 'sk');
    completePlacement(q, check(1, 300), run);
    expect([q.progress.placementKeys, q.settings.difficulty]).toEqual([0, 3]);
    expect(p.progress.unlockedKeys.length).toBe(9);
    expect(p.progress.placementKeys).toBe(9);
    completePlacement(p, check(10, 300, 'signal'), run);
    expect(p.progress.placementKeys).toBe(9);
    p.settings.difficulty = 4;
    p.settings.autoDifficulty = false;
    completePlacement(p, check(6, 300), run);
    expect(p.settings.difficulty).toBe(4);
  });

  it('unlocks the passed keys also after a failed one, in lesson order', () => {
    const p = newProfile('Ema', 'sk');
    const r = completePlacement(p, check(0, 600, 'misses', ['f', 'j', ' ', 's', 'l', 'g']), run);
    expect(r.newKeys).toEqual(['s', 'l', 'g']);
    expect(p.progress.unlockedKeys).toEqual(['f', 'j', ' ', 's', 'l', 'g']);
    expect(p.progress.introducedKeys).toEqual(p.progress.unlockedKeys);
    expect(p.progress.placementKeys).toBe(6);
  });
});
