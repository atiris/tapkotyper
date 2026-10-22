import { describe, expect, it } from 'vitest';
import { LAYOUTS, LayoutMismatchDetector, fingerFor, stepsFor } from './layouts';

const sk = LAYOUTS['sk-qwertz'];
const us = LAYOUTS['us-qwerty'];

describe('layouts', () => {
  it('maps home row fingers', () => {
    expect(fingerFor(sk, 'f')).toBe(3);
    expect(fingerFor(sk, 'j')).toBe(6);
    expect(fingerFor(sk, 'a')).toBe(0);
    expect(fingerFor(sk, 'ô')).toBe(9);
    expect(fingerFor(us, ';')).toBe(9);
  });

  it('swaps y and z on the Slovak layout', () => {
    expect(stepsFor(sk, 'z')).toEqual([{ code: 'KeyY', shift: false }]);
    expect(stepsFor(us, 'z')).toEqual([{ code: 'KeyZ', shift: false }]);
    expect(fingerFor(sk, 'z')).toBe(6);
  });

  it('puts ľ š č ť on the number row and digits on Shift', () => {
    expect(stepsFor(sk, 'š')).toEqual([{ code: 'Digit3', shift: false }]);
    expect(stepsFor(sk, '3')).toEqual([{ code: 'Digit3', shift: true }]);
  });

  it('types ó and ď with two steps (dead keys)', () => {
    expect(stepsFor(sk, 'ó')).toEqual([{ code: 'Equal', shift: false }, { code: 'KeyO', shift: false }]);
    expect(stepsFor(sk, 'ď')).toEqual([{ code: 'Equal', shift: true }, { code: 'KeyD', shift: false }]);
    expect(stepsFor(sk, 'Č')).toEqual([{ code: 'Equal', shift: true }, { code: 'KeyC', shift: true }]);
  });

  it('cannot type Slovak letters on the US layout', () => {
    expect(stepsFor(us, 'ľ')).toEqual([]);
  });

  it('detects a US keyboard on a Slovak profile', () => {
    const d = new LayoutMismatchDetector('sk-qwertz');
    expect(d.observe('Digit2', '2', false)).toBeNull();
    expect(d.observe('Digit3', '3', false)).toBeNull();
    expect(d.observe('Digit4', '4', false)).toBe('us-qwerty');
  });

  it('detects Slovak QWERTY on a Slovak QWERTZ profile', () => {
    const d = new LayoutMismatchDetector('sk-qwertz');
    expect(d.observe('KeyY', 'y', false)).toBeNull();
    expect(d.observe('KeyZ', 'z', false)).toBeNull();
    expect(d.observe('KeyY', 'y', false)).toBe('sk-qwerty');
  });

  it('types y and z in the English places on Slovak QWERTY', () => {
    const skq = LAYOUTS['sk-qwerty'];
    expect(stepsFor(skq, 'z')).toEqual([{ code: 'KeyZ', shift: false }]);
    expect(stepsFor(skq, 'ž')).toEqual([{ code: 'Digit6', shift: false }]);
  });

  it('does not complain when the layout matches', () => {
    const d = new LayoutMismatchDetector('sk-qwertz');
    for (let i = 0; i < 10; i++) expect(d.observe('KeyY', 'z', false)).toBeNull();
  });
});
