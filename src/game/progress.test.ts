import { describe, expect, it } from 'vitest';
import { newProfile } from '../storage/store';
import { LEVELS, worldLevels } from './levels';
import { AUTO_DIFFICULTY_MAX, GROWTH_TYPED_SHARE, MIN_OWN_KEYS, completeLevel, grow, growthNeed } from './progress';
import { STARS_PER_FRIEND, badgeTier, friendStars, grantCompanions } from './rewards';

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

describe('a level Tapko typed for the child', () => {
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

describe('companions earned by stars', () => {
  it('unlocks one kind every 6 stars, skipping the starting kind', () => {
    const p = newProfile('Ema', 'sk', undefined, 'cat');
    p.progress.levels = { 'w1-1': 3, 'w1-2': 2 };
    expect(grantCompanions(p)).toEqual([]);
    expect(friendStars(p, 'bunny')).toBe(STARS_PER_FRIEND);
    p.progress.levels['w1-3'] = 3;
    p.progress.levels['w1-4'] = 3;
    p.progress.levels['w2-1'] = 1;
    expect(grantCompanions(p)).toEqual(['bunny', 'owl']);
    expect(p.progress.companionsUnlocked).toEqual(['cat', 'bunny', 'owl']);
    expect(friendStars(p, 'fox')).toBe(8 * STARS_PER_FRIEND);
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
