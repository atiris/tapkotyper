import { describe, expect, it } from 'vitest';
import { Rng } from '../engine/rng';
import { BeatHelper, type HelpHost, type HelpPlan, SuperHelper, slipMarks } from './super-help';

/** A level of `words` words that ends when they are typed or flown by; one flies by after a few seconds untyped. */
function fakeLevel(words: string[], canMiss = true) {
  let at = 0, typed = 0, idle = 0, missed = 0;
  const log: string[] = [];
  const host: HelpHost = {
    progress: () => at / words.length,
    next: () => (at < words.length ? { ch: words[at][typed], last: typed === words[at].length - 1 } : null),
    press: (ch) => {
      idle = 0;
      if (ch !== words[at][typed]) return void log.push(`wrong@${at}`);
      if (++typed === words[at].length) {
        at++;
        typed = 0;
      }
    },
    wrongKey: () => '#',
    missed: () => missed,
    canMiss: () => canMiss,
  };
  const step = (dt: number) => {
    if (canMiss && at < words.length && (idle += dt) > 3) {
      log.push(`missed@${at}`);
      missed++;
      at++;
      typed = 0;
      idle = 0;
    }
  };
  return { host, log, step, done: () => at >= words.length };
}

function play(plan: ConstructorParameters<typeof SuperHelper>[0], canMiss = true) {
  const words = Array.from({ length: 20 }, () => 'abcd');
  const level = fakeLevel(words, canMiss);
  const helper = new SuperHelper(plan, () => 0.5);
  let time = 0;
  while (!level.done() && time < 600) {
    helper.tick(0.05, level.host);
    level.step(0.05);
    time += 0.05;
  }
  return { log: level.log, time };
}

describe('super help', () => {
  it('cuts the run into equal parts, one slip at each cut', () => {
    expect(slipMarks(0)).toEqual([]);
    expect(slipMarks(1)).toEqual([0.5]);
    expect(slipMarks(4)).toEqual([0.2, 0.4, 0.6, 0.8]);
  });

  it('types without a mistake at about 200 characters per minute', () => {
    const { log, time } = play('clean');
    expect(log).toEqual([]);
    // 80 characters at 0.3 s plus a short read after each word.
    expect(time).toBeGreaterThan(80 * 0.3);
    expect(time).toBeLessThan(80 * 0.3 + 20 * 0.5 + 2);
  });

  it('makes its mistakes and lets its words fly by in order, spread over the run', () => {
    expect(play('m2h2').log).toEqual(['wrong@4', 'missed@8', 'wrong@12', 'missed@16']);
    expect(play('m1h1').log).toEqual(['wrong@7', 'missed@14']);
  });

  it('aims at an accuracy for 3, 2 or 1 star', () => {
    for (const [plan, accuracy] of [['acc98', 0.98], ['acc97', 0.97], ['acc92', 0.92], ['acc75', 0.75]] as const) {
      const words = Array.from({ length: 150 }, () => 'abcd');
      const level = fakeLevel(words, false);
      const rng = new Rng(7);
      const helper = new SuperHelper(plan, () => rng.next());
      for (let time = 0; !level.done() && time < 2000; time += 0.05) helper.tick(0.05, level.host);
      const wrong = level.log.length;
      expect(600 / (600 + wrong)).toBeCloseTo(accuracy, 1);
    }
  });

  it('skips a hesitation where nothing flies by', () => {
    expect(play('m1h1', false).log).toEqual(['wrong@7']);
  });
});

/**
 * A beat game of `n` letters, one a second, window 0.35 beat each side: the helper's presses as
 * offsets from their beats (in beats), or 'miss' for a letter the window passed without one.
 */
function beatRun(plan: HelpPlan, n = 40) {
  const rng = new Rng(4);
  const h = new BeatHelper(plan, () => rng.next());
  const out: (number | 'miss')[] = [];
  let i = 0, t = 0;
  while (i < n) {
    t += 0.01;
    const land = i + 1;
    if (t > land + 0.35) {
      out.push('miss');
      i++;
      continue;
    }
    h.tick({ index: i, letter: 'f', untilBeat: land - t, w: 0.35, T: 1, waiting: false }, i / n, () => {
      out.push(Math.round((t - land) * 100) / 100);
      i++;
    });
  }
  return out;
}

describe('beat help', () => {
  const middle = (o: number | 'miss') => o !== 'miss' && Math.abs(o) <= 0.35 / 2 + 0.01;
  it('without mistakes catches every letter in the middle of the band', () => {
    expect(beatRun('clean').every(middle)).toBe(true);
  });

  it('a mistake lets one letter fall; a hesitation catches one at the band\'s late edge', () => {
    expect(beatRun('m2').filter((o) => o === 'miss')).toHaveLength(2);
    const run = beatRun('m1h1');
    expect(run.filter((o) => o === 'miss')).toHaveLength(1);
    expect(run.filter((o) => o !== 'miss' && o > 0.3)).toHaveLength(1);
  });

  it('an accuracy plan catches about that share in the middle and the rest out in the band', () => {
    const run = beatRun('acc75', 200);
    expect(run.every((o) => o !== 'miss' && Math.abs(o) <= 0.35)).toBe(true);
    const share = run.filter(middle).length / run.length;
    expect(share).toBeGreaterThan(0.65);
    expect(share).toBeLessThan(0.85);
  });
});
