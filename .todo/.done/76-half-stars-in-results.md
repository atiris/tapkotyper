# 76 - Half stars on the results card

The owner wants the level's results to show half stars too (2026-10-27). The map cards,
the progress table and the saved progress keep whole stars only: a whole star still needs the
whole threshold, and halves are never stored.

Affected: `src/game/levels.ts` (`starsFor`, new `halfStarsFor`), `src/game/progress.ts`
(`LevelResult`), `src/ui/chrome.ts` (`starRow`), `src/screens/level.ts` (results card),
`public/i18n/{sk,en}.json` (`results.starsAria`), `src/styles.css` if the half needs a class,
`.specify/`. The picture `public/assets/ui-star-half.webp` (+ manifest entry, PROMPTS note)
is already committed. No store changes.

## The rule

| Accuracy | Results card | Saved / map |
|---|---|---|
| >= 95 % | 3 | 3 |
| 90 - 94 % | 2.5 | 2 |
| 85 - 89 % | 2 | 2 |
| 80 - 84 % | 1.5 | 1 |
| < 80 % | 1 | 1 |

A level the paw did (`byTapko`) shows 1, as now. The saved stars stay `starsFor` (unchanged),
which is always the shown value rounded down.

## Steps

- [x] `halfStarsFor(accuracy)` in `src/game/levels.ts` returns 1, 1.5, 2, 2.5 or 3 by the
      table. Unit tests at the edges (0.7999, 0.80, 0.85, 0.90, 0.95), and a test that
      `Math.floor(halfStarsFor(a)) === starsFor(a)` for a sweep of accuracies.
- [x] `LevelResult` gets `shownStars` (the half value; 1 when `byTapko`). `stars` stays the whole
      value that is saved and counted (`starsEarned`, badges, medals).
- [x] `starRow(n)` draws a half: for `i - 0.5 === n` the slot uses the picture
      `ui-star-half` (a real picture, no clipping). Its fallback without pictures is the `★`
      fallback with a `half` class. It gets the same `on` animation as a whole star. Only the
      results card passes a half value; the map and the progress table keep passing whole stars.
- [x] The results card (`src/screens/level.ts:131`) uses `r.shownStars`.
- [x] Aria: `results.starsAria` reads a half right in both languages: sk "2,5 z 3 hviezdičiek"
      (decimal comma), en "2.5 of 3 stars". Format the number by the UI language.
- [x] `src/game/super-help.ts` aims at accuracies by `starsFor`. Leave it unless its comment
      names the shown stars.
- [x] `.specify/`: the star rule with halves on the results card and whole stars everywhere
      else (search `.specify/` for "stars"/"hviezd").
- [x] `tsc`, vitest, `npm run build`. In the browser (playwright MCP, `?fast`, super mode, own
      tab): finish a level at about 92 % (type a few wrong keys with `window.tapkoType`): the
      card shows 2 full stars and a half star, and the map card of that level shows 2 stars.

## Done - 2026-10-27

Shipped: `halfStarsFor` with edge and floor tests, `LevelResult.shownStars`, `starRow` draws
`ui-star-half` (fallback `★` with a `half` class, a two-colour text gradient), the results card
shows the half value, the aria number is formatted by the UI locale (sk "2,5 z 3 hviezdičiek",
en "2.5 of 3 stars") so the i18n texts needed no change. `super-help.ts` left as is (its
comment names `starsFor`). Spec: a **Stars** rule in `.specify/game/mechanics.md`, and the stale
"Esc goes back to the map" line there now names peeking first. Browser: the first meadow level
at 92 % showed 2 whole stars and the half picture, aria "2,5 z 3 hviezdičiek"; the map card
read "hviezdičky: 2". Nothing left out.
