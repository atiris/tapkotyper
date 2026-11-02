import { describe, expect, it } from 'vitest';
import { LAYOUTS } from '../keyboard/layouts';
import { handOf, keyCenter, posesFor } from './hands';

const sk = LAYOUTS['sk-qwertz'];

describe('hands', () => {
  it('finds a key on the real 15-unit grid in full size units', () => {
    expect(keyCenter(sk, 'KeyQ')).toEqual([1.5 * 58 + 27, 50 + 23]);
    expect(keyCenter(sk, 'KeyJ')).toEqual([1.75 * 58 + 6 * 58 + 27, 100 + 23]);
    expect(keyCenter(sk, 'Space')).toEqual([3.75 * 58 + (6.25 * 58 - 4) / 2, 200 + 23]);
    expect(keyCenter(sk, 'Nope')).toBeNull();
  });

  it('tells the hand of a key; the space bar is the thumbs\'', () => {
    expect(handOf(sk, 'KeyF')).toBe('left');
    expect(handOf(sk, 'KeyU')).toBe('right');
    expect(handOf(sk, 'Space')).toBeNull();
  });

  it('poses the hand of the key, and the other hand on its Shift for a capital, only where a pose exists', () => {
    const have = (codes: string[]) => (code: string) => codes.includes(code);
    expect(posesFor(sk, { code: 'KeyU', shift: false }, have(['KeyU']))).toEqual({ left: null, right: 'KeyU' });
    expect(posesFor(sk, { code: 'KeyU', shift: true }, have(['KeyU', 'ShiftLeft']))).toEqual({ left: 'ShiftLeft', right: 'KeyU' });
    expect(posesFor(sk, { code: 'KeyM', shift: false }, have(['KeyU']))).toEqual({ left: null, right: null });
    expect(posesFor(sk, null, have(['KeyU']))).toEqual({ left: null, right: null });
  });
});
