# 63 - The translator: every text of the game, translatable by a parent

## Why
Today a new language means editing two 100 KB JSON files by hand, and nobody but the owner
knows where a text is shown or when a line is said. The owner wants a page where anyone (a
parent) can:
- see **every text the web uses** (screens, Tapko's and the narrator's lines, the range's
  lines and things, keyboard words: keys, fingers, posture, start phrases and tips, help,
  settings, mentor pages) and **the words typed in the game**, grouped the way the game uses
  them, each with a short explanation of where and when it appears;
- pick a **base language** (the text shown above each input) and write the translation
  under it, including the headings and explanations themselves, so the next translator can
  work from the new language too;
- **start a new language** (its own name and code), or take an **existing language** and
  change it, either keeping the result as **own texts** on this device or **sending it for
  approval** as a correction;
- **prefill** from any language: a prefilled field still counts as untranslated until it is
  rewritten (even to the same text);
- see the **progress** in a round percentage button that jumps to the first untranslated
  field;
- **export** for an LLM in a simple pair format (easy to translate in a text file), and as
  JSON; import both back;
- sign the translation (author's name and contact).

Only a parent gets there, by a link in the settings. An own language is playable on the
device, but it is picked only in the parent settings, never in the round language button or
the new player form.

## Affected
- New: `src/screens/translate.ts` (the page, a lazy chunk like the settings),
  `src/i18n/catalog.ts` (the structure: sections, groups, keys, kinds),
  `src/i18n/pairs.ts` (pair format write/read), `src/i18n/own-langs.ts` (IndexedDB store of
  own languages), `public/i18n/guide/sk.json`, `public/i18n/guide/en.json` (headings,
  explanations, situations; loaded only by the translator), `scripts/i18n-accept.mjs`.
- `src/i18n/i18n.ts`: language references with own languages, a fallback chain
  (own -> its base -> English), plural categories of any locale.
- `src/storage/schema.ts`: `Profile.language`, `Settings.wordLang`, `Settings.ownWordLang`
  become `LangRef` (`Lang | \`own:${string}\``). No stored shape changes, so no
  `STORE_VERSION` bump; the store's normalize/import accepts an `own:` value and keeps it
  (it falls back at use time, see below).
- Every user of `Lang` (grep `Lang\b`, `language`, `wordLang`): `src/app/app.ts`
  (`useLanguage`, routes), `src/main.ts` (boot language, new route), `src/words/words.ts`
  (word list of an own language), `src/screens/parent.ts` (language selects, the link),
  `src/ui/chrome.ts` (round button lists official languages only),
  `src/screens/new-profile.ts` (official only), `Intl` calls that pass a language (use the
  own language's BCP 47 code).
- `public/i18n/sk.json`, `public/i18n/en.json`: new `translate.*` texts, `parent.translate*`
  link texts; any user-visible text found hard-coded in `src/` moves here.
- Specs: new `.specify/experience/translation.md`, `.specify/experience/index.md`,
  `.specify/experience/localization.md`, `.specify/profiles/parent-controls.md`,
  `.specify/architecture.md` (second IndexedDB database, lazy translator chunk).
- Tests: `src/i18n/catalog.test.ts`, `src/i18n/pairs.test.ts`, `src/i18n/i18n.test.ts`,
  `e2e/translate.spec.ts`.
- No backend, no DB schema of the profile store changes; one new IndexedDB database.

## Decisions (taken; nobody to ask)

### Words used here
- **Field**: one input on the page (one variant of a text, one heading, one explanation,
  one situation, the word list). Progress counts fields.
- **Item**: one key of the dictionary (`aim.lines.center`) with its situation and its
  variants.
- **Touched**: a field the translator typed into (any change, even back to the same text),
  confirmed with the keep button, or got from an import. Prefill never touches.

### The catalog (structure, in code) and the guide (texts, per language)
- `src/i18n/catalog.ts` exports an ordered list of **sections** -> **groups** -> **items**.
  A group lists its keys explicitly or by a pattern (`aim.things.*`, `items.*`); the order
  is the order on the page. Each item has a **kind**:
  - `text` - one string, exactly one variant;
  - `pool` - an array read at random (`tList` pools, names lists): 1..n variants, the
    translator adds and removes (never below 1), the count may differ from the base;
  - `lines` - an array whose order and count matter (slogan, story scenes, step lists):
    exactly the base count, no add/remove;
  - `plural` - a `tn` key: the forms the target locale needs
    (`new Intl.PluralRules(code).resolvedOptions().pluralCategories`), each its own field,
    the base forms shown above as reference;
  - `words` - the word list (one textarea, see Words).
- Sections (the global headings), with the top-level keys they hold:
  1. Start and profiles: `common`, `start`, `newProfile`, `kinds`, `names`, `import`,
     `move`, `install`
  2. Map and worlds: `worlds`, `map`, `teaser`, `surprise`, `friends`, `dragonNames`,
     `robotNames`, `forestNames`, `tracks`
  3. Typing and the keyboard: `level`, `guide`, `fingers`, `posture`, `newKey`,
     `practice`, `practiceKeys`, `freeType`, `touch`, `keys`, `layouts`, `paw`, `wave`
  4. Tapko, the fairy and the story: `tapko`, `fairy`, `story`
  5. The range: lines and things: `aim`
  6. Results and progress: `results`, `badge`, `progress`, `stats`, `cert`, `super`
  7. Wardrobe: `wardrobe`, `slots`, `items`
  8. Breaks and tips: `break`, `tips`
  9. Settings: `parent`, `own`, `surprises`
  10. For mentors: `teacher`, `task`, `share`
  11. Help and about: `help`, `about`
  12. The translator itself: `translate`
  13. Words to type: the word list
  Inside a section, groups follow the second-level keys (or a few sibling keys that belong
  together, e.g. the range's "What the target says" = `aim.lines.*`, "What Tapko calls" =
  the throw calls, one group per thing in `aim.things.*`). The implementer splits by what a
  translator needs to see together; a group has 1-40 items.
- `public/i18n/guide/<lang>.json` holds the texts **about** the texts:
  `sections.<id>.title`, `sections.<id>.about` (one paragraph), `groups.<id>.title`,
  `groups.<id>.about`, `situations.<key>` (one short sentence: where and when it appears,
  who says it, what the placeholders hold, e.g. "The target, when the thing hits the dead
  centre. {n} is the points."). A pattern situation (`situations["aim.things.*.sound"]`)
  may use `{item}`, filled with the base text of the item's sibling named in the catalog
  (the thing's name), so 50 things need one situation, not 50.
- The guide is written in Slovak and English for **every** item (no item without a
  situation; a unit test guards it). The headings and explanations are themselves fields
  on the page and in the export (keys `guide:sections.aim.title` ...), so a new language
  carries its own guide.
- A unit test: every leaf key of `sk.json` and `en.json` is in exactly one catalog item
  (patterns expanded), every catalog key exists in both, kinds match the value type
  (`text` = string, `pool`/`lines` = array, `plural` = object of plural forms), every
  guide key exists in both guide files. So a new text without a place and an explanation
  fails the build, and the translator stays complete.

### Hard-coded texts
- Audit `src/` for user-visible strings not going through `t` (aria labels, titles,
  `alert`/`confirm`, canvas `fillText`, speech): move each into the dictionaries (and the
  catalog). Brand name "TapkoTyper", "MIT · Atiris", key symbols and code names stay.
  `index.html` (`<noscript>`, `description`) and `manifest.webmanifest` stay static (read
  before any language is known) and are listed in the spec as the known exceptions.

### Own languages (stored on the device)
- IndexedDB database `tapkotyper-translate`, store `languages`, one record per own
  language: `{ id, code, name, base: Lang, correctionOf: Lang | null, layout: LayoutId,
  author, contact, texts: Record<key, string | string[] | Record<form, string>>,
  guide: Record<key, string>, words: string[], touched: string[] (field ids),
  createdAt, updatedAt }`. `id` is a random short id; `code` is the BCP 47 code the
  translator typed (validated with `Intl.getCanonicalLocales`), used for `lang=`, plural
  rules and dates. Autosave 500 ms after the last change, and on leaving the page. Where
  IndexedDB is blocked the page works for the visit and says so (as the mentor page does).
  Asked to persist like the mentor database.
- A language reference is `Lang | \`own:<id>\``. `i18n.setLanguage(ref)`: an own language
  loads its record, `dict` = its texts (only touched or prefilled fields that have a
  value; untranslated empty fields are left out), then its `base` official dictionary,
  then English. `t`, `tList`, `tMap`, `tn` walk that chain. `language()` keeps returning a
  `LangRef`; a new `locale()` returns the BCP 47 code for `Intl` calls.
- An own language with `correctionOf` set (an edit of Slovak, say) is offered as
  "Slovenčina (vlastné texty)" in the settings.
- **Where it can be picked**: only in the parent settings' interface language select and
  word language selects (official languages first, then own ones, by their own names).
  The round language button and the new player form list only official languages. A
  profile whose own language is missing on this device (deleted, or the profile came from
  another device) plays in `detectLanguage()` silently and keeps the reference, so moving
  the language back revives it.
- Profile export files and moving a player keep the reference; the own language itself is
  not inside them (it is exported from the translator).

### Words (the word list section)
- One textarea, words separated by spaces or new lines, with the count. The own language
  picks a keyboard layout from the existing layouts (a select in the "About the
  translation" panel, preset from the base language). Words not typeable on that layout
  (`canType` on every letter) are listed under the field and left out of the game.
- Under the field, for the first lessons of the layout (`src/learning/lessons.ts`), how
  many words are typeable with the keys of that lesson; a lesson with fewer than 20 shows
  a warning (the game would repeat a few words). The word list is one field for progress;
  prefill copies the base list (untouched).
- In the game, an own language's word list is used when the word language select points to
  it; an own language with an empty list uses its base's list.

### The page (`#/translate`, screen `translate`)
- Reached by a link button "Translate the game" at the bottom of the parent settings'
  typist tab (by the language select). The route needs the parent access exactly as the
  settings address does (`parentAccess`); coming from the settings it is already granted.
  Back returns to the settings.
- **Sticky top bar** (wraps on a phone into two rows):
  - **Base language** select (the language symbol in front of it): official languages and
    own ones. Changing it re-renders the source texts only.
  - **Translation** select: own languages, plus two buttons: **New language** (dialog:
    its own name, code, base language, layout; creates an empty record, nothing touched)
    and **Edit a language** (dialog: pick an official language; creates an own record with
    `correctionOf` and every field prefilled from it, nothing touched). Delete (with the
    app's confirm) sits in the "About" panel.
  - **Prefill from** select + button: fills every *untouched* field from that language
    (official or own); touched fields are never overwritten. Fields stay untranslated.
  - **Progress ring**: an SVG ring with the percentage of touched fields, also by section
    in the table of contents. A click scrolls to the first untouched field (in page
    order) and focuses it; each further click goes to the next untouched one after the
    focused field. At 100 % it says so in its tooltip.
  - **About the translation** (a panel opened by a button): author's name, contact (with
    one line: the contact becomes public when the translation is sent), code, own name,
    layout, delete.
  - **Export** menu: pairs `.txt` (everything), pairs `.txt` (only untranslated, for an
    LLM), pairs `.txt` (only the changes against the corrected language, for corrections),
    `.json`. **Import** button: `.txt` or `.json`, a summary (n applied, n skipped with
    why) before applying.
  - **Send for approval** button (see below).
- **Body**: a table of contents (sections with their %, sticky on the left on wide
  screens, a select on a phone) and the sections. For each:
  - the section heading (base text) with its translation field under it;
  - its explanation paragraph and its translation (textarea);
  - per group: the subheading + field, the explanation + field;
  - per item, a panel: the **situation** (base) + its field, then the **variants**: each
    base variant with the target field under it (see Look). `pool` items have "add a variant" and a remove button per variant
    (hidden on the last one). `plural` items show one field per target form, labelled
    with the form and an example number.
  - Placeholder chips (`{n}`, `{name}`) under the base text; a target missing one or
    adding an unknown one gets a warning line (the text is still saved).
  - A "show only untranslated" switch and a search box (base or target text, key) at the
    top of the body.
- **Look**: the owner's starting point is the range lines sheet
  https://claude.ai/artifact/W88emBF3UHU4F1QGTaxNLy ("Hlášky a veci strelnice"). Keep its
  feel: warm paper background, the game font, **section headings dark (ink), group
  headings in the orange accent**, the explanation as a muted paragraph under the heading
  (max 70ch), items in white rounded **panels** (1px line border, radius 14px) laid out in
  a wrapping grid, situation labels small, uppercase and muted, variants as soft chips,
  and per thing a card with its picture (things of the range, wardrobe items, characters
  and worlds use their thumbnail from `public/assets/` when there is one). Both looks
  (light, dark) from the app's own tokens.
  The layout is our own, because every text now comes twice (base + input):
  - the grid gets wider panels: `minmax(400px, 1fr)` (one column under 860px), not the
    sheet's 260-330px;
  - inside a panel, a variant is one row: the base text as a chip on top and the input
    full width under it (no side-by-side halves, they get too narrow in a grid cell);
    on screens wider than 1400px, `text` items with long texts (help, about, intros) take
    the full grid width and put base and input side by side;
  - a heading and its translation: the heading as in the sheet, the input under it in
    the same weight but smaller, so the page still reads as a sheet with blanks to fill;
  - the situation label sits at the top of the panel with its own small input on the
    same line (wrapping on a phone);
  - with "show only untranslated" on, finished panels collapse to one line (situation +
    a check mark) instead of disappearing, so the place in the sheet stays recognisable.
- **Field states**: untouched fields have a dashed border, muted text and a small
  "untranslated" label; touched fields a solid border. Each untouched field has a small
  keep button (and Ctrl+Enter) that touches it without retyping, for texts that stay the
  same ("OK"). Textareas grow with their text; a `\n` in a text is a real line break.
- Long page: sections use `content-visibility: auto`; nothing is virtualised beyond that
  unless the page is measurably slow (> 200 ms to open on the dev machine), then sections
  render when they scroll into view.
- The page's own texts come from `translate.*` in the current UI language and are in the
  catalog (section 12), so the translator translates its own page too.

### The pair format (`.txt`, for people and LLMs)
- UTF-8, one entry per field, entries separated by an empty line. Lines starting with `#`
  are comments (headings and situations are written as comments before their entries, so
  an LLM sees the context). A header at the top explains the rules in English in five
  lines, then the metadata:
  ```
  # TapkoTyper translation. Translate every line that starts with "de:".
  # Keep {placeholders} as they are. "\n" is a line break. Leave a line empty if unsure.
  # Pool items: you may add a variant (next number) or delete one, but keep at least one.
  @meta code=de name=Deutsch base=sk layout=sk-qwertz author=... contact=...

  # == Strelnica: hlášky a veci ==
  # -- Čo hovorí terč --
  # Situácia: Terč, keď vec trafí presne do stredu.
  @aim.lines.center.1
  sk: Zásah do čierneho!
  de: Treffer ins Schwarze!

  @aim.lines.center.2
  sk: 100 bodov!
  de:
  ```
- Field ids: `<key>` for `text`, `<key>.<n>` (1-based) for `pool`/`lines`,
  `<key>.<form>` for `plural`, `guide:<guide key>` for headings, explanations and
  situations, `words` for the word list (words space-separated on one line).
- The base line (`sk:`) is only context; import reads the target line (`de:`) by the
  `@id`. An empty target line = untranslated (skipped). A `pool` id above the base count
  adds a variant; a missing `pool` id in a full export removes that variant (only when the
  file's header says `@export full`). `lines` ids outside the base count are skipped with a
  warning. Unknown ids are skipped with a warning.
- **JSON**: `{ "meta": {...}, "texts": <tree shaped like public/i18n/xx.json>,
  "guide": <tree shaped like guide/xx.json>, "words": [...], "touched": [...] }`. Its
  `texts` drop straight into `public/i18n/<code>.json`.
- `src/i18n/pairs.ts` is pure (no DOM) with unit tests: export -> import round trip,
  multi-line texts, placeholders, pool add/remove, plurals, comments and CRLF line ends.

### Send for approval (GitHub issue, no server)
- The button downloads the file and opens a prefilled new issue on
  `https://github.com/atiris/tapkotyper/issues/new` in a new tab, with title
  `Translation: <name> (<code>)` or `Correction: <language>` and a body: author, contact,
  base, progress, counts, and a line "Attach the downloaded file <file name>".
- A correction (`correctionOf` set) whose changes-only pairs export fits (body URL under
  7000 characters) goes into the body in a ```text block; then nothing needs attaching and
  the download is skipped. Anything bigger downloads the `.json` and asks for the
  attachment.
- A short dialog before opening says: the issue is public, the contact will be visible,
  a GitHub account is needed.
- `scripts/i18n-accept.mjs <file.json>`: the owner's side; writes `public/i18n/<code>.json`,
  `public/i18n/guide/<code>.json`, `public/words/<code>.json` (or, for a correction, merges
  the changes into the existing files) and prints the line to add to `LANGUAGES`. Adding a
  language to `Lang` stays a code change by the owner.

## Steps
- [x] 1. `catalog.ts` with all sections, groups, item kinds; `catalog.test.ts` (full
  coverage, kinds). The guide-keys test is added with step 2.
- [x] 2. Guide texts: `public/i18n/guide/sk.json` and `en.json` for every section, group
  and item (patterns where a structure repeats). English written for English readers.
  The work can be split by section across subagents (Haiku for the texts, the main
  session reviews every section against where the text really appears in `src/`).
- [x] 3. Hard-coded text audit; move the finds into the dictionaries and the catalog.
- [x] 4. `LangRef`, the fallback chain, `locale()`, `own-langs.ts`; boot and
  `useLanguage` load own languages; word lists of own languages; the selects in the parent
  settings (official ones only elsewhere); unit tests for the chain, plurals of a foreign
  locale and a missing own language.
- [x] 5. `pairs.ts` + tests (format above), JSON export/import.
- [x] 6. The page `translate.ts`: top bar, table of contents, sections, fields and states,
  progress ring and jump, prefill, new / edit language dialogs, about panel, search and
  filter, words section with layout checks, import/export, send for approval. Styles in
  `src/styles.css` in both looks (light, dark), phone layout without horizontal scroll.
  The link in the parent settings; the route behind `parentAccess`.
- [x] 7. `scripts/i18n-accept.mjs`.
- [x] 8. Specs: `.specify/experience/translation.md` (WHAT and WHY of this page),
  `localization.md` (own languages, the chain, where they can be picked),
  `parent-controls.md` (the link), `architecture.md` (the second IndexedDB database, the
  lazy chunk, the guide files loaded only by the translator), `experience/index.md`.
- [x] 9. `e2e/translate.spec.ts`: the direct address asks the parent question; from the
  settings: new language "Deutsch"/`de`, prefill from English shows 0 % and untranslated
  fields; typing one field raises the percentage; the ring focuses the first untouched
  field; keep button touches; pool add/remove; export pairs, edit the file, import it back;
  pick the own language in the settings and see a translated text on the map; the round
  language button does not list it. Phone width: no horizontal scroll.
- [x] 10. Build, lint, unit and e2e tests; drive the page with the playwright MCP in both
  looks and at phone width (console clean), fix what shows up.

## State
Order of work: 1, 3, 4, 5, 6, then 2 (the guide needs every key, the page's own ones too), 7-10.

Decisions taken while implementing:
- The catalog lists groups by keys and `prefix.*` patterns; the first group that names a key takes
  it, so a catch-all group (`parent.*`) at the end of a top-level key holds the rest. Kinds: the
  plural keys are listed (`PLURAL_KEYS`), ordered lists by patterns (`LINES`), every other array
  is a pool. `service.*` (plan 65, after this plan was written) sits with `super` in Results.
- The field model (fields, progress, prefill, import/export plans) is `src/i18n/translation.ts`;
  `pairs.ts` is only the text format. Both pure, tested in `pairs.test.ts`.
- Pair files carry one `@meta key=value` per line (values may hold spaces) and
  `@meta reference=<code>` for the code of the base lines, so it never clashes with the own
  language's `base`. An own correction of Slovak with Slovak shown as base has the same prefix on
  both lines; the reader takes the first as base, the last as target.
- The translator has its own device-level address `#/translate` (no player in it); Back goes to
  the settings when a player is chosen, else to the start page.
- The sheet renders a section when it comes near the view (IntersectionObserver), and every
  section at once for a search or the filter: building all ~2300 fields took 640-850 ms on the
  dev machine, over the plan's 200 ms; with it the page opens in about 120 ms.
- The progress ring's first click goes to the first untranslated field; further clicks go on
  from where the ring left the focus (a click on the ring takes the focus away from the field).
  Any started share shows at least 1 %, only all fields done show 100 %.
- Guide texts were written per section by subagents from the code, merged and reviewed; notes
  that leaned on a neighbour ("as above") were rewritten to stand alone.
- `translate.situation` and `translate.sendAttach` were dropped: the page never shows them.
- The accept script takes only the `.json` file; a correction sent as pairs in the issue body
  is imported into the translator by the owner and exported as `.json`.
- Audit finds: the modal close button's English-only "close" name (now `common.close`), the super
  player's companion name (`super.companionName`).

## Done - 2026-10-25
Shipped: the text catalog (every text in a section, group and item with its kind, guarded by
unit tests), guide texts in Slovak and English for every section, group and item (996
situations, patterns for repeated things), own languages in IndexedDB with the fallback chain
own -> base -> English and the own language's locale for dates, plurals and the voice, the
selects in the parent settings (official languages only on the language button and the new
player form), the pair format and JSON export/import, the translator page `#/translate`
(lazy chunk behind the parent question; prefill, keep, progress ring, contents, search and
filter, pools, plural forms, placeholder warnings, word list checks, new/edit language, about
panel, send for approval as a GitHub issue), `scripts/i18n-accept.mjs`, specs and
`e2e/translate.spec.ts`. Checked in the browser in both looks and at phone width, console clean.

Left out on purpose: an ordered list with an empty line in an own language falls back whole to
its base (no partial lists in the game); the accept script reads only `.json`.
Two e2e tests failed before this plan and still do (tooltip Escape on a new player's map,
already in the backlog; dark-look contrast of free typing, added to the backlog).
