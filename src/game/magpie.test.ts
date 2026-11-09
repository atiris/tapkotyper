import { describe, expect, it } from 'vitest';
import { newProfile } from '../storage/store';
import { magpieVisit, untoldMagpie } from './magpie';

/** A profile with these range things found. */
function withFinds(...ids: string[]) {
  const p = newProfile('Ema', 'sk');
  p.progress.rangeFinds = [...ids];
  return p;
}

describe('the magpie', () => {
  it('first only sets its visit 7 to 14 days on', () => {
    const p = withFinds('ladybug');
    expect(magpieVisit(p, '2026-11-01', () => 0)).toBeNull();
    expect(p.progress.magpieDue).toBe('2026-11-08');
    const q = withFinds('ladybug');
    magpieVisit(q, '2026-11-01', () => 0.999);
    expect(q.progress.magpieDue).toBe('2026-11-15');
  });

  it('takes one thing on its day, tells it once, and comes again later', () => {
    const p = withFinds('ladybug', 'rocket');
    p.progress.magpieDue = '2026-11-08';
    expect(magpieVisit(p, '2026-11-07', () => 0)).toBeNull();
    expect(magpieVisit(p, '2026-11-08', () => 0)).toBe('ladybug');
    expect(p.progress.rangeFinds).toEqual(['rocket']);
    expect(p.progress.magpieDue).toBe('2026-11-15');
    expect(untoldMagpie(p)).toBe('ladybug');
    expect(untoldMagpie(p)).toBeNull();
  });

  it('takes at most one until the child types again, however long it was away', () => {
    const p = withFinds('ladybug', 'rocket', 'crystal');
    p.progress.magpieDue = '2026-10-01';
    p.progress.trainedSeconds = 600;
    expect(magpieVisit(p, '2026-11-01', () => 0)).toBe('ladybug');
    expect(magpieVisit(p, '2026-12-31', () => 0)).toBeNull();
    expect(p.progress.rangeFinds).toEqual(['rocket', 'crystal']);
    p.progress.trainedSeconds += 60;
    expect(magpieVisit(p, '2026-12-31', () => 0)).toBe('rocket');
  });

  it('with nothing to take waits for its next day', () => {
    const p = withFinds();
    p.progress.magpieDue = '2026-11-08';
    expect(magpieVisit(p, '2026-11-10', () => 0)).toBeNull();
    expect(p.progress.magpieDue).toBe('2026-11-17');
  });
});
