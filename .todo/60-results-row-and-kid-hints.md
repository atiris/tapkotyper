# 60 - Results buttons in one row, instructions for children as a profile setting

Affected: `src/screens/level.ts` (`showResults`), `src/styles.css` (`.results-card`),
`src/screens/map.ts` (welcome card), `src/storage/schema.ts` + `store.ts` (`Settings.kidHints`),
`src/screens/parent.ts` (the switch), `public/i18n/{sk,en}.json`, e2e that read the welcome card,
`.specify/profiles/parent-controls.md`, `.specify/experience/help.md`.
Storage: a new boolean in the profile settings, default `false`; no migration needed (not
launched; a missing value reads as `false`).

## Why

- On a wide screen the results card is only 520 px wide, so its 3-4 buttons wrap into two rows
  and the child has to look for the next step.
- The welcome card tells the child "Rodič si môže všetko nastaviť cez ozubené koliesko vpravo
  hore." That sentence is for the parent, not the child. Small children (up to about 10) do
  need a few extra instructions; older ones find them in the way.

## What

- [ ] **One row of buttons.** When the screen is wide enough, all results buttons sit in one
      row: the card grows to fit its buttons (up to the panel width, about 860 px) instead of the
      fixed 520 px; the text above stays readable (keep its own max width). On a phone they wrap
      as now. No button is hidden or shortened.
- [ ] **Parent sentence gone.** Remove "Rodič si môže všetko nastaviť…" (`map.welcome.lines`,
      sk and en) everywhere a child sees it. The parent learns it from help.
- [ ] **Instructions for children** (per profile, parent area, next to the other learning
      settings): a switch "Inštrukcie pre deti" with the hint "Zobrazí sa zopár inštrukcií
      navyše. Vhodné pre deti asi do 10 rokov." / "Shows a few extra instructions. Good for
      children up to about 10." Default off.
      - On: the welcome card shows its how-to lines ("Stlač Pokračovať…", "Keď nevieš ako
        ďalej, klikni na ?").
      - Off: the welcome card shows only its title and the start button.
      - Go through the other child-facing texts once (map, level cards, results): a sentence
        that only explains how to operate the screen, and is not needed to play, becomes
        kid-hints only. Story texts, mode intros and anything a child needs stay for all. List
        what moved in the plan's Done section.
- [ ] **Specs:** parent-controls.md (the switch and why), help.md (the parent sentence lives in
      help).
- [ ] **Checks:** `npm run build`, `npm test`, e2e (fix the ones that read the welcome lines).
      Then the playwright MCP: results at 1280 px (one row) and 390 px (wraps); a new profile
      with the switch off and on (welcome card), the switch in the parent area.
