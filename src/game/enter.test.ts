import { describe, expect, it } from 'vitest';
import { ENTER_MAX, EnterMarks } from './enter';

describe('Enter targets', () => {
  it('come about once in 20 targets', () => {
    let r = 1;
    const marks = new EnterMarks(() => (r = (r * 16807) % 2147483647) / 2147483647, null);
    const n = Array.from({ length: 20000 }, () => marks.next()).filter(Boolean).length;
    expect(n).toBeGreaterThan(700);
    expect(n).toBeLessThan(1300);
  });

  it('never come twice in a row', () => {
    const marks = new EnterMarks(() => 0, null);
    expect(Array.from({ length: 6 }, () => marks.next())).toEqual([true, false, true, false, true, false]);
  });

  it('stop at the cap of a level', () => {
    const marks = new EnterMarks(() => 0, ENTER_MAX);
    expect(Array.from({ length: 10 }, () => marks.next()).filter(Boolean).length).toBe(ENTER_MAX);
  });
});
