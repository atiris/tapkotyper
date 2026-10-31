# Interface rules

## What
One set of rules for where things sit and how they behave, so every screen feels like the same game.

1. **Corner controls.** The global round buttons (the red super star, the red update button
   while a new version waits, help, fullscreen, sound, in this order, right to left) sit in the top right corner at one fixed offset from the
   window edge on every screen. There are only two placements: the **standard** one (all screens,
   windows and the map) and the **compact play bar** (inside a level, where they join the bar of
   the play controls). A button never moves between two screens of the same kind.
   Every screen with the standard placement also has the **theme** button (purple, controls)
   just before help: a moon in light, a sun in dark; it is not in a level's play bar. The start
   page adds the **language** button first in its row: the international language symbol, which
   opens a short list of the languages by their own names, the current one marked (arrows move,
   Enter picks, Escape or a click outside closes); a player's language is in the settings.
   **By width** (every screen but a level): from 600 px all buttons in the row; below 600 px one
   round **Menu** button opens a panel with each button as its round picture and its label (a
   screen's own buttons too, the language as an item that opens the same list). The panel closes
   with Escape, a click outside or after an action. The red super star opens its own service
   menu panel of the same look and keys, under the star (or under the Menu it is folded in).
   The start page's title **TapkoTyper** always fits on one line under the buttons, from 320 px up.
2. **Leaving.** A page you navigated to (settings, help, teacher view, wardrobe) closes with
   "Späť" at the top left, also the help page in a paused level. A level that is not paused but
   left (just typing, the custom exercise) has the round X at the start of its play bar; in the
   custom exercise it ends it and shows the results. A window laid over a screen (dialogs, the progress panel, the
   new player form, level cards and the pause card) closes with the round X at the top right, and with Escape; a results card's X and
   Escape hide it to show the game under it, and Escape or a click into the game brings it back. The X's
   tip says what closing does, so a card needs no "Esc: ..." line. Escape always closes the window
   on top, else pauses a running level or resumes a paused one (free typing and the endless
   custom exercise end instead; a paused run that is already done offers the next level or the end first). The
   only closing control at the bottom of a window is a normal action button (for example
   "Pokračovať"), never the one way out.
3. **Scrolling.** A window scrolls inside itself: its header (title, X, tabs) stays in sight and
   the scroller is the game's own (thick, orange thumb, kept inside the rounded corners). A page
   scrolls the whole page. The page never shifts sideways when its scrollbar appears: the
   scrollbar's room is always kept, and the page's own background shows through it, so the empty
   room is not seen. The two are never mixed: a window never makes the page behind it
   scroll, and a page never hides its header in a scrolled box. A page's top bar (Back and
   the title) stays at the top while the page scrolls, its row level with the corner controls;
   every page (help also inside a level) paints the page's own background there, never a band, so
   the bar looks like part of the page and the text fades out just below it. Once a page's
   tab row has scrolled away, its bar lists the tabs after the title as links separated by dots
   ("Title · Tab · Tab", the open one in orange), only on a desktop wide enough for all of them;
   a link opens its tab at the top of the page.
4. **Tabs.** Tabs look and behave the same everywhere (one component) and sit directly on
   top of the panel they switch, with no gap. A window with tabs is aligned to the top so
   that switching tabs changes only its lower edge, never its position.
5. **Position in the world.** In a level, the place inside the world is a ring beside the
   pause button, drawn like the rhythm ring: the ring fills up to the current level (the third
   of five fills three pieces, the last one, the big challenge, all five), the number of the
   current level (1-5) is inside. The world's name is
   the title; there are no dots under it.
6. **Play controls stay together.** Pause and the paw sit side by side at the start of the play
   bar; nothing from the bar is drawn over the play field.
7. **The narrator's lines in a level.** A tip or a narrator line appears in one fixed spot at the top
   left of the play field, slightly see-through, and never moves with the character's jumps. It never
   covers a word to type.
8. **Buttons.** The one main action of a view is the orange button ("primary"); everything
   else is plain or ghost. A view never has two orange buttons. Every button looks pressable
   (a raised key that lifts and sinks); a ghost one is only lighter, never flat. A plain button
   carries the keys' thin outline, so a pale face stays visible on a pale card.
9. **Panels.** Content sits on paper-coloured panels of one maximum width with the same
   padding and heading style; the page background is the world's sky gradient. A card or window
   laid over the blurred game or page is lifted off it by a clear shadow, never flat on it.
10. **Switches.** A checkbox is always on the left; to its right the title in bold, and under
   the title a short explanation in normal, smaller text. A title is a name ("Automatická
   náročnosť"), not a sentence with a bracket. The same layout holds for every switch in
   the parent area, including the surprises form.
11. **Tooltips.** One tooltip for the whole game replaces the browser's native one. It appears
   after a short hover (about half a second) or on keyboard focus; right after one was seen
   the next shows at once. It fades and grows in softly (only fades with reduced motion), sits
   above its element (below without room), never leaves the window, and hides on leaving,
   scroll, click and Escape. On touch a long press shows it; a tap never does. Every lock
   says in its tooltip what is still missing, and a badge says its world, what its tier means
   and what the next tier needs (silver for bronze, gold for silver). The sound button names
   the sound level with F4 and, on a second line, that F8 plays another song.
12. **One end card.** Every end of play (any level, practice, activity, break or hand-in,
   including ones added later) uses the one end card of [mechanics](../game/mechanics.md): the
   same parts in the same places, its own title, picture and rows. No end gets its own layout.
- No decorative bursts (confetti, sparkles, flying petals or feathers) for success or at an
  end. Particles only show what happens in the scene: dust of a crumbling stone, splashes of a
  pushed log, sparks of a torch, leaves of a bush, what a thing at the target range is
  made of.

## Why
- A child learns where "sound" or "close" is once, and then it is there everywhere; buttons
  that jump by a few pixels between screens feel broken.
- Two ways of closing (a back arrow on pages, an X on windows) match how phones and computers
  already work; a third way at the bottom makes the child hunt for the exit.
- Scrolling inside a window keeps the title and the way out in sight, and a page that
  scrolls as a whole is what a browser user expects.
- The ring in the bar reuses a picture the child already reads (the rhythm ring), and frees the
  space under the title. It is one of the bar's round buttons and looks exactly like them.
- Native titles are slow, unstyled, missing on touch and keyboard, and look foreign in a
  children's game; one tooltip gives one look. A bar that stays keeps the way back in sight.
- Five round buttons and a language switch do not fit beside a title on a phone; folding them
  into one Menu keeps every control one tap away and the title whole.
- A language switch with two letter chips does not grow past two languages; one button with the
  common language symbol and a list of native names does, and a visitor who reads neither
  language still finds it.
- Bursts of confetti pull the eyes off the words and make a calm game loud; the joy is in
  the scene itself and in Tapko.
- One end card means a child finds the result, the news and the way on in the same place after
  every kind of play, and a new activity cannot drift into its own crowded layout.
