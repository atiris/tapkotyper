# 64 - World backgrounds redrawn: anime style, exact seams

## Why
The owner found the world backgrounds weak: a big sky, near details in the far picture, strips
that did not match, and seams that never really joined. The new look is hand-drawn Japanese
anime background art (between the owner's two samples in `temp/background-redesign/`, local
only): a sky of about 15 %, the far scene without near objects, a middle band (about 45 %) and a
low closest band (about 20-25 %), all 1376 x 768 and laid over each other pixel for pixel. Each
layer must repeat with its edges joining exactly. The start page's meadow stays as it is.

## Affected
- `scripts/bg-seam.mjs` (new): check, strips, prep, merge, quilt, lift, preview.
- `src/gfx/draw.ts`: the cross-fade of layer edges (`seamlessCopy`) is gone; it showed doubled
  flowers and hills on exact layers. Until a world is redrawn, its old layers show a seam.
- `assets-src/PROMPTS.md` section 3: the procedure and prompts; `public/assets/bg-*.webp` and
  their sizes in `manifest.json`. No contracts or data change.
- `.specify/experience/visuals.md`: the new look and why there is no cross-fade.

## How (decided)
The procedure is in `assets-src/PROMPTS.md` section 3 ("Procedure per world"). In short: far by
prompt, seam repainted by Gemini on a rolled copy and merged with exact sides; mid and near from
a sheet of stacked strips (the only way Gemini keeps their height), seam closed by `quilt` from a
sibling strip, Gemini as fallback; mid lifted so the near layer does not hide it. Style in words
only, no attached samples (they cost the free limit and get copied). Every picture 1376 x 768;
the bridge saves Gemini's full-size download (plugin gemini-bridge).

Per world: write SCENE (far), BAND (mid) and PLANTS (near) from the world's row in the
PROMPTS.md table and its palette hints; worlds without ground (space) keep their own layout:
far as a night sky scene, mid and near as sparse star layers on magenta, no strips.

## Steps
- [x] Tool `scripts/bg-seam.mjs`, prompts and procedure in PROMPTS.md
- [x] No cross-fade in the game (`src/gfx/draw.ts`)
- [x] meadow (far, mid lifted 130 px, near), checked in the game
- [x] space (far with nebula, mid: a star field drawn on black turned into coverage, stars at the side edges removed; near: asteroids and a planet; the game no longer draws them at 40 %)
- [x] planet
- [x] dragons
- [x] egg
- [x] junkyard
- [x] workshop (far seam repainted over 50 % with new things in the middle: the wall repeated a motif)
- [x] raintown
- [x] robocity
- [ ] robohome
- [x] garden
- [x] forestpath
- [x] lilylake
- [x] musictree
- [x] moonball
- [x] rescue
- [ ] When every world is redrawn: drop `STRIP_HEIGHT`, `writeStrip` and the 21:9 strip path from
      `scripts/assets.mjs` (no layer uses them any more) and the old table and world blocks from
      PROMPTS.md that the new prompts replaced
