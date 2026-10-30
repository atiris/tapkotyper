# Keyboard layouts

## What
- Supported layouts: **Slovak QWERTZ** (default for Slovak), **Slovak QWERTY** (the same
  with `y` and `z` in the English places) and **US QWERTY** (default for English). The
  layout is a profile setting, independent from the UI language.
- Slovak layout facts the game teaches:
  - Unshifted number row: `+ ľ š č ť ž ý á í é` (digits need Shift).
  - Keys right of the letters: `ú` (US `[` position), `ä` (`]`), `ô` (`;`), `§` (`'`), `ň` (`\`).
  - Dead keys: acute `´` (US `=` position, unshifted) and caron `ˇ` (same key with Shift).
    Typed first, then the letter: `ó ĺ ŕ` via acute, `ď` and capitals like `Ť Ľ Č` via caron.
  - On QWERTZ, `y` and `z` are swapped compared to US QWERTY.
- The game checks the **typed character** (so any OS variant of the layout works) and
  uses the **physical key position** for the finger guide.
- Dead-key letters count as one target character; the guide shows the two steps
  (mark key, then letter).
- In a level a quiet switch in the on-screen keyboard's bottom right corner, beside the space
  bar, shows the profile's layout by its short name (only an icon on narrower screens) and changes
  it without the parent area: a small menu of the layouts (it scrolls once there are many; arrows,
  Home, End or a first letter move, Enter picks, Esc closes). It looks like a key only under the
  pointer or with focus, never moves the keyboard and covers no key. A new layout keeps the
  progress with the keys it teaches and starts the level again.
- If typed characters suggest a different layout than the profile setting (for example
  `y`/`z` swapped, or digits instead of `ľščť`), Tapko says which one it looks like and points
  to the switch, which stands out until it is opened.
- Parent toggle "words without diacritics" for beginners.
- Shift is taught as two keys: left Shift for capitals of right-hand letters, right Shift for
  left-hand letters (the pinky of the other hand). Slovak `? ! :` need the left Shift
  (`,` `§` `.` keys), US `? :` the left Shift and `!` the right one.

## Why
- Slovak diacritics live on the number row and behind dead keys; that is the main pain
  point of Slovak learners, and no free, modern, child-friendly tool handles it.
  Many Slovak computers use the QWERTY variant, so both must be taught exactly.
  This is TapkoTyper's main differentiator
  ([research](../../.research/features/slovak-keyboard-layout.md)).
- A child at a school or a borrowed computer often meets another layout than at home; going to
  the parent area for it stops the lesson. The switch stays quiet because it is rarely needed,
  and stands out only when the game sees it is.
