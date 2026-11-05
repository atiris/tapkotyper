import { describe, expect, it } from 'vitest';
import { KeyInput, type TypedChar } from './input';

/** A keyboard event as the browser gives it, enough for KeyInput. */
function key(type: 'keydown' | 'keyup', code: string, k: string, repeat = false): Event {
  return Object.assign(new Event(type), { code, key: k, repeat, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, isComposing: false });
}

function setup(holds: (code: string) => boolean = () => false) {
  const target = new EventTarget();
  const typed: string[] = [];
  const holdsSeen: string[][] = [];
  const input = new KeyInput(target, {
    onChar: (c: TypedChar) => typed.push(c.ch),
    onHold: (held) => holdsSeen.push([...held]),
    holds,
  });
  return { target, input, typed, holdsSeen };
}

describe('held keys', () => {
  it('a key is held from its keydown to its keyup', () => {
    const { target, input, holdsSeen } = setup();
    target.dispatchEvent(key('keydown', 'KeyJ', 'j'));
    expect([...input.held]).toEqual(['KeyJ']);
    target.dispatchEvent(key('keyup', 'KeyJ', 'j'));
    expect(input.held.size).toBe(0);
    expect(holdsSeen).toEqual([['KeyJ'], []]);
  });

  it('repeats of a held key change nothing and type nothing', () => {
    const { target, input, typed, holdsSeen } = setup();
    target.dispatchEvent(key('keydown', 'KeyF', 'f'));
    target.dispatchEvent(key('keydown', 'KeyF', 'f', true));
    target.dispatchEvent(key('keydown', 'KeyF', 'f', true));
    expect(typed).toEqual(['f']);
    expect(holdsSeen).toHaveLength(1);
    expect([...input.held]).toEqual(['KeyF']);
  });

  it('a repeat of a key pressed before the listener came counts as held', () => {
    const { target, input, typed } = setup();
    target.dispatchEvent(key('keydown', 'KeyJ', 'j', true));
    expect([...input.held]).toEqual(['KeyJ']);
    expect(typed).toEqual([]);
  });

  it('losing the window lets every key go', () => {
    const { target, input, holdsSeen } = setup();
    target.dispatchEvent(key('keydown', 'KeyA', 'a'));
    target.dispatchEvent(key('keydown', 'KeyS', 's'));
    target.dispatchEvent(new Event('blur'));
    expect(input.held.size).toBe(0);
    expect(holdsSeen.at(-1)).toEqual([]);
  });

  it('a key the run asks to hold never reaches onChar', () => {
    const { target, input, typed } = setup((code) => code === 'KeyJ');
    target.dispatchEvent(key('keydown', 'KeyJ', 'j'));
    target.dispatchEvent(key('keydown', 'KeyA', 'a'));
    expect(typed).toEqual(['a']);
    expect(input.held.has('KeyJ')).toBe(true);
  });
});
