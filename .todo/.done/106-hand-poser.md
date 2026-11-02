# 106 Hand poser

Branch `hands-overlay`, worked in session (the owner asked for it on 2026-11-02).

## What and why
The hand outlines over the on-screen keyboard must look like real hands seen from above typing each key.
Gemini drifted on small changes and the 2D skeleton (plan 105) could not bend a flat drawing like a hand.
So the owner poses a real 3D hand himself and Tapko gets only the outlines: a local tool, never part
of the built site, that saves one SVG per hand and key (about 60), with the pose inside to load and tune
it later.

Affected: new `tools/hand-poser/` (page, three.js, dev server save), `vite.config.ts` (the save on the
dev server only), `src/ui/hand-svg.ts` (the file format and pose names), `src/ui/hands.ts` (draws the
saved outlines instead of the skeleton), `public/hands/` (outlines + `index.json`), dropped
`src/ui/hand-rig.ts`, `public/hands/rig.json`, `scripts/hands.mjs`, `scripts/hands-base.mjs`; dev
dependencies `three`, `@types/three`, `@webxr-input-profiles/assets`. No store change.

## Decisions
- Model: the WebXR generic hand (MIT), its joints chained so each turns the ones after it; a joint
  turns on its own axes (bend, spread, twist); the hand by wrist position, turn, tilt and size.
- Outline: a render of which part each pixel shows (palm, finger, nail) and its depth; a line where
  the hand ends, between two fingers, and where the depth jumps (a finger over the palm, a curled tip);
  the same thickness everywhere; traced by potrace on the dev server into paths in keyboard units.
- Nails: a flat shape on each last finger bone, seen only where the finger shows it from above.
- Names: the key the hand presses, at most 4 small letters (`r`, `5`, `semi`, `spc`, `lsft`, `home`),
  as written on the tool's US keyboard (with Tab, Caps, Enter, Ctrl, Win, Alt...).
- Tapko: per hand the outline of the key it presses (the other hand Shift for a capital, the space bar
  the thumb of the hand that did not type the key before), `home` when there is none; a short fade.

## Steps
- [x] Tool: 3D hand over the keyboard, fingertip and palm dragging, sliders, undo, mirror from the other hand.
- [x] Save/load/delete as SVG with the pose inside; `index.json`.
- [x] Tapko draws the saved outlines; skeleton removed; tests; home poses of both hands.
- [x] Specs and `assets-src/PROMPTS.md` section 12.

## Done - 2026-11-02
The tool and Tapko's side shipped with the two home poses (slanted, size and thumb as the owner asked).
The per-key poses are left to the owner in the tool.

## Follow-up - 2026-11-02
On the owner's remarks: names by key place (`tab`, `caps`, `lshi`, `rshi`, `spac`, `ente`, `back`, the
row's range `1`-`0`, `q`-`p`, `a`-`l`, `y`-`m`, others as the range's end plus the count further out:
`11`, `01`, `p1`, `l1`...); the poser's keyboard English or Slovak; a flatter home; `rest` beside the
keyboard with the steps `rest1`..`rest4` that Tapko plays when the hands come onto the keys (instead of
sliding in from the page's sides); the paw button in free typing (dev server only) opens the poser on the
key typed last, and a save there shows in the open Tapko at once.
