# Rytmus

## What
- **Rytmus** / **Rhythm**: a voluntary side game that teaches typing **evenly**, to a beat. Its card is
  a metronome. Rhythm is the second goal of the game, after accuracy and before speed, and it is a
  measure of its own: how even the presses are, never letters per minute (that is speed,
  "Rýchlosť", see [mechanics](mechanics.md)).
- **Where:** in every world, the last world of each story too (no exceptions); its node stands after
  the parrot's, on the world's own background. It starts only when the child picks it, never by "Continue".
- **When it opens:** with the world finished, like the [target range](target-practice.md) and the
  parrot. Before that the node is grey and closed and its tooltip says it opens with the world finished.
  A check under the node once a phrase at the world's target tempo went at 95 % accuracy or more with at
  least nine in ten letters caught; the target tempo is the story's slow pace as letters (8, 10, 12
  words a minute: 40, 50, 60 letters a minute).
- **Lanes, by the world's place in its story:** story 1 from two lanes in its first world to four in
  its last, story 2 from four to six, story 3 from four to eight, spread over the worlds (story 1:
  2, 2, 3, 3, 4; story 2: 4, 4, 5, 5, 6; story 3: 4, 5, 6, 7, 8).
- **Letters:** the world's letters (those of its last level) that are ready (all of them while too few
  are). One lane per finger, never the thumbs; the round plays the fingers of the newest letters (latest
  in the lesson order), and the lanes always stand **left to right as the fingers sit on the keyboard**
  (with "a" and "p", "a" is at the left, "p" at the right). Each lane is coloured like its finger on the
  on-screen keyboard, a little saturated, and reaches down to the stage's bottom edge. On top of each
  lane a white cloud carries the lane's letter. The clouds are pictures (three compact shapes, also
  mirrored), each only a little wider than its lane, and they stand close together. The lanes stand
  right of the character; when many lanes do not fit there they reach over the character, and when even
  that is too narrow the lanes, clouds, letters and basket all get smaller to fit.
- **The character** stands at the left, as in the other levels, and does not move. The child moves
  only the **basket**: a small basket without handles, only a little wider than a lane, at the height
  of the character's feet.
- **The catch band:** behind the basket, across the lanes, a soft glowing band in the space bar's
  colour (white, which no finger lane uses). Its lower edge lies at two thirds of the basket's height
  from its bottom and stays there; the band reaches up by the distance a letter falls during the
  catch window, framed by an opaque white line 3 pixels wide, with one more such line across its middle. The best moment, the beat of the music,
  is a letter in the middle of the band.
- **Fall:** letters leave their clouds and fall down their lanes at an even speed; exactly one is in the
  middle of the band on each beat. They fall fast enough that the next one is always in the air. A
  falling letter is a white disc with a soft blurred edge and a dark letter, a solid white line
  through its middle a little wider than the disc, to hold against the band's middle line; the next letter, while it
  is in the band, has a ring in its lane's colour instead (its lane is a little brighter all along).
- **Keys:** a lane's letter slides the basket under that lane, where it stays until the next key.
  - The next letter's key while that letter is in the band **catches** it: it drops into the basket
    with a note of the music. A catch in the middle half of the band is "in time" and sparkles (not
    with Simple graphics or less motion).
  - The right key **before or after the band**, and **any other key**, at any time, is an **error**:
    accuracy and the key statistics count it, the lane flashes. The first early press says once to wait
    until the letter is in the band. The letter can still be caught.
  - **Missed:** the band passes; the letter falls on through its lane and disappears below the stage's
    edge, its lane flashes. A miss is not an error, but everything **stops**: the other letters stand
    still, the keys wait (nothing counts) and "Počkaj…" stands in front over the band, with a blinking
    pause sign (two bars) above it, and in the character's bubble. After a moment the letters move on at
    half the speed (at most three seconds) until the next letter is in the middle of the band; only then
    "Teraz pokračuj." replaces "Počkaj…" and the song waits there for its key; that catch counts as
    caught but not in the rhythm, a wrong key there is an error.
- **Words over the basket**, as dance games tell the timing: a catch in the middle half of the band is
  in time and in half of the cases one of "Super", "Paráda", "Presne", "Skvelé" rises over the basket
  (white); a little before it, up to three quarters of the way to the band's edge, "Spomaľ" (light
  blue), a little after it "Pridaj" (orange); in the last quarter "Skoro" (light blue) or "Neskoro"
  (orange). The timing words come every time. A catch while the song waited says nothing.
- **Nobody types:** after the first miss the song waits at the next letter, so the round never runs on
  without the child.
- **The basket** is one picture: only its front part (the front rim and side), without its back rim
  and inside, so a caught letter drops behind the front rim into it and is gone.
- **Tempo** (letters a minute, 30 to 120): each round has its own **base** and follows it. The base is
  the world's kept tempo (5 % lower after a week without playing); the first round's is 70 % of the
  child's usual speed of the last 14 days, at most the world's target tempo (a new child 30). The tempo
  changes only between **phrases** of 16 landings, by a small step of 5 % of the base, at most four steps
  (20 %) above or below it: up when the phrase went at 95 % accuracy or more and nine in ten caught, down
  below 85 % accuracy or with fewer than seven in ten caught (errors weigh more than misses); it is
  decided as the next phrase's first letter leaves its cloud. The next round's base moves only one step
  (5 %) from this round's, towards where its last phrase went, and never above one and a half times the
  world's target tempo. A faster phrase is announced by a short run in the music. Below 60 the music
  plays twice as fast and a letter lands on every second beat.
- **When it goes badly** the game helps: the catch window is a third of a beat (0.35) each side of the
  beat at the start; each phrase that steps the tempo down widens it by 0.05, up to half a beat, so the
  band grows upwards, and adds one phrase to the round, at most a third of it in all. A phrase that
  steps up keeps the window: a good rhythm is never made harder to hit.
- **Order of the letters:** first the two index fingers in turn, then mirror pairs of the hands (d k
  f j), then neighbours of one hand, then free. A free phrase is made of **dictionary words** (two to six
  letters, from the child's word language) that use only the lanes' letters at that moment, whole words
  one after another, when at least three such words exist; otherwise, and for a tail no word fits, single
  letters, the ones with the lowest recent accuracy (a third of them, at most three) a little more often,
  the same letter twice in a row only in the second half of the round.
- **Changing letters** (the second half of each story's worlds: its fourth and fifth): a lane's letter
  changes once a round in the dragon story, twice in the robot story and three times in the fairy story,
  spread over the round, the lanes taking turns: the lane's cloud and its beam fade out, a new cloud with
  the new letter comes down and its beam grows down from it, and new letters fall. The new letter is one
  of the round's letters not on a lane now, of the same finger or of a finger not played, whose finger
  sits between the neighbouring lanes' (so the lanes stay left to right; the beam takes that finger's
  colour); one not shown in the round yet first. No letter of that lane is in the air meanwhile. A change
  no lane can take is left out.
- **Music** is made by the game from patterns (soft kick, shaker, bass, a marimba melody in sections,
  a woodblock count-in bar, a closing chord), on the same clock as the falling letters, so every
  landing is exactly on a beat and the sound reaches the speaker when the letter reaches the basket.
  It replaces the world's track during the round. With the sound off there is no sound at all; the
  letters keep the same beat.
- **Before the round** the get-ready card says: "V tomto písaní si precvičíš pravidelný rytmus. Ovládaš
  košík, ktorý chytá písmenká padajúce z obláčikov. Tie musíš chytiť v správnom čase, ináč spadnú na
  zem. Stále je však dôležité aby to bolo presne. Ak niečo nechytíš, nevadí. Za výborný rytmus získaš
  jednu rytmickú notu."
- **Round:** half of a regular level of the world's story (1, 1.5 and 2 minutes) of song after the
  count-in bar (pauses stop it), longer when it goes badly.
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
  even), their mean distance from 0.1 beat (100) to 0.3 beat (0), times the share caught, and never
  more than accuracy allows (no cap from 95 %, 50 at 85 %, 0 at 75 %). It is the same at every tempo.
  Words: 0-39 "hľadáme rytmus", 40-69 "pekný rytmus", 70-89 "plynulý", 90-100 "ako hodinky". A round
  needs 12 landings for a score.
- **End card** (the one card of every end): "Písanie v rytme!" with the basket full of a heap of letters; four rows in
  this order: accuracy, rhythm ("82 zo 100, plynulý"), the highest tempo held for a whole phrase
  ("Tempo za minútu: 42 písmen") and "Chytené písmená: 80 z 90". The green line: a new highest tempo of
  this world, else a rhythm better than the world's last round, else the usual news (new letters).
  "Hrať znova" and "Mapa svetov".
- **Rhythm notes:** a round with rhythm 80 or more at 95 % accuracy or more (with time pressure) earns
  one rhythm note of the world it was played in; the end card's green line says so with the note's
  picture and that it brings the world's music. A note brings its world's **music to the menus**: the
  new note's world music plays on the World map (and in the free practice) instead of the usual menu
  music, until the child picks another note in "Môj rytmus" ([statistics](../profiles/statistics.md)) or
  the last note of that world fades. They fade: a **random** note goes for every three days without a
  Rytmus round, counted from the day after the last one (played on Monday: all still there on Thursday,
  one fewer on Friday morning, then on Monday, Thursday ...). A note is a picture of a half note, a
  quarter note, an eighth note or two beamed eighths, each note always the same kind and turned by its
  own angle.
- **Kept per world:** the base tempo of the next round, the day, the last round's rhythm and the highest
  tempo held; the worlds with the check. **Kept per child:** the notes with their worlds, the day of the
  last round and the fades taken since, and the world whose music the menus play.

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
  kept by practice. A note's own world music on the map makes it something to keep.
- Two lanes are enough to start: four clouds at a fast tempo were too hard for the first world. The
  lanes grow with the stories, and the letter changes come only once a story's letters are known.
- Small tempo steps around the round's own base keep the round steady: a rhythm game follows the
  child's rhythm and swings around it instead of racing up to extremes; a good phrase never narrows the
  band. A round half as long as a level keeps it a short side game.
- After a miss the slow glide and the blinking pause sign show that the game waits; "go on" comes only
  when the letter is where it should be caught.
