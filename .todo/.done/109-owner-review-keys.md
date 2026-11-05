# 109 Owner's review: keys, accuracy scale, world keys, wardrobe random

The owner's findings after plans 102-105 (2026-11-05), decided in chat. Done here one by one, a commit each.
No store migration (alpha): new fields get defaults.

## Steps

### 1. Space bar card: which thumb
- [x] The space bar's new-key card says: press it with the thumb of the hand that did not type last; after F
  the right thumb, after J the left one (`newKey.spaceThumb`, `src/game/cards.ts` fingerLine).

### 2. Home position card: a pair counts
- [x] Typing F J by turns: one check mark = the pair F then J right; any wrong key = a cross and the pair starts
  again; three pairs close the card (`showHomeRow`, `src/game/cards.ts`).

### 3. Own typing (Vlastné písanie) intro
- [x] Before the picker's own text, a general intro: "Táto hra nie je súčasťou prechádzania jednotlivými svetmi.
  Vlastné písanie znamená, že si sám pripravíš krátke cvičenie, ktoré ti umožní zlepšiť si presnosť a trocha si
  zacvičiť. Je to ako krátka rozcvička predtým, ako sa pustíš do náročnej misie." (`src/screens/practice-keys.ts`).

### 4. One accuracy scale: 89 / 94 / 97
- [x] Three bounds only, one place in code: 89 % (2 stars, "skoro", mastered key, world lock, new key comes),
  94 % (3 stars, "ide to", the finger guide fades, capitals in words by Shift), 97 % (4 stars, "super").
  5 stars stay from 98.5 %; the hero's journey keeps its own star steps.
- [x] Windows differ only: new key 25 presses (12 for Shift / punctuation), guide fade 40, mastered key 100.
- [x] Speed never blocks anything (new key, mastered, fade, lock); it is only measured and shown (profile card, teacher).
- [x] Mastered key = at least 100 presses and 89 % of the last 100 (stats `keyMastery`); used by the certificate,
  profile card, Moje klávesy summary, end-card news, world lock. Placement presses count as any presses (no exemption).
- [x] Moje klávesy heat bands by accuracy (not score): under 89 "poďme cvičiť", under 94 "skoro", under 97 "ide to",
  else "super" (new 4th class + color, legend).
- [x] Specs: lesson progression, feedback/statistics, mechanics (stars).

### 5. World keys: "Musím vedieť" / "Naučím sa"
- [x] Need = keys of the worlds before (keys of the previous world's last level; a story's first world: the story's
  opening count; world 1: none). Learn = everything new in the world, its first level included (world 1: f j space d k).
- [x] The world lock: every need key mastered (step 4). The lock card says clearly when a world is closed only by keys.
- [x] Help's "Svety a klávesy": "Musím vedieť" + "Naučím sa", not tailored to the player (no known marking).
- [x] Table in `.specify/learning/world-keys.md` recomputed, unit test keeps it equal.

### 6. Map: keyboard button on a world card
- [x] Round button with a keyboard icon: open world card at the bottom of the picture above the title, in the badge's
  column; locked world next to the lock's round button. Opens a panel: a keyboard (as Moje klávesy) showing the keys
  needed to unlock, the keys learned in the world, the keys the player masters marked.

### 7. Moje klávesy keyboard: real keys, no round button
- [x] "⇧ znaky" as a normal key cap under the left Shift; it latches like Caps Lock until pressed again.
  Same in the practice picker.
- [x] Whole-keyboard as a key cap under the right Shift with a keyboard picture: unselects keys, shows the whole
  keyboard's stats. No round button.

### 8. Small widths: less round buttons
- [x] Buttons' corner radius shrinks with their size on narrow screens.

### 9. Wardrobe
- [x] The four key-mastery accessories (heart glasses, star shirt, pink sneakers, sunglasses) by cumulative stars
  (`starsEarned`): 50 / 90 / 120 / 150 % of all levels' max stars (levels x 5).
- [x] Positions w13-2, w14-2, w15-2: dealt at random as now, granted by their level or by 1 / 2 / 3 worlds with
  every level at 5 stars, whichever comes first.
- [x] "Náhodný" for the character: unlocked by cumulative stars >= 1/5 of the max of all stars (MAX_STARS); when on,
  a random owned kind is picked when the child starts a level in another world than last time.
- [x] "Náhodný" per accessory slot: unlocked by mastered keys; bounds spread evenly up to 0.9 x lesson keys
  (round(max * i / N), i = 1..N slots), dealt to slots at random per player (seed). When on, each level start picks a
  random owned item of the slot or nothing. Free typing and practice change nothing. Lasts until the next mission.
- [x] The random tile is shown as checked beside a chosen item; "Odstrániť" and the existing "Náhodne" button change
  only the current outfit, never the random switches. Help text over each random tile says when it changes.
- [x] Specs: wardrobe.

## State
Done 2026-11-05: f98ee33, e142eb5, 543e2c7, 3d93be9, 35edb83, 7b7d2b0 + 7852288, a4414b5, 2f0219b, 67276e1. Unit tests and build pass; e2e not run (eight specs already failing, see the backlog).
