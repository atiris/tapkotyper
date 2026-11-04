import { describe, expect, it } from 'vitest';
import { fingerOf, fingered } from './fingers';
import { LAYOUTS, fingerFor, keyByCode, sameCharacters, shiftKeyFor } from './layouts';

describe('fingerings', () => {
  const sk = LAYOUTS['sk-qwerty'];

  it('moves the digit row one finger over in the ergonomic fingering, every other key stays', () => {
    const digit = (code: string) => fingerOf(keyByCode(sk, code)!, 'ergonomic');
    expect(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'].map(digit)).toEqual([0, 0, 1, 2, 3, 3, 6, 6, 7, 8]);
    expect(['Digit1', 'Digit2', 'Digit6', 'Digit0'].map((c) => fingerOf(keyByCode(sk, c)!, 'standard'))).toEqual([0, 1, 6, 9]);
    expect(fingerOf(keyByCode(sk, 'KeyR')!, 'ergonomic')).toBe(3);
  });

  it('tells layouts that type the same characters on other keys', () => {
    expect(sameCharacters(LAYOUTS['sk-qwertz'], LAYOUTS['sk-qwerty'])).toBe(true);
    expect(sameCharacters(LAYOUTS['sk-qwerty'], LAYOUTS['us-qwerty'])).toBe(false);
  });

  it('gives a layout whose keys carry the fingering, the same object each time', () => {
    const ergo = fingered(sk, 'ergonomic');
    expect(fingered(sk, 'ergonomic')).toBe(ergo);
    expect(fingered(sk, 'standard')).toBe(sk);
    expect(keyByCode(ergo, 'Digit6')!.finger).toBe(3);
    expect(keyByCode(sk, 'Digit6')!.finger).toBe(6);
    // What reads a key's finger follows: the finger of ž (on 6) and the Shift of the other hand.
    expect(fingerFor(ergo, 'ž')).toBe(3);
    expect(shiftKeyFor(ergo, { code: 'Digit6', shift: true })).toBe('ShiftRight');
    expect(shiftKeyFor(sk, { code: 'Digit6', shift: true })).toBe('ShiftLeft');
  });
});
