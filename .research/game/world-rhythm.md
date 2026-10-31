# World rhythm: five different steps inside one world

**Status:** decided (2026-10-22); meadow pilot done in `.todo/.done/66-meadow-world-rhythm.md`. **Prio:** P1. **Effort:** L
(new level engines plus light art per world), can ship world by world. Activity names and the spread over all worlds: [activities.md](activities.md).

## The problem
- A child usually plays one world per session: a session is about 15 minutes, a level 1-3
  minutes, so one sitting is roughly the five levels of one world.
- Inside a world, levels 1-4 are the same game. In `src/game/levels.ts` they differ only in
  the sprite mix (`flyers`, `bugs`, `runners`, `mix`) and the number of words (12, 14, 16,
  18). Only the super-obstacle (level 5) plays differently.
- Exceptions today: the planet alternates swamp and signs; the fairy story changes the way
  to type, but per world, not per level, so inside a fairy world it is the same again.
- Result: the variety lives *between* worlds, but the child meets it only between sessions.
  Inside one session it is four times the same thing and then a boss. Novelty drops after
  the first or second repeat, and boredom is the one mood that tends to stay and does not
  turn back into play (see Sources).

## What good examples do
- **A school typing course** that children like has a sequence of very short, different
  exercises in each lesson: catching single letters, copying words without a mistake,
  letters again, copying, letters, copying a text, copying flying words, copying, copying a
  text. Two things stand out: action and calm steps alternate, and the content grows from
  letters to words to text inside one lesson.
- **Four-step level structure** (introduce, develop, twist, conclude), known from level
  design in action games: a mechanic is shown safely, then made harder, then turned on its
  head once, then closed with a finale. Our worlds have step 1, 2 (more words) and 4 (the
  boss), but no twist.
- **Saw-tooth difficulty**: each peak a bit higher than the last, with a calm valley
  between them. A boss after a quiet step feels like an event; after four equal steps it
  feels like more of the same.
- **Mixed practice** (interleaving): children who practise skills in a varied order keep
  them better and were more involved than with blocked practice, even if blocked practice
  looks smoother while practising. Different exercise types inside one world are good for
  learning, not only for fun.

## Proposal: every world has the same five roles, each world fills them in its own way
The world keeps its place, picture, music, friends and story. What changes per level is
**the role of the level** and so the kind of activity.

| Level | Role | Feel | What it trains |
|---|---|---|---|
| 1 | **Main game** - the world's own game, shown gently | action, light | the new keys in words |
| 2 | **Calm step** - something still, no flying targets | calm, close | single new and weak keys, or exact words |
| 3 | **Main game, harder** - more words plus one small surprise in the middle | action, peak | speed with control |
| 4 | **Twist** - the world's game turned around, or a different activity in the same place | new, curious | listening, remembering, text, choosing |
| 5 | **Super-obstacle** - as today | finale | the skill the world is about |

This gives the session a saw-tooth: up (1), down (2), higher (3), sideways (4), top (5).
Children learn quickly that "the second one is calm" and "the fourth is a surprise", which
gives a reason to go on to the next level.

### Activity engines (reused, dressed per world)
Each engine is built once and gets the world's picture, objects, sound and one line from
Tapko. Several already exist and only need to run as a normal level.

| Engine | What the child does | Exists? | Fits role |
|---|---|---|---|
| **Main chase** | words fly or roll toward Tapko (today's levels) | yes, per world | 1, 3 |
| **Letter catch** | single characters, many and quick; the new key and the weakest keys come most often | new (simple) | 2 |
| **Clean line** | a still row of 3-6 words; a word counts only when typed without a mistake, a slip clears just that word | new, close to the gate | 2, 4 |
| **Build** | still words sit in slots of a picture; each typed word adds a piece (nest, rocket, constellation); any order | new | 2, 4 |
| **Text page** | 2-5 short lines of the world's story with space and punctuation; the picture comes alive as the text is typed | new, see [story-pages.md](story-pages.md) | 4 |
| **Crossroads** | two or three words, the typed one picks the path or what happens next | yes (planet signs) | 2, 4 |
| **Listen / Remember** | the main chase with dictation or memory targets | yes (styles) | 4 |
| **Rhythm** | short groups to a calm beat | yes (wave, battery, cloud) | 4 |
| **Hide and seek** | short words pop up and hide again | yes (mole, robot family) | 4 |

Main-game surprise in level 3 (cheap variety without a new engine): halfway through, one
thing changes for 20-30 seconds - the wind turns and leaves come from both sides, a short
meteor shower of tiny words, a lightning flash that shows all drops at once, a gust that
brings three bubbles at the same moment. Tapko announces it, it never causes a failure.

### Draft per world (ideas to choose from, not final)
Level 1 and 3 stay the world's main game, level 5 the super-obstacle.

| World | Level 2 (calm) | Level 4 (twist) |
|---|---|---|
| Meadow | *Dew drops*: letters on drops on the grass, each typed one makes a flower open (letter catch) | *Party invitation*: Tapko writes a note for the meadow party, word by word without a slip (clean line); fits the reward, the invitation |
| Space | *Star map*: typed chunks join stars into a constellation (build) | *Radio from base*: mission control says the words (listen), or the captain's log (text page) later |
| Planet | *Signs* as today (crossroads) | *Crystal cave*: a word glows on a crystal and fades (remember) |
| Dragons | *Nest for the babies*: each word adds a twig (build) | *Lullaby*: a short song typed line by line, a baby dragon falls asleep (text page) |
| Egg | *Which way?* forks on the hill (crossroads) | *Night roll*: dark slope, words seen only near the egg's glow (remember, light) |
| Junkyard | *Sorting*: letters on screws and nuts into Bolt's box (letter catch) | *Bolt's manual*: repair steps typed exactly (clean line or text page) |
| Workshop | *Blueprint*: each word draws a part of the new legs (build) | *Fast belt*: the belt hiccups, parts come in short bursts (hide and seek) |
| Rain | *Puddle stones*: still stepping stones across puddles (clean line) | *Fog*: drops mist over after a moment (remember) |
| City | *Timetable*: copy the bus times and stop names (text page with digits) | *Voice door*: the door says its password (listen) |
| Home | *Box labels*: label the moving boxes without a slip (clean line) | *Photo album*: short captions of Bolt's family photos (text page) |
| Garden | *Seeds*: letters dropped into the soil (letter catch) | *Bee dance*: short groups to a buzzing beat (rhythm) |
| Path | *Nest*: copy the words calmly, no voice (build) | *Falling feathers*: a word shows on a feather, then fades as it drifts down (remember) |
| Lake | *Lily stones*: still words on lilies across the lake (clean line) | *Frog choir*: frogs sing the words (listen) instead of reflections |
| Tree | *Falling leaves*: letters on leaves (letter catch) | *Song sheet*: the tree's song lyrics typed as a text (text page) |
| Ball | *Invitations*: cards for the forest friends (clean line) | *Dance steps*: shown steps to a waltz beat, no voice (rhythm) |

In the fairy story level 4 should *flip* the world's style (a dictation world gets a quiet
copy or memory twist), so the story keeps its listening theme but each world still has a
change inside it.

### Rules that keep it TapkoTyper
- Nothing bad happens in any engine: no lives, no timer that ends a level. In the clean line
  a slip clears one word only, never the line, and the level grows a little (see Decisions).
- Calm steps (level 2) are short, about one minute; the saw-tooth needs a short valley.
- Stars still come from accuracy, so a world still has 5 levels x 3 stars and the badges do
  not change. Level ids stay the same.
- Key needs per level stay as they are; the activity adapts to the keys (the meadow calm
  step uses letters, not text, because three keys make no sentence). A replayed level
  already takes words from every key the child knows now; the new key ceiling (see
  Decisions) keeps early worlds easy.
- Each level dot on the map shows a small icon of its activity, so the child sees there is
  something different ahead.
- Rescue missions may draw from the new engines too, which also helps their variety.

## What it touches
- Specs: `game/story.md` (the level list per world), `game/mechanics.md` (new engines and the
  level-3 surprise), `learning/lesson-progression.md` (letter catch uses the new and weak
  keys), `game/super-obstacles.md` (no change), map icons in `experience/visuals.md`.
- Code: `LevelKind` and `LEVELS` in `src/game/levels.ts`, new modes in `src/game/modes/`,
  the key set of a level in `wordSource` (`src/game/runtime/options.ts`), map dots, i18n lines for
  Tapko per engine. No profile data change: ids and stars stay.
- Art: new object sets per world and activity icons for the map, prompts in
  `assets-src/PROMPTS.md` section 9.

## Suggested order (if accepted)
1. Pilot in the meadow: letter catch (level 2), the wind-turn surprise (level 3), clean line
   (level 4). It is the world every child plays first and longest.
2. Play it with a child; keep what works.
3. Build and text page engines, then the remaining worlds of story 1.
4. Stories 2 and 3.

## Decisions (owner, 2026-10-22)
In the formulas below the story order is 1 for the dragon story, 2 for the robot story and
3 for the fairy story.

1. **Fixed roles.** Every world: main game, calm step, harder main game with a surprise,
   twist, super-obstacle.
2. **Letter catch only in level 2** (as one of the calm-step activities), no warm-ups
   before other levels.
3. **A slip in the clean line:** the word turns red and fades out, and the level gets 2
   more words, so a slip means a bit more practice, not a loss. The faded word may come
   back later in the level, but does not have to. The extra words have a ceiling of
   (1 + story order) x 3: 6 in the dragon story, 9 in the robot story, 12 in the fairy
   story, so a child with many slips never ends up in an endless level.
4. **Text in early worlds and a key ceiling.** A replayed level already uses every key the
   child knows now (checked in `wordSource`, `src/game/runtime/options.ts`), so a child who comes
   back to the meadow with more letters gets richer words there, and simple text becomes
   possible. New: each story level gets a key ceiling of its key need + 3 + 2 x story
   order (dragon story need + 5, robot need + 7, fairy need + 9; the meadow 8 to 10 keys).
   When the child knows more, the level takes the keys of its need in lesson order and
   fills the rest with the child's weakest known keys. Text pages use whatever keys the
   level has, so the text is simpler in early worlds.
5. **Fairy story:** level 4 flips the world's style (a dictation world gets memory or a
   quiet copy step, a memory world gets listening).
6. **Five levels per world** as today; stars, badges and key tables stay.
7. **Map icons:** each level dot shows the icon of its activity. The existing icons do not
   fit, so new ones are in `assets-src/PROMPTS.md` section 9.
8. **Art now:** new object sets for every world's calm step and twist, prompts in
   `assets-src/PROMPTS.md` section 9.

## Sources
- Four-step level design (introduce, develop, twist, conclude):
  https://norwichuni.ac.uk/wp-content/uploads/2022/03/nua_game-art_level-design_worksheet.pdf,
  https://www.mcvuk.com/development/video-nintendos-level-design-secrets-in-four-steps
- Saw-tooth difficulty and calm valleys (practitioner advice, not studies):
  https://bugnet.io/blog/difficulty-curves-how-to-get-them-right,
  https://www.abratabia.com/game-design/difficulty-curves.php
- Mixed vs blocked practice in children: https://en.wikipedia.org/wiki/Varied_practice,
  https://sk.pf.jcu.cz/artkey/stk-202501-0001_blokovy-a-stridavy-nacvik-dovednosti-ve-skolni-telesne-vychove.php?l=en,
  https://hrcak.srce.hr/clanak/139178
- Boredom tends to persist in a learning game (small study, 30 pupils):
  https://fas.org/wp-content/uploads/sites/6/2011/03/2011-Sim-and-Gaming-Math-Blaster.pdf
- Novelty and challenge fade from mid-unit when games repeat (74 children):
  https://shapeamerica.confex.com/aahperd/2012/webprogram/Paper17247.html
