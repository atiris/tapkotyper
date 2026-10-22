# Queue

The order in which `.todo/run-queue.ps1` implements the open plans, top first,
each in its own clean session. One line per plan in `.todo/`:
`- [P1|P2|P3] <plan>.md - <why it sits at this position>`. A plan that is not
listed here is never run. Lines whose plan has moved to `.todo/.done/` are
skipped, and the session that finishes a plan removes its line.


- [P1] 44-player-is-the-character.md - the player becomes the character; plans 45 and 46 build on it
- [P2] 45-wardrobe-time-limit.md - works on the wardrobe screen that plan 44 leaves
- [P2] 46-teacher-and-mobile.md - written to run after plans 44 and 45
