import { describe, expect, it } from 'vitest';
import { Rng } from '../engine/rng';
import { LAYOUTS, homeKey } from '../keyboard/layouts';
import type { LayoutId } from '../storage/schema';
import { SHIFT_L, SHIFT_R, lessonGroups, lessonOrder, reactionLimit } from './lessons';
import {
  PlacementCheck, type PlacementPress, STAGE_MISSES, contrastGroup, contrastPairs, intervals, keyPasses, keySpot, offersPlacement, placementDifficulty,
  placementGroups, spearman, strongWeak, touchSignal,
} from './placement';

const SK: LayoutId = 'sk-qwertz';
const lay = LAYOUTS[SK];

describe('placement stages', () => {
  it('follow the lesson groups, the words from the first group, the passed keys and the stage', () => {
    expect(placementGroups(SK, false)).toEqual(lessonGroups(SK));
    const check = new PlacementCheck(SK, false, 3);
    expect(check.current).toEqual({ group: ['f', 'j', ' '], keys: ['f', 'j', ' '] });
    check.stage = 2;
    check.passed.push('f', 'j', ' ', 'k');
    expect(check.current).toEqual({ group: ['s', 'l'], keys: ['f', 'j', ' ', 'k', 's', 'l'] });
  });

  it('leave the diacritics out when the parent turned them off', () => {
    const groups = placementGroups(SK, true);
    expect(groups.some((g) => g.includes('á'))).toBe(false);
    expect(groups.length).toBe(lessonGroups(SK).length - 16);
  });
});

describe('key geometry', () => {
  it('puts keys on the staggered rows with their fingers', () => {
    expect(keySpot(lay, 'f')).toEqual({ x: 5.25, y: 2, finger: 3 });
    expect(keySpot(lay, 'r')).toEqual({ x: 5, y: 1, finger: 3 });
    expect(keySpot(lay, 'y')).toEqual({ x: 2.75, y: 3, finger: 0 });
    // A capital, a dead-key letter and the space bar are no single key.
    expect(keySpot(lay, 'F')).toBeNull();
    expect(keySpot(lay, 'ó')).toBeNull();
    expect(keySpot(lay, ' ')).toBeNull();
  });

  it('sorts pairs into near on one finger and far on two fingers', () => {
    expect(contrastGroup(lay, 'f', 'r')).toBe('near');
    expect(contrastGroup(lay, 'j', 'u')).toBe('near');
    expect(contrastGroup(lay, 'a', 'e')).toBe('far');
    // Both on their home keys, other hands, or the same key: neither.
    expect(contrastGroup(lay, 'a', 'f')).toBeNull();
    expect(contrastGroup(lay, 'f', 'j')).toBeNull();
    expect(contrastGroup(lay, 'r', 'r')).toBeNull();
    expect(contrastPairs(lay, 'fr ae')).toEqual({ near: 1, far: 1 });
  });

  it('ranks with ties and finds no correlation in a constant', () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1);
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1);
    expect(spearman([1, 1, 1], [1, 2, 3])).toBe(0);
  });
});

/** A synthetic typist: the ms from one key to the next in a word. */
type Model = (from: string, to: string) => number;

const spot = (ch: string) => keySpot(lay, ch)!;
const dist = (a: string, b: string) => Math.hypot(spot(a).x - spot(b).x, spot(a).y - spot(b).y);
const reach = (ch: string) => {
  const h = homeKey(lay, spot(ch).finger);
  return h ? dist(h, ch) : 0;
};

/** One pointing finger travels from the previous key (Fitts' law). */
const pecker: Model = (a, b) => 120 + 200 * Math.log2(1 + dist(a, b));
/** Ten fingers: the reach from the home key, and a pair on one finger waits for it. */
const toucher: Model = (a, b) => 120 + 150 * reach(b) + (spot(a).finger === spot(b).finger ? 150 : 0);
/** Ten fingers on the home row, pecking as soon as a key is off it. */
const mixed: Model = (a, b) => (spot(a).y === 2 && spot(b).y === 2 ? toucher(a, b) : pecker(a, b));

/** A lognormal factor with sd 0.3. */
function noise(rng: Rng): number {
  const z = Math.sqrt(-2 * Math.log(1 - rng.next())) * Math.cos(2 * Math.PI * rng.next());
  return Math.exp(0.3 * z);
}

/** The character a typist types for a lesson key: a Shift as a capital of the other hand. */
const charOf = (k: string) => (k === SHIFT_L ? 'J' : k === SHIFT_R ? 'F' : k);

/**
 * Types the whole check as `model` would at `tempo`: targets of three made-up words from the stage's
 * keys, the new keys twice in most of them, a reading pause before each target and now and then a pause
 * in a word. Keys without a single-key spot (capitals, dead keys) take 400 ms. A `weak` key is pressed
 * wrong before every right press.
 */
function typeCheck(model: Model, tempo: number, seed: number, upTo = Infinity, weak = new Set<string>()): PlacementCheck {
  const rng = new Rng(seed);
  const check = new PlacementCheck(SK, false, 3);
  let at = 0, target = 0;
  while (!check.end && check.stage < upTo) {
    const keys = check.current.keys.filter((k) => k !== ' ').map(charOf);
    const focus = check.current.group.filter((k) => k !== ' ').map(charOf);
    const word = () => Array.from({ length: rng.int(3, 6) }, (_, i) => (focus.length && (i === 1 || i === 3) ? rng.pick(focus) : rng.pick(keys))).join('');
    const text = [word(), word(), word()].join(' ');
    target++;
    [...text].forEach((ch, pos) => {
      const prev = text[pos - 1];
      const ms = pos === 0 || prev === ' ' ? 700 * tempo * noise(rng)
        : ch === ' ' ? 300 * tempo * noise(rng)
        : rng.next() < 0.02 ? 3000
        : (keySpot(lay, prev) && keySpot(lay, ch) ? model(prev, ch) : 400) * tempo * noise(rng);
      if ([...weak].some((k) => charOf(k) === ch || (k === ch.toLowerCase()))) check.press({ ch, ok: false, rt: ms, at, target, pos });
      at += ms;
      check.press({ ch, ok: true, rt: ms, at, target, pos });
    });
    check.targetDone();
  }
  return check;
}

describe('touch-typing signal', () => {
  for (const tempo of [0.5, 2]) for (const seed of [1, 2]) {
    it(`lets a ten-finger typist through at tempo ${tempo} (seed ${seed})`, () => {
      const check = typeCheck(toucher, tempo, seed);
      expect(check.signal.pass).toBe(true);
      expect(check.end).toBe('all');
      expect(check.keys).toEqual(lessonOrder(SK));
    });

    it(`stops a two-finger typist at tempo ${tempo} (seed ${seed})`, () => {
      const check = typeCheck(pecker, tempo, seed);
      expect(check.end).toBe('signal');
      expect(check.keys).toEqual([]);
    });
  }

  it('stops a typist who pecks once the upper row is in', () => {
    for (const seed of [1, 2]) {
      const check = typeCheck(mixed, 1, seed);
      expect(check.end).toBe('signal');
      expect(check.keys).toEqual([]);
    }
  });

  it('does not decide on too few intervals', () => {
    const check = typeCheck(pecker, 1, 1, 1);
    expect(touchSignal(check.presses, SK)).toEqual({ fit: null, contrast: null, pass: true });
  });

  it('reads only correct presses in a row inside a word, no pauses', () => {
    const p = (ch: string, at: number, pos: number, ok = true, target = 1): PlacementPress => ({ ch, ok, rt: 0, at, target, pos });
    const list = [p('f', 0, 0), p('r', 200, 1), p('x', 300, 2, false), p('e', 600, 2), p('d', 800, 3), p(' ', 900, 4), p('k', 1000, 5), p('i', 4000, 6), p('j', 4100, 0, true, 2)];
    expect(intervals(list)).toEqual([{ from: 'f', to: 'r', ms: 200 }, { from: 'e', to: 'd', ms: 200 }]);
  });
});

describe('stages and results', () => {
  const press = (ch: string, ok: boolean, rt: number, pos = 1): PlacementPress => ({ ch, ok, rt, at: 0, target: 1, pos });

  it('passes a key on its own accuracy and reaction', () => {
    const good = [...Array.from({ length: 9 }, () => press('d', true, 400)), press('d', false, 400)];
    expect(keyPasses(good, 'd', SK, 3)).toBe(true);
    expect(keyPasses([...good, press('d', false, 400)], 'd', SK, 3)).toBe(false);
    // Errors on other keys do not judge it, and a key without presses does not pass.
    expect(keyPasses([...good, ...Array.from({ length: 10 }, () => press('f', false, 400))], 'd', SK, 3)).toBe(true);
    expect(keyPasses(good, 'k', SK, 3)).toBe(false);
    expect(keyPasses(Array.from({ length: 10 }, () => press('d', true, reactionLimit(3) + 1)), 'd', SK, 3)).toBe(false);
    // The first key of a target is reading time: it does not count.
    expect(keyPasses(Array.from({ length: 10 }, () => press('d', true, 5000, 0)), 'd', SK, 3)).toBe(true);
    // A capital counts for its Shift.
    expect(keyPasses(Array.from({ length: 6 }, () => press('J', true, 400)), SHIFT_L, SK, 3)).toBe(true);
  });

  it('goes on after a weak key, leaves it out of the later words and opens the good keys after it', () => {
    const check = typeCheck(toucher, 1, 1, Infinity, new Set(['d']));
    expect(check.end).toBe('all');
    expect(check.keys).toEqual(lessonOrder(SK).filter((k) => k !== 'd'));
    expect(check.current.keys).not.toContain('d');
    const after = check.presses.slice(check.presses.findIndex((x) => x.ch === 's'));
    expect(after.some((x) => x.ch === 'd')).toBe(false);
  });

  it(`ends after ${STAGE_MISSES} stages in a row without a passed key`, () => {
    const check = typeCheck(toucher, 1, 1, Infinity, new Set(lessonOrder(SK).slice(3)));
    expect(check.end).toBe('misses');
    expect(check.stage).toBe(1 + STAGE_MISSES);
    expect(check.keys).toEqual([]);
  });

  it('ranks the strong and weak keys of the run', () => {
    const list = [
      ...Array.from({ length: 6 }, () => press('f', true, 300)),
      ...Array.from({ length: 6 }, () => press('j', true, 500)),
      ...Array.from({ length: 5 }, (_, i) => press('d', i > 1, 300)),
      ...Array.from({ length: 6 }, () => press('k', true, reactionLimit(3) + 50)),
      ...Array.from({ length: 4 }, () => press('s', false, 300)),
    ];
    expect(strongWeak(list, SK, 3)).toEqual({ strong: ['f', 'j'], weak: ['d', 'k'] });
    // A capital counts for its letter and its Shift.
    expect(strongWeak(Array.from({ length: 5 }, () => press('J', true, 300)), SK, 3).strong).toEqual(['j', 'ShiftL']);
  });

  it('raises the difficulty to fit the reaction, never lowers it', () => {
    expect(placementDifficulty(3, 600, 8)).toBe(8);
    expect(placementDifficulty(3, 1000, 8)).toBe(5);
    expect(placementDifficulty(6, 1300, 8)).toBe(6);
  });

  it('offers the check after a very good first level', () => {
    expect(offersPlacement(0.98, [500, 600, 700], 3)).toBe(true);
    expect(offersPlacement(0.95, [500, 600, 700], 3)).toBe(false);
    expect(offersPlacement(0.98, [1200, 1200], 3)).toBe(false);
    expect(offersPlacement(1, [], 3)).toBe(false);
  });
});
