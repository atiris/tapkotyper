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
- [x] 1. **Tooltip and Escape on a new player's map.** The welcome card's capture-phase Escape
      handler (`welcomeCard` in `src/screens/map.ts`, `stopImmediatePropagation`) eats Escape
      before `src/ui/tooltip.ts` sees it. Rule: Escape first hides an open tooltip; only an
      Escape with no tooltip shown closes the welcome card. Fix in the app (e.g. the card's
      handler leaves the key alone while the tooltip is shown), not in the test.
      `e2e/tooltip.spec.ts:28` passes.
- [x] 2. **Free typing intro in the dark look.** `freeType.start` is drawn at contrast 2.26 on
      rgb(58,52,86). Give that text the theme's readable ink in the dark look (a token on
      `:root` for dark, no hard-coded colour), so it reaches 4.5. `e2e/theme.spec.ts:165`
      passes; check by eye with playwright in both looks.
- [x] 3. **Flaky under load.** `free-type.spec.ts:82`, `styles.spec.ts:31`,
      `translate.spec.ts:15`, `service.spec.ts:27` fail now and then in a full run, pass alone.
      For each: run the full suite 3 times, read the failure (trace on first retry), and fix
      the cause in the test: wait for the state the step needs (a locator, `expect.poll`, a
      screen class), never a bigger fixed `waitForTimeout`. If the app has a real race (a
      click lost before a screen is ready), fix the app. Retries in the config are not a fix.
- [x] 4. Run `npx playwright test` three times in a row: all green each time. Remove the three
      backlog entries in the same commit.

## Progress notes
- 1: `tipShown()` in `src/ui/tooltip.ts`; the welcome card's Escape handler leaves the key alone
  while a tooltip shows.
- 2 (decision): not an app bug. The bubble already uses the dark tokens (`--ink` on `--surface`,
  about 11:1). The check measured it mid pop-in (opacity 0..1), so the ratio varied (2.26, 3.3).
  The dark-look test now waits for the bubble and for finite animations to end instead of 400 ms.
- 3: the flaky tests shared one cause: start loops with a step budget (40-100 tries, a 5 s expect)
  that ran out while 8 workers loaded the world's pictures. New `untilPlay` in `e2e/helpers.ts`
  without a budget (the test timeout bounds it) replaces them in styles, help, keyboard-only and
  theme. Also seen in full runs and fixed in the tests: free typing waited for a visible Tapko
  (hidden there; now `attached`), service clicked the start page's corner button before the map
  showed, translate gave a big lazily filled section only 5 s, keyboard-only plays two levels and
  got 300 s like the theme test. No app race found.

## Done when
Three full runs in a row pass; the backlog no longer lists these three entries.

## Done - 2026-10-26
- Shipped: Escape hides a shown tooltip before it closes the welcome card; the e2e start loops
  share one `untilPlay` helper without a step budget; the dark-look test waits for animations
  instead of 400 ms; smaller load fixes in free-type, service, translate and keyboard-only.
- Three full `npx playwright test` runs in a row: 77 passed each.
- Left out: no app change for the free typing intro, its colours already read well (see step 2).
  The by-eye dark check with the playwright MCP did not switch the look by `data-theme` alone; the
  dark-look contrast test covers the bubble. Nothing new for the backlog.
