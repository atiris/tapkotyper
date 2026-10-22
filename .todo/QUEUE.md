# Queue

The order in which `.todo/run-queue.ps1` implements the open plans, top first,
each in its own clean session. One line per plan in `.todo/`:
`- [P1|P2|P3] <plan>.md - <why it sits at this position>`. A plan that is not
listed here is never run. Lines whose plan has moved to `.todo/.done/` are
skipped, and the session that finishes a plan removes its line.


- [P2] 47-tooltip-and-screens.md - tooltip that 49 needs; frame of settings and help that 48 fills
- [P2] 48-writer-and-mentor.md - schema v4 and texts, after 47 touched the same screens
- [P2] 49-keyboard-only-play.md - needs the tooltip (47) and Super Tapko last (48)
- [P2] 50-rhythm-and-level-length.md - runtime changes after 49 settled the pause and HUD
