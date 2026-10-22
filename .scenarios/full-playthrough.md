# S1 - Can a new child learn their first keys, finish World 1, and can a parent manage and move the profile?

Read `.scenarios/common-rules.md` first; everything in it applies here. This
file adds only what is specific to S1.

Written 2026-10-21 against `main` at `7ec2f7b`.

## 1. Purpose and when to run

Proves the main promise end to end as a real user: a child creates a profile,
learns the first keys one by one with the finger guide, plays the whole first
world by typing, meets their character ("This is you."), sees their key statistics; a parent tunes the
settings, exports the profile, imports it into a fresh browser, and the game
keeps working offline. Re-run after changes to the lesson progression, the
level engine, the storage schema, the parent area, the service worker or the
asset pipeline.

**Destructive:** no (it only creates profiles in a fresh browser context).

**What it never does:** use the debug unlock; edit `localStorage` by hand.

## 2. Gate

| # | Must be true | How to check | Produced by |
|---|---|---|---|
| G1 | The dev server is up | `http://localhost:5173/tapkotyper/` shows the start screen, no console errors | - |
| G2 | A production preview is available for the offline phase | `npm run build && npm run preview`, `http://localhost:4173/tapkotyper/` loads | - |
| G3 | Fresh browser context (no TapkoTyper data) | the start screen lists no players | - |

**Leaves behind:** one profile with World 1 finished, in a throwaway context.

## 3. Phases

### P01 - A child creates a profile and is welcomed (budget: 5 min)

- S1: In Slovak, create a new player: pick a character animal, a name and a nickname.
- S2: Read the short intro story, or skip it.

Assertions:

- A01: The intro story greets the child by nickname in the second person ("This is you.") and explains the home position (F and J).
- A02: The map shows five worlds; only World 1 is open, its first level is marked as next.

### P02 - The first keys are taught one at a time (budget: 5 min)

- S1: Start the first level. Learn the new keys, then read the preparation tip and type the two-letter password on the "Ready, steady, type!" card.
- S2: Learn the first new keys when the game introduces them.

Assertions:

- A03: Each introduced key is shown alone with the finger to use, and must be typed three times before play starts.
- A04: During play the on-screen keyboard lights the next key in its finger color and the matching finger on the hand picture.
- A05: Only taught keys appear in the words on the targets.

### P03 - The child plays World 1 to its end by typing (budget: 25 min)

- S1: Play every level of World 1 by typing what the targets carry, making a few mistakes on purpose.
- S2: Make three mistakes in a row on one key once, and accept the narrator's mini practice.
- S3: Finish the spider web level and watch the reward.

Assertions:

- A06: A wrong key never removes progress on a word; the letter wobbles and the right key glows.
- A07: After three misses on one key the narrator names the finger for that key and offers a 20-second practice of it, which then returns to the level.
- A08: Each level ends with 1-3 stars and the accuracy in percent; at least one new key is unlocked during the world.
- A09: After the web level a reward scene shows the invitation to space; back on the map World 2 is open.

### P04 - Character, wardrobe and statistics (budget: 5 min)

- S1: Open the wardrobe and dress the character in earned items.
- S2: Click the character to see the statistics.

Assertions:

- A10: Earned items can be worn; locked items say how to earn them, and locked characters how many stars they still need.
- A11: The statistics show a keyboard colored by how each key goes (with a text mark, not color only), up to three keys to practise and a button to practise them now.

### P05 - A parent tunes the settings and moves the profile (budget: 10 min)

- S1: Open the parent area (gear button) and confirm the question.
- S2: Turn on "no time pressure", change the difficulty, look at the progress dashboard.
- S3: Export this profile to a file; in a new, empty browser context import that file.

Assertions:

- A12: The parent area asks one confirm question in the app's style; "back" returns to the map.
- A13: The dashboard shows the levels finished, the keys learned, an accuracy trend and time per day.
- A14: The imported profile appears in the new context with the same name, stars and the changed settings.
  Corroboration (2026-10-21): `localStorage['tapkotyper:v1'].profiles[0].settings.noTimePressure === true`.

### P06 - The game works offline (budget: 5 min)

- S1: On the production preview, load the game once, then go offline and reload.

Assertions:

- A15: After the reload the start screen and a level still work without network.

## 4. Close-out (budget for the whole run: 60 min)

- Verify "leaves behind": the profile from P01 shows World 1 finished on the map.

## 5. Known pitfalls (2026-10-21)

- The level map nodes pulse; automated clicks may need to wait for or force a stable click.
- An automated player can read the next character from the finger guide instead of the canvas.

## Appendix - last known paths (2026-10-21, orientation only, expected to go stale)

- Parent area: gear button top right of the map. Statistics: the character on the map.
- The finger guide element carries the next character in `data-next`.
