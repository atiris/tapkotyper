# Backlog

Everything found outside the current task, one line each, most important first:
`- [P1|P2|P3] <title> - <one line: what is wrong and where>`.
Search before adding; an entry is worked only when it is named.
- [P2] Returning players can keep an old version for days - scripts/sw-template.js serves cache-first and the new worker waits until every tab of the site closes; a reload never brings the update (no skipWaiting or "new version" prompt)
- [P3] Native-speaker review of the Slovak word list - public/words/sk.json was generated; rare or odd word forms may remain
- [P3] Shadowed magenta stays inside strip springs - scripts/assets.mjs keyOut keeps dark purple key pixels between coils of bg-junkyard-near (about 200 px)
- [P3] Objects can flash their fallback on first spawn - src/game/runtime.ts prepare() preloads only the three backgrounds; mode sprites load on first draw (declare them per mode)
- [P3] An update re-downloads the whole install cache - scripts/sw-template.js addAll(CORE) fetches every file again when the version changes (about 6.6 MB)
- [P3] Free typing presses count toward key readiness - src/game/runtime.ts freeChar records every free key as a correct press with its quick rhythm, so mashing the newest keys can make them "ready" and open the next group at the next level end
- [P3] Check sound on a real iPhone and Android phone - src/audio/audio.ts now unlocks on pointerup/touchend/click with a silent buffer (plan 46); only a real device can confirm music and effects play
- [P3] Check .tapko sharing and opening on real devices - src/screens/teacher.ts sendDialog uses Web Share with files (Android, iPhone) and main.ts launchQueue opens a double-clicked .tapko in installed Chrome/Edge (plan 59); neither is testable here
