# The world's music goes on until something really changes it

The owner's wish of 2026-11-08: fewer cuts in the music. Today the map switches back to the menu
track after every level, and every level starts its world's track again. Spec to keep in step:
`.specify/experience/audio.md` (or wherever music switching is described; search "menu track").

## The rule

One "music context" is kept in the app: the world whose music plays (`musicWorld: number | null`),
or "the child's own pick" waiting for the next level.
- **Start page** (the player choice): plays the menu track, unless it already plays; `musicWorld` = null.
- **Starting a level** of world W: if `musicWorld` is W, the music goes on as it is (also a track the
  child picked); else W's track starts and `musicWorld` = W. A child's own pick made outside a level
  (on the map) counts as the music of the next level: starting any level keeps it and makes that
  level's world the context; a later level of another world switches.
- **The child picks another track** (the sound button's right click, F8): it plays now and stays the
  context's music until a level of another world starts (or the start page).
- **The map, wardrobe, progress, tasks, settings and the other screens** never switch the music: they
  keep what plays. Only when nothing plays at all (a reload straight onto the map) the map starts the
  context's music (W's track, else the menu track).
- **Levels with their own music** (Rytmus) stop the world music while they run; leaving them, the
  screen after resumes the context's music.
- **Breaks and story scenes** keep their own music while shown; after them the context's music comes
  back (story scenes are of a world: they set the context to it like a level does).
- Own practice (no world) plays the menu track and sets the context to null, like the start page.

Affected: `src/audio/audio.ts` (maybe a small `src/audio/context.ts` for the rule, unit-tested),
`src/app/app.ts` (`menuTrack` stays the menu choice), `src/screens/start.ts`, `src/screens/map.ts`,
`src/screens/story.ts`, `src/screens/break.ts`, `src/game/runtime.ts`, `src/ui/chrome.ts` (the pick).

## Steps

- [ ] **1. The rule as a pure function** (screen or level entered + the current context and track ->
  the track to play and the new context), unit tests for every case above.
- [ ] **2. Wire it** into the places above; remove the direct `audio.music(...)` calls they replace.
- [ ] **3. Checks.** tsc, vitest, build, e2e specs touching music (search `music` in `e2e/`); browser
  check: level of the meadow -> map (meadow track goes on) -> next meadow level (no restart) -> a level of
  another world (switches) -> start page (menu track); a picked track on the map stays into the next level.

## State
Nothing implemented yet.
