# TapkoTyper Research: What Users Want From Kids Typing Tools

Date: 2026-10-20. Scope: kids and young teens (target age 10-15), parents, teachers. Spec read: the original brief.

## Method and honesty note
Web search gave thin results (few real Reddit threads, Common Sense Education reviews were frozen in Jan 2026 and are being removed). Many blog "reviews" are sponsored (Typesy). Claims below are marked:
- **[src]** = backed by a fetched or searched source (URL in `competitors.md`).
- **[bg]** = common background knowledge about the products or keyboard, not verified in this pass. Verify before relying on it.

## Files
- `competitors.md` - per product: praise and complaints.
- `features/index.md` - list of proposed feature areas (one file each).

## Big picture (3 lines)
1. Kids' tools fail on: ads, rigid scoring, boring repeated lessons, speed-over-accuracy races, and weak finger guidance.
2. Teachers want: free, no ads, simple assignments, accuracy shown first, proper finger technique.
3. Slovak is a real gap: no found child-friendly modern tool handles the Slovak layout (diacritics behind the number row, dead keys) well. This is our best differentiator.

## Top 15 recommendations (ranked)

| # | What | Why / evidence | Prio | Fits philosophy |
|---|------|----------------|------|-----------------|
| 1 | Slovak-first layout teaching: ordered lessons for diacritics, dead keys (acute, caron), number row where digits need Shift | Slovak diacritics sit behind digits [src: ddadsstornala]; Slovak tool "Písanie Hravo" sells a diacritics level [src]. No free kid tool found | P1 | yes |
| 2 | On-screen keyboard with finger colors + next-key highlight, option to fade/hide it | Dance Mat weak finger guidance [src: Typing Tournament]; masking keys is standard teacher advice [src: Mavis Beacon guide] | P1 | yes |
| 3 | Accuracy-first feedback (no WPM race, stars for clean words, speed shown only as trend) | Teachers: races push speed over accuracy [src: Common Sense Nitro Type]; TypingClub kids complain speed is prioritized [src] | P1 | yes |
| 4 | Zero ads, zero accounts, zero tracking, stated plainly | Ads are the top complaint on TypingClub and Typing.com free [src]; privacy warning on TypingClub [src] | P1 | yes |
| 5 | Gentle mistake handling: no lost lives, wrong key just wobbles, Tapko says a hint | Rigid scoring and discouraging pacing [src: parents on TypingClub]; matches spec | P1 | yes |
| 6 | Adaptive practice: weak keys get more weight, keys unlock one at a time | Keybr / Typing.com tailor to trouble letters [src, bg] | P1 | yes |
| 7 | Session pacing: soft stop at 10-15 min, stretch break with Tapko, no streak guilt | 5-10 min start, break after ~20 min for primary [src: EANI]; addiction concern [bg] | P1 | yes |
| 8 | Parent panel: key/length/difficulty (in spec) + per-key heat map, weekly summary, printable certificate | Parents like progress tracking [src]; teachers want assignments [src] | P2 | yes |
| 9 | Accessibility pack: dyslexia-friendly font choice (Lexend/Atkinson/OpenDyslexic), colorblind-safe finger colors plus patterns, big text, reduce motion, sound off | OpenDyslexic not universal, alternatives suggested [src]; uncluttered screen, low motion [src] | P2 | yes |
| 10 | Offline-first PWA, installable, works without network after first load | Fits GitHub Pages; school Wi-Fi/lag complaints [src: kid reviews lag] | P2 | yes |
| 11 | Short, varied lessons: skip button, no unskippable songs/cutscenes | Dance Mat: cannot skip long songs, low replay value [src] | P2 | yes |
| 12 | Posture and hand-position reminder at start and at breaks (home row bumps F/J) | EANI: teach home row from start [src]; Dance Mat needs teacher policing [src] | P2 | yes |
| 13 | Keyboard layout selector (Slovak QWERTZ, Czech, US QWERTY, German) plus detection warning | Slovak layout differs by OS [src: Wikipedia QWERTZ]; Tux Typing supports many languages [src] | P2 | yes |
| 14 | Export/import progress + printable "progress card" instead of class codes | Class codes/rosters add privacy burden [src: Typing.com take-home agreement] | P2 | yes |
| 15 | Optional calm "free practice" with pronounceable pseudo-words per key set (in spec) plus Slovak real-word lists with correct diacritics | Keybr-style generated words [src, partial]; spec already has fallback generator | P3 | yes |

Partly-fitting ideas deliberately NOT recommended: public leaderboards and racing (Nitro Type), chat, cosmetic purchases, daily streak pressure. See `features/session-pacing.md` and `features/accuracy-first-feedback.md`.

## Gaps 2026-10-21

Date: 2026-10-21. Second pass, after most of the list above was built (see `../.specify/`).
Method: read README and `.specify/`, checked `src/` where a gap was unclear, then web
searches (Common Sense reviews, Trustpilot, vendor help pages, teacher guides, small
keyboarding studies, Slovak and Czech course reviews). Reddit could not be fetched. Many
vendor pages are marketing; each proposal file names its sources and says how strong they are.

Biggest finding: the game never asks for the **space bar** and teaches **no punctuation**,
so a child who finishes it still cannot type a school sentence.

| # | Proposal | Prio | Effort | Why (one line) | File |
|---|----------|------|--------|----------------|------|
| 1 | Sentences, space bar and punctuation | P1 | M | Space and `. , ? !` are never practised; every course ends with sentences | [learning/sentences-and-punctuation.md](learning/sentences-and-punctuation.md) |
| 2 | Own word lists (school spelling words) | P1 | S | Parents and teachers want to practise this week's words (Typesy, Nessy) | [learning/own-word-lists.md](learning/own-word-lists.md) |
| 3 | Tapko reads aloud | P2 | M | Typing.com and TypingClub added read-aloud; helps young and dyslexic readers | [experience/read-aloud.md](experience/read-aloud.md) |
| 4 | Story pages and fact cards | P2 | M | TypingClub story mode is loved; drills feel repetitive | [game/story-pages.md](game/story-pages.md) |
| 5 | Tapko asks, the child answers | P2 | S-M | Real typing is composing; own text is a separate skill | [game/tapko-questions.md](game/tapko-questions.md) |
| 6 | Placement check | P2 | M | Children who know the home row are bored by `f j`; all school tools place first | [learning/placement-check.md](learning/placement-check.md) |
| 7 | Class overview from exported files | P2 | M | Teachers want class reports, today they need accounts | [profiles/class-overview.md](profiles/class-overview.md) |
| 8 | Gentle weekly goal | P2 | S | Parents ask for goals; a goal that only grows avoids streak pressure | [profiles/gentle-goal.md](profiles/gentle-goal.md) |
| 9 | Fix it yourself (Backspace) | P3 | S | Real typing needs correcting; TypingClub makes it a teacher setting | [learning/fix-with-backspace.md](learning/fix-with-backspace.md) |
| 10 | Typing check and personal certificate | P3 | S | Certificates motivate (Ratatype); fair long-term progress number | [profiles/typing-check.md](profiles/typing-check.md) |
| 11 | Race your past self | P3 | M | Racing excites kids (Nitro Type); racing yourself avoids strangers | [game/race-your-past-self.md](game/race-your-past-self.md) |
| 12 | One-hand learning path | P3 | M | Hand differences or a broken arm; only paid niche tools exist | [learning/one-hand-path.md](learning/one-hand-path.md) |
| 13 | Czech language and keyboard | P3 | M | Bigger neighbour market, same gap: only paid or old Windows tools | [experience/czech.md](experience/czech.md) |

## World rhythm 2026-10-22

A child plays about one world per session, but levels 1-4 of a world are the same game.
Brainstorm with open questions: [game/world-rhythm.md](game/world-rhythm.md) (fixed roles
per level: main game, calm step, harder main game with a surprise, twist, super-obstacle).

Areas: [learning/](learning/index.md), [game/](game/index.md),
[profiles/](profiles/index.md), [experience/](experience/index.md).

Dropped on purpose:
- Multiplayer races with friends or strangers (Nitro Type) - leaderboards, chat and speed focus break principles 1 and 3; the own-shadow race keeps the fun.
- Two players on one keyboard (Battle Type) - both children leave the home position, which teaches bad habits.
- Daily goal timers that lock games until met (Typing.com PLUS) - homework pressure; the weekly goal never locks anything.
- Keyboard covers or "no peeking" camera checks - studies are mixed (in a small Valdosta State thesis, classes with covered keys made more errors) and the guide already fades by mastery.
- Paid content, ads, accounts, cloud sync - conflict with principle 4.
