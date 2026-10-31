import { describe, expect, it } from 'vitest';
import { newProfile } from '../storage/store';
import { LEVELS, STORIES, journeyLevel, worldLevels } from './levels';
import { AUTO_DIFFICULTY_MAX, GROWTH_TYPED_SHARE, MIN_OWN_KEYS, completeLevel, completeStay, grow, growthNeed, joinRuns } from './progress';
import { COMPANION_KINDS } from '../storage/schema';
import { MAX_CHEST, MAX_STARS, STORY_ACCESSORIES, badgeTier, chestPoints, friendStars, grantAccessories, grantCompanions, kindPrices, unlockRules } from './rewards';

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
    expect(r).toMatchObject({ byTapko: false, stars: 3 });
    expect(p.progress.levels['w1-1']).toBe(3);
    expect(p.progress.growthSeconds).toBe(120);
  });
});

describe("a hero's journey", () => {
  it('joins its parts into one run: keys and time added up, accuracy of all keys, rhythm by typing time', () => {
    const r = joinRuns({ accuracy: 1, chars: 90, errors: 0, cpm: 60, seconds: 60 }, { accuracy: 0.5, chars: 10, errors: 10, cpm: 120, seconds: 30 });
    expect(r).toEqual({ accuracy: 100 / 110, chars: 100, errors: 10, cpm: 80, seconds: 90 });
  });

  it('keeps its best stars under its own id with the stricter steps, and is no level of its world', () => {
    const p = newProfile('Ema', 'sk');
    p.progress.worldsDone = [0, 1, 2, 3, 4];
    const last = journeyLevel(STORIES[0], 4);
    const run = { chars: 97, errors: 3, cpm: 60, seconds: 240 };
    const r = completeLevel(p, last, { ...run, accuracy: 0.97 }, 1);
    expect(r).toMatchObject({ stars: 2, shownStars: 2.5, worldDone: null, badge: null });
    expect(p.progress.levels['journey-dragon']).toBe(2);
    expect(p.progress.levelsFinished).toBe(1);
    completeLevel(p, last, { ...run, accuracy: 0.9 }, 1);
    expect(p.progress.levels['journey-dragon']).toBe(2);
    expect(p.progress.worldsDone).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('characters earned by stars', () => {
  it('prices the kinds per player: start free, then 18-26 stars a step', () => {
    for (const name of ['Ema', 'Jano', 'Zuzka', 'Ondrej', 'Guest']) {
      const p = newProfile(name, 'sk', undefined, 'cat');
      const prices = kindPrices(p);
      expect(prices[0]).toEqual(['cat', 0]);
      expect(prices.map(([k]) => k).sort()).toEqual([...COMPANION_KINDS].sort());
      for (let i = 1; i < prices.length; i++) {
        const step = prices[i][1] - prices[i - 1][1];
        expect(step).toBeGreaterThanOrEqual(18);
        expect(step).toBeLessThanOrEqual(26);
      }
      expect(prices[prices.length - 1][1]).toBeLessThanOrEqual(208);
      expect(friendStars(p, 'cat')).toBe(0);
    }
  });

  it('gives the same name the same prices and other names other ones', () => {
    expect(kindPrices(newProfile('Ema', 'sk'))).toEqual(kindPrices(newProfile(' ema', 'en')));
    expect(kindPrices(newProfile('Ema', 'sk'))).not.toEqual(kindPrices(newProfile('Jano', 'sk')));
  });

  it('unlocks the kinds the stars reach', () => {
    const p = newProfile('Ema', 'sk', undefined, 'cat');
    const [, [first, need]] = kindPrices(p);
    p.progress.levels = { x: need - 1 };
    expect(grantCompanions(p)).toEqual([]);
    p.progress.levels = { x: need };
    expect(grantCompanions(p)).toEqual([first]);
    expect(p.progress.companionsUnlocked).toEqual(['cat', first]);
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
});

describe('world badges', () => {
  const run = { accuracy: 0.9, chars: 100, errors: 10, cpm: 60, seconds: 120 };
  const perfect = { ...run, accuracy: 1, errors: 0 };

  it('is earned with the world and grows with its stars', () => {
    const p = newProfile('Ema', 'sk');
    const [l1, l2, l3, l4, gate] = worldLevels(0);
    for (const l of [l1, l2, l3, l4]) expect(completeLevel(p, l, run, 1).badge).toBeNull();
    expect(badgeTier(p, 0)).toBeNull();
    expect(completeLevel(p, gate, run, 1).badge).toEqual({ world: 0, tier: 'bronze', upgrade: false });
    // 10 stars: still bronze; 12 make it silver.
    expect(completeLevel(p, l1, perfect, 1).badge).toBeNull();
    expect(completeLevel(p, l2, perfect, 1).badge).toEqual({ world: 0, tier: 'silver', upgrade: true });
    for (const l of [l3, l4]) completeLevel(p, l, perfect, 1);
    expect(completeLevel(p, gate, perfect, 1).badge).toEqual({ world: 0, tier: 'gold', upgrade: true });
    expect(completeLevel(p, gate, perfect, 1).badge).toBeNull();
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
    expect(MAX_STARS).toBe(234);
    expect(MAX_CHEST).toBe(67);
  });

  it('counts a badge by its tier and a range find as one point', () => {
    const p = newProfile('Ema', 'sk');
    p.progress.worldsDone = [0, 1, 2];
    for (const l of worldLevels(0)) p.progress.levels[l.id] = 3;
    for (const l of worldLevels(1)) p.progress.levels[l.id] = 2;
    p.progress.rangeFinds = ['crown'];
    // Gold 3 + bronze 1 (10 stars) + bronze 1 (no stars) + one find.
    expect(chestPoints(p)).toBe(6);
  });

  it('adds seven points while every finished world has its parrot', () => {
    const p = newProfile('Ema', 'sk');
    p.progress.worldsDone = [0];
    p.progress.parrots = [0];
    // Bronze 1 + the Parrot badge 7.
    expect(chestPoints(p)).toBe(8);
    p.progress.worldsDone.push(1);
    expect(chestPoints(p)).toBe(2);
  });
});
