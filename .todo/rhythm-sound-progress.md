# Rytmus sound, sound modes, rhythm notes and My progress layout

The owner's requests of 2026-11-08 after playing Rytmus. Specs to update with each step:
`.specify/game/rhythm.md`, `.specify/experience/` (sound, progress pages), `.specify/profiles/`
where the progress popup is described. No store migrations (alpha): new or removed fields only.

Affected: `src/audio/audio.ts`, `src/storage/schema.ts` + `store.ts` (SoundLevel, `rhythmTune`),
`src/ui/chrome.ts` (sound button and its menu), `src/app/app.ts` (`cycleSound`),
`src/game/runtime.ts` + `src/game/mode.ts` (resume hook, important sound), `src/game/modes/rhythm.ts`,
`src/game/rhythm-notes.ts`, `src/screens/stats.ts`, `src/screens/map.ts`, `src/screens/level.ts`
(the rhythm sound popup), `public/i18n/sk.json`, `en.json`, `translator/en.json`, `src/styles.css`.
No DB, no server contract.

## Steps

- [x] **1. Rhythm notes are pictures, not buttons.** In My progress (`rhythmShelf`, stats.ts) the notes
  are plain images, no click, no music choice. They overlap a little (each next one shifted left over
  the previous by about a quarter of its width), and the count stands right after the last note in the
  same chip style as the target range's record in the third row (number after the picture, bold).
  Remove `progress.rhythmTune` with everything that reads or sets it: `menuMusic` (map and practice
  play the usual menu track again), `hasTune`/the set in `rhythm-notes.ts`, `audio.tune` if it has no
  other caller, the texts `progress.rhythmNoteTip`, `rhythmTune`, `rhythmTuneNone` (sk, en, translator,
  catalog) and the field in schema/store. Keep the note tooltip only as a plain `tip` naming the world
  ("Nota zo sveta {world}." / "A note from {world}.").
- [x] **2. Medals in the third row.** Drop the separate "Moje medaily" block under My progress. In the
  third summary row (`summaryRow`, the totals ever) put a chip **before** the parrots-earned chip:
  picture `ui-medals` (already in `public/assets`, made 2026-11-08, prompt in `assets-src/PROMPTS.md`),
  the number `p.progress.growth`, tooltip from `stats.medalsHint` with the count in front
  (new text `progress.medals`: "Medaily: {n}. Medailu dostaneš vždy, keď už píšeš presne a hra sama
  pridá: veci sa hýbu o kúsok rýchlejšie alebo prídu dlhšie slová." / English likewise). Shown also with
  0. Remove texts that only the old block used (`stats.medals`, `stats.medalsHint` if unused), and
  `medal()` in `src/ui/medal.ts` only if nothing else uses it.
- [x] **3. Last training under the character.** The line "naposledy ..." (`progress-last`) moves from
  the end of the progress section to right under the character picture in `stats-hero` (above Aro if
  he sits there), with the round `keyboard` icon from `ICONS` (`src/ui/dom.ts`, the one on
  "Len chcem písať") in front of it, same text as now.
- [x] **4. Sound modes and their menu.** `SoundLevel` gets `'important'`:
  `normal` "Zvuky" | `quiet` "Tiché zvuky" | `important` "Len kde je to dôležité" | `off` "Bez zvukov"
  (en: "Sounds" | "Quiet sounds" | "Only where it matters" | "No sounds"). A click on the sound button
  opens a list like the language list (`languageList` in chrome.ts: same look, keyboard and Esc, round X
  rules of popups do not apply to this dropdown); F4 keeps cycling all four. Icons: normal `sound`,
  quiet `soundLow`, off `mute`, important = the `sound` icon with a small "!" badge at its top right
  (an SVG addition or a CSS badge on the round button, readable at the button size, dark/high-contrast
  too). The tooltip of `important` names where sound plays: "Zvuk hrá len v Rytme a v diktáte." /
  "Sound plays only in Rhythm and in dictation."
  Behaviour of `important`: silent like `off` everywhere, except while a level runs whose sound
  matters: kind `rhythm`, and any level where `reading.dictating` is true. The runtime tells the
  engine (`audio.setImportant(true)` at start, `false` on dispose); the engine's effective gain and its
  suspend/resume use `normal` gain while important, `off` behaviour otherwise. Saved per profile
  (`settings.sound`) and on the device like the other levels.
- [x] **5. Popup before Rytmus without sound.** After the get-ready card of Rytmus (before the first
  letter), when the effective sound is silent (`off`, or nothing of `important` - i.e. never when
  `important`, `normal` or `quiet`), one popup (round X top right, Esc = "Nezapínať"):
  "V tejto hre je rytmus sprevádzaný hudbou. Odporúčam ti zapnúť si hudbu pre celú stránku, alebo
  aspoň pre túto hru. Hudbu a efekty na stránke si môžeš vypnúť kliknutím na tlačidlo reproduktora."
  Buttons: **Zapnúť všade** (default, focused; level `normal`), **Zapnúť kde je potrebné** (level
  `important`), **Nezapínať** (nothing changes). English: "In this game the rhythm comes with music. Turn
  the music on for the whole site, or at least for this game. You can turn the site's music and effects
  off with the speaker button." | "Turn on everywhere" | "Turn on where needed" | "Keep it off". The
  button click is the user gesture that wakes the audio context. The round does not start before the
  popup is closed. This is an owner's explicit exception to "only key cards + one get-ready card".
- [x] **6. Rytmus louder.** Its music and effects go through `audio.beatOut()` (the music gain). Raise
  the base level of everything Rytmus plays (beat notes, catch/miss sounds) so that, at the same
  sound level, it is about as loud as the story levels' effects: add a gain node for Rytmus with a
  factor (start with 2.5, check by ear-free measure: compare peak gain values of a caught note vs. the
  `key` sfx in code) and name the constant.
- [x] **7. Esc and back in Rytmus.** A new optional `Mode.onResume()` hook, called by `runtime.resume()`.
  Rytmus implements it like its miss recovery but **without a miss**: no point lost, no "surprised",
  no phrase count; the next letter glides into the band (`recover` phases glide -> ready, the same
  "Počkaj" / "Pokračuj" line and pause sign) and the song waits until the child presses it. A
  letter that was already in the band when Esc came stays the due one.
- [x] **8. The basket follows the catch.** Today a lane's key slides the basket under the lane
  (`SLIDE_S` 0.12 s) and after the catch it jumps back to rest at once. New: after the catch the
  basket glides back to rest (ease out, about 0.25 s, after the drop-in animation) instead of jumping.
  Only in the full graphics (not `gfx-simple`) and not with reduced motion; there it stays as today.
  Decision on children: a 0.12 s slide out and a 0.25 s soft way back is calm enough; no faster
  shaking movement is added.
- [ ] **9. Tests and checks.** Unit: SoundLevel cycle with four levels, `important` gain on/off,
  rhythm `onResume` (no miss counted, letter waits), notes shelf has no buttons. E2E: update
  `e2e/rhythm.spec.ts` (popup when sound off: default button turns sound on; with `important` no popup)
  and any spec that clicks a note or reads `rhythmTune`. `npm run build`, `npx vitest run`, the touched
  e2e specs. Browser check with the Playwright MCP: progress popup (notes overlap, counts, medal chip,
  last training under the figure), sound menu (four items, "!" icon), Rytmus popup and Esc/back.

## State
Nothing implemented yet.
