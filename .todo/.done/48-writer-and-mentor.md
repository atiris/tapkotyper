# 48 Writer and mentor wording, nickname first, word language, clear key letters, progress tab

Runs **after plan 47** (both touch `parent.ts`, `wardrobe`/`start` texts and help texts).

Affected: `src/storage/{schema,store}.ts` (+ tests, migration v3 -> v4), `src/screens/
{new-profile,parent,start,stats,map,story}.ts`, `src/share/{result,teacher}.ts` (+ tests),
`src/app/app.ts` (`selectProfile`, word loading), `src/words/words.ts`, `src/ui/keyboard-guide.ts`,
`src/styles.css`, `public/i18n/{sk,en}.json`, `src/i18n/i18n.test.ts`, `e2e/{parent,play,
own-content,teacher-links,layout}.spec.ts`, `.specify/profiles/*`, `.specify/experience/
{localization,accessibility}.md`, `.specify/learning/*` (word language), `.specify/game/
free-typing.md` if it names the word list.
Contracts: profile schema v4 (migration). The result-code payload is unchanged in shape:
`name` is filled from the nickname when the name is empty. No server, no DB.

## What
1. **No "dieťa" and no "učiteľ" anywhere a person reads.** The one who types is the
   **pisateľ**. The one who receives results is the **mentor**. In English this is
   **typist** and **mentor**.
   - "Meno dieťaťa" becomes "Meno pisateľa".
   - "Pre učiteľov" becomes "Pre mentorov".
   - This covers all texts, help included.
2. **Nickname first and required, name optional.**
   - In the new player form and in settings, **Prezývka** comes first, next to the
     character, and it is required.
   - **Meno pisateľa (nepovinné)** comes second, with the hint "Zobrazí sa mentorovi vo
     výsledkoch.".
   - The game shows the nickname everywhere it shows the player.
3. **Welcome text:** "Toto si ty." becomes "Toto je tvoja postava v tomto dobrodružstve."
   in both places (map welcome, story intro). In English: "This is your character in this
   adventure."
4. **Settings > Úlohy** shows no raw keys (`task.group.new`, `task.group.list` are missing
   today). A test makes sure no literal key used in code is missing again.
5. **Super Tapko is the last** player in "Kto sa dnes hrá", so it never shifts the order of
   real players (plan 49 numbers them).
6. **Word language per player.** A player can practise with English words while the
   interface stays Slovak, and the other way round.
   - Settings has the word language next to the interface language.
   - Custom exercises have their own choice, preset to the player's word language.
7. **Clear key letters.** Key caps, the big key and inline key marks can use a font that
   tells lowercase **l**, capital **I** and **1** apart.
   - The setting is "Ľahko rozlíšiteľné písmená na klávesoch (l, I, 1)", **on by default**.
   - The game font stays as it is everywhere else.
8. **Settings > Pokroky** is clearer:
   - The four cards under the summary row go away.
   - "písmen za 14 dní" becomes one more chip in the summary row (icon + text, same look),
     and it really counts the last 14 calendar days.
   - The levels are grouped by story, then by world: a story heading with its picture, and
     one row of level cells per world.

## Why
- "Dieťa" talks about the player instead of to them, and older players, adults included, use
  the game. "Učiteľ" excludes the parent or coach who receives results.
- The nickname is what the game shows next to the character; it is short and fits there. A
  real name is only needed for the mentor, and some players do not want to give it.
- A Slovak child learning English, or the other way round, wants that language's words
  without switching the whole interface.
- Lexend draws l and I the same, so on a key cap a learner cannot tell which key is meant.
  Atkinson Hyperlegible is already bundled and is designed to tell them apart. Using it only
  on keys fixes the problem without changing the game's look.
- Duplicate stat cards repeat the summary row less clearly; a flat list of 75 levels is
  unreadable; "14 dní" that counts 14 sessions is wrong.

## Decisions
- **Wording**: go through every sk and en string and replace them.
  - sk: `dieťa/dieťaťa/deti/detí` -> `pisateľ/pisateľa/pisatelia/pisateľov` (rephrase when
    the sentence is better without it, e.g. "tvoje", "hráč"). `učiteľ*` -> `mentor*`.
  - en: `child/children/kid` -> `typist/typists`. `teacher` -> `mentor`.
  - Code identifiers, routes (`teacher`, `#/teacher/child/<id>`) and i18n key names stay
    (no user sees them).
  - The teacher turtle stays; only its label changes.
  - Slovak keeps the rule "no gendered second-person past tense".
  - `.specify/experience/localization.md` records the terms. A vitest check fails when sk
    contains `dieť`, `deti ` or `učiteľ`, or when en contains `child`, `children`, `kid` or
    `teacher`, as words in values.
- **Schema v4** (`schema.ts`, `store.ts` `migrate`, `STORE_VERSION`):
  - `companion.name` (the nickname) is required and non-empty. The migration copies
    `p.name` into it when it is empty (trimmed, cut to `NICK_MAX`).
  - `Profile.name` may be `''`. The comment changes to "optional real name, shown to the
    mentor only".
  - New `settings.wordLang: 'sk' | 'en'` (migration: the profile's `language`).
  - New `settings.keyFont: boolean` (migration and `newProfile` default: `true`).
  - `nickname(p)` returns `companion.name`. Callers that showed `p.name` to the player use
    `nickname(p)`.
  - The start card shows the real name under the nickname only when it is set and
    different.
  - Tests:
    - the v3 -> v4 migration (empty nickname filled, `wordLang`, `keyFont`);
    - an import of a v3 file;
    - `newProfile` with an empty name.
- **Forms**:
  - `new-profile.ts` order: character, `np-nick` ("Prezývka", required, `maxlength
    NICK_MAX`), `np-name` ("Meno pisateľa (nepovinné)", `maxlength 24`, hint
    `newProfile.nameHint` = "Zobrazí sa mentorovi vo výsledkoch."), interface language,
    word language, layout.
  - Validation: nickname missing -> `newProfile.nickMissing`.
  - `parent.ts` profile fieldset uses the same order and the same rule. A blank nickname is
    not saved and shows the message. A blank name clears the name.
- **Result codes** (`result.ts`): `name: p.name || nickname(p)`, so `share.broken` never
  fires for a profile without a real name. The mentor table shows what it receives. Unit
  test for a profile without a name.
- **Missing keys**:
  - Add `task.group.new` and `task.group.list` in sk and en. Read `parent.ts:514/526` for
    their meaning and the `{name}` placeholder.
  - New vitest in `i18n.test.ts`: scan `src/**/*.ts` (no tests) for literal `t('...')` /
    `tList('...')` keys and expect each in both dictionaries. Template keys with `${` are
    skipped.
- **Super Tapko** (`start.ts`): `players = [...app.store.profiles, superPlayer]`.
- **Word language**:
  - `useLanguage(lang)` keeps setting the UI language. Words load by a separate
    `loadWords(p.settings.wordLang)`, in `selectProfile` and when the setting changes.
  - `words.ts` caches per language, so both lists can be loaded.
  - Custom exercise (own content in `parent.ts`, the "vlastné cvičenie" setup around the
    mix select): a word-language select with the default `p.settings.wordLang`. It is
    stored with that exercise's settings (`ownWordLang`, part of the v4 migration, default
    = `wordLang`).
  - Levels whose words come from the list use `wordLang`.
  - Key unlocking and lessons do not change: the word filter by available keys already
    leaves out words with keys the player does not have.
  - The start screen's SK/EN buttons only change the interface.
- **Key font**:
  - New CSS var `--font-keys`. It is `var(--font-game)` by default, and `'Atkinson
    Hyperlegible', var(--font-game)` under `body[data-keyfont]`.
  - It applies to `.kb-key`, `.big-key`, `.kbd` and the new-key card glyph. The app sets
    `data-keyfont` from `settings.keyFont` where it sets `data-font` today.
  - When `font` already is Atkinson or OpenDyslexic, the attribute changes nothing visible.
  - Canvas targets (words) keep the game font.
  - The setting is a checkbox in the same settings group as `parent.font`.
- **Progress tab** (`parent.ts` `dashboardTab`):
  - Remove `div.cards`.
  - `summaryRow` gets a chip "{n} písmen za 14 dní". `n` is the sum of `s.chars` of the
    sessions whose date is within the last 14 local calendar days, including today. It uses
    the same icon style; choose a fitting existing icon.
  - Levels: for each of `STORIES`, an `h3` with the story picture and title, then per world
    (`storyOf`, `worldLevels`) a row with the world name and its level cells. The cells
    keep the present look.
  - The stats modal in `stats.ts` uses the same `summaryRow`, so it shows the chip too.
- Specs:
  - `profiles/*`: nickname required, name optional, word language, the mentor sees the
    name or the nickname.
  - `accessibility.md`: key font.
  - `localization.md`: the terms.

## Steps
- [x] Schema v4, migration, `newProfile`, `nickname` callers, tests.
- [x] Forms in new player and settings; result code fallback with test.
- [x] Wording pass sk + en with the vitest guard; welcome texts; missing task keys with the
      literal-key vitest.
- [x] Super Tapko last.
- [x] Word language: loading per language, settings select, custom exercise select.
- [x] Key font var, attribute and checkbox.
- [x] Progress tab: no cards, 14-day chip, levels by story and world.
- [x] Specs as listed.
- [x] `npm run build`, `npm test`, `npx playwright test` pass (update e2e that type a name or
      read the old texts).
- [x] Drive the app with the playwright MCP (the MCP browser was held by another session, so a
      standalone Playwright script drove the built app the same way):
  - Create a player with only a nickname; the map welcome shows the new sentence.
  - Settings shows the nickname first, the name optional with the mentor hint, and no raw
    keys in Úlohy.
  - Switch the word language to English and play a level; the targets are English and the
    UI stays Slovak.
  - Key caps show a distinct l and I with the setting on, and Lexend with it off.
  - Pokroky shows no cards, the 14-day chip and levels by story.
  - The mentor view after pasting a code shows the nickname for a player without a name.
  - Console clean.

## State
Decisions taken while implementing:
- v4 has no migration step of its own: `normalizeProfile` (run on every load and import) fills an
  empty nickname from the name (cut to `NICK_MAX`, `?` when both are empty) and fills `wordLang`,
  `ownWordLang` and `keyFont` from `defaultSettings(language)`, which is exactly what the step
  would do.
- `newProfile` takes the nickname from the name when none is given (tests, imports); the seed is
  hashed from the name, or from the nickname when there is no name.
- The guest is created with the localized guest nickname and no name; Super Tapko has no name.
- The wardrobe nickname field ignores a blank value and shows the saved nickname again on blur.
- `task.group` is already the string label of the group field, so the missing legends became
  `task.legendNew` / `task.legendList`.
- "Custom exercise" = every `practice` level (Vlastné cvičenie, Môj text, key drills, practice
  tasks): it uses `ownWordLang`; story levels use `wordLang`. The own-words preview in settings
  uses `ownWordLang`, its select sits by the mix select. Capital-letter names stay from the UI
  dictionary.
- The 14-day chip uses the `ui-act-letters` icon.
- The sk guard also bans `žiak` (the mentor's child card said "žiak").

## Done - 2026-10-23
Shipped: schema v4 (nickname required, name optional, `wordLang`, `ownWordLang`, `keyFont`),
nickname-first forms in the new player form and settings, result codes that fall back to the
nickname, the typist/mentor wording in sk and en with a vitest guard, the new welcome sentence,
the task legends and a vitest that every literal `t`/`tList`/`pickLine` key exists, Super Tapko
last, word language per player and per custom exercise, the key font (`--font-keys`,
`data-keyfont`, on by default), the progress tab without cards, with the 14-day chip and levels
by story and world; specs, unit and e2e tests.
Verified in the browser: a player with only a nickname gets the new welcome; settings show the
nickname first and the optional name with the mentor hint, no raw keys in Úlohy; English word
language played a level with English targets ("fuel dice fog rat wish quiz") under the Slovak UI;
key caps use Atkinson Hyperlegible with the setting on and Lexend with it off; Pokroky has no
cards, the 14-day chip and three story sections with 15 world rows; the mentor view shows the
nickname for a player without a name; console clean.
Left out: nothing. Capital-letter names in targets still come from the interface dictionary, not
the word language (minor, not asked for).
