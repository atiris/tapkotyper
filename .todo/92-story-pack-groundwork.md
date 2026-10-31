# 92 - Groundwork for story packs

## Why

The long-term goal `.specify/game/story-packs.md` lets a parent import a story made by someone
else as data. Today the code assumes the built-in stories in a few places that a pack could not
pass through: per-story numbers are read by the story's position in `STORIES`, world names and
world stories are built from i18n keys in 21 places, neighbour levels are found by searching
`LEVELS`, the star total sums every key of `progress.levels`, music has no resolver of its own,
and two IndexedDB stores carry their own copy of the same helpers.

This plan makes only **safe refactors that keep today's behaviour exactly**, so the later pack plan
has single places to extend. It adds **no pack, no sample pack, no pack format, no zip reader, no new
profile field, no new UI and no new text**. Every change here is used by today's code: no hooks
without a caller, no dead code.

## Decisions

- **Behaviour is frozen.** Same level ids (`w1-1`..., `journey-dragon`), same values, same
  database names, versions and stores, same profile data. A test that changes its expected value
  is a bug in the step, not in the test.
- **Per-story numbers belong to the story.** `StoryDef` gets `tier: 0 | 1 | 2` (the story's
  difficulty step: dragon 0, robot 1, fairy 2). Everything that reads the story's place in
  `STORIES` for a number reads `tier` instead: `STORY_MIN_S`, `STORY_WPM` (`storyIndex` in
  `levels.ts` goes), `slipWords` (`copy-row.ts`, today `STORIES.indexOf(...) + 1`, becomes
  `tier + 1`), `parrotPatience` and `parrotSize` (`parrot.ts`, `parrotSizeOf`). Why: a pack story
  will pick the tier it starts from; the order of rows on the map must not decide difficulty.
- **World texts in one place.** Two helpers next to `WORLDS` in `levels.ts`:
  `worldName(world)` (`t(\`worlds.${WORLDS[world]}\`)`) and `worldStory(world)`
  (`t(\`story.world.${WORLDS[world]}\`)`); every `t(\`worlds.${...}\`)` /
  `t(\`story.world.${...}\`)` call in `src/` uses them (`rg "t\(\`worlds\.|t\(\`story\.world"`
  finds them; `chrome.ts` checks a track name, it uses `worldName(WORLDS.indexOf(track))` only
  when the track is a world). The i18n catalog and translator keep the keys unchanged. Why: a
  pack world's name and story will come from the pack, not from i18n.
- **Built-in levels through helpers.** `levelAt(world, index)` in `levels.ts`, used for the
  level before/after in `screens/level.ts` (`stayDef`, `nextDef`) and anywhere else that runs
  `LEVELS.find((l) => l.world === ... && l.index === ...)`; `levelById` wherever a level is
  searched by id (`map.ts`, `parent.ts`, `level.ts`); `wardrobe.ts:56` reads world and index from
  `levelById(r.id)` instead of parsing the id string. `LEVELS.indexOf(def) + 1` in `level.ts` stays
  (it is the built-in order and is correct for built-in levels). Why: pack levels will not be in
  `LEVELS`; one lookup is one place to extend.
- **Built-in totals are explicit.** `totalStars` (`rewards.ts`) sums only built-in story levels
  and the built-in stories' journeys (`LEVELS` ids and `journeyId(s)` of `STORIES`), not every key
  of `progress.levels`. Today the two are equal (only `completeLevel` writes there, for those ids;
  the super profile writes `LEVELS` ids), so companions, prices and every number shown stay the
  same. Why: the companion prices must never be bought with pack stars; this makes the wall exist
  before anything could cross it. `MAX_STARS`, `chestPoints`, badges, certificate and stats already
  iterate built-in lists and stay.
- **Music through a resolver.** `musicUrl(name): string | null` in `gfx/assets.ts`, like
  `imageUrl` (null when the manifest has no such track); `audio.ts` uses it instead of
  `hasMusic` + `assetUrl`. If `hasMusic` then has no other caller it goes. Why: a pack's music
  will be one more source behind the same resolver.
- **One IndexedDB helper.** `src/storage/idb.ts` with `done(req)` (the request as a promise),
  `openDb(idb, name, version, upgrade)` (null when IndexedDB is missing or blocked) and
  `askPersist()` (asks `navigator.storage.persist` once per visit). `share/teacher-db.ts` and
  `i18n/own-langs.ts` use it and lose their copies; `TEACHER_DB` / `TRANSLATE_DB`, versions,
  stores and upgrade bodies are unchanged, and the teacher's in-memory fallback and own-langs'
  `memory` map stay where they are. Why: the pack store will be the third database; a copy for
  it would be the third copy.
- **Not in this plan** (each belongs to the pack plan, which decides it with the pack format):
  a table of mode parameters and their limits (about 500 constants live in the modes, most of
  them layout; choosing which ones a pack may change is design work), a pack progress field in
  the profile, a story tag on session records, world ids instead of world indexes in
  `worldsDone` / `parrots` / surprise `worlds`, the zip reader, the import screen.

## Affected

- `src/game/levels.ts` (`StoryDef.tier`, `worldName`, `worldStory`, `levelAt`; `storyIndex`
  removed), `src/game/parrots.ts`, `src/game/modes/kit/copy-row.ts`, `src/game/modes/parrot.ts`,
  `src/game/rewards.ts`, `src/game/runtime.ts`, `src/screens/{level,map,parent,progress,stats,
  certificate,free-type,wardrobe}.ts`, `src/ui/{badge,badge-show,chrome,finds,hud,profile-card,
  service}.ts`, `src/gfx/assets.ts`, `src/audio/audio.ts`, `src/storage/idb.ts` (new),
  `src/share/teacher-db.ts`, `src/i18n/own-langs.ts`, their tests.
- Contracts: none outward (no link, file or i18n change). DB: none (same names, versions, stores).
- Specs: `.specify/architecture.md` gets one short section (step 7).

## Steps

- [ ] 1. `StoryDef.tier` and its readers (`STORY_MIN_S`, `STORY_WPM`, `slipWords`, `parrotPatience`,
      `parrotSize`); tests in `levels.test.ts` / `parrots.test.ts` that pin `minActiveS`,
      `minWords` and the parrot size of one level per story keep passing unchanged.
- [ ] 2. `worldName` / `worldStory`, all call sites moved; `rg` shows no template i18n key for
      worlds outside `levels.ts`.
- [ ] 3. `levelAt`, `levelById` at every by-id search, `wardrobe.ts` without id parsing.
- [ ] 4. `totalStars` over built-in ids; a unit test: a `progress.levels` entry with an unknown id
      (for example `pack:x:w1-1`) adds nothing to `totalStars` and buys no companion.
- [ ] 5. `musicUrl` and its use in `audio.ts`.
- [ ] 6. `storage/idb.ts`, both stores on it; a unit test of `openDb` with `fake-indexeddb`
      (creates stores on first open, null without IndexedDB); the existing teacher and
      own-language tests pass unchanged.
- [ ] 7. `.specify/architecture.md`: a short "Ready for story packs" section, WHAT and WHY: per-story
      numbers come from the story's tier, world names and stories from one helper, built-in totals
      from built-in lists only, pictures and music through one resolver each, the device's own
      databases through one helper; points to `game/story-packs.md`.
- [ ] 8. Check: `npm run build`, `npx vitest run`, `npx playwright test`. Playwright MCP as a user
      with the tester profile (`?fast`, `tapkoType`; never script the super password): the map
      shows the three stories and world names, a world's opening story appears on its first level,
      one level in the dragon story and one copy level in the robot story play to their end card,
      the parrot of a done world starts, music plays in a level (`hasMusic` world), the stats and
      wardrobe screens show the same numbers as before the plan (note them first), the parent
      screen's surprise level list lists every world, the translator still saves an own language
      after a reload, and the teacher screen keeps a scanned result after a reload. Console clean.
      Each step is its own commit; the plan moves to `.todo/.done/` in the last one.
