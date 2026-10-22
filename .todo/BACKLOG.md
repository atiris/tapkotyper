# Backlog

Everything found outside the current task, one line each, most important first:
`- [P1|P2|P3] <title> - <one line: what is wrong and where>`.
Search before adding; an entry is worked only when it is named.
- [P3] Native-speaker review of the Slovak word list - public/words/sk.json was generated; rare or odd word forms may remain
- [P2] Regenerate flagged background art - five `regenerate:` strip rows in assets-src/PROMPTS.md with the new strip prompt (planet-near flat edge, robocity mid/near busy, workshop mid/near pink outline)
- [P3] Shadowed magenta stays inside strip springs - scripts/assets.mjs keyOut keeps dark purple key pixels between coils of bg-junkyard-near (about 200 px)
- [P3] Objects can flash their fallback on first spawn - src/game/runtime.ts prepare() preloads only the three backgrounds; mode sprites load on first draw (declare them per mode)
- [P3] An update re-downloads the whole install cache - scripts/sw-template.js addAll(CORE) fetches every file again when the version changes (about 6.6 MB)
- [P3] Free typing presses count toward key readiness - src/game/runtime.ts freeChar records every free key as a correct press with its quick rhythm, so mashing the newest keys can make them "ready" and open the next group at the next level end
