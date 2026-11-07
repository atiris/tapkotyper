/**
 * The child's rhythm notes: one per great Rytmus round, of the world it was played in. They fade
 * a random one at a time without Rytmus; the chosen note's world music plays on the map while a
 * note of that world is left (`.specify/game/rhythm.md`).
 */
import { app } from '../app/app';
import { musicTracks } from '../gfx/assets';
import type { Profile, RhythmNote } from '../storage/schema';
import { fadeNotes } from './beat';
import { WORLDS } from './levels';

/** The notes left today; the fades due since the last round are taken now (true: the profile changed and wants saving). */
export function rhythmNotes(p: Profile, today: string): { notes: RhythmNote[]; changed: boolean } {
  const pr = p.progress;
  const notes = fadeNotes(pr.rhythmNoteList, pr.rhythmNotesFaded, pr.rhythmNotesAt, today, Math.random);
  if (notes.length === pr.rhythmNoteList.length) return { notes, changed: false };
  pr.rhythmNotesFaded += pr.rhythmNoteList.length - notes.length;
  pr.rhythmNoteList = notes;
  if (pr.rhythmTune !== null && !notes.some((n) => n.world === pr.rhythmTune)) pr.rhythmTune = null;
  return { notes, changed: true };
}

/** A round on `today` that earned a note in `world` (or none): the fades due come first, the count starts again; returns the new note. */
export function addRhythmRound(p: Profile, world: number, earned: boolean, today: string): RhythmNote | null {
  const pr = p.progress;
  rhythmNotes(p, today);
  pr.rhythmNotesAt = today;
  pr.rhythmNotesFaded = 0;
  if (!earned) return null;
  const note = { world, n: Math.max(-1, ...pr.rhythmNoteList.map((x) => x.n)) + 1 };
  pr.rhythmNoteList.push(note);
  // A new note's music plays on the map, if the world has its own.
  if (hasTune(world)) pr.rhythmTune = world;
  return note;
}

/** The world has its own music track. */
export const hasTune = (world: number): boolean => musicTracks().includes(WORLDS[world]);

/** The menus' music: the chosen note's world while one of its notes is left, else the usual menu track. */
export function menuMusic(p: Profile | null): string {
  const w = p?.progress.rhythmTune;
  return w != null && hasTune(w) && p!.progress.rhythmNoteList.some((n) => n.world === w) ? WORLDS[w] : app.menuTrack;
}
