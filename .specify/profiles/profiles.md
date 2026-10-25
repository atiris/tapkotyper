# Profiles

## What
- Several local profiles on one device, picked on the start screen (the character with the
  nickname large and, when a real name is set and differs, the real name small under it, so
  siblings recognize their own tile; "New player" is one more card with one to three profiles, a button beside "No profile" with more or when the card would add a row), plus a **No profile** button ("Try without a profile" before the first player): a guest that keeps nothing after the browser tab closes and that a reload never opens (it shows the start page); the
  guest is named in the game's language ("Hosť" / "Guest"). The super player, while on, is
  the last card, so it never shifts the order of the real players.
- The new player form is a window closed with the round X: "pick your character", the nine
  animals as a 3 x 3 grid, with beside it (below it on a narrow screen), in this order: the
  **nickname** (required, up to 16 characters; hint: shown with the character in the game),
  the **typist's name** (optional; hint: shown to the teacher in the results), the interface
  language, the word language and the keyboard layout. Without a nickname the form says so.
- A new player lands on the map, not in a level, so a parent can set things up first. Above
  the stories the narrator greets the typist once by nickname ("This is your character in
  this adventure."); with "Instructions for young typists" on it also says in a few lines what to
  do (Continue, keys come step by step, "?" helps); closing it or starting from
  it hides it for good. The intro story plays before the first level. A guest and the
  super player get no greeting.
- Profile data: nickname and character kind, an optional real name, a seed, custom
  messages, layout, interface language, word language, settings, progress, unlocked items,
  statistics.
- **Nickname vs real name**: the nickname is required and is how the game shows the player
  everywhere (start card, map greeting and welcome, encouragement lines, break, story scenes,
  results, wardrobe, the settings switcher, task, delete and move texts, QR code captions,
  export file name, import texts, the printed card). The real name is optional and only for
  the **teacher**: a result code carries it, or the nickname when it is empty, and the
  teacher's table shows what it receives. Older players without a nickname get one from their
  name.
- **Word language**: each player has a word language beside the interface language, so a
  Slovak typist can practise English words with a Slovak interface and the other way round
  ([words](../learning/words.md)). The start screen's language buttons change only the
  interface.
- The **seed** is a hash of the name (or of the nickname when there is no name) when the
  player is created; it deals the per-player character prices and accessories
  ([the character](../companion/tapko.md)). Renaming later changes nothing; a profile
  recreated with the same name gets the same deal.
- Export a profile (or all of them) to a `.json` file and import it on another device.
  Import validates the file and never silently overwrites (it asks: replace or keep both).
  A player can also move by link ([teacher-links.md](teacher-links.md)).
- Stored data has a version; older data is migrated on load.
- Every player has an address (`#/p/<id>`, plus `/wardrobe`, `/friends`, `/settings`), so a
  link or desktop shortcut opens that child's map directly; the browser's back and forward
  buttons move between screens. Leaving the whole app asks first while a player is active.
- **Super mode** for parents and testers: typing `supertapkotyper` fast (within 4 seconds,
  no field) on the start screen turns on a switch for the session and opens a temporary
  player with every world, level, key and accessory open. That player lives in memory only
  and never touches real players' statistics. The switch stays on when a stored player is
  picked on the start page; a reload or "Koniec super režimu" turns it off and drops the
  temporary player. While it is on, a red star in the top right corner (it never pushes the
  screen down) opens the **service menu**:
  - everywhere: end super mode; remove the settings password (only when one is set);
  - in a running level: pass it without a mistake, with 1 or with 2 random mistakes: the rest
    of the level plays by itself (one key about every 60 ms through the normal key path,
    waiting like a child for a target that cannot be typed yet) up to the results card,
    tagged "Simulácia"; the level's stars count for progression, nothing else of the run
    counts ([statistics](statistics.md)); the minimum play time of a level does not apply;
  - on a stored player's map: "Odomknúť úroveň..." lists the levels not passed yet; the one
    picked becomes playable: the earlier levels of its story without stars get one star, the
    earlier worlds of the story are done, the keys it and its story need are unlocked, its
    key statistics stay untouched.
- **The service marks are for good.** A level passed or opened by the service menu shows a
  red "!" on its map node; an account with any of them shows a red "!" by its name (start
  page card, map greeting, the parent's player switch, the statistics heading) and in
  the results its teacher receives ([teacher links](teacher-links.md)). No menu, setting,
  export or import removes them; the temporary super player never gets them.

## Why
- Families and classrooms share devices; export/import gives portability without accounts.
- The owner tests and services the game: passing levels by hand takes long, a child sometimes
  needs a level opened, and a forgotten settings password needs a quick way back. The marks
  keep such help honest: a parent or teacher always sees that progress was not typed.
- The nickname is short and fits next to the character; a real name is only needed by the
  teacher, and some players do not want to give it.
- Learners of a second language want its words without switching the whole interface.
- The first screen after creating a player is shared by the parent and the child: the parent
  may adjust settings, the child needs one clear way to start.
- Children should not have to pick themselves on the start screen every time, and a stray
  back button or shortcut should not throw them out of a level.
- Parents want to look at later worlds without playing through them or spoiling a child's
  progress; the typing speed keeps learners from finding it by accident.
