# Queue

The order in which `.todo/run-queue.ps1` implements the open plans, top first,
each in its own clean session. One line per plan in `.todo/`:
`- [P1|P2|P3] <plan>.md - <why it sits at this position>`. A plan that is not
listed here is never run. Lines whose plan has moved to `.todo/.done/` are
skipped, and the session that finishes a plan removes its line.

- [P1] 93-egg-spell-rework.md - owner review of the story's last level; small and independent, first
- [P1] 94-dragon-journey-review.md - owner review of the dragon journey; after 93 so the journey follows the hatching as reworked
- [P1] 95-teacher-tasks.md - owner wish: tasks made on the teacher page, the player's Tasks page, noting on a phone; independent of 93 and 94
- [P1] 96-task-games.md - the five task games; after 95 (task fields) and 93 (the reworked ribbon it reuses)
- [P2] 92-story-pack-groundwork.md - safe refactors only, ahead of any story pack work; nothing depends on it yet
