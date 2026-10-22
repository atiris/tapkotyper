# 49 The whole game by keyboard: Enter and Space, player numbers, F-keys, help and leaving in play

Runs **after plans 47 and 48**. It uses the tooltip from 47 for the shortcut hints, and the
player order from 48 (Super Tapko last).

Affected: new `src/input/shortcuts.ts` (+ test), `src/screens/{start,map,level,help,story,
new-profile,wardrobe,stats,results if separate}.ts`, `src/game/{runtime,cards}.ts`,
`src/ui/{chrome,menu,hud}.ts`, `src/audio/audio.ts` (labels only), `src/styles.css`,
`public/i18n/{sk,en}.json`, `e2e/{play,layout,help,own-content}.spec.ts` + new
`e2e/keyboard-only.spec.ts`, `.specify/experience/{accessibility,help,ui-rules}.md`,
`.specify/game/mechanics.md` (pause and leaving).
Contracts: none. No storage change, no server, no DB.

## What
1. **No mouse needed.** From the start screen to the results and back to the map, every
   step goes on with **Enter** or **Space**. A clear default action is focused and visibly
   ringed on every screen, card and dialog. Tab and the arrow keys move between choices.
2. **"Kto sa dnes hrá"**:
   - Keys **1-9** pick the first nine players. Each card shows its small number.
   - Typing a player's nickname also picks that player. It is case- and
     diacritics-insensitive, and the player is picked once only one player matches what was
     typed.
   - The typed letters show softly under the title.
   - The Super Tapko password still works.
3. **Shortcuts** anywhere they make sense:
   - **F1** opens the help that fits the moment (in a level, the help for that level; on a
     screen, its help tab).
   - **F2** turns the keyboard guide on and off.
   - **F3** turns reading aloud on and off.
   - **F4** steps the sound through full, quiet and off.
   - **F8** plays the next music track.
   - Each button's tooltip ends with its key, e.g. "Klávesnica (F2)".
4. **Help in a level** opens as a normal full page (not over a see-through background), with
   **Späť** at the top left. Back (or Esc) returns to the paused level.
5. **Leaving a level is clear.**
   - The pause card's "Mapa" becomes **"Ukončiť úroveň"** in a story, **"Ukončiť cvičenie"**
     in practice and custom exercises, and **"Ukončiť misiu"** in a rescue.
   - When something was already typed in this level, it asks first: "Naozaj ukončiť? Táto
     úroveň sa nezapočíta." The choices are "Ukončiť" and "Pokračovať", with "Pokračovať"
     focused.
6. **Custom exercise** has the usual **Späť** at the top left in place of "Skončiť" on the
   right. It still ends the exercise and shows its results.

## Why
- Children learning to type should keep their hands on the keyboard. Reaching for the mouse
  breaks the home position the game teaches.
- Numbers and nicknames make picking a player as fast as typing.
- F-keys give a quick way to the things a child toggles often, and the tooltip teaches
  them.
- A see-through help over a busy level is hard to read.
- "Mapa" did not say that it throws the level away, and it did so without asking.
- Every other screen has Back at the top left; the custom exercise was the odd one.

## Decisions
- **Shortcuts module** (`src/input/shortcuts.ts`): one `keydown` listener on `window`,
  capture phase, for `F1`, `F2`, `F3`, `F4` and `F8`.
  - It calls `preventDefault()` for these keys only (this stops the browser's help, find and
    so on).
  - Handlers are registered per context: `setShortcuts({ help, guide, read })`. A level
    registers its `toggleGuide`, `toggleRead` and an `openHelpCard`-like help. Screens
    register `help` only. Global defaults are `F4 -> audio.cycleLevel()` and
    `F8 -> audio.shuffleTrack()`. A missing handler does nothing.
  - Shortcuts are ignored while focus is in a text field, except F1.
  - Sound and track changes show the existing sound button state and a short bubble or toast
    with the new level or track name.
  - Unit test of the dispatch (context switch, text-field rule).
  - Tooltip texts get " (F2)" and so on through one helper `withKey(label, 'F2')`.
- **F1 help by context:**
  - Level: pause, then the level help page (below), with the help part for this level kind
    or the paw opened when the help has such a section; otherwise the typing tab.
  - Map: `ui` tab. Settings: `settings` tab. Stats: `progress` tab. It uses the help return
    from plan 47.
- **Help page in a level** (`help.ts` `openHelp`, `runtime.ts`):
  - It is a full-screen layer inside the level screen with the opaque page background and
    the same frame as the help page (sticky bar, Back left, narrow column). It is not a
    route change, so the level state stays.
  - The `.help-overlay` translucent style goes away.
  - Back or Esc removes it and returns focus to the pause card's "Pokračovať".
  - The "?" HUD button and the pause card's Help both open it. The help card variant in
    `openHelpCard` is dropped if it becomes unused.
- **Leaving** (`runtime.ts` pause card):
  - Label key by kind: `level.endLevel`, `level.endPractice`, `level.endRescue`.
  - The confirm (`confirmDialog`) appears when `typedChars > 0` in this level (any correct
    or wrong press). The cancel button is first and focused (as `confirmDialog` already
    does).
  - Confirm calls `exit()` as today, and `flushSession` still saves time and keys.
  - Free typing keeps its X without asking (nothing is scored there).
- **Custom exercise** (`level.ts` around line 76): remove the appended "Skončiť" button.
  - For `def.kind === 'practice' && !params.seconds`, the HUD's first element is
    `button(t('common.back'), () => rt.endPractice(), 'btn ghost small', 'back')`, before
    the pause button.
  - Its tooltip says it ends the exercise and shows the results.
  - Esc still pauses.
- **Start screen** (`start.ts`):
  - Cards get `data-n` 1-9 and a small number badge (top left of the card, game font,
    `aria-hidden`; the `aria-label` gets "1: Ema").
  - The key handler is on `window` while the screen is shown and is removed on cleanup:
    - digits pick a card;
    - letters feed a buffer, reset after 1.5 s idle or on Esc;
    - matching normalises with NFD, strips marks and lowercases, and compares against each
      nickname as a prefix, picking the player when exactly one matches and the buffer
      length is at least 2 or equals a full nickname;
    - Backspace edits the buffer.
  - The super password listener keeps working: it sees the same keys, and the buffer just
    finds no match.
  - The first card is focused on entry.
- **Enter and Space everywhere**: audit each screen and card. Each one focuses its main
  action on entry and shows `:focus-visible` rings (the existing focus style, or add one for
  round buttons and cards).
  - **Start:** the first card, or "Nový hráč" when there are none.
  - **New profile:** focus the nickname. Enter in the last field submits, and the character
    picker uses the arrows.
  - **Map:** already focused. Check that the world cards and level nodes work with
    Enter/Space and the arrows.
  - **Cards, story scenes, results:** Enter and Space both continue.
  - **Wardrobe and stats:** Back focused; Esc goes back.
  - **Dialogs:** as `modal` does.
- `e2e/keyboard-only.spec.ts`: a new browser context that uses only `keyboard.press` and
  `keyboard.type`, no clicks. It goes:
  1. new player;
  2. map welcome;
  3. first level (get-ready with Space, play by typing the targets read from the page state
     helpers in `e2e/helpers.ts`);
  4. results;
  5. the map again;
  6. pause and end with the confirm;
  7. F2 hides the guide;
  8. F1 opens help, then Back.
- Specs:
  - `accessibility.md`: keyboard-only, shortcuts, numbers and nickname pick.
  - `mechanics.md`: leaving with confirm.
  - `help.md`: help in a level and F1.

## Steps
- [ ] Shortcuts module with unit test; level and screen registration; tooltip key hints.
- [ ] Help page layer in levels with Back; F1 by context.
- [ ] Pause end labels and confirm; custom exercise Back.
- [ ] Start screen numbers, digit and nickname pick.
- [ ] Enter/Space and focus audit of every screen; focus rings.
- [ ] i18n sk + en; specs as listed.
- [ ] `npm run build`, `npm test`, `npx playwright test` pass, including
      `e2e/keyboard-only.spec.ts`.
- [ ] Drive the app with the playwright MCP using only the keyboard:
  - Pick a player by 2 and by typing a nickname.
  - Play a level to the results with Space and Enter only.
  - F2, F3, F4 and F8 in a level, with their tooltips showing the keys.
  - F1 in a level, then Back to the paused card.
  - End a level after typing and see the question.
  - Custom exercise Back shows the results.
  - Console clean.
