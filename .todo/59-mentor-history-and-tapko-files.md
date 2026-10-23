# 59 - Mentor history: groups, writers, detail, .tapko files

Design (owner approved, private): https://claude.ai/artifact/CZ8cMJ3wxdb2iPpW6Xc3YL, boards 1-9.
Everything needed is written below; the design only shows it.

Affected: `src/share/teacher.ts`, `src/share/teacher-db.ts` (from plan 58), `src/screens/teacher.ts`,
`src/screens/teacher-scan.ts`, a new `src/share/tapko-file.ts` (file format), `src/ui/charts.ts`
(reused, no change expected), `src/main.ts` / `src/app/app.ts` (launch queue, route params),
`public/manifest.webmanifest` (`file_handlers`), `src/styles.css`, `public/i18n/{sk,en}.json`,
`src/share/share.test.ts`, e2e teacher specs, `.specify/profiles/teacher-links.md`,
`.specify/experience/{help,privacy,offline}.md`, the help's Mentoring tab texts.
Storage: the IndexedDB stores from plan 58 (`results`, `sets`, `files`). Depends on plan 58.

## Why

- A mentor wants to go back to a class's scan from last week and see how each child is getting
  on over time. Today a newer hand-in replaces the older one, so progress is lost.
- A mentor scans with a phone in the classroom and reads the statistics on a computer at home.
  Results travel as one file, without a server.

## Rules (decided)

- **Hand-in, not row:** every hand-in is kept. Fingerprint = a hash of the result's fields
  (taskId, name, group, date, minutes, accuracy, cpm, levels, weak). The same fingerprint is
  never stored twice, from any source. The tables that need "the newest per child and task" take
  the newest hand-in.
- **Set:** results added to one group (or "Bez skupiny") within **20 minutes of the set's first
  result** form one set; later, or in another group, a new set starts. One camera scan (Skenovať
  -> Hotovo) is always one set, however long. Pasted and opened links follow the 20-minute rule.
  A set keeps: id (random), group, start and end time, source (`scan` | `link` | `file`), the
  fingerprints of its results.
- **A child** is name + group, as now (`childKey`).
- **Cleanup:** on opening the mentor page, results with a hand-in date older than **one year**
  are deleted, but only once they have been in this browser for at least **7 days**
  (each result stores `addedAt`). A set with no results left is deleted.
- **Loading old data:** a file is loaded whole. When it holds results older than a year, the
  status message says so with the count, for example: "120 výsledkov je starších ako rok. Budú
  dostupné ešte 7 dní, potom sa zmažú." / "120 results are older than a year. They stay for
  7 days, then they are deleted."
- **Duplicates are silent:** loading the same file or set twice adds nothing and the UI does
  not talk about it. The load message only counts what was added (and the old-data line).
- Storage space: no count limit; the time rule keeps it small.

## What

- [ ] **Data:** hand-ins, sets, files and the rules above in `TeacherStore` (+ unit tests: the
      20-minute window, scan = one set, fingerprint dedup across sets and files, cleanup with the
      7-day grace, newest per child and task).
- [ ] **Tabs** on the mentor page, phone and computer alike: **Skupiny · Pisatelia · Súbory**
      (`.tabs` / `.tab` as in help). The scan box, paste field and intro stay above the tabs.
      The old flat "Výsledky" table goes; its content lives in Skupiny and Pisatelia.
      Each tab, a set and a writer have their own address, so Back works.
- [ ] **Skupiny:** group chips (Všetky, each group, Bez skupiny). Per group a heading line with
      sets, writers, accuracy, rhythm. Then one row per set: day, time from-to, task(s),
      results, "zvládli X z Y", accuracy, rhythm. On a computer a click on the day row expands
      the set's writers inline (name, minutes, status, accuracy, rhythm; name opens the detail);
      on a phone the set is a `child-row` card that opens the set page (board 2: tiles, "Poslať
      sadu", "Odstrániť sadu", sort chips, writers). CSV export and "Priradiť do skupiny" stay
      here for what is shown.
- [ ] **Pisatelia:** a search field "Hľadať pisateľa" (filters while typing, with the group
      chips), and the big sortable table: writer, group, hand-ins, last, accuracy and rhythm with
      the change from the first to the last hand-in (+9 green / -2 red-brown), minutes, levels,
      weakest keys, status. On a phone the existing card list with sort chips and the search.
- [ ] **Detail of a writer** (extends today's child card): tiles with the change, weakest keys,
      "Vývoj" with two `lineChart`s (accuracy, rhythm over hand-ins; side by side on a computer,
      stacked on a phone), and "Odovzdania": every hand-in with time, task, a link to its set,
      minutes, accuracy, rhythm, levels, status. Move to group and remove stay.
- [ ] **Súbory:** load message (green status), "Načítať súbor", "Uložiť všetko ako .tapko",
      "Vymazať…", and the table of loaded files: name, loaded at, period and groups inside,
      results, what was added ("nič nové" when nothing). Dropping a `.tapko` file anywhere on the
      mentor page loads it.
- [ ] **Vymazať…** dialog: radio cards "Staršie ako": 6 mesiacov, 3 mesiace, mesiac, 2 týždne,
      týždeň, deň, and "Všetky údaje" (also clears the file list). Each card shows what it would
      delete ("2 sady · 47 výsledkov" or "nič"); the danger button names the count ("Vymazať 2
      sady"). The dialog reminds to save as `.tapko` first. Age is the hand-in date.
- [ ] **Poslať do počítača** (phone, also on a set page as "Poslať sadu"): a dialog with
      "Celá história" or "Len od posledného poslania" (counts shown), the file name
      `tapkotyper-YYYY-MM-DD.tapko`, "Zdieľať súbor" (Web Share with files when
      `navigator.canShare({ files })` says yes) and "Uložiť do telefónu" (a download). When
      sharing is not possible, only the download shows. The last send time is kept.
- [ ] **File format** `.tapko`: JSON `{ format: "tapkotyper-mentor", version: 1, exportedAt,
      sets: [...], results: [...] }`, MIME `application/x-tapkotyper`. Unknown format or version
      -> a clear error line, nothing loaded. Results keep their own checksum check (`intact`).
- [ ] **Open by the OS:** `file_handlers` in the manifest (`.tapko`, action the mentor page) and
      `launchQueue` in the app, so an installed TapkoTyper in Chrome or Edge opens the file by a
      double click. Elsewhere the button and the drop do the job; say nothing about it in the UI.
- [ ] **Texts** sk + en for everything above; the help's Mentoring tab explains sets (20 minutes),
      the yearly cleanup with 7 days for old loaded data, sending from a phone and loading on a
      computer. The page itself stays short (bold key words, as now).
- [ ] **Specs:** teacher-links.md (what and why of sets, history, tabs, files, cleanup), help.md,
      privacy.md (the file leaves only when the mentor shares it), offline.md (works offline).
- [ ] **Checks:** `npm run build`, `npm test`, e2e teacher specs updated (tabs, a set from two
      links within 20 minutes, a file loaded twice adds nothing, the delete dialog). Then the
      playwright MCP at 390 px and 1280 px: scan or paste results into two groups, open Skupiny,
      expand a set, open a writer's detail with charts, search in Pisatelia, save a `.tapko`,
      delete all, load the file back (counts match), load it again (nothing new), load a file
      with results older than a year (the 7-day message). Share on a real phone is not testable
      here: write in the plan's Done section that it needs a check on Android and iPhone.
