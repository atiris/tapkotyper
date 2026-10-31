# Queue

The order in which `.todo/run-queue.ps1` implements the open plans, top first,
each in its own clean session. One line per plan in `.todo/`:
`- [P1|P2|P3] <plan>.md - <why it sits at this position>`. A plan that is not
listed here is never run. Lines whose plan has moved to `.todo/.done/` are
skipped, and the session that finishes a plan removes its line.

- [P1] 89-typing-time.md - wrong trained minutes reach teachers, surprises and the wardrobe; small, independent
- [P2] 86-heros-journey.md - owner asked for it; nothing else queued
- [P2] 87-egg-mountain.md - world 5 of the dragon story; independent of 86, before 88
- [P2] 88-dragon-heros-journey.md - needs 86 (journey machinery) and 87 (world 5 modes)
- [P3] 90-upkeep-loading-drawing-runtime.md - backlog upkeep; after 89 (both touch runtime.ts timekeeping)
- [P3] 91-audible-dictation-words.md - backlog fix for own-practice dictation; independent
