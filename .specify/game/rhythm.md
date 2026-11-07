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
  its finger on the on-screen keyboard, a little saturated, and reaches down to the stage's bottom
  edge. On top of each lane a white cloud carries the lane's letter. The clouds are pictures (three
  compact shapes, also mirrored), each only a little wider than its lane so it never reaches over the
  lanes beside it, and they stand fairly close together; the letters are drawn on them.
- **The character** stands at the left, as in the other levels, and does not move. The child moves
  only the **basket**: a small, flat, shallow tray without handles at the height of the character's
  feet.
- **The catch band:** behind the basket, across the lanes, a soft glowing band in the space bar's
  colour (white, which no finger lane uses). Its lower edge lies at two thirds of the basket's height
  from its bottom and stays there; the band reaches up by the distance a letter falls during the
  catch window, framed by an opaque white line 3 pixels wide. The best moment, the beat of the music,
  is a letter in the middle of the band.
- **Fall:** letters leave their clouds and fall down their lanes at an even speed; exactly one is in the
  middle of the band on each beat. They fall fast enough that the next one is always in the air. A
  falling letter is a white disc with a soft blurred edge and a dark letter; the next letter, while it
  is in the band, has a ring in its lane's colour instead (its lane is a little brighter all along).
- **Keys:** a lane's letter slides the basket under that lane, where it stays until the next key.
  - The next letter's key while that letter is in the band **catches** it: it drops into the basket
    with a note of the music. A catch within an eighth of a beat of the beat is "in time" and sparkles
    (not with Simple graphics or less motion).
  - The right key **before or after the band**, and **any other key**, at any time, is an **error**:
    accuracy and the key statistics count it, the lane flashes. The first early press says once to wait
    until the letter is in the band. The letter can still be caught.
  - **Missed:** the band passes; the letter falls on through its lane and disappears below the stage's
    edge, its lane flashes. A miss is not an error, but everything **stops**: the other letters stand
    still, the keys wait (nothing counts) and the character says "Počkaj…". After a moment the next
    letter glides into the middle of the band, the character says "Teraz pokračuj." and the song waits
    there for its key; that catch counts as caught but not in the rhythm, a wrong key there is an error.
- **Words over the basket:** after a catch in time one of "Super", "Paráda", "Presne", "Skvelé" rises over
  the basket in half of the cases; after any other catch one of "Dobre", "OK", "Áno" in three of ten.
- **Nobody types:** after the first miss the song waits at the next letter, so the round never runs on
  without the child.
- **The basket** is one picture: only its front part (the front rim and side), without its back rim
  and inside, so a caught letter drops behind the front rim into it and is gone.
- **Tempo** (letters a minute): 30, 36, 42, 48, 54, 60, 70, 80, 90, 100, 110, 120. A round starts at the
  world's tempo of the last round (one step lower after a week without playing); the first round at
  the step at or below 70 % of the child's usual speed of the last 14 days, at most 60 (a new child 30).
  The tempo changes only between **phrases** of 16 landings, by one step: up when the phrase went at
  95 % accuracy or more and nine in ten caught, down below 85 % accuracy or with fewer than seven in ten
  caught (errors weigh more than misses); it is decided as the next phrase's first letter leaves its
  cloud. A faster phrase is announced by a short run in the music. Below 60 the music plays twice as
  fast and a letter lands on every second beat.
- **When it goes badly** the game helps: the catch window is a third of a beat (0.35) each side of the
  beat at the start; each phrase that steps the tempo down widens it by 0.05, up to half a beat, so the
  band grows upwards, and adds one phrase to the round, at most a third of it in all (a minute). A phrase that steps
  up narrows it again by 0.05, back to the start.
- **Order of the letters:** first the two index fingers in turn, then mirror pairs of the hands (d k
  f j), then neighbours of one hand, then free. A free phrase is made of **dictionary words** (two to six
  letters, from the child's word language) that use only the lanes' letters at that moment, whole words
  one after another, when at least three such words exist; otherwise, and for a tail no word fits, single
  letters, the ones with the lowest recent accuracy (a third of them, at most three) a little more often,
  the same letter twice in a row only in the second half of the round.
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
- **Before the round** the get-ready card says: "V tomto písaní si precvičíš pravidelný rytmus. Ovládaš
  košík, ktorý chytá písmenká padajúce z obláčikov. Tie musíš chytiť v správnom čase, ináč spadnú na
  zem. Stále je však dôležité aby to bolo presne. Ak niečo nechytíš, nevadí. Za výborný rytmus získaš
  jednu rytmickú notu."
- **Round:** three minutes of song after the count-in bar (pauses stop it), longer when it goes badly.
  No points, no stars, no paws, no Enter marks. The keys count in the statistics and the lesson like the parrot's, and the
  parent's surprises counting time are asked and told.
- **Top bar:** the pause, the title, the progress, then three rings: accuracy (%, a check while it is
  100 %), rhythm (a number of the last 16 landings, a check at 100; "…" while it listens, before 8) and
  the tempo, shown like the speed gauge: the wave, the tempo only as the ring's fill (full at 120) and
  in its tooltip. The speed gauge itself is not shown.
- **No time pressure** (parent switch): the song waits while the due letter sits on the basket's rim
  until it is typed; such a round keeps no rhythm score.
- **The rhythm score** (0-100) is measured against the beat: each catch's offset from its landing in
  beats, around the child's own steady lean (their median: a child who is always a little early is
  even), their mean distance from 0.06 beat (100) to 0.25 beat (0), times the share caught, and never
  more than accuracy allows (no cap from 95 %, 50 at 85 %, 0 at 75 %). It is the same at every tempo.
  Words: 0-39 "hľadáme rytmus", 40-69 "pekný rytmus", 70-89 "plynulý", 90-100 "ako hodinky". A round
  needs 12 landings for a score.
- **End card** (the one card of every end): "Písanie v rytme!" with the basket full of a heap of letters; four rows in
  this order: accuracy, rhythm ("82 zo 100, plynulý"), the highest tempo held for a whole phrase
  ("Tempo za minútu: 42 písmen") and "Chytené písmená: 80 z 90". The green line: a new highest tempo of
  this world, else a rhythm better than the world's last round, else the usual news (new letters).
  "Hrať znova" and "Mapa svetov".
- **Rhythm notes:** a round with rhythm 80 or more at 95 % accuracy or more (with time pressure) earns
  one rhythm note; the end card's green line says so with the note's picture. The notes are the child's
  own, not per world. They fade: one goes for every three days without a Rytmus round, counted from the
  day after the last one (played on Monday: all still there on Thursday, one fewer on Friday morning,
  then on Monday, Thursday ...). A note is a picture of a half note, a quarter note, an eighth note or
  two beamed eighths, each note always the same kind and turned by its own angle.
- **Kept per world:** the tempo to start with, the day, the last round's rhythm and the highest tempo
  held; the worlds with the check. **Kept per child:** the notes counted at the last round and its day.

## Why
- Accuracy comes first, then rhythm, then speed. The story levels can measure speed; a beat can
  **teach** rhythm: the child sees and hears when the next press is due, as typing courses once used a
  metronome. Bursts of known letters and long hunts for others show at once.
- The press counts only around the landing: "any time before" would let a child type the visible
  letters in one burst and wait, which trains reading ahead, not rhythm.
- Lanes in finger colours tell which finger types the letter without looking at the keyboard.
- One clock for the music and the letters keeps the beat exact on a slow computer: a slow frame never
  moves a landing. Generated music changes tempo at any phrase end and never drags.
- Misses cost nothing but the catch: a child who cannot keep up lets a letter fall, gets a moment to
  find the next key while everything stands still, and the tempo steps down and the band grows by
  itself. Letters falling on after a miss would be too many to catch and would only pile up misses.
- The band shows where and when the press is due without a word; the ideal is its middle, so pressing
  early is as wrong as pressing late. A press that catches nothing is an error: otherwise pressing all
  the time would catch everything.
- The character stays put and only the basket moves: the eye follows the letters and the basket, not
  a running figure.
- Notes reward a great rhythm, and fading notes ask for a little Rytmus every few days, as rhythm is
  kept by practice.
