# Interface rules

## What
One set of rules for where things sit and how they behave, so every screen feels like the same game.

1. **Corner controls.** The global round buttons (the red update button while a new version
   waits, help, fullscreen, sound, super star, in this order, right to left) sit in the top right corner at one fixed offset from the
   window edge on every screen. There are only two placements: the **standard** one (all screens,
   windows and the map) and the **compact play bar** (inside a level, where they join the bar of
   the play controls). A button never moves between two screens of the same kind.
   **By width** (every screen but a level): from 900 px all buttons and the SK/EN switch;
   from 600 px to 899 px the language becomes one round button showing SK or EN (a click goes
   to the next language); below 600 px one round **Menu** button opens a panel with each
   button as its round picture and its label (a screen's own buttons too). The panel closes
   with Escape, a click outside or after an action. The start page's title **TapkoTyper**
   always fits on one line under the buttons, from 320 px up.
2. **Leaving.** A page you navigated to (settings, help, teacher view, wardrobe, friends) closes with
   "Späť" at the top left, also the help page in a paused level and the custom exercise (where Back
   ends it and shows the results). A window laid over a screen (dialogs, the progress panel, the
   new player form, level cards) closes with the round X at the top right, and with Escape. The
   only closing control at the bottom of a window is a normal action button (for example
   "Pokračovať"), never the one way out.
3. **Scrolling.** A window scrolls inside itself: its header (title, X, tabs) stays in sight and
   the scroller is the game's own (thick, orange thumb, kept inside the rounded corners). A page
   scrolls the whole page. The page never shifts sideways when its scrollbar appears: the
   scrollbar's room is always kept, and the page's own background shows through it, so the empty
   room is not seen. The two are never mixed: a window never makes the page behind it
   scroll, and a page never hides its header in a scrolled box. A page's top bar (Back and
   the title) stays at the top while the page scrolls, on a slightly see-through paper band,
   its row level with the corner controls; help, the settings, the mentors' page and the wardrobe paint the
   page's own background there instead, so the bar looks like part of the page. Once a page's
   tab row has scrolled away, its bar lists the tabs after the title as links separated by dots
   ("Title · Tab · Tab", the open one in orange), only on a desktop wide enough for all of them;
   a link opens its tab at the top of the page.
4. **Tabs.** Tabs look and behave the same everywhere (one component) and sit directly on
   top of the panel they switch, with no gap. A window with tabs is aligned to the top so
   that switching tabs changes only its lower edge, never its position.
5. **Position in the world.** In a level, the place inside the world is a ring beside the
   pause button, drawn like the rhythm ring: the ring fills by the levels done in the world, the
   number of the current level (1-5, a web for the big challenge) is inside. The world's name is
   the title; there are no dots under it.
6. **Play controls stay together.** Pause and the paw sit side by side at the start of the play
   bar; nothing from the bar is drawn over the play field.
7. **The narrator's lines in a level.** A tip or a narrator line appears in one fixed spot at the top
   left of the play field, slightly see-through, and never moves with the character's jumps. It never
   covers a word to type.
8. **Buttons.** The one main action of a view is the orange button ("primary"); everything
   else is plain or ghost. A view never has two orange buttons.
9. **Panels.** Content sits on paper-coloured panels of one maximum width with the same
   padding and heading style; the page background is the world's sky gradient.
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
