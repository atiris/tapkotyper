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

/** The day's fades, taken with the parrots' rolls when the player becomes active: notes the treble clef went with are marked for the map. */
export function fadeNotesToday(p: Profile, today: string): void {
  const had = hasClef(p);
  rhythmNotes(p, today);
  if (had && !hasClef(p)) p.progress.rhythmClefLost = true;
}

/** The notes faded since the map told it last, and whether the treble clef went with them; they count as told now. */
export function untoldFades(p: Profile): { notes: number; clef: boolean } {
  const pr = p.progress;
  const notes = pr.rhythmNotesFaded - pr.rhythmNotesTold;
  const clef = notes > 0 && pr.rhythmClefLost;
  pr.rhythmNotesTold = pr.rhythmNotesFaded;
  pr.rhythmClefLost = false;
  return { notes, clef };
}

/** A round on `today` that earned a note in `world` (or none): the fades due come first, the count starts again; returns the new note. */
export function addRhythmRound(p: Profile, world: number, earned: boolean, today: string): RhythmNote | null {
  const pr = p.progress;
  rhythmNotes(p, today);
  pr.rhythmNotesAt = today;
  pr.rhythmNotesFaded = pr.rhythmNotesTold = 0;
  pr.rhythmClefLost = false;
  if (!earned) return null;
  const note = { world, n: Math.max(-1, ...pr.rhythmNoteList.map((x) => x.n)) + 1 };
  pr.rhythmNoteList.push(note);
  return note;
}
