import { describe, expect, it } from 'vitest';
import { newProfile } from '../storage/store';
import { SUPER_ID } from '../storage/schema';
import { lessonOrder } from '../learning/lessons';
import { LEVELS, MIN_ACTIVE_S, STORIES, activityOf, minActiveS, aimLevel, aimOpen, aimWorld, freeTypeLevel, grownCount, hasMinLength, isLevelUnlocked, isWorldUnlocked, keysNeeded, levelById, levelOver, nextLevel, parrotKeys, parrotLevel, parrotSizeOf, practiceLevel, rescueLevel, rescueUnlocked, shownProgress, worldLevels, worldLock } from './levels';

const KEYS = ['f', 'j', 'd', 'k', 's', 'l', 'a', ';', 'g', 'h', 'r', 'u', 'e', 'i', 't', 'y', 'w', 'o', 'q', 'p', 'v', 'm', 'c', ',', 'x', '.'];

describe('story unlocks', () => {
  it('opens the robot story when the child knows ten keys', () => {
    const p = newProfile('Ema', 'sk');
    expect(isWorldUnlocked(p, 0)).toBe(true);
    expect(isWorldUnlocked(p, 5)).toBe(false);
    p.progress.unlockedKeys = KEYS.slice(0, 9);
    p.progress.worldsDone = [0, 1];
    expect(isWorldUnlocked(p, 5)).toBe(false);
    p.progress.unlockedKeys = KEYS.slice(0, 10);
    p.progress.worldsDone = [];
    expect(isWorldUnlocked(p, 5)).toBe(true);
    expect(isWorldUnlocked(p, 6)).toBe(false);
  });

  it('opens the fairy story at twenty keys', () => {
    const p = newProfile('Ema', 'sk');
    p.progress.unlockedKeys = lessonOrder(p.layout).slice(0, 19);
    expect(isWorldUnlocked(p, 10)).toBe(false);
    p.progress.unlockedKeys = lessonOrder(p.layout).slice(0, 20);
    expect(isWorldUnlocked(p, 10)).toBe(true);
    expect(isWorldUnlocked(p, 11)).toBe(false);
  });

  it('lets both stories go on independently', () => {
    const p = newProfile('Ema', 'sk');
    p.progress.unlockedKeys = KEYS.slice(0, 10);
    p.progress.worldsDone = [0, 1, 5, 6];
    expect(isWorldUnlocked(p, 2)).toBe(true);
    expect(isWorldUnlocked(p, 3)).toBe(false);
    expect(isWorldUnlocked(p, 7)).toBe(true);
    expect(isWorldUnlocked(p, 8)).toBe(false);
  });

  it('plays the dragon story first, then the robot story', () => {
    const p = newProfile('Ema', 'sk');
    p.progress.unlockedKeys = KEYS;
    p.progress.worldsDone = [0, 1];
    for (const l of LEVELS.filter((x) => x.world < 2)) p.progress.levels[l.id] = 3;
    expect(nextLevel(p)?.id).toBe('w3-1');
    for (const l of LEVELS.filter((x) => x.world < 5)) p.progress.levels[l.id] = 3;
    p.progress.worldsDone = [0, 1, 2, 3, 4];
    expect(nextLevel(p)?.id).toBe('w6-1');
  });

  it('has five levels with a super-obstacle in every world', () => {
    for (const s of STORIES) for (const w of s.worlds) {
      expect(levelById(`w${w + 1}-5`)?.isSuper).toBe(true);
      expect(LEVELS.filter((l) => l.world === w)).toHaveLength(5);
    }
  });
});

describe('keys needed per level', () => {
  /** A profile with every level of world 2 reached (world 1 done, earlier levels with stars) and `n` keys. */
  const withKeys = (n: number) => {
    const p = newProfile('Ema', 'sk');
    p.progress.worldsDone = [0];
    for (const l of LEVELS.filter((x) => x.world <= 1)) p.progress.levels[l.id] = 2;
    p.progress.unlockedKeys = KEYS.slice(0, n);
    return p;
  };
  const open = (p: ReturnType<typeof withKeys>) => worldLevels(1).map((l) => isLevelUnlocked(p, l));

  it('opens the first two levels of the rocket world with eight keys', () => {
    expect(open(withKeys(8))).toEqual([true, true, false, false, false]);
  });

  it('opens every level with ten keys', () => {
    expect(open(withKeys(10))).toEqual([true, true, true, true, true]);
  });

  it("counts the parent's manual keys", () => {
    const p = withKeys(2);
    p.settings.activeKeysMode = 'manual';
    p.settings.manualKeys = KEYS.slice(0, 8);
    expect(open(p)).toEqual([true, true, false, false, false]);
  });

  it('climbs from 10 keys in the robot story', () => {
    const p = newProfile('Ema', 'sk');
    p.progress.worldsDone = [5];
    for (const l of LEVELS.filter((x) => x.world === 6)) p.progress.levels[l.id] = 2;
    const robot = () => worldLevels(6).map((l) => isLevelUnlocked(p, l));
    expect(worldLevels(5).map((l) => keysNeeded(p, l))).toEqual([10, 11, 12, 13, 14]);
    expect(worldLevels(6).map((l) => keysNeeded(p, l))).toEqual([15, 16, 17, 18, 19]);
    p.progress.unlockedKeys = KEYS.slice(0, 17);
    expect(robot()).toEqual([true, true, true, false, false]);
    p.progress.unlockedKeys = KEYS.slice(0, 19);
    expect(robot()).toEqual([true, true, true, true, true]);
  });

  it('climbs from 20 keys to the whole lesson path in the fairy story', () => {
    const p = newProfile('Ema', 'sk');
    expect(worldLevels(10).map((l) => keysNeeded(p, l))).toEqual([20, 22, 24, 25, 27]);
    expect(worldLevels(14).map((l) => keysNeeded(p, l))).toEqual([55, 57, 59, 60, 62]);
    p.layout = 'us-qwerty';
    const path = lessonOrder('us-qwerty').length;
    expect(Math.max(...LEVELS.map((l) => keysNeeded(p, l)))).toBeLessThanOrEqual(path);
    p.progress.worldsDone = [10];
    for (const l of worldLevels(11)) p.progress.levels[l.id] = 2;
    p.progress.unlockedKeys = lessonOrder('us-qwerty');
    expect(worldLevels(11).every((l) => isLevelUnlocked(p, l))).toBe(true);
  });

  it('starts the dragon story gently and keeps the counts growing', () => {
    const p = newProfile('Ema', 'sk');
    const world = (w: number) => worldLevels(w).slice(0, 4).map((l) => keysNeeded(p, l));
    expect([0, 1, 2, 3, 4].map(world)).toEqual([[3, 3, 4, 5], [7, 8, 9, 10], [12, 13, 14, 15], [16, 17, 17, 18], [19, 19, 20, 20]]);
    for (const s of STORIES) {
      const counts = s.worlds.flatMap((w) => worldLevels(w).map((l) => keysNeeded(p, l)));
      expect(counts).toEqual([...counts].sort((x, y) => x - y));
      expect(counts[0]).toBeGreaterThanOrEqual(s.opensAtKeys ?? 0);
    }
  });

  it('does not gate the super profile', () => {
    const p = withKeys(2);
    p.id = SUPER_ID;
    expect(open(p)).toEqual([true, true, true, true, true]);
  });

  it('skips key-locked levels for the next level, and offers none when nothing is open', () => {
    const p = withKeys(4);
    expect(nextLevel(p)?.id).toBe('w1-3');
    delete p.progress.levels['w1-3'];
    expect(nextLevel(p)?.id).toBe('w1-3');
    p.progress.unlockedKeys = ['f'];
    expect(nextLevel(p)).toBeNull();
  });
});

describe('rescue missions', () => {
  it('open with either finished story and come from finished stories only', () => {
    const p = newProfile('Ema', 'sk');
    expect(rescueUnlocked(p)).toBe(false);
    p.progress.worldsDone = [0, 1, 5, 6, 7, 8, 9];
    expect(rescueUnlocked(p)).toBe(true);
    for (let seed = 0; seed < 20; seed++) expect(rescueLevel(p, seed).world).toBeGreaterThanOrEqual(5);
    p.progress.worldsDone.push(2, 3, 4);
    const worlds = new Set(Array.from({ length: 20 }, (_, seed) => rescueLevel(p, seed).world >= 5));
    expect(worlds).toEqual(new Set([true, false]));
  });

  it('listen and remember once the fairy story is done', () => {
    const p = newProfile('Ema', 'sk');
    p.progress.worldsDone = [0, 1, 2, 3, 4];
    const styles = () => new Set(Array.from({ length: 40 }, (_, seed) => rescueLevel(p, seed).style ?? 'copy'));
    expect(styles()).toEqual(new Set(['copy']));
    p.progress.worldsDone.push(10, 11, 12, 13, 14);
    expect(styles()).toEqual(new Set(['copy', 'dictation', 'memory', 'mixed']));
  });
});

describe('first level', () => {
  it('asks for single chunks; only the second level may need the space bar', () => {
    expect(levelById('w1-1')?.noSpace).toBe(true);
    expect(LEVELS.filter((l) => l.noSpace).map((l) => l.id)).toEqual(['w1-1']);
  });

  it('the meadow plays the world rhythm: main game, calm step, gust, twist, super-obstacle', () => {
    expect(['w1-1', 'w1-2', 'w1-3', 'w1-4', 'w1-5'].map((id) => levelById(id)?.kind)).toEqual(['meadow', 'poppies', 'meadow', 'invitation', 'hedgehog']);
    expect(['w1-1', 'w1-2', 'w1-3', 'w1-4', 'w1-5'].map((id) => activityOf(levelById(id)!))).toEqual(['chase', 'catch', 'chase', 'clean', 'super']);
    expect(levelById('w1-3')?.variant).toBe('gust');
    expect(minActiveS(levelById('w1-2')!)).toBe(60);
    expect(minActiveS(levelById('w1-4')!)).toBe(MIN_ACTIVE_S);
  });

  it('the rocket world plays the world rhythm too: its second level is the calm hop', () => {
    expect(levelById('w2-2')?.kind).toBe('hop');
    expect(activityOf(levelById('w2-2')!)).toBe('catch');
    expect(minActiveS(levelById('w2-2')!)).toBe(60);
  });

  it('the planet: the swamp waits (a calm minute), crystals stream, crossroads, spells to copy', () => {
    expect(levelById('w3-1')?.kind).toBe('swamp');
    expect(activityOf(levelById('w3-1')!)).toBe('catch');
    expect(minActiveS(levelById('w3-1')!)).toBe(60);
    expect(minActiveS({ ...levelById('w3-1')!, rescue: true })).toBe(MIN_ACTIVE_S);
    expect(activityOf(levelById('w3-2')!)).toBe('chase');
    expect(activityOf(levelById('w3-4')!)).toBe('clean');
    expect(levelById('w3-5')?.kind).toBe('greatswamp');
  });

  it('every level has an activity for its map dot', () => {
    expect(activityOf(levelById('w3-3')!)).toBe('crossroads');
    expect(activityOf(levelById('w12-2')!)).toBe('listen');
    expect(activityOf(levelById('w13-2')!)).toBe('remember');
    expect(LEVELS.filter((l) => l.isSuper).every((l) => activityOf(l) === 'super')).toBe(true);
  });
});

describe('world locks', () => {
  it('names the world before it that is not done', () => {
    const p = newProfile('Ema', 'sk');
    expect(worldLock(p, 0)).toBeNull();
    expect(worldLock(p, 1)).toEqual({ kind: 'world', prev: 0 });
    p.progress.worldsDone = [0];
    expect(worldLock(p, 1)).toBeNull();
  });

  it('counts the keys a closed story still needs', () => {
    const p = newProfile('Ema', 'sk');
    p.progress.unlockedKeys = KEYS.slice(0, 7);
    expect(worldLock(p, 5)).toEqual({ kind: 'keys', need: 10, have: 7 });
    p.progress.unlockedKeys = KEYS.slice(0, 10);
    expect(worldLock(p, 5)).toBeNull();
  });
});

describe('target range', () => {
  it('opens with the world done and trains the weak keys', () => {
    const p = newProfile('Ema', 'sk');
    expect(aimOpen(p, 0)).toBe(false);
    expect(aimWorld(p, 0)).toBeNull();
    p.progress.worldsDone = [0, 1];
    expect(aimOpen(p, 1)).toBe(true);
    expect(aimWorld(p, 1)).toBe(1);
    expect(aimWorld(p, 3)).toBe(1);
    expect(aimLevel(p, 1)).toMatchObject({ id: 'aim', kind: 'aim', world: 1, index: -1, focus: ['f', 'j', ' '] });
  });
});

describe('minimum level length', () => {
  it('practice and free typing keep their own length, every other level has the minimum', () => {
    expect(hasMinLength(practiceLevel(60))).toBe(false);
    expect(hasMinLength(freeTypeLevel(0))).toBe(false);
    expect(hasMinLength(aimLevel(newProfile('Ema', 'sk'), 0))).toBe(false);
    expect(hasMinLength(LEVELS[4])).toBe(true);
  });

  it('a quick level gets more targets until the minimum, and ends only after it', () => {
    // Fake clock: one word every 3 s, 12 planned.
    let count = 12, done = 0, t = 0;
    while (!levelOver(done >= count, t, MIN_ACTIVE_S)) {
      count = grownCount(count, done, t, 3, MIN_ACTIVE_S);
      t += 3;
      done++;
    }
    expect(t).toBeGreaterThanOrEqual(MIN_ACTIVE_S);
    expect(t).toBeLessThan(MIN_ACTIVE_S + 12);
    expect(done).toBeGreaterThan(12);
  });

  it('a slow level keeps its planned count', () => {
    expect(grownCount(12, 10, 130, 3, MIN_ACTIVE_S)).toBe(12);
  });

  it('the bar shows the slower of the targets and the time', () => {
    expect(shownProgress(1, 60, MIN_ACTIVE_S)).toBe(0.5);
    expect(shownProgress(0.3, 60, MIN_ACTIVE_S)).toBeCloseTo(0.3);
    expect(shownProgress(0.6, 240, MIN_ACTIVE_S)).toBeCloseTo(0.6);
    expect(shownProgress(1, 240, MIN_ACTIVE_S)).toBe(1);
    expect(shownProgress(0.3, 5, 0)).toBe(0.3);
  });
});

describe('parrot', () => {
  it('sizes the round by story and place, and takes the letters of the world\'s last level', () => {
    expect(parrotSizeOf(0).words).toBe(3);
    expect(parrotSizeOf(7)).toEqual({ words: 4, len: [4, 6], repeats: 4 });
    const p = newProfile('Ema', 'sk');
    expect(parrotKeys(p, 0)).toEqual(['f', 'j', 'd', 'k']);
    expect(parrotLevel(3)).toMatchObject({ id: 'parrot', kind: 'parrot', world: 3, index: -1 });
    expect(hasMinLength(parrotLevel(3))).toBe(false);
  });
});
