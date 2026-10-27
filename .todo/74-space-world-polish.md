# 74 - Rocket world polish: hop, strong meteors, commands, boss shield

The owner's notes from playing the rocket world on 2026-10-27. Needs plan 73 (fair share
`L.share()`, background `drift`, one-piece speech bubbles).

Affected: `src/game/modes/space-calm.ts` (`HopMode`, `CommandMode`), `src/game/modes/space.ts`
(`SpaceMode`, `AsteroidMode`), `src/game/modes/copy-row.ts`, `public/i18n/{sk,en}.json` and
`public/i18n/guide/{sk,en}.json` with `src/i18n/catalog.ts`, `public/assets/` (new
`obj-console`), `assets-src/PROMPTS.md`, `.specify/game/story.md`. No store changes.

## 1. Hop level (Rocket 2, `HopMode`)

- [ ] **The rocket is behind him.** At the end the rocket passed in front of the astronaut.
      Draw the rocket before the astronaut in `render`; only after he is inside (`b >= 0.85`)
      the pilot picture alone shows.
- [ ] **Meteors appear in place.** A new meteor does not drift in from the right. It fades in and
      grows from about 0.4 to full size at its place (about 0.5 s, `ease.outBack`). Its word shows
      once it is full size (`selectable` then). Remove `DRIFT` and the drift offset in `render`.
- [ ] **Left-behind meteors do not fade or fall.** They stay where they are and leave the screen
      as the view glides after him. Drop the `off` fall and fade; their words are still released
      on landing (as now), and they are removed once they are off the screen on the left. `over()`
      counts only meteors ahead of him, which stays true.
- [ ] **Any rotation.** Each meteor gets its own random turn, `rot0` in [0, 2pi), plus the gentle
      sway already there; the flip stays random. The same goes for the stream levels:
      `SpaceMode.makeMover` starts `rot` at a random angle, for asteroids and planets alike. The
      owner saw only two orientations.
- [ ] **The near belt drifts** (plan 73's `drift`, layer `near`, about 12 px/s) while he stands;
      while the view glides the scroll moves it as now.

## 2. Strong meteors (Rocket 3, `SpaceMode` variant `strong`)

- [ ] **No jump back.** A hit strong meteor stays where it is (no `STRONG_PUSH`; remove the
      constant). It shakes in place for about 0.4 s: a quick small x/y jitter that dies out,
      plus sparkles. It keeps its word for the second hit and loses its glow (lives 1).
- [ ] **Only a shout.** The first hit shouts (`story.strongHit`, as now). The meteor's speech
      bubble `story.strongSay` goes away; the start line already says strong meteors need two
      hits. Remove the `strongSay` key from i18n, the guide notes and the catalog.

## 3. Command level (Rocket 4, `CommandMode`)

- [ ] **The near belt drifts** (`drift`, layer `near`, about 12 px/s).
- [ ] **The rocket moves only on a command.** Now `shown` eases toward `row.resolved / count`,
      so the rocket creeps on every word. The rocket's target changes only in `send()`. Between
      sends it only bobs.
- [ ] **A command can be rejected.** At `send()` the row is judged by its own words (count per
      row in `CopyRow`: words typed right and slips in this row):
      - every word right -> accepted;
      - no word right -> rejected;
      - some right, some slips -> rejected in half of the cases (`rng.chance(0.5)`), else
        accepted.
      A rejected command: the rocket answers `story.commandRejected` (new line pool, e.g.
      "Príkaz neprijatý!", "Nerozumiem, skús znova.", "Signál sa stratil."; English to match).
      It does not come closer, and it veers up or down 40 to 70 px instead (staying within VH 0.3
      to 0.7). The level goes on with the next row as now (the slips already added words).
- [ ] **Even approach.** The rocket came close after about 4 commands and then waited, because
      `row.resolved / L.count` against a count that grows with slips and the minimum time. The
      rocket's x share is the level's fair share from plan 73 (`L.share()`), taken at each
      accepted send. Its y drifts back toward the middle line by half the offset on each
      accepted command and is on the line at the end. It reaches the boarding spot only when
      the level ends.
- [ ] **A fixed console.** The command panel does not move with the rocket. It is fixed in the
      middle of the stage (`cx = vw / 2`, same `cy`, same width). On its left edge stands the
      new onboard computer picture `obj-console` (in `assets-src/`, made 2026-10-27, portrait,
      green key; run `node scripts/assets.mjs obj-console` and add its manifest entry by hand as
      with `obj-rocket-empty`; its row is already in `PROMPTS.md`). It
      is about 150 px tall and overlaps the panel's left edge by about a third. The row of words
      starts right of it, so the first word has a bigger gap from the left.
- [ ] **Replies never cross the console.** The rocket's reply bubble (`L.speak('rocket', ...)`)
      goes above the rocket unless that box would overlap the console's box. Then it goes below
      the rocket, with its tail up.
- [ ] **He flies away.** After he boards, the rocket (pilot picture) turns to fly left and slowly
      leaves the screen to the left, about 2.5 s (`ease.inQuad`), with its flame on the side
      away from where it flies. Make `END_TIME` long enough for it.

## 4. Boss (Rocket 5, `AsteroidMode`)

- [ ] **Shielded pieces.** Twice per level, one small piece (`addPiece`, not the big rocks) has
      a shield: a soft cyan bubble around it (pulsing ring, light fill). Spread the two over the
      level, e.g. the first piece after big rock 1 and the first after big rock 3 (adapt to
      `count`). Its word must be typed twice. The first time the shield pops (sparkles, `pop`,
      a short shake), and the piece keeps its place and the same word (as the strong meteor now).
      The second time it leaves as usual. A shielded piece counts once.
- [ ] Mention the shield in the boss start line (`story.asteroidStart` or whatever the boss's
      start key is), one short sentence.

## 5. Specs and checks

- [ ] `.specify/game/story.md`: meteors appear in place in the hop level; strong meteors shake
      and only shout; commands can be rejected (the rule above) and the rocket veers; the
      console is fixed with the onboard computer; the rocket leaves to the left; the boss's two
      shielded pieces.
- [ ] `tsc`, vitest, `npm run build`. In the browser (playwright MCP, `?fast`, super mode, own
      tab, `window.tapkoType`): play Rocket 2 to the end (the rocket behind him, meteors growing
      in place, any angle), Rocket 3 (a strong meteor shakes, no bubble), Rocket 4 with a few
      deliberate slips (rejected lines, veering, a still console, the reply under the rocket when
      needed, the rocket leaving to the left), and Rocket 5 until a shielded piece pops. No console
      errors.
