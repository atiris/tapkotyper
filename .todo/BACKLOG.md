# Backlog

Everything found outside the current task, one line each, most important first:
`- [P1|P2|P3] <title> - <one line: what is wrong and where>`.
Search before adding; an entry is worked only when it is named.
- [P3] Objects can flash their fallback on first spawn - src/game/runtime.ts prepare() preloads only the three backgrounds; mode sprites load on first draw (declare them per mode)
- [P3] An update re-downloads the whole install cache - scripts/sw-template.js addAll(CORE) fetches every file again when the version changes (about 6.6 MB)
- [P3] Check .tapko sharing and opening on real devices - src/screens/teacher.ts sendDialog uses Web Share with files (Android, iPhone) and main.ts launchQueue opens a double-clicked .tapko in installed Chrome/Edge (plan 59); neither is testable here
- [P2] Mole and molehill are one picture - assets-src/obj-mole.jpg draws the mole inside its hill; the mole level (src/game/modes/egg.ts) needs the mole and the molehill as separate pictures
- [P3] Robohome floor strip shows its seam joins - public/assets/bg-robohome-near.webp: quilt cut the regular planks diagonally (V lines every screen width); repaint that seam or regenerate the floor strips
- [P3] Tooltip e2e fails on a new player's map - e2e/tooltip.spec.ts:28 Escape no longer hides the tooltip: the welcome card's capture Escape handler (src/screens/map.ts welcomeCard, stopImmediatePropagation) eats it before src/ui/tooltip.ts sees it
- [P2] Free typing intro unreadable in the dark look - e2e/theme.spec.ts:165 fails: freeType.start drawn at contrast 2.26 (needs 4.5) on rgb(58,52,86) on the free typing screen (fails before plan 63 too)
- [P3] E2e flaky in a full run - free-type.spec.ts:82, styles.spec.ts:31, translate.spec.ts:15 and service.spec.ts:27 fail now and then in `npx playwright test` but pass alone (timing under load)
