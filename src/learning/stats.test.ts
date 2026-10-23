import { describe, expect, it } from 'vitest';
import { newProfile } from '../storage/store';
import { charsInDays, recordSession } from './stats';

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

describe('charsInDays', () => {
  it('counts the last 14 calendar days, today included, not the last 14 sessions', () => {
    const p = newProfile('Ema', 'sk');
    const s = (date: string, chars: number) => ({ date, seconds: 60, chars, errors: 0, cpm: 40 });
    p.stats.sessions = [s('2026-10-09', 1000), s('2026-10-10', 5), s('2026-10-23', 7), s('2026-10-23', 3)];
    expect(charsInDays(p, 14, new Date(2026, 9, 23, 20))).toBe(15);
  });
});
