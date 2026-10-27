# 71 - Rocket world level 3: a faster stream with stronger meteors

Source: owner request 2026-10-27.

## What and why
- Level 3 of the world rhythm is the main game, harder, with one surprise. In the rocket world
  the stream is faster, and some meteors are stronger: when their word is typed they shout
  that it hurt but they are stronger, and the child types the word once more. A surprise that
  asks for one more word, not a punishment.

## Affected
- `src/game/modes/space.ts` (`SpaceMode` variant `strong`), `src/game/levels.ts`
  (`def(1, 2, 'space', 16, 'strong')`), i18n (sk, en, guide): `story.strongStart`,
  `story.strongHit` (list), `story.strongSay`. No data change. Spec: `.specify/game/story.md`.

## Decisions
- Faster: in the `strong` variant movers travel 15 % faster (`speedFor` / 1.15) and the spawn
  gap is 0.85 of the usual.
- About every fourth meteor (not the first two of the run) is strong: `obj-asteroid-big`,
  size 135, a thin glowing ring around it so the child sees it before typing. It has 2 lives.
- A typed strong meteor with a life left: it does not leave; a short shout over it from
  `story.strongHit` ("Au!", "Zásah!", "Trefa!", "Ouha!" / "Ouch!", "Hit!", "Got me!",
  "Oof!") and the narrator's bubble `story.strongSay` ("Ja som silnejší, musíš napísať slovo
  znova." / "I am stronger, type the word again."), a puff of sparkles, it is pushed back to
  the right by 120 px and gets the same word again as a new target (`core.add`), its ring gone.
  The second typing makes it leave like any rock. Progress and the level count treat the
  meteor as one target (the repeat does not count twice; `resolved` grows on the second).
- Explained at the start: the opening line `story.strongStart` ("Pozor, niektoré meteority
  sú silnejšie, majú okolo seba žiaru. Keď napíšeš ich slovo, musíš ho napísať ešte raz." /
  "Careful, some meteors are stronger and glow around the edge. When you type their word,
  you type it once more.").
- A strong meteor that floats by is a miss like any other (no second life then).

## Steps
- [ ] 1. `strong` variant in `SpaceMode`: speed, spawn gap, strong meteors with the ring and
      two lives, the shout and the bubble, the second word; progress counts it once.
- [ ] 2. Level list: `def(1, 2, 'space', 16, 'strong')`; strings (sk, en, guide).
- [ ] 3. Spec story.md; a unit test that a strong meteor needs its word twice and counts once.
- [ ] 4. Play `w2-3` with `?fast`: the start line, a strong meteor typed twice, the shout.
