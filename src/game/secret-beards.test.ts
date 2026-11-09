import { describe, expect, it } from 'vitest';
import { newProfile } from '../storage/store';
import { accessoryShown, expireSecrets, grantSecret, hasAccessory, nextSecret } from './rewards';

const DAY = 86_400_000;

describe('secret moustache and beard', () => {
  it('are hidden until found, then the big beard replaces the moustache', () => {
    const p = newProfile('Ema', 'sk');
    expect(accessoryShown(p, 'moustache')).toBe(false);
    expect(accessoryShown(p, 'cap')).toBe(true);
    expect(nextSecret(p)).toEqual(['moustache', 15]);
    grantSecret(p, 'moustache', 0);
    p.companion.accessories = ['moustache'];
    expect(accessoryShown(p, 'moustache')).toBe(true);
    expect(nextSecret(p)).toEqual(['big-beard', 30]);
    grantSecret(p, 'big-beard', DAY);
    expect(hasAccessory(p, 'moustache')).toBe(false);
    expect(hasAccessory(p, 'big-beard')).toBe(true);
    expect(p.companion.accessories).toEqual([]);
    expect(nextSecret(p)).toBeNull();
  });

  it('leave the wardrobe and the character a month after the find', () => {
    const p = newProfile('Ema', 'sk');
    grantSecret(p, 'moustache', 0);
    p.companion.accessories = ['cap', 'moustache'];
    expect(expireSecrets(p, 29 * DAY)).toBe(false);
    expect(expireSecrets(p, 30 * DAY)).toBe(true);
    expect(hasAccessory(p, 'moustache')).toBe(false);
    expect(p.companion.accessories).toEqual(['cap']);
    expect(p.progress.beardAt).toBeNull();
    expect(expireSecrets(p, 90 * DAY)).toBe(false);
  });
});
