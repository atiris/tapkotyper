# Rytmus: a rhythm game

Date: 2026-11-07. Proposal (P1-P2), the owner's ideas analysed, one design recommended.
Icon: a metronome. Read with [../learning/rhythm-measure.md](../learning/rhythm-measure.md)
(how rhythm is measured), [`../../.specify/game/parrot.md`](../../.specify/game/parrot.md) and
[`../../.specify/game/target-practice.md`](../../.specify/game/target-practice.md) (the other
voluntary side cards), [`../../.specify/architecture.md`](../../.specify/architecture.md)
(performance, audio). Sources: **[bg]** general knowledge of beat-based games, Web Audio timing
and typing pedagogy; not verified in this pass.

## Why a game of its own
- Rhythm (even key presses) is the owner's second goal, after accuracy and before speed. The
  story levels can only measure it; a game with a beat can **teach** it: the child hears and sees
  when the next press is due, the way typing courses once used a metronome.
- Single letters on a beat need almost no reading, so it suits the youngest players and opens
  early (after four keys).

## The owner's ideas

### 1. Falling letters in columns (dance-pad style)
At least 4 columns once 4 keys are known; on every beat exactly one letter lands and disappears;
the child types it before it lands. A 3-minute track, tempo can rise, the beat sounds when a letter
lands. Themes: screws or gears into a basket, flowers caught before they fall into water;
horizontal: a slit where a fast insect is photographed, snowflakes caught in a globe.

- **Fit to the measure:** good if the press is tied to the landing. With "any time before it
  lands" a child can type four visible letters in one burst and then wait: that trains
  reading ahead and speed, not rhythm, and the beat measure has nothing to compare with.
  So the press must count in a **catch zone** around the landing (below).
- **Columns as fingers:** if each column is a finger (the letter falls in the column of the
  finger that types it, columns in keyboard order, left hand left), the screen shows which
  finger to use without looking at the keyboard. This is the strongest point of the idea.
- **Reading load:** one letter per object, a few on screen. Low.
- **Looking at the keyboard:** a beat punishes looking down (the next letter lands meanwhile),
  which is a gentle push to keep eyes up; finger columns give the help that the keyboard would.
- **Weak devices:** a few sprites per column, one still background; cheap.
- **Horizontal variant:** rows instead of columns lose the left-right finger mapping (rows
  do not match the keyboard), so it is weaker for learning; keep it as a later theme only.

### 2. Conveyor belt
Letters move in regular steps; the letter in the middle window must be typed while it is there,
otherwise the rhythm meter drops; typed correctly, its object falls through the window into a
basket below.

- **Fit to the measure:** the step is a clear beat, and the window is a natural catch zone.
- **Strong visual beat:** move, stop, move: great with sound off and for children who hear
  poorly.
- **Reading load:** lowest of all: one letter in the window, the next ones visible in the row.
- **Weak:** no finger mapping (all letters pass the same window), and a window open for the whole
  beat measures only "in time", not how close to the beat. Less lively to watch.

### A better variant? Merge them
The best parts combine: **finger columns** from idea 1, the **clear stepping beat and the window**
from idea 2. Objects fall in finger columns, but in steps: they jump one row down on every beat
and rest in between (as on a belt), so the beat is visible in every object on screen; the bottom
row is the catch zone (the basket's rim). No third separate idea is needed.

## Recommended design: "Rytmus" (finger columns, stepped fall)

### Rules
- **Columns:** one per finger of the ready letter keys, in keyboard order (left little finger
  far left ... right little finger far right); at least 4 (the first four keys `d f j k` give
  left middle, left index, right index, right middle). Up to 8 finger columns; a second key of a
  finger (`f` and `g`, `r`) falls in the same column, shown by its letter.
- **Fall:** objects appear at the top and step down one row on every beat, at rest between
  steps (a short eased jump, not a smooth slide). Exactly one object reaches the bottom row
  (the rim) on each beat, in some column. 3 to 5 rows above the rim, so the child sees the
  next 3 to 5 letters.
- **Catch zone:** an object is catchable from half a beat before it reaches the rim until a
  quarter beat after. Zones of two objects never overlap. Only that object is active: it is
  outlined, its column's rim glows.
- **Hit:** the right key inside the zone catches it: the object drops into the basket with a soft
  clink **on the beat** (the clink is part of the music, not the key press). Grade by the offset
  from the landing beat: within 0.12 of a beat "v rytme" (a small gold sparkle), otherwise "chytené".
- **Early:** the right key before the zone does nothing but a small "počkaj" blink of the
  object: not an error, not a catch. Several early presses of the same key count nothing.
- **Wrong key:** a key that is not the active object's key, at any time, is an **error**: the
  object wobbles, the right finger's column flashes softly, accuracy counts it. The object can
  still be caught in its zone.
- **Miss:** the zone passes without the right key: the object slips past the basket (the flower
  floats away on the water, the screw rolls off) with a soft sound. Nothing is lost, the next
  ones come. A miss is not an error and does not touch accuracy.
- **Accuracy first:** errors weigh more than misses everywhere: in the tempo steps (below), in the
  end card's order and in the rhythm score cap (`shown = min(beat score, accuracy cap)`).
- **Round:** 3 minutes of play (pauses do not count), the tempo adapts inside it. The parrot's
  2 minutes is the nearest comparison; 3 minutes fits the owner's track length.

### Letters
- Only **ready** keys (the lesson's 89 % rule), so the round trains fluency, not new keys; the
  three ready keys with the lowest recent accuracy come a little more often.
- Patterns, from easy to harder as the tempo rises: hand alternation (`f j f j`), mirror pairs
  (`d k`), same hand neighbours (`d f`), then short syllables from the dictionary spelled over
  the columns (a caption above the field shows the syllable, so it is read once, not letter by
  letter). Same key twice in a row only from the second half of the round.
- No capitals or diacritics in the MVP. Later a combo letter (`ó`, a capital) gets a zone one
  beat longer and comes only on a slower beat, since it needs two presses.

### Tempo
- Tempo is **letters per minute** (one landing per beat). Steps: 30, 36, 42, 48, 54, 60, 70,
  80, 90, 100, 110, 120. Below 60 the music plays at twice the tempo and a letter lands on every
  second beat, so the music never drags.
- **Start:** the step at or below 70 % of the child's usual speed of the last 14 days (the
  existing `GAUGE_DAYS` source), at least 30, at most 60. A new child starts at 30.
- **Steps happen only at phrase ends:** every 16 landings (four bars of four beats):
  - up one step when the phrase had accuracy >= 95 % **and** caught >= 90 %;
  - down one step when accuracy < 85 % **or** caught < 70 %;
  - else it stays. Never below 30. Never more than one step per phrase.
- A step up is told by the music (a short fill) and a small arrow on the metronome, never by a
  countdown. The tempo follows the child: a child who plays steadily at 42 stays at 42 for the
  whole round and that is a good round.
- The tempo the round ended at is kept per world and is the next round's start (one step lower
  after a week without playing).
- **No time pressure** (parent switch): the beat waits. The active object stops on the rim and
  the music holds a soft pad until it is typed; the round is a calm practice and stores no
  rhythm score (only accuracy and speed).

### What the child sees during play
- The finger columns with their objects, the baskets under the rim, Tapko beside the field
  (cheers on a phrase with no errors).
- Top bar: the accuracy ring first, then the rhythm ring (the beat score over the last 16
  landings), then a small swinging metronome with the tempo number. No points, no combo
  counter, no streak.
- Visual beat always on: every object steps on the beat, the active rim pulses, the metronome
  swings. With reduced motion the steps stay (they are the game) but without the eased bounce and
  sparkle; the pulse becomes a colour change. No flashing over a small area, at most 2 per second.

### Scoring and the end card
- Per round: accuracy (correct presses / all presses that were not early), caught / due,
  rhythm (the beat measure from [rhythm-measure.md](../learning/rhythm-measure.md): mean absolute
  offset around the child's own median, relative to the beat, times the catch share, capped by
  accuracy), the highest tempo held for a whole phrase.
- **End card** (the one fixed end card of every end): in this order: accuracy %, rhythm 0-100
  with its word ("ako hodinky"), the tempo reached ("42 písmen za minútu"), caught X of Y. The
  green news line: a new highest tempo, or a rhythm better than the last round. No stars.
- The round counts in the statistics and the lesson like the parrot and the target range (key
  presses with reaction times; the session's `rhythm` field from the beat measure).

### Where it lives and when it opens
- A voluntary side card in **every world**, after the parrot node, with a metronome picture:
  the world's theme and the world's ready keys. It starts only when picked, never by "Continue".
- **Unlock:** in the first world it opens as soon as four letter keys are ready (the owner's
  condition), before the super level; in later worlds it opens with the world's super level, like
  its neighbours. Before that it is grey and closed with a tooltip saying when it opens.
- Award: a check under the node once a round in that world held the world's target tempo
  (the story's speed of that world, e.g. the dragon story 8 words a minute, about 40 letters) for
  a whole phrase at >= 95 % accuracy. No badge in the MVP; the world's range award is untouched.

## Audio and timing
- **One clock:** the Web Audio clock is the master. Beats are scheduled ahead (a timer every
  25 ms schedules everything in the next 150 ms, the pattern the synthesized loop in
  `src/audio/audio.ts` already uses). Object positions are computed from that clock each frame
  (`row = beatsUntilLanding`), never counted in frames, so a slow frame does not move the beat.
- **Key times:** the key event's `timeStamp` (performance clock) is mapped to the audio clock
  with `AudioContext.getOutputTimestamp()`; the landing time on the speaker is the scheduled time
  plus `outputLatency`.
- **Calibration:** a default from `outputLatency` (and `baseLatency`), plus an optional
  "tap with the beat" check (8 taps on a beat with sound, the median offset is the device's
  correction), kept per device like the graphics decision. Bluetooth headphones add a fifth of a
  second or more **[bg]**, so the check is offered when the first round shows a large steady
  bias (most catches late by more than 0.2 beat).
- **Sound off:** there is no audio context (off is real silence); the same scheduler runs on the
  performance clock, and the visual beat is the only beat. The beat measure then needs no audio
  correction.

## Music for a variable tempo
| Way | Good | Bad |
|---|---|---|
| Time-stretch a recorded track (the owner's Gemini music) | sounds like real music | stretching more than about 20 % sounds wrong; a generated track has no exact beat grid, so landings drift off the beat; changing tempo at a phrase end is hard; a 3-minute file per world |
| The same track rendered at several fixed tempos, switch at phrase ends | exact beats if rendered so | the music source cannot promise one tempo per render; several files per world |
| **Generated at runtime from patterns** (drums, bass, chords, a short melody; synthesized, later short samples) | every note is scheduled by the same clock as the landings, so the beat is exact; tempo changes at any phrase end for free; tiny; endless, so 3 minutes are no limit | needs care to sound pleasant; a few voices only on weak devices |

Recommended: **generated patterns**. A song is a list of 4-bar phrases in sections (intro,
A, B, A, bridge, A) giving 3 minutes without obvious repetition; each world picks its sound
(the meadow soft marimba and shaker, the robot story clicks and synth bass). The landing clink
is a note of the song. At most 6 voices at once (weak devices). The owner's recorded tracks stay
for the levels and the menu.

## Weak devices
- One still background (the bands copied as one picture, as in a calm scene), the field drawn on
  top: at most about 30 small objects (8 columns x 4 rows). Each letter is a cached label (drawn
  once per look, as all labels are).
- Simple graphics: no sparkle particles, baskets without shadows, the stepping bounce dropped.
  Timing never depends on the frame rate, so a slow computer plays the same beat.
- The game is one more mode chunk, loaded with its card; it imports only `modes/kit/`.

## MVP and later
**MVP**
- Finger columns (4-8), single ready letters, stepped fall, catch zone, early / wrong / miss rules.
- One theme: flowers caught in baskets before they fall into the pond (meadow), reused in all
  worlds with the world's background.
- Generated pattern music, one style, tempo steps and the phrase rule; default latency from the
  audio context; visual beat; sound off and "no time pressure" handled.
- End card rows; the session's `rhythm` field; the node and its unlock.

**Later**
- Themes per story: gears and screws into a basket (robot), snowflakes into a globe (fairy).
- The tap calibration check; syllables over the columns; combo letters with longer zones.
- A horizontal theme (insects through the slit) as a look, not a different rule.
- More music styles per world; short samples instead of pure synthesis.
- A calm conveyor look (one window, no columns) for the youngest or for one-hand players.

## Open questions for the owner
1. **Catch zone or deadline:** the recommendation counts a press only around the landing (half a
   beat before to a quarter after), not "any time before it lands". Agree?
2. **One card per world or one for the whole story?** The proposal puts one in every world next
   to the parrot, with the world's keys and theme.
