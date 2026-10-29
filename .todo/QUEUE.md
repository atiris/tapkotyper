# Queue

The order in which `.todo/run-queue.ps1` implements the open plans, top first,
each in its own clean session. One line per plan in `.todo/`:
`- [P1|P2|P3] <plan>.md - <why it sits at this position>`. A plan that is not
listed here is never run. Lines whose plan has moved to `.todo/.done/` are
skipped, and the session that finishes a plan removes its line.

- [P1] 80-dragon-valley.md - after 81; world 4 is the next world of the dragon story to redo
- [P2] 82-performance-and-upkeep.md - after 81 and 80, so it measures and reviews only the code that stays and the new valley
