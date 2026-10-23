import { describe, expect, it, vi } from 'vitest';
import { t } from '../../i18n/i18n';
import { TypingCore } from '../typing';
import type { LevelRuntime } from '../runtime';

vi.mock('../../app/app', async () => {
  const { newProfile } = await import('../../storage/store');
  return { app: { profile: newProfile('Test', 'sk') }, pickLine: () => '' };
});
vi.mock('../../ui/dom', () => ({ h: () => ({ replaceChildren: () => {} }) }));
vi.mock('../../ui/keyboard-guide', () => ({ keyLabel: (k: string) => k }));

const { AIM_THROWS, AimMode, FALL_ERRORS, RINGS, aimOver, pickWord, targetRadius, throwLengths, weakCount } = await import('./aim');

function fakeRuntime(): LevelRuntime {
  const base: Record<string, unknown> = {
    core: new TypingCore(),
    def: { id: 'aim', kind: 'aim', world: 0, index: -1, count: 0, focus: ['k'] },
    vw: 1280,
    stage: { scale: 1 },
    reduceMotion: true,
    rng: { pick: <T>(a: T[]) => a[0], range: (a: number) => a, chance: () => false, int: (a: number) => a, next: () => 0.5 },
    word: () => 'kdk',
    travelTime: () => 2,
    shout: vi.fn(),
    particles: { emit: () => {} },
    tweens: { add: () => {} },
  };
  return new Proxy(base, { get: (o, k) => (k in o ? o[k as string] : () => {}) }) as unknown as LevelRuntime;
}

/** Runs the mode for `s` seconds. */
function run(mode: InstanceType<typeof AimMode>, L: LevelRuntime, s: number): void {
  for (let i = 0; i < s * 20; i++) {
    L.core.update(0.05);
    mode.update(0.05);
    mode.t += 0.05;
  }
}

/** Types the focused ring's word, `wrong` wrong keys first. */
function typeRing(mode: InstanceType<typeof AimMode>, L: LevelRuntime, wrong = 0): void {
  for (let i = 0; i < wrong; i++) {
    const res = L.core.type('x');
    if (res.kind === 'wrong') mode.onWrong();
  }
  const f = L.core.focus();
  if (!f) return;
  for (const ch of f.word.slice(f.typed)) {
    const res = L.core.type(ch);
    if (res.kind === 'done') mode.onDone(res.target);
    else if (res.kind === 'ok') mode.onCorrect();
  }
}

describe('target range', () => {
  it('shows a big target at low accuracy and a smaller one as it improves', () => {
    expect(targetRadius(0)).toBeGreaterThan(targetRadius(0.5));
    expect(targetRadius(0.5)).toBeGreaterThan(targetRadius(1));
    expect(targetRadius(2)).toBe(targetRadius(1));
  });

  it('picks a mixed word of the asked length, richest in the weak keys', () => {
    expect(weakCount('kokos', ['k', 's'])).toBe(3);
    expect(weakCount('Ja ty', ['ShiftL', ' '])).toBe(2);
    expect(pickWord(['dom', 'kak', 'ok'], ['k'], 3)).toBe('kak');
    expect(pickWord(['dom', 'les'], ['k'], 3)).toBe('dom');
    // Never a word of the weak key alone while a mixed one is there.
    expect(pickWord(['kkk', 'kdk'], ['k'], 3)).toBe('kdk');
    expect(pickWord(['kkk'], ['k'], 3)).toBe('kkk');
    // The length beats the weak keys.
    expect(pickWord(['kak', 'domek'], ['k'], 5)).toBe('domek');
  });

  it('makes the words longer toward the target', () => {
    expect(throwLengths([2, 6])).toEqual([2, 3, 4, 5, 6]);
    expect(throwLengths([3, 3])).toEqual([3, 3, 3, 4, 4]);
    expect(throwLengths([2, 6])).toHaveLength(RINGS + 1);
  });

  it('ends after twelve throws or two minutes', () => {
    expect(aimOver(AIM_THROWS, 10)).toBe(true);
    expect(aimOver(3, 120)).toBe(true);
    expect(aimOver(3, 60)).toBe(false);
  });

  it('every word in time hits the middle of the target', () => {
    const L = fakeRuntime();
    const mode = new AimMode(L);
    mode.start();
    // Four rings and the target, each with its word.
    for (let stop = 0; stop <= RINGS; stop++) {
      run(mode, L, 0.5);
      expect(L.core.focus()?.word).toBe('kdk');
      typeRing(mode, L);
    }
    run(mode, L, 0.5);
    expect(L.shout).toHaveBeenCalledWith(t('aim.center'), expect.any(Number), expect.any(Number));
    run(mode, L, 2);
    // The next throw came with a new first ring.
    expect(L.core.focus()?.word).toBe('kdk');
    expect(mode.progress()).toBeGreaterThanOrEqual(1 / AIM_THROWS);
  });

  it('a ring passed before its word is typed spoils the middle', () => {
    const L = fakeRuntime();
    const mode = new AimMode(L);
    mode.start();
    const first = L.core.focus();
    // The projectile keeps flying and reaches the first ring in the word's travel time.
    run(mode, L, 2.1);
    expect(first?.gone).toBe(true);
    for (let stop = 1; stop <= RINGS; stop++) {
      typeRing(mode, L);
      run(mode, L, 0.5);
    }
    expect(L.shout).toHaveBeenCalledTimes(1);
    expect(L.shout).not.toHaveBeenCalledWith(t('aim.center'), expect.any(Number), expect.any(Number));
  });

  it('three wrong keys make the projectile fall, and the next throw comes', () => {
    const L = fakeRuntime();
    const mode = new AimMode(L);
    mode.start();
    run(mode, L, 1);
    const first = L.core.focus();
    for (let i = 0; i < FALL_ERRORS; i++) {
      const res = L.core.type('x');
      if (res.kind === 'wrong') mode.onWrong();
    }
    expect(first?.gone).toBe(true);
    L.core.prune();
    expect(L.core.focus()).toBeNull();
    run(mode, L, 3);
    expect(L.core.focus()).not.toBe(first);
    expect(L.core.focus()).not.toBeNull();
  });

  it('twelve throws end the run with accuracy before and after per key', () => {
    const L = fakeRuntime();
    const mode = new AimMode(L);
    mode.start();
    for (let i = 0; i < 200 && !mode.finished; i++) {
      run(mode, L, 1);
      typeRing(mode, L);
    }
    expect(mode.finished).toBe(true);
    expect(mode.report()).toEqual([{ key: 'k', before: 0, after: 0 }]);
  });
});
