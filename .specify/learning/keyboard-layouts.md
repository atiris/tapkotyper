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
- If typed characters suggest a different layout than the profile setting (for example
  `y`/`z` swapped, or digits instead of `ľščť`), the parent gets a friendly hint to switch.
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
