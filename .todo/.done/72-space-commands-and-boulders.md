# 72 - Rocket world level 4 "Commands to the rocket" and a livelier level 5

Source: owner request 2026-10-27.

## What and why
- Level 4 is the calm copy twist of the world rhythm. The astronaut stands on a meteor on the
  left and writes commands to the rocket on the right, which faces him. Each sent command
  brings the rocket a bit closer, and it answers. When everything is written, the rocket is
  beside him, he boards it and is glad.
- Level 5 (the fractured asteroid) stays, but the big boulders turn now and then, and the
  last one heads for the rocket, so the final fight belongs to the story.

## Affected
- New `CommandMode` in `src/game/modes/space-calm.ts` (next to `HopMode` from plan 70),
  `src/game/modes.ts`, `src/game/levels.ts` (`def(1, 3, 'command', 12)`), `AsteroidMode` in
  `src/game/modes/space.ts`, `idle.test.ts`, i18n (sk, en, guide): `story.commandStart`,
  `story.commandReply` (list), `story.boarded`. No data change. Spec: `.specify/game/story.md`,
  `.specify/game/super-obstacles.md`.

## Decisions
- Copy rules exactly as the meadow invitation (`InvitationMode`): a row of 3 to 4 words typed
  left to right, a slip turns the word red and leaves a faint trace (0.2), and the level gets
  2 more words up to the story's ceiling (`slipWords`). Share that logic instead of copying it
  (extract the row handling of `InvitationMode` into a small helper both modes use).
- The row sits on a small screen/console panel above the astronaut (dark blue, light text
  frame), not on a paper card.
- A finished row is sent: a short beam of dots flies from the astronaut's console to the
  rocket, the rocket fires a short flame and glides closer by (start gap / number of rows);
  the rocket answers in a bubble from `story.commandReply` ("Inštrukcia prijatá.",
  "Rozumiem.", "Krátky zážih motorov.", "Približujem sa." / "Instruction received.",
  "Understood.", "A short engine burn.", "Coming closer."). The next row comes after the
  reply (about 1 s).
- The rocket is `obj-rocket` mirrored (it faces left, toward him), on the right third at the
  start; the astronaut (`drawAstronaut`) on a meteor at the left.
- The end: the rocket stops beside him, he hops into its window, the rocket shows
  `obj-rocket-pilot` (mirrored), hearts or sparkles, the narrator says `story.boarded`
  ("Hurá, si na palube!" / "Hooray, you are on board!"); `finished` about 2.5 s later.
- Opening line `story.commandStart`: "Napíš rakete príkazy, nech priletí k tebe. Každý
  odoslaný príkaz ju privedie bližšie." / "Write commands to the rocket so it comes to you.
  Each command you send brings it closer."
- Level 5: each big asteroid spins with a random `vr` of ±0.25 to ±0.6 (some to the left,
  some to the right) and is mirrored at random; the last big asteroid of the run flies
  straight at the rocket's height instead of the middle. Pieces stay as they are.

## Steps
- [x] 1. Extract the copy-row helper from `InvitationMode`; the invitation still plays the
      same (its unit and idle tests pass).
- [x] 2. `CommandMode` with the panel, the sending, the replies and the boarding end;
      registered; `idle.test.ts` lists it; `def(1, 3, 'command', 12)`.
- [x] 3. `AsteroidMode`: turning and mirrored big asteroids, the last one at the rocket.
- [x] 4. Strings (sk, en, guide); spec story.md and super-obstacles.md.
- [x] 5. Play `w2-4` and `w2-5` with `?fast` in the browser, with one slip in `w2-4`.

## Done - 2026-10-27
- Shipped: `CopyRow` (copy-row.ts) shared by the invitation and the new `CommandMode`
  (console panel, sent rows as dots, engine burst, the rocket's answers in its own bubble, the
  rocket closing in by the level's share, boarding with a shout); `w2-4` is `command`; the
  rocket lines have their own translator group; big asteroids turn and mirror at random, the
  last one bigger at the rocket's height; spec story.md and super-obstacles.md.
