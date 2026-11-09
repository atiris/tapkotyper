import { describe, expect, it } from 'vitest';
import { newProfile } from '../storage/store';
import { accessoryShown, expireSecrets, grantSecret, hasAccessory, nextSecret } from './rewards';

const DAY = 86_400_000;

describe('secret beards', () => {
  it('are hidden until found, then the big beard replaces the small one', () => {
    const p = newProfile('Ema', 'sk');
    expect(accessoryShown(p, 'beard')).toBe(false);
    expect(accessoryShown(p, 'cap')).toBe(true);
    expect(nextSecret(p)).toEqual(['beard', 15]);
    grantSecret(p, 'beard', 0);
    p.companion.accessories = ['beard'];
    expect(accessoryShown(p, 'beard')).toBe(true);
    expect(nextSecret(p)).toEqual(['big-beard', 30]);
    grantSecret(p, 'big-beard', DAY);
    expect(hasAccessory(p, 'beard')).toBe(false);
    expect(hasAccessory(p, 'big-beard')).toBe(true);
    expect(p.companion.accessories).toEqual([]);
    expect(nextSecret(p)).toBeNull();
  });

  it('leave the wardrobe and the character a month after the find', () => {
    const p = newProfile('Ema', 'sk');
    grantSecret(p, 'beard', 0);
    p.companion.accessories = ['cap', 'beard'];
    expect(expireSecrets(p, 29 * DAY)).toBe(false);
    expect(expireSecrets(p, 30 * DAY)).toBe(true);
    expect(hasAccessory(p, 'beard')).toBe(false);
    expect(p.companion.accessories).toEqual(['cap']);
    expect(p.progress.beardAt).toBeNull();
    expect(expireSecrets(p, 90 * DAY)).toBe(false);
  });
});
