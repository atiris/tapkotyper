import { describe, expect, it } from 'vitest';
import { newProfile } from '../storage/store';
import { emptyKeyStat } from '../storage/schema';
import { LAYOUTS } from '../keyboard/layouts';
import { activeKeys, advanceLesson, firstKeys, isMastered, keysToIntroduce, lessonOrder, practiceOrder, practiceSteps, punctuationKeys, reactionLimit, shiftKeyOf, stepHolding } from './lessons';
import { STATS_WINDOW, keyMastery, keyReport, lastTraining, masterySummary, recordPress, weakKeys } from './stats';

describe('lesson order', () => {
  it('starts on the home row with the index fingers', () => {
    expect(firstKeys('sk-qwertz')).toEqual(['f', 'j', ' ']);
    expect(lessonOrder('sk-qwertz').slice(0, 9)).toEqual(['f', 'j', ' ', 'd', 'k', 's', 'l', 'a', 'ô']);
    expect(lessonOrder('us-qwerty')[8]).toBe(';');
  });

  it('brings punctuation in with the letters and each Shift in the middle', () => {
    const sk = lessonOrder('sk-qwertz');
    const after = (key: string, prev: string) => expect(sk.indexOf(key)).toBe(sk.indexOf(prev) + 1);
    after('.', 'u');
    after(',', 'n');
    after('ShiftL', 'p');
    after('ShiftR', 'z');
    after('?', 'q');
    after('!', 'á');
    expect(sk.indexOf('ShiftR')).toBeLessThan(sk.indexOf('á'));
    expect(sk).not.toContain('Shift');
    const us = lessonOrder('us-qwerty');
    expect(us.indexOf('ShiftR')).toBe(us.indexOf('y') + 1);
    expect(us.indexOf("'")).toBe(us.indexOf(',') + 1);
    expect(us.indexOf('!')).toBeGreaterThan(us.indexOf('1'));
  });

  it('measures a capital on the Shift of the other hand', () => {
    expect(shiftKeyOf(LAYOUTS['sk-qwertz'], 'J')).toBe('ShiftL');
    expect(shiftKeyOf(LAYOUTS['sk-qwertz'], 'A')).toBe('ShiftR');
    expect(shiftKeyOf(LAYOUTS['sk-qwertz'], 'Č')).toBe('ShiftR');
    expect(shiftKeyOf(LAYOUTS['sk-qwertz'], 'j')).toBeNull();
    expect(shiftKeyOf(LAYOUTS['sk-qwertz'], '?')).toBeNull();
  });

  it('teaches Slovak diacritics but not on the US layout', () => {
    expect(lessonOrder('sk-qwertz')).toContain('ľ');
    expect(lessonOrder('us-qwerty')).not.toContain('ľ');
  });

  it('scales the reaction limit with difficulty', () => {
    expect(reactionLimit(1)).toBe(1600);
    expect(reactionLimit(10)).toBe(800);
  });
});

describe('mastery and unlocking', () => {
  it('needs 40 accurate, quick presses', () => {
    const p = newProfile('Ema', 'sk');
    for (let i = 0; i < 39; i++) recordPress(p, 'j', 'j', 500);
    expect(isMastered(p.stats.keys.j, 5)).toBe(false);
    recordPress(p, 'j', 'j', 500);
    expect(isMastered(p.stats.keys.j, 5)).toBe(true);
  });

  it('is not mastered with too many errors or slow presses', () => {
    const p = newProfile('Ema', 'sk');
    for (let i = 0; i < 40; i++) recordPress(p, 'f', i % 8 === 0 ? 'g' : 'f', 500);
    expect(isMastered(p.stats.keys.f, 5)).toBe(false);
    const q = newProfile('Ema', 'sk');
    for (let i = 0; i < 40; i++) recordPress(q, 'f', 'f', 2500);
    expect(isMastered(q.stats.keys.f, 5)).toBe(false);
  });

  it('unlocks the next mirrored pair only when both newest keys are ready', () => {
    const p = newProfile('Ema', 'sk');
    expect(advanceLesson(p)).toEqual([]);
    for (let i = 0; i < 25; i++) recordPress(p, 'j', 'j', 400);
    expect(advanceLesson(p)).toEqual([]);
    for (let i = 0; i < 25; i++) recordPress(p, 'f', 'f', 400);
    expect(advanceLesson(p)).toEqual([]);
    for (let i = 0; i < 12; i++) recordPress(p, ' ', ' ', 400);
    expect(advanceLesson(p)).toEqual(['d', 'k']);
    expect(p.progress.unlockedKeys).toEqual(['f', 'j', ' ', 'd', 'k']);
  });

  it('skips diacritics when the parent turned them off', () => {
    const p = newProfile('Ema', 'sk');
    p.settings.noDiacritics = true;
    p.progress.unlockedKeys = lessonOrder('sk-qwertz').slice(0, lessonOrder('sk-qwertz').indexOf('q') + 1);
    for (let i = 0; i < 40; i++) recordPress(p, 'q', 'q', 400);
    expect(advanceLesson(p)).toEqual(['?']);
    p.progress.unlockedKeys.push('-');
    for (let i = 0; i < 12; i++) recordPress(p, '-', '-', 400);
    expect(advanceLesson(p)).toEqual(['!']);
  });

  it('introduces every unlocked key once, in order', () => {
    const p = newProfile('Ema', 'sk');
    expect(keysToIntroduce(p)).toEqual(['f', 'j', ' ']);
    p.progress.introducedKeys.push('f');
    expect(keysToIntroduce(p)).toEqual(['j', ' ']);
  });
});

describe('statistics', () => {
  it('records the wrong key typed instead and capitals under Shift', () => {
    const p = newProfile('Ema', 'sk');
    recordPress(p, 'f', 'g', 300);
    recordPress(p, 'F', 'F', 300);
    recordPress(p, 'J', 'j', 300);
    expect(p.stats.keys.f.recentWrong).toEqual(['g']);
    expect(p.stats.keys.f.presses).toBe(2);
    expect(p.stats.keys.f.days).toHaveLength(1);
    expect(p.stats.keys.f.days[0]).toMatchObject({ presses: 2, errors: 1, rtCount: 1 });
    expect(p.stats.keys.ShiftR.presses).toBe(1);
    expect(p.stats.keys.ShiftL.errors).toBe(1);
  });

  it('lists the weakest keys first', () => {
    const p = newProfile('Ema', 'sk');
    for (let i = 0; i < 10; i++) {
      recordPress(p, 'f', 'f', 400);
      recordPress(p, 'j', i % 2 ? 'h' : 'j', 400);
    }
    expect(weakKeys(p, ['f', 'j'])[0].key).toBe('j');
  });

  it('counts only the last presses, so old mistakes fade out', () => {
    const p = newProfile('Ema', 'sk');
    for (let i = 0; i < 30; i++) recordPress(p, 'f', 'g', 400);
    for (let i = 0; i < STATS_WINDOW; i++) recordPress(p, 'f', 'f', 400);
    const r = keyReport(p, 'f')!;
    expect(r.accuracy).toBe(1);
    expect(r.presses).toBe(30 + STATS_WINDOW);
    expect(r.confusions).toEqual([{ ch: 'g', n: 30 }]);
  });
});

describe('last training', () => {
  it('counts days since the last session and the minutes of the last 7 days', () => {
    const p = newProfile('Ema', 'sk');
    const now = new Date(2026, 9, 21, 9);
    expect(lastTraining(p, now)).toEqual({ daysAgo: null, weekMinutes: 0 });
    p.stats.sessions.push(
      { date: '2026-10-10', seconds: 600, chars: 0, errors: 0, cpm: 0 },
      { date: '2026-10-15', seconds: 300, chars: 0, errors: 0, cpm: 0 },
      { date: '2026-10-19', seconds: 150, chars: 0, errors: 0, cpm: 0 },
    );
    expect(lastTraining(p, now)).toEqual({ daysAgo: 2, weekMinutes: 8 });
    p.stats.sessions.push({ date: '2026-10-21', seconds: 0, chars: 0, errors: 0, cpm: 0 });
    expect(lastTraining(p, now).daysAgo).toBe(2);
  });
});

describe('free practice steps', () => {
  const order = lessonOrder('sk-qwertz');
  const steps = practiceSteps(order);

  it('starts with f j and space and adds three keys each step', () => {
    expect(steps[0]).toEqual(['f', 'j', ' ']);
    expect(steps[1]).toEqual(['f', 'j', ' ', 'd', 'k', 's']);
    for (let i = 1; i < steps.length - 1; i++) expect(steps[i].length).toBe(steps[i - 1].length + 3);
    expect(steps[steps.length - 1]).toEqual(order);
    expect(steps.length).toBe(Math.ceil(order.length / 3));
  });

  it('opens on the smallest step holding all active keys', () => {
    expect(stepHolding(steps, ['f', 'j', ' '])).toBe(0);
    expect(stepHolding(steps, ['f', 'j', ' ', 'd'])).toBe(1);
    expect(stepHolding(steps, ['f', 'j', ' ', 'd', 'k', 's', 'l'])).toBe(2);
    expect(stepHolding(steps, ['f', 'j', 'ShiftL'])).toBe(order.indexOf('ShiftL') / 3 | 0);
    // A key outside the order (a parent's manual pick) does not push the slider to the end.
    expect(stepHolding(steps, ['f', 'j', '='])).toBe(0);
  });

  it('leaves diacritics out when they are turned off', () => {
    const p = newProfile('Ema', 'sk', 'sk-qwertz');
    p.settings.noDiacritics = true;
    expect(practiceOrder(p)).not.toContain('á');
    expect(practiceOrder(p)).toContain('a');
  });
});

describe('manual punctuation picking', () => {
  it('offers the shifted Slovak punctuation with its key combination', () => {
    const keys = punctuationKeys(LAYOUTS['sk-qwertz']);
    expect(keys.find((k) => k.key === '?')).toEqual({ key: '?', base: ',', shift: true });
    expect(keys.find((k) => k.key === '!')).toEqual({ key: '!', base: '§', shift: true });
    expect(keys.find((k) => k.key === ':')).toEqual({ key: ':', base: '.', shift: true });
    expect(keys.find((k) => k.key === '.')?.shift).toBe(false);
    expect(keys.some((k) => k.key === "'")).toBe(false);
    expect(punctuationKeys(LAYOUTS['us-qwerty']).some((k) => k.key === "'")).toBe(true);
  });

  it('puts a picked ? into the active keys', () => {
    const p = newProfile('Ema', 'sk');
    p.settings.activeKeysMode = 'manual';
    p.settings.manualKeys = ['f', 'j', '?'];
    expect(activeKeys(p)).toContain('?');
  });
});

describe('mastered key', () => {
  const withRecent = (recent: number[]) => {
    const p = newProfile('T', 'sk');
    p.settings.difficulty = 3;
    p.stats.keys.f = { ...emptyKeyStat(), recent };
    return p;
  };
  const fast = (n: number) => Array(n).fill(600);

  it('needs 30 presses', () => {
    expect(keyMastery(withRecent(fast(29)), 'f')).toBeNull();
    expect(keyMastery(withRecent(fast(30)), 'f')).not.toBeNull();
  });

  it('needs 90 % accuracy of the last 30 presses only', () => {
    expect(keyMastery(withRecent([...fast(26), 0, 0, 0, 0]), 'f')).toBeNull();
    expect(keyMastery(withRecent([0, 0, 0, 0, 0, ...fast(30)]), 'f')?.accuracy).toBe(1);
  });

  it('needs the median speed of the difficulty', () => {
    expect(keyMastery(withRecent(Array(30).fill(reactionLimit(3) + 100)), 'f')).toBeNull();
  });

  it('sums up the mastered keys of the layout', () => {
    const p = withRecent(fast(30));
    expect(masterySummary(p)).toMatchObject({ mastered: 1, total: lessonOrder('sk-qwertz').length, accuracy: 1, cpm: 100 });
    expect(masterySummary(newProfile('U', 'sk'))).toMatchObject({ mastered: 0, accuracy: 0, cpm: 0 });
  });
});
