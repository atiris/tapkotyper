# Parent controls

## What
- A parent area behind a gear button and one calm question ("do you really want to open
  the settings?"). Deleting a profile asks in the app's own style.
- An optional **settings password**, one for the whole device (every profile and the
  guest). While it is set, every way into the parent area (the gear, the settings address)
  asks for it instead of the question; a wrong one says so, and after five wrong tries in a
  row the next try waits 30 seconds. An unlock lasts until the parent area is left. The
  settings tab sets it (typed twice), changes it or removes it; changing or removing needs
  the current password. Only a salted hash is stored, never the password, and it is not in
  exported files.
- The super player is never asked and can change or remove the password without the
  current one; this is the only way back from a forgotten password.
- Difficulty and word length each have an **automatic** mode (on by default): after a few
  minutes of accurate play (90 %+) one of them goes up by one step, taking turns, up to a
  ceiling (difficulty 8, words of 9 letters); each step gives the child a numbered medal.
  A parent who sets the value by hand turns its automatic mode off. Each automatic mode is
  its own switch with a title ("Automatic difficulty", "Automatic word length") and one short
  line; the note about the slow start sits under the difficulty slider.
- The **child** section shows the character's picture (with its accessories) beside the
  child's name, then the character kind picked from a picture list and the nickname (up to
  16 characters; empty means the child's name). A kind picked here is granted at once.
- The **progress** tab starts with the same picture and the icon and number summary of the
  child's "My progress", above the cards and charts.
- A button by "Back" (the child's picture and name) switches the parent area to another
  profile from a list of small profile cards, keeping the open tab and without asking for
  the password again; with one profile it is hidden. The super player is never in the list.
- Settings per profile: child name, nickname and character kind, keyboard layout, active keys (pick by hand, with a punctuation row for the shifted `? ! :`, or "automatic"), word length range,
  difficulty 1-10, words without diacritics, no time pressure, session length, guide
  visibility, sound and music volume, reading typed words aloud in "Just typing"
  ([free typing](../game/free-typing.md)), start in fullscreen. The help text says the start
  is slow and points to "no time pressure" for a child who still cannot keep up.
- An **own content** tab collects what the parent writes for the child:
  - own encouraging messages, mixed into the narrator's lines;
  - **own words** (up to 300) and **own text** (up to 4000 characters) with the share of
    targets taken from them and a preview of five sample targets
    ([words](../learning/words.md)).
- A **surprises** tab holds the parent's surprises as rules in one table (up to 50; question
  and answer up to 200 characters each). Each rule says when the answer comes:
  - **after a level** (a story level picked by world and level): the game asks on that
    level's get-ready card and tells the answer on its results when it is finished;
  - **after minutes of training** (story levels and practice together), **after more
    levels** or **after more stars**, counted from when the rule was made: the game
    asks on every get-ready card while it waits, with what is still left ("3 more
    levels"), and tells the answer on the results of the level that reaches it;
  - **at random**: a pool of free questions; after a finished level, now and then (one in
    three) and never twice a day, one of them comes with its answer at once.
  A rule either repeats (counts again from the reveal, fires on every finish of its level,
  or goes back to the pool) or is done after its reveal and never shown again. A level run
  has one surprise at most, in the order level, minutes, levels, stars, random; the narrator's own
  teaser waits in such a run. The answer always comes right under its question,
  highlighted. The table shows the question, the answer, when (in words), repeat, the
  state (waiting, "12 / 20 min", done with its date) and edit and delete; a form under it
  adds or edits a rule. Changing when a rule fires makes it wait again from now. On a
  narrow screen the rows become cards. Surprises never count in statistics. Free
  practice drills of chosen keys have no surprise.
- Dashboard: per-key heat map on the keyboard, accuracy and rhythm trend, time played per
  day, and a grid of all levels, each with its three stars (filled or empty) in a fixed place.
- Printable progress card / certificate (browser print), instead of class codes.

## Why
- A 10-year-old solves any arithmetic "adult check"; a plain question keeps settings out of
  the way without pretending to be a lock.
- Some children open the settings anyway and change things; a family that wants it can put
  a simple password on the page. It is a lock on the page, not security of the data, so it
  needs no encryption, and the owner keeps a way back through the super player.
- Fixed settings either bore a growing child or overwhelm a new one; small automatic steps,
  each celebrated, make getting better visible and rewarding.
- Parents and teachers want control and visible progress; printable cards avoid accounts
  and rosters ([research](../../.research/features/parent-dashboard.md)).
- A real reward (a treat, a trip, a game evening) ties the game to the child's life
  ([research](../../.research/game/tapko-questions.md)). Parents use it as a real reward,
  so they want to say exactly when it comes: after a given level, after some training
  time, after more levels or stars, or now and then over a long time. One table shows
  every rule and what is done.
- After a level a child may not remember the question any more, so the answer always
  comes together with it.
