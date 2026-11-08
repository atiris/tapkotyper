import { describe, expect, it } from 'vitest';
import { type MusicContext, type MusicEvent, emptyMusicContext, musicFor } from './context';

/** Runs the events from the empty context; returns the tracks played and the last context. */
function run(...events: MusicEvent[]): { plays: (string | null)[]; ctx: MusicContext } {
  let ctx = emptyMusicContext;
  const plays: (string | null)[] = [];
  for (const ev of events) {
    const r = musicFor(ctx, ev);
    ctx = r.ctx;
    plays.push(r.play);
  }
  return { plays, ctx };
}

const menu: MusicEvent = { kind: 'menu', menuTrack: 'relaxing' };
const map: MusicEvent = { kind: 'resume', menuTrack: 'relaxing' };
const level = (world: string, own?: string | null): MusicEvent => ({ kind: 'level', world, own });
const pick = (track: string, inLevel: boolean): MusicEvent => ({ kind: 'pick', track, inLevel });

describe('music context', () => {
  it('plays the menu track on the start page and in own practice', () => {
    expect(run(menu).plays).toEqual(['relaxing']);
    expect(run(level('meadow'), menu).ctx).toEqual({ world: null, track: 'relaxing', pickWaits: false });
  });

  it("keeps the world's track between its levels and the map, and switches for another world", () => {
    expect(run(menu, level('meadow'), map, level('meadow'), level('space'), menu).plays)
      .toEqual(['relaxing', 'meadow', 'meadow', 'meadow', 'space', 'relaxing']);
  });

  it('keeps a track picked in a level until a level of another world', () => {
    expect(run(level('meadow'), pick('egg', true), map, level('meadow'), level('space')).plays)
      .toEqual(['meadow', 'egg', 'egg', 'egg', 'space']);
  });

  it('carries a track picked outside a level into the next level of any world, then switches', () => {
    const r = run(level('meadow'), map, pick('egg', false), level('space'), map, level('space'), level('meadow'));
    expect(r.plays).toEqual(['meadow', 'meadow', 'egg', 'egg', 'egg', 'egg', 'meadow']);
    expect(run(menu, pick('egg', false), level('space')).ctx).toEqual({ world: 'space', track: 'egg', pickWaits: false });
  });

  it("plays a level's own music and brings the context's music back on the map", () => {
    expect(run(level('meadow'), level('meadow', null), map).plays).toEqual(['meadow', null, 'meadow']);
    expect(run(level('meadow'), level('space', null), map).plays).toEqual(['meadow', null, 'space']);
  });

  it("makes a story scene's world the context while the scene plays its own music", () => {
    expect(run(level('meadow'), pick('egg', true), level('meadow', 'meadow'), map).plays).toEqual(['meadow', 'egg', 'meadow', 'egg']);
    expect(run(menu, level('space', 'space'), map, level('space')).plays).toEqual(['relaxing', 'space', 'space', 'space']);
  });

  it('starts the menu track on a map reached with nothing played before', () => {
    expect(run(map).plays).toEqual(['relaxing']);
  });
});
