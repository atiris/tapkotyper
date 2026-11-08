/**
 * The child's rhythm notes: one per great Rytmus round, of the world it was played in. They fade
 * a random one at a time without Rytmus (`.specify/game/rhythm.md`).
 */
import type { Profile, RhythmNote } from '../storage/schema';
import { fadeNotes } from './beat';
import { WORLDS, isWorldUnlocked } from './levels';

/** Points of the treble clef in the treasure chest. */
export const CLEF_POINTS = 5;

/** The treble clef is held while every open world has a note among those kept, and there is one. */
export function hasClef(p: Profile): boolean {
  const notes = p.progress.rhythmNoteList;
  return notes.length > 0 && WORLDS.every((_, w) => !isWorldUnlocked(p, w) || notes.some((n) => n.world === w));
}

/** The notes left today; the fades due since the last round are taken now (true: the profile changed and wants saving). */
export function rhythmNotes(p: Profile, today: string): { notes: RhythmNote[]; changed: boolean } {
  const pr = p.progress;
  const notes = fadeNotes(pr.rhythmNoteList, pr.rhythmNotesFaded, pr.rhythmNotesAt, today, Math.random);
  if (notes.length === pr.rhythmNoteList.length) return { notes, changed: false };
  pr.rhythmNotesFaded += pr.rhythmNoteList.length - notes.length;
  pr.rhythmNoteList = notes;
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
  return note;
}
