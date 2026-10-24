import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../../engine/rng';

vi.mock('../../gfx/assets', () => ({ hasImage: () => true }));

const { Bags, THINGS, WORLD_THINGS, storyPool, tierOf, tierPoints, worldDue, worldThing } = await import('./aim-things');
const { STORIES, WORLDS } = await import('../levels');

const dicts = { sk: JSON.parse(readFileSync('public/i18n/sk.json', 'utf8')), en: JSON.parse(readFileSync('public/i18n/en.json', 'utf8')) };

describe('things to throw', () => {
  it('has every list of every thing in both languages, none empty', () => {
    for (const [lang, d] of Object.entries(dicts)) {
      for (const th of THINGS) {
        const texts = d.aim.things[th.id];
        expect(texts, `${lang} ${th.id}`).toBeDefined();
        expect(texts.name, `${lang} ${th.id}.name`).toBeTruthy();
        for (const list of ['launch', 'sound', 'hit']) expect(texts[list]?.length, `${lang} ${th.id}.${list}`).toBeGreaterThan(0);
        if (th.expect != null) expect(texts.expect?.length, `${lang} ${th.id}.expect`).toBeGreaterThan(0);
      }
      for (const list of ['hatchSound', 'hatch', 'hatchedCall', 'hatchFlight']) expect(d.aim.things.egg[list]?.length, `${lang} egg.${list}`).toBeGreaterThan(0);
      expect(d.aim.things.boomerang.caught?.length).toBeGreaterThan(0);
      for (const list of ['center', 'one', 'two', 'miss', 'fall', 'expectWorry', 'expectWonder', 'expectCheer', 'streak3', 'streak5', 'shrink', 'last']) {
        expect(d.aim.lines[list]?.length, `${lang} lines.${list}`).toBeGreaterThan(0);
      }
      expect(Object.keys(d.aim.things).sort()).toEqual(THINGS.map((th) => th.id).sort());
    }
  });

  it('gives every world one thing of its own', () => {
    expect(WORLD_THINGS.map((th) => th.world)).toEqual(WORLDS.map((_, i) => i));
  });

  it('opens the story 2 and 3 things only in their worlds', () => {
    const robot = STORIES.find((s) => s.id === 'robot')!.worlds[0];
    const fairy = STORIES.find((s) => s.id === 'fairy')!.worlds[0];
    const ids = (w: number) => storyPool(w).map((th) => th.id);
    expect(ids(0)).not.toContain('battery');
    expect(ids(0)).not.toContain('note');
    expect(ids(robot)).toContain('battery');
    expect(ids(robot)).not.toContain('wand');
    expect(ids(fairy)).toContain('wand');
    expect(ids(fairy)).toContain('pebble');
    for (const w of WORLDS.keys()) expect(storyPool(w).some((th) => th.world != null)).toBe(false);
  });

  it('brings the world thing with the last throw or the one before, judged by the time left', () => {
    expect(worldDue(30, 14, 2)).toBe(false);
    expect(worldDue(27, 14, 2)).toBe(true);
    expect(worldDue(27, 14, 1)).toBe(false);
    expect(worldDue(13, 14, 1)).toBe(true);
    expect(worldDue(0, 14, 1)).toBe(false);
    for (const w of WORLDS.keys()) expect(worldThing(w)?.world).toBe(w);
  });

  it('draws things in shuffled rounds: each once before any comes again, never twice in a row', () => {
    const pool = storyPool(0);
    const bags = new Bags(new Rng(5));
    const drawn = Array.from({ length: pool.length * 3 }, () => bags.draw('things', pool));
    for (let round = 0; round < 3; round++) expect(new Set(drawn.slice(round * pool.length, (round + 1) * pool.length)).size).toBe(pool.length);
    drawn.slice(1).forEach((th, i) => expect(th).not.toBe(drawn[i]));
  });
});

describe('the target\'s lines', () => {
  it('rates a hit by the wrong keys, with the points of each tier', () => {
    expect([0, 1, 2].map(tierOf)).toEqual(['center', 'one', 'two']);
    const rng = new Rng(7);
    for (let i = 0; i < 200; i++) {
      const one = tierPoints('one', rng), two = tierPoints('two', rng);
      expect(one).toBeGreaterThanOrEqual(85);
      expect(one).toBeLessThanOrEqual(95);
      expect(two).toBeGreaterThanOrEqual(75);
      expect(two).toBeLessThanOrEqual(85);
      expect(Number.isInteger(one) && Number.isInteger(two)).toBe(true);
    }
  });

  it('never says the same line twice in a row, and repeats a run from the same seed', () => {
    const lines = ['a', 'b', 'c', 'd'];
    const said = (seed: number) => {
      const bags = new Bags(new Rng(seed));
      return Array.from({ length: 40 }, () => bags.next('k', lines));
    };
    const run = said(3);
    run.slice(1).forEach((line, i) => expect(line).not.toBe(run[i]));
    expect(said(3)).toEqual(run);
    expect(new Set(run.slice(0, 4))).toEqual(new Set(lines));
  });
});
