# Keys a world counts on

## What
- The child learns **keys, not letters**: the key with 7 on it is also the key with ý on the
  Slovak keyboard. Keys are named by their place, the same on every layout, as the hand poser
  names them: a letter of the English row range and how far beyond it (`f0` the key F, `l1` the
  key right of L, the Slovak ô, `m1` right of M, `70` the key with 7 / ý, `02` the Slovak dead
  accent key), or two letters for a named key (`sp` the space bar, `ls` / `rs` the Shifts).
- Each **world** (not each level) has a fixed list of keys the child knows on entering it.
  Every game of the world may use them. Keys learned inside the world still come level by
  level, by the lesson order's key count ([lesson progression](lesson-progression.md)).
- A shifted character needs its key and its Shift; a composed letter (ó, ĺ) needs the dead key
  too. Knowing any character of a key knows the key.
- A list holds the keys **every** layout's lesson order reaches by the world's entry (the key
  count of its first level), or never teaches at all. A key one layout reaches later is not in
  the list, though it may come in that world.
- For a child, a key the child's practice order never teaches (no diacritics, a layout without
  that key) is left out of the world's need.
- A world opens when its story is open and the world before it is done (or the keyboard check
  reached it) **and** the child knows its keys. While the child knows fewer keys than the
  world's first level needs, that level's own key count holds the child back as before; once
  the count is there but some of the world's keys are not (the parent's own pick of keys, a
  gap), the world stays closed: the map's lock card says "First learn these keys:" with the
  missing keys as small key caps of the child's layout and the two-minute drill of them.
  The list guards the way in only: a world with a level already played stays open, so
  finished levels can always be replayed.
- Help, tab Progress, section **Worlds and keys**: every world, also one not built yet, with
  its island and two rows of key caps on the child's layout, "You start with" and "New here"; a
  key the child knows is full, one still to learn an outline.

## The lists
The source a world is designed with. "+" adds to the world before it in the same story; "New
here" is for `sk-qwertz` (other layouts may bring a key a world sooner or later). A unit test
keeps this table and the code's lists equal.

| World | Enters with | New here (`sk-qwertz`) |
|---|---|---|
| 1 Lúka | f0 j0 sp | d0 k0 |
| 2 Raketa | + d0 k0 s0 l0 | a0 l1 g0 |
| 3 Planéta | + a0 l1 g0 h0 e0 | i0 r0 u0 |
| 4 Údolie | + i0 r0 u0 m2 | o0 t0 |
| 5 Vajíčko | + o0 t0 n0 | m1 |
| 6 Šrotisko | f0 j0 sp d0 k0 s0 l0 a0 l1 g0 | h0 e0 i0 r0 |
| 7 Dielňa | + h0 e0 i0 r0 u0 | m2 o0 t0 n0 |
| 8 Dážď | + m2 o0 t0 n0 m1 | c0 v0 m0 p0 |
| 9 Mesto | + c0 v0 m0 p0 | b0 y0 rs z0 |
| 10 Domov | + ls b0 y0 rs w0 | x0 q0 m3 |
| 11 Záhrada | f0 j0 sp d0 k0 s0 l0 a0 l1 g0 h0 e0 i0 r0 u0 m2 o0 t0 n0 m1 | c0 v0 m0 p0 ls b0 y0 |
| 12 Cestička | + c0 v0 m0 p0 ls b0 y0 rs | w0 x0 q0 m3 80 l2 |
| 13 Jazero | + z0 w0 x0 q0 m3 l2 | 00 70 60 50 40 30 20 |
| 14 Strom | + 80 90 00 70 60 50 40 30 20 p1 | p2 l3 02 10 |
| 15 Ples | + p2 l3 02 10 01 | |

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
