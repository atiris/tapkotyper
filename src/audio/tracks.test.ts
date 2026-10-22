import { describe, expect, it } from 'vitest';
import { nextTrack } from './tracks';

describe('next random track', () => {
  const lib = ['menu', 'meadow', 'space'];

  it('never repeats the track that plays', () => {
    for (const cur of lib) for (const r of [0, 0.3, 0.99, 1]) expect(nextTrack(lib, cur, () => r)).not.toBe(cur);
  });

  it('reaches every other track', () => {
    expect(nextTrack(lib, 'menu', () => 0)).toBe('meadow');
    expect(nextTrack(lib, 'menu', () => 0.99)).toBe('space');
  });

  it('has nothing to offer from an empty or single-track library', () => {
    expect(nextTrack([], null)).toBeNull();
    expect(nextTrack(['menu'], 'menu')).toBeNull();
    expect(nextTrack(['menu'], null)).toBe('menu');
  });
});
