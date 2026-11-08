/**
 * The music context: the world whose music plays (its track name, null for the menu and own practice),
 * the track that is its music now (the world's own track or one the child picked), and whether that pick
 * was made outside a level, so it carries into the next level of any world.
 */
export interface MusicContext {
  world: string | null;
  track: string | null;
  pickWaits: boolean;
}

export type MusicEvent =
  /** The start page or own practice: the menu track. */
  | { kind: 'menu'; menuTrack: string }
  /** A level (or a story scene) of a world starts; `own` is the music it plays instead of the context's (null: none). */
  | { kind: 'level'; world: string; own?: string | null }
  /** The child picks another track; `inLevel` while a level runs. */
  | { kind: 'pick'; track: string; inLevel: boolean }
  /** The map: the context's music goes on, or comes back after a level with its own music or a story scene. */
  | { kind: 'resume'; menuTrack: string };

export const emptyMusicContext: MusicContext = { world: null, track: null, pickWaits: false };

/** The new context and the track to play now (null stops the music); playing the same track again changes nothing. */
export function musicFor(ctx: MusicContext, ev: MusicEvent): { ctx: MusicContext; play: string | null } {
  switch (ev.kind) {
    case 'menu':
      return { ctx: { world: null, track: ev.menuTrack, pickWaits: false }, play: ev.menuTrack };
    case 'level': {
      const keep = ctx.track !== null && (ctx.world === ev.world || ctx.pickWaits);
      const next = { world: ev.world, track: keep ? ctx.track : ev.world, pickWaits: false };
      return { ctx: next, play: ev.own === undefined ? next.track : ev.own };
    }
    case 'pick':
      return { ctx: { ...ctx, track: ev.track, pickWaits: ctx.pickWaits || !ev.inLevel }, play: ev.track };
    case 'resume': {
      const track = ctx.track ?? ctx.world ?? ev.menuTrack;
      return { ctx: { ...ctx, track }, play: track };
    }
  }
}
