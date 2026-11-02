import { describe, expect, it } from 'vitest';
import { newProfile } from '../storage/store';
import { BLOCK, DROP_DAYS, ParrotRound, bringParrotHome, daysBetween, flyAway, hasParrotBadge, loseParrot, parrotFloor, parrotPatience, parrotSize, sendParrotAway, winParrot } from './parrots';

/** A profile with these worlds done and their parrots at home, won on `day`. */
function withParrots(worlds: number[], day = '2026-10-01') {
  const p = newProfile('Ema', 'sk');
  p.progress.worldsDone = [...worlds];
  for (const w of worlds) winParrot(p, w, day);
  p.progress.parrotCheckedAt = day;
  return p;
}

/** A random source that counts its calls and always returns `value`. */
function counting(value: number) {
  const r = Object.assign(() => (r.calls++, value), { calls: 0 });
  return r;
}

describe('parrot fly-away', () => {
  it('counts days between local dates', () => {
    expect(daysBetween('2026-10-01', '2026-10-14')).toBe(13);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
  });

  it('keeps three below the best count, at least one', () => {
    expect(parrotFloor(0)).toBe(1);
    expect(parrotFloor(2)).toBe(1);
    expect(parrotFloor(10)).toBe(7);
  });

  it('rolls once for each missed day', () => {
    const p = withParrots([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const rand = counting(0.99);
    expect(flyAway(p, '2026-10-14', rand)).toEqual([]);
    expect(rand.calls).toBe(13);
    expect(p.progress.parrotCheckedAt).toBe('2026-10-14');
    expect(flyAway(p, '2026-10-14', rand)).toEqual([]);
    expect(rand.calls).toBe(13);
  });

  it('rolls only today the first time', () => {
    const p = withParrots([0, 1, 2, 3, 4, 5]);
    p.progress.parrotCheckedAt = null;
    const rand = counting(0.99);
    flyAway(p, '2026-10-05', rand);
    expect(rand.calls).toBe(1);
  });

  it('never flies below the floor', () => {
    const p = withParrots([0, 1, 2, 3, 4, 5]);
    const flown = flyAway(p, '2026-10-15', () => 0);
    expect(flown).toHaveLength(3);
    expect(p.progress.parrots).toHaveLength(3);
    expect(p.progress.parrotFlown.sort()).toEqual([...flown].sort());
  });

  it('keeps the last parrot', () => {
    const p = withParrots([0]);
    expect(flyAway(p, '2026-12-30', () => 0)).toEqual([]);
    expect(p.progress.parrots).toEqual([0]);
  });

  it(`drops to the floor ${DROP_DAYS} days after the last win`, () => {
    const p = withParrots([0, 1, 2, 3, 4]);
    p.progress.parrotCheckedAt = '2026-10-21';
    expect(flyAway(p, '2026-10-22', () => 0.99)).toHaveLength(3);
    expect(p.progress.parrots).toHaveLength(2);
  });

  it('a win brings the parrot home and refreshes the day', () => {
    const p = withParrots([0, 1, 2, 3, 4]);
    flyAway(p, '2026-10-22', () => 0.99);
    const back = p.progress.parrotFlown[0];
    winParrot(p, back, '2026-10-23');
    expect(p.progress.parrots).toContain(back);
    expect(p.progress.parrotFlown).not.toContain(back);
    expect(p.progress.parrotBest).toBe(5);
    expect(p.progress.parrotsEarned).toBe(6);
    expect(p.progress.parrotWonAt).toBe('2026-10-23');
  });
});

describe('parrot badge', () => {
  it('is held with every finished world\'s parrot at home', () => {
    const p = newProfile('Ema', 'sk');
    expect(hasParrotBadge(p)).toBe(false);
    p.progress.worldsDone = [0, 1];
    expect(winParrot(p, 0, '2026-10-01')).toBe(false);
    expect(winParrot(p, 1, '2026-10-01')).toBe(true);
    expect(winParrot(p, 1, '2026-10-02')).toBe(false);
    expect(hasParrotBadge(p)).toBe(true);
  });

  it('is lost when a new world is done without its parrot', () => {
    const p = withParrots([0, 1]);
    expect(hasParrotBadge(p)).toBe(true);
    p.progress.worldsDone.push(2);
    expect(hasParrotBadge(p)).toBe(false);
    expect(winParrot(p, 2, '2026-10-02')).toBe(true);
  });
});

describe('parrot round', () => {
  it('sizes the round by story and place: five words, one more each story', () => {
    expect(parrotSize(0, 0)).toEqual({ words: 5, len: [2, 4] });
    expect(parrotSize(0, 2)).toEqual({ words: 5, len: [3, 5] });
    expect(parrotSize(1, 1)).toEqual({ words: 6, len: [4, 5] });
    expect(parrotSize(2, 4)).toEqual({ words: 7, len: [5, 7] });
  });

  it('takes the words in pairs, each pair twice, round the list', () => {
    const r = new ParrotRound([...'ABCDEFG']);
    expect(Array.from({ length: 20 }, (_, i) => r.wordAt(i)).join(' ')).toBe('A B A B C D C D E F E F G A G A B C B C');
  });

  it('ends with a whole pair once its time is up', () => {
    const r = new ParrotRound(['dom', 'strom']);
    r.advance();
    r.close();
    expect(r.done).toBe(false);
    for (let i = 0; i < BLOCK - 1; i++) r.advance();
    expect(r.done).toBe(true);
    expect(r.current).toBeNull();
  });
});

describe('parrot flies off', () => {
  it('bears 4 plus the story number of mistakes', () => {
    expect([0, 1, 2].map(parrotPatience)).toEqual([5, 6, 7]);
  });

  it('leaves home', () => {
    const p = withParrots([0, 1]);
    loseParrot(p, 1);
    loseParrot(p, 2);
    expect(p.progress.parrots).toEqual([0]);
  });
});

describe('parrot service', () => {
  it('sends a random parrot away, told on the map', () => {
    const p = withParrots([0, 1, 2]);
    expect(sendParrotAway(p, () => 0.5)).toBe(1);
    expect(p.progress.parrots).toEqual([0, 2]);
    expect(p.progress.parrotFlown).toEqual([1]);
    expect(sendParrotAway(newProfile('Ema', 'sk'))).toBeNull();
  });

  it('brings home the parrot of a finished world that misses it', () => {
    const p = withParrots([0, 1, 2]);
    loseParrot(p, 2);
    expect(hasParrotBadge(p)).toBe(false);
    expect(bringParrotHome(p, '2026-10-05', () => 0)).toBe(2);
    expect(hasParrotBadge(p)).toBe(true);
    expect(bringParrotHome(p, '2026-10-05')).toBeNull();
  });
});
