import { describe, expect, it } from 'vitest';
import { TypingCore, memoryFlash, memoryShow } from './typing';
import { starsFor } from './levels';

describe('TypingCore', () => {
  it('locks on the first letter and finishes the word', () => {
    const c = new TypingCore();
    const t = c.add('jas');
    expect(c.type('j').kind).toBe('ok');
    expect(c.locked).toBe(t);
    c.type('a');
    expect(c.type('s').kind).toBe('done');
    expect(t.done).toBe(true);
    expect(c.locked).toBeNull();
  });

  it('a wrong letter never unlocks or resets the word', () => {
    const c = new TypingCore();
    const t = c.add('fjf');
    c.type('f');
    const r = c.type('d');
    expect(r.kind).toBe('wrong');
    expect(c.locked).toBe(t);
    expect(t.typed).toBe(1);
    expect(t.errors).toBe(1);
  });

  it('picks the most urgent target when first letters match', () => {
    const c = new TypingCore();
    const far = c.add('ja');
    const near = c.add('jo');
    far.urgency = 1;
    near.urgency = 5;
    c.type('j');
    expect(c.locked).toBe(near);
    expect(c.expectedChar()).toBe('o');
  });

  it('ignores targets that are not selectable', () => {
    const c = new TypingCore();
    c.add('kk', {}, false);
    expect(c.type('k').kind).toBe('wrong');
    expect(c.expectedChar()).toBeNull();
  });

  it('lets a target go without penalty', () => {
    const c = new TypingCore();
    const t = c.add('dom');
    c.type('d');
    c.release(t);
    expect(c.locked).toBeNull();
    expect(c.active).toHaveLength(0);
  });
});

describe('styles', () => {
  it('a mixed run dictates and remembers its targets in turns', () => {
    const c = new TypingCore();
    c.style = 'mixed';
    const styles = ['les', 'dom', 'sad', 'kde'].map((w) => c.add(w).style);
    expect(styles).toEqual(['dictation', 'memory', 'dictation', 'memory']);
    const [heard, remembered] = c.targets;
    c.update(0.01);
    // Only the remembered one shows its letters first; the heard one types at once.
    expect(c.letters(remembered)).toBe(true);
    expect(c.letters(heard)).toBe(false);
    expect(c.typable(heard)).toBe(true);
    expect(c.typable(remembered)).toBe(false);
  });

  it('dictation hides the letters and a wrong key reveals the whole target for good', () => {
    const c = new TypingCore();
    c.style = 'dictation';
    const t = c.add('les');
    expect(c.letters(t)).toBe(false);
    expect(c.shownChar()).toBeNull();
    expect(c.type('l').kind).toBe('ok');
    expect(c.type('x').kind).toBe('wrong');
    expect(t.revealed).toBe(true);
    expect(c.letters(t)).toBe(true);
    expect(c.shownChar()).toBe('e');
    c.update(10);
    expect(c.letters(t)).toBe(true);
  });

  it('memory ignores keys while the target shows, then hides it', () => {
    const c = new TypingCore();
    c.style = 'memory';
    c.difficulty = 5;
    const t = c.add('mak');
    expect(c.type('m').kind).toBe('ignored');
    c.update(0.016);
    expect(c.letters(t)).toBe(true);
    expect(c.type('m').kind).toBe('ignored');
    expect(t.errors).toBe(0);
    expect(t.typed).toBe(0);
    c.update(memoryShow(3, 5));
    expect(c.letters(t)).toBe(false);
    expect(c.type('m').kind).toBe('ok');
  });

  it('a wrong key in memory flashes the target again and keeps the progress', () => {
    const c = new TypingCore();
    c.style = 'memory';
    const t = c.add('mak');
    c.update(0.016);
    c.update(10);
    c.type('m');
    expect(c.type('x').kind).toBe('wrong');
    expect(t.typed).toBe(1);
    expect(t.revealed).toBe(true);
    expect(c.letters(t)).toBe(true);
    expect(c.type('a').kind).toBe('ignored');
    c.update(memoryFlash(3));
    expect(c.letters(t)).toBe(false);
    expect(c.type('a').kind).toBe('ok');
    expect(t.typed).toBe(2);
  });

  it('memory shows shorter at a higher difficulty, never below its floor', () => {
    expect(memoryShow(5, 9)).toBeLessThan(memoryShow(5, 1));
    expect(memoryShow(5, 20)).toBeCloseTo(0.8 + 0.15 * 5);
  });

  it('the paw reveals a hidden target and can type it at once', () => {
    const c = new TypingCore();
    c.style = 'memory';
    const t = c.add('mak');
    c.reveal(t);
    expect(c.type('m').kind).toBe('ok');
  });
});

describe('stars', () => {
  it('rewards accuracy and always gives at least one', () => {
    expect(starsFor(1)).toBe(3);
    expect(starsFor(0.9)).toBe(2);
    expect(starsFor(0.2)).toBe(1);
  });
});
