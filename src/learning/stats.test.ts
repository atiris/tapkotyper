import { describe, expect, it } from 'vitest';
import { newProfile } from '../storage/store';
import { recentPractice, recentTyping, recordPress, recordSession, typingStep } from './stats';

describe('recordSession', () => {
  it('counts the training time and earns wardrobe time from it, also with the limit off', () => {
    const p = newProfile('Ema', 'sk');
    p.settings.wardrobeLimit = false;
    recordSession(p, 299.6, 100, 2, 60);
    expect(p.progress.trainedSeconds).toBe(300);
    expect(p.progress.wardrobeSeconds).toBe(60);
    expect(p.stats.sessions[0].seconds).toBe(300);
  });
});

describe('typingStep', () => {
  it('adds the gap since the last own key, at most 5 s', () => {
    expect(typingStep(0.4)).toBe(0.4);
    expect(typingStep(5)).toBe(5);
    expect(typingStep(60)).toBe(5);
    expect(typingStep(-1)).toBe(0);
  });

  it('a level left a minute with two keys counts at most 10 s', () => {
    // The game clock stops in a pause, so a pause adds nothing to the gap.
    const keysAt = [30, 61];
    let at = 0, typed = 0;
    for (const k of keysAt) {
      typed += typingStep(k - at);
      at = k;
    }
    expect(typed).toBe(10);
  });
});

describe('recentPractice', () => {
  const s = (date: string, seconds: number, chars: number, errors = 0) => ({ date, seconds, chars, errors, cpm: 0 });

  it('counts local days with keys and their typing time over the last 14 days, today included', () => {
    const p = newProfile('Ema', 'sk');
    p.stats.sessions = [s('2026-10-09', 600, 50), s('2026-10-10', 120, 10), s('2026-10-15', 30, 0), s('2026-10-23', 300, 40, 2)];
    expect(recentPractice(p, 14, new Date(2026, 9, 23, 20))).toEqual({ days: 2, seconds: 450 });
  });

  it('is empty without sessions', () => {
    expect(recentPractice(newProfile('Ema', 'sk'), 14)).toEqual({ days: 0, seconds: 0 });
  });

});

describe('recentTyping', () => {
  it('counts the last 14 calendar days, today included, not the last 14 sessions', () => {
    const p = newProfile('Ema', 'sk');
    const s = (date: string, chars: number, errors = 0, cpm = 40) => ({ date, seconds: 60, chars, errors, cpm });
    p.stats.sessions = [s('2026-10-09', 1000, 500, 10), s('2026-10-10', 5, 5, 0), s('2026-10-23', 30, 0, 60), s('2026-10-23', 10, 0, 20)];
    expect(recentTyping(p, 14, new Date(2026, 9, 23, 20))).toEqual({ chars: 45, accuracy: 0.9, cpm: 50 });
  });

  it('has no accuracy or speed without typing', () => {
    expect(recentTyping(newProfile('Ema', 'sk'), 14)).toEqual({ chars: 0, accuracy: 0, cpm: 0 });
  });
});

describe('recordPress', () => {
  it('a repeat of the same key counts as a press but not in the day reaction time', () => {
    const p = newProfile('Ema', 'sk');
    recordPress(p, 'f', 'f', 600);
    recordPress(p, 'f', 'f', 150, true);
    recordPress(p, 'f', 'g', 300);
    const day = p.stats.keys.f.days[0];
    expect(day).toMatchObject({ presses: 3, errors: 1, rtSum: 600, rtCount: 1 });
  });
});
