# 47 One animated tooltip, lock hints, sticky top bar, help like settings, install later

Runs **after plan 46** (done). Plan 49 builds on the tooltip from this plan.

Affected: new `src/ui/tooltip.ts` (+ test), `src/ui/{dom,hud,chrome,menu,badge,charts,install}.ts`,
`src/screens/{wardrobe,map,stats,parent,help,start}.ts`, `src/game/runtime.ts` (HUD titles),
`src/app/app.ts` (`go`, help return), `src/main.ts` (tooltip install, parent route),
`src/styles.css`, `public/i18n/{sk,en}.json`, `e2e/{help,styles,wardrobe,parent,layout}.spec.ts`
+ new `e2e/tooltip.spec.ts`, `.specify/experience/{ui-rules,help,offline}.md`,
`.specify/companion/wardrobe.md`.
Contracts: localStorage `tapkotyper:install` changes shape (read the old one, see Decisions).
No profile schema change, no server, no DB.

## What
1. **Character tiles in the wardrobe** show the character's name (e.g. "Levík") in place of
   "ešte 62 ★". A locked character's name and picture are paler. A name never wraps onto two
   lines.
2. **One tooltip for the whole app.** It is a new page element that replaces every native
   `title`. It appears after a short hover (or keyboard focus). After one tooltip has been
   seen, the next ones appear at once for a short while. It moves in with a soft fade and
   scale, sits above the element (or below when there is no room), never leaves the screen,
   and hides on leave, blur, scroll, click and Esc.
3. **Locks explain themselves.** Hover or focus on any lock shows what is missing:
   - A character: "Ešte 62 ★ a Levík je tvoj" (stars from `friendStars - totalStars`).
   - A world island: its existing lock reason (`map.lockWorld` / `map.lockKeys`).
   - A wardrobe item: its unlock rule (`howTo`).
4. **Badges say what they are for.** The tooltip says which world the badge is for and what
   the current tier means. When the badge is not gold, it also says what gold needs, e.g.
   "Zlatý odznak: všetkých 15 ★ v tomto svete (máš 12)". A locked badge says how to earn it.
5. **The top bar stays at the top** while the page scrolls (wardrobe, settings, help, stats,
   teacher, task, every `.screen > .bar`), so the back button is always visible.
6. **Help looks like settings.** Back button at the top left, the same title style as
   settings, and the same sticky bar. The text stays in a narrower column (about 760 px) on
   wide screens. The whole page scrolls like the other pages.
7. **Help opens where you are.** From settings it opens on the **Nastavenia** tab, and Back
   returns to settings without asking the parent question again. From the map it opens on
   the default tab, and Back returns to the map.
8. **Help highlights the key points** in bold: a few per tab (one or two per section, about
   12 in all), never whole sentences.
9. **Install offer later.** The offer comes only once the app has been opened on three
   different days (never on the first day). New text:
   - sk: "TapkoTyper si môžeš nainštalovať ako webovú aplikáciu. Je to takmer okamžité, na
     ploche budeš mať ikonu na rýchle spustenie. TapkoTyper sa ti otvorí vo vlastnom okne a
     bude spoľahlivo fungovať aj bez internetu. Nemusíš spúšťať celý prehliadač, keď chceš
     chvíľu písať."
   - en: "You can install TapkoTyper as a web app. It takes a moment, and you get an icon on
     your desktop to start it quickly. TapkoTyper opens in its own window and works reliably
     without the internet. No need to start the whole browser when you want to type for a
     while."
10. **The parent question always appears.** "Áno, otvoriť" was once missing on the first way
    into settings, and only a reload helped. Settings must never be left as a blank page.

## Why
- "ešte 62 ★" wraps and hides who the character is; the name makes the goal concrete.
- Native titles are slow, unstyled, missing on touch and keyboard, and look foreign in a
  children's game. One component gives one look and room for shortcuts (plan 49).
- A child who sees a lock wants to know what to do, not just that it is closed.
- Scrolling long settings or help pages loses the way back.
- Help was the only page with a different frame (close X on the right, inner scrolling).
- Plain help text without any emphasis is hard to scan.
- Asking to install on the first visit is too early; after three days the app has proven
  itself.
- A blank settings page with no way on is a dead end.

## Decisions
- **Tooltip module** (`src/ui/tooltip.ts`): `installTooltips()` called once from `main.ts`.
  - One `div.tip` with `role="tooltip"` and an id, appended to `body`. The tooltip text
    comes from `data-tip` on the element. `aria-describedby` is set only while it shows.
    `aria-label` stays where it is today (round buttons keep their labels).
  - Delegated `pointerover`/`pointerout`, `focusin`/`focusout` on `document`. The target is
    the closest `[data-tip]`. Keyboard focus counts only with `:focus-visible`.
  - Timing: `SHOW_DELAY = 450` ms. After a tooltip hides, a `WARM_MS = 800` ms window lets
    the next one show without the delay. `HIDE_DELAY = 80` ms, so moving between
    neighbours does not flicker. Touch: a long press of 500 ms shows it, and it hides on
    the next touch. A plain tap never shows it.
  - Placement: 8 px above the element, centered. Flip below when there is not enough room.
    Clamp horizontally with an 8 px margin. `max-width: 280px`, wraps.
  - Animation: opacity 0 -> 1 and `scale(0.96) -> 1` with `translateY(4px) -> 0` in 140 ms
    ease-out. With `prefers-reduced-motion`, opacity only. It hides on scroll, `pointerdown`,
    Esc and when the element leaves the DOM (checked on show and on each `go()`).
  - Style: dark ink background (`var(--ink)`), white text, 0.9rem, 10 px radius, a small
    arrow, and `z-index` above modals.
  - API: `tip(el, text)` sets `data-tip` and updates a showing tooltip live (the rhythm and
    the paw change their text while shown). `h()` gets a `tip` prop that maps to it.
  - Every `title` in `src` moves to `data-tip`. That includes `roundButton`, `levelRing`,
    `rhythmPic.label`, chrome, menu, badge, stats, wardrobe, map, parent and runtime.
  - The SVG `<title>` elements in `charts.ts` become `data-tip` on the circle or rect.
  - Confirm-dialog `title:` options are headings, not tooltips; leave them.
  - A unit test checks the timing state machine: delay, warm window, hide.
  - `e2e/tooltip.spec.ts` checks:
    - hover shows the tip after the delay and not before;
    - a second button right after shows at once;
    - focus with Tab shows it;
    - Esc hides it;
    - no element in the app still has a `title` attribute (scan a few screens).
- **Character tiles** (`wardrobe.ts`, `styles.css`): the span shows `t('kinds.<k>')` always.
  - `.kind.locked` gets `opacity: 0.55` on the picture and `color: var(--ink-soft)` on the
    name.
  - `.kind span` gets `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    max-width: 100%`.
  - The lock icon gets `data-tip` with the new key `wardrobe.kindNeed` ("Ešte {n} ★ a {name}
    je tvoj" / "{n} more ★ and {name} is yours"). The whole tile carries the same tip. The
    `aria-label` keeps name plus missing stars.
  - `wardrobe.kindLocked` goes away.
- **Island and item locks:** `data-tip` on the lock icon and its tile, with the same text
  that `lockBubble` and `howTo` already produce. `lockBubble` on click stays.
- **Badges** (`badge.ts`, rule from `rewards.ts` `badgeTier`, `BADGE_SILVER`, `BADGE_GOLD`):
  - New keys `badge.tip.<tier>`, for example "Odznak za svet {world}: {tier}.".
  - `badge.tip.gold`, for example "Zlatý odznak: všetkých {gold} ★ v tomto svete (máš {have}).".
  - `badge.tip.locked`, for example "Prejdi svet {world} a získaš odznak.".
  - Add the gold line whenever the tier is not gold. The world's stars come from that
    world's levels in `p.progress.levels`.
- **Sticky bar:** in `styles.css`, `.screen > .bar` gets `position: sticky; top: 0;
  z-index: 3`. Its background is the page paper color at 0.92 alpha, with `backdrop-filter:
  blur(6px)`, and keeps its present padding.
  - The corner controls stay `position: fixed`. Their vertical center lines up with the bar
    at every width from plan 46.
  - Help leaves `height: 100vh` and the inner `overflow-y: auto`. The whole page scrolls by
    `window` like the others.
- **Help frame** (`help.ts`): `header.bar` built like the settings bar: `button(t('common.
  back'), onBack, 'btn ghost small', 'back')`, then `h1`. The close X goes away; Esc still
  goes back.
  - The tab bar and `.tab-panel.prose` sit in a wrapper with `max-width: 760px; margin: 0
    auto`. The bar itself spans like the settings bar.
- **Help return** (`app.ts`): `go('help', { tab })` remembers the screen and params it was
  called from in an in-memory `app.helpReturn` (not in the URL).
  - The help button (`chrome.ts` `helpButton`, menu) picks the tab from the current screen:
    `parent` -> `settings`, `stats` -> `progress`, everything else -> the default.
  - Back goes to `app.helpReturn` (with `granted: true` for `parent`, which skips the
    question only because the gate was already passed in this visit), else map or start as
    today.
  - A help address opened directly (no `helpReturn`) behaves as today.
- **Bold in help:** help texts in the json may mark a phrase as `**phrase**`.
  - `help.ts` renders text through a small `richText(text)` that splits on `**` and builds
    `<strong>` nodes. It never uses `innerHTML`.
  - Mark about 12 phrases in sk and the same phrases in en. Good targets: the home keys F
    and J; that Esc pauses; stars come from accuracy and rhythm; the paw; that the parent
    lock protects settings; that results go to the mentor as a code; that progress stays on
    this device.
  - A vitest check makes sure every `**` pair is closed in both languages.
- **Install** (`install.ts`): the `tapkotyper:install` value becomes `{ days: string[],
  offered: boolean }`.
  - `days` holds the distinct local dates (`YYYY-MM-DD`) on which the app was opened, at
    most 3 kept.
  - `noteVisit()` adds today if it is missing. An old value `{ firstSeen, offered }` becomes
    `{ days: [date(firstSeen)], offered }`.
  - The offer shows when `days.length >= 3` together with the existing conditions (event
    captured, not standalone, not offered). The 3-day window from the first visit is
    dropped.
  - Unit test for the day counting and the old-value read.
  - Texts `install.text` (above). `install.title` and the buttons stay.
- **Parent question**:
  - Reproduce first with the playwright MCP on a cold load (cleared cache, network throttled
    so the `parent` chunk loads slowly). Try a single click, a double click and Enter on the
    focused gear, and note what happened.
  - Then make these fixes, whether or not it reproduces:
    - The route function runs the gate **before** the dynamic `import('./screens/parent')`,
      so the dialog never waits for the chunk. The chunk is prefetched while the dialog is
      open.
    - `#app` shows the existing loading look rather than nothing while the chunk loads.
    - A second `go('parent')` while the gate is open is ignored. Today it deletes the
      dialog and leaves the first promise hanging.
    - `go()` removing a `.modal-back` resolves that modal's dialog as cancelled, so no
      promise is ever left hanging (`dom.ts` `modal` registers its resolver on the element).
  - `e2e/parent.spec.ts`: delay the parent chunk route by 1.5 s, double-click the gear, and
    check the dialog shows once and "Áno, otvoriť" opens settings.
- Specs:
  - `ui-rules.md`: the tooltip (timing, placement, no native title, shortcut line from plan
    49) and the sticky bar.
  - `help.md`: frame, return, tab by origin, bold rule.
  - `offline.md` or the install section: three days.
  - `wardrobe.md`: names on tiles, lock tips.

## Steps
- [ ] Tooltip module with unit test, `h()` `tip` prop, CSS, install in `main.ts`.
- [ ] Replace every `title` (and chart `<title>`) with tips; `e2e/tooltip.spec.ts`.
- [ ] Character tiles with names, pale locked look, no wrap; lock tips on characters, islands
      and items; badge tips with the gold rule; i18n sk + en.
- [ ] Sticky `.screen > .bar`; help frame, narrow column, page scrolling, help return and tab
      by origin; bold markers and `richText` with the vitest check.
- [ ] Install day counting with unit test and the new text.
- [ ] Parent question: reproduce with the MCP, gate before import, loading look, re-entry
      guard, dialogs resolved on removal; e2e with the slow chunk.
- [ ] Specs as listed.
- [ ] `npm run build`, `npm test`, `npx playwright test` pass.
- [ ] Drive the app with the playwright MCP at 1280 x 800 and 390 x 844:
  - Hover a round button and see the tip only after the delay; move to the next one and see
    it at once.
  - Wardrobe: names on all tiles, nothing on two lines, the lock tip on Levík with the star
    count.
  - Map: lock tip on a closed island; badge tips with the gold line.
  - Scroll settings, wardrobe and help, and see the bar stay with Back.
  - Open help from settings: the Nastavenia tab; Back returns to settings with no question.
  - Bold phrases readable in help.
  - Cold load into settings shows the question.
  - Console clean.
