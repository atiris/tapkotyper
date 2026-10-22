# Exercise types beyond "type what appears"

**Status:** dictation and memory in spec (`.specify/game/mechanics.md`, plan 23, 2026-10-21);
picture-to-word not wanted by the owner; the rest open. **Prio:** P2.

## What is used in typing courses and games
| Type | What the child does | Where it is used |
|---|---|---|
| Copy typing (letters, words, phrases) | types the shown target | every course; all TapkoTyper story levels |
| Block typing / new key drill | one character per box, slow, attention on the new key | TypingClub "Block Typing" [src] |
| Adaptive drill | text built from the weakest letters and pairs | TypingClub dynamic lessons [src], Keybr [bg] |
| Dictation (type what you hear) | hears a letter, word or phrase and types it without seeing it | Talking Typer dictation sections [src]; a study of 57 fourth-graders found copying and dictation measure different things, and reading speed drives both [src] |
| Memory / flash typing | the word shows for a moment, hides, and is typed from memory | common in classroom drills [bg]; not found in the searched kids' products |
| Accuracy run / block on error | no progress past a wrong key; a mistake restarts the line | TypingClub blind setting "block-on-error" [src]; accuracy challenges [bg] |
| Rhythm / metronome | type to a steady beat | music-style typing games [bg] |
| Reaction / whack-a-mole | a short target pops up and hides again | arcade typing games, KidzType [src] |
| Timed test | 1-3 minutes of text, speed and accuracy measured | KidzType timed drills [src], every test site |
| Race (others or own ghost) | type against a pace car | Nitro Type [src], KidzType TypeRace [src] |
| Composition / answer typing | types an answer, a picture's name or own sentence | school programs that mix typing with writing improved writing too [src: WoTIP study] |
| Spelling / missing letters | fills the missing letters of a known word | spelling apps [bg] |
| Continuous text | a longer story typed as one flow | Epistory [src in competitors.md] |

## What TapkoTyper has and does not have (2026-10-21)
| Type | TapkoTyper |
|---|---|
| Copy typing words/phrases | **yes**: all story levels, rescue missions, free practice |
| New key introduction | **yes**: new key card (block-like, alone first) |
| Adaptive weak keys | **yes**: word source weights weak keys |
| Rhythm | **yes**: battery, wave, storm super-obstacles |
| Reaction | **yes**: mole, robot family welcome |
| Codes in groups | **yes**: robot city doors and gate |
| Own text / sentences | **partly**: parent's own text in free practice |
| Accuracy run (restart on error) | **planned**: robot city super level 9-5 (plan 21) |
| Dictation | **yes**: free practice style; story 3 and rescue missions planned (plan 24) |
| Memory / flash | **yes**: free practice style; story 3 and rescue missions planned (plan 24) |
| Picture-to-word / answer typing | **no** |
| Spelling / missing letters | **no** |
| Timed test | **no** (researched in `../profiles/typing-check.md`) |
| Race own ghost | **no** (researched in `../game/race-your-past-self.md`) |
| Fixing with Backspace | **no** (researched in `fix-with-backspace.md`) |

## Proposed (in this order)
1. **Dictation levels ("Počúvaj a píš")**: Tapko says a word, the object carries only a
   speaker icon (and the letter count as dots); the word appears after it is typed or
   after two replays. Uses the existing speech engine; a level variant in worlds where
   it fits (robot city: "voice passwords"). Needs a voice for the language; levels fall
   back to normal copy typing without one. Trains listening-to-letters, which copying
   does not [src: copy vs dictation study].
2. **Memory flash ("Zapamätaj si")**: the target shows for 1-2 s (longer for long
   words), then turns into dots; Space shows it again once. Good for older children,
   trains reading whole words instead of letter by letter. Fits space (stars that blink)
   and rain (drops that fog up).
3. **Picture-to-word ("Čo je na obrázku?")**: the object is a picture (bee, gear,
   umbrella) and the child types its name; first letter as a hint, full word after a
   miss. Uses the sprites we already have and a small word-to-sprite list per language.
   Links typing to writing [src: WoTIP].
4. **Accuracy runs** as a rare super-obstacle style beyond 9-5: short and clearly
   announced, never more than one per story.
5. **Missing letters** (spelling): later, needs good word lists per language.

Timed test, ghost race and Backspace fixing already have their own research files.

## Sources
- TypingClub lesson types: https://dimke.typingclub.com/docs/user-guide/class-student-setup/lesson-types.html
- TypingClub accessibility (block on error): https://freetech4teach.teachermade.com/?p=7551
- Talking Typer (dictation): https://tech.aph.org/tt_doc.htm
- KidzType games: https://www.kidztype.com/tags/kids-typing-games/
- Copy vs dictation, 57 fourth-graders: https://doaj.org/article/154f35499e2748c1a213978dc54534ce
- Typing + composition program (WoTIP), Grade 4: https://cris.huji.ac.il/en/publications/effect-of-an-instructional-program-for-word-processing-and-effici/
