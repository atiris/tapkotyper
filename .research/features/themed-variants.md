# Themed level variants: magic and robot

**Status:** new (owner's idea, 2026-10-20, not yet in spec or plans). **Prio:** P3.

## What
- Every level can have two alternative themes besides the default story version:
  - **Magic:** the child types spells; a finished spell does what the level needs
    (a levitation spell lifts the rock, a bridge spell builds the stepping stones,
    a shield spell protects the dragons).
  - **Robot:** the child types machine parts (gear, wire, bolt, lever, battery); each
    finished part is plugged into a machine, and when the machine is complete it does
    the job (a crane moves the rock, a bridge builder lays the stones).
- Same keys, word rules and difficulty as the default version; only the words, visuals,
  sounds and the "what happens" animation change.
- The child (or parent) picks the theme per world, or a theme is used as a replay
  variant of a finished level.
- Spell and part names are themed word lists per language, filtered by the active keys
  like any other word list (the pseudo-word generator can make "spell-like" words, e.g.
  repeated syllables, when real words do not fit the key set).

## Why
- Replay variety without new mechanics: the same level feels new with a different story.
- Different children are drawn to different fantasies (wizard vs. engineer); letting the
  child choose increases motivation without competition or rewards pressure.
- A machine built from typed parts shows nicely how many small correct steps lead to a
  result, which fits the accuracy-first approach.

## Open questions
- Whole-game theme switch vs. per-level choice.
- Extra art: magic and robot sprites would need new Gemini prompts.
