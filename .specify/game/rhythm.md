# Rytmus

## What
- **Rytmus** / **Rhythm**: a voluntary side game that teaches typing **evenly**, to a beat. Its card is
  a metronome. Rhythm is the second goal of the game, after accuracy and before speed, and it is a
  measure of its own: how even the presses are, never letters per minute (that is speed,
  "Rýchlosť", see [mechanics](mechanics.md)).
- **Where:** in every world except the last world of each story, which has the
  [hero's journey](heros-journey.md) there instead; its node stands after the parrot's. It starts only
  when the child picks it, never by "Continue". **Built so far: the first world (the meadow).** The
  other worlds get it later, each with its own background (and, in the space worlds, letters that
  fall over the edge instead of splatting).
- **When it opens:** in the first world as soon as four letters are ready (their last presses accurate
  enough to move on, [lesson progression](../learning/lesson-progression.md)); in a later world with its
  super level, like the [target range](target-practice.md). Before that the node is grey and closed and
  its tooltip says when it opens. A check under the node once a phrase at the world's target tempo
  went at 95 % accuracy or more with at least nine in ten letters caught; the target tempo is the
  story's slow pace as letters (8, 10, 12 words a minute: 42, 54, 60 letters a minute).
- **Letters:** the world's letters (those of its last level) that are ready. **Lanes:** one per finger
  of them, never the thumbs, in keyboard order from the left little finger; each lane is coloured like
  its finger on the on-screen keyboard. On top of each lane a white cloud carries the lane's letter.
  The clouds are pictures (five shapes, also mirrored), the letters are drawn on them.
- **Fall:** letters leave their clouds and fall down their lanes at an even speed; exactly one lands on
  each beat of the music, on the basket's rim. They fall fast enough that the next one is always in the
  air when one lands. The next letter to land is clearly marked: it is a word label like the targets
  of the story levels, its next letter highlighted, and its lane is brighter; the other letters are
  white discs ringed in their lane's colour.
- **Catching:** Tapko stands on the ground holding a woven basket. The right key in the **catch window**
  (from half a beat before the landing to a quarter of a beat after) makes him dash under the lane, and
  the letter drops into the basket on the beat with a note of the music. A catch within an eighth of a
  beat of the landing is "in time" and sparkles (not with Simple graphics or less motion).
  - **Earlier** the right key does nothing: the letter blinks; the first time Tapko says to wait until it
    reaches the basket. It is not an error and not a catch.
  - **Any other key**, at any time, is an **error**: the letter wobbles, its lane flashes, accuracy counts
    it; the letter can still be caught.
  - **Missed:** the window passes; the letter falls on (off Tapko's basket when he stands under it) and
    splats on the ground with a soft plop. A miss is not an error.
- **The basket** is a picture in five fills (empty, a few letters, more, almost full, full); it fills
  with the share of the letters caught that a round at its start tempo brings, so a good round ends
  with a full basket.
- **Tempo** (letters a minute): 30, 36, 42, 48, 54, 60, 70, 80, 90, 100, 110, 120. A round starts at the
  world's tempo of the last round (one step lower after a week without playing); the first round at
  the step at or below 70 % of the child's usual speed of the last 14 days, at most 60 (a new child 30).
  The tempo changes only between **phrases** of 16 landings, by one step: up when the phrase went at
  95 % accuracy or more and nine in ten caught, down below 85 % accuracy or with fewer than seven in ten
  caught (errors weigh more than misses); it is decided as the next phrase's first letter leaves its
  cloud. A faster phrase is announced by a short run in the music. Below 60 the music plays twice as
  fast and a letter lands on every second beat.
- **Order of the letters:** first the two index fingers in turn, then mirror pairs of the hands (d k
  f j), then neighbours of one hand, then free, the letters with the lowest recent accuracy (a third of
  them, at most three) a little more often; the same letter twice in a row only in the second half of
  the round.
- **Changing letters** (story 2 and 3 worlds, and story 1's worlds with more letters per finger): a
  lane's letter changes once a round in the dragon story, twice in the robot story and three times in
  the fairy story, to another ready letter of the same finger: the cloud dissolves and a new cloud
  with the new letter comes down; no letter of that lane is in the air meanwhile. A world without a
  second letter on any finger (the meadow) has no change.
- **Music** is made by the game from patterns (soft kick, shaker, bass, a marimba melody in sections,
  a woodblock count-in bar, a closing chord), on the same clock as the falling letters, so every
  landing is exactly on a beat and the sound reaches the speaker when the letter reaches the basket.
  It replaces the world's track during the round. With the sound off there is no sound at all; the
  letters keep the same beat.
- **Round:** three minutes of song after the count-in bar (pauses stop it). No points, no stars, no
  paws, no Enter marks. The keys count in the statistics and the lesson like the parrot's, and the
  parent's surprises counting time are asked and told.
- **Top bar:** the pause, the title, the progress, then three rings: accuracy (%), rhythm (a number of
  the last 16 landings; "…" while it listens, before 8) and the tempo. The speed gauge is not shown.
- **No time pressure** (parent switch): the song waits while the due letter sits on the basket's rim
  until it is typed; such a round keeps no rhythm score.
- **The rhythm score** (0-100) is measured against the beat: each catch's offset from its landing in
  beats, around the child's own steady lean (their median: a child who is always a little early is
  even), their mean distance from 0.06 beat (100) to 0.25 beat (0), times the share caught, and never
  more than accuracy allows (no cap from 95 %, 50 at 85 %, 0 at 75 %). It is the same at every tempo.
  Words: 0-39 "hľadáme rytmus", 40-69 "pekný rytmus", 70-89 "plynulý", 90-100 "ako hodinky". A round
  needs 12 landings for a score.
- **End card** (the one card of every end): "Rytmus dohraný!" with the basket at its fill; four rows in
  this order: accuracy, rhythm ("82 zo 100, plynulý"), the highest tempo held for a whole phrase
  ("Tempo za minútu: 42 písmen") and "Chytené písmená: 80 z 90". The green line: a new highest tempo of
  this world, else a rhythm better than the world's last round, else the usual news (new letters).
  "Hrať znova" and "Na mapu".
- **Kept per world:** the tempo to start with, the day, the last round's rhythm and the highest tempo
  held; the worlds with the check.

## Why
- Accuracy comes first, then rhythm, then speed. The story levels can measure speed; a beat can
  **teach** rhythm: the child sees and hears when the next press is due, as typing courses once used a
  metronome. Bursts of known letters and long hunts for others show at once.
- The press counts only around the landing: "any time before" would let a child type the visible
  letters in one burst and wait, which trains reading ahead, not rhythm.
- Lanes in finger colours tell which finger types the letter without looking at the keyboard.
- One clock for the music and the letters keeps the beat exact on a slow computer: a slow frame never
  moves a landing. Generated music changes tempo at any phrase end and never drags.
- Misses cost nothing but the catch: a child who cannot keep up just lets letters splat, and the tempo
  steps down by itself.
