# 95 - Tasks: made by the teacher, kept on the player's Tasks page, noted on a phone

The owner (2026-10-31) wants tasks made only on the teacher's page, with the game, the text source and
the limits chosen there; each player gets a **Tasks page** (from the map) to add a task by camera or
code, play it again (the better result counts), hand it in, show its code or look at its result; and a
phone without a keyboard notes a task from the teacher's QR code and sends it home. Today a task is
made in a player's parent settings (`taskTab` in `src/screens/parent.ts`, kinds `practice`/`story`),
plays the practice level, is finished once, and its hand-in lives in My progress, tab Cvičenia.

How the task is **played** (the five task games, limits, dictionary, letters, world, intro text) is
plan 96. This plan builds the task's data, its making, the Tasks page and the phone; until plan 96
lands, every task plays the practice level with its words and text as today (`startTask`, labelled
`// TEMP: plan 96 plays the task's own game`).

Affects `src/storage/schema.ts` (Task, store data), `src/storage/store.ts`, `src/share/task.ts` (spec,
code, parse, best run), `src/share/result.ts` (if a field moves), `src/screens/teacher.ts` + a new
`src/ui/task-form.ts`, `src/screens/parent.ts` (its task tab goes), a new `src/screens/tasks.ts`
(the player's Tasks page), `src/screens/map.ts` (button), `src/screens/stats.ts` (its Cvičenia tab
goes), `src/screens/task.ts`, `src/screens/start.ts` (phone button; `taskPanel` moves to
`src/ui/task-panel.ts`), a new `src/screens/task-note.ts`, a new camera helper in `src/ui/` shared
with `src/screens/teacher-scan.ts`, `src/app/app.ts` + `src/main.ts` (screens, routes, `NO_KEYBOARD`),
`src/ui/dom.ts` (art), `src/ui/big-code.ts` (task caption), `src/styles.css`,
`public/i18n/{sk,en}.json`, `public/i18n/translator/en.json`, `src/i18n/catalog.ts`,
`.specify/profiles/teacher-links.md`, `.specify/profiles/parent-controls.md`,
`.specify/profiles/statistics.md`, `.specify/experience/devices.md`.
Store: new fields get defaults, **no migration (alpha)**, no version bump; the task link's content
changes without backward compatibility (alpha: an old task link may simply be refused as broken).
The teacher's IndexedDB (`src/share/teacher-db.ts`) is not touched.

## Decisions (taken; do not ask)

### The task (`TaskSpec`, in the link and in the player's `Task`)
- Fields: `id`, `title`, `group?`, `game`, `words: string[]`, `text: string`, `limit`, `minutes`,
  `dictionary: boolean`, `knownOnly: boolean`, `world: 'current' | 'random'`.
  - `game`: `'chase'` Prúd slov, `'catch'` Čakajúce slová, `'copy'` Odpis, `'ribbon'` Pás,
    `'transcribe'` Prepis. Words games (`chase`, `catch`) use `words`; text games (`copy`,
    `ribbon`, `transcribe`) use `text`. The other source is stored empty.
  - `limit`: `'time'` (default), `'text'`, `'both'`. `minutes` 1..30 (default 5), used by `time` and
    `both`, kept but unused for `text`.
  - `dictionary` default `true`, `knownOnly` default `true`, `world` default `'current'`.
- `TaskKind` (`practice`/`story`) and `taskOwn`'s share go; every place that shows the kind shows the
  game's name (`map.act.*` texts where they exist: chase/catch/clean; new `task.game.ribbon` "Pás",
  `task.game.transcribe` "Prepis"; better one `task.game.*` group for all five so the names stay
  together).
- **Best run**: a task keeps its best finished run (`seconds`, `chars`, `errors`, `cpm`, `doneAt`)
  and its unfinished progress. Playing a finished task again starts from zero; when that run
  finishes and is **better**, it replaces the best (better = higher accuracy; equal accuracy ->
  higher cpm). An unfinished repeat never changes the best. The hand-in and the result use the best.
  `recordTaskRun` does this; unit tests cover better, worse, equal and unfinished.

### Making tasks: only on the teacher's page
- The parent settings' task tab goes (its tab id, texts that only it used, its CSS).
- Teacher page: `TABS` becomes `['groups', 'writers', 'files', 'tasks']`, tab "Úlohy" / "Tasks",
  route `#/teacher/tasks`. The tab: the form card on top, under it "Pripravené úlohy", newest first.
- The form (`src/ui/task-form.ts`), top to bottom, each field with a one-line hint where it needs one:
  1. **Názov úlohy** and **Skupina** (as today's fields).
  2. **Hra**: Prúd slov, Čakajúce slová, Odpis, Pás, Prepis (a segmented choice, default Prúd slov).
  3. **Slová** (a list field, for Prúd slov and Čakajúce slová) or **Text** (a text area, for Odpis,
     Pás, Prepis) - only the one the game uses is shown.
  4. **Limit**: Čas (default) / Text / Čas aj text, with the explanation under it: "Čas: píše sa, kým
     sa čas neminie. Text: úloha sa skončí, keď je text celý napísaný. Čas aj text: text sa musí
     napísať celý; ak je hotový skôr, píše sa ďalej, kým sa čas neminie."
  5. **Použiť slovník, keď sa minie text** (checkbox, on): "Keď sa zadané slová minú, prídu slová zo
     slovníka, ktoré študent vie písať. Vypnuté: zadané slová sa opakujú."
  6. **Len písmená, ktoré už ovláda** (checkbox, on): "Slová s písmenami, ktoré študent ešte
     neovláda, sa vynechajú. Vypnuté: pred úlohou sa naučí všetky písmená z textu, ktoré ešte
     neovláda, aby vedel napísať všetko."
  7. **Dĺžka** 1-30 minút (a slider as today), shown only for Čas and Čas aj text.
  8. **Svet**: Aktuálny (default) / Náhodný, hint "Náhodný svet môže byť aj taký, ktorý študent ešte
     nemá otvorený - len ako pozadie."
  9. **Vytvoriť odkaz** (or **Uložiť zmeny** while editing) and "Zrušiť úpravu" while editing.
  Validation as today ("Napíšte aspoň jedno slovo alebo text." for the source the game uses).
- Making a task saves it to the list at once and opens **Ukázať** for it.
- List rows: title, game · limit (and minutes) · group, the date made; actions **Ukázať** (a modal:
  `linkBox` = link, Copy, QR, plus "Veľký kód" via `bigCode` when it fits), **Upraviť** (fills the
  form; saving keeps the `id` so the results of that task still group together, and replaces the
  row), **Odstrániť** (no confirm). Empty: "Zatiaľ žiadne pripravené úlohy. Úloha, ktorú vytvoríte,
  sa tu uloží."
- Store: `app.store.data.teacherTasks: (TaskSpec & { madeAt: number })[]`, default `[]`, at most 100
  (the oldest go), in the same browser storage as the players; never sent anywhere.
- "Dať úlohu aj hráčovi" goes with the parent tab: a teacher who wants the task for a player here
  opens the link or uses the player's Tasks page.

### The player's Tasks page
- Map: a new button **Úlohy** (icon `code` or a fitting one from `ICONS`) right under
  **Pokračovať**. The "Úloha na dnes" card on the map stays as it is.
- A page (not a panel), `#/p/<id>/tasks`, laid out like My progress without tabs: a bar with Back to
  the map and the title "Úlohy"; on top two ways to add a task - **Naskenovať úlohu** (camera popup)
  and a paste field **Vložiť odkaz alebo kód úlohy** with "Pridať"; under them "Moje úlohy", newest
  first (all of `p.tasks`, unfinished first).
- **Camera popup**: the usual `modal` (round X top right, Esc closes) with only the camera picture in
  the scan frame, the camera picker when there are several cameras, and one status line (starting,
  the camera errors, "Toto nie je kód úlohy." at most once a second). A task code: green flash,
  `beep`, vibration where it can, the camera stops, and after the flash (about 400 ms) the popup
  closes by itself; the task goes to this player (`addTask` + `saveProfile`; the same `id` again
  only refreshes its content) and the list paints again with it on top, marked new for a moment.
  Leaving the page stops the camera.
- The paste field takes a whole task link or its code (`codeFrom(text, 'task')`), adds it the same
  way; a wrong one says "Toto nie je kód úlohy." under the field.
- Each task row: title, game, group chip; its state (unfinished: "Zostáva N min" or the text left;
  finished: date, minutes, accuracy, cpm of the best run). Actions:
  - **Hrať** (unfinished) / **Zopakovať** (finished; the best stays unless the new run is better),
  - **Odovzdať** (finished: today's `handInDialog`),
  - **QR kód** (finished: the result's big code, as the exercises tab did),
  - **Výsledok** (finished: a small modal with the best run - date, minutes, accuracy, cpm, and
    whether a repeat improved it),
  - **Odstrániť** (with a confirm, it is the child's record).
- My progress loses its **Cvičenia** tab (and its texts and CSS that nothing else uses); everything
  it did is on the Tasks page.

### The phone without a keyboard
- **Picture** (done 2026-10-31): `public/assets/ui-new-task.webp`, the badger pupil typing at a desk
  (prompt in `assets-src/PROMPTS.md`). `taskArt()` = `bigArt('ui-new-task', TASK_ART)` in
  `src/ui/dom.ts` with a small drawn fallback (a desk with a keyboard, the line style of
  `KEYBOARD_ART`).
- Phone start page (`gated` branch of `startScreen`): a new first big button above "Pre učiteľov":
  `bigButton(taskArt(), "Nová úloha", "Zaznačte si úlohu z QR kódu a pošlite si ju domov do
  počítača", ...)`, the default (primary orange) style; order: intro, Nová úloha, Pre učiteľov,
  keyboard (`alt`, last). Only on the gated page.
- **Screen `taskNote`** (`#/note`, in `NO_KEYBOARD`, `src/screens/task-note.ts`): a bar with Back to
  start and the title "Nová úloha", the camera card (the shared camera helper; same frame, feedback
  and errors). A task code stops the camera and shows the task with the task panel
  (`src/ui/task-panel.ts`, moved out of `start.ts`; its pick hint and Cancel button optional) and:
  - **Poslať** - `navigator.share({ title, text, url: link })`, hidden without it (the share sheet
    has e-mail, messages, Quick Share / Phone Link / AirDrop),
  - **E-mail** - `mailto:?subject=<TapkoTyper: title>&body=<one line + link>`,
  - **Kopírovať** - `copyLink`, "Skopírované",
  - **Veľký kód** - `bigCode` of the link (a laptop's camera reads it on the Tasks page),
  - **Skenovať ďalšiu** - back to the camera.
  Not a task code: "Toto nie je kód úlohy." (at most once a second).
- **Noted tasks**: `app.store.data.notedTasks: { code: string; title: string; at: number }[]`
  (default `[]`, at most 20, newest first, the same code once - scanning it again moves it to the
  top). Under the camera "Zaznačené úlohy": title + date, a tap opens the same task view, an X
  removes it.

### Shared pieces
- **Camera helper** in `src/ui/` (frame, green flash, `beep`, vibration, orange double blink where a
  caller wants it, camera picker, error texts, stop on hide): used by the teacher's scan card, the
  camera popup and the note screen; nothing copied.
- `bigCode` gets a `'task'` kind (caption = the task title, name line empty) for the task link.
- **Texts**: sk as written here; en in the same plain tone. Every new key gets a translator note and
  a place in `src/i18n/catalog.ts` (`mentors`: teacher tab keys in `teacher-*` groups, the task form
  in `task-make`, the Tasks page and the phone in `task-play` or a new group with a guide entry).
  Keys nothing reads any more are deleted (the unused-keys test checks).
- **Spec**: `.specify/profiles/teacher-links.md` (making tasks on the teacher page with all options,
  the Tasks page, best run, the phone), `parent-controls.md` (no task tab), `statistics.md` (no
  Cvičenia tab), `.specify/experience/devices.md` (the phone page's first button). WHAT and WHY only.

## Steps
- [x] Picture processed (`public/assets/ui-new-task.webp`, 2026-10-31).
- [ ] `TaskSpec`/`Task` fields, code + parse, store lists, best-run rule; unit tests.
- [ ] Shared camera helper; the teacher scan card uses it (its behaviour unchanged).
- [ ] `src/ui/task-form.ts` and the teacher tab "Úlohy" (form, list, show/edit/remove, route); the
  parent settings' task tab removed.
- [ ] The Tasks page with camera popup, paste, list and row actions; map button; My progress
  without Cvičenia; `startTask` with the TEMP practice fallback.
- [ ] `src/ui/task-panel.ts`; phone start button, `taskNote` screen, noted list; `bigCode` task kind.
- [ ] Texts sk/en, translator notes, catalog; `npx tsc --noEmit`, `npx vitest run`.
- [ ] Spec updates.
- [ ] Browser check with the playwright MCP in an own tab (the browser may be shared): teacher tab at
  1366x768 and phone width (each game shows its source field, limit shows/hides minutes, make, show
  QR, edit keeps the id, remove, reload keeps the list); the parent settings have no task tab; a
  player's map has Úlohy under Pokračovať; the Tasks page adds a pasted link, the camera popup gets a
  task code fed through its handler with `browser_evaluate` (no camera in the test browser) -> green
  flash, closes, the task on top; play a task with `window.tapkoType`, repeat it worse (the best
  stays) and better (it replaces), hand-in, QR code, result; My progress has no Cvičenia; the phone
  start page at 390x844 with touch emulation shows Nová úloha first; `#/note` with a fed code shows
  the task view, the E-mail href, Veľký kód, the noted list after reload. Report the camera itself
  as unverified.
