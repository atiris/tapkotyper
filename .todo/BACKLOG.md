# Backlog

Everything found outside the current task, one line each, most important first:
`- [P1|P2|P3] <title> - <one line: what is wrong and where>`.
Search before adding; an entry is worked only when it is named.
- [P3] Check .tapko sharing and opening on real devices - src/screens/teacher.ts sendDialog uses Web Share with files (Android, iPhone) and main.ts launchQueue opens a double-clicked .tapko in installed Chrome/Edge (plan 59); neither is testable here
- [P2] Mole and molehill are one picture - assets-src/obj-mole.jpg draws the mole inside its hill; the mole level (src/game/modes/egg.ts) needs the mole and the molehill as separate pictures
- [P2] Dictation words not all audible — src/words/words.ts WordSource.heard still lets through words whose spelling hearing does not decide (voicing at the end or before a consonant, i/y after consonants); see .research/game/activities.md Dictation rules
- [P2] Three e2e tests fail already on abb8420 - e2e/parrot.spec.ts:50 (no results card after the parrot flies off), e2e/play.spec.ts:152 (gate progress stays 13 % after a slip, expects 0 %), e2e/service.spec.ts:4 (13 done level nodes instead of 10 after the green side cards)
- [P2] Three e2e tests still name the old buttons - e2e/play.spec.ts:276 expects "Map" first on the stay-a-while card, :247 clicks "End exercise", e2e/keyboard-only.spec.ts looks for "End level"; commit 279bab3 made them "Stop typing"
- [P3] Calm background bands may show their inner joins - layers quilted with a sibling strip (scripts/bg-seam.mjs quilt) can leave steps in calm bands, as the planet path did; re-quilt them with the same strip as donor (assets-src/PROMPTS.md section 3) when one shows
- [P2] e2e styles.spec dictation and memory fail — e2e/styles.spec.ts:14 and :52 fail on main without any translator change (seen 2026-10-28)
