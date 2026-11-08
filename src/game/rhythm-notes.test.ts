import { describe, expect, it } from 'vitest';
import { newProfile } from '../storage/store';
import { addRhythmRound, fadeNotesToday, untoldFades } from './rhythm-notes';

describe('rhythm notes flying away', () => {
  it('tells the notes flown once, and the clef when it went with them', () => {
    const p = newProfile('Ema', 'sk');
    p.progress.rhythmNoteList = [{ world: 0, n: 0 }];
    p.progress.rhythmNotesAt = '2026-11-01';
    // Played on the 1st: one note flies away on the 5th, when the player becomes active.
    fadeNotesToday(p, '2026-11-05');
    expect(p.progress.rhythmNoteList).toEqual([]);
    expect(untoldFades(p)).toEqual({ notes: 1, clef: true });
    expect(untoldFades(p)).toEqual({ notes: 0, clef: false });
  });

  it('a round starts the count again', () => {
    const p = newProfile('Ema', 'sk');
    p.progress.rhythmNoteList = [{ world: 0, n: 0 }, { world: 0, n: 1 }];
    p.progress.rhythmNotesAt = '2026-11-01';
    fadeNotesToday(p, '2026-11-05');
    expect(untoldFades(p)).toEqual({ notes: 1, clef: false });
    addRhythmRound(p, 0, false, '2026-11-05');
    expect(p.progress.rhythmNotesTold).toBe(0);
    fadeNotesToday(p, '2026-11-09');
    expect(untoldFades(p)).toEqual({ notes: 1, clef: true });
  });
});
