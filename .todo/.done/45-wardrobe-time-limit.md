# 45 Wardrobe time earned by practice, a playful character and random outfits

Runs **after plan 44** (the player is the character), on
the wardrobe screen that plan 44 leaves. Renderer `src/gfx/tapko.ts`
(`tapkoElement`, `renderTapkoInto`, `Mood`), storage at schema v2 after plan 44.

Affected: `src/storage/schema.ts`, `src/storage/store.ts` (+ tests), `src/learning/stats.ts`
(+ tests), new `src/game/wardrobe-time.ts` (+ tests), `src/screens/wardrobe.ts`,
`src/screens/parent.ts`, `src/screens/help.ts`, `src/ui/hud.ts`, `src/ui/dom.ts` (one icon),
`src/styles.css`, `src/app/super.ts`, `public/i18n/{sk,en}.json`, `e2e/`,
`.specify/companion/`, `.specify/profiles/parent-controls.md`, `.specify/experience/help.md`.
Contracts: storage schema v2 -> v3 (one migration); export files and transfer codes carry the
new fields. No server, no DB.

## What
- **Limited wardrobe time** (on by default; a parent switch turns it off per player):
  - Practice earns wardrobe time: **1/5 of the training time**, so 10 minutes of practice give
    2 minutes in the wardrobe. The balance adds up until it is spent, **at most 7 minutes**.
  - The wardrobe opens only with **at least 1 minute** on the balance, that is after at least
    5 minutes of practice. A smaller rest is kept and waits for more practice.
  - While open, a **round countdown** sits in the wardrobe's header: the ring shows the time
    left, inside a **smile** while more than 90 s are left, then a **number that drops by one
    every 10 s** (9 at 90-81 s ... 1 at 10-1 s). The last 20 s it **blinks slowly**, the last
    10 s **fast**.
  - At zero the wardrobe **locks**: the character with its current look stays visible, but
    nothing can be changed (kind, nickname, items, clear, random), and a line says that
    longer practice gives longer wardrobe time, with how much practice opens it again.
- **Playful character**: clicking (or Enter/Space on) the big character in the wardrobe
  either makes it jump or changes its face, at random; this works also while locked.
- **Random outfit** button: for every body area, a 50 % chance of nothing; otherwise one of
  the child's owned items of that area, each equally likely.

## Why
- Dressing up is the reward, not the activity; time earned by practice keeps typing first and
  makes the wardrobe a goal. A parent who does not want this can turn it off.
- A visible countdown with a smile and then numbers a young child can read avoids a sudden
  surprise lock; the blinking warns before the end.
- Clicking the character and a random outfit are quick fun inside the earned time.

## Decisions
- **Data**: `Settings.wardrobeLimit: boolean` (default `true`); `Progress.wardrobeSeconds:
  number` (the balance in seconds, may hold fractions, kept in `0..420`).
- **Constants and logic** in `src/game/wardrobe-time.ts` (pure, tested):
  `WARDROBE_SHARE = 1 / 5`, `WARDROBE_MAX = 420`, `WARDROBE_MIN_OPEN = 60`;
  `earnWardrobe(p, seconds)` adds `seconds * WARDROBE_SHARE` capped at `WARDROBE_MAX`;
  `wardrobeLocked(p)` (limit on, not the super player, balance below the minimum at entry);
  `spendWardrobe(p, seconds)` floors at 0; `countdownFace(left)` -> `'smile'` for `left > 90`,
  else `Math.ceil(left / 10)` (1..9); `practiceToOpen(p)` = minutes of practice still needed
  for `WARDROBE_MIN_OPEN`, rounded up.
- **Earning** happens in `recordSession` (`src/learning/stats.ts`), the same place and the
  same seconds as `trainedSeconds`, so story levels, practice and every mode that records a
  session count alike. It keeps earning while the limit is off, so turning it back on does
  not start from zero.
- **Entering**: the lock state is decided when the screen opens: balance >= 60 s -> open and
  the countdown runs; else locked. Once open, it stays open until the balance is 0.
- **Countdown runs only while the wardrobe is shown and the page is visible** (pause on
  `visibilitychange`), driven by one interval of 1 s; the balance is saved every 10 s and on
  leaving the screen (the screen returns a cleanup function, which also clears the interval).
  At 0 the screen repaints locked in place, no navigation.
- **Timer look**: a new `RoundKind` `'timer'` (teal disc, like the other round buttons, not
  clickable, `role="timer"`, title and `aria-label` "Time in the wardrobe: 2 min 30 s"). Its
  ring is `rhythmRing(left / WARDROBE_MAX)`; inside, a new `smile` glyph in `ICONS` or the
  number drawn like `levelRing`'s `rb-num`. Classes `ending` (last 20 s, opacity blink 1 s
  period) and `ending fast` (last 10 s, 0.4 s period); with `reduceMotion` no blinking, the
  disc turns orange instead. The repaint happens only when the face or the 10 s step changes.
- **Locked screen**: same layout; every control `disabled`, items still show owned/locked;
  `wardrobe.locked` line ("Za dlhšie cvičenie získaš dlhší čas v šatníku. Šatník sa otvorí po
  ďalších {n} min cvičenia." / "Practice longer to get longer wardrobe time. The wardrobe
  opens after {n} more minutes of practice."). Slovak keeps plan 44's no-gendered-past rule.
- **Limit off or super player**: no timer, never locked, nothing spent.
- **Character click**: the preview becomes a button (`aria-label` "Poštekliť" / "Tickle
  me"). Each activation picks at random: 50 % jump (the existing `jump` keyframes on the
  stack, class removed on `animationend`), 50 % a different mood from `idle`, `happy`,
  `thinking` and `surprised` (`surprised` only when its art exists for the kind, as the
  renderer already checks); the mood is only on screen, never stored. `reduceMotion`: only
  mood changes.
- **Random outfit**: button `wardrobe.random` next to "clear"; per slot in `SLOTS`:
  `Math.random() < 0.5` -> nothing, else a uniform pick among owned items of that slot (none
  owned -> nothing). Kind and nickname are not touched. Plain `Math.random` (not the seeded
  stream of plan 44).
- **Parent switch**: "Šatník za čas cvičenia" / "Wardrobe time earned by practice" in the
  practice group with a hint ("1 minute in the wardrobe for 5 minutes of practice, at most 7
  minutes"), and a read-only line with the current balance.
- **Migration v2 -> v3** (`STORE_VERSION = 3`, schema comment v3): `wardrobeLimit: true`;
  `wardrobeSeconds = min(420, trainedSeconds / 5)` so existing players are not locked out
  at once. New profiles start at 0; the super player has the limit off in `super.ts`.
- **Help**: the unified help's icon list gets the timer (what the smile and numbers mean).

## Steps
- [x] Schema, defaults, `newProfile`, migration v2 -> v3 with tests; `super.ts` limit off.
- [x] `src/game/wardrobe-time.ts` with tests (share, cap, minimum, spend floor, faces at
      91/90/81/80/11/10/1 s, practice to open); earning in `recordSession` with a test.
- [x] `timer` round kind, `smile` icon, blink classes and reduced-motion variant in
      `src/ui/hud.ts`, `src/ui/dom.ts`, `src/styles.css`.
- [x] Wardrobe: lock decision on entry, countdown with pause and saves, locked view with the
      message, clickable character, random outfit button; cleanup on leave.
- [x] Parent switch with hint and balance; i18n sk + en (wardrobe, parent, help texts).
- [x] Specs: `.specify/companion/*` (wardrobe time, countdown, lock, character click, random
      outfit), `.specify/profiles/parent-controls.md` (the switch), `.specify/experience/help.md`.
- [x] `npm run build`, `npm test`, `npx playwright test` pass; an e2e test opens the
      wardrobe with a seeded balance of 25 s and sees it lock (clock mocked with
      `page.clock`).
- [x] Drive the app with the playwright MCP: new player -> wardrobe locked with the message;
      play about 5 minutes (or set the balance through a short level plus `page.clock`) ->
      opens, smile shown; at 90 s the number 9; blinking at 20 s and faster at 10 s; at 0 the
      controls lock and the character still reacts to clicks; random outfit leaves some areas
      empty over several clicks; parent switch off -> no timer, unlocked; console clean.

## State
- Decisions taken while implementing: the timer is hidden while locked (entry or at 0), the
  locked line sits under the character; specs in a new `.specify/companion/wardrobe.md`; the
  e2e seeds 25 s (locked at entry) and 95 s (counts down to the lock with `page.clock`); the
  help lists the timer among the map's buttons.
- Browser run (playwright MCP, preview build): a new player sees the locked wardrobe with
  "5 min"; a seeded balance of 100 s shows the smile, 9 at 89 s, 2 with a 1 s blink at 19 s,
  1 with a 0.4 s blink at 9 s, and at 0 the timer goes, all 38 items and the buttons are
  disabled, the balance is stored as 0 and the character still changes faces; six random
  outfits each left some areas empty; parent switch off shows no timer and no lock; the
  help lists the timer; console clean apart from the counter's localhost warning. The
  balance came from storage, not from 5 minutes of real play (the plan allows it).

## Done - 2026-10-22
- Shipped: schema v3 with `wardrobeLimit` and `wardrobeSeconds` (migration from the
  training so far), earning in `recordSession`, `src/game/wardrobe-time.ts`, the teal
  `timer` round picture with smile, numbers and blinking (orange with reduced motion), the
  locked wardrobe with its message, the playful character, the random outfit, the parent
  switch with the balance, help line, specs and unit + e2e tests.
- Left out: nothing.
