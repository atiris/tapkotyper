# 58 - The mentor's data in IndexedDB

Affected: `src/share/teacher.ts` (`TeacherStore`), `src/screens/teacher.ts`, a new small IndexedDB
helper next to it (`src/share/teacher-db.ts`), `src/share/share.test.ts` (+ `fake-indexeddb` as a
dev dependency for vitest), e2e `teacher-links.spec.ts` and `teacher-scan.spec.ts`,
`.specify/architecture.md`, `.specify/profiles/teacher-links.md`, `.specify/experience/privacy.md`.

Storage: the mentor's results move from localStorage key `tapkotyper:teacher` to an IndexedDB
database. No migration and no backward compatibility: the project is not launched yet, the old
key is simply no longer read (and removed once, on first open, so it does not take space).
Players' profiles stay in localStorage; they are small and read synchronously all over the game.

## Why

- Plan 59 keeps a history of sets for a year, with every hand-in, not only the newest one per
  child and task. localStorage gives about 5 MB per site, shared with the profiles, and is
  synchronous: a big JSON written on every scan tick blocks the page.
- IndexedDB has far more room, writes one record at a time and can look up by group, child and
  date. Doing it now, before launch, costs no migration.

## What

- [ ] **Database** `tapkotyper-mentor`, version 1, with the stores plan 59 needs, so 59 adds no
      schema step:
      - `results`: one record per hand-in, key = its fingerprint (see 59), indexes `child`
        (`childKey`), `group`, `date`.
      - `sets`: key = set id, index `start`.
      - `files`: key = auto, the history of loaded `.tapko` files.
      Keep the helper small: open, get all, put, delete, a transaction for several writes. No
      wrapper library.
- [ ] **`TeacherStore` becomes async.** `load()` reads everything once when the teacher page
      opens (a class has at most a few thousand records), keeps them in memory for sorting and
      filtering as now, and every change (`add`, `remove`, `removeMany`, `assign`) writes only the
      touched records. The page shows nothing new while loading; it paints after `load()`.
      `teacherScreen` awaits it; the camera scan keeps working without waiting for writes.
- [ ] **Persistence:** on the first write call `navigator.storage.persist()` once (ignore the
      answer), so the browser does not clear the data on its own when space is low.
- [ ] **Blocked or missing IndexedDB** (some private windows): keep the data in memory for the
      visit and say once, in the page's status line, that results will not be kept after closing.
- [ ] **Behaviour stays the same as today** in this plan: one row per child and task, a newer
      hand-in replaces the older one (plan 59 changes that). Only the storage changes.
- [ ] **Specs:**
      - architecture.md: players in localStorage, the mentor's data in IndexedDB, and why.
      - teacher-links.md: results are kept in this browser (IndexedDB), apart from the players.
      - privacy.md: still nothing leaves the browser.
- [ ] **Checks:** `npm run build`, `npm test` (store tests on `fake-indexeddb`), e2e
      teacher-links and teacher-scan. Then the playwright MCP: add a result by a link, reload,
      it is still there; check in DevTools Application that `tapkotyper:teacher` is gone and the
      database holds the record.
