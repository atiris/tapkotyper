# Audio

## What
- Calm, simple looping background music per world and soft retro sound effects (key ok,
  gentle wrong, word done, reward, a soft cheer for a goal), all synthesized with the Web Audio API.
- Separate volume for music and effects (parent area); a quick sound button on every
  screen opens a list like the language list: **Zvuky** (normal), **Tiché zvuky** (20 % of normal),
  **Len kde je to dôležité** and **Bez zvukov** (off); F4 steps through all four. Each has its sign on
  the button; "only where it matters" is the sound sign with a small "!" badge, and its tooltip says
  that sound plays only in Rytmus and in dictation. That level is silent like off everywhere, except
  while a [Rytmus](../game/rhythm.md) round or a level with dictated words runs: there it plays like
  normal. The game starts with the sound off
  until the player turns it on (the choice is kept by the player and comes back when the player
  is picked; the start page keeps the last player's; a new player starts with what the device has); audio starts only after the
  first user interaction (on phones the first tap; see [devices.md](devices.md)). Off is real
  silence: nothing plays at all, not even at zero volume; so is "only where it matters" outside those levels.
- A right click on the sound button plays another random track from the whole library; the
  next screen or level sets its own track again. The sound button's tooltip names the song
  playing now (its world's name, or menu, relaxing, break), unless the sound is off.

## Why
- Sound supports rhythm and reward; noisy or forced audio is a common classroom complaint.
  "Quiet" keeps the feedback in a shared room without going silent. "Only where it matters" keeps
  the page silent but still plays the sound that a game needs: Rytmus is played to its music, a
  dictation is heard. Four levels are too many to guess by clicking round, so the button shows them in a list.
- Starting silent never surprises a class, a library or a sleeping house with sound.
- A phone shows a tab that plays sound even at zero volume, which looks like the switch does
  not work and keeps the audio output awake.
