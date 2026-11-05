import { describe, expect, it } from 'vitest';
import { codeOfName, keyName } from './key-names';
import { LAYOUTS } from './layouts';

const sk = LAYOUTS['sk-qwertz'];

describe('key names', () => {
  it('names a key by two characters: a word, the plain range of its row, or the end of the range and how many keys further out', () => {
    const name = (code: string) => keyName(sk, code);
    expect(['KeyR', 'KeyY', 'KeyZ', 'Digit5', 'ShiftLeft', 'ShiftRight', 'CapsLock', 'Space', 'Enter', 'EnterTop', 'Backspace'].map(name))
      .toEqual(['r0', 'y0', 'z0', '50', 'ls', 'rs', 'cp', 'sp', 'el', 'el', 'bk']);
    expect(['Backquote', 'Minus', 'Equal', 'BracketLeft', 'BracketRight', 'Semicolon', 'Quote', 'Backslash', 'Comma', 'Slash'].map(name))
      .toEqual(['11', '01', '02', 'p1', 'p2', 'l1', 'l2', 'l3', 'm1', 'm3']);
    // The English keyboard's backslash sits in the top row.
    expect(keyName(LAYOUTS['us-qwerty'], 'Backslash')).toBe('p3');
    // Its Enter is flat in the home row, nearer than the Slovak L-shaped one: a pose of its own.
    expect(keyName(LAYOUTS['us-qwerty'], 'Enter')).toBe('en');
    for (const row of sk.rows) for (const d of row) expect(name(d.code)).toMatch(/^[a-z0-9]{2}$/);
  });

  it('finds the key of a name on each layout, none for a key the layout lacks', () => {
    expect(codeOfName(sk, 'l1')).toBe('Semicolon');
    expect(codeOfName(sk, '70')).toBe('Digit7');
    expect(codeOfName(LAYOUTS['us-qwerty'], 'l3')).toBeNull();
  });
});
