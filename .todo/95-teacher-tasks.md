# 95 - Tasks for teachers and noting a task on a phone

The owner (2026-10-31) wants the teacher's page to prepare tasks, and a phone without a keyboard to
note a task from the teacher's QR code and send it home, where the link opens on the computer.
Today a task is made only in a player's parent settings (`taskTab` in `src/screens/parent.ts`) and is
not kept anywhere; the phone start page offers only "Pre učiteľov" and the missing keyboard.

Affects `src/screens/teacher.ts`, `src/screens/parent.ts` (form moves out), a new
`src/ui/task-form.ts`, `src/screens/map.ts` (Načítať úlohu), `src/screens/start.ts` (phone page button; `taskPanel` moves out to
`src/ui/task-panel.ts`), a new screen `src/screens/task-note.ts`, `src/app/app.ts` (screen name,
route, `NO_KEYBOARD`), `src/main.ts`, `src/ui/dom.ts` (art), `src/ui/big-code.ts` (a task caption),
`src/storage/schema.ts` + `src/storage/store.ts` (two lists), `src/styles.css`,
`public/i18n/{sk,en}.json`, `public/i18n/translator/en.json`, `src/i18n/catalog.ts`,
`public/assets/` (the badger), `.specify/profiles/teacher-links.md`, `.specify/experience/devices.md`.
Store: two new lists with defaults `[]`, **no migration (alpha)**, no version bump. The teacher's
IndexedDB (`src/share/teacher-db.ts`) is not touched.

## Decisions (taken; do not ask)
- **Picture**: the badger pupil typing at a school desk, `assets-src/ui-new-task.jpg` (made
  2026-10-31, prompt in `assets-src/PROMPTS.md`). Run `npm run assets`, commit the processed
  `public/assets/ui-new-task.*`. `ui-new-task-squirrel.jpg` is a rejected variant: not processed.
  The art follows `teacherArt`/`keyboardArt` in `src/ui/dom.ts`: `taskArt()` = `bigArt('ui-new-task',
  TASK_ART)` with a small drawn fallback (a desk with a keyboard, same line style as `KEYBOARD_ART`).
- **One task form** (`src/ui/task-form.ts`): the fields of today's `taskTab` (title, group, words,
  text, minutes, kind) and the "Vytvoriť odkaz" button, built once and used by the parent tab and
  the teacher tab. It can be filled from a `TaskSpec` (edit) and reports the made spec + link. The
  parent tab keeps "Dať úlohu aj hráčovi {name}" and its player's task list; the teacher tab has
  neither.
- **Teacher tab "Úlohy"**: `TABS` becomes `['groups', 'writers', 'files', 'tasks']` (sk "Úlohy",
  en "Tasks"), route `#/teacher/tasks` like the others. Layout like the other teacher tabs:
  the form on top (a card), under it "Pripravené úlohy", newest first. Each row: title, kind ·
  minutes · group, date made; actions **Ukázať** (a modal with the existing `linkBox` = link, Copy,
  QR, plus "Veľký kód" via `bigCode` when the link fits a QR), **Upraviť** (fills the form, the
  button says "Uložiť zmeny"; saving keeps the task's `id` so results of the same task still group
  together, and replaces the row), **Odstrániť** (no confirm; the row goes). Making a task saves it
  to the list at once and opens Ukázať for it. Empty list: one hint line ("Zatiaľ žiadne pripravené
  úlohy. Úloha, ktorú vytvoríte, sa tu uloží.").
- **Teacher's tasks store**: `app.store.data.teacherTasks: (TaskSpec & { madeAt: number })[]`,
  default `[]`, kept in the same browser storage as the players (not per profile), at most 100
  (the oldest go). Never sent anywhere; the privacy line of the teacher page stays true.
- **Phone start page** (`gated` branch of `startScreen`): a new first big button above "Pre
  učiteľov": `bigButton(taskArt(), "Nová úloha", "Zaznačte si úlohu z QR kódu a pošlite si ju domov
  do počítača", ...)`, the default (primary orange) style; "Pre učiteľov" keeps its style; the
  keyboard button stays last (`alt`). Order: intro, Nová úloha, Pre učiteľov, keyboard. The button
  exists only on the gated page (with a keyboard the task link opens directly).
- **Screen `taskNote`** (route `#/note`, in `NO_KEYBOARD`, its own file): a bar with Back to start,
  the title "Nová úloha", and a camera card built on `startScan` from `src/ui/qr-scanner.ts` (the
  same frame look and feedback as the teacher's scan: green flash + `beep` + vibration on a task;
  the same camera errors and camera picker; the camera stops when leaving or when the tab hides).
  A scanned text goes through `codeFrom(text, 'task')` + `parseTask`. Not a task code: the short
  hint "Toto nie je kód úlohy." (at most once a second). A task: the camera stops and the screen
  shows the task with the same panel as the task link page (`src/ui/task-panel.ts`, moved out of
  `start.ts`, its pick hint and Cancel button optional) and the actions:
  - **Poslať** - `navigator.share({ title, text, url: link })` when the browser has it (the phone's
    share sheet: e-mail, messages, and direct ways such as Quick Share / Phone Link / AirDrop);
  - **E-mail** - `mailto:?subject=<TapkoTyper: title>&body=<one line + link>`;
  - **Kopírovať** - `copyLink`, with "Skopírované";
  - **Veľký kód** - `bigCode` of the link, so a laptop with a camera or another phone can read it;
  - **Skenovať ďalšiu** - back to the camera.
  Without `navigator.share` the Poslať button is hidden.
- **Noted tasks on the phone**: every scanned task is kept in `app.store.data.notedTasks:
  { code: string; title: string; at: number }[]` (default `[]`, at most 20, newest first, the
  same task code only once - scanning it again moves it to the top). Under the camera the list
  "Zaznačené úlohy": title + date, a tap opens the same task view (Poslať, E-mail, Kopírovať,
  Veľký kód) and an X removes it. So a task noted at school can still be sent at home later.
- **Reading a task code with the computer's camera** (the owner, 2026-10-31): on the player's map,
  a new button **Načítať úlohu** (icon `camera`) right under **Len chcem písať** in `src/screens/map.ts`.
  It opens only a popup (the usual `modal`: round X top right, Esc closes) with the camera picture in
  the same frame as the teacher's scan, the camera picker when there are several cameras, and one
  status line (starting, the camera errors as in the teacher's scan, "Toto nie je kód úlohy." at most
  once a second). A task code (`codeFrom(text, 'task')` + `parseTask`): the frame flashes green, the
  `beep` sounds (and the phone buzzes where it can), the camera stops, and after the flash (about
  400 ms) the popup closes by itself; the task is given to this player (`addTask` + `saveProfile`; the
  same task id again only refreshes it) and the map paints again so **Úloha na dnes** shows. Closing
  the popup or leaving the map stops the camera. The camera card's frame/feedback/error code is
  shared with the teacher scan and the phone note screen, not copied (e.g. a small camera-frame
  helper in `src/ui/` that `teacher-scan.ts` also uses).
- **bigCode for a task**: `bigCode` gets a `'task'` kind whose caption is the task title (name
  line empty); the existing kinds stay as they are.
- **Texts**: sk as above; en in the same plain tone. Every new key gets a translator note
  (`public/i18n/translator/en.json`) and a place in `src/i18n/catalog.ts` (the `mentors` section:
  teacher tab keys in `teacher-*` groups, the note screen in `task-play` or a new `task-note` group
  with its own guide entry).
- **Spec**: `.specify/profiles/teacher-links.md` gets the Tasks tab (prepare, keep, show, edit,
  remove) and the phone's noting of a task (scan, keep, send home). `.specify/experience/devices.md`
  gets the phone start page's new first button. WHAT and WHY only.

## Steps
- [ ] Assets: `npm run assets`, check `public/assets/ui-new-task.*` is keyed clean (no pink fringe),
  `taskArt()` with the drawn fallback.
- [ ] Store lists `teacherTasks` and `notedTasks` with defaults and their keep/limit/move-to-top
  rules in `src/storage/store.ts`; unit tests for both (limit, order, same code once, edit keeps id).
- [ ] `src/ui/task-form.ts` from the parent tab's form; the parent tab uses it and works as before
  (make a link, give it here, the player's list).
- [ ] Teacher tab "Úlohy": form, list, Ukázať / Upraviť / Odstrániť, route and tab bar.
- [ ] `src/ui/task-panel.ts` out of `start.ts` (the task link page unchanged).
- [ ] Phone start page button and the `taskNote` screen with scan, task view, actions and the
  noted list; `bigCode` task kind.
- [ ] Map button **Načítať úlohu** and its camera popup (shared camera-frame helper).
- [ ] Texts sk/en, translator notes, catalog; `npx tsc --noEmit`, `npx vitest run`.
- [ ] Spec updates.
- [ ] Browser check with the playwright MCP in an own tab (the browser may be shared): teacher
  page tasks tab at 1366x768 and at phone width (make, show QR, edit, remove, reload keeps the list);
  parent tasks tab still makes a link; the phone start page at 390x844 with touch emulation
  (`keyboardGated()` needs touch only and no key seen) shows Nová úloha first; on `#/note` feed a
  task code by calling the screen's code handler from `browser_evaluate` (no camera in the test
  browser) and check the task view, Copy, E-mail href, Veľký kód, the noted list after reload, and
  "Toto nie je kód úlohy." for a result link; on a player's map open Načítať úlohu, feed a task code the same way and check the green flash, that the popup closes and that Úloha na dnes shows; Esc and X close it. Report the camera itself as unverified.
