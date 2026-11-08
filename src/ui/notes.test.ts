import { describe, expect, it } from 'vitest';
import { type NoteLook, noteLook } from './notes';

describe('rhythm note looks', () => {
  it('a note always looks the same after the same note, never of the kind or the hue before it', () => {
    let prev: NoteLook | undefined;
    for (let n = 0; n < 200; n++) {
      const look = noteLook(n, 1234, prev);
      expect(noteLook(n, 1234, prev)).toEqual(look);
      if (prev) {
        expect(look.kind).not.toBe(prev.kind);
        expect(look.hue).not.toBe(prev.hue);
      }
      prev = look;
    }
  });
});
