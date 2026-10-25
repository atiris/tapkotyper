# Activity catalog: the kinds of games a level can be

**Status:** brainstorm with the owner's list (2026-10-25), not decided. **Prio:** P1 (feeds the
world plan after the meadow playtest). **Effort:** L, engine by engine.

[world-rhythm.md](world-rhythm.md) fixed the five roles of a world (main game, calm step,
harder main game, twist, super-obstacle). This file names the activities that fill the roles,
says how each one gets harder, and spreads them over the worlds. Each activity has one
standard name, used in the map tooltip and Tapko's lines, instead of "main game".

## The activities

| Name (sk / en) | What the child does | Today | Role |
|---|---|---|---|
| **Prúd slov** / Word stream | words fly or roll toward Tapko, typed before they arrive | every world's main game | 1, 3 |
| **Čakajúce slová** / Waiting words | still words of 2+ letters wait on objects; each starts with a different letter, every letter is typed | dew drops (single letters) | 2 |
| **Odpis** / Copy | a still line or a short text, typed in order; a slip clears one word | invitation (one line) | 2, 4 |
| **Odposluch** / Dictation | a voice says a word, later a phrase or a sentence; nothing written | dictation style of the main game | 4 |
| **Tajné slová** / Secret words | a word shows for a moment and hides; typing starts only after it hides | memory style, mole | 4 |
| **Pexeso** / Memory pairs | cards with words on the back; typing a word flips its card; two equal pictures are won | new | 4 |
| **Skladačka** / Jumble | a longer word with swapped letters; the child types the right word | new | 4 |
| **Strelnica** / Target range | special: a thrown thing passes rings, each with a word | yes, after the super level | special |
| **Papagáj** / Parrot | special: repeating the same few words until they get faster | new, see below | special |

Engines already in [world-rhythm.md](world-rhythm.md) fold into these names: crossroads
(planet signs) is a waiting-words variant where the typed word picks the way; build (nest,
star map) is waiting words where each word adds a piece; text page is a longer copy; rhythm
and hide-and-seek are word-stream variants (beat, pop-up).

### Notes on each

- **Word stream:** stays as is; the level-3 surprise (gust) is its harder form.
- **Waiting words:** the different first letters are the point. Before the first letter the
  game cannot know which key the child meant, so a key that starts no word counts only in
  the level's accuracy (a round error), not in a key's statistics. After the first letter the
  word is chosen and each wrong key counts against the expected key. So the number of waiting
  words is at most the number of different first letters the level's keys allow (in the
  meadow 3 to 4 words). Single letters (today's dew drops) remain only where the level has too
  few keys for words.
- **Copy:** grows from one line (invitation) to 2-5 lines with spaces and punctuation (story
  pages).
- **Dictation:** needs the voice for phrases and sentences, today only words. Show the text
  after it is typed, never before.
- **Secret words:** must not punish a slow reader: the word stays until the child has looked
  at it (at least the reading time of its length), and the voice can repeat it once on request.
- **Memory pairs:** good as a twist, but it has less typing per minute than other activities
  (looking and remembering take time). Keep the grid small (6-12 cards) and the level short.
  A word won once is not typed again; a wrong pair turns back after a moment.
- **Jumble:** trains reading and spelling more than fingers, and swapped letters are hard for
  a young reader. Easy: one swap of two neighbour letters, medium: two swaps, hard: three swaps
  (from words of 6+ letters). Only words from the child's word list; a picture hint under the
  word. Accept only the original word, even if the swap makes another real word. Place it in
  the robot and fairy story, not in the dragon story.
- **Target range:** stays special as specified in `.specify/game/target-practice.md`.

## The parrot: repeat until it is faster

The aim is muscle memory: the same words again and again, until the fingers know them.
The owner's form: learning (3-5 words, each about 3 times in turn: dom strom časy dom strom
časy ...), then testing (each word up to 5 tries to be faster than in learning; a wrong key
voids the try).

**The cheat:** typing slowly while the parrot learns makes every test easy. Four rules close it.

1. **The parrot also knows the child's usual pace.** The game already keeps the reaction time
   of the last presses of every key (`profile.stats.keys[key].recent`). The usual time of a
   word is the sum of the median times of its keys. The parrot's goal for a word is the
   *faster* of the learning time and the usual time. Slow learning cannot push the goal past
   the child's normal pace, so it gains nothing.
2. **The clock runs from the first key to the last.** Reading time and waiting before the
   first key do not count, so waiting cannot be used to look slow or fast.
3. **The best of the learning repetitions counts, not the first.** The third repetition is
   usually the fastest; taking the best of the three means the child has to improve over
   their own best, not over a cold start.
4. **The parrot remembers.** It keeps the best time of each of its words from earlier visits
   (per world, its words stay the same). On a later visit the goal is the fastest of
   learning, usual pace and the record, so the child sees real progress over days, and the
   first visit's slowness never helps again.

**Goal for a try:** at least 5 % faster than the goal time, and no wrong key. Five percent is
small enough to reach by repetition alone, large enough not to happen by chance.

**What the child sees:** the parrot repeats each word in its own voice after the child types it
in learning; in testing it nods for a faster try and shows a feather; a word passed is "learned"
and the parrot says it proudly. Up to 5 tries per word; a word not passed is "still learning",
no failure.

**Evaluation:** stars come from accuracy, as everywhere (no new star rule). Beside the stars the
end screen shows, per word, how much faster it got than the goal (for example "strom o 12 %
rýchlejšie") and the parrot's feathers (one per learned word). The per-word records are what
the parents' statistics can show as fluency progress.

**Where:** a second optional node next to the target range, opened with the world's super level
like the range. The range trains accuracy of weak letters, the parrot trains fluency of whole
words, so the two side nodes have different jobs. Words: 3 words in the dragon story (3, 4 and
5 letters), 4 in the robot story, 5 in the fairy story, from the world's own keys.

## New ideas outside the groups above

- **Atramentová hmla** / Ink fog (blind copy): the child copies a line, but the typed letters
  hide under ink at once; only a soft tick or a soft buzz says right or wrong. At the end of the
  line the ink clears and shows what was typed. It trains trust in the fingers instead of
  watching each letter appear. Fits the fairy story twist (night, magic ink).
- **Poskladaj vetu** / Sentence puzzle: the words of a short sentence lie in a mixed order; the
  child types them in the order that makes sense, and the sentence comes alive as a picture
  ("drak spí v jaskyni"). It trains reading for meaning and spaces between words, not new
  keys. Robot and fairy story.
- **Pomenuj** / Name it: a picture without a word (a cup, a ball); the child types its name. A
  short hint shows the first letter after a few seconds, the whole word after more. It trains
  writing a word from memory, the step between copying and free writing. Only words from the
  child's keys; good for the robot story onward.

## Difficulty knobs

| Activity | Easier | Harder |
|---|---|---|
| Word stream | slower, shorter words, fewer at once | faster, longer words, surprise in the middle |
| Waiting words | 2-3 letters, 3 words | 4-6 letters, 5 words, similar starts |
| Copy | one line of short words | several lines, punctuation, capitals |
| Dictation | single words, repeat allowed | phrases, then sentences, one repeat |
| Secret words | long show time, short words | short show time, longer words, two at once |
| Memory pairs | 6 cards, short words | 12 cards, longer words |
| Jumble | 1 swap of neighbours | 2-3 swaps, longer words |
| Parrot | 3 short words | 5 words up to 5 letters, record from earlier visits |

## Spread over the worlds (draft)

Level 1 and 3 stay word stream, level 5 the super-obstacle. Level 2 is a calm activity,
level 4 a twist. Difficulty grows story by story; the activity mix widens.

| World | Level 2 (calm) | Level 4 (twist) |
|---|---|---|
| Meadow | Waiting words (dew drops, 2 letters) | Copy (invitation) |
| Space | Waiting words, build (star map) | Dictation, words (radio from base) |
| Planet | Waiting words, crossroads (signs) | Secret words (crystal cave) |
| Dragons | Waiting words, build (nest) | Copy, text page (lullaby) |
| Egg | Waiting words, crossroads (which way) | Secret words (night roll) |
| Junkyard | Waiting words (sorting screws) | Copy (Bolt's manual) |
| Workshop | Waiting words, build (blueprint) | Memory pairs (spare parts) |
| Rain | Copy (puddle stones) | Jumble, 1 swap (washed-out signs) |
| City | Copy, text page (timetable) | Dictation, phrases (voice door) |
| Home | Copy (box labels) | Sentence puzzle (photo album captions) |
| Garden | Waiting words (seeds) | Name it (what grew) |
| Path | Waiting words, build (nest) | Secret words (falling feathers) |
| Lake | Copy (lily stones) | Dictation, sentences (frog choir) |
| Tree | Copy, text page (song sheet) | Jumble, 2-3 swaps (tangled song) |
| Ball | Copy (invitations) | Ink fog (magic letters) |

The fairy story keeps its rule that level 4 flips the world's style (see world-rhythm
decision 5); the table respects it where the world is a dictation world. Memory pairs, jumble,
sentence puzzle, name it and ink fog appear only from the robot story on, when the child has
enough keys for real words.

## Open questions for the owner

1. Waiting words in the meadow: change dew drops from letters to 2-letter words now, or keep
   letters there and start words in space?
2. Parrot as a side node next to the range (proposal), or as level 2 of some worlds?
3. Of the three new ideas, which to keep?
4. Jumble and memory pairs need pictures for words (hint and card face): new art per word, or
   text only?
