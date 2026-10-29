# 81 - Placeholder levels for the worlds not built yet

The owner's notes from 2026-10-29. Only the first three worlds (Lúka, Raketa, Planéta) are built on
the agreed rules (one story per level, world rhythm, plans 66-77). Every level from world 4 (Údolie)
on is an old draft game. Until a world is redone, all its five levels play one simple, good-looking
placeholder game: **cyclic copy**. The child still progresses: copying the level's words for its
round time unlocks the next level, and new letters keep coming as in any level.

Affected: `src/game/levels.ts` (kind `copyloop` for worlds 4-15, activities, rescue kinds),
`src/game/modes.ts`, new `src/game/modes/copy-loop.ts`, the old modes of worlds 4-15 deleted
(`dragons.ts`, `egg.ts`, `junkyard.ts`, `workshop.ts`, `raintown.ts`, `robocity.ts`, `robohome.ts`,
`garden.ts`, `forestpath.ts`, `lilylake.ts`, `musictree.ts`, `moonball.ts`) and what only they used,
the get-ready card text (`src/game/cards.ts` / `src/game/runtime.ts`), `public/i18n/{sk,en}.json`,
`public/i18n/guide/{sk,en}.json`, `src/i18n/catalog.ts`, tests (`idle.test.ts`, `levels.test.ts`,
`e2e/play.spec.ts`), `.specify/game/{story,super-obstacles,mechanics,index}.md`. No store change:
level ids `w4-1` .. `w15-5`, stars, badges and rewards stay. The project is alpha: never any
migration or data version, old results simply stay under their ids.

## Decisions
- **Which levels:** every level of worlds 4-15 (indexes 3-14), super levels included. Plan 80 (the
  valley) later replaces world 4's five defs with its own kinds; any later world plan does the same.
- **Old games are deleted, not kept dormant** (no dead code; git history keeps them). Pictures in
  `public/assets/` stay, they are the art for the coming worlds; only their `PICTURES` lists go.
  Styles (`dictation`, `memory`, `mixed`), `Rhythm`, the super help and anything else the built
  worlds, own exercises, free typing, the range or the parrot still use stay; remove only what
  tsc / grep shows has no user left.
- **Story, map, rewards:** the world names, map cards, badges, accessories (`rewards.ts`), world
  reward scenes and the story unlock rules stay as they are. Story 2 and 3 still open at 10 and 20
  keys. Level key needs (`STORIES[].keys`) stay, so the placeholder's words grow with the world.
- **Rescue missions:** only kinds of built worlds (meadow, space, swamp, crystals); a rescue never
  plays the placeholder.
- **Side cards** of these worlds (target range, parrot, free typing) stay as they are.

## 1. The get-ready card
- [x] For a `copyloop` level the story part of the card says one line instead of the story:
      sk "Táto úroveň sa ešte pripravuje. Zatiaľ si tu precvičíš odpis: píš slová zo stredu, kým
      neuplynie čas.", en "This level is still being made. For now you practise copying here:
      type the words in the middle until the time is up." The level title, the posture picture,
      the key cards of new keys and the tip stay as on every card.

## 2. The scene
- [x] The world's own three background bands (`bg-<world>-far/mid/near`, all exist), the near band
      drifting slowly as in the calm levels.
- [x] Tapko (the DOM Tapko) at his usual place on the left, at the meadow's size; his idle, happy
      and thinking faces react as in other levels (a finished target: happy, a slip: thinking).
- [x] A small rounded sign at the top middle, the world's name and "Pripravuje sa" / "Coming soon"
      in small letters, calm, never covering the panel or Tapko.

## 3. The game: cyclic copy (`CopyLoopMode`)
- [x] One target at a time on a panel in the middle of the stage (above Tapko's head height, never
      over him), large, in the panel look of the planet's spells (rounded, soft white with the
      world's accent colour as its border and glow). The typed part changes colour as in other
      copy levels; the finger guide and the keyboard work as everywhere.
- [x] What the target is, from the level's index and the keys: levels 1-2 a word (`L.word(undefined,
      1)`); levels 3-4 a phrase of 2-3 words (`L.word(undefined, 3)`); level 5 a sentence of 3-5
      words (`L.word(undefined, 5, 3)`) once the space and the period are known, else a phrase.
      The level's key rules (need, ceiling, weak keys) give the letters, so new letters show up.
- [x] A finished target floats up out of the panel, fades with a soft sparkle in the accent colour,
      and the next one grows in; a count "napísané: n" sits small under the panel.
- [x] A slip: the usual wrong-key wobble and statistics; it only counts (no restart, no extra
      words). The paws work as in other levels.
- [x] Length: the level's minimum time (`MIN_ACTIVE_S`, 120 s of active play) is the round time;
      the targets come without end (`count` grows with `grownCount`), the progress bar follows the
      time, and the level ends with the target being typed when the time is played. Stars from the
      accuracy as usual; finishing unlocks the next level and, at level 5, the world as now.
- [x] Accent colour per world in the mode (a small table: dragons warm orange, egg cream-turquoise,
      junkyard rust, workshop steel blue, raintown rain blue, robocity teal, robohome warm yellow,
      garden rose, forestpath leaf green, lilylake water blue, musictree violet, moonball moon
      silver), each checked against its background for contrast.
- [x] `activityOf` gives `clean` for `copyloop`, so its map dots show the copy icon.
- [x] End line (`story.copyLoopDone`): sk "Pekne odpísané! Napísal(a) si {n} …" with the plural
      forms the catalog uses; en the same.

## 4. Clean-up, specs, checks
- [x] Delete the old modes of worlds 4-15, their kinds in `LevelKind` and `MODES`, their i18n lines
      (start lines, story lines, hints, guide notes) and anything left unused; the unused-key test
      must pass. Reward scenes and world names stay.
- [x] Specs: `story.md` says worlds 4-15 play the placeholder until their world is built (their
      story text stays as the design to build, marked "not built yet"); `super-obstacles.md` marks
      the super-obstacles of worlds 4-15 as not built yet; `mechanics.md` describes the cyclic copy;
      `game/index.md` line.
- [x] Plan 80 depends on this plan: it replaces the world 4 placeholder defs with its own kinds.
- [x] Tests: `levels.test.ts` (kinds of worlds 4-15, activity, minimum), `idle.test.ts` (the new
      mode), a unit test that the target kind follows the level index and the known keys, e2e that
      named the old kinds. tsc, vitest, build.
- [x] Browser play-through (`?fast`, tester profile `.e2e/tester-profile.json`, `tapkoType`): the
      get-ready card of a placeholder level, level 1 and 5 of Údolie, one robot-story and one
      fairy-story level to the end, a slip, the next level unlocked; look at a narrow and a wide
      screen in each of the three worlds that every placeholder looks clean (panel, sign, Tapko,
      bands).

## State
- Implemented: all steps. `copyloop` kind in `levels.ts`
  (worlds 4-15 built by one `flatMap`, counts 12/14/16/18/14), `modes/copy-loop.ts`, old modes,
  `gate.ts`, their i18n lines and translator notes deleted.
- Decisions taken while implementing:
  - The get-ready card of a placeholder level never shows the world's story (runtime skips the
    first-visit world story for `copyloop`), so the story is still told when the world is built.
  - The counter and the end line count **words** typed (a phrase or sentence adds all its
    words), so "napísané: n" and "Napísal(a) si n slov" stay true at the phrase levels.
  - The end line uses the catalog's plural mechanism (`tn`, `PLURAL_KEYS`), new group
    `story-placeholder` in the translator catalog.
  - Bolt and Melody still stand next to Tapko in the placeholder levels of their stories.
  - Rescue missions draw from the four built kinds for every finished story, so until stories
    2 and 3 are built every rescued friend is a dragon (`rescueLevel(seed)` lost its profile).
  - Removed as left without users: `LevelDef.style`, the `listen`/`remember` map activities
    and their `map.act.*` lines (the help legend still explains the ways to type with its own
    `help.games.*` lines and `ui-act-*` pictures), the `beat`/`click` sounds, Bolt's `wet` mood,
    the `wave.*` texts and `gate.ts`. Styles `dictation`/`memory`/`mixed` stay as decided (own
    practice uses the first two; `mixed` waits for the music tree).
  - The counter under the panel is dark ink with a white rim: white text was hard to read on
    the junkyard's light sand (seen in the play-through).

## Done - 2026-10-29
Shipped: every level of worlds 4-15 plays the cyclic copy (`modes/copy-loop.ts`) with the
world's bands, a "Pripravuje sa" sign, a panel in the world's accent, word/phrase/sentence
targets by level, a word counter and an end line; the get-ready card says the level is being
made. The twelve old modes, `gate.ts` and everything only they used are gone; rescue missions
play only the built kinds; specs, translator notes and tests (unit, e2e) follow. Played in the
browser: Údolie 1 (with a slip) and 5 (a five-word sentence, end line, world badge), Šrotisko 1
at 1024x600 with Bolt, Záhrada 1 at 1920 and 1024 wide with Melody; each unlocked its next level,
no console errors.
Left out: Údolie at a narrow and Šrotisko at a wide screen were not looked at separately (the
same layout code was seen at both sizes in the other worlds).
