import { describe, expect, it } from 'vitest';
import { newProfile } from '../storage/store';
import { recordSession } from './stats';

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
