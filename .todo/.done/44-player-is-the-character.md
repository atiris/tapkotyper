# 44 The player is the character: own name, nickname, slower and per-player unlocks

Starting point: the game TapkoTyper, the character renderer `src/gfx/tapko.ts`, i18n group
`tapko`, placeholder `{tapko}`, storage `tapkotyper:v1` at `STORE_VERSION = 1` with an empty
`migrations` record.

Affected: `src/storage/schema.ts`, `src/storage/store.ts` (+ tests), `src/game/rewards.ts`
(+ tests), `src/game/progress.ts`, `src/app/super.ts`, `src/screens/{new-profile,wardrobe,
parent,start,map,level,story,break,stats,help}.ts`, `src/game/{runtime,cards}.ts`,
`public/i18n/{sk,en}.json`, `e2e/`, `.specify/companion/`, `.specify/profiles/profiles.md`,
`.specify/game/story.md`, `.scenarios/full-playthrough.md`. Contracts: storage schema v1 -> v2
(one migration), export files and transfer codes carry the new `seed` field. Share links and
QR codes keep using the player's real name. No server, no DB.

## What
- Children do not see the animal as a friend but as **themselves**. The animal is "me", so:
  - The new player form asks: **pick your character** (the nine animals), **your name**
    (hint: shown to the teacher and in QR codes) and **your nickname** (hint: shown with your
    character in the game). Language and layout stay.
  - All game texts speak to the child in the **second person**; the character never talks
    about itself or about the child as someone else. No more "I am Tapko", "Tapko types for
    you", "Melody gives Tapko a wreath".
- **Slower character unlocks**: about one new animal per two worlds, and every player has a
  different order and different prices, set at random when the player is created.
- **Accessories per player**: which level, world or mastery step gives which accessory is
  also shuffled per player. The same name gives the same layout (siblings with different
  names get different ones; a recreated profile with the same name gets the same one).

## Why
- A child who plays "as" the fox wants the fox to carry their nickname, and texts that talk
  about the fox as another person break that.
- The real name is what a teacher needs on a scanned result; the nickname is play.
- Animals unlocked every 6 stars ran out within the first story; slower unlocks keep a
  reason to collect stars through all three stories.
- Different prices and accessories per player make siblings compare and talk about what
  they got, instead of all getting the same thing at the same level.

## Decisions
- **Data model**: `Profile.name` is the real name (QR codes, result links, teacher screen,
  parent screen, export file name, print sheet). `Companion.name` becomes the **nickname**
  (doc comment says so; field is not renamed). New `Profile.seed: number` (32-bit unsigned).
- **Nickname fallback**: empty nickname -> the player's name. One helper
  `nickname(p: Profile): string` in `src/storage/store.ts` (`p.companion.name.trim() ||
  p.name`). `DEFAULT_COMPANION_NAME` in `schema.ts` and every fallback to it are
  removed; `newProfile` sets `companion.name = ''`. Nickname max length 16 everywhere (form,
  wardrobe, parent screen; today the parent field allows 20).
- **Where which name shows**:
  - Nickname: everything the child sees in play (map hello and welcome, encouragement lines,
    break, story scenes, results, stats overlay, wardrobe, help placeholders).
  - Real name: parent screen (switcher, fields, delete confirm, tasks), teacher screen,
    result/QR captions (`bigCode`), export file name, transfer/import texts, print sheet.
  - Start screen tile: the character with the nickname large and, when it differs, the real
    name small under it (siblings recognize their own tile).
  - Print sheet signature: just `TapkoTyper` (no character name).
- **Seed**: `seed = fnv1a32(name.trim().normalize('NFC').toLocaleLowerCase())`, computed once
  in `newProfile` and stored; renaming later does **not** reshuffle anything. A small seeded
  PRNG (mulberry32) in `src/game/rewards.ts` (no new dependency). The guest gets the seed of
  its fixed name; the super player has everything unlocked anyway.
- **Character prices** (`rewards.ts`): the 8 kinds other than the starting kind
  (`companionsUnlocked[0]`) are shuffled by the seed; each next one costs a random step of
  **18-26 stars** (inclusive) on top of the previous one, all from the same seeded stream.
  So the last kind costs 144-208 of the 225 possible stars, roughly one animal per two
  worlds. Still counted by `totalStars` (best stars per level). `STARS_PER_FRIEND` and the
  fixed `FRIEND_ORDER` go away; `friendStars(p, kind)` and `grantCompanions(p)` keep their
  meaning on the new prices. Parent's kind picker still grants a kind directly.
- **Accessory layout** (`rewards.ts`): the rule positions stay as today (the `BY_LEVEL`,
  `BY_WORLD` and `BY_MASTERY` keys), but the accessories are dealt onto them by the seed.
  **Story-bound items stay fixed** because a scene names them: `flower-wreath`, `umbrella`,
  `raincoat`, `feather`, `harp`, `fairy-wings`. All other accessories are shuffled over the
  remaining positions. `unlockRules()` becomes `unlockRules(p)`; `grantAccessories` and the
  wardrobe "how to earn" text use it. The "never random" comment and spec line change to
  "random per player, fixed from the start, and the wardrobe shows how to earn each one".
- **Migration v1 -> v2** (key `1` in `migrations`, `STORE_VERSION = 2`, schema comment v2):
  add `seed` from the name hash; a nickname equal to the old default (`Ťapko` / `Tapko`)
  becomes `''`; unlocked kinds and accessories already earned stay. `normalizeProfile` fills
  a missing `seed` through `newProfile` (same hash). Export/import/transfer carry `seed`.
- **Second-person texts** (sk and en, all of `tapko.*`, `story.scenes.*`, `map.welcome`,
  `paw.*`, `results.*`, `surprise.*`, `teaser`, `help.*`, `wardrobe.*`, `newProfile.*`,
  `parent.*` labels about the character):
  - The voice is a friendly narrator speaking to the child ("you"). The speech bubble stays
    where it is; it is the narrator, not the animal.
  - Examples: welcome "Ahoj, {name}! Toto si ty." / "Hello {name}! This is you."; scene
    "Napíš slovo na liste a odfúkneš ho vejárom späť." / "Type the word on a leaf and fan it
    back."; reward "Melódia ti uviaže kvetinový venček." / "Melody weaves you a flower
    wreath."; paw "Labka napíše za teba {words} slová." / "Your paw types {words} words for
    you."; results "Túto úroveň zvládla hlavne labka." / "The paw did most of this level.";
    wardrobe title "Ja a môj šatník" / "Me and my wardrobe", name field "Prezývka" /
    "Nickname"; map character title "Klikni na seba a pozri, ako ti to ide." / "Click
    yourself to see how you are doing"; surprise "Mám pre teba tajomstvo:" -> "Tajomstvo:"
    / "A secret:" (narrator, no first person of the character).
  - **Slovak gender**: the child's gender is unknown, so second-person Slovak never uses a
    gendered past tense ("zvládol/zvládla", "bol si") or gendered adjectives about the child;
    use present or future tense, the paw/level as subject, or neutral wording. Read every
    changed Slovak sentence through for grammar.
  - The placeholder `{tapko}` disappears; where a name is still needed it is `{name}`, filled
    with `nickname(p)` (child-facing) or `p.name` (parent/teacher-facing).
  - Friends (baby dragon, Bolt, Melody) walk "next to you"; the hatched dragon "looks at
    you" (already second person).
- **Code**: identifiers stay (`tapkoElement`, `byTapko`, ...) except where a name now lies
  (the character-name inputs and variables in forms become `nick`). Comments that say the character
  speaks, helps "by himself" or is someone else are rewritten. Element ids: `np-nick`
  replaces the character-name input id; e2e tests follow.

## Steps
- [x] Schema + store: `seed`, nickname doc, `nickname()`, `newProfile` (`companion.name = ''`,
      seed), migration v1 -> v2 with tests, `normalizeProfile`, export/import tests.
- [x] Rewards: seeded PRNG, per-player kind prices (18-26 step), per-player accessory deal
      with the six fixed story items, `unlockRules(p)`; tests: same seed -> same prices and
      deal, two seeds differ, every accessory appears exactly once, fixed items in place,
      last kind <= 208 stars, starting kind costs 0. `progress.ts`, `super.ts` follow.
- [x] New player form: "pick your character" grid, name (QR hint), nickname (optional, max
      16, game hint), language, layout; `newProfile` gets the nickname.
- [x] Wardrobe and parent screen: nickname field (max 16), "how to earn" from
      `unlockRules(p)`, locked kinds show the per-player missing stars; parent screen labels
      say "nickname".
- [x] Name use per the table in Decisions across `start`, `map`, `level`, `story`, `break`,
      `stats`, `help`, `runtime`, `cards`, `parent` (print sheet signature).
- [x] i18n sk + en: second-person rewrite of every text about the character, `{tapko}`
      removed, `companion.defaultName` removed, Slovak gender rule checked line by line.
- [x] Specs: `.specify/companion/*` (the character is the player, nickname, per-player
      prices and accessory deal, story-fixed items), `.specify/profiles/profiles.md` (real
      name vs nickname, where each shows), `.specify/game/story.md` (narrator in second
      person); `.scenarios/full-playthrough.md` wording; `.specify/index.md` lines if they
      describe the character as a friend.
- [x] `npm run build`, `npm test`, `npx playwright test` pass.
- [x] Drive the app with the playwright MCP: create a player (fox, name "Ema", nickname
      "Rýchla líška"); map greets the nickname, start tile shows nickname + "Ema", the
      result QR caption shows "Ema"; wardrobe shows the per-player prices; create a second
      player "Ema" again -> same prices and accessory hints; player "Jano" -> different
      ones; play a level and read the texts in sk and en for second person; console clean.

## State
Decisions taken while implementing:
- The seeded PRNG is the existing mulberry32 `Rng` in `src/engine/rng.ts` (no new code);
  the accessory deal uses its own stream (`seed ^ 0x9e3779b9`) so it does not depend on
  the kind prices.
- `NICK_MAX` (16) lives in `store.ts` next to `nickname()`; the wardrobe accepts an empty
  nickname (placeholder shows the real name).
- Story titles lose "Tapko and": "Dračie vajíčko / The Dragon Egg", "Robot Šróbik / Bolt
  the Robot", "Víla Melódia / Melody the Fairy".
- Narrator first person ("ukážem", "prezradím", "sme trénovali") is gone from the changed
  groups and from `progress.last*`, `stats.*`, `freeType.*`; Slovak lines with a gendered
  past tense or adjective about the child that were touched were rewritten ("Keď si
  zaseknutý" -> "Keď to nejde", "si napísal" / "si získal" removed).
- Specs outside the listed files that said "Tapko says/asks/shows" now say "the narrator".
- The guest in session storage is not migrated (only normalized: seed filled); it is
  forgotten with the tab anyway.

## Done - 2026-10-22
Shipped: storage v2 with `seed` and a migration (old default name -> empty nickname),
`nickname()`, per-player character prices (18-26 stars a step) and accessory deal with the
six story items fixed, new player form (character, name, nickname), wardrobe and parent
nickname fields (max 16, may be empty), nickname vs real name across all screens (start tile
shows both), print card signed "TapkoTyper", second-person sk/en texts, specs and scenario.
Verified in the browser: "Ema" twice gets the same prices and accessory hints, "Jano"
others; map, welcome and intro greet the nickname; the QR caption shows "Ema"; sk and en
intro and meadow lines read in second person; console clean.
Left out: nothing.
