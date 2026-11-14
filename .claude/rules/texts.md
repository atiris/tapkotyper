---
paths:
  - "public/i18n/**"
  - "public/words/**"
  - "src/i18n/**"
  - "src/words/**"
  - "src/screens/translate.ts"
---

# Texts and languages

- Read texts with `npm run i18n -- <key or prefix>` (every language side by side, with the situation) or `-- --find <text>`; never Read a language file whole. Edit one key with the Edit tool on its unique line.
- A new or changed text lands in every official language in the same commit (`npm run i18n -- --missing` must print 0), gets its place in `src/i18n/catalog.ts` and its situation (one sentence: where, when, who says it, what each `{placeholder}` holds) in `public/i18n/translator/en.json`; `catalog.test.ts` and `unused-keys.test.ts` fail otherwise.
- Slovak (and every other language with a formal address) says "ty" to everyone, never "vy", and has no gendered second-person past tense; the one who types is "študent"/"student", the one who looks after the players "učiteľ"/"teacher" (`.specify/experience/localization.md`).
- "Ťapko" (Slovak) / "Tapko" (English) is the app; the animal the child plays is "postavička"/"character".
- Never name other typing sites, companies or games, in texts or anywhere in the repo.
- Plural forms are objects of `Intl.PluralRules` categories (`one`, `few`, `many`, `other`); a language takes the categories its rules have.
- Word lists: lower-case words a child knows, no proper names, nothing in `BLOCK` (`src/words/words.ts`); `words.test.ts` checks how many words the first lessons get.
