# 105 Hands with a skeleton

Continues plan 104 on the branch `hands-overlay` (the owner chose the skeleton on 2026-11-02).

## What and why
A hand pose must look like a real hand seen from above typing that key, the whole hand keeping its
physical shape (the owner's rules: `assets-src/PROMPTS.md`, section 12 "The owner's rules for the
hands"). Gemini manages only big reaches and drifts on small ones; moving a finger's pixels in the
picture looked broken (torn lines, ghosts, one bent finger on a still hand). So the drawing gets a
skeleton: the home drawing's SVG lines are bound to bones, and a pose is a set of joint angles that
bends the lines smoothly. The app computes any key's pose itself and can move between poses
smoothly instead of swapping pictures.

Affected: new `src/ui/hand-rig.ts` (+ test), `src/ui/hands.ts` (draws the rigged lines instead of
picture poses), `scripts/hands.mjs` (traces the base once and binds it), `public/hands/rig.json`
(replaces `poses.json`), `assets-src/PROMPTS.md` §12, `.specify/learning/finger-guide.md`. No store change.

## Decisions
- **Source drawing**: `assets-src/hands/home-base.png` (fingertips centred; `scripts/hands-base.mjs`).
  Traced once by potrace into one outline path, crease paths and nail paths per hand (as today), in
  full-size app keyboard units.
- **Skeleton** (per hand, measured on home-base.png with the grid crop helper, picture key units, then
  stored in app units): wrist point; for each finger the knuckle (MCP), middle joint (PIP), last joint
  (DIP) and tip; for the thumb its base (CMC), MCP, IP and tip. Write the measured points into the
  script as constants with a comment of how they were read.
- **Binding** (script): every control point of every path gets weights to at most two bones: the
  finger area it lies in (the flood-filled finger areas of plan 104, outline barriers only) decides
  the finger; along the finger, the projection onto the bone chain decides the bone, with a soft
  blend over 30 % of a segment around each joint; points outside every finger belong to the palm
  (the hand's rigid transform); points near a valley blend finger and palm so the gap stretches.
- **Pose model** (2.5D, view from above): per finger an in-plane spread angle at the knuckle and three
  bend angles (knuckle, middle, last joint). Bending shortens a segment as seen from above
  (projected length = length x cos(bend)), so a pressed finger looks shorter and a bent one shows no
  nail; the hand has a translation and a small rotation at the wrist. Deform = linear blend skinning
  of the control points with each bone's transform (rotation + foreshortening along the bone, from
  its parent joint). Nails ride on the last segment; a nail fades out when its segment's bend passes 60°.
- **Solver**: for a key, the typing finger's tip must land on the key's middle (fingertip pad), solved
  by small iterative IK over spread + bends within joint limits, preferring the rest pose. Then the
  rules of §12 as couplings, each a named constant in `hand-rig.ts`:
  - press of a home key: knuckle and middle bend a little (tip + middle joint towards the palm), little
    and ring fingers spread a little towards the index, the ring finger as if under the middle one;
    index press brings the middle finger very slightly closer; no other finger changes;
  - top-row reach: the middle finger bends a little more, the ring finger hardly, the little finger not;
    the thumb follows up and towards the reach; the hand moves up a hair;
  - digit row: the hand (back) moves up, fingers less stretched;
  - bottom row: the finger bends (nail hidden), the tip on the lower part of the key;
  - space bar: the thumb of the hand that did not type the last key bends down a little;
  - Shift: the little finger reaches it, the hand turns a little.
- **Runtime**: `Hands` asks the rig for the target pose of the next key (or the pressed key in free
  typing) and tweens joint angles over 120 ms (no tween with reduced motion); the outline is the
  deformed paths. Same look rules as now (lines only, nails, letter over the hands, fade, arrival).
- **Review**: a review page (artifact) showing every lesson key's pose next to its key, for the owner,
  before the poses go into the app; his remarks go into §12.

## Steps
- [x] Measure the skeleton on home-base.png; script: trace once, bind, write `public/hands/rig.json`;
  a debug picture of the bones and the point weights.
- [x] `src/ui/hand-rig.ts`: skeleton, deform (LBS on path control points), solver with the §12 rules;
  tests: the typing fingertip within 3 units of each lesson key's middle, untouched fingers unmoved for
  a home press, nails hidden on a bottom-row bend, the space bar's thumb by the last hand.
- [x] `src/ui/hands.ts`: rigged lines, tween, the last typed hand for the space bar; drop `poses.json`.
- [ ] Review artifact of all keys; the owner's remarks into §12 and the rule constants.
- [ ] Spec update, build, tests, browser check (level, free typing, 1024x600).

## State
The rig is in the app (first try, as the owner asked: the home presses, the space bar, R, T and U by the
§12 rules; other keys get the plain reach of their finger). Open: the owner's review, then the other rows
and Shift tuned key by key; a curled fingertip still ends in a small point (linear skinning cannot round
a knuckle).

## Dropped - 2026-11-02
The owner judged the 2D skeleton's poses not good enough (a flat drawing cannot bend like a hand). Replaced
by `.todo/.done/106-hand-poser.md`: the owner poses a 3D hand and the outlines are saved as SVG.
