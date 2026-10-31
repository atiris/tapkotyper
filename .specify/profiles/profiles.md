# Profiles

## What
- Several local profiles on one device, picked on the start screen (the character with the
  nickname only, never the real name, which belongs to the teacher, with room between the nickname and the counts).
  Before the first player the card says "Pick a nickname, choose your helper and start training." with one big
  **New typing student** button, and under it **Try it** and **Import profiles**; once there is a player, the cards
  and under them only **Try it** with **New player** to its right (importing moves to the settings, it is rare
  once someone plays). **Try it** is a guest that keeps nothing after the browser tab closes and that a reload never opens (it shows the start page); the
  guest is named in the game's language ("Hosť" / "Guest"). The super player, while on, is
  the last card, so it never shifts the order of the real players.
- The new player form has Back at the top left like every page, and closes with the round X too: "pick your character", the nine
  animals as a 3 x 3 grid, with beside it (below it on a narrow screen), in this order: the
  **nickname** (required, up to 16 characters; hint: shown with the character in the game),
  the **typist's name** (optional; hint: shown to the teacher in the results), the interface
  language, the word language and the keyboard layout. Without a nickname the form says so.
- A new player lands on the map, not in a level, so a parent can set things up first; the map
  greets by nickname in its side column and has no welcome card. The first level starts with
  the card before the first key ([finger guide](../learning/finger-guide.md)); where the
  fingers go is taught by the home-row card when F and J are learned. The form speaks to the
  child only: a note for the parent about the settings is no use to a child who reads it.
- Profile data: nickname and character kind, an optional real name, a seed, custom
  messages, layout, interface language, word language, settings, progress, unlocked items,
  statistics.
- **Nickname vs real name**: the nickname is required and is how the game shows the player
  everywhere (start card, map greeting, encouragement lines, break, story scenes,
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
- While the game is in alpha, stored data has no version and no migrations: missing fields
  get their defaults on load and broken parts are dropped.
- Every player has an address (`#/p/<id>`, plus `/wardrobe`, `/friends`, `/settings`), so a
  link or desktop shortcut opens that child's map directly; the browser's back and forward
  buttons move between screens. Leaving the whole app asks first while a player is active.
- **Super mode** for parents and testers: typing `supertapkotyper` fast (within 4 seconds,
  no field) on the start screen turns on a switch for the session and opens a temporary
  player with every world, level, key and accessory open, in a random outfit, and with the
  progress filled at random just as the fill dialog first offers it, so it looks like a
  real child's from the first moment. That player lives in memory only
  and never touches real players' statistics. The switch stays on when a stored player is
  picked on the start page; a reload or "Koniec super režimu" turns it off and drops the
  temporary player. While it is on, a red star in the top right corner (it never pushes the
  screen down) opens the **service menu**:
  - everywhere: end super mode;
  - on the temporary player's map: "Vyplniť postup..." opens a compact dialog in two columns
    on a wide screen, each field with one line on what it sets: the number of mastered keys,
    the last finished world, the shares of earned stars, accuracy (70-100 % in whole percents)
    and rare things found at the target ranges, and "Všetky papagáje" (unchecked, one finished
    world's parrot is missing). It opens on the player's keys and last world and a fresh random
    pick of the rest: stars 70-95 %, accuracy 90-100 %, range finds 40-100 %, all parrots or all
    but one. The keys and the finished worlds are set exactly; the stars, the range finds
    and each key's accuracy are spread at random over the finished worlds (every finished level
    keeps at least one star), so the map, badges and statistics look like a real child's;
    "Uletí papagáj" sends a random parrot at home away and "Priletí papagáj" brings home the
    parrot of a random finished world that misses it, so Aro's flights on the map can be seen
    without waiting for days.
- In a level, the temporary player has a **super help** button (a red lifebuoy) right of the
  paw help. Its menu starts the game typing like a real player at about 200 characters a
  minute: without a mistake, with 1 or 2 mistakes, with 1 mistake and 1 hesitation, or with 2
  mistakes and 2 hesitations. The slips are spread evenly over the level: the level is cut
  into one part more than there are slips, and a slip comes at each cut, in the listed order.
  A mistake is a random wrong key. A hesitation lets one word fly by unfinished; in a level
  where nothing flies by, it is skipped. Four more choices aim at an accuracy instead, about
  98 % and 97 % (3 stars), 92 % (2 stars) and 75 % (1 star), with wrong keys at random all
  through the level.
  Everything counts as the player's own typing:
  statistics, stars and paw charges. While it types, the button has a full red ring, like
  the other round buttons show their state; the same menu stops it. Only the temporary player has
  it, so a stored player's statistics are always typed by the child.
- Stored players' progress is never changed by the service menu: there is no simulated or
  opened level, so a parent or teacher always sees progress that was typed.
- A password removed or changed by the super player (whose settings ask for no password) is
  recorded with its time: the settings show it for a
  month ([parent controls](parent-controls.md)) and the results a teacher receives say so
  ([teacher links](teacher-links.md)).

## Why
- The owner tests levels, results and paw charges many times; the super help plays a level
  like a child with a known number of slips, so the results can be checked without typing
  every word by hand.
- Families and classrooms share devices; export/import gives portability without accounts.
- The owner tests and demonstrates the game: a temporary player with a chosen, realistic
  progress shows the map, badges and statistics at any stage without playing. A forgotten
  settings password needs a quick way back, and the record keeps that help visible to the
  parent and the teacher. Changing a real child's progress would make it dishonest, so the
  menu does not offer it.
- The nickname is short and fits next to the character; a real name is only needed by the
  teacher, and some players do not want to give it.
- Learners of a second language want its words without switching the whole interface.
- The first screen after creating a player is shared by the parent and the child: the parent
  may adjust settings, the child needs one clear way to start.
- Children should not have to pick themselves on the start screen every time, and a stray
  back button or shortcut should not throw them out of a level.
- Parents want to look at later worlds without playing through them or spoiling a child's
  progress; the typing speed keeps learners from finding it by accident.
