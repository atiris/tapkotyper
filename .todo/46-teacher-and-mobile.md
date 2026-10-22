# 46 Teacher view on phones, QR code layout, top bar by width, keyboard gate

Runs **after plans 44-45**.

Design (canvas, 8 artboards): https://claude.ai/artifact/MZ63iMmoi8n2XYymnakUbn — phone start
with the keyboard gate, top bar at three widths, phone scan, phone results list, phone child
card, desktop table, the two QR codes. The design wins where this text is silent.

Affected: `src/screens/{start,teacher,teacher-scan,stats,task,free-type}.ts`, `src/ui/{chrome,big-code,
hud,dom}.ts`, new `src/ui/menu.ts`, new `src/app/keyboard-gate.ts`, `src/app/app.ts` (route
guard), `src/share/teacher.ts` (sort, per-child view), `src/audio/audio.ts`, `src/styles.css`,
`public/i18n/{sk,en}.json`, `e2e/{layout,teacher-scan,teacher-links,styles}.spec.ts` + a new
`e2e/mobile.spec.ts`, `.specify/experience/ui-rules.md`, new `.specify/experience/devices.md`
(+ `index.md` line), `.specify/profiles/teacher-links.md`, `.specify/experience/help.md`.
Contracts: none (no storage, link or QR payload change). No server, no DB.

## What
1. **Keyboard gate on touch-only devices.** A phone or tablet without a physical keyboard
   cannot play. The start screen says so at once: a card "Pripoj klávesnicu" with a short
   explanation, a status line, a "Skontrolovať znova" button, and under it a big orange
   **"Pre učiteľov"** button with a new teacher animal, a **turtle with glasses and a mortar
   board** (not one of the nine player animals). Players, guest, new player and import are
   hidden while the gate is up. Pressing any key on a connected keyboard lifts the gate at once.
2. **Top bar by width** (all screens with corner controls, not a level):
   - 900 px and wider: as today, the SK/EN switch plus the round buttons.
   - 600-899 px: the language becomes one **round button** showing `SK`/`EN`; a click switches
     to the next language.
   - Below 600 px: one round **Menu** button; it opens a panel with each control as a round
     icon plus its label (language, teacher, sound, fullscreen, help, the super star when on).
   - The start title **TapkoTyper** always fits on one line **under** the buttons at any
     width from 320 px up.
3. **Teacher scanning on a phone**: after "Skenovať kamerou" the page scrolls so the camera
   preview and the **Hotovo** bar are both in view. The bar shows how many codes this scan
   read ("7 načítaných", under it "5 nových · 2 aktualizované") next to "> Hotovo". The list
   of this scan stays under it.
4. **Results that work on a phone**:
   - A **task picker** ("Všetky úlohy" or one task with its count) next to the group chips.
   - **Sorting** by child, date, minutes, accuracy, rhythm, levels or status. On a desktop the
     column headers are the sort buttons (arrow on the active one); below 700 px the table
     becomes a list of cards with a row of sort chips, and each card shows the sorted value
     big on the right.
   - Clicking a child (name in the table, the whole card on a phone) opens the **child card**:
     name, group, number of tasks, four tiles (average accuracy, average rhythm, minutes in
     total, levels), the weakest keys, every task of that child with date, minutes, rhythm,
     status and accuracy, and actions "Presunúť do skupiny" and "Odstrániť žiaka".
5. **QR code screen** (child side, `bigCode`): one caption pill "NAME · Štatistiky cvičenia
   XYZ" (green frame) or "NAME · Celé moje štatistiky" (orange frame), then the QR code, then
   two buttons "Kopírovať kód" and "Zatvoriť klikom na obrazovku". A click anywhere else
   still closes it. The frame's inner padding and the gaps between caption, code and buttons
   are one and the same size.
6. **Sound on phones** plays (it does not today; that is a bug, not intended).
7. **The place-in-the-world button in a story level** (number of the level inside a ring
   of segments, one per level of the current world) looks like the other round buttons of
   the level bar, e.g. the rhythm ring: a white circle, the same size, no square-ish frame.

## Why
- The game needs a real keyboard; a child on a phone without one should learn that before
  creating a profile, while a teacher on the same phone gets straight to the scanner.
- Five round buttons plus a language switch do not fit beside a page title on a phone and
  squeeze or cover it; the title is the app's face and must stay whole.
- A teacher scans walking through a classroom with a phone in one hand: the camera and the
  way out must be on screen without scrolling, and a counter confirms the scans.
- A nine-column table is unreadable on a phone; sorting and one child's card answer the
  questions a teacher actually has ("who needs help", "how is Jakub doing").
- The child's name first and one clear close button make the QR screen self-explaining;
  equal spacing makes it calm.
- The level bar is one family of round buttons; one odd button looks broken.

## Decisions
- **Keyboard gate** (`src/app/keyboard-gate.ts`):
  - Gated when `matchMedia('(any-pointer: fine)')` is false and `'ontouchstart' in window`
    (touch only), until a physical key is seen. A key is "seen" on any `keydown` while no
    text input has focus (the gate has none, so an on-screen keyboard cannot fire it); it is
    remembered in `sessionStorage['tapkotyper:keyboard']` for the session. Desktop and any
    device with a mouse or trackpad are never gated.
  - "Skontrolovať znova" re-checks the media queries and the flag; if still gated, the status
    line changes to "Stlač na klávesnici ľubovoľný kláves." and the card shakes gently
    (no motion with `reduceMotion`). The status starts as "Klávesnica zatiaľ nie je
    pripojená." (no gendered Slovak past tense).
  - Route guard in `app.ts`: while gated only `start`, `teacher` (also from result links),
    `help` and the about tab are reachable; every other route, including task links and
    deep links to the map, goes to `start`. A task link waiting in `app.pendingTask` is kept
    and continues once the gate lifts.
  - The gate lifts in place: on the key the start screen repaints with the normal panel.
  - The teacher button is a big `<button>` (full width on a phone) with the turtle as inline
    SVG in `src/ui/dom.ts` (`TEACHER_ART`, the drawing from the design artboard "Phone start"),
    title "Pre učiteľov" / "For teachers", subline "Skenovať QR kódy a pozrieť výsledky
    triedy" / "Scan QR codes and see the class results". The turtle is also used on the
    teacher screen's empty state. No raster asset.
- **Top bar** (`src/ui/chrome.ts`, new `src/ui/menu.ts`): `cornerControls()` renders three
  forms and CSS shows one per width: `@media (min-width: 900px)` full; `600-899` the
  `lang-switch` is swapped for a round `lang` button (`roundButton('control', …)` with the
  language code drawn like `rb-num`); `< 600` only the Menu round button (`menu` icon, three
  lines; `close` icon while open, `aria-expanded`), opening a `role="menu"` panel under it
  (round icons 44 px plus labels, the sound item shows its level, the language item switches
  on click). The panel closes on Esc, on a click outside and after an action; focus goes to
  the first item on open and back to the button on close. A screen's own `lead` buttons
  (map: wardrobe, stats, parent…) go into the menu too below 600 px. `.screen > .bar` keeps
  `padding-right` for one round button below 600 px instead of five.
- **Title fits**: `.start-screen .title` gets `font-size: min(88px, calc((100vw - 32px) /
  6.4))`, `white-space: nowrap`, and sits below the corner row (`padding-top` = top offset +
  52 px + 16 px below 900 px). An e2e test checks `scrollWidth <= clientWidth` of the title
  and no overlap with `.top-right` at 320, 390, 600, 899, 900 and 1280 px.
- **Scan on a phone** (`teacher-scan.ts`, `teacher.ts`): after the camera starts,
  `scan.el.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' })`.
  Card order: a heading "Skenovanie · <group>" (group omitted when empty), the preview, the
  done bar, the camera picker, status, the list. Below 700 px the preview height is
  `calc(100dvh - <heading> - <done bar> - 4 * 16px)` (min 240 px) so both fit. The done bar
  shows `teacher.scan.count` ("{n} načítaných") and `teacher.scan.split` ("{fresh} nových ·
  {updated} aktualizované"; the second part only when non-zero), from the existing
  `session` list. Hotovo stops the camera and scrolls to the results, filtered to the
  scanned group.
- **Sorting** (`src/share/teacher.ts`): `type SortKey = 'child' | 'date' | 'minutes' |
  'accuracy' | 'rhythm' | 'levels' | 'status'`; `sorted(rows, sort?)` keeps the block order
  group > task and orders the children inside a block by the key (ties by name). First
  click on a numeric key or date sorts descending, on child or status ascending; a second
  click flips. The sort lives in the screen state (not stored). Default: by child, as today.
  Status sorts "Precvičiť" first when ascending. Unit tests for every key and the tie rule.
- **Task picker**: a `<select>` of "Všetky úlohy" plus each task title with its count in the
  current group filter; picking a task hides the other task blocks. Combined with the group
  chips, summary and CSV of "shown rows" follow both filters.
- **Phone list** (below 700 px, CSS swaps the table for the list; both are rendered from one
  `rows` array): sort chips in one horizontally scrolling row (no page scroll), each card a
  `<button>` with name, a sub line of the other metrics and the status pill, and on the
  right the value of the active sort key (accuracy when sorting by child, date or status).
  Picking checkboxes and bulk actions are desktop only; on a phone the child card offers
  move and remove.
- **Child card**: a view inside the teacher screen, route param `child` (`go('teacher',
  { child: key })`, so the browser's Back returns to the list); key = group + `\u0000` +
  name (two children of the same name in different groups stay apart). Tiles: average
  accuracy and rhythm over the child's results, the sum of minutes, and levels from the
  newest overall-statistics result (tile hidden when there is none). Weakest keys: the
  lowest four over all results (lowest accuracy per key). Tasks newest first. "Presunúť do
  skupiny" uses the existing assign flow for all the child's results; "Odstrániť žiaka"
  confirms with the count and removes them; afterwards back to the list.
- **QR screen** (`src/ui/big-code.ts`): signature `bigCode(link, name, caption, kind)`;
  caption pill text `${name} · ${caption}` where caption is `progress.exerciseCaption`
  ("Štatistiky cvičenia {title}" / "Exercise statistics: {title}") or
  `progress.overallCaption` ("Celé moje štatistiky" / "All my statistics"). Layout: a grid
  `auto 1fr auto` inside the 14 px frame, one token `--bc-gap: clamp(16px, 3vmin, 32px)` for
  the padding and both gaps; the QR is square and as large as the middle row allows
  (`height: 100%; aspect-ratio: 1; max-width: 100%`). Buttons: "Kopírovať kód" (filled in
  the frame color, shows "Skopírované" in its own label for 2 s) and a real close button
  `share.closeByClick` ("Zatvoriť klikom na obrazovku" / "Close by clicking anywhere");
  side by side when they fit, stacked full width otherwise. The old name line and hint
  line (`progress.codeClose`) go away. Callers in `stats.ts` and `task.ts` follow. An e2e
  test measures the three gaps and the padding as equal (±1 px) at 390 x 844 and 1280 x 800.
- **Sound on phones** (`src/audio/audio.ts`): unlock also on `pointerup`, `touchend` and
  `click` (iOS Safari only accepts those as a user gesture for audio), and on unlock play
  one silent 1-frame buffer and retry `play()` of a waiting music element. The listeners
  are removed once `ctx.state === 'running'`. Note in the spec: the iPhone's silent switch
  mutes web audio by design.
- **Place ring look** (`src/styles.css`, `src/screens/free-type.ts`): the free-typing place
  picker's tile class `.place` (`styles.css` around line 372: padding, `border-radius: 18px`,
  translucent background, grid) also matches the level bar's `round-btn place` and, being
  later in the file, overrides `.round-btn`. Rename the picker tiles to `.place-tile` (rules
  and the `class` in `free-type.ts`); the round kind stays `place`. An e2e check in
  `e2e/styles.spec.ts` compares the computed `border-radius`, `padding` and size of the
  place ring with the rhythm ring in a story level.
- **Help**: the unified help mentions the Menu button on small screens and the keyboard
  requirement.
- All new texts in sk and en; Slovak without gendered second-person past tense.

## Steps
- [x] Keyboard gate module, route guard, start screen gate card and teacher button with the
      turtle; e2e with a touch-only context (`hasTouch: true`, `isMobile: true`): gate
      shown, routes guarded, a key press lifts it; a desktop context is never gated.
- [x] Corner controls in three forms, menu panel with keyboard and focus handling, bar
      padding, title sizing; e2e for the widths listed above.
- [x] Scan card order, scroll into view, phone preview height, done bar with counts.
- [x] Teacher store sort with unit tests; task picker; sortable headers with `aria-sort`;
      phone card list with sort chips.
- [x] Child card view with route param, tiles, weak keys, tasks, move and remove.
- [x] `bigCode` layout, caption with the name, two buttons, equal spacing; callers; e2e.
- [x] Audio unlock on touch gestures.
- [x] Place ring look: rename the picker tile class, e2e style check against the rhythm ring.
- [x] i18n sk + en; specs (`ui-rules.md` widths and menu, new `devices.md` keyboard gate,
      `teacher-links.md` sorting, child card and phone scan, `help.md`), `index.md` line.
- [x] `npm run build`, `npm test`, `npx playwright test` pass.
- [x] Drive the app with the playwright MCP at 390 x 844 touch-only and at 1280 x 800:
      gate and its lift, teacher button, menu open/close with Esc, language round button at
      760 px, title fits at 320 px; teacher: paste three result links, sort by accuracy and
      rhythm on both layouts, open a child card and come back with Back; scan with the
      fake camera from `e2e/teacher-scan.spec.ts` and see the preview and Hotovo in view
      with the counter; in a story level the place ring looks like the rhythm ring, and the
      free-typing place picker tiles look as before; both QR screens show the name first and close by a click anywhere
      and by the button; console clean, no 404s.
- [~] Real iPhone/Android sound check: the playwright MCP cannot play audio on a real
      phone; done by the user when trying the deployed build.

## State
- Decisions taken while implementing:
  - The title sits under the corner row at **every** width (padding-top on the start screen),
    not only below 900 px: at 900-1280 px the centered logo + title also ran under the
    buttons. Below 900 px the hero stacks (logo over the title), below 600 px the logo hides
    (as in the design), and the title size also keeps its old height cap so the start page
    still does not scroll at 1024 x 600.
  - The menu panel mirrors the hidden corner row: each item copies a round button's picture
    and label and clicks the real (hidden) button, so a screen's own buttons (map: settings)
    and the break's disabled help follow with no extra code. Arrow keys move between items.
  - The language controls live in `chrome.ts` (`languageControls`); labels are
    `start.langNow` ("Jazyk: slovenčina") and `start.langNext`, fixed per dictionary (two
    languages).
  - A task link blocked by the gate is remembered as its route and opened once a key lifts
    the gate (the task is parsed only then); other blocked routes just start over.
  - The big teacher button shows only while the gate is up; with a keyboard the round
    teacher button in the corner stays.
  - Scan: on a phone the heading, preview and done bar sit in one flex column one screen
    tall (`100dvh - 2 x 16px`, preview `flex: 1`, min 240 px) instead of a calculated
    preview height, so the done bar's real height never pushes it off screen. Counts use
    two keys (`teacher.scan.fresh`, `teacher.scan.updatedCount`).
  - The view state (group filter, task, sort) is kept in memory for the screen's module so
    Back from a child card returns to the same list; the card's own Back uses
    `history.back()` when it was opened from the list. After "Presunúť do skupiny" the card
    reopens under the new group (replaced address); after removing, back to the list.
  - The task picker hides while there is only one task.
  - Phone sort chips use short labels (`teacher.sort.*`); the table keeps the column names.
  - Status texts now read "Zvládnuté" / "Precvičiť" ("Mastered" / "Practice more") as in
    the design.
  - QR screen: the code is sized by a small fit function (room left by caption and buttons,
    as a square) and the block is centered; on a tall phone the extra height goes above and
    below, so "padding" in the e2e check is the smaller of the top and side padding.
  - Fixed on the way (same file): the teacher CSV had 11 header columns but 9 values per
    row; the rows now carry levels and status too.
- Browser run (playwright MCP on the preview build): touch-only 390 x 844 - gate card,
  teacher button, menu with five items and focus on the first, a tap outside closes it,
  "Skontrolovať znova" changes the status and shakes, `#/new`, `#/p/x/wardrobe` and
  `#/task/..` go to the start page, teacher and help open, a key lifts the gate (and opened
  the held task link); computer 320-1280 px - title fits with no overlap and no sideways
  scroll, round SK button at 600-899 px; teacher at 1280 and 390 - four pasted results,
  sorting by accuracy and rhythm, task picker, child card and Back keeping filter and sort,
  phone cards with sort chips; QR screen at 1280 x 800 and 390 x 844 - name first, padding
  and gaps 24 / 16 px, copy keeps it open, close button and a click close it; console clean.
  The fake camera scan, Esc in the menu, the round language button switching and the place
  ring style were checked by the e2e tests (the MCP browser has no fake camera, and any key
  lifts the gate on a touch-only page).
