# Queue

The order in which `.todo/run-queue.ps1` implements the open plans, top first,
each in its own clean session. One line per plan in `.todo/`:
`- [P1|P2|P3] <plan>.md - <why it sits at this position>`. A plan that is not
listed here is never run. Lines whose plan has moved to `.todo/.done/` are
skipped, and the session that finishes a plan removes its line.

- [P1] 73-progress-bubbles-results-peek.md - global fixes (fair progress share, background drift) that 74 and 75 use
- [P2] 74-space-world-polish.md - after 73: the rocket approaches by its fair share and the belts drift
- [P2] 75-meadow-poppies-and-polish.md - after 73: uses the background drift; pictures already made
- [P3] 76-half-stars-in-results.md - independent and small; results card only
