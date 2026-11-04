# 108 Standard or ergonomic fingering, and the quick keyboard settings

## What and why
The owner was taught the ergonomic fingering of the digit row: the standard one with a few keys moved one finger over
(2 by the little finger, 3 ring, 4 middle, 6 left index; 8 right index, 9 middle, 0 ring), each finger taking the key
nearly straight above its key in the top row (the digit row sits half a key to the left). It is the default; the
standard one (as most typing courses teach it) is the other choice. Everything that names or colours a finger follows the
profile's choice: the guide's stripes and highlights, new-key cards, the practice key picker, the heat maps, and the
hands on the keyboard (their pose names carry the finger: `l520` ergonomic 2, `l420` standard 2).

The keyboard's quiet layout switch in the guide's bottom right corner becomes "keyboard settings": it shows the layout
and the fingering ("SK QWERTZ ERG", "US QWERTY STN") and opens a small panel, "Rýchle nastavenie klávesnice": the layout
(a select), the fingering (two chips) each with a one-line explanation, the on-screen keyboard on or off (as F2), and the
hands shown, emphasized or hidden, and a link to the help's new paragraph that explains the difference. The practice key
picker gets the same button beside Start. The profile's settings carry the fingering and the hands too.

When the keys typed look like another layout, the button still glows and Tapko still says so, and a tooltip over the
button asks for ten seconds "Chceš použiť rozloženie …?" once per level run.

Free typing starts with the hands beside the keyboard and gliding onto the keys after a second (1.5 s), faster when the
child types before; with reduced motion they are on the keys at once.

Design: https://claude.ai/artifact/14Bcmaw9bBiZqxooo8TYXL

Affected: `src/keyboard/fingers.ts` (a layout with the profile's fingers), `src/app/app.ts` (`layout()` and a profile
layout), `src/ui/layout-switch.ts` (the button and the panel), `src/ui/tooltip.ts` (a tooltip shown for a while),
`src/ui/hands.ts` (emphasized, hidden; a glide sped up), `src/ui/keyboard-guide.ts`, `src/game/runtime.ts`,
`src/screens/practice-keys.ts`, `src/screens/parent.ts`, `src/screens/help.ts`, `src/storage/schema.ts` (settings
`fingering: 'ergonomic' | 'standard'`, default ergonomic; `hands: 'on' | 'bold' | 'off'`, default on), i18n (sk, en,
translator notes, catalog), `.specify/learning/finger-guide.md`. Store: two settings with defaults; no migration (alpha).

## Decisions
- The profile's layout carries its fingers: `fingered(layout, scheme)` gives the layout with every key's `finger` by
  `fingerOf`, so every reader of `def.finger` (guide, hands, key cards, picker, heat maps, Shift side) follows the
  choice without its own switch. Raw `LAYOUTS` stay standard (the hand tool, the layout mismatch check).
- A layout or fingering change in a level restarts it (as the layout change did); keyboard and hands switches act at once.
- The panel is a popover over the button like the old layout menu (same surface, border, shadow), round X, Esc closes;
  while open it keeps the keys from the level.
- "Zvýraznené" hands: lines and nails fully opaque.

## Steps
- [x] Settings, fingered layout, guide, hands, cards, picker colours follow the fingering; tests.
- [x] Keyboard settings button and panel; mismatch tooltip; picker button; profile settings; help paragraph; i18n; spec.
- [x] Free typing's glide; browser check (panel, both fingerings, hands bold/off, mismatch, picker, free typing).

## Done - 2026-11-04
Shipped: the fingering setting (ergonomic by default) carried by the profile's layout, so the guide, the hands, the key
cards, the key pickers and heat maps follow it; the keyboard settings button ("SK QWERTZ ERG") and its quick panel
(layout, fingering, on-screen keyboard, hands shown/bold/hidden, link to the help); the ten-second question about
another layout over the button; the button beside Start in the practice key picker; both settings in the profile; the
help paragraph; the hands gliding onto the keys in free typing, sooner when a key comes first. Left out: nothing.
