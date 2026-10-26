import { describe, expect, it } from 'vitest';
import { LEVELS } from '../game/levels';
import { WORLD_THINGS } from '../game/modes/aim-things';
import { lessonOrder } from '../learning/lessons';
import { fillProgress, randomFill, superProfile } from './super';

/** A repeatable random source. */
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

describe('service menu progress filling', () => {
  it('sets the keys and the finished worlds exactly', () => {
    const p = superProfile('sk');
    fillProgress(p, { keys: 12, lastWorld: 2, stars: 0.5, accuracy: 0.9, ranges: 0.5, allParrots: true }, seeded(1));
    expect(p.progress.unlockedKeys).toEqual(lessonOrder(p.layout).slice(0, 12));
    expect(p.progress.introducedKeys).toEqual(p.progress.unlockedKeys);
    expect(p.progress.worldsDone).toEqual([0, 1, 2]);
  });

  it('spreads the stars over the finished worlds, at least one per level', () => {
    const p = superProfile('sk');
    fillProgress(p, { keys: 20, lastWorld: 1, stars: 0.6, accuracy: 0.9, ranges: 0, allParrots: true }, seeded(2));
    const done = LEVELS.filter((l) => l.world <= 1);
    const stars = done.map((l) => p.progress.levels[l.id]);
    expect(stars.every((s) => s >= 1 && s <= 3)).toBe(true);
    expect(stars.reduce((a, b) => a + b, 0)).toBe(Math.round(0.6 * 3 * done.length));
    expect(LEVELS.filter((l) => l.world > 1).every((l) => p.progress.levels[l.id] === 0)).toBe(true);
    fillProgress(p, { keys: 20, lastWorld: 1, stars: 0, accuracy: 0.9, ranges: 0, allParrots: true }, seeded(2));
    expect(done.every((l) => p.progress.levels[l.id] === 1)).toBe(true);
  });

  it('gives each known key about the asked accuracy and collects the asked share of range finds', () => {
    const p = superProfile('sk');
    fillProgress(p, { keys: 10, lastWorld: 3, stars: 1, accuracy: 0.8, ranges: 0.5, allParrots: true }, seeded(3));
    const keys = Object.entries(p.stats.keys).filter(([k]) => p.progress.unlockedKeys.includes(k));
    expect(keys).toHaveLength(10);
    for (const [, s] of keys) expect(1 - s.errors / s.presses).toBeGreaterThanOrEqual(0.74);
    for (const [, s] of keys) expect(1 - s.errors / s.presses).toBeLessThanOrEqual(0.86);
    expect(p.stats.sessions).toHaveLength(1);
    const things = WORLD_THINGS.filter((th) => th.world! <= 3);
    expect(p.progress.rangeFinds).toHaveLength(Math.round(things.length / 2));
    expect(p.progress.rangeFinds.every((id) => things.some((th) => th.id === id))).toBe(true);
  });

  it('with no finished world leaves no stars and no finds', () => {
    const p = superProfile('sk');
    fillProgress(p, { keys: 3, lastWorld: -1, stars: 1, accuracy: 1, ranges: 1, allParrots: false }, seeded(4));
    expect(p.progress.worldsDone).toEqual([]);
    expect(Object.values(p.progress.levels).every((s) => s === 0)).toBe(true);
    expect(p.progress.rangeFinds).toEqual([]);
  });

  it("puts every finished world's parrot at home, or all but one", () => {
    const p = superProfile('sk');
    fillProgress(p, { keys: 10, lastWorld: 4, stars: 1, accuracy: 1, ranges: 0, allParrots: true }, seeded(5));
    expect(p.progress.parrots).toEqual([0, 1, 2, 3, 4]);
    fillProgress(p, { keys: 10, lastWorld: 4, stars: 1, accuracy: 1, ranges: 0, allParrots: false }, seeded(5));
    expect(p.progress.parrots).toHaveLength(4);
    expect(p.progress.parrots.every((w) => w <= 4)).toBe(true);
    expect(p.progress.parrotBest).toBe(4);
  });

  it('offers a random fill in the asked ranges, the one a new super player starts with', () => {
    for (let seed = 1; seed < 30; seed++) {
      const p = superProfile('sk', seeded(seed));
      const f = randomFill(p, seeded(seed + 100));
      expect(f.keys).toBe(lessonOrder(p.layout).length);
      expect(f.stars).toBeGreaterThanOrEqual(0.7);
      expect(f.stars).toBeLessThanOrEqual(0.95);
      expect(f.accuracy).toBeGreaterThanOrEqual(0.9);
      expect(f.ranges).toBeGreaterThanOrEqual(0.4);
      const done = LEVELS.filter((l) => p.progress.worldsDone.includes(l.world));
      const share = done.reduce((a, l) => a + p.progress.levels[l.id], 0) / (3 * done.length);
      expect(share).toBeGreaterThanOrEqual(0.69);
      expect(share).toBeLessThanOrEqual(0.96);
      expect(p.progress.parrots.length).toBeGreaterThanOrEqual(p.progress.worldsDone.length - 1);
    }
  });
});
