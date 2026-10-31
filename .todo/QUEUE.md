# Queue

The order in which `.todo/run-queue.ps1` implements the open plans, top first,
each in its own clean session. One line per plan in `.todo/`:
`- [P1|P2|P3] <plan>.md - <why it sits at this position>`. A plan that is not
listed here is never run. Lines whose plan has moved to `.todo/.done/` are
skipped, and the session that finishes a plan removes its line.

- [P2] 92-story-pack-groundwork.md - safe refactors only, ahead of any story pack work; nothing depends on it yet
- [P3] 97-readme-screenshots.md - owner wish: README pictures of the game as it is now; last, so they show the work of the plans before it
