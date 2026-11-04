# 103 Panels driven by the keyboard

## What and why
A child at the keyboard should not need the mouse to leave a panel. On every panel with buttons
(end cards, the pause card, dialogs, confirm questions, the overlays of the map and the pages):
- the default button is the **leftmost** one and has the focus (with a visible ring) as soon as
  the panel shows, so Enter or Space presses it;
- every button has its own **letter**, underlined in its label; pressing that letter presses the button;
- Esc does what it does today (closes a dialog; on an end card it hides the card to peek under it).

Affected: `src/ui/dom.ts` (`button`, `modal`, `confirmDialog`), `src/ui/end-card.ts`,
`src/game/runtime/pause.ts`, `src/game/cards.ts`, `src/screens/level.ts` (`peekable`),
`src/styles.css`, a new `src/ui/hotkeys.ts` with its test, `.specify/experience/ui-rules.md`.
No store or contract change.

## Rules (decided)
- **Letter choice**: the buttons are taken left to right (in DOM order of the panel's action
  rows, the round X not counted). For each label take its first letter (`\p{L}`, compared in
  lower case) that no earlier button of the panel has taken. Letters with diacritics are their
  own letters: `á` is not `a`. Example: Pokračovať → P, Precvičiť → r, Práca → á, Ukončiť → U.
  A label with no free letter gets none (still reachable by Tab).
- **Underline**: the chosen letter is wrapped in a `<u class="hk">` inside the label span (text
  nodes only, never markup from text). `aria-keyshortcuts` holds the letter.
- **Pressing**: a keydown with no Ctrl, Alt or Meta, not a repeat, whose `key` in lower case is a
  panel's letter, clicks that button. Only the topmost panel listens (a dialog over an end card
  takes the keys). Keys typed into an input, textarea or select are never taken.
- **Default and focus**: the leftmost button is the default. Where the primary button is not
  leftmost today, it moves to the left (check every panel; `confirmDialog` already puts the safe
  choice first). The focus moves to it when the panel opens and when its buttons are rebuilt
  (the end card's `again`). The ring shows at once, also after a mouse click opened the panel
  (`focus({ focusVisible: true })`, plus a `.kbd-default` class fallback in CSS).
- **Not on panels where letters are the task**: key cards (the child types the key), the
  get-ready card (Space starts), typing inputs. They keep their keys as today.
- **End card peeking**: while peeking, letters keep their current meaning (`type`: a letter
  starts staying a while); the letters act on the buttons only while the card is shown.
- **Translations**: letters come from the label at run time, so every language works by itself.

## Steps
- [x] `src/ui/hotkeys.ts`: `assignHotkeys(labels: string[]): (string | null)[]` (pure, tested
  with the example above, taken letters, diacritics, no letter left) and
  `panelHotkeys(panel: HTMLElement, buttons: HTMLButtonElement[]): () => void` (underline,
  `aria-keyshortcuts`, the listener, returns its stop).
- [x] Wire it into `modal` (buttons of the content, not `.modal-x`), the end card (`render`), the
  pause card and the other overlay cards with button rows; stop it when the panel closes.
- [x] Default leftmost + focus on open everywhere; fix panels whose primary is not first.
- [x] CSS: `u.hk` (underline, thick enough to see on the orange button), the focus ring of the default.
- [x] Spec: `.specify/experience/ui-rules.md` (what and why: keyboard-only children, one rule for all panels).
- [x] Build, lint, tests; Playwright: an end card (Enter, letter, Esc), the pause card, a confirm
  dialog over a card, a modal with an input (letters go into the input).

## State
All steps done.

Decisions made while implementing:
- `panelHotkeys` returns nothing instead of a stop: a panel is marked with `data-hotkeys` and its
  letters live in a WeakMap, and one window keydown listener (capture, installed when the module
  loads, so before every other key listener) asks the marked panels from the last in the page to
  the first. A panel acts only when a hit test at its first visible button lands inside it: that
  makes "only the topmost panel" hold for dialogs over cards, the help page over an end card, key
  cards, and the peeked (hidden) end card without any per-panel bookkeeping or cleanup.
- `modal` gives letters to the buttons of its `.row`s and watches its content (MutationObserver),
  so dialogs whose buttons or labels come later or change (import after a file is picked, the
  stats tabs, the teacher's wipe button) get letters too. Its first focus: `[autofocus]`, else a text field, else the default button.
- Primary moved to the left: the parent password dialog (Open, Back), the service fill dialog,
  the import conflict (Keep both, Replace), the second delete-all question (the backup first, the
  hidden Delete never first), the translator's New language and import dialogs.
- Ms Turtle's tip and placement panels on the map get no letters: words typed on the map call its
  visitors (`onTypedWord`), and the panels' primary is already first and focused.
- `showCard` (the one-button notices) gets its letter too; the key cards and the get-ready card none.

## Done - 2026-11-04
Shipped: `src/ui/hotkeys.ts` (letters, underline, default, one listener for the topmost panel)
with its unit test; letters on dialogs, confirm questions, end cards, the pause card, its short
exercise and the one-button notices; the default button focused with its ring; primary buttons
moved left where they were not; the rule in `.specify/experience/ui-rules.md`; an e2e test in
`e2e/keyboard-only.spec.ts` (pause card, a question over it, the end card with peeking, a dialog
with a field).
Left out: nothing of the plan. The e2e suite still has eight failing specs unrelated to this plan
(BACKLOG, the e2e line).
