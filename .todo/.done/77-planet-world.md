# 77 - Planet world redone: swamp, crystals, crossroads, spells, the cradle

The owner's notes from 2026-10-28. The planet world (world 3) is redone on the rules agreed for the
meadow and the rocket world (plans 66, 70-75): one story per level, Tapko at the size of the meadow's
DOM Tapko, words above him or in the middle and never over him, a world rhythm, pictures in the
anime background style of plan 64. Also: the stories of all three dragon-story worlds written down
in one scenario file, and the meadow and rocket start lines checked against them.

Affected: `src/game/modes/planet.ts` (rewritten; `HeroMode` stays for the other worlds),
`src/game/levels.ts` (planet level kinds, counts, calm kinds, activities, rescue kinds),
`src/game/modes.ts`, `src/game/mode.ts` (`ground` layer set), `src/gfx/draw.ts` (`drawBackground`
takes the layer set), `src/game/runtime.ts` (background names, `tapkoOnStage`, a mutable minimum
time), `src/game/modes/aim-things.ts` (the planet's own range thing), `src/screens/story.ts`,
`public/i18n/{sk,en}.json`, `public/i18n/guide/{sk,en}.json`, `src/i18n/catalog.ts`,
`public/assets/` + `manifest.json`, `assets-src/PROMPTS.md`, `.specify/game/{story,mechanics,
super-obstacles,index}.md`, new `.specify/game/story-1-scenario.md` (Slovak), e2e/unit tests that
name the old kinds. No store changes (alpha, no migrations; old `w3-*` results keep their ids).

## Story (planet = the dragons' planet)
The dragons' planet lost the light of its Crystal of Life. Tapko is sent to bring it back. He lands
in a swamp (1), collects energy crystals on the meadow that his ship needs for the way home (2),
finds the way through crossroads (3), wakes the three crystals of life with spells (4) and carries
them across the great swamp to the **Cradle of Life** (Kolíska života; not an altar), where they
make life flourish again (5). Reward stays the Force: the crystal thanks him with it (world 4 uses it).

## 1. Pictures (Gemini, `assets-src/PROMPTS.md`)
- [x] `bg-planet-far`: Earth-like, natural greens and blues (not mint, purple or turquoise), green
      hills, giant mushroom trees, big pale crystals in the hills, a few small jagged sawtooth clouds
      in soft orange. Seam by the far procedure.
- [x] Swamp set `bg-planet-swamp-mid`, `bg-planet-swamp-near`; meadow set `bg-planet-mid`,
      `bg-planet-near` (grass, mushroom-tree forest, glowing plants, crystals, bulb plants). Strips,
      quilt, lift as in plan 64.
- [x] Sprites: `obj-crystal-{amber,rose,aqua}` and `-cracked` of each; `obj-mound-1`, `obj-mound-2`;
      `obj-signpost-{1,2,3}` (short, middle, tall posts, a bit different each, no board);
      `obj-life-crystal` (three crystals on one base, dull) and `obj-life-crystal-lit` (same, glowing);
      `obj-swamp-stone`, `-cracked`, `-broken` (no face); `obj-cradle` (carved stone pedestal with an
      empty hollow on top); `obj-planet-bank` (the grassy far bank); `ui-map-planet` in the new colours.
- [x] Drop `obj-sign` and `obj-stone` from the game and `public/assets/` once nothing draws them.

## 2. Common rules for the planet levels
- Background layer set per level (`Mode.ground`): swamp in levels 1 and 5, meadow in 2-4 and in the
  side activities. Far is shared.
- Tapko drawn on the canvas has the DOM Tapko's size (`TAPKO_H`) and stands with his feet where the
  DOM Tapko's are (`VH - TAPKO_H * 0.1`); stones and mounds sit low in the near band. Levels where
  he stands still (2, 4) use the DOM Tapko as the meadow does.
- His word is above his head, or in the middle; never over him.

## 3. Level 1 - Swamp (waiting words, calm: 60 s)
- [x] As now: one word at a time; a ring on the water shows where the next stone comes; the typed
      word puts the stone there and Tapko hops onto it, the view glides. Word above Tapko's head.
- [x] After the last stone the grassy far bank shows; he hops onto it and says he sees the meadow and
      looks forward to it (`story.swampDone`).

## 4. Level 2 - Crystals (stream)
- [x] Five mounds at start in the near band right of Tapko, a bit apart. A random crystal (one of
      three, turned a little at random, sometimes mirrored) grows out from behind a mound (the mound
      covers its foot), then stays big (about 30 % of Tapko's height), then cracks.
- [x] Its word appears high above it as it starts and sinks toward its tip over the travel time
      (`L.travelTime`); the number at once follows `L.maxActive`, the gap `L.spawnGap`; first
      letters differ.
- [x] Typed: the crystal flies in an arc into Tapko's pocket (shrinking, sparkles). Not typed when
      the word reaches it: the crystal cracks (cracked picture), the word goes (a miss), the crystal
      fades, and after a pause a new one grows from that mound. Only collected crystals count
      (a cracked one is replaced, like a leaf that flew by), so waiting never ends the level.
- [x] At the end the count of collected crystals shows in the middle (`story.crystalsDone*`).

## 5. Level 3 - Crossroads (signposts)
- [x] Five slots evenly from left to right. Tapko stands under one; his path's words come one at a
      time above him (he cannot skip one); every typed word is a step: the view moves on.
- [x] A crossroads: his word goes and up to four signposts grow almost together in the other slots,
      each a post (three heights, alternated so no two signs within two slots share a height) with
      its activation word at the top and the path's name above it. Each word starts with another
      letter. A slip on a sign's word makes that sign vanish; the last sign left must be typed
      without a slip (a slip starts its word again). The typed sign: the others vanish, Tapko walks
      to its slot, and his words come there.
- [x] Paths (name pool per language, activation word, effect from then on):
      plain (cesta, chodník, chodníček, cestička, alej) normal word, no effect;
      short (skratka, krátka cesta, krátky chodník) harder word; shorter words, time x0.9, words -15 %;
      fast (rýchla cestička, rýchla cesta, rezký chodník) even harder; short words, legs of 3, time x0.8;
      teleport (teleport, superskratka) extreme; words -40 %, time x0.6;
      detour (obchádzka, dlhá cesta, okľuka) easy word; normal words, time x1.2, words +25 %;
      hard (náročná cesta, ťažká cesta, zarastená cestička) super easy word; harder words, time x1.2, words +25 %;
      wide (široká cesta, jednoduchá cesta, ľahká cesta) harder word; easier words, words +10 %, legs of 6;
      dark (temný les, záhadná cesta) normal word; time x0.85, normal words, some come back up to
      twice in a row (an echo) and one of the leg is extreme;
      unknown (nepreskúmaný chodník, neznáma cesta) normal word; each of three axes drawn at random
      (word length, time, word difficulty) and Tapko says what happened;
      practice (kamenistý chodník, cvičná cestička; the owner asked what is missing) normal word;
      the words train the child's weak keys (`aimKeys`).
      Word kinds: super easy 2 letters, easy up to 3, normal up to 5, harder two words, even harder
      two longer words, extreme a sentence of 3-4 words; easier words one word up to 4, harder 2-3
      words. Time scales the level's minimum (`LevelRuntime.stretchMin`), words change `L.count`.
- [x] Legs of 4 words (by path), a crossroads after each while enough words are left; the end of the
      road: Tapko is glad (`story.roadEnd`).

## 6. Level 4 - Spells (copy twist)
- [x] The three crystals of life stand dark on the right. A spell panel in the middle shows a spell
      of several words, typed left to right. A spell breaks at its 4th wrong key (more than 3): it
      fizzles and starts again from its first word, same words. Three small sparks on the panel show
      the slips left.
- [x] A spell cast lights the next third of the crystal with a shout (`story.spellCast`: Jupí, Hurá,
      Zipp, Whizz, Juchú). Three lit: the crystals fly to Tapko, he is glad, the level ends.
- [x] Spell length: the level's words in three, and at the start of each spell enough words for the
      minimum time left at the child's pace so far.

## 7. Level 5 - The great swamp (super-obstacle)
- [x] Stone 0 on the left. The word above Tapko; typed, the next stone appears and he jumps. Three
      jumps from stone 0, the fourth reaches a stone that becomes the new 0 and the view glides.
      A slip on stone 0 is fixed as usual. A slip on +1..+3: that stone cracks, he jumps back stone
      by stone to 0, each stone left behind crumbles and fades and the next one cracks; on stone 0 a
      new word comes.
- [x] At the end a boulder blocks the way: slightly harder words crack it (a slip counts half, as
      now); it bursts and goes, stones appear by themselves up to the last but one, he hops across
      to the bank where the Cradle of Life rises, puts the crystals of life on it, they glow, he is
      glad and cheers.

## 8. Texts, scenes, specs, checks
- [x] Planet start lines, scenes `landing`, `world3`, `force`; the meadow (afternoon: training,
      poppies, the match, the treat after it, the hedgehog who was late) and rocket (journey to the
      dragons' planet) lines checked against the story. Guide notes and catalog.
- [x] The planet's own range thing is a crystal.
- [x] `.specify/game/story-1-scenario.md` in Slovak; story.md, mechanics.md, super-obstacles.md.
- [x] tsc, vitest (396), build.
- [x] Browser play-through (`?fast`, tester profile): all five levels played to the end, with slips
      on a sign, the last sign, a spell (fourth slip) and a stone away from the firm one.

## Done - 2026-10-28
Shipped every step above. Found while playing and fixed: the meadow's first near and mid layers
were so detailed that the game's crystals and signs got lost (the owner noticed); they were
redrawn with low detail and no crystals. Tapko stands on the bank's grass line, the game's crystals
glow in their own color, the path's line replaces a line still shown, the word sits higher above
his helmet. `obj-sign`, `obj-stone` and `obj-boulder-3` are gone. e2e: play.spec.ts passes for the
planet; three older failures are in the backlog (renamed buttons, the gate's progress).

## Follow-up - 2026-10-28
The owner's review in the browser: calmer bands (open meadow, a path with a few crystals and
mushrooms, the owner's own swamp bands with seams joined and placed lower), the swamp ending in an
end piece of the near band (the owner's shore picture, cut and joined to the band) reached over
ordinary stones, smiling stones that crack ticklishly, molehills, larger and slower crystals,
long wooden arrows with the path names that spin up when chosen, paws that leave the crossroads
to the child, crystals of life peeking out of a molehill with mushrooms for the slips, and the
cradle's glow with the crystals floating above it. Word labels stay wholly on the stage everywhere.
