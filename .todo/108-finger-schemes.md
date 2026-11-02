# 108 Standard or ergonomic fingering

## What and why
The owner was taught the ergonomic fingering of the digit row: the standard one with a few keys moved one finger over
(2 by the little finger, 3 ring, 4 middle, 6 left index; 8 right index, 9 middle, 0 ring), and the top rows reached with
a small move of the whole hand from the wrist. Tapko knows only the standard fingering (each layout's `finger`). A parent
chooses the fingering for the profile; everything that names a finger follows it: the guide's stripes and highlights,
new-key cards ("press it with the left little finger"), the finger statistics, and the hands on the keyboard (their pose
names carry the finger: `l520` ergonomic 2, `l420` standard 2, see `src/ui/hand-svg.ts`).

Affected: `src/keyboard/fingers.ts` (the schemes, already there: `fingerOf(def, scheme)`), `src/keyboard/layouts.ts`
(`fingerFor` and the other helpers that read `def.finger`), `src/ui/keyboard-guide.ts`, `src/ui/hands.ts` (`poseNames`
already takes the scheme), the key cards and their texts, the statistics by finger, the profile settings screen
(a setting `fingering: 'standard' | 'ergonomic'`, default standard), i18n (sk, en + translator notes), `.specify/learning/`.
Store: a new profile setting with a default; no migration (alpha).

## Decisions
- One place decides a key's finger: `fingerOf(def, profile.settings.fingering)`; no other code reads `def.finger`.
- The setting sits with the keyboard layout in the profile's settings (the parent's area), with a one-line explanation
  and a small picture of the digit row in both fingerings.
- Lessons stay the same keys; only the finger named and coloured changes.
- Hands: Tapko asks for the ergonomic pose name of a key; a missing pose falls back to `home` as today (the owner poses
  the ergonomic digit keys in the hand poser with its "Prsty: ergonomické" switch).

## Steps
- [ ] `fingerOf` everywhere a finger is read; tests for both schemes (finger of each digit key, stats by finger).
- [ ] Setting in the profile settings, i18n, spec.
- [ ] Guide, key cards, hands follow the setting; browser check of a digit lesson in both schemes.
