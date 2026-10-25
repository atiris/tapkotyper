# Statistics

## What
- Per key: accuracy and typical reaction time from the **last 50 presses only**, the keys
  typed instead of it lately, total presses, and a day-by-day history (accuracy and time
  to press).
- An overlay opened by clicking the child's character (on the map, or in a level, which pauses first)
  starts with "My progress": a row of icon and number chips (keys mastered of the
  layout's total, stories finished, worlds finished, the **treasure chest** of rarities in points
  of its maximum (a world badge bronze 1, silver 2, gold 3; each target range award 1: 15 x 3 +
  15 = 60), and once something was typed in the last
  14 days its accuracy and speed in characters per minute, the stars (the best of every level)
  of the maximum (3 in each of the 75 levels: 225) and the letters
  typed in the last 14 days, each with its own picture; the meaning is only in the tooltip), then one row per story (all stories, closed ones grey) with its picture and
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
- The overlay has three tabs: **Postup** (the progress above, a big Tapko, the growth
  medals and the stars as the last chip; stories come before worlds),
  **Klávesy** (the key map and the key details) and **Cvičenia** (the history of exercises
  from a teacher or parent, newest first, each with a button for its QR code).
- The child's character on the Postup tab is big (beside the summary, above it on a phone)
  and plays when clicked or pressed with Enter or Space: it hops, or pulls another face for
  a moment, never the same twice in a row; with reduced motion it only changes its face.
- QR codes (an exercise's result, or all of the player's statistics from the Postup tab) fill
  the whole screen until clicked; the caption and frame colour tell an exercise from all
  statistics, and a button at the bottom copies the code to send to the teacher. The code for
  all statistics is a result link like any other, so the teacher's table takes it as one row
  per child.
- The parent dashboard has the same clickable key map, and the trends over sessions
  (accuracy, rhythm, time per day) as charts side by side on wide screens.

- A key is **mastered** when, over its last 30 recorded presses, at least 90 % are right and
  the median reaction time is within the speed limit of the child's difficulty (the same limit
  that readies a key for the next lesson). This is long-term: it is computed from the stored
  key statistics, so it fades when the child stops typing the key well.

- **Maintenance:** the maxima shown (stars 225, chest 60) follow from the levels, worlds and
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
