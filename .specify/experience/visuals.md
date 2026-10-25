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
- World backgrounds are being redrawn as hand-drawn Japanese anime background art, rich in
  detail: a small sky, the far scene without near objects, then a middle band and a low
  closest band. Each layer joins its own left and right edge exactly, so it repeats with no
  visible seam and no ghosting; a cross-fade at the joins showed doubled flowers and hills.
- Every background layer is generated from a standalone prompt: each world has a written style
  spec (palette, outline weight, light, ground line, what never appears) pasted into its far,
  mid and near prompts, so a strip needs no attached picture and still matches.
- Big, readable words on targets, with high contrast against the scene; practice words
  and their info line keep a minimum on-screen size in small windows.
- One button set everywhere: every round button is the same white circle with a ring, a colored
  disc and a white symbol in one of three colors: controls purple; what belongs to the round
  being played green (the paw with a ring of three charge segments and no badge, the place in
  the world, the rhythm with a ring that fills from calm to excellent, a key's accuracy, the
  target's hits next to the range's title); what calls for attention red (the super star at the
  far right, the update button). The wardrobe's time stays teal.
  The rhythm is a picture, not a button. The help page shows these same buttons.
- Orange buttons, chips and group headers carry the fox logo's dark outline color with a soft
  white shine, like its eyes: white on the orange is too faint to read (WCAG AA). Every raised
  button (orange or not) behaves like a key: on hover it rises and shows more edge over a wider,
  softer shadow, pressed it sinks into its base, which never moves; with reduced motion it does
  not move. Flat (outlined) buttons are only for tight places such as Back at the top left; a
  second choice beside the main one (Skip beside Next) is the same raised button, only not orange.
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
- Small laptop screens (1366 x 768, 1024 x 600) never scroll on the start screen (up to five
  players), the new-key card or the get-ready card: children use small screens, and a
  scrolling card hides the button they need. The new-key card has its heading above Tapko, the
  finger guide beside Tapko and Esc to skip. The get-ready card has the picture beside the text
  and always shows its button.
- **The start page** says what TapkoTyper is before anything else. From 900 px wide it has two
  columns: on the left the title **TapkoTyper**, the slogan on exactly two lines ("Desať prstov, /
  jedno veľké dobrodružstvo."), one sentence about the game and four short promises with green
  icons ("Bez reklám a účtov"; data stays on the device, which opens the help's about tab;
  the wardrobe and stars for effort; "Sledovateľný pokrok"). On the right the card
  "Kto sa dnes hrá?" with the logo face (the fox head of the browser tab icon, on dark its picture
  drawn for a dark background) half above its top edge. The card is the page's main panel: its
  player cards are large, with the character filling most of each, and narrow only as more
  players need the room (the title's column keeps about a third of the width). Narrower, one column: title, slogan, the card, then the text and the promises (the card
  comes before the text on small screens). The title is live text drawn like the logo: a
  dark-brown outline and soft gradients, orange "Tapko", green "Typer"; on dark a thin cream line
  outside the outline, never a glow.
- The card with no players: one line ("Stačí meno a vybrať si zvieratko."), the big orange
  "Nový hráč", then trying without a profile and loading profiles. With players: the player
  cards in a row (balanced rows from six, never one card alone), with the dashed "Nový hráč" card
  while there are one to three; from four it is a button beside the other two. No footer:
  "MIT · Atiris" (the code's licence and author) sits small and white at the bottom right of the
  meadow, never underlined: by day it brightens to full white on hover and focus; on the night
  meadow it is a little quieter and lights up yellow-white. The about and teacher ways in are round buttons at
  the top right, so they stay reachable with any number of players.
- A phone without a keyboard: the logo face above the title, the slogan, a short text, then the
  teachers' button as the main orange one and the keyboard button under it.
- **The start page's sky and meadow.** A repeating meadow strip along the bottom and a few sky
  pieces in the top left corner, never behind text: the sun and two clouds by day, the moon and
  three stars by night. Farther pieces are softer (blurred more). By day three butterflies (one of
  each kind) flutter up among the flower heads; now and then (about every half a minute) each
  flies a bit farther, turns round and comes back, by night a few fireflies glow there. Switching the theme
  plays a short sped-up night and day (about 2.5 s): the old light moves to the right along an arc
  and melts away on the way (fades, softens), high in the sky, never at an edge the page does not
  show, while the new one comes out of the air from the left along the same arc, stars and fireflies fade or sink into
  the grass, butterflies settle or fly up, and the sky and meadow cross-fade. The night meadow has
  the same plants with their flowers closed for the night (daisies and buttercups in buds, the
  dandelion without its seed ball, smaller than the open ones). The night meadow always lies under
  the day one: at dusk it is there first and the open flowers fade off it, at dawn the open
  flowers fade in over the buds and cover them, so the two never look doubled. The logo face and
  every text fade into the new look together with the surfaces, never in one jump. With reduced motion
  it is a short cross-fade and nothing moves. Only the start page has this scene.
- **Dark theme** ("dark enough, not black"): a deep violet night sky as the page background, dark
  violet paper for panels and cards, cream text. It follows the system's setting until the
  player picks one on the theme button, and then stays on this device. Everything around the
  game follows it: panels, cards, dialogs, tabs, tooltips, inputs, scrollbars, menus, charts, the
  keyboard guide, a level's top bar, cards and bars. The keyboard guide's hands are solid there
  (a see-through hand turns grey on dark), their resting fingers a dimmer skin. Pictures stay as drawn: the level
  backgrounds, the sprites and characters (their dark outlines work on dark). As the play field
  keeps its daylight pictures, a target's word label stays a light plate with dark letters. A
  wardrobe item sits on a light tile, so dark items (black glasses) stay visible. The certificate
  stays light, as it is printed. The meaning colors and the brand orange stay; a shade that is
  too dark for text on dark gets a lighter variant.
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
- The old start page was plain: it did not say what the game is, lost its logo on small screens,
  and its title did not look like the logo. A first visitor decides there whether to stay.
- Children and parents often play in the evening; a light page then glares. A short animated
  night and day makes the switch a small joy instead of a setting.
