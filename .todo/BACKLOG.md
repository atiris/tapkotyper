# Backlog

Everything found outside the current task, one line each, most important first:
`- [P1|P2|P3] <title> - <one line: what is wrong and where>`.
Search before adding; an entry is worked only when it is named.
- [P3] Check .tapko sharing and opening on real devices - src/screens/teacher.ts sendDialog uses Web Share with files (Android, iPhone) and main.ts launchQueue opens a double-clicked .tapko in installed Chrome/Edge (plan 59); neither is testable here
- [P2] Mole and molehill are one picture - assets-src/obj-mole.jpg draws the mole inside its hill; the mole level (src/game/modes/egg.ts) needs the mole and the molehill as separate pictures
- [P3] Robohome floor strip shows its seam joins - public/assets/bg-robohome-near.webp: quilt cut the regular planks diagonally (V lines every screen width); repaint that seam or regenerate the floor strips
- [P2] Dictation words not all audible — src/words/words.ts WordSource.heard still lets through words whose spelling hearing does not decide (voicing at the end or before a consonant, i/y after consonants); see .research/game/activities.md Dictation rules
