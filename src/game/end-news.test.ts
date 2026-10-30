import { describe, expect, it } from 'vitest';
import type { LevelResult } from './progress';
import { bestLetter, greenLine, levelNews } from './end-news';

const result = (extra: Partial<LevelResult> = {}): LevelResult => ({
  stars: 3, shownStars: 3, accuracy: 0.95, chars: 100, errors: 5, cpm: 60, seconds: 120, newKeys: [], newAccessories: [], newCompanions: [],
  worldDone: null, trend: null, growth: null, byTapko: false, badge: null, ...extra,
});

describe('the green line of an end card', () => {
  it('tells nothing without news', () => {
    expect(greenLine(levelNews(result()))).toBeNull();
  });

  it('takes a rescued friend first, then the badge, keys, medal and wardrobe, and counts the other rewards', () => {
    const friend = { kind: 'dragon' as const, name: 'Iskra', hue: 10, date: '2026-10-30' };
    const r = result({ newKeys: ['j'], badge: { world: 0, tier: 'gold', upgrade: true }, newAccessories: ['hat'], trend: 1.2 });
    expect(greenLine(levelNews(r, friend))).toEqual({ news: { kind: 'rescued', friend }, more: 3 });
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
  });

  it('a thing new in the range collection goes first, without counting other rewards', () => {
    expect(greenLine([{ kind: 'find', thing: 'rocket' }, { kind: 'keys', keys: ['k'] }])).toEqual({ news: { kind: 'find', thing: 'rocket' }, more: 0 });
  });
});
