import { describe, expect, it } from 'vitest';
import { newProfile } from '../storage/store';
import { recentTyping, recordPress, recordSession } from './stats';

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
