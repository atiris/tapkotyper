# Story packs (long-term goal, not built)

Status: a goal. The app is being prepared for it (`.todo/92-story-pack-groundwork.md`); no pack
exists yet, not even a sample one.

## What

- A **story pack** is one file a parent imports: a whole new story with its worlds and levels,
  written by someone outside the project (a teacher, a parent, a fan). It is **data only**: it
  never brings code, it builds on the mechanics the game already has.
- One pack is **one story in one language**; the same story in another language is another pack.
- A pack says, for each level of each world, **which built-in level it starts from** (its kind and
  variant) and changes only what the game lets it change: named parameters of that mechanic, each
  within the game's own limits, switches the mechanic offers, the background bands and their
  offsets, the level's pictures and music, its words and sentences, its story texts and messages,
  new things for its worlds' target range.
- Its pictures and music come inside the pack (a `.zip`); any picture it leaves out is the built-in
  one or the drawn fallback, so a pack of texts and words alone is a full story.
- **Only a parent imports** a pack, behind the parent gate; the parent can also remove it and save
  it back to a file.
- A pack is **for every profile on the device** and stays there after closing, restarting and
  offline, until the parent removes it or the browser's data is cleared.
- On the map a pack's story is a **new row under the built-in stories**. A pack in another language
  than the profile's stays there, marked with its language: the child may speak it.
- A pack's levels still respect the child's keys: a level asks only for keys the child knows,
  and the words of the pack are used only when they fit those keys and the pack's keyboard layout.
- **Separate from the built-in game everywhere:** a pack's stars, badges, range finds and parrots
  are its own and are shown on their own tab; they never count in the built-in statistics, never buy
  a companion, never unlock a wardrobe accessory or a range prize. The start page only says how many
  more worlds are loaded and their names.
- **The parent's surprises work in pack stories too:** a surprise can wait for a pack's level, and
  play in a pack counts toward a surprise that waits for minutes, levels or stars.
- A newer version of a pack keeps the stars of the levels it still has.
- A profile moved to another device keeps its pack progress; until the pack is imported there too,
  the map says the story is missing.

## Why

- Teachers and parents want stories about their own topics (the class's reading book, a holiday,
  the school subject) without waiting for the project; the game's mechanics are already rich enough
  to carry them.
- Data only, never code: the players are children, their profiles and a teacher's results live on
  the same device, and the project promises no third-party scripts. A pack also cannot slow the game
  on a weak school computer or break the rhythm and minimum length of a level, because it only moves
  values inside limits the game sets.
- Separate rewards keep the built-in path fair and unchanged: a pack cannot be a shortcut to the
  wardrobe or the range prizes, and the built-in statistics still describe the built-in lessons.
- Surprises are the parent's own motivation, so they follow the child into any story.
- A new mechanic is not a pack: it comes to the project itself (the project is open source) and then
  every player gets it.
