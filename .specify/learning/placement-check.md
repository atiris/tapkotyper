# Placement check ("Check how I know the keyboard")

## What
- A calm check that finds the keys the student already knows, so the lessons start at the
  right letters. It is also "Check how I know the keyboard": the same run any student may
  start at any time, which measures the keys from the start of the lesson order and shows
  the strong and the weak ones. It never takes anything away, so running it again does no harm.
- Ways in:
  - **Ms Turtle on the map**, on the first map visit of a player without a star: "Do you already
    know the keyboard a bit? Let's check, so we start where you are." **Start from the
    beginning** (the default, focused) or **Check me**. Asked once; the X and Esc count as
    starting from the beginning. It comes before her tips (one panel at a time).
  - Once more, later, while the student is still in the first world: after a level with
    accuracy of at least 97 % and a median reaction of correct presses at most 70 % of the
    difficulty's limit, the turtle offers the check again ("This goes very well...").
    Not after a check that opened keys.
  - **Check me** first asks honestly: "Do you type with all fingers without looking at the
    keys?" **No** ends with a kind line ("We will learn it from the start, it will go
    quickly.") and changes nothing; **Yes** starts the check.
  - The parent area's Keys tab: **Check what the student knows**, any time.
  - My progress, Keys tab, under the keyboard: **Preveriť moje ovládanie klávesnice** ("Check how I
    know the keyboard"), its length in the tooltip (about 4 minutes).
  - The parent's and the My progress button start the check at once, without the fingers
    question: the parent chose it, and the Keys tab's check is a measurement for anyone.
- The run: one target at a time on a calm panel (two or three words), no story, no time
  pressure, no stars, no rewards, no growth time, no paw. The on-screen keyboard and the
  finger guide are hidden (they would show where the keys are), no key cards come before it,
  only the get-ready card: type the words calmly with all ten fingers; the check finds the keys
  you know and may open some without their story introductions; no hurry, slow typing is fine.
- Stages follow the lesson groups: stage n has words of the keys passed so far and group n, with
  group n in focus; diacritics, capitals and digits come when their groups come (no
  diacritics when the parent turned them off). A stage takes at least 25 presses and 6 presses
  of each new key, at most 8 targets.
- **Each new key is judged on its own** presses in its stage: it passes with at least 89 % right
  (the ready rule) and the median reaction of its right presses within the difficulty's limit
  (the first key of a target is reading time and does not count). Errors on older keys do not
  judge the new ones. A key that fails stays out of the later stages' words, so it costs the
  other keys nothing; a failed Shift means no capitals later. The first group's keys (every new
  player's) stay in the words.
- The check goes on after a failed key. It ends after 3 stages in a row where no new key passed,
  at the end of the order, after about 4 minutes of typing (the stage being typed then does not
  count), or when the touch-typing signal fails.
- **Touch-typing signal**: the eyes and two fingers cannot be seen, but the timing shows which
  finger model explains the student, compared only with the student's own times (ranks and
  ratios), so a fast two-finger typist and a slow ten-finger typist both come out right.
  - Intervals: right presses straight after the right press of the character before them in
    the same word; the first key of a word and pauses over 2.5 s are left out.
  - Fit: the rank correlation of the same-hand intervals with the distance from the previous
    key (one pointing finger travels it) minus the one with the ten-finger cost (distance of
    the key from its finger's home key, more for two keys on one finger).
  - Contrast: the median of near pairs on one finger (`f r`, `j u`, `d e`) over the median of
    far pairs on two fingers of one hand (`a e`, `j o`), at least one key of each pair off its
    home key. A ten-finger typist is slower on the near ones, a pecker faster.
  - The signal fails when the fit is 0.2 or more, or the contrast is under 0.95. A measure
    with too few intervals (under 60, or under 12 in a contrast group) does not decide; with
    neither deciding the signal holds. The check's words are picked to hold contrast pairs.
  - In super mode the end card shows both numbers and the decision in one row, so the owner
    can type the check with two fingers and with ten and tune the limits from real numbers.
  - When it fails, the check ends and opens nothing; the card says kindly that the eyes still
    help find the keys and the lessons will teach the fingers from the start, quickly.
- **Result**: every passed key is unlocked (only ever added), also after a failed one, and counts
  as introduced, so no key cards follow; nothing opens when no key beyond the first group passed.
  A failed key is a gap: it comes as a lesson once the newest keys are ready, one gap at a time
  ([lesson progression](lesson-progression.md)). Passed keys are not mastered, their guide fades the normal way.
  The presses are the student's own typing and count in the statistics like any run's.
  The most keys any check passed is kept; every level whose key need is within it opens
  without the stars before it (and its world with it), but nothing is marked done: no stars,
  no world done, no badge, no reward, no story scene. Continue on the map goes to the first
  open level without stars reached by play (the star before it earned); without one, to the
  most advanced level the check opened (the largest key need). With automatic difficulty on,
  the difficulty rises to the highest step (up to the automatic maximum) whose reaction limit
  leaves a fifth to spare over the check's median reaction; it never goes down.
- The end card: Ms Turtle's picture, under it how many keys the student can use, then the
  strong and weak keys of this run as key caps (each key with at least 5 presses, ranked by
  accuracy, then reaction; at most 5 of each; weak means under 94 % or slower than the limit;
  "none" when no key is weak), the green line with how many new keys opened, or the kind line.
  With weak keys **Krátke cvičenie** (the two-minute drill of them) is the main button; "Na mapu"
  is last as on every end card and goes to the map, which shows the opened worlds; without weak
  keys it is the only button. The strong and weak keys come from this run only, so the card
  answers "how did it go now".

## Why
- A student who already types (an older child, an adult) is bored by `f j`, and most parents
  cannot judge which keys to pick by hand ([research](../../.research/learning/placement-check.md)).
- A hunt-and-peck or two-finger typist must not skip the basics: for them the home row is the
  whole point. Accuracy and speed alone would let a fast pecker through, so the timing is read
  for the finger model; it is relative, because speed says nothing about fingers.
- No real typists were there to calibrate on: the rule rests on two models (Fitts' law for one
  pointing finger, reach and same-finger cost for ten) and synthetic typists at two tempos and
  with noise. A mixed typist (ten fingers on the home row, pecking above it) is caught by the
  contrast pairs once the upper row is in, which is why both groups need a key off its home key.
- The check measures, it never rewards: opened is not passed, and stars still show who
  practised how much. Scenes and rewards come by playing.
- Asking about the fingers first is honest and saves a beginner a test they would not pass.
- Judging each key on its own: one weak little finger used to stop the whole check, so keys of
  good fingers later in the order were never reached. The child should get every key they know.
