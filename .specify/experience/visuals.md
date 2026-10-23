# Visuals

## What
- A polished, friendly 2D look: soft shapes, rounded outlines, a warm palette, parallax
  backgrounds, smooth easing animations (bounce, squash and stretch, floating).
- Storybook-style illustrated sprites and 3-layer parallax backgrounds (generated, see
  [architecture](../architecture.md)), with procedural drawings as fallback; each world
  has its own palette and mood. Motion (bob, squash, jump, fly-away) is animated in code
  and stays smooth on any screen refresh rate; layer edges are clean (no key color fringe).
- Living creatures show joy the way a child does: they hop, wave or tilt a little. They never
  shrink, grow or spin to be happy, which looks like pain or an object; balls, leaves, stars
  and sparks may spin.
- Background skies repeat across wide screens, so they are even (clouds or a gradient,
  no sun, moon or single planet). The ground layers in front are close-up strips placed
  along the bottom of the screen at a set height per world.
- Every background layer is generated from a standalone prompt: each world has a written style
  spec (palette, outline weight, light, ground line, what never appears) pasted into its far,
  mid and near prompts, so a strip needs no attached picture and still matches.
- Big, readable words on targets, with high contrast against the scene; practice words
  and their info line keep a minimum on-screen size in small windows.
- One button set everywhere: every round button is the same white circle with a ring, a colored
  disc and a white symbol (controls purple, paw orange with a ring of three charge segments and
  no badge, rhythm green with a ring that fills from calm to excellent, the super star gold).
  The rhythm is a picture, not a button. The help page shows these same buttons.
- The level's top bar, left to right: pause, paw, title block, progress bar, rhythm, a divider,
  help, keyboard, read aloud, sound, fullscreen. The title block is the world's name as a word
  with one dot per level (done, this one, to come, a web for the super obstacle); no level
  numbers anywhere, a level is named "Meadow · level 3".
- The hands are the soft-palm kind: rounded fingers with the finger-color band, idle ones faint.
- The map: a slim top bar ("Players" on the left; settings, sound and fullscreen as round
  buttons on the right). The left column holds the greeting, the companion (opens the
  statistics) and the buttons, all of one height; the first and biggest one just says
  "Continue" and names the level it starts only on hover. The right column holds the
  stories. One spacing scale and a clear heading order (greeting, story name, world names).
- The world cards of a story stay in one row while the window is at least about 1000 px
  wide (they shrink with the space, the side column narrows below 1300 px); in a narrower
  window they go three and two.
- Small laptop screens (1366 x 768, 1024 x 600) never scroll on the start screen, the new-key
  card or the get-ready card: children use small screens, and a scrolling card hides the
  button they need. The start screen has the logo beside the title (the fox head of the browser tab icon and the installed app's icon, drawn with thinner lines for its larger size), up to five profile cards
  per row (more wrap in balanced rows, never one card alone), and the about and teacher
  buttons among the round buttons at the top right so they stay reachable with any number
  of profiles. The new-key card has its heading above Tapko, the finger guide beside Tapko and
  Esc to skip. The get-ready card has the picture beside the text and always shows its button.
- In a level Tapko stands at the bottom left, or the scene draws him itself: walking as
  the hero, or seated in its vehicle (the rocket's window). His shouts and bubble then point
  to where he is.
- The super star (super mode) and the wardrobe's star count are normal members of the layout: the star sits in the top row before the sound button on every screen; the wardrobe's count sits under the animal picture.
- The results card's three buttons (next level, replay, map) share one style; only the next level is accented.
- Back buttons in top bars have the same height as the round buttons beside them.
- Fullscreen: a round button on the map and in levels; a parent can set a profile to
  start in fullscreen (browsers allow it only after the first key press or click).
- Responsive layout for laptop and desktop screens; wide screens use the space (wardrobe
  in two columns, dashboard charts side by side). A physical keyboard is required;
  tablets without a keyboard get a friendly notice.

## Why
- Children judge quality visually; a calm, cute style supports the peaceful philosophy.
- A map that repeats itself or wastes its top area hides what matters: where to go next.
- Cards that wrap into two rows on a common laptop break the story's path into pieces.
- A Tapko standing on nothing below his own flying rocket did not read as one story.
- Mixed shapes in the top bar looked untidy; fullscreen hides the browser's distractions.
- A sun in a repeating sky showed twice on wide screens. The image generator cannot keep
  a picture to the bottom part of an image, but draws a full close-up strip well.
- A strip whose ground filled most of the picture showed an empty plane behind its objects;
  objects standing on a low ground band with nothing behind them read as a real foreground.
