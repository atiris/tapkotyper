# 75 - Meadow polish: rising gloves, a poppy bouquet, a hedgehog that scatters leaves

The owner's notes on the meadow world from 2026-10-27. Needs plan 73 (background `drift`).

Affected: `src/game/modes/meadow.ts` (`Gloves`, `MeadowMode`, `HedgehogMode`),
`src/game/modes/meadow-calm.ts` (`DewdropsMode` becomes the poppy level),
`src/game/modes.ts`, `src/game/levels.ts` (kind name), `scripts/assets.mjs`,
`public/assets/` (+ manifest), `assets-src/PROMPTS.md`, `public/i18n/{sk,en}.json` and the
guide notes with `src/i18n/catalog.ts`, `.specify/game/story.md`. No store changes; the level
id `w1-2` stays, so stars already earned there stay.

## 1. Meadow 1: the gloves rise with the leaf

**What is wrong:** when a word is typed, the gloves jump to the leaf's catch height at once
(`aimY = aim.saveY`, eased at `dt * 10`) and wait there.

- [ ] The gloves rise step by step as the typed leaf comes closer. Their height is
      `restY + (saveY - restY) * k`, where `k` is the leaf's share of its way from where it was
      typed to the catch point (store the typed x on the mover, `k = 1 - dist / startDist`,
      eased `ease.inOutQuad`). They arrive at the catch height just as the leaf arrives. When
      there is no leaf, they ease back to rest as now. With several leaves on the way, the closest
      one leads (as now).

## 2. Meadow 2: grow a bouquet of poppies (replaces the dew drops)

**What:** the calm step becomes "grow a bouquet of corn poppies". A bud grows somewhere in the
near grass band, a letter shows above it, and typing the letter makes it bloom. Later it fades
and drops its petals, and a new bud grows elsewhere. It is like the dew drops now, with the
same letters, the same count, the same "every waiting letter starts differently" rule, and up
to 3 at once.

Pictures, already generated on 2026-10-27 in `assets-src/` (portrait 848 x 1264, magenta
key, the same stem, leaves and stem bottom in every phase):
`obj-poppy-bud.jpg`, `obj-poppy-opening.jpg`, `obj-poppy-flower.jpg`, `obj-poppy-faded.jpg`
(one drooping pale petal left, seed head showing), `obj-poppy-seedhead.jpg` (no petals).

- [ ] **Process them as one set.** In `scripts/assets.mjs`, generalize the flap set
      (`flapFrames`: one shared size, keyed out, one shared crop box) so the `obj-poppy-` files use
      it too. This keeps the stem bottom in the same place in every phase. Run
      `node scripts/assets.mjs obj-poppy`, add the five manifest entries by hand (the prefix run
      keeps the manifest), commit the webp files. Their rows are already in `PROMPTS.md`. Add one
      lesson under "Lessons from generating": "phase pictures edited from one base keep the stem; Gemini
      hardly changes the height on request, so the game scales the phases".
- [ ] **The phases and their timing,** per spot:
      1. the bud grows out of the grass (scale 0 -> 1 from the stem bottom, about 0.6 s), then
         its letter shows above it;
      2. the letter typed: in half of the cases the opening bud shows for about 0.7 s first,
         otherwise straight away the flower (pop, a few red petal particles);
      3. the flower stays about 3 s;
      4. the faded flower (one petal left) shows for about 1.2 s, as 2 to 3 petals flutter down
         as particles;
      5. the seed head stays for about 1 s and fades out; the spot is free again.
      The phase pictures are drawn at growing heights by code, because the pictures hardly differ:
      bud 0.82, opening 0.9, flower 1.0, faded 1.0, seed head 0.96 of the flower height. The
      flower is about as tall as Tapko (the letter label stays the game's normal letter size, in
      proportion to him, not huge).
- [ ] **Mirrored sometimes.** Each spot picks `flip` once, in about a third of the cases, and
      every phase of that poppy is drawn with the same flip.
- [ ] **Where they grow.** Only in the near grass band: stem bottom at y in
      [VH * 0.8, VH * 0.92], x anywhere right of Tapko's spot up to the right edge minus a margin.
      There are no fixed spots any more. A new bud keeps at least about 130 px from every
      other living poppy, and not where the last one was typed. Lower (nearer) ones draw last.
- [ ] **No code-drawn stem.** Remove the drawn stem and the code `flower()` from the level.
      The fallback while a picture is missing is a simple blob in the phase's color.
- [ ] **The bouquet.** Each typed letter adds a poppy to the bouquet. The start line says the
      goal (new `story.poppyStart` pool, e.g. "Vypestujme kyticu vlčích makov!"; English to
      match). At the end, the flower pictures gather in the middle as a fanned bouquet (the
      typed count, at most about 9 stems, rotated -0.5..0.5 rad around a common stem bottom,
      with a small ribbon drawn in code), with a happy shout. This replaces the dew-drop end.
- [ ] Rename the mode and kind (`DewdropsMode` -> `PoppyMode`, kind `dewdrops` -> `poppies`)
      everywhere: `levels.ts`, `modes.ts`, tests, i18n keys (`story.dewStart` -> `story.poppyStart`),
      guide notes, catalog. Drop `obj-dewdrop` from the level's pictures. If nothing else uses it,
      delete `public/assets/obj-dewdrop.webp`, its manifest entry and its PROMPTS row
      (search first).
- [ ] **The middle band drifts** (plan 73's `drift`, layer `mid`, about 8 px/s) in the meadow's
      still levels: the poppies and the invitation (Meadow 4).

## 3. Meadow 5: the hedgehog

- [ ] **20 px higher:** `hy` from `VH - 82` to `VH - 102` (check that his leaves' launch point
      and the shout spot follow `hy`).
- [ ] **Leaves scatter in every direction.** When he shakes, the leaves of a volley fly off him
      to different places: some forward (closer to Tapko, up to about 260 px left of him), some
      behind him (up to about 120 px right of him, still on the stage). Each then flies on toward
      Tapko as now. Give each leaf its own toss target x and arc (`m.launch` gets `x0`/`x1`), so the
      toss moves it in x as well as y. A leaf's word shows when its toss ends, as now.

## 4. Specs and checks

- [ ] `.specify/game/story.md` (meadow): the gloves rise with the leaf; Meadow 2 is the poppy
      bouquet (phases, half of the buds open first, mirrored poppies, the bouquet at the end); the
      hedgehog scatters leaves around him.
- [ ] `tsc`, vitest, `npm run build`. In the browser (playwright MCP, `?fast`, super mode, own
      tab, `window.tapkoType`): Meadow 1 (gloves rise step by step), Meadow 2 to the end (all five
      phases seen, some mirrored, the stems sit in the grass, the bouquet), Meadow 4 (the middle
      band drifts), Meadow 5 (a volley scatters in front of and behind him). No console errors.
