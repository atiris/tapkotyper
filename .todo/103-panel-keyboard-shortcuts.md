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
- [ ] `src/ui/hotkeys.ts`: `assignHotkeys(labels: string[]): (string | null)[]` (pure, tested
  with the example above, taken letters, diacritics, no letter left) and
  `panelHotkeys(panel: HTMLElement, buttons: HTMLButtonElement[]): () => void` (underline,
  `aria-keyshortcuts`, the listener, returns its stop).
- [ ] Wire it into `modal` (buttons of the content, not `.modal-x`), the end card (`render`), the
  pause card and the other overlay cards with button rows; stop it when the panel closes.
- [ ] Default leftmost + focus on open everywhere; fix panels whose primary is not first.
- [ ] CSS: `u.hk` (underline, thick enough to see on the orange button), the focus ring of the default.
- [ ] Spec: `.specify/experience/ui-rules.md` (what and why: keyboard-only children, one rule for all panels).
- [ ] Build, lint, tests; Playwright: an end card (Enter, letter, Esc), the pause card, a confirm
  dialog over a card, a modal with an input (letters go into the input).

## State
Nothing implemented yet.
