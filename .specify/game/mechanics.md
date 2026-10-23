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
- Level length is about 1-3 minutes. At the end Tapko stays where he is and jumps happily
  three times (Bolt hops with him in story 2, Melody twirls in story 3), and any tool he held in the level (fan,
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
- A pause that hides the game breaks the child's focus; a way to slow down without a
  parent keeps a struggling child playing instead of giving up.
- "Map" on the pause card did not say that it throws the level away, and it did so without
  asking. Every other screen has Back at the top left; the custom exercise was the odd one.
