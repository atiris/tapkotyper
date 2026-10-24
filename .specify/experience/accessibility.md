# Accessibility

## What
- Font choice: a default friendly font, a dyslexia-friendly option (Lexend, Atkinson
  Hyperlegible or OpenDyslexic, bundled, no external font service), and large text.
- **Easy to tell letters on the keys (l, I, 1)**, on by default: key caps, the big key of
  the new-key card and inline key marks use Atkinson Hyperlegible, which draws lowercase l,
  capital I and 1 differently; the rest of the game (words on the canvas included) keeps the
  chosen font. Lexend draws l and I alike, so on a key cap a learner could not tell which key
  is meant. The zero on the on-screen keyboard is always slashed, so the small 0 at a key's top
  is never taken for the letter O.
- Colorblind-safe finger colors with patterns or labels; a high contrast mode.
- **A dark theme** for every screen: every text reaches WCAG AA contrast on its background in
  dark as in light. It follows the system's setting until a choice is stored. The high contrast
  mode keeps its own black on white and wins over the theme.
- Text written on a finger color (the finger name in statistics, the label of the next key) reaches WCAG AA
  contrast; a color too light or too mid-tone for it is darkened a little.
- A reduce motion option (and `prefers-reduced-motion` is respected): the start page's sky then
  only cross-fades between day and night, and its pieces stay still.
- Fully playable with sound off; every sound cue has a visual counterpart.
- **The whole game by keyboard, no mouse needed.** From the start page through a level, its
  results and back to the map, every step goes on with Enter or the space bar: each screen,
  card and dialog focuses its main action and shows a clear focus ring; Tab and the arrow keys
  move between the choices (the map's levels, the players, the characters, the tabs). The
  get-ready card starts with the space bar or Enter, the results and the story scenes go on by
  both, and Escape goes back or pauses.
- **Picking a player by keyboard.** On "Who is playing today" each of the first nine players
  shows its number on a playfully tilted badge; the number keys 1-9 pick (by the key, so a
  Slovak keyboard's top row works without Shift). Hovering or focusing a card says so in its
  tooltip. Typing a nickname does not pick: it clashed with the super password, whose letters
  started picking players before the word was complete.
- **Function keys** wherever they make sense: F1 the help that fits the moment (in a level the
  help page for this level, on a screen its help tab), F2 the keyboard guide, F3 reading aloud,
  F4 the sound (normal, quiet, off), F8 the next song. F4 and F8 say the new sound level or song
  in a short note at the bottom. Each of these buttons' tooltips ends with its key ("Help (F1)").
  In a text field the keys type text, only F1 still opens help; the browser's own F-key actions
  (its help, search, reload of these keys) do not happen. The fullscreen button's tooltip names
  the browser's own fullscreen key ("Fullscreen (F11)").
- Every top button is explained, drawn as it looks, on the [help page](help.md).
- **Reading aloud** (off by default, per profile): a round button left of the keyboard
  button in the level bar switches it. It reads only the targets, each when it becomes
  the one to type, with the browser's own voice of the profile language, a little slower
  than normal. The narrator's lines, cards and results are not read by the voice (screen readers
  still get them). Pause and leaving the level stop it. Without such a voice the button
  is not shown, nor in a dictation run, where the voice always says the targets.

## Why
- Learners should keep their hands on the keyboard: reaching for the mouse breaks the home
  position the game teaches. Numbers and nicknames make picking a player as fast as typing,
  and the F-keys reach what is switched often; the tooltips teach them.
- The voice helps a child who cannot read the word yet; encouragements spoken over the
  next word cover the task, so only the words to type are read.
- Children with dyslexia or color vision deficiency must not be excluded
  ([research](../../.research/features/accessibility.md)).
- Young and dyslexic readers type a word they hear more easily than one they must decode
  first ([research](../../.research/experience/read-aloud.md)).
