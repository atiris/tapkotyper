import { describe, expect, it } from 'vitest';
import { LAYOUTS, LayoutMismatchDetector, allKeys, canType, diacritics, fingerFor, hasDeadKeys, homeKey, keyByCode, lettersOnDigitRow, pinkyLetters, rowPresets, sameCharacters, stepsFor, swapsYZ } from './layouts';

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

  it('knows the key each finger rests on', () => {
    const sk = LAYOUTS['sk-qwertz'];
    expect([0, 1, 2, 3, 6, 7, 8, 9].map((f) => homeKey(sk, f as 0))).toEqual(['a', 's', 'd', 'f', 'j', 'k', 'l', 'ô']);
    expect(homeKey(sk, 4)).toBeNull();
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

  it('tells what a layout has', () => {
    const skY = LAYOUTS['sk-qwerty'];
    expect([sk, skY, us].map(hasDeadKeys)).toEqual([true, true, false]);
    expect([sk, skY, us].map(swapsYZ)).toEqual([true, false, false]);
    expect(lettersOnDigitRow(sk).join('')).toBe('ľščťžýáíé');
    expect(lettersOnDigitRow(us)).toEqual([]);
    expect(pinkyLetters(sk).join('')).toBe('úäôň');
    expect(pinkyLetters(us)).toEqual([]);
    expect([...diacritics(sk)].sort().join('')).toBe([...'áäčďéíĺľňóôŕšťúýž'].sort().join(''));
    expect(diacritics(us).size).toBe(0);
  });

  it('gives the row presets of each layout', () => {
    expect(rowPresets(sk)).toEqual({ home: 'fjdkslaô', top: 'qwertzuiop', bottom: 'yxcvbnm' });
    expect(rowPresets(LAYOUTS['sk-qwerty'])).toEqual({ home: 'fjdkslaô', top: 'qwertyuiop', bottom: 'zxcvbnm' });
    expect(rowPresets(us)).toEqual({ home: 'fjdksla;', top: 'qwertyuiop', bottom: 'zxcvbnm' });
    expect(rowPresets(cz)).toEqual({ home: 'fjdkslaů', top: 'qwertzuiop', bottom: 'yxcvbnm' });
    expect(rowPresets(czY)).toEqual({ home: 'fjdkslaů', top: 'qwertyuiop', bottom: 'zxcvbnm' });
  });
});

const cz = LAYOUTS['cz-qwertz'];
const czY = LAYOUTS['cz-qwerty'];

describe('Czech layouts', () => {
  it('type every Czech letter, small and capital', () => {
    for (const l of [cz, czY]) for (const ch of 'aábcčdďeéěfghiíjklmnňoópqrřsštťuúůvwxyýzž') {
      expect(canType(l, ch), ch).toBe(true);
      expect(canType(l, ch.toUpperCase()), ch.toUpperCase()).toBe(true);
    }
  });

  it('put ě and ř on the digit row and the Slovak fingers on the same keys', () => {
    expect(stepsFor(cz, 'ě')).toEqual([{ code: 'Digit2', shift: false }]);
    expect(stepsFor(cz, 'ř')).toEqual([{ code: 'Digit5', shift: false }]);
    expect(stepsFor(cz, '2')).toEqual([{ code: 'Digit2', shift: true }]);
    expect(lettersOnDigitRow(cz).join('')).toBe('ěščřžýáíé');
    for (const d of allKeys(cz)) expect(d.finger, d.code).toBe(keyByCode(sk, d.code)!.finger);
    expect(homeKey(cz, 9)).toBe('ů');
    expect(pinkyLetters(cz).join('')).toBe('úů');
  });

  it('type the dead-key letters in two steps, Ů through the ring on Shift left of 1', () => {
    expect(stepsFor(cz, 'ď')).toEqual([{ code: 'Equal', shift: true }, { code: 'KeyD', shift: false }]);
    expect(stepsFor(cz, 'ó')).toEqual([{ code: 'Equal', shift: false }, { code: 'KeyO', shift: false }]);
    expect(stepsFor(cz, 'Ě')).toEqual([{ code: 'Equal', shift: true }, { code: 'KeyE', shift: true }]);
    expect(stepsFor(cz, 'Ů')).toEqual([{ code: 'Backquote', shift: true }, { code: 'KeyU', shift: true }]);
    expect(stepsFor(cz, ')')).toEqual([{ code: 'BracketRight', shift: false }]);
    expect(canType(cz, 'ľ')).toBe(false);
  });

  it('differ only by Y and Z', () => {
    expect(sameCharacters(cz, czY)).toBe(true);
    expect(sameCharacters(cz, sk)).toBe(false);
    expect([cz, czY].map(swapsYZ)).toEqual([true, false]);
    expect(stepsFor(czY, 'z')).toEqual([{ code: 'KeyZ', shift: false }]);
  });

  it('tell a Czech keyboard on a Slovak profile and back', () => {
    const onSk = new LayoutMismatchDetector('sk-qwertz');
    expect(onSk.observe('Digit2', 'ě', false)).toBeNull();
    expect(onSk.observe('Digit5', 'ř', false)).toBeNull();
    expect(onSk.observe('Semicolon', 'ů', false)).toBe('cz-qwertz');
    const onCz = new LayoutMismatchDetector('cz-qwertz');
    expect(onCz.observe('Digit2', 'ľ', false)).toBeNull();
    expect(onCz.observe('Digit5', 'ť', false)).toBeNull();
    expect(onCz.observe('Semicolon', 'ô', false)).toBe('sk-qwertz');
  });
});
