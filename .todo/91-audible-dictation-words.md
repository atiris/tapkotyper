# 91 - Dictation says only words whose spelling the ear decides

## Why

In a dictation the child hears a word and must write it. Slovak writes some sounds two ways, so
for some words hearing alone cannot decide the spelling: a child who types "dup" for "dub" was
right by ear and still gets a slip. The rules are in `.research/game/activities.md`
(Dictation): only audible text, and no words where voicing or i/y decides the spelling.
`src/words/words.ts` (`WordSource.heard`) already keeps to dictionary words without marks,
capitals or digits, but still lets these words through. Dictation is a way to type in own
practice now and the main mode of the fairy story later.

## Decisions

- **Slovak only** (`sk` dictionary); English dictation keeps its current rule (dictionary words;
  English spelling is never decided by the ear alone, and the voice reads real words clearly).
- A Slovak word is **not heard-safe**, and a dictation never says it, when it has:
  - **a voiced consonant at its end** that sounds voiceless there: `b d ď g h z ž v`, and the
    pairs `dz dž` (dub "dup", hrad "hrat", noha is fine, nôž "nôš", lev "leu");
  - **a voicing pair next to each other with mixed voicing**: a voiced one of `b d ď g h z ž dz
    dž` before a voiceless one of `p t ť k ch s š c č f`, or a voiceless one before a voiced one
    other than `v` (vták "fták", kde "gde", stĺp is fine, sklo is fine); `v` before a voiceless
    consonant counts as voiced (vták);
  - **i, í, y or ý after a "both-ways" consonant** `b f l m p r s v z` (bili/bily, ryba, líška,
    syr, vy): there the ear cannot tell i from y.
  The check is one pure function (e.g. `heardSafe(word)`) used where `heard` picks words
  (`pickReal`, `heardOwn`, `fits`), with `ch`, `dz`, `dž` read as one sound.
- **Fewer words is fine:** when the safe words at the child's keys fall under `REAL_MIN` (8),
  the existing fallback (single letters) takes over as it does now; correctness beats variety.
  A test prints how many safe words the dictionary has at 10, 20 and 30 keys of the Slovak order
  so a drop is visible in review.
- Own words of the parent (`heardOwn`) obey the same rule; an own word that is not heard-safe is
  simply not dictated (it is still used in copy runs).
- No new texts, no help change (the help already says dictation words are heard).

## Affected

- `src/words/words.ts` (`heardSafe`, its use in the heard picks), `src/words/words.test.ts`.
- Specs: `.specify/learning/words.md` (what a dictation may say) and the dictation line of
  `.specify/game/mechanics.md` (one sentence pointing to it).
- DB/store: none.

## Steps

- [ ] Spec lines in `words.md` and `mechanics.md`.
- [ ] `heardSafe` with the three rules; used for dictionary and own words in heard mode.
- [ ] Tests: unsafe examples (dub, hrad, nôž, lev, vták, kde, bili, ryba, syr, vy, líška) are
      rejected, safe ones (mama, noha, sklo, stĺp, ruka, kino, tyč: after t the ear tells ty from
      ti) are kept; a heard source never yields an unsafe
      word over many draws; the count of safe words at 10/20/30 keys is printed.
- [ ] `npm run build`, `npx vitest run`; Playwright MCP: own practice with dictation in Slovak
      (tester profile), a dozen words heard, none of them unsafe; console clean.
