# 86 - Hero's journey instead of rescue missions and little friends; the compass

## Why

Rescue missions (random replays at the rescue camp) and the little friends they gave are a
second, weaker reward loop beside the story: the owner removes both. What stays is the idea of
the hero's journey: one long, harder expedition that closes each story, after the parrot of
its last world. It gives the finished story a final test that counts like a real level. The
**compass** is its symbol: the picture of the journey's map node, and a new range thing.

## Decisions (taken with the owner, 2026-10-31)

- **Gone completely:** rescue missions, the rescue camp, little friends (the Little friends
  screen, its map button and route, `Friend` / `progress.friends`, the friend names, the
  "rescued" news, the rescue backdrop). Nothing left in menus, code, texts, translator notes,
  catalog, help, specs or tests. Alpha: no store migration, no data version; old stored
  `friends` arrays are simply ignored and dropped on the next save (unknown fields are not kept,
  or keep them harmlessly if the store copies them - do not add code for them).
- **Keep:** the world reward scenes (`WORLD_REWARDS`, e.g. the scene id `friends` of the
  junkyard reward is Bolt's story scene, not the little friends; check its text and keep it
  unless it promises rescue missions or little friends, then reword only that sentence).
  `grantCompanions` in the wardrobe is about companions, keep it.
- **Hero's journey (Cesta hrdinu)** - one per story:
  - **Place:** the last card on the map row of the story, in the card of the story's last world
    (worlds 4, 9, 14), as a node right after the parrot node. Picture: the compass.
  - **Opens:** with the story's last world done (its super level), the same moment as that
    world's target range and parrot (`aimOpen(p, lastWorld)`). Closed it shows faded with the
    tooltip "opens when the world is finished" like the range and parrot (`sideTip`).
  - **Play: a mix of the story's worlds.** It runs one part per world of the story, in world
    order; each part plays that world's first level's kind and variant (`worldLevels(w)[0]`),
    in that world's background; a world not built yet plays what its levels play now (the
    cyclic copy placeholder). Between parts a short travel card names the next world (picture
    of the world island like the map, "Ďalej: <world name>", Space/Enter or a click goes on;
    no other intro cards, no key cards, no get-ready card except before the first part).
  - **Length:** twice the minimum of a regular level of that story
    (`2 * STORY_MIN_S[story]`), split evenly over the parts; the planned words likewise
    (twice `minWords` of a regular level, split evenly). Each part is a normal run of its
    mode with that part's minimum (`minActiveS` / `minWords` take the journey into account via
    the def, e.g. a `journey: { story, part, parts }` field on `LevelDef`).
  - **Harder stars:** stars come from the accuracy of the whole journey (all parts' keys
    together), one step stricter than a level: 3 stars from 98 %, 2 from 95 %, else 1; the half
    stars shown on the card: 3 from 98 %, 2.5 from 96.5 %, 2 from 95 %, 1.5 from 90 %, else 1.
    The paw rule (fewer than 5 own keys gives one star) applies to the whole journey.
  - **Counts like a level:** keys, time and rhythm go into the statistics as in a story level;
    growth, trend and lesson advance as after a story level; the best stars are kept under the
    id `journey-<storyId>` in `progress.levels` and shown on its node as mini stars. It is not a
    level of the world: it changes neither the world badge, nor `worldsDone`, nor which levels
    open. The parent's surprises count it as a level of the last world.
  - **End:** the one end card (`showEnd`) with title "Cesta hrdinu prejdená!", the compass
    picture, the stars, accuracy, rhythm and minutes; buttons "Hrať znova" and the map. Esc and
    peeking as on every end card; staying a while is not offered.
  - **Leaving mid-way** (pause card "Ukončiť písanie", after a key) asks first like a story
    level; the journey's progress is lost and nothing is saved but the statistics already flushed.
- **Compass on the range:** a range thing of every world (`story: 0`) from now on, picture
  `obj-aim-compass` (the same picture as the journey node). Effect `bounce` with a `wobble`
  and a `sparkle` burst, sfx `ring`, `spin: 'point'` is not wanted (it tumbles).
  Texts (sk): launch "Leť na východ!", "Kompas musí mať správny smer!", "Hádam trafí!",
  "Kompas to tu roztočí!"; sound "Klang!"; hit "Ukazuje na sever!", "Bol medzi nami
  magnetizmus!", "Už sa nestratím!", "Konečne trafím domov!" (en: matching playful lines;
  translator notes like the other things).
- **Picture:** `obj-aim-compass` is generated in Gemini (skill `gemini-images`): add its prompt to
  `assets-src/PROMPTS.md` in the style of the other `obj-aim-*` pictures (a friendly brass
  pocket compass, transparent background), run the asset pipeline (`npm run assets`). Until it
  exists the thing and the node use a fallback drawn in code (a gold circle with a red needle),
  like the `drawn` things.

## Affected

- `src/game/levels.ts` (remove `rescueLevel`, `RESCUE_KINDS`, `rescueUnlocked`, `rescue` on
  `LevelDef` and in `minActiveS`/`minWords`; add `journeyLevel(story, part)`, journey minimums,
  `journeyStars`/`journeyShownStars`), `src/game/progress.ts` (a journey completion that merges
  the parts), `src/screens/level.ts` (rescue end and friend code out; journey parts, travel card,
  journey end), `src/screens/map.ts` (rescue and friends buttons out; journey node),
  `src/screens/friends.ts` (deleted), `src/main.ts`, `src/app/app.ts` (screen, routes),
  `src/storage/schema.ts` + `store.ts` (`Friend`, `friends` out), `src/game/end-news.ts`
  (`rescued` out), `src/game/runtime.ts` (rescue backdrop, Bolt/Melody rescue cases, ending
  texts), `src/gfx/draw.ts` (rescue palette and its lanterns/bridge/flag if nothing else uses
  them), `src/gfx/fairy.ts`/`robot.ts` comments, `src/ui/dom.ts` (`rescue` icon if unused),
  `src/game/modes/aim-things.ts` (compass), `public/i18n/{sk,en}.json`,
  `public/i18n/translator/en.json`, `src/i18n/catalog.ts`, help texts, `assets-src/PROMPTS.md`,
  e2e and unit tests that touch rescue or friends.
- Specs: `.specify/game/story.md` (rescue sections, "rescue missions unlock" in rewards ->
  the hero's journey opens), new `.specify/game/heros-journey.md` (WHAT/WHY above) linked from
  `.specify/game/index.md`, `.specify/game/target-practice.md` (the compass), and every other
  mention (`tapko.md`, `help.md`, `mechanics.md`, `lesson-progression.md`, `parent-controls.md`,
  `finger-guide.md`).
- DB/store: fields removed from the profile shape only; no migration (alpha).

## Steps

- [ ] Remove rescue missions and little friends everywhere (code, screen, route, store shape,
      news, backdrop, texts, catalog, translator notes, help, specs, tests); `grep -ri
      "rescue\|friend"` over `src`, `public/i18n`, `.specify`, `e2e` leaves only unrelated hits
      (companions, world reward scenes, "friendly").
- [ ] Compass range thing with texts and the code fallback; prompt in `PROMPTS.md`; generate
      the picture via `gemini-images` and run the asset pipeline (if Gemini is unavailable, keep
      the fallback and add a backlog line).
- [ ] Hero's journey: level defs and minimums, parts with travel cards, merged result with the
      stricter stars, end card, map node after the parrot with mini stars, pause/leave texts.
- [ ] Specs: new `heros-journey.md`, updated story/target-practice/others; sk and en texts.
- [ ] Tests: unit tests for journey minimums (twice a regular level, split per part) and the
      star thresholds; an idle test that every part keeps giving targets; e2e: a finished
      story's last world opens the journey node after the parrot, a quick play of the journey
      (use `?minActive=` short minimums) passes the travel card and ends on the end card with
      stars saved on the node; the compass appears among range things (unit).
- [ ] `npm run build`, `npx vitest run`, the affected e2e specs; a Playwright MCP play-through
      of the journey (tester profile, `?fast`), screenshots of the node, a travel card and the
      end card.
