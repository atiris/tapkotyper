# Queue

The order in which `.todo/run-queue.ps1` implements the open plans, top first,
each in its own clean session. One line per plan in `.todo/`:
`- [P1|P2|P3] <plan>.md - <why it sits at this position>`. A plan that is not
listed here is never run. Lines whose plan has moved to `.todo/.done/` are
skipped, and the session that finishes a plan removes its line.

- [P2] 102-key-drill-and-check.md - first; drill card, Keys tab, per-key keyboard check, names
- [P2] 103-panel-keyboard-shortcuts.md - after 102, which changes the end cards' buttons first
