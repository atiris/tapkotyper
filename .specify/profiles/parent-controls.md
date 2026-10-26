# Parent controls

## What
- A parent area behind a gear button and one calm question ("do you really want to open
  the settings?"). Deleting a profile asks in the app's own style.
- The gear is on the start page too. Before a player is chosen the settings hold only what
  needs no profile: the settings password, and on the data tab exporting all profiles,
  importing them and the translator. "Pick a student" at the top opens a player's whole settings.
- An optional **settings password**, one for the whole device (every profile and the
  guest). While it is set, every way into the parent area (the gear, the settings address)
  asks for it instead of the question; a wrong one says so, and after five wrong tries in a
  row the next try waits 30 seconds. An unlock lasts until the parent area is left. The
  settings tab sets it (typed twice), changes it or removes it; changing or removing needs
  the current password. Only a salted hash is stored, never the password, and it is not in
  exported files.
- The super player is never asked and can change or remove the password without the
  current one, for any player in super mode ([profiles](profiles.md)); this is the only way
  back from a forgotten password.
- Whenever the password is removed or changed without the current one, the time is recorded:
  for a month a round red "!" sits on the arc of the password panel's top right corner, its
  tooltip says when the super account did it, and results for the teacher carry a flag.
- Difficulty and word length each have an **automatic** mode (on by default): after a few
  minutes of accurate play (90 %+) one of them goes up by one step, taking turns, up to a
  ceiling (difficulty 8, words of 9 letters); each step gives the child a numbered medal.
  A parent who sets the value by hand turns its automatic mode off. Each automatic mode is
  its own switch with a title ("Automatic difficulty", "Automatic word length") and one short
  line; the note about the slow start sits under the difficulty slider.
- **Instructions for young typists** (off by default) is a switch in the practice group, with the
  line "Shows a few extra instructions. Good for typists up to about 10 years old." On, the map's
  welcome also lists what to do (Continue, keys come step by step, "?" helps); off, it is only
  the greeting and the start button. Lines that only explain how to work a screen belong
  behind this switch; story, mode intros and what a child needs to play stay for all.
- **Wardrobe time earned by practice** (on by default) is a switch in the practice group,
  with the rule in one line (1 minute in the wardrobe for 5 minutes of practice, at most 7
  minutes) and the child's current balance; turned off, the wardrobe is always open
  ([wardrobe time](../companion/wardrobe.md)).
- The **typist** section shows the character's picture (with its accessories) beside the
  nickname (required, up to 16 characters; a blank one is not saved and the field says so),
  then the character kind picked from a picture list, the typist's name (optional; hint:
  shown to the teacher in the results; blank clears it), the interface language, the **word
  language** and the keyboard layout (own languages from the [translator](../experience/translation.md)
  are offered after the official ones). A kind picked here is granted at once.
- The **data** tab has two framed groups like the settings tab: **Profiles** (export,
  move, import, and deleting the profile) and **Tools** with **Translate the game**: its
  heading, what it is for, then a button of the usual size that opens the translator.
- The settings have no progress tab: the progress, the charts and the levels are on the
  typist's own "My progress" page ([statistics](statistics.md)).
- A button by "Back" (the child's picture and name) switches the parent area to another
  profile from the same cards as on the start page (a number key picks one; as many in a row as the
  window has room for, at most five, in balanced rows with more in the first), keeping the open tab and without asking for
  the password again; with one profile it is hidden. The super player is never in the list.
- Settings per profile: nickname, character kind, optional name, word language, keyboard layout, active keys (pick by hand, with a punctuation row for the shifted `? ! :`, or "automatic"), word length range,
  difficulty 1-10, words without diacritics, no time pressure, session length, guide
  visibility, sound and music volume, reading typed words aloud in "Just typing"
  ([free typing](../game/free-typing.md)), easy to tell letters on the keys
  ([accessibility](../experience/accessibility.md)), start in fullscreen. The help text says the start
  is slow and points to "no time pressure" for a child who still cannot keep up.
- An **own content** tab collects what the parent writes for the child:
  - own encouraging messages, mixed into the narrator's lines;
  - **own words** (up to 300) and **own text** (up to 4000 characters) with the share of
    targets taken from them, the **word language of the custom exercise** (preset to the
    player's word language) and a preview of five sample targets
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
  adds or edits a rule; its add (or save) button sits at the right end of the "when" row, and
  on its own line right under the fields when the row has no room. Changing when a rule fires makes it wait again from now. On a
  narrow screen the rows become cards. Surprises never count in statistics. Free
  practice drills of chosen keys have no surprise.
- **Certificate** ("Certifikát", next to "QR kód celého postupu" under the progress): a window with a sheet in the style of a
  certificate, printed on A4 portrait (browser print): a frame with a sleeping fox in both top
  corners and pairs of paw prints along all sides, the logo, "Certifikát písania všetkými desiatimi
  prstami", the nickname large (the real name small under it when set), the character in its
  outfit, the results with their pictures in one row (keys mastered, accuracy and speed of the last
  14 days, stars, worlds), "Postup v príbehoch" with each story's picture, name and worlds done
  (Dračie vajíčko 5/5, all alike), one line on how it goes (by the share of keys mastered, praising
  accuracy when it is high), the date at the left, and at the right two signatures inside the
  frame: Aro the parrot (the macaw on its round branch) and the paw stamp of Tapko. Any print while it is open (its button or the browser's own)
  gives only the sheet. It replaces class codes and accounts.

## Why
- A 10-year-old solves any arithmetic "adult check"; a plain question keeps settings out of
  the way without pretending to be a lock.
- Some children open the settings anyway and change things; a family that wants it can put
  a simple password on the page. It is a lock on the page, not security of the data, so it
  needs no encryption, and the owner keeps a way back through super mode.
- Fixed settings either bore a growing child or overwhelm a new one; small automatic steps,
  each celebrated, make getting better visible and rewarding.
- Small children (up to about 10) need a few words on how to go on; older ones find them in
  the way, so the parent decides per profile. A sentence for the parent ("the gear is for
  you") does not belong on a child's screen; help says it.
- Parents and teachers want control and visible progress; a flat list of all levels is
  unreadable, and cards that repeat the summary add nothing; printable cards avoid accounts
  and rosters ([research](../../.research/features/parent-dashboard.md)).
- A real reward (a treat, a trip, a game evening) ties the game to the child's life
  ([research](../../.research/game/tapko-questions.md)). Parents use it as a real reward,
  so they want to say exactly when it comes: after a given level, after some training
  time, after more levels or stars, or now and then over a long time. One table shows
  every rule and what is done.
- After a level a child may not remember the question any more, so the answer always
  comes together with it.
