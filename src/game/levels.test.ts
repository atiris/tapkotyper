import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LAYOUTS, LAYOUT_IDS } from '../keyboard/layouts';
import { newProfile } from '../storage/store';
import { type Profile, SUPER_ID, emptyKeyStat } from '../storage/schema';
import { lessonKeyNames, lessonOrder, practiceOrder } from '../learning/lessons';
import { LEVELS, STORIES, WORLDS, needCount, activityOf, minActiveS, minWords, playedStep, aimLevel, aimOpen, aimWorld, freeTypeLevel, grownCount, hasMinLength, isLevelUnlocked, isWorldUnlocked, keysNeeded, levelById, levelOver, nextLevel, parrotKeys, parrotLevel, parrotSizeOf, practiceLevel, JOURNEYS, JOURNEY_STAR_STEPS, journeyId, journeyLevel, journeyOpen, journeyProgress, starsFor, shownProgress, worldLevels, worldLock, WORLD_KEYS, worldKeys, worldKeysMissing, worldNewKeys } from './levels';

/** Keys along the Slovak lesson order, so every world's keys come with their count. */
const KEYS = lessonOrder('sk-qwertz').slice(0, 26);

/** The child knows these keys and masters them: 100 right presses each. */
const know = (p: Profile, keys: string[]) => {
  p.progress.unlockedKeys = [...keys];
  for (const k of keys) p.stats.keys[k] = { ...emptyKeyStat(), presses: 100, recent: Array(100).fill(500) };
};

describe('story unlocks', () => {
  it('opens the robot story when the child knows ten keys', () => {
    const p = newProfile('Ema', 'sk');
    expect(isWorldUnlocked(p, 0)).toBe(true);
    expect(isWorldUnlocked(p, 5)).toBe(false);
    know(p, KEYS.slice(0, 9));
    p.progress.worldsDone = [0, 1];
    expect(isWorldUnlocked(p, 5)).toBe(false);
    know(p, KEYS.slice(0, 10));
    p.progress.worldsDone = [];
    expect(isWorldUnlocked(p, 5)).toBe(true);
    expect(isWorldUnlocked(p, 6)).toBe(false);
  });

  it('opens the fairy story at twenty keys', () => {
    const p = newProfile('Ema', 'sk');
    know(p, lessonOrder(p.layout).slice(0, 19));
    expect(isWorldUnlocked(p, 10)).toBe(false);
    know(p, lessonOrder(p.layout).slice(0, 20));
    expect(isWorldUnlocked(p, 10)).toBe(true);
    expect(isWorldUnlocked(p, 11)).toBe(false);
  });

  it('lets both stories go on independently', () => {
    const p = newProfile('Ema', 'sk');
    know(p, KEYS.slice(0, 19));
    p.progress.worldsDone = [0, 1, 5, 6];
    expect(isWorldUnlocked(p, 2)).toBe(true);
    expect(isWorldUnlocked(p, 3)).toBe(false);
    expect(isWorldUnlocked(p, 7)).toBe(true);
    expect(isWorldUnlocked(p, 8)).toBe(false);
  });

  it('plays the dragon story first, then the robot story', () => {
    const p = newProfile('Ema', 'sk');
    know(p, KEYS);
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

  it('puts every world in one story, in a row, with the keys of each of its levels', () => {
    // A world added later must keep these, or its levels stay locked (`keysNeeded` reads the keys by place, unlocking the world before).
    expect(STORIES.flatMap((s) => s.worlds).sort((a, b) => a - b)).toEqual(WORLDS.map((_, i) => i));
    for (const s of STORIES) {
      expect(s.worlds).toEqual(s.worlds.map((_, i) => s.worlds[0] + i));
      expect(s.keys).toHaveLength(s.worlds.length * 5);
    }
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
  });
});

describe('keys needed per level', () => {
  /** A profile with every level of world 2 reached (world 1 done, earlier levels with stars) and `n` keys. */
  const withKeys = (n: number) => {
    const p = newProfile('Ema', 'sk');
    p.progress.worldsDone = [0];
    for (const l of LEVELS.filter((x) => x.world <= 1)) p.progress.levels[l.id] = 2;
    know(p, KEYS.slice(0, n));
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
    know(p, KEYS.slice(0, 17));
    expect(robot()).toEqual([true, true, true, false, false]);
    know(p, KEYS.slice(0, 19));
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
    know(p, lessonOrder('us-qwerty'));
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
    know(p, ['f']);
    expect(nextLevel(p)).toBeNull();
  });
});

describe("hero's journey", () => {
  it("opens with the story's last world done, like its range and parrot", () => {
    const p = newProfile('Ema', 'sk');
    const [dragon, robot] = STORIES;
    p.progress.worldsDone = [0, 1, 2, 3];
    expect(journeyOpen(p, dragon)).toBe(false);
    p.progress.worldsDone.push(4);
    expect(journeyOpen(p, dragon)).toBe(true);
    expect(journeyOpen(p, robot)).toBe(false);
  });

  it("plays the first level of each of the story's worlds, in order, as parts of one journey", () => {
    for (const story of STORIES.filter((s) => !JOURNEYS[s.id])) {
      const parts = story.worlds.map((_, i) => journeyLevel(story, i));
      expect(parts.map((l) => l.world)).toEqual(story.worlds);
      expect(parts.map((l) => l.kind)).toEqual(story.worlds.map((w) => worldLevels(w)[0].kind));
      for (const [i, l] of parts.entries()) {
        expect(l.id).toBe(journeyId(story));
        expect(l.journey).toEqual({ story: story.id, part: i, parts: story.worlds.length, picture: l.world });
        expect(l.index).toBe(-1);
        expect(l.noSpace).toBeUndefined();
      }
    }
  });

  it('takes the dragon story down the mountain, through the valley, the crystal meadow and the swamp to the rocket', () => {
    const story = STORIES[0];
    const parts = [0, 1, 2, 3, 4].map((i) => journeyLevel(story, i));
    expect(parts.map((l) => [l.kind, l.world])).toEqual([['boulders', 4], ['flight', 3], ['crystals', 2], ['greatswamp', 2], ['command', 2]]);
    for (const [i, l] of parts.entries()) {
      expect(l.variant).toBe('journey');
      expect(l.journey).toMatchObject({ story: 'dragon', part: i, parts: 5 });
      expect(l.journey?.line).toBeTruthy();
    }
    // The panel before a part shows its world's map picture; the take-off on the shore shows the rocket world's.
    expect(parts.map((l) => l.journey?.picture)).toEqual([4, 3, 2, 2, 1]);
    expect(parts.reduce((a, l) => a + minActiveS(l), 0)).toBeCloseTo(3 * minActiveS(worldLevels(1)[0]));
    // The flight counts the little dragon's two good flights, the swamp has no sentence on the shore.
    expect(parts[1].count).toBe(2);
    expect(parts[3].count).toBe(minWords(parts[3]));
  });

  it('lasts three times a regular level of its story, split evenly over the parts, in time and in words', () => {
    for (const [i, story] of STORIES.entries()) {
      const regular = worldLevels(story.worlds[1])[0];
      const parts = story.worlds.map((_, n) => journeyLevel(story, n));
      const time = parts.reduce((a, l) => a + minActiveS(l), 0);
      expect(time).toBeCloseTo(3 * minActiveS(regular));
      expect(minActiveS(parts[0])).toBeCloseTo((3 * [120, 180, 240][i]) / parts.length);
      expect(minWords(parts[0])).toBe(Math.round((3 * minWords(regular)) / parts.length));
    }
    expect(minWords(journeyLevel(STORIES[0], 0))).toBe(10);
  });

  it('fills the bar over the whole journey: each part only its own slice', () => {
    expect(journeyProgress({ part: 0, parts: 5 }, 0)).toBe(0);
    expect(journeyProgress({ part: 0, parts: 5 }, 1)).toBeCloseTo(0.2);
    expect(journeyProgress({ part: 2, parts: 5 }, 0.5)).toBeCloseTo(0.5);
    expect(journeyProgress({ part: 4, parts: 5 }, 1)).toBe(1);
    expect(journeyProgress({ part: 1, parts: 5 }, 2)).toBeCloseTo(0.4);
  });

  it('gives stars a bit stricter than a level: 5 from 99 %, 4 from 97.75 %, 3 from 95.5 %, 2 from 91 %', () => {
    expect(starsFor(1, JOURNEY_STAR_STEPS)).toBe(5);
    expect(starsFor(0.99, JOURNEY_STAR_STEPS)).toBe(5);
    expect(starsFor(0.989, JOURNEY_STAR_STEPS)).toBe(4);
    expect(starsFor(0.9775, JOURNEY_STAR_STEPS)).toBe(4);
    expect(starsFor(0.977, JOURNEY_STAR_STEPS)).toBe(3);
    expect(starsFor(0.955, JOURNEY_STAR_STEPS)).toBe(3);
    expect(starsFor(0.954, JOURNEY_STAR_STEPS)).toBe(2);
    expect(starsFor(0.91, JOURNEY_STAR_STEPS)).toBe(2);
    expect(starsFor(0.909, JOURNEY_STAR_STEPS)).toBe(1);
  });
});

describe('first level', () => {
  it('asks for single chunks; only the second level may need the space bar', () => {
    expect(levelById('w1-1')?.noSpace).toBe(true);
    expect(LEVELS.filter((l) => l.noSpace).map((l) => l.id)).toEqual(['w1-1']);
  });

  it('the meadow plays the world rhythm: main game, calm step, gust, twist, super-obstacle', () => {
    expect(['w1-1', 'w1-2', 'w1-3', 'w1-4', 'w1-5'].map((id) => levelById(id)?.kind)).toEqual(['meadow', 'poppies', 'meadow', 'invitation', 'hedgehog']);
    expect(['w1-1', 'w1-2', 'w1-3', 'w1-4', 'w1-5'].map((id) => activityOf(levelById(id)!))).toEqual(['chase', 'catch', 'chase', 'clean', 'chase']);
    expect(levelById('w1-3')?.variant).toBe('gust');
    expect(minActiveS(levelById('w1-2')!)).toBe(90);
    expect(minActiveS(levelById('w1-4')!)).toBe(120);
  });

  it('the rocket world plays the world rhythm too: its second level is the calm hop', () => {
    expect(levelById('w2-2')?.kind).toBe('hop');
    expect(activityOf(levelById('w2-2')!)).toBe('catch');
    expect(minActiveS(levelById('w2-2')!)).toBe(90);
  });

  it('the planet: the swamp waits (a calm minute), crystals stream, crossroads, spells to copy', () => {
    expect(levelById('w3-1')?.kind).toBe('swamp');
    expect(activityOf(levelById('w3-1')!)).toBe('catch');
    expect(minActiveS(levelById('w3-1')!)).toBe(90);
    expect(activityOf(levelById('w3-2')!)).toBe('chase');
    expect(activityOf(levelById('w3-4')!)).toBe('clean');
    expect(levelById('w3-5')?.kind).toBe('greatswamp');
  });

  it('every level has an activity for its map dot', () => {
    expect(activityOf(levelById('w3-3')!)).toBe('crossroads');
    // The super levels show their own game: the hedgehog and the asteroid chase, the spell ribbons are copying.
    expect(['w1-5', 'w2-5', 'w5-5', 'w6-5'].map((id) => activityOf(levelById(id)!))).toEqual(['chase', 'chase', 'clean', 'clean']);
  });
});

describe('the valley', () => {
  it('flames, the overgrown path (waiting words), flying lessons, the lullaby, the take-off', () => {
    const ids = ['w4-1', 'w4-2', 'w4-3', 'w4-4', 'w4-5'];
    expect(ids.map((id) => levelById(id)?.kind)).toEqual(['flames', 'thicket', 'flight', 'lullaby', 'takeoff']);
    expect(ids.map((id) => activityOf(levelById(id)!))).toEqual(['chase', 'catch', 'chase', 'clean', 'chase']);
    expect(ids.map((id) => minActiveS(levelById(id)!))).toEqual([120, 90, 120, 120, 150]);
    expect(ids.slice(2).map((id) => levelById(id)?.count)).toEqual([3, 3, 3]);
  });
});

describe('the egg mountain', () => {
  it('plays the wind, the puddles, the crossroads, the boulders and the spell ribbon with the dragon minimums', () => {
    const ids = ['w5-1', 'w5-2', 'w5-3', 'w5-4', 'w5-5'];
    expect(ids.map((id) => levelById(id)?.kind)).toEqual(['wind', 'mud', 'crossroads', 'boulders', 'spell']);
    expect(levelById('w5-3')?.variant).toBe('mountain');
    expect(ids.map((id) => activityOf(levelById(id)!))).toEqual(['chase', 'catch', 'crossroads', 'chase', 'clean']);
    expect(ids.map((id) => minActiveS(levelById(id)!))).toEqual([120, 90, 120, 120, 150]);
    expect(ids.map((id) => minWords(levelById(id)!))).toEqual([16, 12, 16, 16, 20]);
  });
});

describe('worlds not built yet', () => {
  it('every level of worlds 6-15 plays the cyclic copy, a copy dot with the full minimum', () => {
    const later = LEVELS.filter((l) => l.world >= 5);
    expect(later).toHaveLength(50);
    expect(later.every((l) => l.kind === 'copyloop')).toBe(true);
    expect(later.filter((l) => !l.isSuper).every((l) => activityOf(l) === 'clean')).toBe(true);
    expect(LEVELS.filter((l) => l.world < 5).some((l) => l.kind === 'copyloop')).toBe(false);
  });
});

describe('world locks', () => {
  it('names the world before it that is not done', () => {
    const p = newProfile('Ema', 'sk');
    expect(worldLock(p, 0)).toBeNull();
    expect(worldLock(p, 1)).toEqual({ kind: 'world', prev: 0 });
    p.progress.worldsDone = [0];
    know(p, KEYS.slice(0, 5));
    expect(worldLock(p, 1)).toBeNull();
  });

  it('counts the keys a closed story still needs', () => {
    const p = newProfile('Ema', 'sk');
    know(p, KEYS.slice(0, 7));
    expect(worldLock(p, 5)).toEqual({ kind: 'keys', need: 10, have: 7 });
    know(p, KEYS.slice(0, 10));
    expect(worldLock(p, 5)).toBeNull();
  });
});

describe('target range', () => {
  it('is open with its world from the start and trains the weak keys', () => {
    const p = newProfile('Ema', 'sk');
    expect(aimOpen(p, 0)).toBe(true);
    expect(aimOpen(p, 1)).toBe(false);
    expect(aimWorld(p, 3)).toBe(0);
    expect(aimLevel(p, 0)).toMatchObject({ id: 'aim', kind: 'aim', world: 0, index: -1, focus: ['f', 'j', ' '] });
    p.progress.worldsDone = [0];
    know(p, KEYS.slice(0, 10));
    expect(aimOpen(p, 1)).toBe(true);
    expect(aimWorld(p, 1)).toBe(1);
    // The robot story opens at 10 keys: its first world is the furthest open one.
    expect(aimWorld(p, 3)).toBe(5);
  });
});

describe('minimum level length', () => {
  it('grows with the story: 2 / 3 / 4 minutes, a calm step a quarter shorter, a super level a quarter longer', () => {
    const first = STORIES.map((st) => worldLevels(st.worlds[1]));
    expect(first.map((ls) => minActiveS(ls[0]))).toEqual([120, 180, 240]);
    expect(first.map((ls) => minActiveS(ls[4]))).toEqual([150, 225, 300]);
    expect(minActiveS(levelById('w2-2')!)).toBe(90);
    expect(minActiveS({ ...levelById('w2-2')!, world: 6 })).toBe(135);
  });

  it('asks for the words of a slow but practising child: 8 / 10 / 12 a minute', () => {
    expect(minWords(levelById('w1-1')!)).toBe(16);
    expect(minWords(levelById('w1-2')!)).toBe(12);
    expect(minWords(levelById('w1-5')!)).toBe(20);
    expect([levelById('w6-1')!, levelById('w11-1')!].map(minWords)).toEqual([30, 48]);
    expect([levelById('w6-5')!, levelById('w11-5')!].map(minWords)).toEqual([38, 60]);
  });

  it("plans its targets in the kind's own unit: words, big asteroids, swamp tasks, copy targets; flights count dragons", () => {
    expect(levelById('w1-1')?.count).toBe(16);
    expect(levelById('w1-2')?.count).toBe(12);
    expect(levelById('w2-5')?.count).toBe(4);
    expect(levelById('w3-5')?.count).toBe(17);
    expect(levelById('w6-1')?.count).toBe(30);
    expect(levelById('w6-3')?.count).toBe(12);
    expect(levelById('w6-5')?.count).toBe(10);
    expect(journeyLevel(STORIES[0], 0).count).toBe(10);
  });

  it('practice and free typing keep their own length, every other level has the minimum', () => {
    expect(hasMinLength(practiceLevel(60))).toBe(false);
    expect(hasMinLength(freeTypeLevel(0))).toBe(false);
    expect(hasMinLength(aimLevel(newProfile('Ema', 'sk'), 0))).toBe(false);
    expect(hasMinLength(LEVELS[4])).toBe(true);
  });

  const MIN = minActiveS(levelById('w1-1')!);

  it('a quick level gets more targets until the minimum, and ends only after it', () => {
    // Fake clock: one word every 3 s, 12 planned.
    let count = 12, done = 0, t = 0;
    while (!levelOver(done >= count, t, MIN)) {
      count = grownCount(count, done, t, 3, MIN);
      t += 3;
      done++;
    }
    expect(t).toBeGreaterThanOrEqual(MIN);
    expect(t).toBeLessThan(MIN + 12);
    expect(done).toBeGreaterThan(12);
  });

  it('the clock stops while a word waits and nobody has typed for five seconds; scenes without a word count', () => {
    expect(playedStep(0.05, 4, true)).toBe(0.05);
    expect(playedStep(0.05, 6, true)).toBe(0);
    expect(playedStep(0.05, 60, false)).toBe(0.05);
  });

  it('a slow level keeps its planned count', () => {
    expect(grownCount(12, 10, 130, 3, MIN)).toBe(12);
  });

  it('the bar shows the slower of the targets and the time', () => {
    expect(shownProgress(1, 60, MIN)).toBe(0.5);
    expect(shownProgress(0.3, 60, MIN)).toBeCloseTo(0.3);
    expect(shownProgress(0.6, 240, MIN)).toBeCloseTo(0.6);
    expect(shownProgress(1, 240, MIN)).toBe(1);
    expect(shownProgress(0.3, 5, 0)).toBe(0.3);
  });
});

describe('parrot', () => {
  it('sizes the round by story and place, and takes the known letters of the world\'s last level', () => {
    expect(parrotSizeOf(0).words).toBe(5);
    expect(parrotSizeOf(7)).toEqual({ words: 6, len: [4, 6] });
    const p = newProfile('Ema', 'sk');
    expect(parrotKeys(p, 0)).toEqual(['f', 'j']);
    p.progress.unlockedKeys.push('d', 'k');
    expect(parrotKeys(p, 0)).toEqual(['f', 'j', 'd', 'k']);
    expect(parrotLevel(3)).toMatchObject({ id: 'parrot', kind: 'parrot', world: 3, index: -1 });
    expect(hasMinLength(parrotLevel(3))).toBe(true);
    expect(minActiveS(parrotLevel(3))).toBe(minActiveS(parrotLevel(12)));
  });
});

describe('placement check', () => {
  /** A profile the check placed at `n` keys of the lesson order. */
  const placed = (n: number) => {
    const p = newProfile('Ema', 'sk');
    know(p, lessonOrder(p.layout).slice(0, n));
    p.progress.placementKeys = n;
    return p;
  };

  it('opens the levels and worlds whose keys it reached, none of them done', () => {
    const p = placed(15);
    const reached = LEVELS.filter((l) => isLevelUnlocked(p, l)).map((l) => l.id);
    // The dragon story up to its third world, the robot story up to the first level of its second world.
    expect(reached).toEqual([...[1, 2, 3].flatMap((w) => [1, 2, 3, 4, 5].map((i) => `w${w}-${i}`)), 'w6-1', 'w6-2', 'w6-3', 'w6-4', 'w6-5', 'w7-1']);
    expect(isWorldUnlocked(p, 3)).toBe(false);
    expect(isWorldUnlocked(p, 10)).toBe(false);
    expect(p.progress.levels).toEqual({});
    expect(p.progress.worldsDone).toEqual([]);
  });

  it('continues with the most advanced level it opened, then with the one played to', () => {
    const p = placed(15);
    expect(nextLevel(p)?.id).toBe('w3-4');
    p.progress.levels['w3-4'] = 3;
    expect(nextLevel(p)?.id).toBe('w3-5');
    p.progress.levels['w3-5'] = 3;
    p.progress.worldsDone = [2];
    // The next world needs one key more: the most advanced level the check opened waits elsewhere.
    expect(nextLevel(p)?.id).toBe('w7-1');
    know(p, lessonOrder(p.layout).slice(0, 16));
    expect(nextLevel(p)?.id).toBe('w4-1');
  });

  it('changes nothing without a check', () => {
    const p = newProfile('Ema', 'sk');
    know(p, lessonOrder(p.layout).slice(0, 15));
    expect(LEVELS.filter((l) => isLevelUnlocked(p, l)).map((l) => l.id)).toEqual(['w1-1', 'w6-1']);
    expect(nextLevel(p)?.id).toBe('w1-1');
  });
});

describe('world keys', () => {
  /** A profile on the layout, diacritics on or off. */
  const profile = (layout: (typeof LAYOUT_IDS)[number], noDiacritics = false) => {
    const p = newProfile('Ema', 'sk', layout);
    p.settings.noDiacritics = noDiacritics;
    return p;
  };
  const names = (p: ReturnType<typeof profile>, n: number) => new Set(practiceOrder(p).slice(0, n).flatMap((k) => lessonKeyNames(LAYOUTS[p.layout], k)));

  it('is reached by every lesson order by the need count, so the count and the list never disagree', () => {
    for (const layout of LAYOUT_IDS) for (const off of [false, true]) {
      const p = profile(layout, off);
      for (const w of WORLDS.keys()) {
        const known = names(p, needCount(p, w));
        expect(worldKeys(p, w).filter((n) => !known.has(n)), `${layout} ${off} world ${w + 1}`).toEqual([]);
      }
    }
  });

  it('holds every key all layouts reach by the need count or never teach', () => {
    for (const w of WORLDS.keys()) {
      const per = LAYOUT_IDS.map((id) => {
        const p = profile(id);
        return { need: names(p, needCount(p, w)), all: names(p, Infinity) };
      });
      const every = [...new Set(per.flatMap((x) => [...x.all]))].filter((n) => per.every((x) => x.need.has(n) || !x.all.has(n)) && per.some((x) => x.need.has(n)));
      expect([...WORLD_KEYS[w]].sort(), `world ${w + 1}`).toEqual(every.sort());
    }
  });

  it("asks the keys of the worlds before: none for the first world, the story opening count for a story's first world", () => {
    const sk = profile('sk-qwertz');
    expect(WORLD_KEYS[0]).toEqual([]);
    expect(worldNewKeys(sk, 0)).toEqual(['f0', 'j0', 'sp', 'd0', 'k0']);
    expect(needCount(sk, 1)).toBe(keysNeeded(sk, worldLevels(0)[4]));
    expect(needCount(sk, 5)).toBe(STORIES[1].opensAtKeys);
  });

  it('matches the table of the spec', () => {
    const rows = readFileSync('.specify/learning/world-keys.md', 'utf8').split(/\r?\n/).filter((l) => /^\| \d+ /.test(l))
      .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
    expect(rows).toHaveLength(WORLDS.length);
    const sk = profile('sk-qwertz');
    let before: string[] = [];
    const split = (cell: string) => (cell ? cell.split(' ') : []);
    for (const [w, [, need, fresh]] of rows.entries()) {
      const list = need.startsWith('+') ? [...before, ...split(need.slice(1).trim())] : split(need);
      expect(list, `world ${w + 1}`).toEqual([...WORLD_KEYS[w]]);
      expect(split(fresh), `world ${w + 1} new`).toEqual(worldNewKeys(sk, w));
      before = list;
    }
  });

  it('closes a world until the child masters its keys; a world already played in stays open', () => {
    const p = newProfile('Ema', 'sk');
    p.progress.worldsDone = [0];
    know(p, KEYS.slice(0, 5));
    // The space bar typed often but not accurately enough: 88 of the last 100 right.
    p.stats.keys[' '] = { ...emptyKeyStat(), presses: 300, recent: [...Array(88).fill(500), ...Array(12).fill(0)] };
    expect(worldKeysMissing(p, 1)).toEqual(['sp']);
    expect(worldLock(p, 1)).toEqual({ kind: 'need', keys: ['sp'] });
    expect(isWorldUnlocked(p, 1)).toBe(false);
    // Too few presses do not count either, however right.
    p.stats.keys[' '] = { ...emptyKeyStat(), presses: 99, recent: Array(99).fill(500) };
    expect(worldKeysMissing(p, 1)).toEqual(['sp']);
    p.progress.levels['w2-1'] = 1;
    expect(isWorldUnlocked(p, 1)).toBe(true);
    delete p.progress.levels['w2-1'];
    p.stats.keys[' '] = { ...emptyKeyStat(), presses: 100, recent: [...Array(89).fill(500), ...Array(11).fill(0)] };
    expect(worldLock(p, 1)).toBeNull();
    // The super profile needs none.
    p.stats.keys[' '] = emptyKeyStat();
    p.id = SUPER_ID;
    expect(worldKeysMissing(p, 1)).toEqual([]);
  });

  it('leaves out a key the practice order never teaches: no diacritics, the English keyboard', () => {
    const p = newProfile('Ema', 'sk');
    expect(worldKeys(p, 2)).toContain('l1');
    p.settings.noDiacritics = true;
    expect(worldKeys(p, 2)).not.toContain('l1');
    p.progress.worldsDone = [0, 1];
    know(p, practiceOrder(p).slice(0, 12));
    expect(worldLock(p, 2)).toBeNull();
    expect(worldKeys(profile('us-qwerty'), 14)).not.toContain('p1');
    expect(worldKeys(profile('sk-qwertz'), 14)).toContain('p1');
  });
});
