import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { t, tList, useDictionaries } from '../../i18n/i18n';
import { TypingCore } from '../typing';
import type { LevelRuntime } from '../runtime';

vi.mock('../../app/app', async () => {
  const { newProfile } = await import('../../storage/store');
  return { app: { profile: newProfile('Test', 'sk') }, pickLine: () => '', saveProfile: () => {} };
});
vi.mock('../../ui/dom', () => ({ h: () => ({ replaceChildren: () => {} }) }));
vi.mock('../../ui/keyboard-guide', () => ({ keyLabel: (k: string) => k }));
vi.mock('../../ui/hud', () => ({ hitsPic: () => ({ el: {}, set: () => {} }) }));
// No pictures (only the things drawn in code fly), unless a test turns them all on.
const pictures = vi.hoisted(() => ({ all: false }));
vi.mock('../../gfx/assets', async (original) => ({ ...(await original<typeof import('../../gfx/assets')>()), hasImage: () => pictures.all }));

const sk = JSON.parse(readFileSync('public/i18n/sk.json', 'utf8'));
useDictionaries('sk', sk);

const { AIM_SECONDS, AimMode, FALL_ERRORS, RINGS, pickWord, targetRadius, throwLengths, weakCount } = await import('./aim');
const { app } = await import('../../app/app');
const { THINGS, throwPoints } = await import('./aim-things');
const { VH } = await import('../../engine/loop');

function fakeRuntime(extra: Record<string, unknown> = {}): LevelRuntime {
  const base: Record<string, unknown> = {
    staying: false,
    ...extra,
    core: new TypingCore(),
    def: { id: 'aim', kind: 'aim', world: 0, index: -1, count: 0, focus: ['k'] },
    vw: 1280,
    stage: { scale: 1 },
    reduceMotion: true,
    rng: { pick: <T>(a: T[]) => a[0], range: (a: number) => a, chance: () => false, int: (a: number) => a, next: () => 0.5 },
    word: () => 'kdk',
    travelTime: () => 2,
    shout: vi.fn(),
    speak: vi.fn(),
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

  it('every word in time hits the middle of the target', () => {
    const L = fakeRuntime();
    const mode = new AimMode(L);
    mode.start();
    // The launch word throws; then four rings and the target, each with its word.
    expect(L.core.focus()?.word).toBe('kdk');
    typeRing(mode, L);
    for (let stop = 0; stop <= RINGS; stop++) {
      run(mode, L, 0.5);
      expect(L.core.focus()?.word).toBe('kdk');
      typeRing(mode, L);
    }
    run(mode, L, 0.5);
    // Tapko named the tomato (the first of the shuffled pool with this rng) at the throw; the target says a bullseye line; no word pops up while the chance says no.
    expect(L.speak).toHaveBeenCalledWith('tapko', expect.toBeOneOf(tList('aim.things.tomato.launch')), expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number));
    expect(L.speak).toHaveBeenLastCalledWith('target', expect.toBeOneOf([...tList('aim.lines.center'), ...tList('aim.things.tomato.hit')]), expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number), true);
    expect(L.shout).not.toHaveBeenCalled();
    expect([mode.hits, mode.centers, mode.points]).toEqual([1, 1, 100]);
    run(mode, L, 2);
    // The next throw waits for its launch word.
    expect(L.core.focus()?.word).toBe('kdk');
    expect(mode.progress()).toBeGreaterThan(0);
  });

  it('a word pops out of the target at a hit when its chance comes, above or left of it', () => {
    const L = fakeRuntime();
    // Only the even chances (the pop's among them) come true.
    L.rng.chance = (p: number) => p === 0.5;
    const mode = new AimMode(L);
    mode.start();
    typeRing(mode, L);
    for (let stop = 0; stop <= RINGS; stop++) {
      run(mode, L, 0.5);
      typeRing(mode, L);
    }
    run(mode, L, 0.5);
    expect(L.shout).toHaveBeenCalledTimes(1);
    const [word, x, y] = vi.mocked(L.shout).mock.calls[0];
    expect([...tList('aim.lines.pop'), ...THINGS.flatMap((th) => tList(`aim.things.${th.id}.sound`))]).toContain(word);
    expect(x < L.vw * 0.86 || y < VH * 0.46).toBe(true);
  });

  it('the third bullseye in a row adds a streak line after the hit line', () => {
    const L = fakeRuntime();
    const mode = new AimMode(L);
    mode.start();
    for (let n = 0; n < 3; n++) {
      typeRing(mode, L);
      for (let stop = 0; stop <= RINGS; stop++) {
        run(mode, L, 0.5);
        typeRing(mode, L);
      }
      run(mode, L, n < 2 ? 2.5 : 0.5);
    }
    const said = vi.mocked(L.speak).mock.calls.filter(([who]) => who === 'target').map(([, text]) => text);
    expect(tList('aim.lines.center')).toContain(said.at(-2));
    expect(tList('aim.lines.streak3')).toContain(said.at(-1));
  });

  it('one wrong key hits off the middle, and the target says the points of a near miss', () => {
    const L = fakeRuntime();
    const mode = new AimMode(L);
    mode.start();
    typeRing(mode, L);
    typeRing(mode, L, 1);
    for (let stop = 1; stop <= RINGS; stop++) {
      run(mode, L, 0.5);
      typeRing(mode, L);
    }
    run(mode, L, 0.5);
    // One mistake costs two letters of the throw's words.
    const points = throwPoints(3 * (RINGS + 1), 1);
    expect(L.speak).toHaveBeenLastCalledWith('target', expect.toBeOneOf(tList('aim.lines.one', { n: points })), expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number), true);
    expect([mode.hits, mode.centers, mode.points]).toEqual([1, 0, points]);
  });

  it('a ring passed before its word is typed still hits, off the middle like a wrong key', () => {
    const L = fakeRuntime();
    const mode = new AimMode(L);
    mode.start();
    typeRing(mode, L);
    const first = L.core.focus();
    // The projectile keeps flying and reaches the first ring in the word's travel time.
    run(mode, L, 2.1);
    expect(first?.gone).toBe(true);
    for (let stop = 1; stop <= RINGS; stop++) {
      typeRing(mode, L);
      run(mode, L, 0.5);
    }
    expect(L.speak).toHaveBeenLastCalledWith('target', expect.toBeOneOf(tList('aim.lines.one', { n: 85 })), expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number), true);
    expect([mode.hits, mode.centers]).toEqual([1, 0]);
  });

  it('a target word too late misses the target without a mistake', () => {
    const L = fakeRuntime();
    const mode = new AimMode(L);
    mode.start();
    typeRing(mode, L);
    // Nothing typed: every ring passes, the projectile whizzes past the target.
    run(mode, L, 2.1 * (RINGS + 1));
    expect(L.speak).toHaveBeenLastCalledWith('target', expect.toBeOneOf(tList('aim.lines.miss')), expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number), true);
    expect(mode.hits).toBe(0);
    expect(mode.report()).toEqual([{ key: 'k', before: 0, after: 0 }]);
  });

  it('three wrong keys make the projectile fall, and the next throw comes', () => {
    const L = fakeRuntime();
    const mode = new AimMode(L);
    mode.start();
    typeRing(mode, L);
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

  it('two minutes end the run once the throw in the air lands, with accuracy before and after per key', () => {
    const L = fakeRuntime();
    const mode = new AimMode(L);
    mode.start();
    for (let i = 0; i < 400 && !mode.finished; i++) {
      run(mode, L, 0.5);
      typeRing(mode, L);
    }
    expect(mode.finished).toBe(true);
    expect(mode.progress()).toBe(1);
    expect(mode.report()).toEqual([{ key: 'k', before: 0, after: 0 }]);
  });

  it('throws the world\'s thing once, last or one before last, and keeps a bullseye with it only when the run ends', () => {
    pictures.all = true;
    const L = fakeRuntime();
    const mode = new AimMode(L);
    mode.start();
    const launches: string[] = [];
    for (let i = 0; i < 400 && !mode.finished; i++) {
      run(mode, L, 0.5);
      typeRing(mode, L);
    }
    for (const [who, text] of vi.mocked(L.speak).mock.calls) if (who === 'tapko' && text !== t('aim.collection.new')) launches.push(text);
    const own = launches.map((text) => tList('aim.things.ladybug.launch').includes(text));
    expect(own.filter(Boolean)).toHaveLength(1);
    expect(own.slice(-2)).toContain(true);
    // Found in the middle, but the collection takes it only now.
    expect(L.speak).toHaveBeenCalledWith('tapko', t('aim.collection.new'), expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number));
    expect(app.profile!.progress.rangeFinds).toEqual([]);
    mode.onFinish();
    expect(app.profile!.progress.rangeFinds).toEqual(['ladybug']);
  });

  it('Enter swaps the thing in the paw for one of the collection, never the world\'s thing still to find', () => {
    pictures.all = true;
    app.profile!.progress.rangeFinds = ['rocket'];
    const L = fakeRuntime();
    const mode = new AimMode(L);
    expect(mode.startLine()).toContain(t('aim.swapHint'));
    mode.start();
    expect(mode.onEnter()).toBe(true);
    expect(L.speak).toHaveBeenLastCalledWith('tapko', t('aim.swap', { name: t('aim.things.rocket.name') }), expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number));
    // Nothing else to swap to: Enter is left to the paws.
    expect(mode.onEnter()).toBe(false);
    app.profile!.progress.rangeFinds = [];
    expect(mode.onEnter()).toBe(false);
  });

  it('beating the record says so once, and a finished run keeps the new record', () => {
    app.profile!.progress.rangeRecord = 150;
    const L = fakeRuntime();
    const mode = new AimMode(L);
    mode.start();
    const record = () => (L.speak as ReturnType<typeof vi.fn>).mock.calls.filter((c) => c[1] === t('aim.record')).length;
    for (let throwN = 0; throwN < 2; throwN++) {
      typeRing(mode, L);
      for (let stop = 0; stop <= RINGS; stop++) {
        run(mode, L, 0.5);
        typeRing(mode, L);
      }
      run(mode, L, 3);
    }
    expect(mode.points).toBe(200);
    expect([mode.newRecord, record()]).toEqual([true, 1]);
    mode.onFinish();
    expect(app.profile!.progress.rangeRecord).toBe(200);
    app.profile!.progress.rangeRecord = 0;
  });

  it('staying a while keeps throwing after two minutes', () => {
    const L = fakeRuntime({ staying: true });
    const mode = new AimMode(L);
    mode.start();
    run(mode, L, AIM_SECONDS + 20);
    expect(mode.finished).toBe(false);
    expect(L.core.focus()).not.toBeNull();
  });
});
