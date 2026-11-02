# 104 Hands on the keyboard

Worked in session on the branch `hands-overlay` (the owner asked for a branch); not queued.

## What and why
Outline hands (drawn by Gemini, turned into SVG) lie on the on-screen keyboard in the home
position and show how each key is typed. They replace the small hands beside the keyboard and
Tapko's paws. The paw help stays, but it is the hands that type its three words, so the child
sees how they are typed.

- The get-ready card (the first panel of a level): the hands wait at the page's sides and slide
  onto the home position about a second later, or at once when the card closes (Space). They
  stay there the whole level; no parking after idle time.
- The next key: the hand that types it takes that key's pose (the other stays home). A capital adds
  the other hand's Shift pose. A key without a pose yet keeps the home position. The key's letter
  is always readable: it is drawn over the hands (white letter, thin outline in the finger's
  colour, a small disc fading from its centre).
- New-key cards and the home position card show the pose of their key (they already show it on the guide).
- The hands fade with the guide (mastered keys), hide with it, and are not in the heat map, the
  key pickers or the placement check.

Affected: `src/ui/keyboard-guide.ts`, new `src/ui/hands.ts`, `src/game/runtime.ts` (arrival),
`src/game/runtime/paws.ts`, `src/styles.css`, `public/hands/poses.json` (generated),
`assets-src/hands/` (Gemini pictures), `scripts/hands.mjs` (vectoriser, devDependency `potrace`),
`assets-src/PROMPTS.md` (the pose prompt), specs `learning/finger-guide.md`, `companion/tapko.md`,
`experience/help.md` if it names the paws. No store change.

## Steps
- [x] `scripts/hands.mjs`: Gemini picture -> lines only (grey fill dropped), creases apart and softer,
  little fingers a bit inwards, thinner outline; aligned by the Q and Ä stripes; the fit (lift to
  the keys' middle, a little longer) and the move onto the app's key grid baked into the paths, in
  full-size keyboard units (866 wide). Output `public/hands/poses.json`: the home pose of both hands
  and per key code the pose of the hand that types it.
- [x] `src/ui/hands.ts`: the SVG over `.kb` (scales with it), the wrists fading out, pose per hand,
  see-through nails, the letter over the hands, `park()`/`arrive()`, fade with the guide.
- [x] `KeyboardGuide`: hands instead of the side hands and the paws; `tap(ch)` for the paw help.
- [x] Runtime: hands parked when the get-ready card opens, arriving after 1 s or when it closes.
- [x] Paw help: the hands type (no paws), same rules.
- [~] Poses: home and U done; the other keys come one by one with Gemini, the owner reviews each (prompts and state in `assets-src/PROMPTS.md` section 12).
- [x] Specs, tests (pose choice), build, browser check (level start, typing, paw help, 1024x600); key cards not opened yet.

## State
The owner's rules for the hands are in `assets-src/PROMPTS.md` section 12. `scripts/hands-base.mjs` makes the new
base (fingertips centred). Moving a finger's pixels (`scripts/hands.mjs` moves) was rejected: it does not look like a real
hand and leaves torn lines; `public/hands/poses.json` stays the earlier set until a better way is chosen.
The hands, their arrival and the paw help work with the home and U poses; every other key keeps the
home position until its pose is drawn. Open: the poses of the other keys.

## Done - 2026-11-02
The hands on the keyboard, their arrival, the paw help and free typing shipped on `hands-overlay`. The
poses are no longer drawn by Gemini: they come from the 3D hand poser (`.todo/.done/106-hand-poser.md`);
the per-key poses are the owner's work in that tool.
