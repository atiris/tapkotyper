import { describe, expect, it } from 'vitest';
import { assignHotkeys } from './hotkeys';

describe('assignHotkeys', () => {
  it('takes each label its first free letter, diacritics as own letters', () => {
    expect(assignHotkeys(['Pokračovať', 'Precvičiť', 'Práca', 'Ukončiť'])).toEqual(['p', 'r', 'á', 'u']);
  });

  it('compares in lower case and skips what is not a letter', () => {
    expect(assignHotkeys(['Again', 'a 2 b', '3 Back'])).toEqual(['a', 'b', 'c']);
  });

  it('gives no letter when every one is taken', () => {
    expect(assignHotkeys(['ab', 'ba', 'Ab', '12'])).toEqual(['a', 'b', null, null]);
  });

  it('leaves the same label twice its own letters', () => {
    expect(assignHotkeys(['Back', 'Back', 'Back'])).toEqual(['b', 'a', 'c']);
  });
});
