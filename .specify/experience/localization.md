# Localization

## What
- UI languages: Slovak (complete) and English (complete). Detected from the browser,
  falling back to English; changeable on the start screen and per profile.
- All texts, story lines and Tapko messages come from per-language JSON files loaded on demand.
- Adding a language means adding its text file, its word list and (if new) its layout.
- The word list language is chosen per player, apart from the interface language
  ([words](../learning/words.md)).
- **Terms**: the one who types is the **pisateľ** / **typist**; the one who receives results
  (a teacher, a parent, a coach) is the **mentor** ("Pre mentorov" / "For mentors"). No text
  says "dieťa", "deti", "žiak" or "učiteľ", nor "child", "kid" or "teacher"; a sentence is
  rephrased ("tvoje", "hráč") where it reads better. Slovak never uses a gendered
  second-person past tense. A unit test guards both dictionaries. Code names and addresses
  (`teacher`, `#/teacher/child/<id>`) stay, nobody reads them.

## Why
- The main audience is Slovak; English opens the project to everyone else.
- "Dieťa" talks about the player instead of to them, and older players, adults included, use
  the game; "učiteľ" leaves out the parent or coach who receives results.
