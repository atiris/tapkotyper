# 87 - World 5: the egg goes up the Mountain of Awakening

## Why

World 5 (`egg`, "Vajíčko") still plays the cyclic-copy placeholder, and its old idea (an egg
rolling downhill, a friendly mole) does not follow from world 4. The valley ends with the egg in
the dead fire pit: the flames it was born in are too weak to wake it. The owner's story
(2026-10-31): Tapko carries the egg up the **Mountain of Awakening (Hora prebudenia)** to the
**dragons' hearth (ohnisko drakov)** on its summit and wakes the baby with a long spell. Each
level is one piece of the way up and keeps the world rhythm with the owner's game kinds:
1 a word stream, 2 waiting words, 3 crossroads, 4 a word stream, 5 the super level as the first
**ribbon** (Pás) level, the copy kind the help already lists ahead of its level.

## Decisions (taken with the owner, 2026-10-31; the same three background layers for all five levels and the hero's journey's use of them confirmed the same day)

### The world
- Name stays "Vajíčko" / "Egg"; map card, badge (the hatched baby dragon), reward `hatched`,
  music, range thing (the egg) stay. Keys per level stay (`STORIES[0].keys`, 19-20 keys, the
  period known since the valley).
- **World story** (sk, the first get-ready card of level 1; en to match): "Plamene, v ktorých sa
  dráčik zrodil, sú príliš slabé, aby ho prebudili. Vajíčko musíš vyniesť na **Horu prebudenia**
  do **ohniska drakov**. Cesta hore je dlhá: fúka **silný vietor**, sú tam **lepkavé mláky**,
  **rázcestia** a **padajúce balvany**. Na vrchole prednesieš **kúzlo prebudenia**." Each
  level's own line (sk) is in its section below.
- **Reward scene `hatched`** (sk): "Ohnisko drakov vzbĺklo a vajíčko praská... krak... krak!",
  "Malý dráčik sa na teba pozerá. Máš nového kamaráta!", "Teraz ťa čaká **cesta hrdinu**:
  späť dolu z hory až k rakete." (replaces the rescue line; en to match).
- The scenario file `.specify/game/story-1-scenario.md` gets "Svet 5" in the same style and its
  title "prvých štyroch svetov" becomes "piatich svetov"; `story.md` world 5 is rewritten (WHAT
  and WHY below), "Only the first four worlds" becomes five.

### Tapko carries the egg on his back (levels 1-4)
- The egg (`obj-egg-plain`, no face) rides behind Tapko, peeking over his right shoulder, tilted
  about 15 degrees outward. It is drawn **behind every layer of his stack** (behind the back
  accessory too), so wings, a cape or a jetpack never cover his front with it.
- **It must always peek out, whatever he wears.** Its height is not fixed: from the decoded
  pictures of his current stack (body and every accessory), take the topmost opaque row of the
  union silhouette in the egg's column (alpha > 0.5, cached per outfit and size, recomputed when
  the outfit changes); the egg is placed so that its top third shows above that row at rest.
  Fallback drawings (missing pictures) use their own drawn outline the same way. A test checks
  with the widest/highest back accessories (dragon wings, jetpack, hero cape, balloon if it is a
  back/hand item that rises over the head) that the visible share at rest is at least 30 %.
- **Peeking:** at rest a third shows; every 6-10 s (random) and at story moments (a gust reaching
  him, a mud step, a stumble) it rises to show about two thirds, wobbles a little and sinks back
  (about 1.2 s). With reduced motion it never moves. A `carry: 'egg'` option of
  `drawTapko`'s motion, used by the four mode classes of this world and by the end hops.
- Level 5 starts with Tapko lifting the egg off his back and laying it into the hearth (a short
  arc, about 1 s, before the first word shows).

### Backgrounds (new `bg-egg-far/mid/near`, replacing the old valley-slope layers)
Made with the section 3 prompts of `assets-src/PROMPTS.md` (skill `gemini-images`, procedure
`scripts/bg-seam.mjs`); the table rows of `bg-egg-*` are rewritten, the old files move to
`assets-src/bg-old/`. The owner may replace them with own pictures later (as for the planet).
- **far:** like the planet's far layer (`bg-planet-far`: hand drawn, natural colours, small
  orange clouds with stepped, sawtooth edges like stairs), but in the mountains: rocky hills and
  peaks in grey-brown and warm ochre, more and bigger groups of pale crystals (amber, rose
  quartz, aquamarine) in the slopes, **no big mushroom trees**, a light blue sky, the summit not
  dominant (balanced across the width).
- **mid:** flat rocky terrain far enough back that nothing reads as close: low rocks, some
  covered with moss carrying low stemless flowers, here and there a small mushroom and a crystal
  growing out of the rock. Calm, no tall objects.
- **near:** a path on rocky ground. Its lower part is calm rock with no objects and no detail
  (words and Tapko sit over it); along the path's upper edge small crystals and now and then a
  mushroom, in one place a low bush. Tapko walks in the middle of the path: its middle sits where
  `PATH_FEET` is on the planet (`VH * 0.89`), so the hero kit's feet line works unchanged.
- All five levels use these three layers; level 5 adds the hearth (an object, not a band).
  Level 4 and 5 may show the summit closer only through the story text, no extra band.

### 1. Wind on the slope (word stream, kind `wind`)
- Line (sk): "Na svahu fúka **silný vietor**. Napíš slovo, ktoré nesie, skôr než k tebe dofúka."
- Words come from the right one at a time (two at once from the second half, each with another
  first letter), each carried by a **gust**: a swirl of white air strokes drawn in code round
  the word, with one or two small leaves (`obj-leaf-*`) whirling in it. Its approach uses the
  stream pace of `kit/approach.ts`.
- **Typed:** the gust breaks up in a puff and Tapko takes a few steps on up the path (the near
  and mid bands glide about 80 px); he leans into the wind while any gust is in flight.
- **Reaches him untyped:** he and the egg are pushed a few steps back (the bands glide back about
  60 px, never off the start), "Uf, to fúka!" / "Držím sa!" now and then; nothing else.
- **A slip** makes that gust stronger: it grows (about 1.3x), its strokes thicken, it flies 1.35x
  faster and **its word starts again** (the typed letters are wiped; an exception to the
  mechanics' "a wrong letter never resets progress", written into `mechanics.md` for this level).
- **A second slip in the same gust** sends it into him at once (a quick rush), it pushes him back
  further (about 120 px) and the level gets **2 more planned words and the matching minimum time
  (2 words at the story's 8 words a minute: +15 s)**, at most +10 words (+75 s) per level. The
  first time, the narrator says why: "Silný poryv ťa odtlačil, cesta sa predĺžila."
- The progress bar never goes back when the level grows (the runtime already holds it).
- End: he reaches a sheltered ledge, the wind drops, "Uf, tu už nefúka."

### 2. Sticky puddles (waiting words, calm step, kind `mud`)
- Line (sk): "Na chodníku sú **lepkavé mláky**. Vyber si slovo nad čistým miestom. Kto stúpi do
  bahna, chvíľu sa nepohne z miesta."
- The path ahead has slots (as the planet's crossroads places, right of Tapko); each round shows
  **2 or 3 words, each above one slot**: at least one slot is clean path, at least one has a
  sticky puddle (`obj-mud-1/2`, a flat glossy dark brown puddle with a few bubbles; no animation
  of stickiness). The typed word's slot is where he walks; the view glides, a new round grows.
- The words of a round start each with another letter, so the first key picks the word, as in
  every waiting-words level (Backspace lets go as everywhere). The owner moved the "quick
  choice" idea to the crossroads (level 3, the countdown of the best path), so there is no
  quick or late-decided round here.
- **A mud word:** he steps into the puddle and says "Fuj!" / "Bahno!" / "Ble, lepí sa to!", and a
  line explains it each time under the words: "Bahno ťa riadne spomalí: ďalšie tri slová sú
  ťažké." The next **three rounds have one very hard word each** (the planet's `extreme` word
  pool: long words with the hardest known keys), no puddles in them; then "Uf, odlepil som sa!"
  and the rounds are normal again. Waiting words never move toward him and nothing is missed.
- Length: the calm step's minimum (90 s, 12 words); hard words count as words.
- End: the puddles are behind him, he wipes his paws (a little hop) and walks on.

### 3. Crossroads up the mountain (crossroads, kind `crossroads`, variant `mountain`)
- Line (sk): "Cesta k vrcholu sa delí. Na **rázcestí** si vyber smerovník a napíš jeho slovo."
- Plays as the planet's level 3 (`planet-roads.ts`, the same path kinds, **the same path names**
  and effects, Backspace card included), in this world's bands, with the additions below (only on
  the mountain; the planet's level 3 stays as it is). The mode gets its world from the level
  instead of the fixed `'planet'` (pictures, background, the extra kinds and the countdown).
- **New posts:** the signposts stand on new pedestals of three heights (`obj-signpost-stone-1..3`:
  a weathered wooden pole set in a small cairn of mossy stones; no fire, no lantern); the arrow
  boards stay `obj-arrow-1/2`.
- **Extra path kinds on the mountain** (added to the draw of the planet's kinds; names sk / en,
  effects as `PathDef` fields):
  - **"vľavo"** and **"vpravo"** ("left", "right"): `ask: 'normal'`, `time: 1`, `words: 1`,
    `leg: 4`; ordinary words, nothing changes. At most one of the two per crossroads.
  - **"prekážky"** ("obstacles", clearly bad): `ask: 'easy'` (tempting), `len: 'long'`,
    `diff: 'hard'`, `time: 1.3`, `words: 1.35`, `leg: 4`; Tapko says "Samé kamene a pníky, to
    bude dlhé!".
  - **"lanovka"** ("cable car", good): `ask: 'twoLong'`, `len: 'short'`, `time: 0.7`,
    `words: 0.7`, `leg: 3`; Tapko says "Hurá, vezieme sa!".
  - **"zablatená cesta"** ("muddy path", a little bad): `ask: 'easy'`, `len: 'long'`,
    `time: 1.1`, `words: 1.15`, `leg: 4`; Tapko says "Fuj, blato až po kolená.".
  These go into `PATHS` as kinds that only the mountain variant draws.
- **The best path has a countdown** (the owner's "quick choice", 2026-10-31): at a crossroads
  with at least three signs, the sign of the best path among them (the lowest `time x words`;
  only when that is teleport, the cable car or the fast path) gets a round clock beside its arrow,
  in the look of the valley take-off's clock (a green ring that empties round an hourglass and
  blinks in its last quarter). It starts once all posts have grown. Its time is fair for this
  child: 2 s to read and decide, plus the sign word's letters at the child's word pace
  (`mechanics.md`: per letter over the last five words) times 1.5, at least 4 s. When it runs
  out the sign vanishes as a sign does after a slip, **also without a slip and also when its word
  is half typed** (the typed letters go, nothing counts as a mistake); Tapko says "Škoda, tá
  cesta sa zavrela.". At least two signs are always left, so the last-sign rule stays. The paws
  never type a sign, so the clock runs for the child alone; with "no time pressure" there is no
  clock. Tapko's lines at the end say he can see the summit.

### 4. Boulders before the summit (word stream, kind `boulders`)
- Line (sk): "Tesne pod vrcholom sa po chodníku **valia balvany**. Napíš slovo na balvane a
  preskočíš ho."
- Round boulders (`obj-boulder-1..3`, no face, three looks, size by word length, each turned its
  own way and some mirrored) roll from the right along the path, spinning as they roll, the
  word above each (shown once it is wholly in sight). From about a third of the level, about
  every third throw is **two boulders at once** (another first letter, 1-1.5 s apart).
- **Typed:** the boulder rolls on; when it reaches him he jumps over it in a hop and it rolls on
  off the left edge.
- **Not typed:** he jumps too late, stumbles ("Hups!", "Jejda!", "Uf!"), sits a moment and gets
  up while the boulder rolls on behind him; the egg peeks. The level's **minimum time grows by
  7 % of its base minimum and its planned words by 7 %** (rounded per miss, kept as a fraction
  internally), at most +70 % (ten misses). The first time the narrator says: "Zaváhal si, cesta
  na vrchol sa predĺžila."
- Planned against the two players (mechanics' story moments): pairs appear for the slow child
  too; a test plays both paces.
- End: the summit is in sight, Tapko cheers softly, the egg peeks.

### 5. The Spell of Awakening (super level, the first ribbon, kind `spell`)
- Line (sk): "Si na vrchole. Polož vajíčko do **ohniska drakov** a prednes **kúzlo prebudenia**.
  Je dlhé a musí byť presné: pri chybe zmizne aj posledné napísané slovo."
- **Scene:** Tapko on the left; the **dragons' hearth** on the right (about 0.78 of the stage):
  a big ring of old carved stones (`obj-hearth`, not an altar) with weak low flames
  (`obj-flame-1..4`, the valley's burning-pit drawing reused smaller); the egg lies in it.
- **The ribbon:** one long word box (the game's usual label style, wide) high in the middle shows
  the spell as an endless band: the previous word faint, the word to type in full strength with
  its typed letters marked, the next word faint, the band fading out at both ends. It slides
  smoothly letter by letter, so the next letter stays at the same point a little left of the
  middle; a space is a visible gap that lights up when it is the key to type. Spaces and the
  period are typed like letters.
- **The spell frame** below it (between the ribbon and the ground, clear of Tapko and the hearth):
  a wide panel with a carved stone frame and four softly glowing rune stones in its corners
  (drawn in code like the other panels), inside it what the child has written, letter by letter,
  with a blinking cursor; no dots, no placeholders, no ghost text. Up to three lines; a full
  frame scrolls its oldest line up and away.
- **A slip** (a wrong letter, a letter where the space belongs or a space inside a word) erases
  the word in progress **and the last written word**: both fade back out of the frame letter by
  letter (about 0.4 s, a small puff) and the ribbon **rewinds** smoothly to the start of the
  erased word (rewinding is chosen over new words: the spell is one fixed text). A slip never
  erases behind the place of the last rewind until two words were written past it, so repeated
  slips at one place cost only the word in progress, and every child finishes. The first slip
  says "Kúzlo sa preruší, napíš posledné slová znova.", then one in ten "Pozor, kúzlo musí byť
  presné!".
- **The text:** sentences of 4-6 known words, each ending with a period, from the level's keys
  (the word pool of the level, no capitals before they are known); one sentence leads into the
  next with no gap. It is planned to the super level's minimum (150 s, 20 words at 8 words a
  minute) and keeps coming while either minimum is not met; then the sentence in progress is the
  last. Erased words are written again and count once in the progress.
- **The hearth with the spell:** each written sentence makes the flames grow a step and the
  egg glow warmer (`obj-egg-glow`), with a wobble; at half the level the first crack shows, at
  three quarters `obj-egg-cracking`. End: the fire flares up in a burst of sparks, the egg
  breaks and the baby dragon (`obj-dragon-hatched`) sits in the hearth: "Ahoj! Ďakujem, že si ma
  zohrial!", Tapko cheers ("Hurá!"), the level ends. Stars from accuracy as every level.
- Map dot: the crown (super level). The help's "Ribbon" line now points to this level.

### Rules kept
- Minimums by `minActiveS`/`minWords`; the new kinds go into `LevelKind`, `CALM_KINDS` gets
  `mud`, `COPY_KINDS` gets `spell` (activity for the map: chase, catch, crossroads, chase,
  super); `UNITS` stays words for all five.
- Nothing bad happens: pushes back and stumbles are small and funny, nothing breaks, the egg
  never falls. Words never sit on the egg or on Tapko.
- Staying a while: levels 1, 2 and 4 run without an end as usual; level 3 as the planet's;
  level 5 stays in level 4 (super level rule).

## Affected

- `src/game/levels.ts` (kinds `wind`, `mud`, `boulders`, `spell`; world 5 defs instead of the
  placeholder; the dynamic growth of level 1 and 4 as an API the runtime reads, e.g. the mode
  raising its own `extraMin`/`extraWords` that `minActiveS` users take into account),
  `src/game/modes.ts` (factory), new `src/game/modes/egg-wind.ts`, `egg-mud.ts`,
  `egg-boulders.ts`, `egg-spell.ts` (or two files if the stream kinds share most code),
  `src/game/modes/planet-roads.ts` and `kit/hero.ts` (world from the level, mountain posts, extra kinds and
  the countdown), `src/game/modes/kit/approach.ts` (gusts and boulders if it needs a hook),
  `src/gfx/tapko.ts` (`carry: 'egg'`, silhouette cache), `src/gfx/assets.ts` (new pictures),
  `src/game/runtime.ts` (progress/minimum growth, end), `src/screens/story.ts` (reward scene
  text only), `src/screens/help.ts` (ribbon now in the game), `public/i18n/{sk,en}.json`,
  `public/i18n/translator/en.json`, `src/i18n/catalog.ts`.
- Assets: `bg-egg-far/mid/near` (new), `obj-mud-1/2`, `obj-boulder-1..3`,
  `obj-signpost-stone-1..3`, `obj-hearth`; prompts in `assets-src/PROMPTS.md` (sections 3 and 4),
  `npm run assets`. Until a picture exists, a fallback drawn in code (as the other objects).
- Specs: `.specify/game/story.md` (world 5, "first five worlds built", Why lines),
  `.specify/game/story-1-scenario.md` (Svet 5), `.specify/game/mechanics.md` (the wind's reset
  exception, the ribbon kind, the growing minimum), `.specify/experience/help.md` (Ribbon in the
  game), `.specify/companion/tapko.md` (the carried egg must always peek out).
- DB/store: none (level ids `w5-1..5` stay; their old placeholder stars stay valid).

## Steps

- [ ] Specs and texts first: story.md world 5, scenario Svet 5, mechanics exceptions, sk/en
      lines, translator notes.
- [x] Egg on the back: `carry: 'egg'` in `drawTapko`, the silhouette cache, peeking; unit test of
      the visible share with the widest back accessories and with fallback drawings.
- [ ] Backgrounds: prompts, Gemini generation (`gemini-images`), seam procedure, `npm run
      assets bg-egg`, preview; the path's middle at `PATH_FEET`. If Gemini is unavailable, keep
      the old layers and add a backlog line.
- [x] Level 1 wind (gust strengthening, reset on a slip, second slip push with +2 words /
      +15 s capped at +10 / +75 s).
- [x] Level 2 mud (slots, at least one clean and one mud slot per round, three hard rounds after mud).
- [x] Level 3 crossroads in the mountains (world from the level, stone posts, the five extra path kinds, the best path's countdown).
- [x] Level 4 boulders (pairs, jump over, stumble with +7 % capped at +70 %).
- [x] Level 5 spell ribbon (band, frame, two-word erase with the rewind anchor, hearth stages,
      hatching end).
- [ ] Object pictures via `gemini-images` (mud, boulders, stone posts, hearth) and the assets run.
- [ ] Tests: `levels.test.ts` (kinds, minimums, activities of world 5), unit tests for the wind's
      growth cap, the boulders' +7 % cap, the ribbon's erase/anchor rule, the countdown (only the best path, at least three signs, its fair time, a half-typed sign vanishing without a mistake); `idle.test.ts` (each
      new mode keeps giving targets and ends at both paces; pairs of boulders and the mud's hard
      rounds appear for the slow child); e2e: world 5 levels reach their end with `?minActive=`.
- [ ] `npm run build`, `npx vitest run`, affected e2e; Playwright MCP play-through of all five
      levels (tester profile, `?fast`, `tapkoType`), screenshots: the egg peeking with dragon
      wings and with a jetpack, a strengthened gust, a mud round, the stone posts, a boulder
      pair, the ribbon after a rewind, the hatching.

## State
Code of the five levels, the egg on his back, texts and unit tests are in. Open: specs, pictures and
backgrounds (a background agent runs them through Gemini), e2e, the browser play-through.
Decisions taken while implementing (2026-10-31):
- Files: `modes/egg.ts` (wind, mud, boulders), `modes/egg-spell.ts` (the ribbon), `modes/kit/egg.ts`
  (`EggPeek`, `drawCarrier`, `Detour`), `modes/kit/clock.ts` (the valley's round clock, now shared).
  All five levels draw Tapko on the canvas (`tapkoOnStage`), so the egg can sit behind his stack.
- The egg sits over his right shoulder, the viewer's left (away from what comes from the right).
  Its place: sunk from above his head behind the union silhouette until no more than a third of
  its area would show (`eggRest`, never lower than his chest); peeking rises until two thirds show,
  at most half its height (`eggPeek`). "Visible share" is measured by area; a test checks fox, owl
  and bunny with dragon wings, jetpack, hero cape, butterfly and fairy wings, star cape, backpack,
  balloon and hat combinations, and the fallback ovals (>= 30 % at rest, less than 90 %).
- Mud: while stuck, the very hard word stands above his head (he does not move); it is the longest
  of four words drawn from the child's weakest keys (`weakWord`), not the teleport's sentence.
  The explaining line is drawn in the scene under that word during the first hard round.
- Wind: only a slip inside a started gust's word counts (as the crossroads' signs); a rush is a
  passed target (a miss for the pressure valve).
- Crossroads: the countdown clock stands right beside the best sign's word label (the arrow turns
  at random, the label does not); a countdown that would leave fewer than two signs just stops.
- Spell: each word is a target with its trailing space, so the space is typed while the word is
  locked; a wrong first letter is a slip too. Enter marks are dropped from the spell.
- Runtime: `extendMin(seconds)` (the wind's and the boulders' longer way) and `letterTime` (the
  child's seconds per letter, for the countdown).
