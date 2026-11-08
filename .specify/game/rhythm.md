# Rytmus

## What
- **Rytmus** / **Rhythm**: a voluntary side game that teaches typing **evenly**, to a beat. Its card is
  a toy drum. Rhythm is the second goal of the game, after accuracy and before speed, and it is a
  measure of its own: how even the presses are, never letters per minute (that is speed,
  "Rýchlosť", see [mechanics](mechanics.md)).
- **Where:** in every world, the last world of each story too (no exceptions); its node stands after
  the parrot's, on the world's own background. It starts only when the child picks it, never by "Continue".
- **When it opens:** with the world itself, like the [target range](target-practice.md) and the
  parrot, so a child can try it at any moment in the world. In a closed world the node is grey and closed
  and its tooltip says it opens with the world.
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
- **The character** stands at the left, as in the other levels, and does not move. Every 10 to 20
  seconds (at random) it hums a short tune in its bubble ("♪ Tra-la-la ♪", "♪ Hm-hm-hm ♪" ...) when the
  bubble is free and the song runs (not while it waits after a miss). The child moves only the **basket**: a small basket without handles, only a little wider than a lane, right over
  the letter strip at the stage's bottom.
- **The catch band:** behind the basket, across the lanes, a soft glowing band in the space bar's
  colour (white, which no finger lane uses). Its lower edge lies at two thirds of the basket's height
  from its bottom and stays there; the band reaches up by the distance a letter falls during the
  catch window, framed by an opaque white line 3 pixels wide, with one more such line across its middle. The best moment, the beat of the music,
  is a letter in the middle of the band. On each beat the band flashes briefly, the flash centred on
  the beat (as bright just before it as just after), so a key pressed with the flash is the middle of
  the band: a flash that only fades after the beat looks late.
- **Fall:** letters leave their clouds and fall down their lanes at an even speed; exactly one is in the
  middle of the band on each beat. They fall fast enough that the next one is always in the air. A
  falling letter is a white disc with a soft blurred edge and a dark letter, a solid white line
  through its middle a little wider than the disc, to hold against the band's middle line; the next letter, while it
  is in the band, has a ring in its lane's colour instead (its lane is a little brighter all along).
- **The letter strip:** under the basket, across the lanes like the band, a rounded field like the
  typed line of the word levels: the letters caught (green) and missed (grey), the due letter
  marked, the coming ones after it. It moves on letter by letter, the due letter stays near one
  point, its ends fade out.
- **Keys:** a lane's letter slides the basket under that lane, where it stays until the next key; after
  a catch it goes back to rest between the middle lanes, under none of them: once the letter dropped in it
  glides back softly (about a quarter of a second), at once with Simple graphics or less motion. A short
  slide out and a soft way back stay calm for children; no quick shaking movement.
  - The next letter's key while that letter is in the band **catches** it: it drops into the basket
    with a note of the music. A catch in the middle half of the band is "in time" and sparkles (not
    with Simple graphics or less motion).
  - The right key **before or after the band**, and **any other key**, at any time, is an **error**:
    accuracy and the key statistics count it, the lane flashes. The first early press says once to wait
    until the letter is in the band. The letter can still be caught.
  - **Missed:** the band passes; the letter falls on through its lane and disappears below the stage's
    edge, its lane flashes. A miss is not an error, but everything **stops**: the other letters stand
    still, the keys wait (nothing counts) and "Počkaj…" stands in front by the coming letter, halfway between the clouds and the band, with a blinking
    pause sign (two bars) above it, and in the character's bubble. After a moment the letters move on at
    half the speed (at most three seconds) until the next letter is in the middle of the band; only then
    "Teraz pokračuj." replaces "Počkaj…" and the song waits there for its key; that catch counts as
    caught but not in the rhythm, a wrong key there is an error.
- **Back from a pause** (Esc and back, or the pause button): no miss and nothing counted, but the child
  gets time to find the key again: the due letter glides into the middle of the band (a letter already in
  the band stays the due one) with "Počkaj…" and the blinking pause sign, then "Teraz pokračuj." and the
  song waits for its key, as after a miss; that catch counts as caught but not in the rhythm.
- **Words over the basket**, as dance games tell the timing: a catch in the middle half of the band is
  in time and in half of the cases one of "Super", "Paráda", "Presne", "Skvelé" rises over the basket
  (white); a little before it, up to three quarters of the way to the band's edge, "Spomaľ" (light
  blue), a little after it "Pridaj" (orange); in the last quarter "Skoro" (light blue) or "Neskoro"
  (orange). The timing words come every time. A catch while the song waited says nothing.
- **Nobody types:** after the first miss the song waits at the next letter, so the round never runs on
  without the child.
- **The basket** is one picture: only its front part (the front rim and side), without its back rim
  and inside, so a caught letter drops behind the front rim into it and is gone.
- **Tempo** (letters a minute, 30 to 120): each round plays at **one tempo** from its first letter to
  its last; it never changes during the song. It is the child's **one tempo**, shared by the Rytmus of
  every world: a better round in one world is where the next round in any world starts, and it never
  drops by itself. The first round ever starts at 70 % of the child's usual speed of the last 14 days,
  at most the played world's target tempo (a new child 30).
  How the **whole round** went moves the next round's tempo one step (10 %), by its timing, never by
  its wrong keys: with nine in ten letters caught and seven in ten of the catches in time (the middle
  half of the band) the rhythm was very even and the next round goes **faster**; with four in ten in
  time it **stays**; below that, or with fewer than nine in ten caught, the next round goes **slower**.
  Catches while the song waited count as caught but not for the timing. Wrong keys still count in
  accuracy, the statistics and the rhythm score. Only the tempo range bounds the step, no world's
  target. Below 60 the music plays twice as fast and a letter lands on every second beat.
- **When it goes badly** the game helps, without changing the tempo: the catch window is a third of a
  beat (0.35) each side of the beat at the start; each **phrase** of 16 landings with fewer than nine in
  ten letters caught (judged as the next phrase's first letter leaves its cloud) widens it by 0.05, up to half a beat,
  so the band grows upwards, and adds one phrase to the round, at most a third of it in all. Other
  steps keep the window: a good rhythm is never made harder to hit.
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
  It replaces the world's track during the round, and the sound level "only where it matters" plays it.
  Everything Rytmus plays (the song and the caught letters' notes) is about as loud as the story levels'
  effects at the same sound level, louder than the menus' music.
  With the sound off there is no sound at all; the letters keep the same beat.
- **Before the round** the get-ready card says: "V tomto písaní si precvičíš pravidelný rytmus. Ovládaš
  košík, ktorý chytá písmenká padajúce z obláčikov. Tie musíš chytiť v správnom čase, ináč spadnú na
  zem. Stále je však dôležité aby to bolo presne. Ak niečo nechytíš, nevadí. Za výborný rytmus získaš
  jednu rytmickú notu."
  With the sound off ("Bez zvukov", [audio](../experience/audio.md)) one more card follows, before the first
  letter: "V tejto hre je rytmus sprevádzaný hudbou. Odporúčam ti zapnúť si hudbu pre celú stránku, alebo
  aspoň pre túto hru. Hudbu a efekty na stránke si môžeš vypnúť kliknutím na tlačidlo reproduktora." with
  **Zapnúť všade** (the default: sound everywhere), **Zapnúť kde je potrebné** (sound only where it
  matters) and **Nezapínať** (also the round X and Escape: nothing changes). The round starts only after it.
  With any other sound level the card is not shown.
- **Round:** 80 % of a regular level of the world's story (1.6, 2.4 and 3.2 minutes) of song after the
  count-in bar (pauses stop it), longer when it goes badly.
  No points, no stars, no Enter marks. The keys count in the statistics and the lesson like the parrot's, and the
  parent's surprises counting time are asked and told.
- **Top bar:** the pause, the title, the progress, then the three rings every level has
  ([feedback](../learning/feedback.md)), always all three here whatever the settings, as the beat is
  the game: Presnosť (its keys, a check while it is 100 %), Rytmus (the beat score of the last 16
  landings, a check at 100; "…" while it listens, before 8) and Rýchlosť (the tempo in letters a
  minute, the ring full at 120).
- **No time pressure** (parent switch): the song waits while the due letter sits on the basket's rim
  until it is typed; such a round keeps no rhythm score.
- **The rhythm score** (0-100) is measured against the beat: each catch's offset from its landing in
  beats, around the child's own steady lean (their median: a child who is always a little early is
  even), their mean distance from 0.1 beat (100) to 0.3 beat (0), times the share caught, and never
  more than accuracy allows (no cap from 95 %, 50 at 85 %, 0 at 75 %). It is the same at every tempo.
  Words: 0-39 "hľadáme rytmus", 40-69 "pekný rytmus", 70-89 "plynulý", 90-100 "ako hodinky". A round
  needs 12 landings for a score.
- **End card** (the one card of every end): "Písanie v rytme!" with the basket full of a heap of letters; four rows in
  this order: accuracy, rhythm ("82 zo 100, plynulý"), the round's tempo ("Tempo za minútu: 42 písmen"),
  "Chytené písmená: 80 z 90" and what the round did to the tempo: "Ďalšie kolo: rýchlejšie: 46 písmen"
  (or "rovnaké tempo: 42 písmen", "pomalšie: 38 písmen"). The green line: a new highest tempo of
  this world, else a rhythm better than the world's last round, else the usual news (new letters).
  "Hrať znova" and "Mapa svetov".
- **Rhythm notes:** a round with rhythm 80 or more at 95 % accuracy or more (with time pressure) earns
  one rhythm note of the world it was played in; the end card's green line says so with the note's
  picture and its world. The notes stand in "Môj rytmus" ([statistics](../profiles/statistics.md)) as
  pictures to look at; they bring no music. They fly away like the parrots: a **random** note goes for every
  three days without a Rytmus round, counted from the day after the last one (played on Monday: all
  still there on Thursday, one fewer on Friday morning, then on Monday, Thursday ...). Like the parrots
  they fly out of sight, checked once a day when the player becomes active; the World map tells it
  once, in the character's bubble: "Bez Rytmu ti uletela nota." ("... uleteli noty." for more), and
  when the treble clef went with it: "Bez Rytmu ti uletela nota a s ňou aj husľový kľúč. Zahraj si
  Rytmus a získaš ho späť." A note is a picture of a half note, a
  quarter note, an eighth note or two beamed eighths, each note always the same kind, turned by its
  own angle and in a colour of its own, one of eight well spread hues; in a row a note never has the
  kind or the colour of the one before it, so the row looks lively. High contrast shows the pictures'
  own colours.
- **The treble clef:** held while every open world has at least one of the notes kept (and there is
  one). It stands before the notes in "Môj rytmus" and counts 5 points in the treasure chest
  ([statistics](../profiles/statistics.md)); a note flying away can take it away, the next note of
  that world brings it back.
- **Kept per world:** the last round's rhythm and the highest tempo held; the worlds with the check.
  The round's rhythm score also goes into the day's statistics, like the evenness of the other levels.
  **Kept per child:** the base tempo of the next round (of any world), the notes with their worlds, the
  day of the last round, the fades taken since and how many of them the map has told.

## Why
- Accuracy comes first, then rhythm, then speed. The story levels can measure speed; a beat can
  **teach** rhythm: the child sees and hears when the next press is due, as typing courses once used a
  metronome. Bursts of known letters and long hunts for others show at once.
- The press counts only around the landing: "any time before" would let a child type the visible
  letters in one burst and wait, which trains reading ahead, not rhythm.
- Lanes in finger colours tell which finger types the letter without looking at the keyboard.
- One clock for the music and the letters keeps the beat exact on a slow computer: a slow frame never
  moves a landing. Generated music changes tempo at any bar and never drags.
- Misses cost nothing but the catch: a child who cannot keep up lets a letter fall, gets a moment to
  find the next key while everything stands still, and the tempo steps down and the band grows by
  itself. Letters falling on after a miss would be too many to catch and would only pile up misses.
- The band shows where and when the press is due without a word; the ideal is its middle, so pressing
  early is as wrong as pressing late. A press that catches nothing is an error: otherwise pressing all
  the time would catch everything.
- The character stays put and only the basket moves: the eye follows the letters and the basket, not
  a running figure.
- Four pictures of one fixed colour each could show three blue notes in a row; a colour of each
  note's own keeps a row of rewards lively.
- Notes reward a great rhythm, and fading notes ask for a little Rytmus every few days, as rhythm is
  kept by practice.
- Two lanes are enough to start: four clouds at a fast tempo were too hard for the first world. The
  lanes grow with the stories, and the letter changes come only once a story's letters are known.
- Rytmus is hard to play without its music, and a child who switched the sound off long ago does not
  think of it: the card before the round asks once per round, and offers sound for this game only. It is
  the owner's one exception to "only the key cards and one get-ready card before play".
- One tempo through the whole song: a beat that changes while the child plays, even by a slow drift,
  takes away the steady pulse the game is there to teach. The round's result is told on the end card,
  so the child knows what the next round brings. A good phrase never narrows the band. A round shorter
  than a level keeps it a short side game.
- The character's humming every 10 to 20 seconds keeps it alive next to the falling letters without
  asking for the child's eyes.
- The clef asks for Rytmus in every world, not only in the child's favourite, and gives the notes a
  goal beyond their count.
- One tempo for all worlds: rhythm is the child's skill, not a world's; a tempo kept per world made a
  child who had found a good pace start slow again in every new world. It never drops by itself, as a
  slower start after a break only made the child climb back up.
- The tempo follows the timing, not typos: a child who keeps the beat but hits a wrong key now and
  then is still in rhythm, and slowing down would not fix the wrong key. Steps of 10 % between rounds let a child who is on
  the beat reach their pace in a few rounds.
- After a miss the slow glide and the blinking pause sign show that the game waits; "go on" comes only
  when the letter is where it should be caught.
