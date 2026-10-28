# The Dragon Valley: five new levels (world 4)

**Status:** proposal (2026-10-29), waits for the owner. **Prio:** P1. **Effort:** M-L, mostly
reused engines with new art.

## The problem
- World 4 today ([story.md](../../.specify/game/story.md), `src/game/modes/dragons.ts`) is four
  times the same game: space rocks fall onto baby dragons and a word makes a shield bubble.
  The owner does not want rocks falling on the dragons' heads at all: it is the one picture in
  the story where danger falls onto the creatures, and it is the rocket's game again.
- It does not play the world rhythm the first three worlds play (main game, calm step, harder
  main game with a surprise, twist, super-obstacle; [world-rhythm.md](world-rhythm.md)).
- The planet ends with the Force ("jemne pohybuješ vecami, len písaním") and "Dráčiky v
  susednom údolí potrebujú pomoc." The valley should be where the child uses the Force, and it
  must end with the dragon egg, which world 5 (Vajíčko) starts with.

## What the child knows here
The valley's levels need 16 to 18 keys (`STORIES[0].keys`): on the Slovak path the home row,
`g h e i r u`, and the world's new keys **`.`**, **`o`**, **`t`**. The period is new in this
world, so the valley is the first place for short sentences that end with a period (level 4).
The key ceiling (need + 5) may add `n , c v m`.

## Proposal: one day in the Dragon Valley
Like the meadow's afternoon, the valley is one day: morning fog, building nests, the flying
school in the fog, an evening lullaby and the dragon fire at night. A **dragon mother**
(Dračia mama), big, warm-coloured and kind, is the valley's figure; she never replaces the
child's character and never is a target. The baby dragons are never targets either: words sit
on fog, things and sparks, never on a creature (the meadow's rule).

The cause, tied to the planet: the valley's **dragon fire** (dračí oheň) in the cave under the
cliff was lit long ago from the crystal of life. When the crystal lost its light, the fire went
out, the valley grew cold and a thick **fog** settled in it. The planet blooms again, but the
light does not reach behind the mountains.

| Level | Role | Name (sk) | Activity | Engine to reuse |
|---|---|---|---|---|
| 1 | Main game | **Hmla** | word stream: fog puffs drift toward Tapko; a typed one is blown away by the Force | space stream (`space.ts`) |
| 2 | Calm step | **Hniezda** | waiting words + build: still things lie around, each typed one floats into the nest | poppies / waiting words (`meadow-calm.ts`) |
| 3 | Main game, harder | **Lietacia škola** | fog stream again, faster, babies learn to fly behind it; surprise: the mother's wings | as level 1 + a gust surprise (`meadow.ts` gust) |
| 4 | Twist | **Uspávanka** | copy: a lullaby line by line, short sentences with a period | copy row (`copy-row.ts`) |
| 5 | Super-obstacle | **Dračí oheň** | rhythm: short groups to the mother's heartbeat light the fire spark by spark | rhythm (`WaveMode`, `rhythm.ts`) |

### 1 Hmla (main game)
- Tapko stands at the valley's edge on the left; puffs of grey fog drift toward him from the
  right, each with a word; the fog's size shows the word length (the meadow's leaf rule).
- A typed puff: a soft glow of the Force pushes it up and away and it thins out. Behind it a
  bit of the valley clears: the far band gets brighter and more colourful through the level,
  so the child sees the whole valley come out of the fog.
- Now and then a cleared puff had a baby dragon hiding behind it, which waves and flies off
  toward the nests (decoration, not a target).
- A puff not typed in time wraps Tapko for a moment and he sneezes ("Hapčí!"); it falls apart
  and goes on. A laugh, not a failure, like the meadow's goal.
- End: the fog is gone from the valley's edge and Tapko sees the dragons' nests on the cliff.

### 2 Hniezda (calm step)
- The nests on the ledges fell apart in the cold. Around Tapko lie still things for a nest:
  moss, hay, a feather, a twig, a pine cone, a dry leaf; at most three at once, each word with
  another first letter (the waiting-words rule).
- A typed thing rises with the Force and floats into the nest in the middle, which grows in
  layers; a new thing appears elsewhere.
- End: the nest is soft and round, a baby dragon hops in and curls up; the line counts the
  things in the nest. About one minute, like every calm step.

### 3 Lietacia škola (main game, harder)
- The babies have their flying school above the valley, but fog keeps crawling up from the
  stream below and they cannot see. Same game as level 1, more and faster puffs; behind Tapko
  the babies fly clumsy loops, and every cleared puff lets one of them glide past.
- **Surprise** halfway (20-30 s): the dragon mother flies over and the wind of her wings
  brings the fog from both sides at once; she says so first. Then it calms down.
- End: the babies land in a heap, giggling; the sun sets.

### 4 Uspávanka (twist)
- Evening. The babies are in their nests but cold and cannot fall asleep. Tapko writes them a
  lullaby on a panel in the middle, line by line; each line is a short sentence that ends with
  a period, the world's new key. Copy rules of the invitation: a slip only counts.
- Each finished line: one baby closes its eyes, a star lights up in the darkening sky.
- Lines from the valley's keys, for example "Tu je tak tiho." "Sladko a tiho." "Hore hora,
  dole les." (the comma only with the ceiling keys). Lines are short at 16 keys and grow with
  the child's keys.
- End: all babies sleep, the sky is full of stars. The mother whispers that in the night it
  will be cold, the dragon fire must burn again.

### 5 Dračí oheň (super-obstacle)
- Night, the cave under the cliff: a big stone hearth, cold and dark, the mother beside it.
  Tapko puts one of his crystals from the planet's meadow into it (a callback to level 2 of
  the planet), and a tiny spark wakes.
- The mother's heartbeat (a soft glow and drum sound) gives a calm steady beat; short letter
  groups typed on the beat breathe on the spark. On the beat the fire grows a lot, off the beat
  less, never back (today's wave rule). The fire grows in steps: spark, embers, a small flame,
  a big fire; with each step the warm light reaches further out of the cave over the nests.
- End: the fire burns, the whole valley is warm and golden. In the warm ashes at the edge of the
  hearth lies an **egg** that waited all the time in the cold. It starts to glow and rocks
  toward Tapko. The mother: it chose you.

### Reward scene (replaces today's "egg" scene)
1. "Dračí oheň zase horí a celé údolie je teplé."
2. "V teplom popole leží vajíčko. Zažiari a kotúľa sa k tebe."
3. "Dračia mama sa usmeje: Vybralo si teba. Opatruj ho!"

World 5 then starts as it does now: "Ojoj! Vajíčko sa začína hýbať a kotúľa sa dolu kopcom."
The egg moving in the reward scene leads straight into it.

## Scenario in Slovak (for the get-ready cards)
- **World story (first card of level 1):** "Za horami leží Dračie údolie. Svetlo kryštálov
  sem ešte nedošlo: dračí oheň zhasol a údolie zahalila studená **hmla**. Silou ju
  **odfúkneš**: napíš slovo na obláčiku hmly, kým k tebe doletí."
- **1 Hmla:** "Hmla sa valí k tebe. Napíš slovo na obláčiku a Sila ho odfúkne."
- **2 Hniezda:** "Hniezda sa v zime rozpadli. Napíš slovo pri machu, sene či pierku a Sila
  ho prenesie do hniezda."
- **3 Lietacia škola:** "Dráčiky sa učia lietať, ale z potoka stúpa hmla. Odfúkni ju, nech
  vidia. Pozor, dračia mama priletí a jej krídla zamávajú hmlou z oboch strán!"
- **4 Uspávanka:** "Večer je dráčikom zima a nemôžu zaspať. Napíš im uspávanku riadok po
  riadku, každý končí **bodkou**."
- **5 Dračí oheň:** "V jaskyni je dračí oheň studený. Píš krátke skupinky **v rytme srdca**
  dračej mamy a z iskierky vyrastie veľký oheň."

## Why
- Nothing falls on anyone: fog, nest things and sparks are the targets, and the Force only
  moves things gently, as the planet's reward promised.
- Each level has its own reason in the day, and the five roles give the session its
  saw-tooth: up, down, higher, sideways, top.
- The period is new here, so the twist is the first sentence copy; the rhythm finale keeps
  the dragon world's super-obstacle idea (the wave) with a picture that belongs to dragons.
- The cause (the fire lit from the crystal of life) ties the valley to the planet, and the
  egg found in the warm hearth explains why the dragons give it to the child.
- Four of the five levels run on engines that exist; only the fog stream is a new dressing of
  the space stream, and the art is new (fog puffs, nest things, nests, mother, hearth).

## What it touches
- Specs: `game/story.md` (world 4 text, reward), `game/story-1-scenario.md` (Svet 4),
  `game/super-obstacles.md` (dragon fire instead of the energy wave).
- Code: `LEVELS` world 3 in `src/game/levels.ts` (new kinds instead of `shield`, `wave`
  reworked), `src/game/modes/dragons.ts`, `CALM_KINDS` and `activityOf`, i18n story lines and
  the `egg` scene in `public/i18n/*.json`. No profile change: level ids and stars stay.
- Art: fog puffs (3 sizes), nest things (6), a nest in 4 stages, the dragon mother, the hearth
  in 4 fire stages, the egg glowing, the valley far band (foggy and clear), prompts in
  `assets-src/PROMPTS.md`.

## Open questions for the owner
1. A name for the dragon mother (Dračia mama only, or a name like Žeravka)?
2. Should the fog thin out over the whole level 1 (one picture slowly clearing), or only puff
   by puff?
3. Is putting one of Tapko's meadow crystals into the fire fine, or does it clash with "the
   rocket needs them for the way home"?
