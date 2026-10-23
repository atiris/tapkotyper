# Queue

The order in which `.todo/run-queue.ps1` implements the open plans, top first,
each in its own clean session. One line per plan in `.todo/`:
`- [P1|P2|P3] <plan>.md - <why it sits at this position>`. A plan that is not
listed here is never run. Lines whose plan has moved to `.todo/.done/` are
skipped, and the session that finishes a plan removes its line.


- [P2] 52-natural-joy-and-results-fixes.md - small fixes first; adds story.cheer that 55 reuses
- [P2] 53-enter-paw-and-practice-styles.md - paw and typing input; before 54 and 55 touch runtime.ts
- [P2] 54-stay-a-while.md - endless run on top of the settled runtime
- [P2] 55-accuracy-target-practice.md - largest; reuses the cheers (52) and lock texts on the map
- [P3] 56-playful-progress-companion.md - small UI polish, last
- [P3] 57-tapko-in-the-rocket.md - world 2 polish, independent of the others
