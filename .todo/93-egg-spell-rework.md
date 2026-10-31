# 93 - Egg 5, the spell of awakening: owner's review

The owner played egg 5 (level `w5-5`, kind `spell`, `src/game/modes/egg-spell.ts`) on
2026-10-31 and asked for a calmer, clearer spell with a gentler slip rule and a real hatching
end. No DB/store impact (alpha: no store migrations; nothing new is stored). Affects
`src/game/modes/egg-spell.ts`, its tests (`src/game/modes/*.test.ts` that cover `SpellRibbonMode`),
`public/i18n/{sk,en}.json` (+ `public/i18n/translator/en.json` notes, `src/i18n/catalog.ts`
when a key is added or removed), `.specify/game/story.md` (egg 5 paragraph).

## Decisions (taken; do not ask)
- **Start text** (`story.spellStart`, sk; translate to en in the same tone, bold with `**`):
  "**Si na vrchole** Hory prebudenia. Polož vajíčko do ohniska drakov a prednes kúzlo
  prebudenia. Je dlhé a musí byť presné: pri chybe sa ti v kúzle objaví nové slovo, ktoré musí
  chybu napraviť, takže **sa sústreď na presné písanie** kúzla. Po jeho vyslovení by sa malo
  ohnisko prebudiť, a ak bude dostatočne silné, dráčik sa prebudí. Určite sa už na teba teší!"
- **Cracking egg picture**: `obj-egg-cracking` is already redone (half cracked, no eyes,
  2026-10-31, `assets-src/PROMPTS.md`). Nothing to generate; only check it reads well in the hearth.
- **Hearth near Tapko**: the hearth stands just right of Tapko (its middle about 150 px of
  stage right of `HERO_X`, not at 78 % of the stage), so the spell area on the right half stays free.
- **Layout of the spell**: the ribbon (the words to type) and the stone frame under it (what is
  written) have exactly the same width and the same left edge, both in the right half of the
  stage (`x` from `vw / 2` to `vw` minus a margin). When the stage is narrow (`vw < 1.6 * VH`,
  portrait-ish or a small laptop), they take the right two thirds instead. Tapko and the hearth
  stay in the left part.
- **Smooth words**: the ribbon never jumps. Its offset follows the target position with a
  critically damped spring (or an exponential ease, about 0.25 s time constant), also after a
  slip and when a new word is added; no instant snaps. New words fade/slide in from the right.
- **Grey inactive words**: every word but the one in progress is drawn grey (the game's muted
  text grey, e.g. `#8a8f98`, at full opacity), the word in progress in the normal ink.
- **Soft edges**: both ends of the ribbon fade out over the width of the ribbon's end cap (the
  half circle of its rounded ends, i.e. `RIBBON_H / 2` plus a little): anything outside and
  under the fade dissolves smoothly (a horizontal alpha gradient mask, e.g. draw the ribbon to
  an offscreen canvas and `destination-in` a linear gradient), never a hard cut.
- **Slip rule (replaces `slipBack`)**: a slip no longer erases anything. The word in progress
  starts again from its first letter, and the spell **grows**: one new word is inserted right
  after the current word (drawn from the same spell vocabulary as the rest), and the level's
  minimum time grows by that word's share (`L.extendMin`, seconds of one planned word, as the
  mountain's detours do). At most 10 added words per level; after that a slip only restarts the
  word. The existing slip lines stay (first slip explains, then one in about ten reminds);
  their text must say a word was added, not that one vanished: sk "Chybička! Do kúzla pribudlo
  slovo." (`story.spellSlip`), keep `story.spellCareful` if it fits, else reword the same way.
- **The end**: when the last word is typed, the flames flare once, then the egg hatches
  (`obj-egg-cracking` -> the shell breaks), **the flames go out** (to `obj-flame-out` or to no
  flame at all, then the cold hearth), the little dragon (`obj-dragon-hatched`, out of its shell)
  **jumps out** of the hearth with a hop arc and lands next to Tapko on his right, then the
  level ends. Its line is just "Ahoj!" (en "Hi!") (`story.spellHello`, one short line), no long
  speech. Keep the total end about as long as now (about 4 s).

## Steps
- [ ] Start text sk/en; `story.spellSlip` (and `spellCareful` if needed) reworded for the new rule.
- [ ] Hearth next to Tapko; spell ribbon and frame in the right half (right two thirds when narrow), same width and left edge.
- [ ] Ribbon motion smoothed (no snapping), new words ease in; inactive words grey; soft fading ends.
- [ ] Slip rule: restart the word, insert one word after it, extend the minimum, cap 10; remove `slipBack` and anything only it used (no dead code); tests rewritten for the new rule.
- [ ] End: flare, hatch, flames out, the dragon hops out to Tapko, "Ahoj!".
- [ ] `.specify/game/story.md` egg 5 paragraph updated (what and why).
- [ ] tsc, vitest, build; play `w5-5` in the browser with the Playwright MCP (tester profile, `?fast`, `window.tapkoType`): the layout at 1366x768 and at a narrow 1000x768, a slip (a word is added, nothing vanishes, nothing jumps), the end sequence.
