# 68 - Green e2e: the whole `npx playwright test` run passes

Source: backlog entries "Tooltip e2e fails on a new player's map", "Free typing intro unreadable
in the dark look", "E2e flaky in a full run".

## What and why
- The full e2e run has failed for weeks (72 of 77), so a new break hides among the known ones.
  The goal is a run that passes every time, so a red run always means a real problem.
- Two failures are real bugs in the app, not test problems; they are fixed in the app.

## Affected
- `src/screens/map.ts` (welcome card Escape), `src/ui/tooltip.ts`, the free typing screen
  (`src/screens/free-type.ts`, `src/styles.css`), e2e specs and `e2e/helpers.ts`,
  `playwright.config.*`. No data or contract change.

## Steps
- [ ] 1. **Tooltip and Escape on a new player's map.** The welcome card's capture-phase Escape
      handler (`welcomeCard` in `src/screens/map.ts`, `stopImmediatePropagation`) eats Escape
      before `src/ui/tooltip.ts` sees it. Rule: Escape first hides an open tooltip; only an
      Escape with no tooltip shown closes the welcome card. Fix in the app (e.g. the card's
      handler leaves the key alone while the tooltip is shown), not in the test.
      `e2e/tooltip.spec.ts:28` passes.
- [ ] 2. **Free typing intro in the dark look.** `freeType.start` is drawn at contrast 2.26 on
      rgb(58,52,86). Give that text the theme's readable ink in the dark look (a token on
      `:root` for dark, no hard-coded colour), so it reaches 4.5. `e2e/theme.spec.ts:165`
      passes; check by eye with playwright in both looks.
- [ ] 3. **Flaky under load.** `free-type.spec.ts:82`, `styles.spec.ts:31`,
      `translate.spec.ts:15`, `service.spec.ts:27` fail now and then in a full run, pass alone.
      For each: run the full suite 3 times, read the failure (trace on first retry), and fix
      the cause in the test: wait for the state the step needs (a locator, `expect.poll`, a
      screen class), never a bigger fixed `waitForTimeout`. If the app has a real race (a
      click lost before a screen is ready), fix the app. Retries in the config are not a fix.
- [ ] 4. Run `npx playwright test` three times in a row: all green each time. Remove the three
      backlog entries in the same commit.

## Done when
Three full runs in a row pass; the backlog no longer lists these three entries.
