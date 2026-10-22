import { describe, expect, it } from 'vitest';
import { Rng } from '../engine/rng';
import { GATE_GROUP, gateCode } from './gate';

describe('main gate code', () => {
  it('has 8 groups of 6 characters from the active keys only', () => {
    const keys = ['f', 'j', 'd', 'k', ' ', 'ShiftL'];
    const code = gateCode(keys, 8, false, new Rng(1));
    expect(code).toHaveLength(8);
    for (const g of code) {
      expect([...g]).toHaveLength(GATE_GROUP);
      expect([...g].every((c) => 'fjdk'.includes(c))).toBe(true);
    }
  });

  it('puts a known symbol or digit in every second group', () => {
    const keys = ['a', 's', 'd', 'f', '.', '1'];
    for (let seed = 1; seed < 20; seed++) {
      const code = gateCode(keys, 8, false, new Rng(seed));
      code.forEach((g, i) => {
        expect([...g].every((c) => 'asdf.1'.includes(c))).toBe(true);
        expect(/[a-z]/.test(g[0])).toBe(true);
        if (i % 2) expect(/[.1]/.test(g)).toBe(true);
      });
    }
  });

  it('leaves out diacritics when they are off', () => {
    const code = gateCode(['a', 'á', 's'], 8, true, new Rng(3));
    expect(code.join('')).not.toContain('á');
  });
});
