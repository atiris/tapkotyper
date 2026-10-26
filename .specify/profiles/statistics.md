# Statistics

## What
- Per key: accuracy and typical reaction time from the **last 50 presses only**, the keys
  typed instead of it lately, total presses, and a day-by-day history (accuracy and time
  to press).
- An overlay opened by clicking the child's character (on the map, or in a level, which pauses first)
  starts with "My progress": two rows of icon and number chips, each with its own picture and
  the meaning only in the tooltip. The first row is the long run: keys mastered of the layout's
  total, stories finished, worlds finished, the **treasure chest** of rarities in points of its
  maximum (a world badge bronze 1, silver 2, gold 3; each target range award 1; the
  [Parrot badge](../game/parrot.md) 7: 15 x 3 + 15 + 7 = 67), the parrots at home against the most
  ever at home (the parrot's head), and the stars (the best of every level) of the maximum (3 in
  each of the 75 levels: 225). The second row is the last 14 days: accuracy and speed in
  characters per minute once something was typed, and the letters typed. Then one row per story (all stories, closed ones grey) with its picture and
  name, its worlds' pictures (done in colour, the rest grey) and the stars earned in it, the
  shelf of world badges ("Odznaky svetov", [story](../game/story.md)) with the row of target
  range awards under it ("Ocenenia zo strelníc": every world's rare thing, found ones in
  colour, [target range](../game/target-practice.md)), and when
  the child last trained (today, yesterday, n days ago) with the minutes of the last 7
  days. Below it a friendly view of the keys: a keyboard colored
  by how well each key goes, the 3 keys to practice, the growth medals earned, and a
  button to practice them now. Clicking a key (or a key in the list) shows that key's
  details: its finger, accuracy, what it is mixed up with, its history, and a one-minute
  practice of just that key. A switch ("⇧ symbols") shows the shifted symbols of the keys
  instead (question mark, exclamation mark, colon, Slovak digits), each with its own
  statistics; capitals count for their letter and its Shift.
- **My progress** ("Môj postup") is a page of its own, opened by the map's button, with a top
  bar ("Back" to the map and the title) like the other pages, and four tabs: **Postup**,
  **Klávesy** (with the trends over the last sessions: accuracy, rhythm and time per day,
  side by side on wide screens), **Úrovne** (the levels grouped by story, a heading with the
  story's picture and title, and by world, one row of level cells per world, each cell with
  its three stars, filled or empty, in a fixed place; beside each world's name its parrot and
  its rare range thing, in color once won, grey until then, so nothing a world gives is missing
  from the list) and **Cvičenia**. Under the progress sit
  "QR kód celého postupu" and "Certifikát" ([parent controls](parent-controls.md)).
- Once a parrot was ever won, the summary row has a **parrot** chip: the parrot's picture and
  "2 max 5", the parrots at home now and the most that were home at once; the tooltip says it
  in words ([parrot](../game/parrot.md)). Secret words on the page start the badge show
  ([easter eggs](../experience/easter-eggs.md)).
- The overlay (a quick look, only by a click on the character) has three tabs: **Postup** (the progress above, a big Tapko, the growth
  medals and the stars as the last chip; stories come before worlds),
  **Klávesy** (the key map and the key details) and **Cvičenia** (the history of exercises
  from a teacher or parent, newest first, each with a button for its QR code).
- The Parrot badge, when held, sits just under the child's character on the Postup tab.
- The child's character on the Postup tab is big (beside the summary, above it on a phone), in
  its outfit, and lively: every 5 to 20 seconds its big smile turns into the usual one and back.
  Clicked or pressed with Enter or Space it pulls another face at once (wondering too, never the
  same twice in a row), half the time with a hop; the smiles then go on. With reduced motion it
  only changes its face.
- QR codes (an exercise's result, or all of the player's statistics from the Postup tab) fill
  the whole screen until clicked; the caption and frame colour tell an exercise from all
  statistics, and a button at the bottom copies the code to send to the teacher. The code for
  all statistics is a result link like any other, so the teacher's table takes it as one row
  per child.

- A key is **mastered** when, over its last 30 recorded presses, at least 90 % are right and
  the median reaction time is within the speed limit of the child's difficulty (the same limit
  that readies a key for the next lesson). This is long-term: it is computed from the stored
  key statistics, so it fades when the child stops typing the key well.

- **Maintenance:** the maxima shown (stars 225, chest 67) follow from the levels, worlds and
  range things; when their number changes, the new maximum must be shown and written here
  (a unit test pins both numbers, so a change cannot slip by).

## Why
- Statistics a parent or teacher reads must be the child's own typing; a level passed by a
  tester would make them lie.
- A child asks "how am I doing?" in whole steps (stars, worlds, days), not per key; the
  progress answers that first, and the key details stay for the curious.
- The character is the child's own figure; a friend that reacts to a click makes the
  progress page warm instead of a report card.
- Knowing the problem keys turns mistakes into a clear, small next step.
- Old mistakes must not weigh on a key the child already fixed: only recent presses
  count, while the history still shows the way there.
