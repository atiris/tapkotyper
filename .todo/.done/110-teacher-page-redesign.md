# 110 Teacher page redesign: Výsledky · Hodnotenie · Úlohy

The owner's redesign of `#/teacher`, agreed in chat on 2026-11-05 and drawn on the canvas
https://claude.ai/artifact/ATuwt3CJ4kAPHPom1MrKT1 (a copy of every board is in `.todo/.done/110-teacher-design/`,
`canvas.json` lists them with titles). The result must look and behave as close to the boards as the app allows.
**Where a board contradicts how the app works correctly today, the app wins**: e.g. the mobile boards draw an icon-only
"‹" where the app uses its back button with text, the boards inline colours the app takes from its CSS tokens (dark
mode too), the boards use placeholder text in brackets. Never copy a board's mistake into the app.

Affected: `src/screens/teacher.ts` (split into `src/screens/teacher/` modules: page shell, results, scan, link,
evaluation tabs, student card, data dialogs, tasks), `src/screens/teacher-scan.ts`, `src/ui/camera.ts`,
`src/share/teacher.ts`, `src/share/result.ts`, `src/share/tapko-file.ts`, `src/ui/task-form.ts`, `src/app/app.ts`
(routes), `src/styles.css`, `public/i18n/{sk,en}.json`, `public/i18n/translator/en.json`, `src/i18n/catalog.ts`,
specs `.specify/profiles/teacher-links.md` (+ `.specify/experience/help.md` where it names the teacher tabs), help texts
of the teachers' help tab, e2e `e2e/teacher-links.spec.ts`, `e2e/teacher-scan.spec.ts`, unit tests in `src/share/`.
Storage: the teacher's IndexedDB records get new optional fields (defaults, no migration - alpha). No player store
change except what a result carries.

## Decisions (all taken; nobody to ask)

### Data
- **Hidden player id** `pid` in every result: 6 base36 characters, a hash of the profile's `id` (stable, no new
  profile field). Joins the result checksum only when present, so older results keep verifying.
- **Hand-in id**: a result also carries `try` (the best run's `TaskRun.try`). A hand-in is identified by
  `pid + taskId + try`; legacy results without `pid` keep today's fingerprint identity.
  - The same hand-in id arriving again with the same content: nothing happens (as today).
  - The same hand-in id with **different** content (damaged or edited): the stored one stays, the new one is dropped
    silently.
  - Different `try` for the same task: another attempt, kept.
- **Student identity**: `pid` when present, else today's `name + group` key. A student's results always share one
  group. A result whose `pid` belongs to a stored student takes that student's group, whatever the result says.
- **Group of a new student**: the task's group from the result (the teacher's own label), else "Bez skupiny".
  Groups exist only through students in them; the empty group is "Bez skupiny". No group is chosen before scanning or
  loading a link. Group names compare folded (case, spaces, dots: "5a" = "5.A"); the first spelling stays.
- **Sources per hand-in**: `from: string[]` holding `scan`, `link` or a loaded file's id. A loaded file gets an `id`.
  Deleting a file deletes the hand-ins whose only sources are deleted files; the file rows go.
- **Mastered** in the teacher's views follows the game's scale: `ACCURACY.fair` (89 %), not the old 88.
- **Export** writes all results as `tt-YYYYMMDDHHMMSS.tapko` (local time). On a phone that can share files it offers the
  share sheet, else it saves. The "since last send" choice and the per-set send go.
- Removed: the age-based wipe dialog, per-set send/remove, set checkboxes and bulk actions in Skupiny, moving or
  removing a student from the card, the scan group field, the paste form on the page.

### Layout (boards)
- **Shell**: the bar (Späť + "Pre učiteľov"), the corner controls, then one panel with three top tabs **Výsledky ·
  Hodnotenie · Úlohy**. Hodnotenie has sub tabs **Skupiny · Študenti · Súbory · Dáta**, Úlohy has **Nová úloha ·
  Pripravené úlohy**. Each has its own address (`#/teacher`, `#/teacher/scan`, `#/teacher/link`,
  `#/teacher/eval/groups|students|files|data`, `#/teacher/eval/import`, `#/teacher/student/<key>`,
  `#/teacher/tasks/new|ready`, `#/teacher/task/<id>`), Back works. Old addresses (`#/teacher/newTask`, `/tasks`,
  `/child/…`, `/set/…`) map to the new ones. A result link (`#/result/…`) opens Výsledky and adds the result.
- **Výsledky** (boards 1, Mobil · Výsledky): one row - the text "Tu môžete načítať výsledky študentov skenovaním alebo sa
  tu objavia po kliknutí na odkaz s výsledkom. Ak chcete, môžete odkaz s výsledkom vložiť aj priamo." on the left,
  **Naskenovať QR** and **Načítať odkaz** on the right. Phone: only **QR sken** full width, no text, no link button.
  Below **Posledné pridané výsledky**: groups by the newest addition first, a group row ("Skupina X", "N načítaných",
  "›" → Hodnotenie Skupiny filtered to it) then its students newest first (name, task, accuracy, rhythm, "›" → the
  student card). No trash, no extra hint lines. A link that opened the page shows one status line (added / already
  here / damaged) under the row.
- **Skenovanie** (1b, Mobil · Skenovanie, Mobil na šírku · Skenovanie): a square camera area (`object-fit: cover`,
  the middle of the picture), a frame of about 78 % of it, a semi-transparent round-cornered switch button in its
  bottom-right corner shown only with several cameras (cycles them; replaces the select). Next to/under it "Načítané"
  (phone: "Skenovanie") with "N načítaných", the list of this scan newest first with an undo button each, and at the
  bottom **Zrušiť** and **Hotovo**. Zrušiť with results asks first and removes this scan's results; Hotovo goes to
  Hodnotenie › Študenti. Phone portrait: its own page (no bar, no tabs), camera + its row at most 3/5 of the height,
  the list scrolls, buttons always at the bottom. Phone landscape: camera on the left (full height square), list and
  buttons on the right. Desktop: inside the shell under the tabs, camera left (600 px square), list right.
  Keep today's flash/beep/buzz, orange blink for a known code, quiet unknown-code hint and camera error messages.
- **Načítanie odkazu** (1c, desktop only): like the scan page, the camera replaced by a textarea for the whole link and
  **Spracovať** under it. A processed link adds the result to the list on the right and clears the field; a bad one
  shows "Odkaz je nesprávny, nepodarilo sa ho spracovať." and clears the field. The message sits at the bottom of
  the left column so the button never moves. Zrušiť / Hotovo as on the scan page.
- **Hodnotenie › Skupiny** (2): a group combobox ("Všetky skupiny", the groups, "Bez skupiny"), **Stiahnuť CSV**, the
  sets table (day, time, group, tasks, results, "zvládli X z Y", accuracy, rhythm); a click opens the set's students
  inline (desktop) / the set page (phone, without send/remove). One short intro line.
- **Hodnotenie › Študenti** (2b, Mobil): search by part of the name, the group combobox ("Bez skupiny (N)"),
  **Stiahnuť CSV**, rows with a checkbox, name (→ card), group, hand-ins, last, accuracy, rhythm (sortable columns on a
  computer; a phone shows plain rows as on the board). Under the list a bar "Vybraní: N", "Preradiť do" combobox (groups, "Nová skupina…"
  asks the name in a small dialog, "Bez skupiny") and **Preradiť**.
- **Karta študenta** (2c, Mobil · Karta študenta): results only. Desktop: breadcrumb "Študenti › <skupina> › Meno",
  four tiles, Vývoj, hand-ins table without actions. Phone: its own page - the name with the group under it and a round
  X (top right) that closes it, tiles 2×2, the chart, hand-ins as rows; no bar, tabs or breadcrumb.
- **Hodnotenie › Súbory** (2d): the list of loaded files only.
- **Hodnotenie › Dáta** (2e, Mobil): sections **Prenos** (Export výsledkov, Import výsledkov → 2f), **Skupiny a
  študenti** (Premenovať skupinu, Zlúčiť skupiny, Zlúčiť študentov), **Mazanie** (Zmazať študentov skupiny, Zmazať
  študenta, Zmazať skupinu, Zmazať súbory, Zmazať všetky dáta). No hint lines.
- **Dialogs** (2g, 2h, Mobil okná): a modal on desktop, a bottom sheet on a phone; round X top right, Esc closes;
  title, one or two comboboxes (or a combobox and a name field), **Zrušiť** and **Potvrdiť** (red **Zmazať** for
  deletions). Premenovať: group + new name. Zlúčiť skupiny: source + target. Zlúčiť študentov: old profile + target
  (each option "Meno · skupina · N odovzdaní"); the old student's hand-ins move to the target. Zmazať študentov
  skupiny: group (its students and their hand-ins go). Zmazať študenta: student. Zmazať skupinu: group (students go to
  "Bez skupiny"). Zmazať súbory: file (its hand-ins that came only from deleted files go). Zmazať všetky dáta: a plain
  confirmation.
- **Import výsledkov** (2f): a drop zone with **Vybrať súbor**; after loading one line - success "Súbor <name> je v
  poriadku, výsledky sú načítané." or the error. No statistics. Files dropped anywhere on the teacher page still load.
- **Úlohy › Nová úloha** (3): today's form; the group is a combobox of the teacher's groups + "Nová skupina…" (asks the
  name) + "Bez skupiny"; the submit button reads **Uložiť ako novú úlohu**; saving opens the task.
- **Úlohy › Pripravené** (3b, Mobil · Pripravené, Mobil · Otvorená úloha): a table (desktop) / rows (phone) with title,
  game and limit, group, date and a square QR-shaped button. Desktop opens the task in a right panel: title + summary,
  the QR code, **Kopírovať odkaz**, **Veľký kód**, **Upraviť**, **Odstrániť** (asks first). Phone: its own page with the
  title, a round X top right, the QR, **Zdieľať odkaz** (only with a share sheet) and **Kopírovať odkaz**, **Upraviť**,
  **Odstrániť**.
- Buttons with text carry no icons (the app's back button keeps its own look); icon-only buttons have an aria-label.
  Every text in sk and en, translator notes and catalog groups for new keys; drop unused keys.

## Steps
- [x] 1. Data: `pid` + `try` in results (`makeResult`, `makeOverallResult`, checksum, `cleanResult`), student
  identity, group rules, `from` sources and file ids, hand-in conflicts, file deletion, group/student operations
  (rename, merge groups, merge students, move, delete group/students/student/files/all), `ACCURACY.fair` as
  mastered, `tt-…tapko` name. Unit tests for every rule. Commit.
- [x] 2. Routes and the shell: new addresses + old ones mapped, top tabs and sub tabs, module split of `teacher.ts`.
  Commit.
- [x] 3. Výsledky page with the recent list; result link handling. Commit.
- [x] 4. Scan page (desktop, phone portrait/landscape), camera switch button, Zrušiť/Hotovo; link page. Commit.
- [x] 5. Hodnotenie: Skupiny, Študenti with bulk move, student card (desktop + phone page), Súbory. Commit.
- [x] 6. Dáta with the dialogs (modal / bottom sheet), Export, Import page. Commit.
- [x] 7. Úlohy: form changes, Pripravené with the task panel / phone page. Commit.
- [x] 8. i18n sk/en, translator notes, catalog; specs (`teacher-links.md`, `help.md`, the help tab texts); e2e specs
  updated; `npm run build`, unit tests, the two teacher e2e specs; browser check of every board (desktop 1280, phone
  390×844 and 844×390, dark mode once) with the playwright MCP. Commit.
- [x] 9. **Independent review**: a fresh agent (model opus) with only this plan, the boards in
  `.todo/.done/110-teacher-design/` and the repo compares the running app with every board and every decision above,
  reports each mismatch or quality problem (look, behaviour, texts, accessibility, dead code, specs), and fixes them.
  If it fixed anything substantial (behaviour, a screen's structure, data rules), a second fresh agent reviews again
  the same way; repeat until a review finds nothing substantial. Commit the fixes.
- [x] 10. Move this plan and `110-teacher-design/` to `.todo/.done/`, `## Done` notes, queue line removed. Commit, push.

## State
- Steps 1-8 landed in one commit: the screens could not build on the old data layer, so data, routes, parts, texts,
  specs and tests went together. Unit tests 632/632, build, the two teacher e2e specs 6/6, and every board checked in the
  browser (desktop 1280, phone 390x844 and 844x390, dark mode).
- Where the boards and the app differ, the app won: the app's own back button and corner buttons stay; colours come
  from the app's tokens; the phone's "Skupiny a študenti" buttons stand in one column (two columns broke their words);
  the board's Študenti line "jednotlivo na ich karte" is gone because the card holds results only; the camera switch
  replaced the camera select on the other two camera screens too, so the app has one camera.

## Done - 2026-11-05
- Shipped: the teacher page in three parts (Výsledky, Hodnotenie, Úlohy) with scan and link pages, Skupiny, Študenti
  with moving ticked students, the student card, Súbory, Dáta with its dialogs and the import page, the task form's group
  choice and Pripravené úlohy with the QR panel / phone page; the hidden player id and run in results, sources per
  hand-in, group folding, merges and file deletion; texts sk/en, help, the about page line, README, specs, unit and e2e
  tests (2ca921b, 249b814, 5ed0085).
- Independent reviews: round 1 (395840c, 7477520) and round 2 (dc4132f, eb53419) fixed card navigation, so a further
  round followed; round 3 (2643f1e, 668161e) found only a small history fix, nothing substantial.
- Left out on purpose: the two delete dialogs' explaining lines (the owner's no-hint rule), the task panel's line between
  its button rows and the Študenti "Skupina" label (minor, kept as the app has them).
