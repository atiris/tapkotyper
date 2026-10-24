# Localization

## What
- UI languages: Slovak (complete) and English (complete), kept as one table of the supported
  languages with each one's own name ("Slovenčina", "English") and a table of close languages
  (Czech reads Slovak). Every place that offers a language (the language button, the new player
  form, the settings) reads the same table, so a new language shows up everywhere at once.
- Default when nothing is stored: the browser's languages in their order, the first one that is
  supported, else the first whose close language is; else English. A stored choice wins.
- Changeable with the language button on every screen (the language symbol, a list of the
  languages by their own names) and per profile.
- All texts, story lines and Tapko messages come from per-language JSON files loaded on demand.
- Adding a language means adding its text file, one row in the language table, its word list
  and (if new) its layout.
- The word list language is chosen per player, apart from the interface language
  ([words](../learning/words.md)).
- **Terms**: the one who types is the **pisateľ** / **typist**; the one who receives results
  is the **učiteľ** / **teacher** ("Pre učiteľov" / "For teachers"); where the parent matters
  too (who makes tasks, who scans results, the help section) it says "učiteľ písania alebo
  rodič" / "a typing teacher or a parent". No text says "dieťa", "deti", "žiak" or "mentor",
  nor "child", "kid" or "mentor"; a sentence is
  rephrased ("tvoje", "hráč") where it reads better. Slovak never uses a gendered
  second-person past tense. A unit test guards both dictionaries. Code names and addresses
  (`teacher`, `#/teacher/child/<id>`) stay, nobody reads them.

## Why
- The main audience is Slovak; English opens the project to everyone else.
- Walking the browser's whole list respects a visitor who prefers a language we do not have
  but reads a second one we do.
- "Dieťa" talks about the player instead of to them, and older players, adults included, use
  the game.
- "Mentor" is a word nobody uses at school or at home; everyone understands "učiteľ", and the
  parent is named where a parent really does the same job.
