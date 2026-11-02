# 102 Key drill, Keys tab and a fairer keyboard check

## What and why
The short drill of a few keys (from My progress, a key's details and the keyboard check's end card)
should show the child how those keys got better. The Keys tab gets cleaner. The keyboard check
judges each key on its own, so one weak finger no longer stops it. Dictionary names keep their
capital.

Affected: `src/learning/stats.ts`, `src/learning/lessons.ts`, `src/learning/placement.ts`,
`src/game/modes/placement.ts`, `src/game/progress.ts`, `src/game/end-news.ts`,
`src/screens/level.ts`, `src/screens/stats.ts`, `src/ui/keyboard-guide.ts` (only if a slot
under the Shifts needs it), `src/styles.css`, `src/words/words.ts`, `public/i18n/{sk,en}.json`,
specs `.specify/profiles/statistics.md`, `.specify/learning/placement-check.md`,
`.specify/game/mechanics.md` (end card), `.specify/learning/words.md` (names).
No store schema change, no migration (alpha: new behaviour only, stored arrays just grow).

## Steps

### 1. Statistics window 100
- [ ] `STATS_WINDOW = 100`; `RECENT_KEEP` becomes `Math.max(STATS_WINDOW, MASTERY_WINDOW * 2)` (100).
- [ ] `recentAccuracy` (lessons.ts) reads the last `STATS_WINDOW` presses, not the whole
  `recent` array, so the HUD rings, the drill card and the key report show the same number.
  Move `STATS_WINDOW` where both modules can import it without a cycle (lessons.ts already holds
  the other windows; stats.ts re-uses it).
- [ ] Super-mode fill (`src/app/super.ts`, `FILL_PRESSES`) follows the constant by itself; check it.
- Why: with 50 presses one press moves the accuracy by 2 %. Cost: about 100 numbers per key
  (~60 keys) in the profile; the slices are tiny, so there is no slowdown.

### 2. The two-minute drill and its buttons
- [ ] One constant `DRILL_SECONDS = 120` (levels.ts, next to `practiceLevel`). Use it in
  `keysTab` (stats.ts) and in the check's end card (level.ts, `showPlacementDone`).
- [ ] Several keys (the "Klávesy na precvičenie" list, the check's end card): the button is
  "Krátke cvičenie" / "Short practice". Tooltip: "Počas dvojminútového cvičenia precvičí najmä
  klávesy: x y z" / "Two minutes of practice, mostly of the keys: x y z" (keys by `keyLabel`).
- [ ] One key (key details): "Precvičiť kláves" / "Practise the key". Tooltip: "Spustí
  dvojminútové cvičenie na precvičenie klávesu: x" / "Starts two minutes of practice of the key: x".
- [ ] Drop the now unused texts (`stats.practiceNow`, `stats.practiceKey`, `end.placementPractice`);
  the unused-keys test must stay green.

### 3. The drill's end card: how the keys got better
Applies to a practice started with `params.keys` (the drill). Free practice from the key picker
keeps its card.
- [ ] At the start, keep the recent accuracy of each drill key (as `AimMode` does with `before`).
- [ ] Rows (the card allows at most 3): with at most 3 drill keys one row per key: a key cap and
  "78 % → 91 %"; an improvement (by whole percents) has a small green up arrow, anything else is
  neutral (no red). Keys pressed fewer than 5 times in the run get no row. With more than 3 keys
  one row "Trénované klávesy" / "Trained keys" with the mean before and after (`keysAccuracy`),
  then accuracy and rhythm as now.
- [ ] Green line: first a drill key that became mastered in this run (`keyMastery` null before,
  set after): "Kláves x už ide skvele!" / "Key x goes great now!"; else `bestLetter` of the
  rows; else the usual `levelNews`. Rewards (new keys, medal...) still go first as the end card
  spec says. The new news kind goes into `News` and `greenLine` order.
- [ ] Under the picture: the minutes, as now. Main button: "Ešte raz" / "Once more" (same keys,
  same length) before "Na mapu".
- [ ] Tests: the rows (≤3 keys, >3 keys, too few presses), the mastered news first.

### 4. Keys tab layout
- [ ] "Klávesy na precvičenie": no bullets. Each line: the key cap (opens its details), the
  accuracy in % and "stláčaj" with the finger chip. No "(často namiesto neho …)" here; remove
  `stats.instead`.
- [ ] Key details, "Namiesto neho niekedy stlačíš:": show each confused key by `keyLabel`, so
  space, Enter or Backspace show as a named cap, never as an empty box.
- [ ] The "⇧ znaky" switch moves into the keyboard: a small chip in the free space under the
  left Shift (left of the space bar, bottom row). Under the right Shift (right of the space bar)
  a round button with the keyboard icon: it clears the selected key and shows, in the detail
  panel, the whole keyboard: mean accuracy and median speed (letters per minute) over all keys
  with data in their windows, and how many keys that is. The detail panel opens with this
  whole-keyboard view (with the "Ťukni na kláves…" hint under it) instead of the bare hint.
  Both are real buttons with labels and tooltips; on a phone they stay under the keyboard edges.
- [ ] "Ako mi to ide?" becomes "Preveriť moje ovládanie klávesnice" / "Check how I know the
  keyboard" and moves under the keyboard into the legend's row: the button on the left, the
  legend (✓ ide to ~ skoro ! poďme cvičiť) on the right of the same row (wraps on a phone).
  The tooltip keeps the length (about 4 minutes).
- [ ] Browser check with Playwright (tester profile, see memory): the tab on a wide and a phone width.

### 5. The keyboard check judges each key
Today a stage passes only when all its presses (old keys too) reach 94 %, and the check stops at
the first stage that fails. One weak little finger therefore stops it, and keys of good fingers
later in the order are never reached.
- [ ] A stage still waits for 25 presses and 6 presses of each new key (at most 8 targets).
  Then each new key is judged on its own presses in that stage: it passes with at least 90 %
  right (the ready rule) and the median reaction of its right presses (not the first key of a
  target) within the difficulty's limit. Errors on older keys do not judge the new ones.
- [ ] A key that fails is left out of the words of the later stages (a stage's keys = the keys
  passed so far + its group), so it no longer costs the other keys. A failed Shift means no
  capitals later.
- [ ] The check goes on after a failed key. It ends after 3 stages in a row where no new key
  passed, at the end of the order, after about 4 minutes of typing, or when the touch-typing
  signal fails (unchanged).
- [ ] Result: every passed key is unlocked and counts as introduced (also when earlier keys
  failed); nothing when no key beyond the first stage passed, or when the signal failed.
  `placementKeys` = the most of (its old value, the number of keys that passed).
  `PlacementEnd` `'stage'` becomes `'misses'` (3 stages without a pass).
- [ ] Gaps in the lesson order: `advanceLesson` and `newestGroup` take the newest group as the
  group of the **last key pushed** to `unlockedKeys` (push order), not the last group in lesson
  order. Then a failed key comes as the next lesson only after the newest keys are ready, and
  each gap key must get ready before the next gap opens. The check pushes its keys in lesson order.
- [ ] End card: strong and weak keys stay as they are (this run). The weak keys' button is the
  two-minute "Krátke cvičenie" (step 2). Today the card has only "Pokračovať" and the practice,
  with `toMap: null`, so the child sees no way to end it. "Pokračovať" goes away; the card gets
  the standard "Na mapu" last on the right, like every end card (it keeps the check's own landing:
  the map, which shows the opened worlds). Without weak keys "Na mapu" is the only button and
  takes the focus.
- [ ] The get-ready card text (`level.placementStart`):
  sk: "Píš výrazy, ktoré sa ti zobrazia, **pokojne, všetkými desiatimi prstami.** Toto cvičenie
  zisťuje, ktoré klávesy už vieš, a niektoré klávesy ti odomkne aj bez ich uvádzania v príbehoch.
  **Neponáhľaj sa!** Pomalé písanie je v poriadku."
  en: "Type the words you see **calmly, with all ten fingers.** This check finds the keys you
  already know and can open some keys without their story introductions. **No hurry!** Slow
  typing is fine."
- [ ] Tests (placement.test.ts, lessons.test.ts): a weak key does not stop the check; a later
  good key opens; 3 stages without a pass end it; the failed key is not in later words; with a
  gap the next lesson fills it only after the newest group is ready, one gap at a time.

### 6. Names keep their capital
`loadWords` lower-cases the whole list. So the names list in `WordSource` is always empty, and
names like "kika" or "martin" go into the word pool in lower case.
- [ ] `loadWords` only normalizes (NFC), it keeps the case. Names then never enter the pool
  (`filterWords` only takes lower-case letters) and come only with a capital at a target's start
  (`capitalize`). Check the other readers of `app.words` (parrot, dictation's `dictOwn`,
  translate's base words) still get what they expect; the own-language path is already lower case.
- [ ] Test: a dictionary with "Kika" never gives "kika", and gives "Kika" once the Shift is known.

### 7. Specs and finish
- [ ] Specs (WHAT and WHY): statistics.md (window 100, Keys tab layout, whole-keyboard view, the
  two-minute drill), mechanics.md (the drill's end card rows and green line), placement-check.md
  (per-key judging, the stop rule, gaps, the new intro), words.md (names only with a capital).
- [ ] `npm run build`, lint, tests; browser play-through of a drill (`?fast`) and of the check.

## State
Nothing implemented yet.
