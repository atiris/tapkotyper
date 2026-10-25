# 65 - Super mode becomes a service menu under the star

Affected: `src/app/super.ts`, `src/app/app.ts` (a session flag for super mode), `src/ui/chrome.ts`
(`superStar` becomes a menu button), `src/ui/menu.ts` (reuse the panel of `cornerMenu` where it
fits), `src/screens/start.ts` (password listener, the player cards' mark), `src/screens/map.ts`
(level nodes and greeting marks), `src/screens/parent.ts` / `src/screens/parent-gate.ts`
(password removal), `src/game/runtime.ts` (simulated run), `src/game/progress.ts`,
`src/learning/stats.ts` (no writes for a simulated run), `src/storage/schema.ts` +
`src/storage/store.ts` (**schema change with a migration**), `src/share/*` (results a teacher
receives), `public/i18n/sk.json` + `en.json`, specs `.specify/profiles/profiles.md`,
`.specify/profiles/parent-controls.md`, `.specify/profiles/statistics.md`,
`.specify/experience/visuals.md`, `.specify/experience/ui-rules.md`.

## Why

The owner tests and services the game: passing a level by hand takes long, a child sometimes
needs a level opened, and a forgotten settings password needs a quick way back. Today the red
star only ends super mode, and super mode only exists for the temporary super player.

## Decisions (taken with the owner, 2026-10-25)

- **Super mode is a switch for the session**, not only a player. Typing `supertapkotyper` on
  the start screen still creates the temporary super player (everything open, memory only) and
  opens its map. The switch stays on when another (stored) player is picked on the start page:
  the star and its menu then work on that player. A reload or "End super mode" turns it off and
  drops the super player.
- **Simulation runs inside a running level**, from the star menu, and plays the rest of that
  level by itself with real key presses through the normal input path, up to the results card.
- **A simulated level is marked for good** and **nothing of a simulated run counts in the
  statistics**. The **whole account gets a "!" mark for good** once anything in it was simulated
  or opened by the service menu. Neither mark can be removed (not by the menu, not by settings,
  not by import/export round trips).

## What

- [x] **Session flag.** `app.superMode: boolean` (memory only). Set by the password listener
      together with `app.superPlayer`; cleared by "End super mode" (which also drops the super
      player and goes to the start page, as today) and by a reload. `superStar()` shows while
      `app.superMode` is on, for any player and on the start page.
- [x] **Star menu.** The red star opens a small menu panel (same look and keyboard handling as
      the corner menu's panel: arrows, Esc, click outside closes). Items depend on where it is:
      - Everywhere: **End super mode**; **Remove the settings password** (only when a
        `parentLock` exists; removes it at once with a toast; no question, as the super player
        may already do this in settings).
      - In a running level (not paused results, not the get-ready card): **Pass without a
        mistake**, **Pass with 1 random mistake**, **Pass with 2 random mistakes**.
      - On a stored player's map: **Open a level...**: a list of that player's worlds and levels
        (the map's own names, "Lúka · úroveň 3"); picking one opens it (see below).
      The super player's own menu has no "Open a level" (everything is open).
- [x] **Simulated run.** Picking a pass item:
      - Marks the run as simulated at once (a `simulated` flag on the runtime) and the level in
        the profile for good (see schema). Shows a small "Simulácia" tag in the level's top bar.
      - Types the remaining targets by itself, one key per about 60 ms, through the same key
        handler a real key press reaches (like the paw's `tapkoTypes`, but without paw charges
        and without the paw's own rules), until the level ends and the results card shows.
      - With 1 or 2 mistakes: that many wrong keys at random moments of the rest of the run
        (each a key that is not the expected one), so the results show them.
      - No time pressure tricks: it waits like a child would when a target is not typeable yet.
      - Nothing of the run counts in the statistics: no key stats (`learning/stats.ts`), no
        session or played time, no run history, no growth (`grow`), no rhythm trend, no mentor
        or progress-companion data, no wardrobe time, no badge or star totals change except the
        level's own stars below. The results card shows normally (stars from the simulated run)
        with the "Simulácia" tag.
      - Progression does count: the level's stars are saved (so the next level opens like after
        a real pass), marked simulated.
- [x] **Open a level for a stored player.** Picking a level in "Open a level...":
      - Every earlier level of the same story that has no stars gets 1 star, marked simulated;
        earlier worlds of the story are added to `worldsDone`; the keys the level needs
        (`story.keys` and the lesson order) are unlocked and introduced.
      - Its key stats stay untouched (no fake accuracy).
      - The account gets its "!" mark. The map refreshes and the level is the next one to play.
- [x] **Schema and migration.** Add to `Profile`: `serviced?: true` (the account's "!" mark) and
      to `progress`: `simulated: string[]` (level ids passed or opened by the service menu).
      Bump `STORE_VERSION` and add a migration that sets `simulated: []` on every stored profile.
      Exports and imports keep both. The super player never gets the mark (it is not stored).
- [x] **Marks in the interface.**
      - A level node whose id is in `progress.simulated` shows a small "!" badge (red, the
        attention color) and its tooltip says it was simulated.
      - A serviced account shows a red "!" next to its name on its start-page card, on its map
        greeting, in the parent/teacher player lists and in its statistics heading, with a
        tooltip ("Účet obsahuje simulované úrovne").
      - Results a teacher receives (share link or QR, `src/share`) carry the mark when the
        account is serviced, and the teacher's views show the "!" for that student. If a result
        format has no room for a flag, add one field (with the format's own version handling).
- [x] **Texts** in `sk.json` and `en.json` for every new item, tag and tooltip (Slovak first:
      "Koniec super režimu", "Zrušiť heslo nastavení", "Prejsť bez chyby", "Prejsť s 1 chybou",
      "Prejsť s 2 chybami", "Odomknúť úroveň...", "Simulácia", "Účet obsahuje simulované úrovne").
- [x] **Specs (WHAT and WHY):** profiles.md (super mode as a session switch and its menu, the
      account mark), statistics.md (a simulated run never counts), parent-controls.md (the menu
      removes the password), visuals.md / ui-rules.md (the star opens a menu; the "!" marks).
- [x] **Tests.** Unit: the migration; a simulated run leaves `stats` and history unchanged but
      saves the level's stars and the marks; "Open a level" makes the level reachable
      (`levelOpen`/lock helpers in `levels.ts`) and marks the account. E2E (new spec
      `e2e/service.spec.ts`): super password, pick a stored player, open a level from the star
      menu, play it with "Pass with 1 random mistake" to the results card, check the "!" on the
      level node and the player card, and that the player's statistics did not change.
- [x] **Checks:** `npm run build`, `npm test`, e2e `play`, `mobile`, `layout`, `service`. Then
      drive it with the playwright MCP as a user: the menu on the start page, the map and in a
      level; a 2-mistake simulation to the results; the marks after a reload.

## State

Implemented: everything above. Decisions taken while implementing:

- Simulation is offered in story levels and rescue missions only (not practice, drills, tasks,
  free typing, the target range or staying a while): they have no stars to pass for.
- A simulated run drops the level's minimum play time (a learning rule, not a level target),
  so a pass takes the time the targets need to come and go, not two minutes.
- Keys the child typed in the level before the simulation started stay recorded (they were real);
  everything from the switch on, and the whole run's session time, does not count.
- Real keys are ignored while the simulation types (Escape still pauses; the simulation waits).
- A simulated run also asks no surprise and adds no task time; a rescue mission still adds its
  friend (progression).
- "Open a level..." lists every level without stars; opening one in a later story unlocks the
  keys that story needs too (its first world opens by keys).
- An import that replaces a serviced player keeps the mark and the simulated levels, so an older
  export cannot lift them.
- The service mark joins a result's checksum and fingerprint only when set, so earlier hand-ins
  keep verifying and keep their identity.

## Done - 2026-10-25

Shipped: super mode as a session switch; the star's service menu (end, remove the settings
password, pass a running level with 0/1/2 mistakes, open a level for a stored player); simulated
runs that save only the level's stars; storage v7 (`progress.simulated`, `serviced`) with its
migration, kept through export/import (an import over a serviced player keeps the mark); the "!"
marks on map nodes, start and switch cards, the map greeting, the statistics heading and in
results a teacher receives (an optional `serviced` field in the result, its checksum and
fingerprint); texts, specs, unit tests and `e2e/service.spec.ts`.

Checks: `npm run build`, `npm test` (330 passed); e2e play, mobile, layout, service, help,
keyboard-only, parent, teacher-links, teacher-scan pass; tooltip fails the same way without this
change (put in BACKLOG.md). Driven by hand with the playwright MCP: the menu on the start page,
the map and in a level, opening Raketa 2 for a stored player, a 2-mistake simulation to the
results (98 %, "Simulácia", statistics unchanged), the marks after a reload.

Left out: nothing of the plan.
