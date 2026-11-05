# Keys a world counts on

## What
- The child learns **keys, not letters**: the key with 7 on it is also the key with ý on the
  Slovak keyboard. Keys are named by their place, the same on every layout, as the hand poser
  names them: a letter of the English row range and how far beyond it (`f0` the key F, `l1` the
  key right of L, the Slovak ô, `m1` right of M, `70` the key with 7 / ý, `02` the Slovak dead
  accent key), or two letters for a named key (`sp` the space bar, `ls` / `rs` the Shifts).
- Each **world** (not each level) has two fixed lists of keys: **Musím vedieť** (must know), the
  keys of the worlds before it, which the child must master to open it, and **Naučím sa** (I learn),
  the keys new in the world, its first level's new keys included. Every game of the world may use
  the must-know keys. The first world asks for none; a story's first world asks for the keys of the
  story's opening count (another story taught them). Keys learned inside the world still come level
  by level, by the lesson order's key count ([lesson progression](lesson-progression.md)).
- A shifted character needs its key and its Shift; a composed letter (ó, ĺ) needs the dead key
  too. Mastering any character of a key masters the key.
- A must-know list holds the keys **every** layout's lesson order reaches by the end of the world
  before (its last level's key count; for a story's first world the story's opening count), or
  never teaches at all. A key one layout reaches later is not in the list, though it may come in
  the world before.
- For a child, a key the child's practice order never teaches (no diacritics, a layout without
  that key) is left out of the world's need.
- A key counts as known only when **mastered**: at least 100 presses and at least 89 % of the last
  100 right ([statistics](../profiles/statistics.md)). Presses of the keyboard check count like any
  presses, so a world the check reached still waits for enough presses.
- A world opens when its story is open and the world before it is done (or the keyboard check
  reached it) **and** the child masters its must-know keys. When only keys hold it, the map's lock
  card says so plainly: the world is closed only because of keys, which keys (small key caps of
  the child's layout) and what mastered means, with the two-minute drill of them. The list guards
  the way in only: a world with a level already played stays open, so finished levels can always
  be replayed.
- Help, tab Progress, section **Worlds and keys**: every world, also one not built yet, with its
  island and two rows of key caps on the layout, "Musím vedieť" and "Naučím sa". It is the same
  for every player: nothing in it marks what this child masters (the map's keyboard button does).

## The lists
The source a world is designed with. "+" adds to the world before it in the same story; "Naučím sa"
is for `sk-qwertz` (other layouts may bring a key a world sooner or later). A unit test keeps this
table and the code's lists equal.

| World | Musím vedieť | Naučím sa (`sk-qwertz`) |
|---|---|---|
| 1 Lúka |  | f0 j0 sp d0 k0 |
| 2 Raketa | f0 j0 sp d0 k0 | s0 l0 a0 l1 g0 |
| 3 Planéta | + s0 l0 a0 l1 g0 | h0 e0 i0 r0 u0 |
| 4 Údolie | + h0 e0 i0 r0 u0 | m2 o0 t0 |
| 5 Vajíčko | + m2 o0 t0 | n0 m1 |
| 6 Šrotisko | f0 j0 sp d0 k0 s0 l0 a0 l1 g0 | h0 e0 i0 r0 |
| 7 Dielňa | + h0 e0 i0 r0 | u0 m2 o0 t0 n0 |
| 8 Dážď | + u0 m2 o0 t0 n0 | m1 c0 v0 m0 p0 |
| 9 Mesto | + m1 c0 v0 m0 | ls b0 y0 rs z0 |
| 10 Domov | + p0 ls b0 y0 rs | w0 x0 q0 m3 |
| 11 Záhrada | f0 j0 sp d0 k0 s0 l0 a0 l1 g0 h0 e0 i0 r0 u0 m2 o0 t0 n0 m1 | c0 v0 m0 p0 ls b0 y0 |
| 12 Cestička | + c0 v0 m0 p0 ls b0 | rs z0 w0 x0 q0 m3 80 l2 |
| 13 Jazero | + y0 rs z0 w0 x0 q0 m3 l2 | 90 00 70 60 50 40 30 20 |
| 14 Strom | + 80 90 70 60 50 40 30 20 | p1 p2 l3 02 10 |
| 15 Ples | + 00 p1 p2 l3 02 10 01 | |

Where game ideas fit: four keys of each hand (the sticky finger) from world 3 on; the whole
index columns `r0 f0 v0` and `u0 j0 m0` from world 9 on (column games,
`.research/learning/hold-and-reach.md`).

## Why
- A key count does not promise which keys: the parent's own pick, "no diacritics" and the other
  layouts give other sets. A firm list lets a world's games count on, say, a whole finger
  column.
- Keys by place, not letters, because the fingers learn places: one list serves every layout.
- Per world, not per level: a world's games are designed together, and a list per level would
  only repeat the lesson order.
- The parent sees in Help what each world expects, and why a world waits.
- Must know = mastered keys of the worlds before, not the keys a world's first level brings: a key
  the world itself teaches cannot be asked for at its door. Mastered, not only met: a world builds
  on keys the fingers already find, and the drill on the lock card is a short way there.
- Help is a description of the game, the same for everyone; what this child masters belongs on the
  map, next to the world.
