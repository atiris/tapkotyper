import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LAYOUTS } from '../keyboard/layouts';
import { type HandIndex, poseName, readHandSvg } from './hand-svg';
import { handOf, keyMiddle, poseNames } from './hands';

const sk = LAYOUTS['sk-qwertz'];

describe('hands', () => {
  it('finds a key on the real 15-unit grid in full size units', () => {
    expect(keyMiddle(sk, 'KeyQ')).toEqual([1.5 * 58 + 27, 50 + 23]);
    expect(keyMiddle(sk, 'KeyJ')).toEqual([1.75 * 58 + 6 * 58 + 27, 100 + 23]);
    expect(keyMiddle(sk, 'Nope')).toBeNull();
  });

  it('tells the hand of a key; the space bar is the thumbs\'', () => {
    expect(handOf(sk, 'KeyF')).toBe('left');
    expect(handOf(sk, 'KeyU')).toBe('right');
    expect(handOf(sk, 'Space')).toBeNull();
  });

  it('names a pose by its key in small letters, a sign by its word', () => {
    expect(['KeyR', 'Digit5', 'Semicolon', 'ShiftLeft', 'ShiftRight', 'CapsLock', 'Space'].map(poseName)).toEqual(['r', '5', 'semi', 'lsft', 'rsft', 'caps', 'spc']);
    for (const row of sk.rows) for (const d of row) expect(poseName(d.code)).toMatch(/^[a-z0-9]{1,4}$/);
  });

  it('poses the typing hand, the other hand on Shift for a capital, the other one at home', () => {
    expect(poseNames(sk, null, null)).toEqual({ left: 'home', right: 'home' });
    expect(poseNames(sk, { code: 'KeyU', shift: false }, null)).toEqual({ left: 'home', right: 'u' });
    expect(poseNames(sk, { code: 'KeyR', shift: true }, null)).toEqual({ left: 'r', right: 'rsft' });
  });

  it('the space bar takes the thumb of the hand that did not type the key before', () => {
    expect(poseNames(sk, { code: 'Space', shift: false }, 'left')).toEqual({ left: 'home', right: 'spc' });
    expect(poseNames(sk, { code: 'Space', shift: false }, 'right')).toEqual({ left: 'spc', right: 'home' });
  });

  it('every listed outline is there and reads as lines', () => {
    const index = JSON.parse(readFileSync('public/hands/index.json', 'utf8')) as HandIndex;
    for (const side of ['left', 'right'] as const) {
      expect(index[side]).toContain('home');
      for (const name of index[side]) expect(readHandSvg(readFileSync(`public/hands/${side}/${name}.svg`, 'utf8')).lines).toMatch(/^M/);
    }
  });
});
