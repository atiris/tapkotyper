# Words

## What
- Per language a lightweight JSON word list (about 6000 common, child-appropriate words and word forms),
  usable by key set and word length.
- The list comes from the player's **word language**, not the interface language: story
  levels use the player's word language, the custom exercise (free practice, "My text", key
  drills, practice tasks) its own word language, preset to the player's. Both lists can be
  loaded at once. Words with keys the player does not have yet are left out as always, so
  lessons and key unlocking do not change with the language.
- Slovak words keep correct diacritics; with "words without diacritics" on, only words
  without diacritics are used.
- Selection respects: active keys, word length range (for example 2-5), difficulty 1-10,
  and weak-key weighting.
- Fallback generator: when too few real words match, pronounceable pseudo-words are made
  from the allowed keys (alternating consonants and vowels, rhythmic syllables). With very
  small key sets (for example only `f j`), short letter patterns like `fff jjj fj jf` are
  used. Practice never stops for lack of words.
- Dictation is only what a voice says clearly: dictionary words, and single letters while the
  known letters make too few of them (a spoken "jjfjf" cannot be followed); no digits,
  capitals, apostrophes or punctuation, and no made-up words. Own words of a parent or a task
  join a dictation only when the dictionary has them as written; own text never does: a child
  cannot hear where a capital or a comma goes.
- No word may be offensive or scary; pseudo-words are checked against a small block list.
- The first level asks one chunk per target, never two with a space; the second level is the
  first that asks for the space bar.
- Once space is known, a target can be a phrase of known words: at most two (short words)
  for targets that fly, fall or approach, two to four in calm modes (own practice; the planet's
  stones and signposts set their own, see [story](../game/story.md)). Right after space comes in, phrases are chunk pairs like `fj jf`.
  Small targets (boulder chunks, moles, the take-off's sets) stay single words.
- Punctuation only once its key is known: a period ends about one phrase in three, a comma
  joins two parts in about one in five, `?` ends about one in eight, `!` `:` `-` are rarer.
  While a punctuation key is the newest one, it appears in about half of the targets.
- Capitals only at the start of a target: a child's name from a short list per language, or
  the first word. About one target in six at first, growing to every start as that Shift is
  mastered; while a Shift is the newest key, most targets start with a capital it serves.
- A target with a capital gets 1.5 s more time. On screen, a space shows as a light dot.
- **Own words and own text** from a parent (for example this week's spelling words, or a
  short story) are mixed into the targets of story levels and own practice by a share the
  parent picks: none, a quarter, half or most. Own words come as typed (capitals too) and
  are used even with keys the child has not unlocked yet; the guide shows those keys. A word
  with a character the keyboard cannot type at all is left out, and characters of the text
  that cannot be typed are dropped; the editor lists both.
- Own text is split by sentences and commas and comes in reading order, cut to the size
  of the target (short pieces for moving targets). own practice has a "My text" choice
  that types the whole text in order, piece by piece, without random words, and then ends.

## Why
- Real words are more motivating; the generator guarantees practice with any key set.
- Phrases with punctuation and capitals are the step from words to real text; keeping
  moving targets short keeps the game calm, and capitals stay rare until the Shift is easy
  ([research](../../.research/learning/space-punctuation-capitals.md)).
- Parents and teachers most want the child's own school words and texts in the game; the
  teacher decides, so unknown keys do not block them
  ([research](../../.research/learning/own-word-lists.md)).
