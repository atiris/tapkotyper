# Mechanics

## What
- Targets (creatures, rocks, signs) carry a word. Typing its first letter locks onto it,
  further letters fill it in, and completing the word resolves the target peacefully.
- A wrong letter never unlocks the target or resets progress on the word.
- Target speed and count follow difficulty (1-10) and the child's word pace, so the game
  stays calm for slow typists. The word pace is the time from a word appearing to its last
  letter, per letter, over the last five words the child typed: reading the word and
  finding the first key count, not only the rhythm inside the word. Every word also gets
  a few seconds to be read. With "no time pressure", targets wait for the child.
- When two targets pass by untyped in a row, new targets come slower (up to twice the
  time); every three typed in a row bring the pace one step back. This is silent and lasts
  only for the level.
- Progress comes only from typing. A target that floats by untyped (a goal, a splash) is
  replaced by a new one; waiting never finishes a level. Timed own practice is the one
  chosen duration.
- A goal text appears above the animal that scored. A closed world on the map tells, when
  clicked, what is still missing: the world before it, or how many letters its story needs.
- Rain street: Bolt walks toward the sun as the rain thins.
- Automatic growth counts only levels where the child typed at least 85 % of the targets
  (and typed accurately); a level where many targets floated by unread adds no time.
- The speedometer (space world; elsewhere a small round rhythm gauge, calm blue to green,
  never red) shows the current smooth typing rhythm, not raw WPM.
- A word the child can see can be typed at once; a target that cannot be typed yet shows
  no word.
- Word labels never overlap: the most urgent word keeps its place, the others glide aside
  (up, or down near the top), and a far-moved word gets a thin line to its object.
- The start is slow: at difficulty 3 a short word needs about 10 seconds to reach Tapko
  and one word is on screen at a time.
- Every story level, super level and rescue mission lasts at least 2 minutes of active
  play (pauses and cards do not count): a quick child gets more targets of the same kind
  (the gate a new code), and the progress bar never runs ahead of the time. Practice,
  custom exercises and free typing keep their own length. At the end Tapko stays where he is and jumps happily
  three times (Bolt hops with him in story 2, Melody hops in story 3; a super level adds a cheer), and any tool he held in the level (gloves,
  umbrella, shield) fades away; with reduced motion he only smiles and the tool is gone
  at once. About 1.4 seconds later the end screen shows stars (accuracy), new keys, and a
  sentence from the narrator. The end screen is a compact card that fits a small laptop screen
  (1024x600) without scrolling, also with a new key, a medal and a surprise: title and
  stars in one line, the small character with the sentence beside it, the facts (accuracy
  first, rhythm, new keys, new things, a rescued friend, a medal, a new or better world
  badge) as small chips, the
  task, surprise and the narrator's question in one small framed block, and one main button with
  Replay and Map as smaller ones next to it. Accuracy counts only the child's own keys: a level where the child
  typed fewer than 5 keys (the paw did the rest) says so, gives one star, never
  lowers a better result and adds no time toward automatic growth. Esc on the end screen
  goes back to the map, like closing any other card.
- **World rhythm** (the meadow so far): the levels of a world have fixed roles, so one
  session (about one world) goes up and down instead of repeating one game: 1 the world's
  main game, gently; 2 a calm step; 3 the main game, harder, with one short surprise; 4 a
  twist; 5 the super-obstacle. Each level dot on the map shows the icon of its activity
  (the number stays in its tooltip and for screen readers).
  - *Waiting words* (calm step): still objects carry short words (2 letters in the meadow),
    each starting with another letter, so the first key picks the word and every later key
    is measured against the key it should be; a key that starts no word counts only in the
    level's accuracy. New words keep coming until the minimum time is played. Nothing moves
    toward the child and nothing is missed. A calm step lasts at least 1 minute of
    active play, not 2.
  - *Copy* (twist, a clean line): a row of 3 to 4 words typed from left to right. A slip turns the
    word red, it fades away and the next word is the one to type; the level gets 2 more
    words, at most (1 + story order) x 3 in all (6 in the dragon story).
  - *Gust* (surprise of the meadow's level 3): half way through, the character says that
    the wind blows, and for about 25 seconds up to 3 small leaves (words of at most 3
    letters) come at once and fly slower. Once per run; a leaf flying by is a goal as
    always.
- **Ways to type** (a style per run, the same movement and story in every mode):
  - *Copy* (default, stories 1 and 2 and the fairy story's garden): the child types the
    word shown.
  - *Dictation*: the voice says each target when it becomes the one to type; its label
    shows a speaker and one dot per letter (spaces as gaps), and the typed letters
    appear in place. A wrong key shows the whole target, which stays shown until done.
    A click or tap on the label says it again, and the voice repeats it once by itself
    after 4 seconds without a key. Targets get one and a half times the travel time.
    Without a voice for the language the run is copy typing and the get-ready card says
    so; the reading-aloud button is hidden in a dictation (the voice is the task).
  - *Memory*: a target shows for a moment (longer for long words, shorter at a higher
    difficulty, with a small ring that empties), then its letters turn into dots and
    typing starts. Keys pressed while it shows are not counted and the narrator asks to wait:
    the one exception to "a word seen can be typed", clearly marked by the ring. A wrong
    key shows it again for a short flash; the letters typed so far stay. Targets get
    1.8 times the travel time (calm modes wait anyway).
  - *Mixed* (the fairy story's music tree): dictation and memory targets in turns, each
    with its own icon. Without a voice the run is memory only.
  - The mark `↵` of a target waiting for Enter stays visible in all of them, and the voice
    never says it.
  - In own practice the child picks the way to type; each button has a tooltip and one line
    under them says what the chosen one asks: Copy "You see the word and type it.",
    Dictation "You hear the word without seeing it. Type what you hear.", Remember it "The
    word shows for a moment and hides. Type it from memory."
  - In all of them, the finger guide does not light the key of a hidden letter, the paws
    show the target and type it as usual, and the end screen adds how many targets the
    child typed without the target being shown again ("by ear" / "from memory" / "by
    ear and from memory"). The get-ready tip of such a run is about listening or
    remembering.
- Pause anytime (Esc or a visible button); the game also pauses when the tab is hidden.
  The pause is a small card at the top: the words and the guide's next key stay in sight.
  Besides Continue and Help it offers "Slower", one step lower difficulty (the narrator confirms);
  automatic growth may raise it again after accurate play.
- **Leaving a level** is said plainly on the pause card: "End level" in a story, "End exercise"
  in practice and custom exercises, "End mission" in a rescue. Once something was typed in
  the level (a right or a wrong key) it asks first: "Really end it? This level will not
  count.", with "End" and "Continue", Continue focused. Ending keeps the time and keys typed in
  the statistics. Free typing keeps its X and leaves without asking, nothing is scored there.
- The **custom exercise** (untimed practice) has "Back" at the top left of the level bar, like
  every other screen: it ends the exercise and shows its results. Escape still pauses.
- **Staying a while**: the results card of a story level offers "Stay a while" after the main
  action, which keeps the focus. The same level, mode and background run again without an
  end: targets keep coming at the level's pace and Tapko says that Esc ends it; a small HUD
  hint "Esc = stop" stays in place of the progress bar. Esc ends the run (it does not pause)
  and a small card like after a practice shows accuracy and rhythm, with Map first and Next
  level. The run gives no stars, rewards, level result or unlocks; its keys and time count in
  the statistics and the lesson may advance, as after a practice. A super-obstacle has no
  endless form, so staying there plays the world's last regular level.

## Why
- A results card that fills the screen hides the game and slows the next try; the child
  reads the stars and one or two facts, so those must be visible at a glance.
- Arcade-style typing (ZType, Typer Shark, Epistory) is praised as motivating; the peaceful
  variant keeps the fun without destruction or stress.
- Overlapping words cannot be read, and a child who cannot read the word cannot type it.
  A word seen but not yet typable feels like a broken key.
- The rhythm inside a word overstated how fast a child really is: quick bursts of known
  letters made the targets fly while reading took the time, and growth ignored the words
  that floated by. Speed pressure over accuracy is the top complaint about typing games
  for children; slow but correct must still succeed
  ([research](../../.research/features/accuracy-first-feedback.md)).
- Copying, hearing and remembering train different skills: dictation trains listening to
  letters, memory trains reading whole words instead of letter by letter
  ([research](../../.research/learning/exercise-types.md)). The style changes only how a
  target is shown, so every mode gets it without its own rules. A guide that lit the next
  key would turn both back into copying.
- Four levels of the same game in one session lose their novelty after the second;
  boredom is the mood that stays. Alternating action and calm steps (saw-tooth difficulty)
  and mixed practice keep children involved and help them keep the skill
  ([research](../../.research/game/world-rhythm.md)). A slip in the clean line costs a
  little more practice, never the row, so accuracy matters without fear.
- Some levels ended in under a minute, super levels with a few words in seconds: too short
  to settle into a rhythm, and stars came cheap.
- A pause that hides the game breaks the child's focus; a way to slow down without a
  parent keeps a struggling child playing instead of giving up.
- A child who likes a level wants to keep typing there, and replaying it again and again
  to collect stars would make stars cheap; staying a while can only improve accuracy and
  add play time.
- "Map" on the pause card did not say that it throws the level away, and it did so without
  asking. Every other screen has Back at the top left; the custom exercise was the odd one.
