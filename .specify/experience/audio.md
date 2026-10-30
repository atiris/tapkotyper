# Audio

## What
- Calm, simple looping background music per world and soft retro sound effects (key ok,
  gentle wrong, word done, reward, a soft cheer for a goal), all synthesized with the Web Audio API.
- Separate volume for music and effects (parent area); a quick sound button on every
  screen switches normal / quiet (20 % of normal) / off. The game starts with the sound off
  until the player turns it on (the choice is kept by the player and comes back when the player
  is picked; the start page keeps the last player's; a new player starts with what the device has); audio starts only after the
  first user interaction (on phones the first tap; see [devices.md](devices.md)). Off is real
  silence: nothing plays at all, not even at zero volume.
- A right click on the sound button plays another random track from the whole library; the
  next screen or level sets its own track again. The sound button's tooltip names the song
  playing now (its world's name, or menu, relaxing, break), unless the sound is off.

## Why
- Sound supports rhythm and reward; noisy or forced audio is a common classroom complaint.
  "Quiet" keeps the feedback in a shared room without going silent.
- Starting silent never surprises a class, a library or a sleeping house with sound.
- A phone shows a tab that plays sound even at zero volume, which looks like the switch does
  not work and keeps the audio output awake.
