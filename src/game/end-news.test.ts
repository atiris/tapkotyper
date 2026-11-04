import { describe, expect, it } from 'vitest';
import type { LevelResult } from './progress';
import { type DrillKey, bestLetter, drillNews, drillRows, greenLine, levelNews } from './end-news';

const result = (extra: Partial<LevelResult> = {}): LevelResult => ({
  stars: 3, accuracy: 0.95, chars: 100, errors: 5, cpm: 60, seconds: 120, newKeys: [], newAccessories: [], newCompanions: [],
  worldDone: null, trend: null, growth: null, byTapko: false, badge: null, ...extra,
});

describe('the green line of an end card', () => {
  it('tells nothing without news', () => {
    expect(greenLine(levelNews(result()))).toBeNull();
  });

  it('takes the badge first, then keys, medal and wardrobe, and counts the other rewards', () => {
    const r = result({ newKeys: ['j'], badge: { world: 0, tier: 'gold', upgrade: true }, newAccessories: ['hat'], trend: 1.2 });
    expect(greenLine(levelNews(r))).toEqual({ news: { kind: 'badge', world: 0, tier: 'gold', upgrade: true }, more: 2 });
    expect(greenLine(levelNews(result({ growth: { kind: 'difficulty', value: 4, medal: 1 }, newCompanions: ['cat'] })))?.more).toBe(1);
  });

  it('tells a better rhythm only without rewards and only when it is clearly better', () => {
    expect(greenLine(levelNews(result({ trend: 1.2 }))))
      .toEqual({ news: { kind: 'trend' }, more: 0 });
    expect(greenLine(levelNews(result({ trend: 1.02 })))).toBeNull();
  });

  it('the target range tells the trained letter that improved the most', () => {
    expect(bestLetter([{ key: 'a', before: 0.8, after: 0.9 }, { key: 'b', before: 0.5, after: 0.8 }, { key: 'c', before: 0.9, after: 0.7 }]))
      .toEqual({ kind: 'letter', key: 'b', before: 0.5, after: 0.8 });
    expect(bestLetter([{ key: 'c', before: 0.9, after: 0.9 }])).toBeNull();
    expect(bestLetter([{ key: 'o', before: 0.921, after: 0.923 }])).toBeNull();
  });

  it('a thing new in the range collection goes first, without counting other rewards', () => {
    expect(greenLine([{ kind: 'find', thing: 'rocket' }, { kind: 'keys', keys: ['k'] }])).toEqual({ news: { kind: 'find', thing: 'rocket' }, more: 0 });
  });
});

describe('the drill card', () => {
  const k = (key: string, before: number, after: number, presses = 10, mastered = false): DrillKey => ({ key, before, after, presses, mastered });

  it('shows up to three keys one by one, leaving out the keys pressed too little', () => {
    expect(drillRows([k('a', 0.78, 0.91), k('s', 0.5, 0.6, 4)])).toEqual([{ key: 'a', before: 0.78, after: 0.91 }]);
  });

  it('shows more keys as one row of their mean', () => {
    const [row, ...rest] = drillRows([k('a', 0.6, 0.8), k('s', 0.8, 0.8), k('d', 0.7, 0.9), k('f', 0.9, 0.9, 2)]);
    expect(rest).toEqual([]);
    expect(row.key).toBeNull();
    expect(row.before).toBeCloseTo(0.75);
    expect(row.after).toBeCloseTo(0.85);
  });

  it('tells a mastered key first, after the rewards', () => {
    const report = [k('a', 0.5, 0.9), k('s', 0.8, 0.85, 10, true)];
    expect(greenLine(drillNews(result({ trend: 1.2 }), report))?.news).toEqual({ kind: 'mastered', key: 's' });
    expect(greenLine(drillNews(result({ newKeys: ['g'] }), report))?.news).toEqual({ kind: 'keys', keys: ['g'] });
    expect(greenLine(drillNews(result(), [k('a', 0.5, 0.9), k('s', 0.2, 0.9, 3)]))?.news).toEqual({ kind: 'letter', key: 'a', before: 0.5, after: 0.9 });
  });
});
