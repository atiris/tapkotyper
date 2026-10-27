# 70 - Rocket world: world rhythm and the calm "Hop across the meteors" level

Source: owner request 2026-10-27 ("svet Raketa nemá odporúčané rozdelenie levelov").

## What and why
- The rocket world plays four times the same stream of rocks. The meadow already follows the
  world rhythm (`.specify/game/mechanics.md`): 1 main game, 2 calm step, 3 main game with a
  surprise, 4 copy twist, 5 super-obstacle. The rocket world gets the same rhythm, so a session
  goes up and down instead of repeating one game.
- Level 2 is the calm step: the astronaut hops from meteor to meteor and at the end reaches
  the rocket. Nothing flies at the child, nothing is missed (the waiting-words rules).

## Affected
- `src/game/levels.ts` (level list of world 1, new kinds, `activityOf`, `minActiveS`),
  `src/game/modes.ts` (mode registry), new mode in `src/game/modes/space-calm.ts`,
  `src/game/modes/idle.test.ts` (new mode in the no-typing test), `src/game/levels.test.ts`
  if it pins world 1's kinds, i18n `story.hopStart` (sk, en, guide notes).
- No profile data change: level ids `w2-1`..`w2-5` stay, so stars of old runs stay on their
  level number (their meaning changes; alpha, no migration).
- Spec: `.specify/game/story.md` (Space Rocket Flight), `.specify/game/mechanics.md` (world
  rhythm no longer "the meadow so far").

## Decisions
- New level list of world 1: `def(1, 0, 'space', 12, 'asteroids')`, `def(1, 1, 'hop', 16)`,
  `def(1, 2, 'space', 16, 'strong')` (plan 71), `def(1, 3, 'command', 12)` (plan 72),
  `def(1, 4, 'asteroid', 4)`. Until plans 71 and 72 land, levels 3 and 4 keep `'mix'`.
- Activity icons: `hop` is waiting words (`catch`), `command` is copy (`clean`); keep the
  kind lists next to `activityOf` (calm kinds, copy kinds) instead of more `===` checks.
- `minActiveS`: the calm step length (`CALM_ACTIVE_S`) for every calm kind, `hop` included.
- Hop mechanics (waiting words): up to 3 meteors float still in the right two thirds, each
  with a word of at most 4 letters starting with its own letter (as `DewdropsMode` does).
  The astronaut (`tapko-astronaut`, the suited Tapko, drawn like `drawAstronaut` in
  `space.ts`; export it) stands on a meteor on the left. A typed word: the astronaut jumps in
  an arc (0.7 s) onto that meteor; the stage then glides left so the meteor he stands on is
  back on the left (scroll the background with it), and a new meteor comes from the right
  edge after `DROP_PAUSE`. A key that starts no word counts only in accuracy.
- The end: when the level's words are done (count, grown by the minimum time), the rocket
  (`obj-rocket`, mirrored to face him) glides in from the right and stops beside his
  meteor; he jumps into its window (reuse the window position from `space.ts`), the rocket
  shows `obj-rocket-pilot` and flies off to the right; `finished` after that (about 2.5 s).
- Meteor pictures: `obj-asteroid-big` / `obj-asteroid-small` / `obj-rock-falling-1`,
  random, some mirrored, a slow wobble (rot ±0.05). Size about 150 so a boot fits on top.
- Opening line `story.hopStart`: "Raketa odletela kúsok ďalej. Skáč po meteoritoch, kým k
  nej nedoskáčeš!" / "The rocket drifted a bit away. Hop across the meteors until you reach
  it!"
- Reduced motion: the jump and the glide are instant.

## Steps
- [ ] 1. Levels: new kinds `hop` and `command` in `LevelKind`, the world 1 list above (3 and 4
      on `'mix'` until 71 and 72), calm and copy kind lists for `activityOf` and `minActiveS`;
      update `levels.test.ts` where it pins kinds.
- [ ] 2. `HopMode` in `src/game/modes/space-calm.ts` with the mechanics and the end above,
      registered in `modes.ts`; `idle.test.ts` lists it.
- [ ] 3. Strings `story.hopStart` (sk, en, guide).
- [ ] 4. Spec: story.md (the five levels of the rocket world), mechanics.md (world rhythm for
      the meadow and the rocket world).
- [ ] 5. Play `w2-2` with `?fast` in the browser: the jump, the glide, the end with the rocket;
      check there is no fallback flash and no word on a meteor still sliding in.
