# Translation

## What
- A page **Translate the game** (`#/translate`) where a parent sees every text of the game and
  translates it: screens, Tapko's, the fairy's and the narrator's lines, the target range's
  lines and things, keyboard words (keys, fingers, posture, tips), help, settings, the
  teacher's pages, and the **word list** the typing targets are
  built from.
- Only a parent gets there: a button in the settings' typist tab, by the language selects.
  The address asks the parent question (or the password) like the settings do; from the
  settings it opens at once. Back returns to the settings (to the start page when no player is
  chosen).
- The texts are grouped the way the game uses them: **sections** (start and players, the map,
  typing, the story, the target range, results, wardrobe, breaks and tips, settings, for
  teachers, help, words to type) with **groups** inside, each with a heading
  and a short explanation. Every text has its **situation**: one short sentence saying where
  and when it appears, who says it and what its placeholders hold. Things that repeat (the
  range's things, the tips) share one situation with the thing's name filled in.
- The page is in **English**, and above each field is the English text; under it the
  translation. The headings, explanations and situations (the guide) are not translated.
- A **shadow language** (any official or own language, by default the game's language when it
  is not English) is a second view: each field has an **info** button that opens a box under it
  with the text in the shadow language, **Copy from** it (the field still counts as
  untranslated), **Mark as done** / **Mark as not done**, and **Find the key in the code**: the
  project's GitHub code search with the key, so the translator sees every place it is used.
  The box also shows the field's key.
- Kinds of texts: one text; a **pool** (lines picked at random: variants may be added or
  removed, never below one, the count may differ from the base); **ordered lines** (story
  scenes, lists: exactly the base count); a **count** (one field per plural form the
  translated language needs, with an example number); the word list.
- **A new language**: its own name, its code (de, fr, de-AT: dates and plural forms follow
  it), the language its untranslated texts fall back to, and its keyboard. **Edit a language**:
  a copy of an official language with every text filled, for own texts or a correction.
- **Prefill** from any language fills the fields not yet translated; a prefilled field still
  counts as untranslated until it is rewritten (even to the same text) or marked done in its
  info box (or Ctrl+Enter, which also goes to the next untranslated field). Mark as not done
  takes a mark by mistake back; the text stays.
- The English texts show exactly as the translation should be written (no capitals added by the
  page), so a translator copies their case and punctuation.
- **Progress**: a round button with the percentage of translated fields, per section in the
  contents too; a click goes to the next untranslated field. "Only untranslated" folds finished
  panels to one line; a search finds a text by base text, translation or key.
- Placeholders (`{name}`) of the English text show as chips; a translation missing one or adding
  an unknown one gets a warning (it is still saved).
- **Export**: a pair file (`.txt`) of everything, of only the untranslated fields (for an AI
  translator), or of only the changes against the corrected language; or a `.json` file.
  **Import** of both shows what will be applied and what is skipped, and why, before it
  applies. Importing without a translation chosen starts the language from the file.
- **About the translation**: the author's name and contact (the contact becomes public when
  sent), name, code, keyboard, delete.
- **Send for approval**: after a note that the issue is public, needs a GitHub account and
  shows the contact, a new issue opens on the project's GitHub with the language, author,
  progress and either the changes (a small correction) or a request to attach the downloaded
  file. The owner adds the language with `scripts/i18n-accept.mjs`.
- The word list section shows which words the chosen keyboard cannot type (left out of the
  game) and how many words each of the first lessons has; too few is marked.
- Looks like a sheet with blanks to fill: warm paper, dark section headings, orange group
  headings, white panels in a wrapping grid, pictures of the things, wardrobe items,
  characters and worlds; both looks (light, dark); on a phone one column and no sideways
  scrolling. Long sections fill in as they come into view.
- The page's own texts and the guide are one file, `public/i18n/translator/en.json`, apart
  from the game's texts and not shown in the translator. The translator is translated by hand
  as a copy of that file named by the game's language (`translator/de.json`); the page uses it
  when the game is in that language, English for anything it lacks.
- Known exceptions that stay untranslated: `index.html` (`<noscript>`, description) and the
  install manifest are read before any language is known.

## Why
- A new language used to mean editing two big JSON files by hand, and only the owner knew
  where a text is shown or when a line is said; the situations make a translation right the
  first time, by anyone who speaks the language.
- One source language and one optional view of another kept the page simple: a base language,
  a translated guide and the page among its own texts made it hard to see what to do. English
  is the language most translators and AI translators read; the shadow language helps where a
  close language says it better.
- Seeing where a key is used in the code answers what the situation does not.
- Prefilled is not translated: copying the base is easy, checking it is the work.
- The pair file is easy to edit in any text editor and to give to an AI with its context;
  JSON drops straight into the game's files.
- A GitHub issue needs no server, keeps the project free of accounts and data of its own, and
  gives every translation a public, reviewable trail.
