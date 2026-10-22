import { describe, expect, it } from 'vitest';
import { LINE_MAX, LINE_PAUSE, TypedLine } from './typed-line';

describe('TypedLine', () => {
  it('collects keys and gives the text after the pause', () => {
    const l = new TypedLine();
    for (const ch of 'mama') l.add(ch);
    expect(l.tick(LINE_PAUSE - 0.1)).toBeNull();
    expect(l.tick(0.2)).toBe('mama');
    expect(l.text).toBe('');
    expect(l.tick(5)).toBeNull();
  });

  it('a key restarts the pause', () => {
    const l = new TypedLine();
    l.add('a');
    l.tick(1);
    l.add('b');
    expect(l.tick(1)).toBeNull();
    expect(l.tick(0.6)).toBe('ab');
  });

  it('backspace removes the last character', () => {
    const l = new TypedLine();
    for (const ch of 'pesž') l.add(ch);
    l.erase();
    expect(l.text).toBe('pes');
    l.erase(); l.erase(); l.erase(); l.erase();
    expect(l.text).toBe('');
    expect(l.tick(LINE_PAUSE)).toBeNull();
  });

  it('trims spaces and gives nothing for spaces only', () => {
    const l = new TypedLine();
    for (const ch of '  ahoj   Tapko ') l.add(ch);
    expect(l.take()).toBe('ahoj Tapko');
    l.add(' ');
    expect(l.tick(LINE_PAUSE)).toBeNull();
  });

  it('a full line is given when the next key comes', () => {
    const l = new TypedLine();
    for (let i = 0; i < LINE_MAX; i++) expect(l.add('a')).toBeNull();
    expect(l.add('b')).toBe('a'.repeat(LINE_MAX));
    expect(l.text).toBe('b');
  });
});
