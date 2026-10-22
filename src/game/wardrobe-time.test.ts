import { describe, expect, it } from 'vitest';
import { SUPER_ID } from '../storage/schema';
import { newProfile } from '../storage/store';
import { WARDROBE_MAX, countdownFace, earnWardrobe, practiceToOpen, spendWardrobe, wardrobeLocked } from './wardrobe-time';

describe('wardrobe time', () => {
  it('earns a fifth of the training, capped at 7 minutes', () => {
    const p = newProfile('Ema', 'sk');
    earnWardrobe(p, 600);
    expect(p.progress.wardrobeSeconds).toBe(120);
    earnWardrobe(p, 3600);
    expect(p.progress.wardrobeSeconds).toBe(WARDROBE_MAX);
  });

  it('opens with at least a minute, unless the limit is off or it is the super player', () => {
    const p = newProfile('Ema', 'sk');
    p.progress.wardrobeSeconds = 59.9;
    expect(wardrobeLocked(p)).toBe(true);
    p.progress.wardrobeSeconds = 60;
    expect(wardrobeLocked(p)).toBe(false);
    p.progress.wardrobeSeconds = 0;
    p.settings.wardrobeLimit = false;
    expect(wardrobeLocked(p)).toBe(false);
    p.settings.wardrobeLimit = true;
    p.id = SUPER_ID;
    expect(wardrobeLocked(p)).toBe(false);
  });

  it('spends down to zero', () => {
    const p = newProfile('Ema', 'sk');
    p.progress.wardrobeSeconds = 5;
    spendWardrobe(p, 3);
    expect(p.progress.wardrobeSeconds).toBe(2);
    spendWardrobe(p, 3);
    expect(p.progress.wardrobeSeconds).toBe(0);
  });

  it('shows a smile, then a number dropping every 10 s', () => {
    expect(countdownFace(91)).toBe('smile');
    expect(countdownFace(90)).toBe(9);
    expect(countdownFace(81)).toBe(9);
    expect(countdownFace(80)).toBe(8);
    expect(countdownFace(11)).toBe(2);
    expect(countdownFace(10)).toBe(1);
    expect(countdownFace(1)).toBe(1);
  });

  it('tells the minutes of practice still needed', () => {
    const p = newProfile('Ema', 'sk');
    expect(practiceToOpen(p)).toBe(5);
    p.progress.wardrobeSeconds = 30;
    expect(practiceToOpen(p)).toBe(3);
    p.progress.wardrobeSeconds = 59.99;
    expect(practiceToOpen(p)).toBe(1);
    p.progress.wardrobeSeconds = 60;
    expect(practiceToOpen(p)).toBe(0);
  });
});
