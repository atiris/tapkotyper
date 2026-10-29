# The Dragon Valley: five new levels (world 4)

**Status:** proposal, reworked with the owner (2026-10-29). **Prio:** P1. **Effort:** M-L.

## The problem
- World 4 today ([story.md](../../.specify/game/story.md), `src/game/modes/dragons.ts`) is four
  times the same game: space rocks fall onto baby dragons and a word makes a shield bubble.
  The owner does not want rocks falling on the dragons' heads at all, and it is the rocket's
  game again.
- It does not play the world rhythm of the first three worlds
  ([world-rhythm.md](world-rhythm.md)).
- The planet ends with the Force and "Dráčiky v susednom údolí potrebujú pomoc."; world 5
  (Vajíčko) starts with the egg, so the valley must end with it.

## What the child knows here
The valley's levels need 16 to 18 keys (`STORIES[0].keys`): on the Slovak path the home row,
`g h e i r u` and the world's new keys **`.`**, **`o`**, **`t`**. The period is new here, so
the lullaby (level 4) is the first copy of short sentences that end with a period. The key
ceiling (need + 5) may add `n , c v m`.

## The story
The baby dragons' home is a big **fire pit** (dračie ohnisko) at the valley's entrance. Its
fire went out when the crystal of life lost its light, the little flames scattered over the
valley, the path into the valley grew over with branches and bushes, and the baby dragons,
cold and scared, hid deep in it. They have never learned to fly, and they need to: their place
is the **crystal meadow** (the planet's level 2), now glowing again, where the crystals give
dragons their warmth and strength.

Tapko lights the fire again (1), clears the path to the dragons (2), teaches them to fly home
to the fire (3), sings them to sleep by it (4), and in the morning helps them fly off to the
crystal meadow (5). Behind the burnt-out fire an egg stays behind: the reward and world 5.

The babies are never targets: words sit on flames, bushes and on the panel; a dragon's flight
only follows the child's typing.

| Level | Role | Name (sk) | Activity | Engine to reuse |
|---|---|---|---|---|
| 1 | Main game | **Ohníky** | word stream: flames fly toward Tapko, a typed one is caught in his torch | meadow leaves + gloves (`meadow.ts`) |
| 2 | Calm step | **Zarastená cesta** | growing copy: each bush has a spell, a slip grows two more branches | copy rules of the invitation (`copy-row.ts`) |
| 3 | Main game, harder | **Lietanie** | word stream with pace: a dragon flies over the bushes when the rhythm is kept | speedometer pace of the rocket (`space.ts`, `pace.ts`) |
| 4 | Twist | **Uspávanka** | copy: the lullaby line by line, sentences with a period | copy row (`copy-row.ts`) |
| 5 | Super-obstacle | **Odlet** | sets of words without a slip and in pace; a late word sends the dragon back | new, on the level 3 flight |

### 1 Ohníky (main game)
- Tapko stands on the left holding a **torch**; beside him, behind him, the **fire pit** lies
  cold (the dead embers). Little **flames** (three shapes, also mirrored) fly toward him from
  the right in soft arcs, each with a word; the flame's size shows the word length.
- Typing the word sends the flame faster toward the torch, which rises with it step by step
  and meets it, as the meadow's gloves meet the leaf: it is always caught. The torch burns
  brighter, dips to the fire pit, and the pit catches a bit more.
- The pit grows from the dead embers to the **burning embers**: three pictures that take
  turns as a flicker, and the fire grows (size, glow) with the flames caught.
- A flame not typed in time flies past the torch and **goes out** (the dead-flame picture, a
  little curl of smoke) and fades. Nothing else happens.
- End: the fire burns in the pit; Tapko says the dragons will see it from the valley.

### 2 Zarastená cesta (calm step)
- The path from the fire pit into the valley is overgrown. Bushes and branches (three or four
  kinds, each placed on its own, some mirrored) stand on the path one after another; the
  nearest one has its **spell** above it, the word that clears it.
- Typed without a slip: the bush shrinks away and Tapko walks on to the next one.
- A slip: the word turns red and fades and **two more branches grow** on the path (two more
  words). This happens at most **three times** in the level (the growing-copy ceiling of the
  dragon story: (1 + 1) x 3 = 6 extra words); after that a failed spell is only typed again.
- End: the path is open and the dragons peek out at its end.

### 3 Lietanie (main game, harder)
- Tapko comes to the dragons. To reach the crystal meadow they must fly, so they learn now:
  one by one a baby starts on the left, a few branches stand in the middle, and it should land
  on the right, by the fire.
- While a dragon flies its words come one after another; typed **in a steady enough pace** they
  keep it rising on a very slow, wide arc over the branches. The pace is measured against the
  child's own speed, like the rocket's speedometer, so a slow typist can fly too.
- When the pace drops too low, the dragon does not make it over: it lands in the branches and
  shouts one of "Júj, to šteklí!", "Šteklivé!", "Chrumkavé!", "Kríčky!", climbs out and walks
  on along the cleared path to the fire.
- Every dragon reaches the fire either way; the end counts **how many learned to fly**.
- Uses the existing baby dragon pictures and the level 2 bushes, no new art.

### 4 Uspávanka (twist)
- Evening. The babies circle above the fire and cannot fall asleep. Tapko writes a lullaby on
  a panel in the middle, line by line; each line is a short sentence ending with a period.
- A line copied right: one dragon glides down and falls asleep on the right near the fire
  (the existing sleeping-dragon picture). A line with a slip is written again; slips only
  count, as in the invitation.
- Lines from the valley's keys, for example "Tu je tak tiho." "Sladko a tiho." "Hore hora,
  dole les." (the comma only with ceiling keys). No new art.
- End: all babies sleep by the fire.

### 5 Odlet (super-obstacle)
- Morning. The babies wake up and want to fly to the crystal meadow. They start one by one
  from the **right, by the fire**, and fly to the **left**, where the meadow lies.
- A flight is **3 or 4 sets** of short words. A set typed without a slip and in pace lifts the
  dragon higher and further on its way. When a word is not typed in time (or a set has a
  slip), the dragon glides back to the fire and tries again, until it flies off.
- Every child must be able to finish: proposal - after the third return of the same dragon its
  next try asks for one set less and a slower pace (see open questions).
- When the last dragon is off, the **fire goes out**, and behind it, in the ashes, an **egg**
  shows up that the dragons left behind (the existing egg picture).

### Reward scene (replaces today's "egg" scene)
1. "Dráčiky odleteli na lúku kryštálov a oheň dohorel."
2. "V popole za ohniskom niečo svieti... je to dračie vajíčko!"
3. "Dráčiky ho tu nechali. Teraz ho opatruješ ty."

World 5 starts as now: "Ojoj! Vajíčko sa začína hýbať a kotúľa sa dolu kopcom."

## Scenario in Slovak (for the get-ready cards)
- **World story (first card of level 1):** "V Dračom údolí **zhasol oheň** a dráčiky sa
  rozutekali. Malé **ohníky** poletujú po údolí. **Napíš slovo** na ohníku a chytíš ho do
  fakle; z nich sa rozhorí oheň v ohnisku."
- **1 Ohníky:** "Chytaj ohníky do fakle, nech oheň v ohnisku znova horí."
- **2 Zarastená cesta:** "Cesta k dráčikom je zarastená. Každý krík zmizne, keď napíšeš jeho
  **kúzlo bez chyby**. Pri chybe vyrastú dva nové konáre."
- **3 Lietanie:** "Dráčiky sa musia naučiť lietať. Píš **pekne v rytme**, nech preletia ponad
  kríky k ohnisku."
- **4 Uspávanka:** "Dráčiky krúžia a nemôžu zaspať. Opíš im uspávanku, každý riadok končí
  **bodkou**."
- **5 Odlet:** "Ráno chcú dráčiky odletieť na lúku kryštálov. Každý potrebuje niekoľko skupín
  slov **bez chyby a v rytme**, inak sa vráti a skúsi to znova."

## Why
- Nothing falls on anyone: the targets are flames and bushes, and a dragon that does not make
  it lands in the branches with a giggle and walks on.
- Each level has its reason in the story, the levels build on each other (the fire is the
  dragons' home, the cleared path is where non-flyers walk, the flight learnt in level 3 is
  tested in level 5), and the crystal meadow ties the valley to the planet.
- The period is new in this world, so the twist is the first sentence copy.
- Fog is hard to draw; flames, a torch, a fire pit and bushes are clear single sprites.
- Level 3 counts flyers instead of failing, and level 5 asks for clean sets in pace, the
  skill the dragon story ends on, but nobody is left behind.

## What it touches
- Specs: `game/story.md` (world 4 text, reward), `game/story-1-scenario.md` (Svet 4),
  `game/super-obstacles.md` (the flight instead of the energy wave).
- Code: `LEVELS` world 3 in `src/game/levels.ts` (new kinds instead of `shield` and `wave`),
  `src/game/modes/dragons.ts`, `CALM_KINDS` and `activityOf`, i18n story lines and the `egg`
  scene in `public/i18n/*.json`. No profile change: level ids and stars stay.
- Art (prompts in `assets-src/PROMPTS.md` section 4, Dragons): `obj-flame-1..3`,
  `obj-flame-out`, `obj-torch`, `obj-firepit`, `obj-firepit-burning-1..3`, `obj-bush-1..4`.
  `obj-rock-falling-*` goes when the levels are built. Reused: `obj-dragon-baby-1..3`,
  `obj-dragon-sleeping`, `obj-egg`, the `bg-dragons-*` bands.

## Open questions for the owner
1. Level 5 safety: is "after the third return one set less and a slower pace" fine, or should
   the dragon simply keep trying?
2. How many dragons per level 3 and level 5 (three, one per picture, or five with repeated
   colours)?
3. Should the torch flame grow visibly in level 1, or only the fire pit?
