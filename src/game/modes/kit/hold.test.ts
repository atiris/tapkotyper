import { describe, expect, it } from 'vitest';
import { fingered } from '../../../keyboard/fingers';
import { LAYOUTS } from '../../../keyboard/layouts';
import { HoldRun, handKeys, holdRounds, holdsSeveral } from './hold';

const SK = fingered(LAYOUTS['sk-qwertz'], 'ergonomic');
const HOME = ['f', 'j', 'd', 'k', 's', 'l', 'a', 'ô', ' '];
const MORE = [...HOME, 'g', 'h', 'r', 'u', 't', 'z', 'v', 'n', 'e', 'i'];

describe('one hand\'s keys', () => {
  it('splits letters by the hand that types them', () => {
    expect(handKeys(MORE, SK, 'left')).toEqual(['f', 'd', 's', 'a', 'g', 'r', 't', 'v', 'e']);
    expect(handKeys(MORE, SK, 'right')).toEqual(['j', 'k', 'l', 'ô', 'h', 'u', 'z', 'n', 'i']);
  });

  it('leaves out letters that need the other hand (an accent key, Shift) and the space bar', () => {
    expect(handKeys(['a', 'á', 'A', ' '], SK, 'left')).toEqual(['a']);
  });

  it('keeps one finger\'s keys when asked', () => {
    expect(handKeys(MORE, SK, 'left', 3)).toEqual(['f', 'g', 'r', 't', 'v']);
  });
});

describe('sticky rounds', () => {
  it('need four letter keys of each hand, F and J among them', () => {
    expect(holdRounds(['f', 'j', 'd', 'k', 's', 'l'], SK, null)).toBeNull();
    expect(holdRounds(['d', 'k', 's', 'l', 'a', 'ô', 'e', 'i'], SK, null)).toBeNull();
    const rounds = holdRounds(HOME, SK, null)!;
    expect(rounds.map((r) => [r.hold, r.side])).toEqual([[['KeyJ'], 'left'], [['KeyF'], 'right']]);
    expect(rounds[0].keys).toEqual(['f', 'd', 's', 'a']);
  });

  it('hold the other home keys while the index finger types once it has enough keys', () => {
    const rounds = holdRounds(MORE, SK, null)!;
    expect(rounds.slice(2).map((r) => [r.hold, r.side, r.keys])).toEqual([
      [['KeyD', 'KeyS', 'KeyA'], 'left', ['f', 'g', 'r', 't', 'v']],
      [['KeyK', 'KeyL', 'Semicolon'], 'right', ['j', 'h', 'u', 'z', 'n']],
    ]);
    expect(holdsSeveral(rounds)).toBe(true);
  });

  it('hold fewer keys when the keyboard reports fewer at once', () => {
    expect(holdRounds(MORE, SK, 3)!.slice(2).map((r) => r.hold)).toEqual([['KeyD', 'KeyS'], ['KeyK', 'KeyL']]);
    const two = holdRounds(MORE, SK, 2)!;
    expect(two.slice(2).map((r) => r.hold)).toEqual([['KeyD'], ['KeyK']]);
    expect(holdsSeveral(two)).toBe(false);
  });
});

describe('a sticky run', () => {
  const rounds = holdRounds(HOME, SK, null)!;

  it('waits until the round\'s key is held, and the wait does not count', () => {
    const run = new HoldRun(rounds, 10);
    expect(run.waiting).toBe(true);
    run.tick(5);
    expect(run.played).toBe(0);
    run.held(new Set(['KeyJ']));
    expect(run.waiting).toBe(false);
    run.tick(4);
    run.held(new Set());
    run.tick(30);
    expect(run.played).toBe(4);
  });

  it('a held key is no typed key, the other hand\'s are', () => {
    const run = new HoldRun(rounds, 10);
    expect(run.holds('KeyJ')).toBe(true);
    expect(run.holds('KeyF')).toBe(false);
  });

  it('takes the next round between targets once the round has lasted its time', () => {
    const run = new HoldRun(rounds, 10);
    run.held(new Set(['KeyJ']));
    run.tick(6);
    expect(run.atTarget()).toBe(false);
    run.tick(5);
    expect(run.atTarget()).toBe(true);
    expect(run.current.hold).toEqual(['KeyF']);
    expect(run.current.side).toBe('right');
    // J is still down, F is not yet: the new round waits.
    expect(run.waiting).toBe(true);
    expect(run.played).toBe(0);
    run.held(new Set(['KeyF']));
    run.tick(10);
    expect(run.atTarget()).toBe(true);
    expect(run.round).toBe(0);
  });
});
