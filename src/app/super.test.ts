import { describe, expect, it } from 'vitest';
import { LEVELS, isLevelUnlocked, levelById, nextLevel } from '../game/levels';
import { completeSimulated } from '../game/progress';
import { newProfile } from '../storage/store';
import { SUPER_ID } from '../storage/schema';
import { openLevelFor, superProfile } from './super';

describe('service menu', () => {
  it('a simulated run keeps the statistics but saves the stars and the marks', () => {
    const p = newProfile('Ema', 'sk');
    const stats = JSON.stringify(p.stats);
    const totals = [p.progress.levelsFinished, p.progress.starsEarned, p.progress.trainedSeconds, p.progress.growthSeconds, p.progress.wardrobeSeconds];
    const r = completeSimulated(p, LEVELS[0], { accuracy: 0.97, chars: 60, errors: 2, cpm: 300, seconds: 40 });
    expect(r.stars).toBe(3);
    expect(r.growth).toBeNull();
    expect(r.trend).toBeNull();
    expect(p.progress.levels[LEVELS[0].id]).toBe(3);
    expect(p.progress.simulated).toEqual([LEVELS[0].id]);
    expect(p.serviced).toBe(true);
    expect(JSON.stringify(p.stats)).toBe(stats);
    expect([p.progress.levelsFinished, p.progress.starsEarned, p.progress.trainedSeconds, p.progress.growthSeconds, p.progress.wardrobeSeconds]).toEqual(totals);
    expect(isLevelUnlocked(p, LEVELS[1]) || LEVELS[1].world !== LEVELS[0].world).toBe(true);
  });

  it('a simulated super-obstacle finishes its world', () => {
    const p = newProfile('Ema', 'sk');
    const r = completeSimulated(p, levelById('w1-5')!, { accuracy: 1, chars: 20, errors: 0, cpm: 300, seconds: 10 });
    expect(r.worldDone).toBe(0);
    expect(p.progress.worldsDone).toEqual([0]);
  });

  it('opening a level makes it the next one and marks the account', () => {
    const p = newProfile('Ema', 'sk');
    const stats = JSON.stringify(p.stats);
    openLevelFor(p, 'w2-3');
    const target = levelById('w2-3')!;
    expect(isLevelUnlocked(p, target)).toBe(true);
    expect(nextLevel(p)?.id).toBe('w2-3');
    expect(p.progress.worldsDone).toEqual([0]);
    expect(p.progress.levels['w2-2']).toBe(1);
    expect(p.progress.simulated).toContain('w1-1');
    expect(p.progress.simulated).not.toContain('w2-3');
    expect(p.serviced).toBe(true);
    expect(p.progress.introducedKeys).toEqual(expect.arrayContaining(p.progress.unlockedKeys));
    expect(JSON.stringify(p.stats)).toBe(stats);
  });

  it('opens a level of a later story with the keys the story needs', () => {
    const p = newProfile('Ema', 'sk');
    openLevelFor(p, 'w6-2');
    expect(isLevelUnlocked(p, levelById('w6-2')!)).toBe(true);
    expect(p.progress.worldsDone).toEqual([]);
    expect(p.progress.levels['w6-1']).toBe(1);
  });

  it('keeps earlier stars and never marks the super player', () => {
    const p = newProfile('Ema', 'sk');
    p.progress.levels['w1-1'] = 3;
    openLevelFor(p, 'w1-3');
    expect(p.progress.levels['w1-1']).toBe(3);
    expect(p.progress.simulated).toEqual(['w1-2']);
    const s = superProfile('sk');
    expect(s.id).toBe(SUPER_ID);
    completeSimulated(s, LEVELS[0], { accuracy: 1, chars: 20, errors: 0, cpm: 300, seconds: 10 });
    expect(s.serviced).toBeUndefined();
    expect(s.progress.simulated).toEqual([]);
  });
});
