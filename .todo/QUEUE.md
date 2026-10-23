# Queue

The order in which `.todo/run-queue.ps1` implements the open plans, top first,
each in its own clean session. One line per plan in `.todo/`:
`- [P1|P2|P3] <plan>.md - <why it sits at this position>`. A plan that is not
listed here is never run. Lines whose plan has moved to `.todo/.done/` are
skipped, and the session that finishes a plan removes its line.


- [P2] 50-rhythm-and-level-length.md - runtime changes after 49 settled the pause and HUD
- [P2] 51-player-pick-by-number.md - start screen only; after 50 so it does not touch a file 50 has open
