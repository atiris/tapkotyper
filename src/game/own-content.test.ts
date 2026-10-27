import { describe, expect, it } from 'vitest';
import { newProfile } from '../storage/store';
import type { Profile, Surprise } from '../storage/schema';
import { levelById, practiceLevel } from './levels';
import { newSurprise, restartSurprise, surpriseAnnounced, surpriseCount, surpriseFor, surpriseOutcome, surpriseWonIn, surprisesWonIn } from './own-content';

const w11 = levelById('w1-1')!;
const w12 = levelById('w1-2')!;

function rule(p: Profile, trigger: Surprise['trigger'], extra: Partial<Surprise> = {}): Surprise {
  const s = { ...newSurprise(p, { q: `q-${trigger}`, a: `a-${trigger}`, trigger, repeat: false, ...extra }), ...extra };
  p.surprises.push(s);
  return s;
}

/** A finished story level with its stars and minutes, as the runtime counts them. */
function play(p: Profile, stars = 3, seconds = 60): void {
  p.progress.trainedSeconds += seconds;
  p.progress.levelsFinished++;
  p.progress.starsEarned += stars;
}

describe('surprise rules', () => {
  it('a level rule asks on its level and tells the answer when it is finished, once', () => {
    const p = newProfile('Ema', 'sk');
    const s = rule(p, 'level', { level: 'w1-2' });
    expect(surpriseFor(p, w11, false)).toBeNull();
    expect(surpriseFor(p, w12, false)).toBe(s);
    expect(surpriseOutcome(p, s, false, '2026-10-21')).toEqual({ rule: s, revealed: true });
    expect(s.doneAt).toBe('2026-10-21');
    expect(surpriseFor(p, w12, false)).toBeNull();
  });

  it('a repeating level rule fires on every finish of its level', () => {
    const p = newProfile('Ema', 'sk');
    const s = rule(p, 'level', { level: 'w1-2', repeat: true });
    surpriseOutcome(p, surpriseFor(p, w12, false), false, '2026-10-21');
    expect(s.doneAt).toBeUndefined();
    expect(surpriseOutcome(p, surpriseFor(p, w12, false), false, '2026-10-21')?.revealed).toBe(true);
  });

  it('a minutes rule waits on every card and fires in the run that reaches the time', () => {
    const p = newProfile('Ema', 'sk');
    p.progress.trainedSeconds = 500;
    const s = rule(p, 'minutes', { n: 2 });
    expect(surpriseFor(p, practiceLevel(null), false)).toBe(s);
    play(p, 3, 90);
    expect(surpriseCount(p, s)).toEqual({ have: 1, need: 2 });
    expect(surpriseOutcome(p, s, false)).toEqual({ rule: s, revealed: false });
    play(p, 3, 30);
    expect(surpriseOutcome(p, s, false)?.revealed).toBe(true);
    expect(s.doneAt).toBeDefined();
  });

  it('levels and stars count from the creation, and repeat counts again from the reveal', () => {
    const p = newProfile('Ema', 'sk');
    play(p, 3);
    const levels = rule(p, 'levels', { n: 2, repeat: true });
    play(p, 3);
    expect(surpriseCount(p, levels)).toEqual({ have: 1, need: 2 });
    play(p, 3);
    expect(surpriseOutcome(p, levels, false)?.revealed).toBe(true);
    expect(surpriseCount(p, levels)).toEqual({ have: 0, need: 2 });
    const stars = rule(p, 'stars', { n: 4 });
    play(p, 2);
    expect(surpriseCount(p, stars)).toEqual({ have: 2, need: 4 });
    play(p, 3);
    expect(surpriseCount(p, stars)).toEqual({ have: 4, need: 4 });
  });

  it('one surprise per run: level, then minutes, levels, stars; a reached one first on the card', () => {
    const p = newProfile('Ema', 'sk');
    const stars = rule(p, 'stars', { n: 1 });
    const minutes = rule(p, 'minutes', { n: 10 });
    const level = rule(p, 'level', { level: 'w1-2' });
    expect(surpriseFor(p, w12, false)).toBe(level);
    expect(surpriseFor(p, w11, false)).toBe(minutes);
    play(p, 3);
    expect(surpriseFor(p, w11, false)).toBe(stars);
    expect(surpriseOutcome(p, level, false)?.rule).toBe(level);
    expect(stars.doneAt).toBeUndefined();
    // A rule reached during the run fires even when the card asked another one.
    expect(surpriseOutcome(p, minutes, false)?.rule).toBe(stars);
    expect(surpriseFor(p, w12, false)).toBe(minutes);
  });

  it('drills have none, and a changed rule waits again', () => {
    const p = newProfile('Ema', 'sk');
    const s = rule(p, 'levels', { n: 1 });
    play(p);
    expect(surpriseFor(p, practiceLevel(60), true)).toBeNull();
    expect(surpriseOutcome(p, null, true)).toBeNull();
    surpriseOutcome(p, s, false);
    expect(s.doneAt).toBeDefined();
    restartSurprise(p, s);
    expect(s.doneAt).toBeUndefined();
    expect(surpriseCount(p, s)).toEqual({ have: 0, need: 1 });
  });

  it('an announced level rule shows on the map until told, and a told one stays in its world', () => {
    const p = newProfile('Ema', 'sk');
    const s = rule(p, 'level', { level: 'w1-2', announce: true });
    rule(p, 'level', { level: 'w1-1' });
    expect(surpriseAnnounced(p, 'w1-2')).toBe(true);
    expect(surpriseAnnounced(p, 'w1-1')).toBe(false);
    surpriseOutcome(p, s, false);
    surpriseWonIn(s, 0);
    surpriseWonIn(s, 0);
    expect(surpriseAnnounced(p, 'w1-2')).toBe(false);
    expect(s.worlds).toEqual([0]);
    expect(surprisesWonIn(p, 0)).toEqual([s]);
    p.surprises = [];
    expect(surprisesWonIn(p, 0)).toEqual([]);
  });

  it('a told surprise stays on the map the day it was told and its days after, or for ever', () => {
    const p = newProfile('Ema', 'sk');
    const told = (showDays?: Surprise['showDays']) => rule(p, 'level', { worlds: [0], lastShownAt: '2026-10-28', showDays });
    const byDefault = told(), sameDay = told(0), always = told('forever'), week = told(7);
    expect(surprisesWonIn(p, 0, '2026-10-28')).toEqual([byDefault, sameDay, always, week]);
    expect(surprisesWonIn(p, 0, '2026-10-29')).toEqual([byDefault, always, week]);
    expect(surprisesWonIn(p, 0, '2026-10-30')).toEqual([always, week]);
    expect(surprisesWonIn(p, 0, '2026-11-05')).toEqual([always]);
  });
});
