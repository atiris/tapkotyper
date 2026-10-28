# 79 Translator in English with a shadow language

## What and why
The translator page is too complicated: a base language above each field, the guide
(headings, explanations, situations) as fields to translate, the page itself as a section of
the game's texts. The owner wants it simpler:

- The page is in **English** always. Its own texts and the guide live in one separate file,
  `public/i18n/translator/en.json` (`ui`, `sections`, `groups`, `situations`), not in the
  game's dictionaries and not in the catalog. Translating the translator is translating that
  file by hand; the page reads `translator/<game language>.json` when one exists, English for
  anything missing. Only English ships.
- Above each field the **English** text, always (copied case and punctuation as before).
- A **shadow language** (any official or own language) replaces the base select. Each field has
  an **info** button that opens a small box under the field: the text in the shadow language,
  **Copy from <shadow>** (fills the field, still not done), **Mark as done / Mark as not done**
  (replaces the keep and untranslated buttons), and **Find in code** (GitHub code search of the
  key, so the translator sees every use). Typing and Ctrl+Enter still mark done.
- Kept: new / edit language, prefill from any language, progress ring and jump, contents,
  only-untranslated filter, search, pools, plural forms, placeholders warning, word list
  section, export pairs (all / untranslated / changes) and JSON, import, about, send for
  approval.
- The guide is no longer translated: `OwnLang.guide`, guide fields, guide in the JSON export,
  `public/i18n/guide/*.json` and the guide part of `scripts/i18n-accept.mjs` go.

## Affected
- `src/screens/translate.ts`, `src/i18n/translation.ts`, `src/i18n/own-langs.ts`,
  `src/i18n/catalog.ts` (translate section out), `public/i18n/{sk,en}.json` (`translate.*` out),
  `public/i18n/translator/en.json` (new), tests (`catalog`, `pairs`, `unused-keys`,
  `e2e/translate.spec.ts`), `scripts/i18n-accept.mjs`, `src/styles.css`,
  `.specify/experience/translation.md`.
- No player store change; own languages in IndexedDB keep an unused `guide` field (alpha, no
  migrations).

## Steps
- [x] Translator file with `ui` texts and the guide; loader with English fallback; dictionaries
  and catalog without `translate.*`; guide files removed.
- [x] Guide fields out of the field model, JSON export/import, own languages, accept script.
- [x] Page: English base, shadow select, info box (shadow text, copy, done toggle, GitHub).
- [x] Tests (unit, unused translator keys, e2e), spec, browser check.

## Done - 2026-10-28
All steps shipped: English page and guide in `public/i18n/translator/en.json` (a translator file
of the game's language is read when added by hand), shadow language with the info box (shadow
text, copy, done toggle, GitHub key search, key), guide no longer translated, `translate.*` out
of the dictionaries and the catalog, a test for unused translator texts. Left out: nothing.
