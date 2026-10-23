# Queue

The order in which `.todo/run-queue.ps1` implements the open plans, top first,
each in its own clean session. One line per plan in `.todo/`:
`- [P1|P2|P3] <plan>.md - <why it sits at this position>`. A plan that is not
listed here is never run. Lines whose plan has moved to `.todo/.done/` are
skipped, and the session that finishes a plan removes its line.


- [P2] 58-teacher-store-indexeddb.md - storage first, before launch; 59 builds on it
- [P2] 59-mentor-history-and-tapko-files.md - needs 58's IndexedDB stores
- [P3] 60-results-row-and-kid-hints.md - small polish, independent
