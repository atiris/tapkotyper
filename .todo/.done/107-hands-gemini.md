# 107 Hands drawn by Gemini over the 3D poses

Branch `hands-overlay`, worked in session (the owner asked on 2026-11-02).

## What and why
The 3D hand (plan 106) gets the position right, but its outline is still a 3D model's (thumb, knuckles, nails). The owner
approved a Gemini drawing style (`assets-src/hands/style-sample.jpg`: thin brown outline, nails, joint folds, straight
thumbs). So the 3D pose becomes only the position: the poser saves a picture of both hands over a muted keyboard, Gemini
redraws the hands in the approved style, and the result is traced back into each hand's outline.

Affected: `tools/hand-poser/` (both hands at once, the picture for Gemini, tracing Gemini's answer), `assets-src/hands/`
(style sample, pictures per pair), `assets-src/PROMPTS.md` §12 (prompt), `public/hands/` (outlines). Tapko unchanged.

## Decisions
- Both hands are posed together; each keeps its own name (`a` left, `rshi` right); a pair is `<left>+<right>`.
- The picture for Gemini: 21:9, the keyboard muted (light grey keys, faint signs), both hands' 3D outlines, two magenta
  marks in opposite corners Gemini must keep; saved with each hand's silhouette in `assets-src/hands/gemini/<pair>/`.
- Gemini gets the picture and the style sample (the gemini-bridge, the owner presses Run); its answer is saved as
  `answer.png` next to the picture.
- Tracing: the marks place the answer on the keyboard units; the dark lines are the hands (the muted keyboard is too
  light); each line pixel goes to the hand whose silhouette is nearer; traced into one path per hand, written into that
  hand's SVG (the pose stays in it; the outline marked `data-source="gemini"`).

## Steps
- [x] Poser: both hands at once (names, active hand, drag picks the hand, save both).
- [x] Home straighter (owner).
- [x] Picture for Gemini + silhouettes (server endpoint), prompt in PROMPTS.md.
- [x] Trace Gemini's answer into the hands' SVGs (server endpoint, button in the poser).
- [x] One pair end to end (home+home) with the owner.

## Done - 2026-11-02
The poser poses both hands at once (left panel, right panel, shared controls below the keyboard), saves a pair's picture
for Gemini (1376 x 768, muted keyboard, marks, silhouettes) and traces Gemini's answer into both hands' SVGs. The home
pair went through end to end (prompt in `assets-src/PROMPTS.md` section 12, with the owner's note that bent fingers look
shorter). Left out: the other pairs (the owner poses them); the rest steps are still the 3D outlines.
