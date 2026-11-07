# Rytmus in every world, notes as world music, the journey as a badge

Owner's list in the chat of 2026-11-07, implemented right away in that session.

## What and why
- Rytmus in every world, the last of each story too (no exceptions); it opens with the world's
  levels done, like the range and the parrot (the first world too).
- Lanes per story (start -> end of the story, spread over its worlds): story 1: 2 -> 4, story 2:
  4 -> 6, story 3: 4 -> 8. The lanes are the newest ready letters' fingers, always left to right
  as the fingers sit. Clouds closer; with many lanes everything scales down to fit.
- A round lasts half of the world's regular level (1, 1.5, 2 minutes by the story).
- Tempo: each round has its own base (the kept tempo, else the usual speed's share, at most the
  world's target) and moves around it in small steps (5 % per phrase, at most 20 % either way); the
  next round's base moves by one small step only, never over 1.5x the target. A step up never
  narrows the catch window (good rhythm is not punished).
- After a miss: "Počkaj" in front with a blinking pause sign while the next letter glides into the
  band at half the speed; only then "Teraz pokračuj".
- Letter changes only in the second half of a story's worlds: 1, 2 or 3 a round by the story; the
  lane's cloud and beam fade out and a new cloud with the new letter and its beam comes (the finger
  may change, the order stays left to right).
- Rhythm notes belong to the world they were earned in; the chosen note's world music plays on
  the start, the map and the menus while that note lasts ("Hudba sveta Lúka hrá na Mape svetov.").
  A fading note is a random one.
- World map island: top left the surprises, top right the world badge (clickable: shows it big in
  the middle with the badge show's animation), bottom left the keyboard, bottom right (story's last
  world) the hero's journey as a badge: bronze 1, silver 3, gold 5 stars; click starts it, its
  tooltip tells the tier and what each needs. The journey node leaves the level row.

## Affected
- `src/game/beat.ts`, `src/game/modes/rhythm.ts`, `src/game/levels.ts`, `src/screens/map.ts`,
  `src/screens/stats.ts`, `src/screens/level.ts`, `src/ui/badge-show.ts`, `src/ui/badge.ts`,
  `src/screens/world-keys.ts`, `src/app/app.ts`, start/map music, `src/storage/schema.ts` +
  `store.ts` (alpha: new fields with defaults, no migration), `src/styles.css`, i18n sk/en/translator,
  specs `rhythm.md`, `heros-journey.md`, `statistics.md`, tests unit + e2e.

## Steps
- [x] Beat: lanes count per world, lane pick, tempo around a base, window never narrows, changes in the second half with finger moves
- [x] Rytmus mode: round length, miss pause with blinking sign, fades of cloud and beam, scale to fit, closer clouds
- [x] Every world, opens with the world done
- [x] Notes per world, random fade, chosen world music on menus
- [x] Map: journey badge bottom right, keyboard bottom left, clickable world badge show
- [x] Specs, texts, tests, browser check
- [x] Super help plays Rytmus (owner's later request): no mistakes = every catch in the band's middle;
  N mistakes = N misses; an accuracy share = that share in the middle, the rest elsewhere in the band

## Done - 2026-11-07
Everything above shipped. Left out: no new art per world (Rytmus uses each world's own background).
