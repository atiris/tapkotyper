# 105 Keys a world counts on

## What and why
Today a level opens when the child knows *enough* keys (a count in the lesson order). A count does not
promise *which* keys: own key choice (manual keys), "no diacritics" and the other layouts give other
sets. A world's games cannot count on, say, the whole column `u j m` of the right index, so column
games, the sticky finger (plan 104) and similar ideas have nothing firm to stand on.

The child learns **keys, not letters**: the key with 7 on it is also the key with ý on the Slovak
keyboard. So each **world** (not each level) gets a fixed list of keys, named by place as the hand
tool names them (`keyName` in `src/ui/hand-svg.ts`: `f0`, `j0`, `sp`, `70` the key with 7 / ý,
`l1` the key right of L (ô), `m1` the key right of M, `ls` / `rs` the Shifts). The list says which
keys the world takes as known when the child enters it. Every game of the world may use them.
Keys learned inside the world still come level by level as today.

The owner (and a parent) sees the lists in Help, and the specs keep them as the source for developing
a world.

Affected: `src/game/levels.ts` (the lists, the world lock), `src/learning/lessons.ts` (known keys by
name), `src/ui/hand-svg.ts` (`keyName` reused, maybe moved to `src/keyboard/` since it is no longer only
for hands), `src/screens/map.ts` (the lock card), `src/screens/help.ts` (a new section),
`public/i18n/{sk,en}.json`, `public/i18n/translator/en.json`, `src/styles.css`, specs
`.specify/learning/world-keys.md` (new) with `.specify/learning/index.md`,
`.specify/learning/lesson-progression.md`, `.specify/experience/help.md`, `.specify/game/story.md`
(a line per world pointing to its keys). No store change.

## Steps

### 1. The proposal: today's keys by name
Today the world's entry needs this many keys of the lesson order (`STORIES[].keys`, the world's first
level). Mapped to key names, the three layouts (`sk-qwertz`, `sk-qwerty`, `us-qwerty`) give the same
lists up to world 8's entry. They part from there on (`us-qwerty` teaches `l2` early, the Shifts and
`z0` later, it has no Slovak number row). The table is `sk-qwertz`:

| World | Enters with | New in the world (to its last level) |
|---|---|---|
| 1 Lúka | `f0 j0 sp` | `d0 k0` |
| 2 Raketa | + `d0 k0 s0 l0` | `a0 l1 g0` |
| 3 Planéta | + `a0 l1 g0 h0 e0` | `i0 r0 u0` |
| 4 Údolie | + `i0 r0 u0 m2` | `o0 t0` |
| 5 Hora | + `o0 t0 n0` | `m1` |
| 6 (robot story) | `f0 j0 sp d0 k0 s0 l0 a0 l1 g0` | `h0 e0 i0 r0` |
| 7 | + `h0 e0 i0 r0 u0` | `m2 o0 t0 n0` |
| 8 | + `m2 o0 t0 n0 m1` | `c0 v0 m0 p0` |
| 9 | + `c0 v0 m0 p0 ls` | `b0 y0 rs z0` |
| 10 | + `b0 y0 rs z0 w0` | `x0 q0 m3` |
| 11 (fairy story) | as world 8 | `c0 v0 m0 p0 ls b0 y0` |
| 12 | as world 9 + `b0 y0 rs z0` | `w0 x0 q0 m3 80 l2` |
| 13 | + `w0 x0 q0 m3 80 l2 90` | `00 70 60 50 40 30 20` |
| 14 | + `00 70 60 50 40 30 20 p1` | `p2 l3`, the dead keys' letters, `10` |
| 15 | + `p2 l3 10` and the Shift row of the digits | the rest of the digits on Shift |

- [ ] Take this table as the starting lists. Where the layouts differ (from world 8: `us-qwerty` teaches
  `l2` before `c0`; from world 9 the y / z key), the list holds the keys **every** layout reaches by the
  world's entry; a key one layout reaches later is not in the list (it may still come in that world).
- [ ] A shifted character needs its key and its Shift: the list names keys only (`ls`, `rs` for the
  Shifts). A dead key's letter (ó, ĺ) needs the dead key's own name.
- [ ] Note where a game idea fits: the whole index columns `r0 f0 v0` and `u0 j0 m0` are known from world
  9 on (column games, `.research/learning/hold-and-reach.md`); four keys of each hand (the sticky finger)
  from world 3 on.

### 2. The lists in code
- [ ] `WorldDef` / `WORLDS` get `keys: string[]` (key names, the entry list). `knownKeyNames(p)`: the
  names of the keys of `activeKeys(p)` on the profile's layout (a character counts its key; a shifted one
  its Shift too).
- [ ] A key the profile's practice order does not have (no diacritics on, or the layout has no such key)
  is left out of the world's need for that profile.
- [ ] Test: for every layout the lesson order reaches every world's list by the world's entry count
  (`STORIES[].keys`), so the count and the list never disagree.

### 3. The world lock
- [ ] A world opens when the world before it is done **and** its keys are known (the count stays as it
  is; with the lesson order the list adds nothing new, it matters with manual keys and other sets).
- [ ] `WorldLock` gets `{ kind: 'need'; keys: string[] }`. The map's lock card says "Najprv sa nauč tieto
  klávesy:" / "First learn these keys:" with the keys as small key caps (the child's layout labels) and
  the button "Krátke cvičenie" (plan 102's two-minute drill of these keys).

### 4. Where to see it: Help
- [ ] Help, tab Postup v hre, a new section **Svety a klávesy** / **Worlds and keys**, after Druhy hier:
  each world (name and its small island picture) with two rows of key caps in the child's layout:
  "Na začiatku vieš" / "You start with" and "Pribudne" / "New here". A key the child knows is drawn full,
  one still to learn as an outline. Worlds not built yet are listed too (their keys hold already).
- [ ] The same section in English; translator descriptions.
- [ ] The README gets one line in the features part pointing to it (no table there, the Help is the place).

### 5. Specs
- [ ] `.specify/learning/world-keys.md`: WHAT and WHY (keys not letters, by place, per world, the lock,
  Help), and the table of step 1 as the source a new world is designed with. Its line in
  `.specify/learning/index.md`; `lesson-progression.md` points to it; `story.md` per world points to its row.
- [ ] `.specify/experience/help.md`: the new section.
- [ ] A unit test reads the spec's table and compares it with `WORLDS[].keys`, so neither drifts.

### 6. Checks
- [ ] Unit tests: `knownKeyNames`, the lock with manual keys missing one key, no diacritics.
- [ ] Browser check with Playwright (tester profile, see memory): the Help section on a wide and a phone
  width, a world locked by a missing key with manual keys on.
- [ ] `npm run build`, lint, `vitest`, the e2e specs touched.
