# Slovak Keyboard Layout and Diacritics

**Status:** new (spec only says "Slovak localization" and word lists). **Prio:** P1.

## What
- Treat the Slovak QWERTZ layout as a first-class layout, not "English plus accents".
- Teach diacritics as their own gentle lesson track, after the home row and basic letters: ľ š č ť ž ý á í é (number row), ú ä ň ô (right side letter keys), and dead-key letters ď ĺ ŕ ó (key + letter) [bg, verify].
- Number row: on the standard Slovak layout the unshifted number row gives diacritic letters; digits need Shift. Digit lessons must teach that. [src: ddadsstornala; bg]
- Dead keys: acute (´) and caron (ˇ) are typed first, then the letter. Show a two-step visual: press the mark key, Tapko points to the letter key.
- Layout selector in profile: Slovak QWERTZ (default for sk), Slovak programmer variant (optional), Czech, US QWERTY, German QWERTZ. Tell the parent when typed keys do not match the chosen layout (e.g. "y" and "z" swapped).
- Word lists must contain correct diacritics; offer a parent toggle "words without diacritics" for beginners.
- Correct detection should use physical key position (`KeyboardEvent.code`) for finger mapping and typed character (`key`) for checking. This is a WHAT: the game must accept the same character no matter which OS layout variant is installed.

## Why
- Diacritics hidden behind digits is the known pain point for Slovak learners. [src: https://ddadsstornala.sk/aktuality/nacvik-pisania-na-pc-ucebna-pomocka/]
- Position of AltGr characters differs between operating systems. [src: https://en.wikipedia.org/wiki/QWERTZ]
- A paid Slovak course sells a dedicated diacritics level ("Bažina diakritiky"), so demand exists. [src: https://loudavymkrokem.cz/sk/pisanie-vsetkymi-desiatimi/]
- Old school tools (ZAV, ATF) are Windows-era; no modern free kid tool found. [src]
- Tux Typing and Klavaro show multi-language is expected, but Slovak coverage not confirmed. [src]

## Open questions
- Verify exact Slovak key map on Windows, macOS, Linux, ChromeOS before lesson design.
- Tablets/Chromebooks: on-screen keyboards differ; decide support level.
