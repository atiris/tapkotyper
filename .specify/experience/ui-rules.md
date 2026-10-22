# Interface rules

## What
One set of rules for where things sit and how they behave, so every screen feels like the same game.

1. **Corner controls.** The global round buttons (help, fullscreen, sound, super star, in this
   order, right to left as they are today) sit in the top right corner at one fixed offset from the
   window edge on every screen. There are only two placements: the **standard** one (all screens,
   windows and the map) and the **compact play bar** (inside a level, where they join the bar of
   the play controls). A button never moves between two screens of the same kind.
2. **Leaving.** A page you navigated to (settings, teacher view, wardrobe, friends) closes with
   "Späť" at the top left. A window laid over a screen (dialogs, the progress panel, help, the
   new player form, level cards) closes with the round X at the top right, and with Escape. The
   only closing control at the bottom of a window is a normal action button (for example
   "Pokračovať"), never the one way out.
3. **Scrolling.** A window scrolls inside itself: its header (title, X, tabs) stays in sight and
   the scroller is the game's own (thick, orange thumb, kept inside the rounded corners). A page
   scrolls the whole page. The two are never mixed: a window never makes the page behind it
   scroll, and a page never hides its header in a scrolled box.
4. **Tabs.** Tabs look and behave the same everywhere (one component) and sit directly on
   top of the panel they switch, with no gap. A window with tabs is aligned to the top so
   that switching tabs changes only its lower edge, never its position.
5. **Position in the world.** In a level, the place inside the world is a ring beside the
   pause button, drawn like the rhythm ring: the ring fills by the levels done in the world, the
   number of the current level (1-5, a web for the big challenge) is inside. The world's name is
   the title; there are no dots under it.
6. **Play controls stay together.** Pause and the paw sit side by side at the start of the play
   bar; nothing from the bar is drawn over the play field.
7. **Tapko's lines in a level.** A tip or a line from Tapko appears in one fixed spot at the top
   left of the play field, slightly see-through, and never moves with Tapko's jumps. It never
   covers a word to type.
8. **Buttons.** The one main action of a view is the orange button ("primary"); everything
   else is plain or ghost. A view never has two orange buttons.
9. **Panels.** Content sits on paper-coloured panels of one maximum width with the same
   padding and heading style; the page background is the world's sky gradient.
10. **Switches.** A checkbox is always on the left; to its right the title in bold, and under
   the title a short explanation in normal, smaller text. A title is a name ("Automatická
   náročnosť"), not a sentence with a bracket. The same layout holds for every switch in
   the parent area, including the surprises form.

## Why
- A child learns where "sound" or "close" is once, and then it is there everywhere; buttons
  that jump by a few pixels between screens feel broken.
- Two ways of closing (a back arrow on pages, an X on windows) match how phones and computers
  already work; a third way at the bottom makes the child hunt for the exit.
- Scrolling inside a window keeps the title and the way out in sight, and a page that
  scrolls as a whole is what a browser user expects.
- The ring in the bar reuses a picture the child already reads (the rhythm ring), and frees the
  space under the title.
