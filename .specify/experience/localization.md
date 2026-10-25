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
- **Own languages**: a language made or edited in the [translator](translation.md) lives on
  this device. It is played like an official one, but it is picked only in the parent
  settings (interface and word language selects, official languages first, then own ones by
  their own names); the language button and the new player form list only official
  languages. An edit of an official language shows as "Slovenčina (vlastné texty)".
- A text missing in an own language comes from its base language, then from English. Dates,
  plural forms and the reading voice follow the own language's code.
- A player whose own language is not on this device (deleted, or the player came from
  another device) plays in the browser's language without a word, and keeps the choice: when
  the language comes back, so does the player's. Exported players and moved players keep the
  choice, not the language itself; it is exported from the translator.
- An own language's word list is used when a word language select points to it; with an empty
  list its base language's words are used.
- **Terms**: the preferred words are **študent** / **student** for the one who types (longer:
  "študent písania na klávesnici" / "keyboard typing student") and **učiteľ** / **teacher**
  for the one who receives results and looks after the players on this computer ("Pre
  učiteľov" / "For teachers"; longer, where the parent matters too: "učiteľ písania alebo
  rodič" / "a typing teacher or a parent"). "Dieťa", "žiak", "child" are not banned, only not
  the default; a sentence is
  rephrased ("tvoje", "hráč") where it reads better. Slovak never uses a gendered
  second-person past tense. Code names and addresses
  (`teacher`, `#/teacher/child/<id>`) stay, nobody reads them.

## Why
- The main audience is Slovak; English opens the project to everyone else.
- Own languages let a family play in a language the project does not have yet, and test a
  translation in the real game before sending it; keeping them out of the child's language
  button keeps an unfinished translation from reaching a child by accident.
- Walking the browser's whole list respects a visitor who prefers a language we do not have
  but reads a second one we do.
- "Študent" names the role, not the age: older players, adults included, use the game, and
  "dieťa" talks about the player instead of to them.
- "Mentor" is a word nobody uses at school or at home; everyone understands "učiteľ", and the
  parent is named where a parent really does the same job.
