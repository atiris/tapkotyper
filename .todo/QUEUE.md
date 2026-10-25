# Queue

The order in which `.todo/run-queue.ps1` implements the open plans, top first,
each in its own clean session. One line per plan in `.todo/`:
`- [P1|P2|P3] <plan>.md - <why it sits at this position>`. A plan that is not
listed here is never run. Lines whose plan has moved to `.todo/.done/` are
skipped, and the session that finishes a plan removes its line.
- [P2] 67-parrot.md - parrot side card, fly-away and badge; decided and pictures ready, independent of the meadow playtest
- [P3] 69-loading-speed.md - faster updates and no fallback flash; independent, after the parrot
