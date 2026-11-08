# Queue

The order in which `.todo/run-queue.ps1` implements the open plans, top first,
each in its own clean session. One line per plan in `.todo/`:
`- [P1|P2|P3] <plan>.md - <why it sits at this position>`. A plan that is not
listed here is never run. Lines whose plan has moved to `.todo/.done/` are
skipped, and the session that finishes a plan removes its line.
- [P1] rhythm-measure.md - the backlog P1: evenness in every level, one set of top-bar rings, statistics
- [P2] paw-help-removal.md - after rhythm-measure, which rebuilds the same top bar
- [P2] music-continuity.md - independent; fewer music cuts between map and levels
- [P2] settings-reorg.md - after rhythm-measure, which adds its switches to the same settings tab
