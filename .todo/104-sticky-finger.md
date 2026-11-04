# 104 Sticky finger: a new kind of game

## What and why
A new game kind, **Lepkavý prst** / **Sticky finger**: one finger (or a few) stays "stuck" on its home
key and holds it down, while the other fingers type. The resting finger cannot drift away, so home
becomes the place a hand always comes back to, and a word cannot be typed with the wrong fingers.
Ideas: `.research/learning/hold-and-reach.md` (1 and 2).

This plan builds the kind, lists it in Help with its own picture and makes it playable as a way of
typing in own practice ("Vlastné písanie"), like dictation and secret words. Which world's level uses
it first is not decided yet (backlog: "Sticky finger: its first level"); the map's dot icon is ready
for it.

Affected: `src/input/input.ts` (held keys), new `src/game/modes/kit/hold.ts`, `src/game/runtime.ts`
and `src/game/runtime/*` (the wait when a held key is let go, held presses not typed),
`src/game/typing.ts` (`Style`), `src/learning/words` (one hand's words), `src/screens/practice-keys.ts`
(the style chip), `src/ui/keyboard-guide.ts` (a held key's look), `src/ui/hands.ts` (the held finger
on its key), `src/game/levels.ts` (`Activity` gets `sticky`), `src/screens/help.ts`, `src/storage/schema.ts`
(device field), `src/styles.css`, `public/i18n/{sk,en}.json`, `public/i18n/translator/en.json`,
`assets-src/PROMPTS.md` and the asset `ui-act-sticky` (already generated, see step 7), specs
`.specify/game/sticky-finger.md` (new) with `.specify/game/index.md`, `.specify/experience/help.md`,
`.specify/game/mechanics.md` (ways of typing), `.specify/learning/words.md` (one hand's words).
No migration (alpha): the new store field has a default.

## Steps

### 1. Held keys in the input
- [ ] `KeyInput` keeps the set of held keys by `e.code`: added on a keydown that is not a repeat,
  removed on keyup. When the window loses focus or the page is hidden, the set is cleared (a keyup
  may never come). Repeated keydowns of a held key are ignored as today.
- [ ] A handler `onHold?(held: ReadonlySet<string>)` is called whenever the set changes.
- [ ] The keydown of a key the run asks to hold is not a typed character: no miss, no press in the
  statistics, no sound.
- [ ] Tests: down/up, repeat, blur clears, a held key never reaches `onChar`.

### 2. The hold kit: `kit/hold.ts`
- [ ] `HoldPlan`: the codes to hold (one or more home keys) and the hand that types. Two rounds in a
  run, taking turns: the right index holds J and the left hand types, then the left index holds F
  and the right hand types. A round lasts a fixed share of the run (half each).
- [ ] The run needs at least 4 known letter keys of each hand (F and J count); with fewer it plays
  as plain copy typing and the style chip says why (step 5).
- [ ] Words of a round use only the typing hand's known keys (finger map of the current layout and
  fingering). `src/learning/words` gets a filter "only keys of this hand"; when the dictionary has
  too few such words, the usual letter groups of those keys fill in (as the first levels do with few keys).
- [ ] Spec note in `.specify/learning/words.md`: one hand's words.

### 3. Waiting while the held key is let go (calm rule)
- [ ] While a held key is up, the run waits: the scene stops as on a pause, but without the pause
  panel; a line over the scene says "Polož prst späť na J a drž ho." / "Put your finger back on J and
  hold it." Typed keys meanwhile count for nothing (no miss).
- [ ] When the key is down again, the run goes on at once. Nothing is lost, no stars are taken; the
  waiting time does not count to the level's active time (like the clock that stops while the child
  waits over a word).
- [ ] At the round's start the same line asks to press and hold the key; the round starts when it is held.

### 4. Seeing the held key
- [ ] The on-screen keyboard draws a held key as pressed with a soft golden glow (a sticky look);
  a key that must be held but is up blinks gently (no blink with reduced motion).
- [ ] The hands (when shown) draw the holding finger resting on its key.

### 5. Own practice: the style chip
- [ ] `Style` gets `sticky`. In `openPracticeKeys` a fourth chip **Lepkavý prst** / **Sticky finger**
  with the tip "Jeden prst drží svoj kláves, ostatné píšu." / "One finger holds its key, the others type."
- [ ] With fewer than 4 known keys of a hand among the chosen keys the chip is disabled, and its tip
  says "Najprv si vyber aspoň 4 klávesy každej ruky." / "First choose at least 4 keys of each hand."
- [ ] The get-ready card's tip for a sticky run is about holding (a new tip id prefix `sticky-`,
  matched like `listen-` and `remember-` in `src/game/cards.ts`).

### 6. Several held keys and the keyboard's limit
- [ ] A round may hold more than one key, for example hold `a s d` while the left index taps
  `f r t g v`, or hold `j l` while the right pinky taps `ä`. In own practice this is the second
  half of a sticky run once the chosen keys allow it; levels choose it later.
- [ ] Not every keyboard reports several keys held at once: laptop and cheap keyboards lose a third or
  fourth key in some combinations. Before the first run that holds two or more keys on this device, a
  short check card: "Drž A S D a stlač F." It records which keys arrived together.
- [ ] Keys the keyboard cannot report together are not asked together: the round holds fewer keys
  (down to one). The card never blames the child ("Táto klávesnica nedokáže zachytiť toľko klávesov naraz,
  tak budeš držať menej.").
- [ ] The result is kept per device, not per profile: a root store field `rollover`
  (`{ max: number, checked: string }`, default none), next to the other device-wide fields of the
  store root (like `theme`), not in the export of a profile.

### 7. Help, map and the picture
- [ ] Help, Progress tab, Druhy hier: a line after Tajné slová, before Finále:
  "**Lepkavý prst**: jeden prst sa prilepí na svoj kláves a drží ho, kým ostatné prsty píšu. Keď ho
  pustíš, hra počká, kým ho znova stlačíš." / "**Sticky finger**: one finger sticks to its key and
  holds it while the other fingers type. When you let go, the game waits until you press it again."
  The picture is `ui-act-sticky` (a small cake with sticky caramel drips, already in `assets-src/`; its
  prompt row goes into `assets-src/PROMPTS.md` with the other `ui-act-*` rows). Translator description too.
- [ ] `Activity` gets `sticky`, `map.act.sticky` "Lepkavý prst" / "Sticky finger", so a level of
  this kind shows the picture on its dot once it exists.
- [ ] Spec `.specify/experience/help.md`: the new line (it is listed ahead of its first level, like Transcribe).

### 8. Specs and checks
- [ ] `.specify/game/sticky-finger.md` (WHAT and WHY: the kind, the two rounds, the calm rule, the
  keyboard's limit per device, the 4-keys-per-hand rule) and its line in `.specify/game/index.md`;
  `.specify/game/mechanics.md` lists it with dictation and memory as a way of typing.
- [ ] Unit tests: held keys (step 1), one hand's words, the round switch, the wait does not count
  as active time, the rollover result lowers the held keys.
- [ ] e2e: own practice with the sticky chip; Playwright `keyboard.down('j')`, type the left hand's
  words, `keyboard.up('j')` shows the wait line and the scene stops, `down` again goes on.
- [ ] Browser check with Playwright (tester profile, see memory): the chip, both rounds, the wait,
  the Help line with its picture, wide and phone width.
- [ ] `npm run build`, lint, `vitest`, the e2e specs touched.
