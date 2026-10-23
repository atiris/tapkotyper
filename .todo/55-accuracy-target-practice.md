# 55 - Target practice for weak letters, clear key locks

Affected:
- `src/game/levels.ts`: a new level kind `aim` shared by all worlds.
- `src/game/modes/aim.ts` (new) and `src/game/modes.ts`.
- `src/game/runtime.ts`, `src/learning/lessons.ts`: weak keys.
- The word picker: words rich in weak letters.
- `src/screens/map.ts`, `src/styles.css`, `public/i18n/{sk,en}.json`.
- `assets-src/PROMPTS.md`: rows for the target and projectile art, status `todo`.
- `.specify/game/` (new `target-practice.md` + `index.md`), `.specify/learning/lesson-progression.md`.

No storage or DB impact beyond key stats. The run gives no stars.

## Why

New letters open only when the newest group's keys are ready: 90 % right and a calm rhythm
(`isReady` / `advanceLesson` in `lessons.ts`). A child with low accuracy on a few letters is
stuck and does not see why. The child needs:
- a clear message on the locked level's key or the world's lock;
- a fun, voluntary place to train exactly those letters.

## What

- [ ] **Weak letters.** A pure function `weakKeys(profile)` in `lessons.ts`, with a test:
      - The keys of the newest unlocked group that are not `isReady`.
      - If there are none, the 3 unlocked letters with the lowest recent accuracy.
- [ ] **Clear lock message.** When a level or world is locked because letters are not ready:
      - The key icon on the level (`level-key`) and the world lock get a tooltip.
      - The bubble shown on click says which letters still need accuracy: sk "Aby sa otvorila
        ďalšia úroveň, potrebuješ presnejšie písať: {keys}. Precvič ich na Strelnici.", en
        "To open the next level, type these more accurately: {keys}. Train them at the Target range."
      - It is a new key next to `map.keysOne/Few/Many`; keep their counts.
      - The bubble's practice button opens the target practice when it is unlocked, and own
        practice otherwise.
- [ ] **Button per world.** On the map, each world whose 5th level (the super level) is done
      shows a "Strelnica" / "Target range" button by its levels. Before that, the button is
      hidden. Playing it is always voluntary.
- [ ] **The mode (one for all worlds, on the world's own background).**
      - Tapko stands at the left and throws a projectile at a target at the right. Each throw
        picks at random: a pebble, a screw, a fly, a tomato, an arrow, a rubber duck, a sock.
      - The projectile flies slowly through 3-5 "layers": hoops or soap-bubble rings between
        Tapko and the target. Each layer carries a word that trains the weak letters.
        Typing the word right lets the projectile pass the layer.
      - A wrong key makes the projectile sink a little (lower path). After 3 errors in one
        flight it falls to the ground with a soft "plop" and disappears; nothing bad happens,
        and the next throw comes.
      - Passing all layers hits the target with a funny effect: the tomato splats, the fly
        sticks and buzzes, the duck squeaks.
- [ ] **The target shows accuracy.** Its size follows the child's recent accuracy on the weak
      letters: a big target at low accuracy, smaller as it improves.
      - When a weak letter becomes ready during the run, the target shrinks with a little
        animation, Tapko cheers ("Hurá!" from `story.cheer` if plan 52 added it, otherwise a
        line in this mode's texts), and the letter leaves the weak list.
      - The HUD shows the weak letters with a small accuracy bar each.
- [ ] **Length.** About two minutes, or 12 throws, whichever comes first. It ends with a card
      that has no stars: accuracy before and after per weak letter, plus "Znova" and "Na mapu".
      Lesson advance runs at the end, so a ready group opens new letters right there; say so on
      the card.
- [ ] **Art.** Draw everything in code first, through `drawSprite` fallbacks: the target, the
      projectiles, the layer rings. Add rows to `assets-src/PROMPTS.md` with status `todo` for
      `obj-aim-target` and `obj-aim-{pebble,screw,fly,tomato,arrow,duck,sock}`, so the owner can
      generate them later. Do not generate images in this unattended run.
- [ ] **Specs:**
      - New `.specify/game/target-practice.md`: what and why (fun accuracy practice for
        exactly the letters that block progress).
      - Link it from `.specify/game/index.md`.
      - lesson-progression.md: the lock message and the way out.
- [ ] **Checks:** `npm run build`, `npm test` (`weakKeys`, the mode's pure logic), and an e2e
      test that opens the range from the map. Then drive the game with the playwright MCP:
      - A profile with a weak letter: the lock tooltip and the bubble name it.
      - The range opens, a throw passes, a wrong key makes the projectile sink, and three
        wrong keys make it fall.
      - The end card shows accuracy before and after.
