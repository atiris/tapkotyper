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

  it('names a pose by its key: a word, the plain range of its row, or the end of the range and how many keys further out', () => {
    const name = (code: string) => poseName(sk, code);
    expect(['KeyR', 'KeyY', 'KeyZ', 'Digit5', 'ShiftLeft', 'ShiftRight', 'CapsLock', 'Space', 'Enter', 'EnterTop', 'Backspace'].map(name))
      .toEqual(['r', 'z', 'y', '5', 'lshi', 'rshi', 'caps', 'spac', 'ente', 'ente', 'back']);
    expect(['Backquote', 'Minus', 'Equal', 'BracketLeft', 'BracketRight', 'Semicolon', 'Quote', 'Backslash', 'Comma', 'Slash'].map(name))
      .toEqual(['11', '01', '02', 'p1', 'p2', 'l1', 'l2', 'l3', 'm1', 'm3']);
    // The English keyboard's backslash sits in the top row.
    expect(poseName(LAYOUTS['us-qwerty'], 'Backslash')).toBe('p3');
    for (const row of sk.rows) for (const d of row) expect(name(d.code)).toMatch(/^[a-z0-9]{1,4}$/);
  });

  it('poses the typing hand, the other hand on Shift for a capital, the other one at home', () => {
    expect(poseNames(sk, null, null)).toEqual({ left: 'home', right: 'home' });
    expect(poseNames(sk, { code: 'KeyU', shift: false }, null)).toEqual({ left: 'home', right: 'u' });
    expect(poseNames(sk, { code: 'KeyR', shift: true }, null)).toEqual({ left: 'r', right: 'rshi' });
  });

  it('the space bar takes the thumb of the hand that did not type the key before', () => {
    expect(poseNames(sk, { code: 'Space', shift: false }, 'left')).toEqual({ left: 'home', right: 'spac' });
    expect(poseNames(sk, { code: 'Space', shift: false }, 'right')).toEqual({ left: 'spac', right: 'home' });
  });

  it('every listed outline is there and reads as lines', () => {
    const index = JSON.parse(readFileSync('public/hands/index.json', 'utf8')) as HandIndex;
    for (const side of ['left', 'right'] as const) {
      expect(index[side]).toContain('home');
      for (const name of index[side]) expect(readHandSvg(readFileSync(`public/hands/${side}/${name}.svg`, 'utf8')).lines).toMatch(/^M/);
    }
  });
});
