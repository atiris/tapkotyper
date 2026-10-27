# S2 - Does the whole product hold together, from a new account to moving it to another device?

Read `.scenarios/common-rules.md` first; everything in it applies here. This
file adds only what is specific to S2.

Written 2026-10-27 against `main` at `bde6144`.

## 1. Purpose and when to run

A cross-section of the most important promises in one run, as the people who use
them: a child creates an account and types through levels of two worlds, the
target range and the parrot; a parent tunes the settings and hides surprises
(one announced on the map ahead); a teacher hands out a task and checks the
child's result; badges and parrots are won and lost; and at the end the player
is exported, moved by a link and imported into a fresh browser with everything
intact. Re-run before a release, after changes to storage, rewards, surprises,
the parrot, the parent or teacher area, or the move/export paths.

Every defect found is triaged on the spot as `common-rules.md` and the
`scenario-run` skill say: easy -> fixed now (build, test, commit, push), then the
run goes on; hard and substantial -> a `.todo/` plan and a queue line; hard and
minor -> one backlog line.

**Destructive:** no (it only creates players and teacher results in fresh
browser contexts).

**What it never does:** edit `localStorage` or IndexedDB by hand; use the
production site. The super player's service tools (fill progress, send a parrot
away, bring one home) are product features and may be used where a phase says so.

## 2. Gate

| # | Must be true | How to check | Produced by |
|---|---|---|---|
| G1 | The dev server is up | `http://localhost:5173/tapkotyper/` shows the start screen, no console errors | - |
| G2 | Fresh browser context (no TapkoTyper data) | the start screen lists no players; the teacher page lists no results | - |
| G3 | A second, empty browser context can be opened for the move phase | the MCP opens a new context or a private window | - |
| G4 | Unit tests pass before the run | `npm test` is green | - |

**Leaves behind:** in a throwaway context, one player with World 1 finished,
World 2 started, a won surprise kept in World 1, and teacher results for one task;
in a second context the same player imported.

## 3. Phases

### P01 - A child creates an account (budget: 5 min)

- S1: In Slovak, create a new player with a real name, a nickname and a character.
- S2: Go through the welcome to the map.

Assertions:

- A01: The game greets the child by nickname everywhere; the real name is shown only where a parent or teacher looks.
- A02: The map shows the stories with their worlds; only World 1 is open and its first level is marked as next.
- A03: Every side card of World 1 (crown, target range, parrot) is on a white card, faded until reached.

### P02 - A parent sets things up before the play (budget: 10 min)

- S1: Open the parent area and change something the child will notice (for example no time pressure or a larger font) and something they will not (difficulty).
- S2: Hide three surprises: one after a World 1 level that should be shown on the map ahead, one after a level of World 2 that should stay hidden, and one after a few more levels.
- S3: Go back to the map.

Assertions:

- A04: The surprises table lists all three with the question, the answer, when in words, and the state "waiting".
- A05: The option to show a surprise on the map ahead is offered only for a surprise after a level.
- A06: On the map, exactly the announced level shows a closed golden gift box in place of its game picture, and its tooltip says a surprise waits there; the hidden one is not visible.
- A07: The visible setting change is in effect in the next level.

### P03 - The child types through World 1 (budget: 40 min)

- S1: Play every level of World 1 by typing, with a few mistakes on purpose; take every new key the game introduces.
- S2: In one level watch the progress bar for the whole run.

Assertions:

- A08: Every level ends with 1-3 stars, the accuracy and the rhythm; a finished level turns green on the map.
- A09: The progress bar only moves forward and moves at least as fast as the time toward the level's minimum length; it never jumps back.
- A10: The announced surprise is asked on its level's get-ready card and its answer comes right under the question on that level's results; afterwards the golden box is gone from that level.
- A11: The counting surprise says what is left while it waits and tells its answer on the level that reaches it.
- A12: After the super level the world's reward shows, World 2 opens, the world badge appears on the island and the crown card turns green.
- A13: The island of World 1 shows a small circle with an open golden box at its top left; it opens a window listing each surprise told in World 1, question with answer, and the window closes with its X and with Esc.

### P04 - Target range and parrot (budget: 20 min)

- S1: Play the target range of World 1 until its own thing is found (several runs are fine).
- S2: Play the parrot of World 1 once carelessly until the parrot flies away, then again carefully until the round is learned.
- S3: Back on the map, click Aro and watch his flight.

Assertions:

- A14: A careless parrot round ends lost without celebration, the parrot node shows the empty perch, and it stays on a white card.
- A15: A learned round wins the parrot; the node shows its head and turns green; the Parrot badge comes with its line, and Aro sits on his perch beside the character on the map.
- A16: Aro's lines stay up long enough to read; his flight is smooth (no stop at each turn), unhurried, may reach the lower part of the page, and ends back on his perch.
- A17: Once the world's own thing is found, the target card turns green and the thing is in the collection on the range's end card and in the progress overview.

### P05 - Badges and parrots come and go (budget: 10 min)

- S1: As the super player, send a parrot away with the service tools, then open the map as the child.
- S2: Win the parrot back (play its round or bring it home with the service tool).

Assertions:

- A18: The map tells once which world's parrot flew away; Aro says goodbye and flies off, and the next map shows no perch.
- A19: The parrot card of that world shows the empty perch but stays green, because it was won once.
- A20: Winning it back brings Aro flying in to his perch with a hello line; the treasure chest in the progress overview counts the Parrot badge again.

### P06 - World 2 and the hidden surprise (budget: 20 min)

- S1: Play the first levels of World 2 up to and including the level with the hidden surprise.

Assertions:

- A21: World 2 levels use the keys taught so far plus the new ones introduced on the way.
- A22: The hidden surprise is asked on its get-ready card and revealed on its results; World 2's island then shows its own circle of won surprises, separate from World 1's.
- A23: Deleting a won surprise in the parent area removes it from its world's window; a world with no surprise left shows no circle.

### P07 - A teacher hands out a task and checks the result (budget: 20 min)

- S1: As a teacher, make a story task with a few own words and a short time, and give it to the child by its link.
- S2: As the child, take the task, play it to its end and hand it in.
- S3: As the teacher, take the result in (link or scan) under a group, and look at it in every tab.

Assertions:

- A24: The task card is the first card on the map until its minutes are played; leaving a level early does not count it.
- A25: The hand-in carries the real name, the task, minutes, accuracy, rhythm and weakest keys; the teacher sees the result in the group's set and under the student.
- A26: Taking the same result in a second time adds nothing.
- A27: Saving the teacher's results as a file and loading it in an empty teacher page brings the same results back.

### P08 - Settings, statistics and certificate (budget: 10 min)

- S1: Look at the child's statistics and progress overview; change the word language or keyboard layout and back; open the certificate.

Assertions:

- A28: Statistics show the keys by how they go (not by color alone), the weakest keys with a way to practise them, accuracy and speed of the last 14 days.
- A29: A changed setting is kept after a reload; changing it back restores the previous behaviour.
- A30: The certificate shows the nickname or real name, the badges and a date, and prints on one A4 page.

### P09 - Export and moving the player (budget: 15 min)

- S1: Export the player to a file, and also create a move link for it.
- S2: In a second, empty browser context, import the file; in a third (or after deleting the import), open the move link.

Assertions:

- A31: The imported player has the same nickname, real name, stars, keys, settings, badges, parrots (at home and ever won), surprises with their won worlds, the task and statistics.
  Corroboration (2026-10-27): the player's `progress.parrotsWon` and each surprise's `worlds` survive the move.
- A32: The map of the imported player looks the same as in the first context: green side cards, the open-box circles, Aro on his perch.
- A33: Opening the same move link twice does not create a duplicate player without asking.

## 4. Close-out (budget for the whole run: about 2 h 50 min)

- Verify "leaves behind": the first context shows World 1 finished, World 2 started and the World 1 surprise circle; the second shows the same player.
- Every defect is fixed and pushed, or has a `.todo/` plan with a queue line, or one backlog line.

## 5. Known pitfalls (2026-10-27)

- Levels last at least two minutes of active play; budget for it rather than hunting a shortcut.
- The level map nodes pulse; automated clicks may need to wait for or force a stable click.
- An automated player can read the next character from the finger guide instead of the canvas.
- The running app saves its profile over hand edits; that is one more reason never to edit storage by hand.
- The parrot fly-away is random per day; use the super player's service tools to make it happen.

## Appendix - last known paths (2026-10-27, orientation only, expected to go stale)

- Parent area: gear button top right of the map; tabs Nastavenia, Vlastný obsah, Prekvapenia, Úloha, Klávesy, Údaje.
- Super mode: type `supertapkotyper` quickly; its service menu holds fill progress and the parrot tools.
- Teacher page: "Pre učiteľov" on the start page (`#/teacher`).
- The finger guide element carries the next character in `data-next`.
