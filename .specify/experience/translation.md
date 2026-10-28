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
- The page (its labels, headings, explanations and situations) is in **English**; the guide is
  not translated. Above each field is its text in the **sample language** (any official or own
  language, by default the game's language), under it the translation. A **second sample** may
  be chosen (by default English when the first is not); it shows only in the field's info
  pop-up.
- Each field has small round buttons on the right above it: **info** (a pop-up with the
  field's name, its key, and its text in both samples; it shows on hover, stays open after a
  click), **copy** from the sample (the field still counts as untranslated), **done / not
  done**, **undo** and **redo** of the field's last changes (typing without a pause is one
  change, a copy or a mark is one too), and **find the key in the code** (the project's
  GitHub code search with the key, so the translator sees every place it is used).
- **Keyboard**: Tab and Shift+Tab go from field to field (the round buttons are out of the Tab
  order); a field reached by the keyboard shows its info pop-up at once, above the button so
  the field stays free. Alt+↓/↑ next or previous field, Alt+N next untranslated, Ctrl+Enter
  done and next untranslated, Alt+C / Alt+Shift+C copy from the first / second sample, Alt+M
  done or not, Alt+I keep the pop-up open, Alt+G the key in the code, Ctrl+Z / Ctrl+Y undo /
  redo, Ctrl+A the whole text, Alt+S search, Esc closes the pop-up, Alt+K the list of keys
  (also a button). Each button's tooltip names its key. Keys go by their place on the
  keyboard, so they work with any layout.
- **Translating the page itself**: a tip at the title recommends the browser's translation
  (Google Translate). The page says it is English, so the browser offers it; the samples, the
  keys, the placeholders, the language names and every field are marked not to translate, so
  only the headings, explanations, situations and buttons change.
- Kinds of texts: one text; a **pool** (lines picked at random: variants may be added or
  removed, never below one, the count may differ from the base); **ordered lines** (story
  scenes, lists: exactly the base count); a **count** (one field per plural form the
  translated language needs, with an example number); the word list.
- **A new language**: its own name, its code (de, fr, de-AT: dates and plural forms follow
  it), the language its untranslated texts fall back to, and its keyboard. **Edit a language**:
  a copy of an official language with every text filled, for own texts or a correction.
- **Prefill** from any language fills the fields not yet translated; a prefilled field still
  counts as untranslated until it is rewritten (even to the same text) or marked done (or
  Ctrl+Enter, which also goes to the next untranslated field). Mark as not done
  takes a mark by mistake back; the text stays.
- The sample texts show exactly as the translation should be written (no capitals added by the
  page), so a translator copies their case and punctuation.
- **Progress**: a round button with the percentage of translated fields, per section in the
  contents too; a click goes to the next untranslated field. "Only untranslated" folds finished
  panels to one line; a search finds a text by base text, translation or key.
- Placeholders (`{name}`) of the sample text show as chips; a translation missing one or adding
  an unknown one gets a warning (it is still saved).
- **Export**: a pair file (`.txt`, the sample language beside the translation) of everything, of only the untranslated fields (for an AI
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
- A translated guide and the page among its own texts made the translator hard to follow; an
  English page that the browser translates costs nothing to keep up. The sample is the
  language the translator reads best; a second one helps where a close language says it better.
- Thousands of fields are filled by the keyboard: Tab from field to field, the samples shown on
  arrival, and keys for what is done most often (copy, done, next untranslated, undo).
- Seeing where a key is used in the code answers what the situation does not.
- Prefilled is not translated: copying the base is easy, checking it is the work.
- The pair file is easy to edit in any text editor and to give to an AI with its context;
  JSON drops straight into the game's files.
- A GitHub issue needs no server, keeps the project free of accounts and data of its own, and
  gives every translation a public, reviewable trail.
