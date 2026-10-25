# Activity catalog: the kinds of games a level can be

**Status:** owner's decisions 2026-10-25 (see Decisions); spread over worlds still a draft.
**Prio:** P1 (feeds the world plan after the meadow playtest). **Effort:** L, engine by engine.

[world-rhythm.md](world-rhythm.md) fixed the five roles of a world (main game, calm step,
harder main game, twist, super-obstacle). This file names the activities that fill the roles,
says how each one gets harder, and spreads them over the worlds. Each activity has one
standard name, used in the map tooltip and Tapko's lines, instead of "main game".

## The activities

| Name (sk / en) | What the child does | Today | Role |
|---|---|---|---|
| **Prúd slov** / Word stream | words fly or roll toward Tapko, typed before they arrive | every world's main game | 1, 3 |
| **Čakajúce slová** / Waiting words | still words of 2+ letters wait on objects; each starts with a different letter | dew drops (2 letters) | 2 |
| **Odpis** / Copy | a still line or a short text, typed in order | - | 2, 4 |
| **Odpis pribúdajúci** / Growing copy | copy, but each slip adds words | invitation | 2, 4 |
| **Odposluch** / Dictation | a voice says a word or several words in a row; nothing written | dictation style of the main game | 4 |
| **Tajné slová** / Secret words | a word shows for a moment and hides; typing starts after it hides | memory style, mole | 4 |
| **Pexeso** / Memory pairs | cards with words; typing a word flips its card; two equal objects are won | new | 4 |
| **Skladačka** / Jumble | a longer word with swapped letters; the child types the right word | new | 4, 2-3 times only |
| **Strelnica** / Target range | side card: a thrown thing passes rings, each with a word | yes | side |
| **Papagáj** / Parrot | side card: the same few words repeated until the fingers know them | new, see below | side |

Engines already in [world-rhythm.md](world-rhythm.md) fold into these names: crossroads
(planet signs) is a waiting-words variant where the typed word picks the way; build (nest,
star map) is waiting words where each word adds a piece; text page is a longer copy; rhythm
and hide-and-seek are word-stream variants (beat, pop-up).

### Rules of each

- **Word stream:** stays as is; the level-3 surprise (gust) is its harder form.
- **Waiting words:** the different first letters are the point. Before the first letter the
  game cannot know which key the child meant, so a key that starts no word counts only in the
  level's accuracy (a round error), not in a key's statistics. After the first letter the word
  is chosen and each wrong key counts against the expected key. So there are at most as many
  words at once as different first letters: 3 in the meadow, which is fine for the very first
  level. New words keep coming until the level's minimum time is played. Done in the meadow
  (2026-10-25); the dew drops will still be reworked.
- **Copy:** the standard form, one line to a few lines, a slip only counts.
- **Growing copy:** a slip turns the word red, it fades, and 2 new words come (3 in a
  super-obstacle), up to the ceiling (1 + story order) x 3 of extra words.
- **Dictation:** several words in a row instead of sentences. **The text must be fully
  audible:** only lowercase, no commas, question marks, dashes or other marks, only words from
  the dictionary (no pseudo-words, drills or names), and words long enough not to blur in
  speech. Slovak also writes some sounds two ways, so skip words where the hearing does not
  decide the spelling: a voiced consonant that sounds voiceless at the word's end or before
  another consonant (dub sounds like "dup", vták like "vtak"), and i/y, í/ý after consonants
  where both are possible (bili/bily). The same applies to the dictation style of the main
  game already in the code.
- **Secret words:** the show time follows the child's typing pace (a slower typist reads
  slower). A wrong key shows the word again for a moment and hides it; a second wrong key in
  the same word leaves it fully visible.
- **Memory pairs:** a calm level, speed does not matter. 6, 8, 10 or 12 cards. Each card shows a
  word; typing it flips the card and shows the world's object behind it (a bee, a flower, a
  screw); two equal objects are won, two different turn back after a moment. A won card is not
  typed again. Objects are the world's existing sprites, not pictures of the words.
- **Jumble:** not a standard level, 2 to 3 places in the robot and fairy story, no time limit,
  a calm level. A longer word comes with swapped letters (easy 1 swap, medium 2, hard 3). Each
  wrong key undoes one swap (first slip the first swap back, second slip the second), so the
  word repairs itself as the child struggles. No pictures. Only the original word counts.
- **Target range:** stays as specified in `.specify/game/target-practice.md`.

## The parrot

**Owner's decision:** slow typing is not cheating here, the point is the practice. So the
parrot does not judge speed. A world's parrot is done when every word was repeated as asked.

**Place:** the last card of each world, after the target range, with a parrot symbol instead
of stars. It never starts by itself, only when the child picks it.

**Round:**
1. *Learning:* the words come in turn, each 3 times (dom strom časy dom strom časy dom strom
   časy). The parrot repeats each typed word.
2. *Repeating:* each word on its own, several times in a row (dom dom dom dom, strom ...).
   A wrong key adds 2 more repetitions of that word instead of an error; at most +6 per word,
   so a round always ends.

**Size by story and world** (proposal; story order s = 1 dragon, 2 robot, 3 fairy; world in the
story w = 1 to 5):

| | Dragon story | Robot story | Fairy story |
|---|---|---|---|
| Words | 3 | 4 | 5 |
| Word length | 2-4 (worlds 1-2), 3-5 (worlds 3-5) | 4-5, then 4-6 | 5-6, then 5-7 |
| Repeats per word in phase 2 | 3 | 4 | 5 |

Words come from the world's own keys, real words where the keys allow it, preferring the
child's weakest keys; new words each time the parrot is played. A round takes about 1 to 3
minutes (the fairy story: 5 words x 8 times x 6 letters is about 240 keys).

**Parrots fly away:** so the parrots are practised again now and then.
- Each day the child plays, one roll per day since the last check: 20 % chance that one
  parrot flies away (picked at random among the done ones). A child back after 13 days gets 13
  rolls.
- The count never drops below the highest count ever reached minus 3, and the last parrot
  never flies (so the floor is max(1, best - 3)).
- 21 days after the last parrot was won, the count drops straight to that floor.
- The child gets a message when a parrot flew away; its world card shows the parrot as not
  done until the child plays it again (it can be an easy meadow or a hard fairy world).
- The **Papagáj** badge on the profile needs the parrot of every world the child has opened;
  a parrot flying away takes the badge away until it is won back.
- The badge is worth 7 points in the treasure chest of rarities (the chest's maximum grows
  from 60 to 67). It is the one badge shown next to the player's name: on the start page's
  player card, just under the character on "Môj postup", and on the player's map.
- The badge picture is `ui-badge-parrot` (the macaw on a round branch). Implementation plan: `.todo/67-parrot.md`.
- The world card carries a parrot icon next to the target (`ui-act-parrot`, a macaw): grey while that
  world's parrot is not won (or flew away), in full colour when it is won and counted.

Is it too complicated? For the child it is simple: "a parrot flew away, go get it back". The
rules underneath are only the daily roll, the floor and the 21-day drop, all in one place.

## Ideas dropped

Ink fog (blind copy), sentence puzzle and name it (owner, 2026-10-25).

## Difficulty knobs

| Activity | Easier | Harder |
|---|---|---|
| Word stream | slower, shorter words, fewer at once | faster, longer words, surprise in the middle |
| Waiting words | 2-3 letters, 3 words | 4-6 letters, 5 words |
| Copy, growing copy | one line of short words | several lines, punctuation, capitals |
| Dictation | 1-2 words, repeat allowed | 3-5 words in a row, longer words |
| Secret words | longer show, short words | shorter show, longer words, two at once |
| Memory pairs | 6 cards | 8, 10, 12 cards |
| Jumble | 1 swap | 2-3 swaps, longer words |
| Parrot | see the parrot table | |

## Spread over the worlds (draft)

Level 1 and 3 stay word stream, level 5 the super-obstacle; each world also has the target
range and the parrot cards.

| World | Level 2 (calm) | Level 4 (twist) |
|---|---|---|
| Meadow | Waiting words (dew drops) | Growing copy (invitation) |
| Space | Waiting words, build (star map) | Dictation (radio from base) |
| Planet | Waiting words, crossroads (signs) | Secret words (crystal cave) |
| Dragons | Waiting words, build (nest) | Copy, text page (lullaby) |
| Egg | Waiting words, crossroads (which way) | Secret words (night roll) |
| Junkyard | Waiting words (sorting screws) | Growing copy (Bolt's manual) |
| Workshop | Waiting words, build (blueprint) | Memory pairs, 6-8 cards (spare parts) |
| Rain | Copy (puddle stones) | Jumble (washed-out signs) |
| City | Copy, text page (timetable) | Dictation (voice door) |
| Home | Copy (box labels) | Memory pairs, 8-10 cards (photo album) |
| Garden | Waiting words (seeds) | Memory pairs, 10-12 cards (seed packets) |
| Path | Waiting words, build (nest) | Secret words (falling feathers) |
| Lake | Copy (lily stones) | Dictation (frog choir) |
| Tree | Copy, text page (song sheet) | Jumble (tangled song) |
| Ball | Growing copy (invitations) | Jumble (magic letters) |

The fairy story keeps level 4 flipping the world's style (world-rhythm decision 5).

## Map icons

Each activity has an icon on its level dot (`ui-act-*`, prompts in `assets-src/PROMPTS.md`
section 9). Missing: waiting words, memory pairs, jumble, the parrot card.

## Decisions (owner, 2026-10-25)

1. Waiting words: 3 at once in the meadow is fine; words come again until the time is played;
   dew drops are 2-letter words now.
2. Memory pairs: 6, 8, 10, 12 cards, a calm level.
3. Jumble: 2-3 places in the robot and fairy stories, no time limit, each slip undoes a swap.
4. Secret words: a slip shows the word again briefly, a second slip shows it fully; show time
   follows the typing pace.
5. Copy in two forms: standard and growing (+2 words a slip, +3 in a super-obstacle, capped).
6. Dictation: several words instead of sentences; only audible text (see its rules).
7. Target range unchanged.
8. Parrot: a side card in each world after the range, no stars, flies away as described,
   badge for all parrots; speed is not judged.
9. No pictures of words.
10. Parrot badge: 7 chest points, the one badge next to the player's name (start card,
    "Môj postup", map); a grey or coloured parrot icon on each world card.
11. Ink fog, sentence puzzle and name it are dropped.
