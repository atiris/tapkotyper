# 84 - The range's crystal is one ruby

The owner (2026-10-30): the crystal thrown on the target range should be one crystal, not the
planet's group of three points, finished nicely at both ends, and ruby red. No such picture exists;
it comes from Gemini.

Affected: `src/game/modes/aim-things.ts` (the `crystal` thing's `pics`), `assets-src/` +
`assets-src/PROMPTS.md` (section 10, Target range), `public/assets/` + `manifest.json`. The
planet's crystals (`obj-crystal-amber/rose/aqua`, used by `planet-crystals.ts`, the map and
scenes) stay as they are. No store change.

## Steps
- [ ] `obj-aim-crystal` via Gemini (skill `gemini-bridge:gemini-images`), magenta key, the style of
      the other `obj-aim-*` pictures (attach `obj-aim-crown.jpg` as a style reference): one single
      six-sided crystal, standing slightly tilted, pointed at both ends (a cut tip on top and on the
      bottom, like a double-terminated quartz), no side points, no base, no rock; translucent ruby red
      #D7263D with facets #FF5A6E and edges #8E1426, one soft white highlight; no face, no glow.
      Row in `PROMPTS.md` section 10 (status `done <date>`), lessons if any. Through the project's
      asset pipeline like the other `obj-aim-*` pictures (webp, manifest).
- [ ] The `crystal` thing in `aim-things.ts` throws `['obj-aim-crystal']`; its flash colour fits ruby
      (e.g. `#ffd0d6`), its lines stay.
- [ ] The translator shows the new picture (its `thumbs` reads the thing's `pics`, nothing to do;
      check it).
- [ ] tsc, vitest, build. Browser: the target range with the crystal thrown (playwright MCP), a
      screenshot of a hit.
