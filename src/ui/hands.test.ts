import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LAYOUTS } from '../keyboard/layouts';
import { type HandIndex, POSE_NAME, keyName, poseName, readHandSvg } from './hand-svg';
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

  it('names a key by two characters: a word, the plain range of its row, or the end of the range and how many keys further out', () => {
    const name = (code: string) => keyName(sk, code);
    expect(['KeyR', 'KeyY', 'KeyZ', 'Digit5', 'ShiftLeft', 'ShiftRight', 'CapsLock', 'Space', 'Enter', 'EnterTop', 'Backspace'].map(name))
      .toEqual(['r0', 'y0', 'z0', '50', 'ls', 'rs', 'cp', 'sp', 'en', 'en', 'bk']);
    expect(['Backquote', 'Minus', 'Equal', 'BracketLeft', 'BracketRight', 'Semicolon', 'Quote', 'Backslash', 'Comma', 'Slash'].map(name))
      .toEqual(['11', '01', '02', 'p1', 'p2', 'l1', 'l2', 'l3', 'm1', 'm3']);
    // The English keyboard's backslash sits in the top row.
    expect(keyName(LAYOUTS['us-qwerty'], 'Backslash')).toBe('p3');
    for (const row of sk.rows) for (const d of row) expect(name(d.code)).toMatch(/^[a-z0-9]{2}$/);
  });

  it('names a pose by the hand, the finger and the key; every pose of a lesson key is a valid name', () => {
    expect(poseName(sk, 'KeyF', 3)).toBe('l2f0');
    expect(poseName(sk, 'Space', 5)).toBe('r1sp');
    expect(poseName(sk, 'Digit2', 1)).toBe('l420');
    expect(poseName(sk, 'Digit2', 0)).toBe('l520');
    expect(poseName(sk, 'Backquote', 0)).toBe('l511');
    for (const row of sk.rows) for (const d of row) expect(poseName(sk, d.code, d.finger)).toMatch(POSE_NAME);
  });

  it('poses the typing hand, the other hand on Shift for a capital, the other one at home', () => {
    expect(poseNames(sk, null, null)).toEqual({ left: 'home', right: 'home' });
    expect(poseNames(sk, { code: 'KeyU', shift: false }, null)).toEqual({ left: 'home', right: 'r2u0' });
    expect(poseNames(sk, { code: 'KeyR', shift: true }, null)).toEqual({ left: 'l2r0', right: 'r5rs' });
  });

  it('the ergonomic scheme moves digit keys to another finger', () => {
    expect(poseNames(sk, { code: 'Digit2', shift: false }, null, 'standard').left).toBe('l420');
    expect(poseNames(sk, { code: 'Digit2', shift: false }, null, 'ergonomic').left).toBe('l520');
    expect(poseNames(sk, { code: 'Digit6', shift: false }, null, 'ergonomic')).toEqual({ left: 'l260', right: 'home' });
  });

  it('the space bar takes the thumb of the hand that did not type the key before', () => {
    expect(poseNames(sk, { code: 'Space', shift: false }, 'left')).toEqual({ left: 'home', right: 'r1sp' });
    expect(poseNames(sk, { code: 'Space', shift: false }, 'right')).toEqual({ left: 'l1sp', right: 'home' });
  });

  it('every listed outline is there and reads as lines', () => {
    const index = JSON.parse(readFileSync('public/hands/index.json', 'utf8')) as HandIndex;
    for (const side of ['left', 'right'] as const) {
      expect(index[side]).toContain('home');
      for (const name of index[side]) expect(readHandSvg(readFileSync(`public/hands/${side}/${name}.svg`, 'utf8')).lines).toMatch(/^M/);
    }
  });

  it('reads middle lines, their widths and the nails', () => {
    const svg = '<svg><path class="hand-nail" data-finger="3" d="M5 5 L6 6 Z" fill="#123456"/><path class="hand-creases" d="M0 0 L1 1" fill="none" stroke-width="1.2"/><path class="hand-lines" d="M2 2 L3 3" fill="none" stroke-width="2.6"/></svg>';
    expect(readHandSvg(svg)).toEqual({ lines: 'M2 2 L3 3', creases: 'M0 0 L1 1', stroke: 2.6, centerline: true, creaseStroke: 1.2, nails: [{ finger: 3, d: 'M5 5 L6 6 Z' }] });
  });
});
