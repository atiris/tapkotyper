# 62 - The target range talks: throw calls, hit lines and new things to throw

## Why
The range is a game about accuracy, but a hit says only "Do stredu!" or a sound, so a child does
not feel how good a throw was, and seven things to throw get old fast. The owner wants:
- the target always to say something when it is hit, by accuracy: a clean throw sounds like a
  bullseye ("Zásah do čierneho!", "100 bodov"), one wrong key like a near miss ("Tesne vedľa
  stredu", 85-95 points), two like a decent hit ("Dobrá trefa", 75-85 points);
- every thing thrown to have its own funny lines, said by the target on a bullseye ("100
  percentný kečup!" for a tomato, "Ešte 5 minút!" for an alarm clock);
- Tapko to say what it throws the moment the launch word fires it ("Mucha vpred!"), so the
  child learns what flies only then;
- now and then the target to react while something is on its way: worry, wonder, joy or a
  cheer (rarely, at the throw or at the first or second ring);
- many new things to throw, some with their own little story (an egg that splats or hatches,
  a boomerang that comes back), and three more in story 2 and three more in story 3;
- every world to have one thing of its own that no other world's range throws, so a child
  wants to play the range in other worlds too.

The catalogue at the end holds every thing and every line in Slovak and English. **The owner
reviews it before the plan runs**; whatever is in the catalogue when the plan runs is what
ships. English lines are written for English speakers (their own jokes and words), not
translated word by word.

## Affected
- `src/game/modes/aim.ts` (throws, hits, misses, falls, marks, drawing), a new
  `src/game/modes/aim-things.ts` (the table of things: id, pictures, story, sound, effect).
- `src/game/runtime.ts` (a speech bubble for the target and for Tapko next to the existing
  `shout`; the screen-reader line `saidEl`), `src/gfx/draw.ts` (drawing a speech bubble).
- `src/audio/audio.ts`: new synthesized sounds `ring` (alarm clock), `whistle`, `crack` (egg),
  `thud` (bowling ball).
- `public/i18n/sk.json`, `public/i18n/en.json`: `aim.things.<id>.*` and `aim.lines.*`; the old
  `aim.center` and `aim.hit.*` move into them.
- Pictures: new `assets-src/obj-aim-*.jpg` (list below) through the gemini-images skill,
  `public/assets/*.webp` + `manifest.json`, rows in `assets-src/PROMPTS.md`.
- Specs: `.specify/game/target-practice.md`.
- Tests: `src/game/modes/aim.test.ts`, a new `src/game/modes/aim-things.test.ts`,
  `e2e/play.spec.ts` (or the range's existing e2e test).
- Storage: `Progress.rangeFinds: string[]` (the world things already hit in the middle) in
  `src/storage/schema.ts`; `src/storage/store.ts`: `STORE_VERSION` 5 -> 6, a migration that
  gives every profile `rangeFinds: []`, `newProfile`; a unit test of the migration. Profile
  export files and the mentors' import carry it like the rest of `progress`.
- The range's end card: the world things' collection row.

## Decisions (taken; nobody to ask)

### Who says what, and where
- **Tapko's throw call** ("Mucha vpred!"): always, the moment the launch word is typed. A
  small speech bubble above Tapko for 1.6 s (longer for a long line, at most 2.4 s).
- **The impact sound** ("Pľac!", "Crrrn!"): the existing big yellow `shout` at the target, on
  every hit; it is the thing's `sound` (one of its list). Replaces today's `aim.hit.*`.
- **The target's line**: a speech bubble with a tail pointing at the target. It sits
  left of the target, below the flight path (the band between the last ring and the target,
  about 62-80 % of the scene height), so it never covers a word label, a ring or the target's
  word. It stays `max(1.6 s, 0.06 s per character)`, at most 3 s, and is gone before the next
  throw's launch word appears. One target line at a time; a new one replaces an old one.
- Font: the game font, about 30 px in scene units, at most two lines, wrapped by width; a
  light plate with dark text in both looks (the play field keeps its daylight pictures, like
  the word labels). Reduced motion: no pop-in, no wobble.
- Every bubble's text also goes to the level's screen-reader line (`saidEl`). The voice
  (read aloud) never reads them: it reads targets only.
- Slovak lines Tapko says use no past tense, so they suit every companion (no "hodil/hodila").
  The target ("terč") is masculine and may say "Nič som necítil".

### Which line the target says
- **Hit, no wrong key (bullseye)**: the thing's own `hit` line 70 % of the time, a line from
  `lines.center` 30 % (and always `lines.center` for a thing with no `hit` lines).
- **Hit, one wrong key**: `lines.one`; a line with `{n}` gets a whole number from 85 to 95.
- **Hit, two wrong keys**: `lines.two`; `{n}` from 75 to 85.
- **Miss** (a word came too late, the thing flies past): `lines.miss`; the "Vedľa!" shout stays.
- **Fall** (three wrong keys, "Plop!"): `lines.fall`, always kind; the "Plop!" shout stays.
- **Before the hit** (`expect`): at most once a throw, with 25 % chance; at one moment picked at
  random: 1 s after the throw call, or when the thing passes ring 1 or ring 2. The thing's own
  `expect` lines when it has them (its chance is then the one in the catalogue, e.g. cactus
  60 %), else `lines.expect`.
- **Streaks**: the third bullseye in a row adds `lines.streak3` instead of the usual line, the
  fifth `lines.streak5`.
- **A trained letter gets ready** (the target shrinks, as if it stepped back): `lines.shrink`
  from the target, besides
  the narrator's existing line.
- **The last throw** of the two minutes (not while staying): the target says `lines.last` when
  its launch word appears.
- No line comes twice in a row from the same list (a shuffled bag per list, from the level's
  seeded `rng`, so tests can repeat a run).

### What is thrown
- A throw picks a thing at random from the things open in this world: the story 1 set
  everywhere, the story 2 things in story 2 worlds, the story 3 things in story 3 worlds
  (`storyOf(world)`), never the same thing twice in a row.
- A thing joins the pool only when its picture is loaded (`imageUrl`). The seven old things
  keep their drawn fallbacks; new things have no fallback drawing.
- A thing may use several pictures (planets 1-5, the three butterflies, two clouds, two
  notes): one is picked per throw.
- The thing in Tapko's paw before the throw is drawn as today; its name comes with the call.

### World things
- Every world has one thing of its own (catalogue: "World things"), thrown only at that world's
  range. The first throw of every run is the world's thing; after that it comes in about one
  throw of five (never twice in a row), the rest from the story pool.
- **Collection**: hitting a world thing in the middle for the first time adds it to the
  profile's `rangeFinds`, and Tapko cheers with `collection.new`. The range's end card shows a
  row of all 15 world things: the found ones in color, the rest as grey silhouettes with a
  question mark, and `collection.count` ("Zbierka: 4 z 15"). A silhouette's tooltip names the
  world where it waits (`collection.waiting`), never the thing. Super Tapko's finds are not
  saved (it lives in memory only).

### Effects (code, small; a thing without one bounces off as today)
- **egg**: on any hit one of three endings: 50 % it splats (the fried egg picture stays on the
  target like the tomato's splat; line from `splat`); 25 % it hatches on the target (crack
  sound, the chick sits on the board's top edge, then hops down and runs out of the scene;
  line from `hatch`); 25 % it hatches in flight when it passes ring 2 (the cracked egg picture
  for 0.3 s, then the chick flaps on along the same path; Tapko shouts `hatchedCall`; the
  target says a line from `hatchFlight`). On a bullseye the ending's line stands for the
  egg's `hit` line (same 70/30 rule); an off-center egg always splats and the target says the
  tier line (`one` or `two`).
- **boomerang**: after the hit it flies back along the arc to Tapko's paw; Tapko shouts one of
  `caught`.
- **butterfly**: it does not bounce; it flutters up and away. **frog**: it hops down to the
  ground and off to the right. **chick**: as the egg.
- **light bulb**: on the target it switches to the lit picture with a soft glow for 1.5 s.
- **alarm clock**: it sticks for 1.2 s and shakes with the `ring` sound.
- **ice cube**: it slides down and leaves a small fading puddle under the target.
- **cloud**: it bursts into a puff and a few raindrops.
- **planet** and **bowling ball**: the target wobbles; three little stars circle over it for
  1.5 s (planet) or brown splinters fly (bowling ball, `thud`).
- **toilet paper**: a short paper ribbon trails behind it in flight.
- Particle-only touches: cheese (green stink waves), candle (smoke puff), chalk (white dust),
  battery (yellow sparks), wand (sparkles, the target flashes pastel), pillow (feathers),
  water balloon (splash), teeth (chatter on the target for 1 s), spider (hangs on a thread
  and dangles for 1.5 s), ping-pong ball (bounces off three times, smaller each time).
- Sounds: the existing `pop`, `plop`, `squeak`, `bzzt`, `note`, `whoosh` where they fit; new
  `ring`, `whistle`, `crack`, `thud`.

### The target's eyes
- Two cartoon eyes drawn in code that **pop up only now and then**: most of the time the
  target has no face. They peek out over its top rim (a short pop with a bounce) in a random
  share of the moments that fit them, stay about 2 s and sink back:
  - with an `expect` line, 40 % of the time: worried for a worry line (and for the cactus,
    bowling ball, diaper and spider), wide for a wonder line, happy for a cheer or the donut;
  - at a hit by the planet or the bowling ball, 30 %: they spin, dizzy;
  - at a bullseye, 15 %: they squeeze shut at the impact, then smile.
  At most once a throw, never two throws in a row. While up they follow the thing in flight
  and blink once. With reduced motion they appear and go without a bounce and do not spin.
  The speech bubble's tail always points at the target, eyes or not.

### Pictures to generate (gemini-images skill, section 4 prompt of `assets-src/PROMPTS.md`)
Each is a single object, side view facing right unless said, readable at about 46 px. BG
magenta unless said green.

| File | OBJECT | BG |
|---|---|---|
| `obj-aim-egg.jpg` | a smooth white-cream hen's egg, slightly tilted, no face | magenta |
| `obj-aim-egg-cracked.jpg` | the same egg with a zigzag crack around the middle and a tiny orange beak peeking out | magenta |
| `obj-aim-chick.jpg` | a tiny round fluffy yellow chick flapping its little wings, big eyes, happy | magenta |
| `obj-aim-fried-egg.jpg` | a fried egg seen from above, white wavy edge, one round yellow yolk | magenta |
| `obj-aim-clock.jpg` | a red twin-bell alarm clock with two bells on top, a hammer between them and two little feet, white dial, no face | magenta |
| `obj-aim-cactus.jpg` | a small round green cactus with soft pale spines and one pink flower, in a little terracotta pot, no face | magenta |
| `obj-aim-toilet-paper.jpg` | a single soft white roll of toilet paper with a short loose end | magenta |
| `obj-aim-candle.jpg` | a short thick pastel-yellow candle with a small warm flame and one wax drip | magenta |
| `obj-aim-cheese.jpg` | a yellow wedge of cheese with round holes | magenta |
| `obj-aim-boomerang.jpg` | a wooden boomerang painted with small dots, flat | magenta |
| `obj-aim-ice.jpg` | one clear light-blue ice cube with rounded corners and soft highlights | magenta |
| `obj-aim-donut.jpg` | a round donut with pink frosting and colorful sprinkles, front view | magenta |
| `obj-aim-bulb.jpg` | a classic light bulb, switched off, clear glass, grey screw base | magenta |
| `obj-aim-bulb-lit.jpg` | the same light bulb switched on, a warm yellow glow inside | magenta |
| `obj-aim-teeth.jpg` | a wind-up toy of chattering teeth: white teeth, pink gums, a small key on the side, two little orange feet | magenta |
| `obj-aim-diaper.jpg` | a clean folded white baby diaper with a pattern of tiny pastel stars | magenta |
| `obj-aim-snack.jpg` | an old squashed sandwich in crumpled paper, one bite missing, a small green spot of mould | magenta |
| `obj-aim-bottle.jpg` | a baby bottle with milk, a light-blue cap and teat | magenta |
| `obj-aim-pacifier.jpg` | a baby pacifier with a round pastel-pink shield and a ring handle | green |
| `obj-aim-chalk.jpg` | one stick of white chalk, worn at one end, a little dust | magenta |
| `obj-aim-whistle.jpg` | a shiny silver sports whistle on a short red cord | magenta |
| `obj-aim-pingpong.jpg` | a single white ping-pong ball | magenta |
| `obj-aim-bowling.jpg` | a glossy dark-blue bowling ball with three finger holes | magenta |
| `obj-aim-hockey.jpg` | a wooden ice hockey stick with black tape on the blade, lying diagonally | magenta |
| `obj-aim-magnet.jpg` | a red and silver horseshoe magnet standing upright, no chain | green |
| `obj-aim-wand.jpg` | a fairy wand with a golden star on top and a few sparkles | magenta |
| `obj-aim-pillow.jpg` | a soft white pillow with a light-blue stripe | magenta |
| `obj-aim-chicken.jpg` | a yellow rubber chicken toy with a long neck, an open orange beak and a red comb | magenta |
| `obj-aim-water-balloon.jpg` | a round blue balloon filled with water, a small knot on top, a few drops | magenta |
| `obj-aim-banana.jpg` | one ripe yellow banana | magenta |
| `obj-aim-chili.jpg` | one small red chili pepper with a green stem, slightly curved | green |
| `obj-aim-wrench.jpg` | a chunky silver adjustable wrench, lying diagonally | magenta |
| `obj-aim-toast.jpg` | a slice of golden toast with a pat of butter on top, front view | magenta |
| `obj-aim-pinecone.jpg` | one brown pine cone with open scales | magenta |
| `obj-aim-fish.jpg` | a small round friendly orange fish, side view facing right, happy | magenta |

Reused pictures (no new art): `obj-planet-1`..`5`, `obj-butterfly`, `-2`, `-3`, `obj-spider`,
`obj-battery`, `obj-gear`, `obj-note1`, `obj-note2`, `obj-frog`, `ui-start-cloud-1`, `-2`, and
for world things `obj-ladybug`, `obj-rocket`, `obj-asteroid-small`, `obj-nest`, `obj-spring`,
`obj-umbrella`, `obj-robot-small-3`, `obj-flower-open`, `obj-bird` and the wardrobe's
`acc-crown` (if it reads well at 46 px; else a new `obj-aim-crown.jpg` - it did not, the new one is used, "a small golden crown
with three points and pink gems", magenta).
If a picture cannot be generated in the run, its thing stays out of the pool (it has no
picture) and a backlog line names the missing pictures; everything else ships.

## Steps
- [x] 1. Spec: rewrite the range part of `.specify/game/target-practice.md` (the calls, the
  target's lines and their tiers, the things per story, the effects, the eyes).
- [x] 2. i18n: the catalogue below into `aim.things.<id>` (`name`, `launch[]`, `sound[]`,
  `hit[]`, optional `expect[]`, and the special lists) and `aim.lines.*`, Slovak and English;
  `aim.center` and `aim.hit.*` removed. A unit test checks both languages have every list of
  every thing and that no list is empty.
- [x] 3. `aim-things.ts`: the table (id, pictures, story, sound effect, effect kind, expect
  chance); the pool per world (story gating, picture loaded, no repeat).
- [x] 4. Speech bubbles (`runtime.ts`, `draw.ts`): Tapko's and the target's bubble, their
  placement and timing, screen-reader mirror; the line choice by tier, points, miss, fall,
  expect, streaks, shrink, last throw; shuffled bags. Unit tests for the tier choice and the
  point ranges.
- [x] 5. Effects and the new sounds.
- [x] 6. The target's eyes (popping up only now and then, as decided above).
- [x] 6b. World things and the collection: the pool rule, `rangeFinds` with its migration,
  the end card's row and its tooltips; unit tests: a world thing never comes outside its
  world, the first throw is the world's thing, the migration.
- [x] 7. Pictures: generate, cut (`npm run assets obj-aim-`), check each at play size on a
  light and a dark world, rows in `PROMPTS.md` with their status.
- [x] 8. e2e: a range run shows Tapko's call after the launch word, the target's line after a
  hit, and no bubble ever overlaps a word label (checked every frame of one throw at
  1024x600, 1366x768 and 1920x1080).
- [x] 9. Quality loop: play the range with Super Tapko in a world of each story at those
  sizes, in both looks and with reduced motion; every thing thrown at least once (a debug
  seed or a test hook that picks the thing); fix what reads badly or overlaps; build, unit,
  e2e green.

## Catalogue (owner reviews this)

Legend: **Call** = Tapko at the throw. **Sound** = the big impact word. **Hit** = the target on
a bullseye. **Before** = the target while it flies (only some things; chance in brackets).
Lines are separated by " · ".

### Lines for every thing (`aim.lines`)

**center** (no wrong key)
- SK: Zásah do čierneho! · 100 bodov! · Úplný stred! · Presná trefa! · Rovno do stredu! · Ani o milimeter vedľa! · Desiatka! · Majstrovský zásah!
- EN: Bullseye! · 100 points! · Dead center! · Perfect shot! · Spot on! · Not a hair off! · A perfect ten! · Right on the money!

**one** (one wrong key; {n} = 85-95)
- SK: Tesne vedľa stredu! · {n} bodov! · Chýbal len kúsok! · Takmer v strede! · Za vlások! · Skoro dokonalé!
- EN: Just off the middle! · {n} points! · So close! · Nearly dead center! · Missed it by a whisker! · Almost perfect!

**two** (two wrong keys; {n} = 75-85)
- SK: {n} bodov! · Dobrá trefa! · Slušný zásah! · Je to tam! · Pekne! · Na terči!
- EN: {n} points! · Good shot! · Nice hit! · That counts! · On the board! · Not bad at all!

**miss** (a word came too late, it flies past)
- SK: Fíha, preletelo to! · Tesne nad hlavou! · Uf, vedľa. · Nabudúce to vyjde! · Skoro!
- EN: Whoosh, right over me! · Just over my head! · Phew, missed! · Next one's yours! · Nearly!

**fall** (three wrong keys, it drops)
- SK: Nevadí, ďalší! · To nič, skús znova. · Počkám na ďalší! · Hups, spadlo to.
- EN: No worries, next one! · It's fine, try again. · I'll wait for the next one! · Oops, it dropped.

**expect** (before the hit, 25 %)
- worry - SK: Čo to letí?! · Len nie paradajku! · Mamííí! · Hádam to nebude bolieť.
  EN: What's that coming?! · Not a tomato, please! · Help! · I hope this won't hurt.
- wonder - SK: Hm, čo to bude? · Je to vták? Lietadlo? · Zaujímavé…
  EN: Hmm, what could it be? · Is it a bird? A plane? · Interesting…
- cheer - SK: Som pripravený! · Len do mňa! · Do toho! · Mier presne! · Ukáž, čo vieš!
  EN: Ready when you are! · Give it your best! · Go on! · Aim true! · Show me what you've got!

**streak3** - SK: Hetrik! · Tri do stredu za sebou! - EN: Hat trick! · Three bullseyes in a row!
**streak5** - SK: Päť do stredu! Ostrostrelecká séria! · Neuveriteľné, päť za sebou! - EN: Five in a row! Sharpshooter streak! · Unbelievable, five straight!
**shrink** (the smaller target stands farther away) - SK: Idem ďalej, strieľaš veľmi presne! · Musím cúvnuť, príliš dobre triafaš! · Odchádzam preč, mieriš veľmi presne! · Zmenšujem sa, lebo píšeš presnejšie! - EN: I'm moving back, your aim is too good! · Better step back, you hit way too well! · I'm out of here, you're too accurate! · I'm shrinking because your aim keeps getting better!
**last** - SK: Posledná šanca! · Viac si neprosím! · Ešte toto a idem domov! · Toto je posledná vec, čo zvládnem! - EN: Last chance! · That's all I can take! · Just this one, then I'm going home! · This is the last thing I can handle!

> Note: "si veľmi presný" became "mieriš veľmi presne" so it suits a girl too.

### Story 1 (every world)

**1. Kamienok / Pebble** (existing picture)
- Call - SK: Kamienok, leť! · Hádžem kamienok! · Letí kamienok! · Malý, ale šikovný! - EN: Pebble, go! · One pebble, coming up! · Here comes a pebble! · Small but mighty!
- Sound - SK: Ťuk! - EN: Tock!
- Hit - SK: Kamienok v strede! · Ťuk-ťuk, kto je tam? · Malý kameň, veľká presnosť! · Ešte že to nie je balvan. - EN: Pebble in the middle! · Knock knock! Who's there? · Little stone, big aim! · Good thing it's not a boulder.

**2. Skrutka / Screw** (existing)
- Call - SK: Skrutka letí! · Hádžem skrutku! · Zatoč to! - EN: Screw away! · Sending a screw! · Give it a twist!
- Sound - SK: Cink! - EN: Clink!
- Hit - SK: Zaskrutkované! · Drží to pevne! · Kto mi tu vŕta? · Konečne mi nechýba skrutka! - EN: Screwed in tight! · That's holding firm! · Who's drilling here? · Now I've got a screw loose!

**3. Mucha / Fly** (existing)
- Call - SK: Mucha vpred! · Hádžem muchu! · Mucha! · Letí mucha! · Chyť mušku! - EN: Fly, forward! · Fly incoming! · Catch the fly! · Buzz off!
- Sound - SK: Bzzz! - EN: Bzzz!
- Hit - SK: Čo som, mucholapka? · Brrr, hmyz! · Bzučí mi v uchu! · Nelez mi po nose! - EN: What am I, flypaper? · Ew, bugs! · There's a buzz in my ear! · Hey, get off my nose!

**4. Paradajka / Tomato** (existing; splats)
- Call - SK: Paradajka letí! · Hádžem paradajku! · Pozor, paradajka! · Červená strela! - EN: Tomato away! · Incoming tomato! · Look out, tomato! · Red rocket!
- Sound - SK: Pľac! - EN: Splat!
- Hit - SK: 100-percentný kečup! · Kečup! · Tak toto je omáčka! · Som pizza? - EN: 100% ketchup! · Ketchup! · Now that's saucy! · Am I a pizza now?

**5. Šíp / Arrow** (existing)
- Call - SK: Šíp, leť! · Ako Robin Hood! · Strieľam! - EN: Arrow, fly! · Robin Hood style! · Loose!
- Sound - SK: Fuk! - EN: Thunk!
- Hit - SK: Robin Hood by sa tešil! · Presne tam, kde má byť! · Šíp v desiatke! · Pravý lukostrelec! - EN: Robin Hood would be proud! · Right where it belongs! · Arrow in the gold! · A true archer!

**6. Gumená kačička / Rubber duck** (existing)
- Call - SK: Kačička, leť! · Hádžem kačičku! · Kvak, do vzduchu! - EN: Fly, little duck! · Duck away! · Up, up and a-quack!
- Sound - SK: Pííp! - EN: Squeak!
- Hit - SK: Kvak kvak! · Ideme sa kúpať? · Kde je moja vaňa? · Kačka v strede! - EN: Quack quack! · Bath time already? · Where's my bathtub? · Duck, duck, bullseye!

**7. Ponožka / Sock** (existing)
- Call - SK: Ponožka letí! · Hádžem ponožku! · Pozor, ponožka! · Voňavka letí! - EN: Sock away! · Incoming sock! · Smell ya later!
- Sound - SK: Plesk! - EN: Flop!
- Hit - SK: Fuj, smrdí! · Druhá zostala v práčke? · Kto ju nosil týždeň? · Kde je jej dvojička? - EN: Ew, it stinks! · Where's the other one? · Did the washing machine eat its twin? · Who wore this for a week?

**8. Planéta / Planet** (reuses `obj-planet-1..5`; the target wobbles, stars circle)
- Call - SK: Planéta letí! · Hádžem planétu! · Do vesmíru a späť! · Veľký tresk! - EN: Planet away! · Throwing a whole planet! · To space and back! · Big Bang incoming!
- Sound - SK: Bum! - EN: Boom!
- Hit - SK: Trafila ma planéta! · Vidím hviezdičky! · Gravitácia funguje! · Som teraz mesiac? - EN: I got hit by a planet! · I'm seeing stars! · Gravity works! · Am I a moon now?

**9. Vajíčko / Egg** (new pictures: egg, cracked egg, chick, fried egg; three endings)
- Call - SK: Vajíčko, opatrne! · Hádžem vajíčko! · Letí vajce! · Len ho nerozbi! - EN: Careful, egg! · Egg away! · Here goes an egg! · Don't crack it!
- Splat (50 %): Sound - SK: Čľap! - EN: Splosh! · Line - SK: Praženica! · Volské oko! · Raňajky sú hotové! - EN: Scrambled! · Sunny side up! · Breakfast is served!
- Hatches on the target (25 %): Sound - SK: Krak! - EN: Crack! · Line - SK: Aha, kuriatko! · Píp! Ty si moja mama? · Pozor, mláďatko! - EN: Look, a chick! · Peep! Are you my mom? · Careful, baby on board!
- Hatches in flight (25 %): Tapko - SK: Vyliahlo sa! · Ono letí samo! - EN: It hatched! · It's flying by itself! · Target - SK: Kuriatko priletelo samo! · Píp-píp, prvý let! - EN: The chick flew here all by itself! · Peep peep, first flight!

**10. Budík / Alarm clock** (new; shakes and rings)
- Call - SK: Budík letí! · Hádžem budík! · Čas vstávať! · Tik-tak, leť! - EN: Alarm clock away! · Wake-up call! · Tick-tock, off you go!
- Sound - SK: Crrrn! - EN: Brrring!
- Hit - SK: Ešte 5 minút! · Už je ránko? · Vstávať a cvičiť! · Dnes nejdem do školy! - EN: Five more minutes! · Is it morning already? · Rise and shine! · I'm not going to school today!

**11. Kaktus / Cactus** (new; the eyes worry)
- Call - SK: Kaktus letí! · Hádžem kaktus! · Pozor, pichá! · Pichľavá zásielka! - EN: Cactus away! · Watch out, it's prickly! · Prickly delivery!
- Before (60 %) - SK: Ach, to hádam nie! · To nemyslíš vážne! · Len nie kaktus! - EN: Oh no, please not that! · You can't be serious! · Anything but a cactus!
- Sound - SK: Au! - EN: Ouch!
- Hit - SK: Jaj, pichá! · Auvajs! · Som ako ježko! · Kto mi povyťahuje pichliače? - EN: Ow, prickly! · Ouchie! · Now I'm a hedgehog! · Who's going to pull out all these spines?

**12. Toaletný papier / Toilet paper** (new; a paper ribbon trails behind)
- Call - SK: Toaleťák letí! · Hádžem rolku! · Rolka v akcii! - EN: Toilet roll away! · Roll out! · Paper missile!
- Sound - SK: Fŕŕ! - EN: Fwoosh!
- Hit - SK: Spláchnuť a umyť ruky! · Zásoba na mesiac! · Mäkučké! - EN: Flush and wash your hands! · That's a month's supply! · So soft!

**13. Sviečka / Candle** (new; a smoke puff)
- Call - SK: Sviečka letí! · Svetielko na cestu! · Hádžem sviečku! - EN: Candle away! · Lighting the way!
- Sound - SK: Pšš! - EN: Fsss!
- Hit - SK: Páli, páli! · Žeravé! · Sfúknem ju a niečo si zaželám! - EN: Hot, hot, hot! · Toasty! · Let me blow it out and make a wish!

**14. Kus syra / Cheese** (new; green stink waves)
- Call - SK: Syr letí! · Hádžem syrček! · Pozor, voňavý syr! - EN: Cheese away! · Say cheese! · A whiff of cheese!
- Sound - SK: Fuj! - EN: Pee-yew!
- Hit - SK: Smradľavá bomba! · Čo na to myšky? · Som ementál! - EN: Stink bomb! · Where are the mice? · Now I'm Swiss cheese!

**15. Bumerang / Boomerang** (new; comes back to Tapko)
- Call - SK: Bumerang letí! · Hádžem bumerang! · Leť a vráť sa! - EN: Boomerang away! · Go and come back!
- Sound - SK: Švih! - EN: Whoosh!
- Hit - SK: No počkaj, to sa ti vráti! · Vraciam ti ho! · Spiatočná pošta! - EN: Just wait, that'll come back to you! · Return to sender! · Right back at you!
- Tapko catches it - SK: Mám ho! · Chytené! - EN: Got it! · Caught it!

**16. Kocka ľadu / Ice cube** (new; melts into a puddle)
- Call - SK: Ľadová kocka letí! · Hádžem ľad! · Osvieženie letí! - EN: Ice cube away! · Something cool! · Chill out!
- Sound - SK: Cink! - EN: Clink!
- Hit - SK: Brrrr! · Pošli aj limonádu! · Zamrzol som! - EN: Brrrr! · Send some lemonade too! · I'm frozen!

**17. Šiška / Donut** (new; the eyes are happy)
- Call - SK: Šiška letí! · Hádžem šišku! · Sladká strela! - EN: Donut away! · Sweet delivery! · Sugar rocket!
- Before (40 %) - SK: Už sa teším! · Mmm, to vonia! - EN: Ooh, can't wait! · Mmm, smells good!
- Sound - SK: Mňam! - EN: Yum!
- Hit - SK: Mňam mňam! · Pošli viac! · Ešte, prosím! · Ďakujem! - EN: Yum yum! · Send more! · More, please! · Thank you!

**18. Žiarovka / Light bulb** (new pictures off and lit; lights up on the target)
- Call - SK: Žiarovka letí! · Hádžem nápad! · Svetlo, leť! - EN: Light bulb away! · Here's a bright idea! · Lights, go!
- Sound - SK: Blik! - EN: Ding!
- Hit - SK: Osvietilo ma! · Mám nápad! · A budeš po tme! - EN: I've seen the light! · I've got an idea! · Lights out for you!

**19. Zuby na kľúčik / Chattering teeth** (new; chatter on the target)
- Call - SK: Zuby letia! · Hádžem úsmev! · Cvak-cvak, leť! - EN: Teeth away! · Sending a smile! · Chatter chatter, go!
- Sound - SK: Cvak! - EN: Clack!
- Hit - SK: Zub múdrosti! · Mám chrup! · Chrup chrup! · Nezabudni ich vyčistiť! - EN: A wisdom tooth! · Now I've got teeth! · Chomp chomp! · Don't forget to brush them!

**20. Plienka / Diaper** (new; the eyes worry)
- Call - SK: Plienka letí! · Hádžem plienku! · Pozor, plienka! - EN: Diaper away! · Incoming diaper! · Special delivery!
- Before (40 %) - SK: To snáď nie! · Hádam je čistá! - EN: Oh, please, no! · Tell me it's clean!
- Sound - SK: Plesk! - EN: Flump!
- Hit - SK: Hádam je nepoužitá! · Biohazard! · Bleee! · Okamžite do koša! - EN: Please tell me it's unused! · Biohazard! · Bleurgh! · Straight in the bin!

**21. Obláčik / Cloud** (reuses `ui-start-cloud-1`, `-2`; bursts into a puff)
- Call - SK: Obláčik letí! · Hádžem obláčik! · Ľahučko, obláčik! - EN: Cloud away! · Light as air! · Fluffy, fly!
- Sound - SK: Puf! - EN: Poof!
- Hit - SK: To sú zrážky! · Puff! · Nič som necítil! · Vatička! - EN: Precipitation! · Poof! · Didn't feel a thing! · Like cotton wool!

**22. Stará desiata / Old lunch** (new)
- Call - SK: Desiata letí! · Z dna tašky! · Hádžem desiatu! - EN: Old lunch away! · Found this at the bottom of my bag! · Snack attack!
- Before (25 %) - SK: Čo je to za vôňu? - EN: What's that smell?
- Sound - SK: Plesk! - EN: Splat!
- Hit - SK: Živý ekosystém! · To jesť nebudem! · Málo sladké! · Koľko týždňov to má? - EN: A living ecosystem! · I'm not eating that! · Needs more sugar! · How many weeks old is this?

**23. Detská fľaša / Baby bottle** (new)
- Call - SK: Fľaška letí! · Hádžem mliečko! · Desiata pre bábo! - EN: Bottle away! · Milk delivery! · Baby's snack, incoming!
- Sound - SK: Čľup! - EN: Glug!
- Hit - SK: Čo som, bábätko? · Mliečna cesta! · Mňam! · Grrrgg! - EN: What am I, a baby? · The Milky Way! · Yum! · Burrrp!

**24. Cumlík / Pacifier** (new)
- Call - SK: Cumlík letí! · Hádžem cumlík! · Pre tichučko! - EN: Pacifier away! · Shh, this one's for you!
- Sound - SK: Cmuk! - EN: Smack!
- Hit - SK: Bééé, uááá! · Ja neplačem! · A bude ticho! · Najprv sterilizovať, prosím! - EN: Waaah, waaah! · I'm not crying! · Now, quiet please! · Sterilize it first, please!

**25. Krieda / Chalk** (new; white dust)
- Call - SK: Krieda letí! · Hádžem kriedu! · Ako v škole pri tabuli! - EN: Chalk away! · Just like at the blackboard!
- Sound - SK: Prášk! - EN: Puff!
- Hit - SK: A teraz písomka! · K tabuli! · Prach a krieda! · Domček jedným ťahom! · Zotri hubkou! - EN: Pop quiz time! · Up to the blackboard! · Chalk dust everywhere! · Now draw a house without lifting the chalk! · Clean the board!

**26. Píšťalka / Whistle** (new; `whistle` sound)
- Call - SK: Píšťalka letí! · Hádžem píšťalku! · Rozhodca, pozor! - EN: Whistle away! · Calling the ref!
- Sound - SK: Fííí! - EN: Phweet!
- Hit - SK: Faul! · Žltá karta! · Červená karta! · Polčas! - EN: Foul! · Yellow card! · Red card! · Half time!

**27. Pingpongová loptička / Ping-pong ball** (new; bounces off three times)
- Call - SK: Ping! · Podanie! · Hádžem loptičku! - EN: Ping! · Serving! · Ping-pong ball away!
- Sound - SK: Ťuk! - EN: Tap!
- Hit - SK: Pong! · Ľahká váha! · Ťuk-ťuk-ťuk! - EN: Pong! · Featherweight! · Tap-tap-tap!

**28. Bowlingová guľa / Bowling ball** (new; wobble, splinters, `thud`; the eyes worry)
- Call - SK: Guľa letí! · Hádžem bowlingovú guľu! · Pozor, ťažká váha! - EN: Bowling ball away! · Heavyweight incoming! · Watch out, it's heavy!
- Before (40 %) - SK: Toto mi nerob! · Hádam to vydržím! - EN: Don't do this to me! · I hope I can take it!
- Sound - SK: Bum! - EN: Thud!
- Hit - SK: Lietajú mi triesky! · To je ťarcha! · Strike! · Spare! - EN: Splinters everywhere! · That's heavy! · Strike! · Spare!

**29. Motýľ / Butterfly** (reuses `obj-butterfly`, `-2`, `-3`; flutters away, never bounces)
- Call - SK: Púšťam motýlika! · Leť, motýlik! · Motýlik, za terčom! - EN: Fly, butterfly! · Off you flutter! · Butterfly, go find the target!
- Sound - SK: Šuch! - EN: Flutter!
- Hit - SK: Uletel mi! · Babôčka! · Nie som kvietok! · Brrr, hmyz! - EN: It flew away! · Pretty wings! · I'm not a flower! · Ew, bugs!

**30. Pavúk / Spider** (reuses `obj-spider`; dangles on a thread; the eyes worry)
- Call - SK: Pavúčik letí! · Hádžem pavúčika! · Osem nôh, vpred! - EN: Spider away! · Here comes a spider! · Eight legs, go!
- Before (40 %) - SK: Len nie pavúka! - EN: Not a spider!
- Sound - SK: Ťap! - EN: Tap!
- Hit - SK: Spiderman! · Superhrdina! · Pošli muchu! · Rovno do siete! · Brrr, povymetaj rohy! - EN: Spider-Man! · Superhero! · Send me a fly! · Caught in the web! · Time to dust the corners!

> Note: "Vsietil si to" was changed to "Rovno do siete!" because "vsietil" is masculine and
> the child may be a girl. "Spiderman" stays (the owner's decision): the word alone, no picture
> or look of the character.

**31. Hokejka / Hockey stick** (new)
- Call - SK: Hokejka letí! · Hádžem hokejku! · Strela od modrej! - EN: Hockey stick away! · Slap shot!
- Sound - SK: Klap! - EN: Clack!
- Hit - SK: Sekera! · Mimo hru! · Zakázané uvoľnenie! · Na trestnú lavičku! - EN: Slashing! · Offside! · Icing! · To the penalty box!

**Proposed extras (strike any you do not want)**

**32. Vankúš / Pillow** (new; feathers)
- Call - SK: Vankúšová bitka! · Hádžem vankúš! · Mäkká strela! - EN: Pillow fight! · Soft shot incoming!
- Sound - SK: Puf! - EN: Fwump!
- Hit - SK: Mäkké pristátie! · Ešte si zdriemnem! · Perie všade! - EN: Soft landing! · Just a little nap! · Feathers everywhere!

**33. Gumená sliepka / Rubber chicken** (new; `squeak`)
- Call - SK: Gumená sliepka letí! · Kot-kot-kodák! - EN: Rubber chicken away! · Bawk bawk!
- Sound - SK: Kodák! - EN: Bawk!
- Hit - SK: Čo bolo prvé, sliepka či vajce? · Kot-kodák! · Tá je ale smiešna! - EN: Which came first, the chicken or the egg? · Buk-buk-bawk! · What a silly chicken!

**34. Balónik s vodou / Water balloon** (new; a splash)
- Call - SK: Vodný balónik! · Pozor, mokré! · Čľup-čľap, leť! - EN: Water balloon! · Watch out, it's wet!
- Sound - SK: Čľap! - EN: Splash!
- Hit - SK: Som celý mokrý! · Osvieženie! · Kto zabudol dáždnik? - EN: I'm soaked! · So refreshing! · Who forgot the umbrella?

**35. Banán / Banana**
- Call - SK: Banán letí! · Hádžem banán! · Žltý bumerang! - EN: Banana away! · Yellow boomerang!
- Sound - SK: Plesk! - EN: Splat!
- Hit - SK: Pozor, pošmyknem sa! · Opičky by sa tešili! · Vitamínová bomba! - EN: Careful, I'll slip! · The monkeys would love this! · Vitamin bomb!

### Story 2 (Robot Šróbik's worlds) - three more

**36. Batéria / Battery** (reuses `obj-battery`; yellow sparks)
- Call - SK: Batéria letí! · Hádžem energiu! · Plne nabitá! - EN: Battery away! · Power up! · Fully charged!
- Sound - SK: Bzz! - EN: Zap!
- Hit - SK: Nabitý zásah! · Mám plnú energiu! · Skrat! · Kde mám zásuvku? - EN: A charged hit! · Full power! · Short circuit! · Where's my plug?

**37. Magnet** (new picture without the chain; sticks)
- Call - SK: Magnet letí! · Hádžem magnet! · Priťahuj! - EN: Magnet away! · Attract!
- Sound - SK: Cvak! - EN: Clunk!
- Hit - SK: Priťahuješ ma! · Prilepil sa! · Mám magnetickú osobnosť! - EN: I'm so attracted to you! · It stuck! · What a magnetic personality!

**38. Ozubené koliesko / Gear** (reuses `obj-gear`)
- Call - SK: Koliesko letí! · Hádžem ozubené koleso! · Točí sa to! - EN: Gear away! · Get in gear!
- Sound - SK: Cvak! - EN: Clank!
- Hit - SK: Zapadlo to! · Mám o koliesko navyše! · Klape to ako hodinky! - EN: Everything clicks! · Now I've got a spare cog! · Running like clockwork!

### Story 3 (Víla Melódia's worlds) - three more

**39. Nota / Music note** (reuses `obj-note1`, `obj-note2`; `note` sound)
- Call - SK: Nota letí! · Hádžem melódiu! · Tralala, leť! - EN: Note away! · Sending a tune! · Tra-la-la, fly!
- Sound - SK: Tíí! - EN: Ting!
- Hit - SK: Do rytmu! · Falošný tón! · Spievam si! · La-la-lá! - EN: Right on the beat! · Out of tune! · Now I'm singing! · La-la-la!

**40. Žabka / Frog** (reuses `obj-frog`; hops off)
- Call - SK: Hop, žabka! · Letí žabka! · Žabka skáče! - EN: Hop, froggy! · Frog away! · Leap, little frog!
- Sound - SK: Kvák! - EN: Ribbit!
- Hit - SK: Pusu ti nedám! · Princ to nie je! · Kvák! Je tu niekde rybník? - EN: No kisses, sorry! · Definitely not a prince! · Ribbit! Is there a pond around here?

**41. Čarovný prútik / Magic wand** (new; sparkles, the target flashes pastel)
- Call - SK: Čáry-máry, leť! · Prútik letí! · Hokus-pokus! - EN: Abracadabra! · Wand away! · Hocus-pocus!
- Sound - SK: Cing! - EN: Ting!
- Hit - SK: Som začarovaný! · Zmenil som sa na žabu? Uf, nie! · Čarovná desiatka! - EN: I'm enchanted! · Did I turn into a frog? Phew, no! · A magic bullseye!

> If the owner meant three of the things listed above to wait for story 2 and three for
> story 3 instead of new ones: move light bulb, alarm clock and chalk to story 2 and candle,
> butterfly and whistle to story 3, and leave out 36-41.

### World things (each only at its own world's range; effects in brackets)

**W1. Lúka / Meadow - Lienka / Ladybug** (`obj-ladybug`; flies away like the butterfly)
- Call - SK: Lienka, leť! · Leť, lienka, k terču! · Púšťam lienku! - EN: Fly, ladybug! · Off you go, ladybug! · Ladybug, fly to the target!
- Sound - SK: Ťap! - EN: Tap!
- Hit - SK: Lienka mi priniesla šťastie! · Bodka v strede! · Lienka, lienka, kam letíš? - EN: A ladybug, that's lucky! · Spot on, just like her spots! · Ladybug, ladybug, fly away home!

**W2. Raketa / Rocket - Raketka / Toy rocket** (`obj-rocket`; a smoke trail)
- Call - SK: 3, 2, 1, štart! · Raketa štartuje! · Do vesmíru! - EN: 3, 2, 1, liftoff! · Blast off! · Rocket launch!
- Sound - SK: Vžum! - EN: Zoom!
- Hit - SK: Pristátie úspešné! · Houston, máme zásah! · Malý krok pre teba, veľký zásah pre terč! - EN: Touchdown! · Houston, we have a hit! · One small step for you, one giant hit for me!

**W3. Planéta / Planet - Asteroid** (`obj-asteroid-small`; the target wobbles, dust)
- Call - SK: Asteroid letí! · Pozor, kameň z vesmíru! · Hádžem asteroid! - EN: Asteroid incoming! · Space rock, go! · Look out, meteor!
- Sound - SK: Buch! - EN: Kaboom!
- Hit - SK: Dopad z vesmíru! · Ešte že nie som dinosaurus! · Mám kráter! - EN: Impact from outer space! · Good thing I'm not a dinosaur! · Now I've got a crater!

**W4. Údolie / Valley - Čili paprička / Chili pepper** (new; the target flashes red, steam)
- Call - SK: Paprička letí! · Hádžem čili! · Pozor, pálivé! - EN: Chili away! · Hot stuff incoming!
- Before (40 %) - SK: Len nič pálivé! - EN: Nothing spicy, please!
- Sound - SK: Pšš! - EN: Sizzle!
- Hit - SK: Chrlím oheň ako drak! · Vody, rýchlo vody! · To páli až v ušiach! - EN: Now I breathe fire like a dragon! · Water, quick, water! · My ears are on fire!

**W5. Vajíčko / Egg - Hniezdo / Nest** (`obj-nest`; sits on top of the target)
- Call - SK: Hniezdo letí! · Hádžem hniezdočko! · Domček pre vtáčiky! - EN: Nest away! · A home for birds, coming up!
- Sound - SK: Šuch! - EN: Rustle!
- Hit - SK: Kto tu bude bývať? · Ešte vajíčko a som sliepka! · Útulné! - EN: Who's moving in? · Add an egg and I'm a hen! · Cozy!

**W6. Šrotisko / Junkyard - Pružina / Spring** (`obj-spring`; bounces off high three times)
- Call - SK: Pružina letí! · Boing, leť! · Hádžem pružinu! - EN: Spring away! · Boing, go!
- Sound - SK: Boing! - EN: Boing!
- Hit - SK: Boing-boing! · Skáčem od radosti! · Pérovanie funguje! - EN: Boing boing! · I'm jumping for joy! · Now that's bouncy!

**W7. Dielňa / Workshop - Francúzsky kľúč / Wrench** (new)
- Call - SK: Kľúč letí! · Hádžem francúzsky kľúč! · Treba niečo dotiahnuť! - EN: Wrench away! · Time to tighten something!
- Sound - SK: Cink! - EN: Clang!
- Hit - SK: Dotiahnuté! · Nemám niekde uvoľnenú skrutku? · Šróbik by sa tešil! - EN: Nice and tight! · Do I have a loose bolt somewhere? · Bolt would be proud!

**W8. Dážď / Rain - Dáždnik / Umbrella** (`obj-umbrella`; opens and sinks slowly over the target)
- Call - SK: Dáždnik letí! · Hádžem dáždnik! · Prší, prší! - EN: Umbrella away! · Rain, rain, go away!
- Sound - SK: Fup! - EN: Fwump!
- Hit - SK: Konečne som v suchu! · Nech si prší! · Pod dáždnikom je mi fajn! - EN: Finally, I'm dry! · Let it rain, I don't care! · Singing in the rain!

**W9. Mesto / City - Robotík / Little robot** (`obj-robot-small-3`; hovers, then flies up and away)
- Call - SK: Robotík, leť! · Vrtuľka, štart! · Bip-bup, vpred! - EN: Fly, little robot! · Propeller on! · Beep-boop, forward!
- Sound - SK: Bip! - EN: Beep!
- Hit - SK: Bip-bup, pristátie! · Cieľ nájdený! · Výpočet presný! - EN: Beep-boop, landed! · Target acquired! · Calculation correct!

**W10. Domov / Home - Hrianka / Toast** (new)
- Call - SK: Hrianka letí! · Hádžem hrianku! · Čerstvo opečená! - EN: Toast away! · Fresh from the toaster! · Toast incoming!
- Sound - SK: Chrum! - EN: Crunch!
- Hit - SK: Hrianka s maslom! · Dobre opečené! · Maslom nahor, máme šťastie! - EN: Buttered toast! · Nicely done! · Butter side up, lucky us!

**W11. Záhrada / Garden - Kvietok / Flower** (`obj-flower-open`; stays on the target a moment)
- Call - SK: Kvietok pre teba! · Hádžem kvietok! · Leť, kvietok! - EN: A flower for you! · Flower away!
- Before (40 %) - SK: To je pre mňa? - EN: Is that for me?
- Sound - SK: Šuch! - EN: Swish!
- Hit - SK: Ďakujem, je krásny! · To je ale milé! · Vonia ako jar! - EN: Thank you, it's lovely! · How sweet of you! · Smells like spring!

**W12. Cestička / Path - Lesná šiška / Pine cone** (new; in Slovak a pun on the donut "šiška")
- Call - SK: Šiška letí! · Hádžem lesnú šišku! · Z lesa rovno na terč! - EN: Pine cone away! · Straight from the forest!
- Sound - SK: Ťuk! - EN: Thock!
- Hit - SK: Táto šiška sa jesť nedá! · Pichľavá, nie sladká! · Veverička ju bude hľadať! - EN: Not that kind of cone! · Crunchy, not sweet! · A squirrel will come looking for it!

**W13. Jazero / Lake - Rybka / Fish** (new; flops, then jumps down with a splash)
- Call - SK: Rybka letí! · Hádžem rybku! · Lietajúca ryba! - EN: Fish away! · Flying fish! · Something fishy!
- Sound - SK: Čľup! - EN: Splish!
- Hit - SK: Glg-glg, kde je voda? · Fuj, šupiny! · Tá je ale čerstvá! - EN: Glub glub, where's the water? · Ew, scales! · Something smells fishy!

**W14. Strom / Tree - Vtáčik / Songbird** (`obj-bird`; sits on the rim, sings, flies off)
- Call - SK: Leť, vtáčik! · Púšťam vtáčika! · Čvirik, k terču! - EN: Fly, birdie! · Off you go, little bird! · Tweet, to the target!
- Sound - SK: Čvirik! - EN: Tweet!
- Hit - SK: Čvirik! Postavím si tu hniezdo! · Spievaš mi z duše! · Vtáčik v strede! - EN: Tweet! I'll build my nest here! · You're music to my ears! · A bird in the middle!

**W15. Ples / Ball - Korunka / Crown** (`acc-crown` or new; sits on top of the target for 2 s)
- Call - SK: Korunka letí! · Pre kráľa plesu! · Hádžem korunku! - EN: Crown away! · For the king of the ball!
- Sound - SK: Cing! - EN: Ting!
- Hit - SK: Som kráľ plesu! · Zatancujeme si? · Vaše veličenstvo, zásah! - EN: I'm the king of the ball! · Shall we dance? · Your Majesty, a hit!

**Collection** (`aim.collection`)
- new - SK: Nová vec do zbierky! - EN: New find for the collection!
- count - SK: Zbierka: {n} z 15 - EN: Collection: {n} of 15
- waiting - SK: Čaká v svete {world} - EN: Waiting in the {world} world

## Done - 2026-10-24
- Shipped: the whole catalogue in `aim.things.*` / `aim.lines.*` / `aim.collection.*` (sk, en);
  `aim-things.ts` (56 things, story and world pools, tiers, points, shuffled bags); canvas speech
  bubbles for Tapko and the target that move clear of word labels and go to the screen-reader
  line; every effect, the four new sounds, the peeking eyes; world things with `rangeFinds`
  (store v6 with its migration) and the end card's collection row; 36 new pictures (all 35 of
  the list plus `obj-aim-crown`, since `acc-crown` is too small at 46 px), each checked at play
  size on a light and a dark band; unit and e2e tests (no bubble over a word at 1024x600,
  1366x768, 1920x1080).
- Changed from the catalogue: the chalk call "Ako pani učiteľka!" / "Just like the teacher!"
  became "Ako v škole pri tabuli!" / "Just like at the blackboard!" (the texts never name a
  teacher; `i18n.test.ts`).
- Small choices: a chick that arrives after hatching in flight gets no impact word (none in the
  catalogue fits); the umbrella sits on the target's top and fades instead of opening; the
  e2e and dev builds take `?aimThing=<id>,<id>|all` to pick the things.
