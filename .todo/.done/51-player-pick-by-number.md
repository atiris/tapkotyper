# 51 - Player pick by number only, nicer profile cards

Affected: `src/screens/start.ts`, `src/input/nick-pick.ts` (+ test, removed if unused),
`src/styles.css`, `public/i18n/{sk,en}.json`, `e2e/keyboard-only.spec.ts`,
`.specify/experience/accessibility.md`. No contracts, no storage or DB impact.

## Why

Plan 49 added picking a player by typing the nickname. Its letter buffer gets in the way of
the super password (`supertapkotyper`): the owner cannot reliably reach super mode. The number
keys are enough. The profile cards also look plain; they should look like a nice card that
lifts when hovered.

## What

- [x] **Numbers only.** Remove nickname typing on the start screen: the letter buffer, the
      `.typed-pick` line under "Who is playing today", its timer and Escape/Backspace
      handling. The number keys 1-9 (by `e.code`, Digit and Numpad) still pick the first nine
      players. `listenForSuperPassword` stays as it is and is now the only listener for
      letters. Remove `matchNick`/`foldName` (and `nick-pick.test.ts`) if nothing else uses
      them; also `PICK_IDLE_MS` and the `SUPER_PASSWORD` import in `start.ts` if unused.
- [x] **Bigger, playful numbers.** `.profile-num` is somewhat bigger (about 1.3x: about
      2.1em badge, about 1.1rem font) and each card's badge is turned by a different
      small, fixed angle so the row looks hand-placed. Use a short fixed list by the card's
      place (e.g. -12deg, 8deg, -5deg, 14deg, -9deg, 6deg, -14deg, 10deg, -7deg), not random,
      so it does not jump on re-render. Set it as a CSS custom property on the badge.
- [x] **Hover hint.** Each numbered card gets the shared tooltip (`data-tip`, the one
      animated tooltip from plan 47) with a new text key `start.pickByNumber`:
      sk "Profil môžeš aktivovať aj napísaním číslice {n}", en "You can also pick this
      profile by typing the number {n}". Keep the existing `aria-label` "N: nickname".
- [x] **Card look.** No graphic playing-card frame. A classic soft border: a thin
      (about 2px) border in `var(--line)` with a light inner highlight and a small resting
      shadow; on hover and focus-visible the card lifts (keep `translateY(-4px)
      rotate(-1deg)`), the border takes `var(--brand)` and a deeper, softer shadow appears,
      animated with the existing transition (add `box-shadow`). Check light and dark theme
      if the app has one. The dashed "new player" card keeps its dashed look.
- [x] **Tests and specs.** In `e2e/keyboard-only.spec.ts` keep the number-key part of
      "a player is picked by a number key ..." and drop the nickname part (rename the test).
      Add a check that typing `supertapkotyper` fast on the start screen with two players
      opens the map as Super Tapko. Update `accessibility.md` "Picking a player by keyboard":
      numbers only, the hover hint, why nickname typing was dropped (it clashed with the
      super password).
- [x] `npm run build`, `npm test`, the e2e spec; drive the start screen with the playwright
      MCP: hover a card (tooltip text, lift and shadow), press 2, type the super password.

## Done - 2026-10-23

- Shipped: number keys 1-9 are the only keyboard pick (`pickByNumber` in `start.ts`); nickname
  typing, `.typed-pick` and `input/nick-pick.ts` (+ test) removed. Bigger number badges tilted
  by a fixed per-place angle (`--tilt`), a `start.pickByNumber` tooltip on each numbered card,
  a soft 2px `var(--line)` border with inner highlight and resting shadow that lifts with a
  brand border and deeper shadow on hover/focus. e2e: number pick plus the super password with
  two players. Spec updated.
- Decision: the profile list got 20px bottom padding and the hover shadow is 0 9px 18px, since
  the scrolling list clipped a larger shadow (seen in the browser).
- The app has no dark theme; high contrast uses its own `--line`/`--brand`, so it follows.
- Left out: nothing.
