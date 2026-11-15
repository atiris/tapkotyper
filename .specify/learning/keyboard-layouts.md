# Keyboard layouts

## What
- Supported layouts: **Slovak QWERTZ** (default for Slovak), **Slovak QWERTY** (the same
  with `y` and `z` in the English places), **Czech QWERTZ** (default for Czech), **Czech
  QWERTY** (the same with `y` and `z` swapped) and **US QWERTY** (default for English). The
  layout is a profile setting, independent from the UI language.
- Slovak layout facts the game teaches:
  - Unshifted number row: `+ ľ š č ť ž ý á í é` (digits need Shift).
  - Keys right of the letters: `ú` (US `[` position), `ä` (`]`), `ô` (`;`), `§` (`'`), `ň` (`\`).
  - Dead keys: acute `´` (US `=` position, unshifted) and caron `ˇ` (same key with Shift).
    Typed first, then the letter: `ó ĺ ŕ` via acute, `ď` and capitals like `Ť Ľ Č` via caron.
  - On QWERTZ, `y` and `z` are swapped compared to US QWERTY.
- Czech layout facts the game teaches:
  - Unshifted number row: `; + ě š č ř ž ý á í é = ´` (digits need Shift).
  - Keys right of the letters: `ú` (US `[` position), `)` (`]`), `ů` (`;`, the right
    little finger's home key), `§` (`'`), dead diaeresis `¨` (`\`).
  - Dead keys: acute `´` and caron `ˇ` on the same key as on Slovak, the ring on Shift left of
    `1`; only Czech letters come through them (`ó ú ý`, `ď ť ň`, accented capitals, `Ů`).
  - Taught in the Slovak order with Czech keys: home row with `ů`, the letters, then
    `á í é ý ž ř č š ě ú`, then `ď ť ň ó`, then digits; `)` and `¨` are not taught.
- Fingers follow the physical key, so every layout of the same keyboard shares the hands.
- Preparation tips name the keys of the player's layout and appear only when the layout has
  what they talk about (dead keys, letters on the number row, `y`/`z` swapped).
- The game checks the **typed character** (so any OS variant of the layout works) and
  uses the **physical key position** for the finger guide.
- Dead-key letters count as one target character; the guide shows the two steps
  (mark key, then letter).
- **Fingering**: which finger presses the digit row, a profile setting beside the layout.
  **Ergonomic** (the default): each finger takes the key nearly straight above its key in the top
  row (left little finger 1 and 2, ring 3, middle 4, index 5 and 6; right index 7 and 8, middle 9,
  ring 0, little finger the rest). **Standard**, the historically taught one: left little finger 1,
  ring 2, middle 3, index 4 and 5; right index 6 and 7, middle 8, ring 9, little finger 0 and the
  rest. Every other key is the same in both. Everything that names or colours a finger follows the
  choice: the guide's colours and highlights, the hands, the key cards, the key pickers and heat
  maps, and which Shift a digit's capital takes.
- In a level a quiet button in the on-screen keyboard's bottom right corner, beside the space
  bar, shows the layout and the fingering by their short names ("SK QWERTZ ERG", "US QWERTY STD";
  only an icon on narrower screens). It looks like a key only under the pointer or with focus,
  never moves the keyboard and covers no key. It opens a small panel above it, "Rýchle nastavenie
  klávesnice", without the parent area: the layout (a select) and the fingering (two choices), each
  with one line that explains it, the on-screen keyboard on or off (as F2, not when the parent
  locked it) and the hands shown, bold or hidden, and a link to the help's paragraph on the
  fingerings. A round X, Esc or a click outside closes it; while it is open the keys are its own.
  The button and its panel lie over everything in the level, the get-ready card and the pause card
  too, so the keyboard can be set before play or in a pause. A new choice only draws the keyboard
  and the hands again and play goes on: a new fingering, or a layout that types the same characters
  (Slovak QWERTZ and QWERTY, or the two Czech ones); only a layout of other characters (Slovak, Czech, English) starts the level
  again, its words might not be typable. A new layout keeps the progress with the keys it teaches. The practice key picker has the same panel behind a button "Nastavenie klávesnice"
  on the right of Start, and opens again with the new choice.
- If typed characters suggest a different layout than the profile setting (for example
  `y`/`z` swapped, digits instead of `ľščť`, or `ě ř ů` on a Slovak layout), the character says which one it looks like and points
  to the button, which stands out until it is opened, and a tooltip over it asks "Chceš použiť
  rozloženie …?" for ten seconds, once per run of a level.
- Parent toggle "words without diacritics" for beginners.
- Shift is taught as two keys: left Shift for capitals of right-hand letters, right Shift for
  left-hand letters (the pinky of the other hand). Slovak `? ! :` need the left Shift
  (`,` `§` `.` keys), US `? :` the left Shift and `!` the right one.

## Why
- Slovak diacritics live on the number row and behind dead keys; that is the main pain
  point of Slovak learners, and no free, modern, child-friendly tool handles it.
  Many Slovak computers use the QWERTY variant, so both must be taught exactly.
  The same holds for Czech, whose schools teach ten-finger typing on the Czech QWERTZ layout.
  This is TapkoTyper's main differentiator
  ([research](../../.research/features/slovak-keyboard-layout.md)).
- A child at a school or a borrowed computer often meets another layout than at home; going to
  the parent area for it stops the lesson. The button stays quiet because it is rarely needed,
  and stands out only when the game sees it is.
- The digit row sits half a key further left than the letters, so the standard fingering makes
  the left hand reach up and to the left against its slant; the ergonomic one keeps every reach
  short and straight, which is easier to learn. Schools teaching the standard one keep it.
