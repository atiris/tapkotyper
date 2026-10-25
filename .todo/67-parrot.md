# 67 - Parrot: a side card in every world that trains the same words until the fingers know them

Source: `.research/game/activities.md`, section "The parrot" and decisions 8 and 10 (owner,
2026-10-25). Pictures are ready: `ui-act-parrot` (card, a macaw), `ui-badge-parrot` (badge,
the macaw on a round branch) and `obj-parrot-flying` (the fly-away), all in `public/assets/`.

## What and why
- Every world gets a **parrot card** next to its target range card. The parrot round repeats a
  few words many times, so the fingers learn them (muscle memory). Speed is not judged; slow
  typing is fine, the point is the practice.
- A world's parrot counts as **won** once its round is finished. Won parrots can **fly away**
  over time, so the child comes back and practises again.
- The **Papagáj badge** (all parrots at home) is worth 7 points in the treasure chest and is
  the one badge shown next to the player's name.

## Affected
- Data: profile progress (`src/storage/schema.ts`), defaults in `newProfile`
  (`src/storage/store.ts`). No migration: the game is in alpha, missing fields get defaults.
- Game: new level kind `parrot` (`src/game/levels.ts`), new mode `src/game/modes/parrot.ts`,
  `src/game/modes.ts`, end screen in `src/screens/level.ts`.
- New pure logic `src/game/parrots.ts` (fly-away, badge) with tests.
- Rewards: `src/game/rewards.ts` (chest +7, `MAX_CHEST` 60 -> 67).
- Screens: map card node and narrator line (`src/screens/map.ts`), badge next to the name on
  the start page card (`src/ui/profile-card.ts`), under the character on "Môj postup"
  (`src/screens/stats.ts`) and on the map card (`src/screens/map.ts`).
- i18n sk/en + guide, help (`help.more`, `help.games`), styles.
- Specs: new `.specify/game/parrot.md` (+ `index.md`), `profiles/statistics.md` (chest 67),
  `experience/help.md`, `experience/visuals.md` (parrot card and badge).

## Decisions taken here
- **When it opens:** like the range, when the world is done (`worldsDone`). The card shows
  from then on: grey picture while the parrot is not won or flew away, full colour when won.
  It starts only when the child clicks it, never by "Pokračovať".
- **Badge:** held when every world in `worldsDone` has its parrot won (and at least one is).
  A new finished world without its parrot takes the badge away until that parrot is won; this
  follows the owner's "all parrots of the worlds I have".
- **Stored fields** in `progress`: `parrots: number[]` (worlds with the parrot won),
  `parrotBest: number` (highest count ever), `parrotWonAt: string | null` (ISO day of the last
  win), `parrotCheckedAt: string | null` (last day the fly-away was rolled), `parrotFlown:
  number[]` (worlds that flew away and are not yet told; cleared when the map shows the line).
  Defaults: empty lists, 0, null.
- **Fly-away** (`src/game/parrots.ts`, pure, takes the profile, today's ISO day and an rng):
  - floor = max(1, parrotBest - 3); nothing flies while count <= floor.
  - for each day after `parrotCheckedAt` up to today (first ever check: only today): 20 %
    chance one random won parrot flies away (not below the floor).
  - if today is 21 or more days after `parrotWonAt`: drop straight to the floor (random ones).
  - flown worlds go to `parrotFlown`; `parrotCheckedAt` = today.
  - Runs once when a profile opens its map (also after import). The super player (memory only)
    runs it too; that is harmless.
- **Winning:** finishing the round adds the world to `parrots` (if not there), updates
  `parrotBest`, sets `parrotWonAt` = today. Replaying a won parrot only refreshes `parrotWonAt`.
- **Round size** by story order s (1 dragon, 2 robot, 3 fairy) and the world's place w (1-5):

  | | s = 1 | s = 2 | s = 3 |
  |---|---|---|---|
  | words | 3 | 4 | 5 |
  | letters per word | w <= 2: 2-4, else 3-5 | w <= 2: 4-5, else 4-6 | w <= 2: 5-6, else 5-7 |
  | repeats per word (phase 2) | 3 | 4 | 5 |

  Words: the world's last level key set, through the normal word source with that length
  range, real words when the pool allows (drills in the meadow's tiny key set are fine), all
  different and with different first letters where possible; new words each play.
- **Round:** phase 1 (learning): the words in turn, 3 rounds (dom strom časy dom strom časy
  dom strom časy). Phase 2 (repeating): each word its number of times in a row. A wrong key
  adds 2 repetitions of the current word, at most +6 per word. One target at a time; the next
  one is shown greyed after it so the child sees what comes.
- **Scene:** the world's own background (as the range). Tapko left, the parrot (`ui-act-parrot`
  drawn as a sprite) on a perch at the right. The word to type is in a bubble between them; when
  it is typed, the parrot "repeats" it: a bubble from the parrot with the same word and a short
  squawk sound (the voice reads it only when reading aloud is on). Phase 2 starts with one
  line of Tapko ("Teraz každé slovo niekoľkokrát za sebou.").
- **No stars**, no rating of speed. The typing counts in statistics, the paw charge and keys
  as in the range. Super help works as everywhere (nothing can be missed).
- **End screen:** the parrot in colour, "Papagáj sa naučil tvoje slová!", the words learned,
  and, the first time the badge is reached, the badge picture with its line.
- **Map line when parrots flew away:** the narrator bubble on the map: "Uletel ti papagáj zo
  sveta {world}. Choď poň!" (several: "Uleteli ti papagáje zo svetov ..."). Shown once.
- **Fly-away animation** (on the map, once, together with the line): the flying parrot
  (`obj-parrot-flying`, a macaw with spread wings, side view) starts from the world card's
  parrot node, flaps up and away out of the window in about 2 s; the node turns grey as it
  leaves. When the badge is lost with it, the badge next to the name shrinks and fades at
  the same moment. With "less motion" on: no flight, the node and badge simply change.
- **Badge places:** a small badge picture (about 28 px, tooltip "Odznak Papagáj: všetky
  papagáje sú doma") right of the name on the start page's player card and on the map's
  hello title; on "Môj postup" just under the character. Nothing when the badge is not held.

## Steps
- [ ] 1. Data: new progress fields with defaults in `newProfile` (no migration).
- [ ] 2. `src/game/parrots.ts`: floor, daily rolls with catch-up, 21-day drop, win, badge;
      unit tests (13 missed days = 13 rolls, floor kept, last parrot stays, 21-day drop, badge
      lost when a world is added).
- [ ] 3. Level kind `parrot` and `parrotLevel(p, world)` like `aimLevel`, with the round size
      table; route `id: 'parrot'` in `src/screens/level.ts`.
- [ ] 4. `ParrotMode`: phases, +2 repeats per slip (cap 6), parrot repeat bubble and sound,
      progress bar, finished state; test the word plan (counts, repeats, cap) as pure code.
- [ ] 5. End screen and winning (step 2's win), no stars.
- [ ] 6. Map: parrot node after the range node (grey or colour picture, tooltip), fly-away run
      on map open, narrator line and the fly-away animation (badge fading when lost).
- [ ] 7. Badge: chest +7 (`MAX_CHEST` 67), badge picture on the start card, map title and
      "Môj postup".
- [ ] 8. i18n sk/en + guide (`parrot.*`, `map.parrotTip`, badge line, help lines in
      `help.more` and a `help.games` line for the parrot).
- [ ] 9. Specs: `.specify/game/parrot.md` (+ index), statistics (chest 67), help, visuals;
      research status in `.research/game/activities.md`.
- [ ] 10. Verify: build, unit tests, e2e touched specs; playwright: open a parrot from the map
      (super player), play a round with slips (super help 2 mistakes), see the card turn colour,
      the badge next to the name, and a fly-away (set `parrotCheckedAt` back in the store) with
      the map line.

## Out of scope
- The other activities (memory pairs, jumble, secret words rules, dictation word filter):
  later plans after the meadow playtest.
