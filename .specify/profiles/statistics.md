# Statistics

## What
- Per key: accuracy and typical reaction time from the **last 100 presses only** (one press moves it by
  a percent, not two), the keys
  typed instead of it lately (drawn like the keys to practise, a bit smaller, each opening its own
  details, so a mix-up is looked at from both sides), total presses, and a day-by-day history (accuracy and time
  to press).
- **Typing time** is the only time of practice: every own key (right or wrong, Backspace too;
  never the helper's keys) adds the time since the previous own key, or since play
  began for the first one, at most 5 seconds. Waiting without keys, pauses, cards and a hidden
  tab add nothing, so a level left open counts no practice. It fills the day's time, all the
  minutes trained (the parent's "minutes" surprises, the teacher's results, the task's played
  minutes), the wardrobe time, automatic growth and the end cards' time (under a minute it says
  "menej ako 1 min"). The break reminder still counts screen time in a level, and a level's
  minimum and a timed practice's length keep their own clocks.
- **Rhythm** of a day: each level with enough measured strokes gives its evenness score 0-100
  ([feedback](../learning/feedback.md)), Rytmus its beat score; the day keeps their average weighted
  by the letters typed. Days without a score have no rhythm and leave it out of every average. The
  overall result code carries no rhythm (it carries no per-session values).
- An overlay opened by clicking the child's character (on the map, or in a level, which pauses first)
  starts with "My progress": two rows of icon and number chips, each with its own picture and
  the meaning only in the tooltip. The first row is the long run: keys mastered of the layout's
  total, stories finished, worlds finished, the **treasure chest** of rarities in points of its
  maximum (a world badge bronze 1, silver 2, gold 3; each target range award 1; the
  [Parrot badge](../game/parrot.md) 7; the treble clef 5: 15 x 3 + 15 + 7 + 5 = 72), the parrots at home against the most
  ever at home (the parrot's head), and the stars (the best of every level) of the maximum (5 in
  75 levels: 375; the hero's journeys' stars count only among the stars earned since the start). The second row is the last 14 days: accuracy, the **rhythm**
  (0-100, how evenly the child types; the Rytmus drum, its tooltip "Rytmus za 14 dní: 82 zo 100 – ako
  rovnomerne píšeš"; hidden while no level had a score) and speed in characters per minute once
  something was typed, the letters typed, the **days trained** (a desk
  calendar: days with at least one own key of the 14, today included, e.g. `9/14`) and the
  **typing time** (an alarm clock: `45 min`, from an hour `1 h 25`, in full in the tooltip);
  both always show, also at 0. The third row is the totals
  since the start, so a replay never takes anything away: the growth medals (a medal, also at 0; the tooltip
  says what a medal is given for), every parrot round won (two parrot heads)
  and every star earned, replays included (a stack of stars), and once there is one the target
  range's record: the most points of one run, its day in the tooltip (the target); last, when the child
  last typed, after the world keyboard picture (`ui-world-keys`), in a child's words only ("dnes",
  "včera", "pred 3 dňami", "minulý týždeň", "pred 2 týždňami", "minulý mesiac", "pred 3 mesiacmi",
  "pred viac ako rokom"), the tooltip adding the day ("Posledný tréning písania bol včera, dňa 7. 11.
  2026."). Under the heading "Príbehy" one row per story (all stories, closed ones grey) with its picture (a close-up head of the story's figure) and
  name, its worlds' pictures (done in colour, the rest grey) and the stars earned in it, the
  shelf of world badges ("Odznaky svetov": gold, silver and bronze sections with the stars each needs, [story](../game/story.md)) with the row of target
  range awards under it ("Ocenenia zo strelníc": every world's rare thing, found ones in
  colour, missing ones a grey range sight, [target range](../game/target-practice.md)), and "Môj
  rytmus" with the **treble clef** first while it is held (a note from every open world kept, its
  tooltip says so), then the rhythm notes left today in one row, as many as fit, each a little over the one before,
  and the exact count right after the last in the summary chips' style (without a note a line saying how
  to earn one, [Rytmus](../game/rhythm.md)), then once a Rytmus round was played the child's tempo as
  a chip: the small drum and the number, "letters a minute" in its tooltip; the notes are only pictures (not buttons), each of the
  world it was earned in, which its tooltip names. Below it a friendly view of the keys: a keyboard colored
  by each key's accuracy over its last 100 presses in the bands of the accuracy scale
  ([lesson progression](../learning/lesson-progression.md)): super from 97 %, ide to from 94 %,
  skoro from 89 %, poďme cvičiť under it; the 3 keys to practice.
  - Under the keyboard, in one row, **Preveriť moje ovládanie klávesnice** on the left starts the
    [placement check](../learning/placement-check.md) (about 4 minutes, in the tooltip), whose end
    card shows the strong and weak keys of that run, and the legend (★ super ✓ ide to ~ skoro ! poďme
    cvičiť) on the right, each item's tooltip with the accuracy over a key's last 100 presses it
    stands for (at least 97 %, 94 to under 97 %, 89 to under 94 %, under 89 %); on a phone the row wraps.
  - The keys to practise are lines without bullets: the key drawn as an outlined key like the
    on-screen keyboard's (it opens its details), its accuracy and the finger to press it with.
    **Krátke cvičenie** under them starts the two-minute drill of those keys; its tooltip names them.
  - Clicking a key shows that key's details: its finger, accuracy, what it is mixed up with (space,
    Enter and the like by name), its history, and **Precvičiť kláves**, the two-minute drill of just
    that key.
  - The detail panel opens with the **whole keyboard**: the mean accuracy and the usual speed
    (letters per minute) over every key with presses in its window, and how many keys that is,
    with the hint to tap a key under it. A key with a keyboard picture under the right Shift, as
    wide as it, goes down visibly when pressed, releases "⇧ znaky", unselects the keys and brings
    it back.
  - The keys are built and move like the raised buttons: only the face has the outline, the
    finger's band and the edge are drawn under it, so the base stays put and nothing is redrawn; hovered the face rises and the band between it
    and the base grows a little, pressed the top sinks and the band shrinks. A selected key keeps
    its ring and its normal place under the mouse (pressed, it comes back up only to its normal
    place); a latched key stays down whatever the mouse does, until it is pressed again; the
    keyboard key goes down visibly on every press. The keys to practise move the same way.
  - A small keyboard (narrower than about 560 px) shows only each key's main character and its
    colour, in a thinner font: no Shift symbols and no marks.
  - A key "⇧ znaky" under the left Shift, as wide as it, latches like Caps Lock: pressed it stays
    down and the keys show their shifted symbols instead (question mark, exclamation mark, colon,
    Slovak digits), each with its own statistics, until it is pressed again; capitals count for
    their letter and its Shift. Own practice's key picker has the same key. Both tool keys sit in
    the free room beside the space bar and shrink with the keyboard.
  - The **two-minute drill** of a few keys mostly trains those keys; its
    [end card](../game/mechanics.md) shows how they got better.
- **My progress** ("Môj postup") is a page of its own, opened by the map's button, with a top
  bar ("Back" to the map and the title) like the other pages, and two tabs: **Postup** and
  **Klávesy** (with the trends over the last sessions: accuracy, rhythm (the days with a score), speed and time per day,
  side by side on wide screens); every level's stars are on the map. Under the progress sit
  "QR kód celého postupu" and "Certifikát" ([parent controls](parent-controls.md)).
- **Each key's statistics have a link of their own** (the player's My progress, tab Klávesy, that
  key picked). Picking a key on the page (on the heat map, in the keys to practise, among the keys it
  is mistaken for) moves the address to it; the whole keyboard and the other tab drop the key. The
  world's keys panel ([world keys](../learning/world-keys.md)) links each key there.
- Once a parrot was ever won, the summary row has a **parrot** chip: the parrot's picture and
  "2 max 5", the parrots at home now and the most that were home at once; the tooltip says it
  in words ([parrot](../game/parrot.md)). Secret words on the page start the badge show
  ([easter eggs](../experience/easter-eggs.md)).
- The overlay (a quick look, only by a click on the character) has two tabs: **Postup** (the progress above, a big picture of the character, the stars as the last chip of the first row; stories come before worlds) and
  **Klávesy** (the key map and the key details).
- Tasks from a teacher, their results and their QR codes are on the player's **Úlohy** page
  ([teacher links](teacher-links.md)), not here: one place for everything about tasks.
- The Parrot badge, when held, sits just under the child's character on the Postup tab.
- The child's character on the Postup tab is big (beside the summary, above it on a phone), in
  its outfit, and lively: every 5 to 20 seconds its big smile turns into the usual one and back.
  Clicked or pressed with Enter or Space it pulls another face at once (wondering too, never the
  same twice in a row), half the time with a hop; the smiles then go on. With reduced motion it
  only changes its face.
- QR codes (a task's result from the Úlohy page, or all of the player's statistics from the Postup tab) fill
  the whole screen until clicked; the caption and frame colour tell a task's result from all
  statistics, and a button at the bottom copies the code to send to the teacher. The code for
  all statistics is a result link like any other, so the teacher's table takes it as one row
  per child.

- A key is **mastered** when it has at least 100 recorded presses and at least 89 % of its
  last 100 are right (the "skoro" band and up): a key the heat map does not show as "poďme
  cvičiť" once it has its 100 presses. Speed is shown, never a condition. The same verdict
  counts the keys on the certificate and the profile card and opens the worlds
  ([world keys](../learning/world-keys.md)). It is long-term: computed from the stored key
  statistics, so it fades when the child stops typing the key well.

- **Maintenance:** the maxima shown (stars 375, chest 72) follow from the levels, worlds and
  range things; when their number changes, the new maximum must be shown and written here
  (a unit test pins both numbers, so a change cannot slip by).

## Why
- Statistics a parent or teacher reads must be the child's own typing; a level passed by a
  tester would make them lie.
- A child asks "how am I doing?" in whole steps (stars, worlds, days), not per key; the
  progress answers that first, and the key details stay for the curious.
- The character is the child's own figure; a friend that reacts to a click makes the
  progress page warm instead of a report card.
- The Levels tab repeated the map's stars in a table; the map already shows every level's
  stars, and one place is easier to read.
- Knowing the problem keys turns mistakes into a clear, small next step.
- A key named anywhere (a world still waits for it) is one click from how it goes, and a link to it
  can be kept or sent.
- Old mistakes must not weigh on a key the child already fixed: only recent presses
  count, while the history still shows the way there.
