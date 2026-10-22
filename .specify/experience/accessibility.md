# Accessibility

## What
- Font choice: a default friendly font, a dyslexia-friendly option (Lexend, Atkinson
  Hyperlegible or OpenDyslexic, bundled, no external font service), and large text.
- Colorblind-safe finger colors with patterns or labels; a high contrast mode.
- Text written on a finger color (the finger name in statistics, the label of the next key) reaches WCAG AA
  contrast; a color too light or too mid-tone for it is darkened a little.
- A reduce motion option (and `prefers-reduced-motion` is respected).
- Fully playable with sound off; every sound cue has a visual counterpart.
- All menus are usable with the keyboard.
- Every top button is explained, drawn as it looks, on the [help page](help.md).
- **Reading aloud** (off by default, per profile): a round button left of the keyboard
  button in the level bar switches it. It reads only the targets, each when it becomes
  the one to type, with the browser's own voice of the profile language, a little slower
  than normal. Tapko's lines, cards and results are not read by the voice (screen readers
  still get them). Pause and leaving the level stop it. Without such a voice the button
  is not shown, nor in a dictation run, where the voice always says the targets.

## Why
- The voice helps a child who cannot read the word yet; encouragements spoken over the
  next word cover the task, so only the words to type are read.
- Children with dyslexia or color vision deficiency must not be excluded
  ([research](../../.research/features/accessibility.md)).
- Young and dyslexic readers type a word they hear more easily than one they must decode
  first ([research](../../.research/experience/read-aloud.md)).
