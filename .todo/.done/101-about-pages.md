# 101 - About pages per language and the name Ťapko

## What and why

The game is one page with hash routes, so search engines index only `https://tapkotyper.com/`,
and they see very little text there. Two problems follow (owner, 2026-11-02):
- **Nobody finds the game as "Ťapko"**: the head names only "TapkoTyper", the character is
  written "Tapko" without the caron, and the word "Ťapko" lives only in texts that the game
  renders with JavaScript.
- **The start page has little text** for a search engine, and putting more text there would
  break its design. Hidden text is not an option (see `.specify/experience/discoverability.md`).

The fix: short, real static pages with basic information, one per language, at
`/about/sk/` and `/about/en/`. They are crawlable HTML without JavaScript, linked from the start
page and from each other, and listed in the sitemap. The game, its boot, its hash routing, its
offline mode and the installed web app stay as they are.

Decisions taken:
- **Shorter, not the whole help**: the pages hold what a parent or teacher needs to decide.
  Icons and settings stay in the in-game help.
- **One source of text**: the pages are generated at build time from `public/i18n/<lang>.json`,
  using keys the game already has, so they never drift from the in-game help. One page per
  official dictionary file (today `sk` and `en`); a new official language gets its page for free.
- **The root `/` stays the game.** The link on the start page opens the about page in the
  game's current language (which follows the browser language until the player picks one).
  `/about/` with no language is a tiny page that sends the visitor to the language of the
  browser (`navigator.languages`, same rule as `detectLanguage`, falling back to `en`). It shows
  both links for people without JavaScript and is `noindex, follow`.
- **hreflang** is used between the about pages (`sk`, `en`, `x-default` -> `/about/en/`). The
  root keeps no hreflang (one URL serves both languages).
- **Start page change is minimal**: the bottom-right signature becomes
  `<Základné informácie> · MIT · Atiris`. The new link comes first, both links stay in the same
  small style, and the about link opens in the same tab. In the installed web app the link is
  not shown (owner, 2026-11-02). The key fact "free" joins the existing
  promise: `start.promises.ads` becomes "Zadarmo, bez reklám a účtov" / "Free, no ads, no
  accounts". No other new text on the start page.
- **The name Ťapko in the root head**: title `TapkoTyper (Ťapko) – písanie všetkými desiatimi pre
  deti` (also `og:title`). Description: "Ťapko (TapkoTyper) je pokojná príbehová hra, ...". The
  rest of the existing description stays; keep it under 160 characters. JSON-LD gains
  `"alternateName": ["Ťapko", "Tapko", "Ťapko Typer"]`, and `og:image:alt` uses "Ťapkom".
- **Offline**: the about pages are left out of `sw.js`, like the crawler files. Offline, a
  navigation to them falls back to the game (existing `sw-template.js` behaviour), which is fine.
  The service worker must not serve the game for `/about/...` when online. Check this, and make
  the navigate fallback cover only network failure (it already does).
- **No new runtime requests** on the about pages except the same GoatCounter script the game
  uses (privacy spec: anonymous counting is allowed). Fonts come from `/fonts/` (same origin).

Affected: `vite.config.ts` (generation plugin, service worker list), a new
`scripts/about-pages.mjs` (pure HTML generator), `index.html`, `public/sitemap.xml`,
`public/i18n/sk.json` + `en.json` (new keys), `src/screens/start.ts`, `src/styles.css`,
`src/app/seo.test.ts`, `.specify/experience/discoverability.md` + `privacy.md`.
No contracts, no stored data, no DB impact.

## Steps

- [x] **Texts** in both dictionaries, new group `aboutPage` (Slovak first, natural English):
  - `title`: "Ťapko (TapkoTyper) – hra na písanie všetkými desiatimi pre deti" / "Tapko
    (TapkoTyper) – a touch typing game for children"
  - `description` (140-160 characters, names Ťapko, ten fingers, children, free, no ads)
  - `heading` (h1), `play` ("Hrať Ťapka" / "Play Tapko"), `language` (label of the language
    links), `link` ("Základné informácie" / "About the game")
  - `forParentsTitle`, `forTeachersTitle`, `howTitle` (section headings where existing headings
    do not fit)
  - `start.promises.ads` changed as decided above.
- [x] **Generator `scripts/about-pages.mjs`**: `aboutPage(lang, dict, langs)` returns the HTML
  string. Sections, all from existing keys plus the new ones:
  1. h1 + `about.intro` + `start.intro` + a big "Play" link to `/` and the Tapko picture
     (`/icons/tapko-180.png` or an existing asset)
  2. how the game goes: `help.journey` + `help.play`
  3. game types: `help.games.intro` + `help.games.*` as a plain list (no pictures needed)
  4. how to type: `help.type` (the `{pinky}` placeholder becomes the plain left-pinky key,
     use the same value `homePinky()` gives for the Slovak / English layout)
  5. for parents and teachers: `help.mentor` + `help.teach`
  6. privacy: `about.privacy` + `about.data` (first line)
  7. author and licence: `about.author`, `about.credits`, links to the GitHub repo and issues
  - Rich text: `**x**` -> `<strong>`. A `{install}` / `{readme}` / `{report}` / `{open}`
    placeholder becomes its link text (`about.install`, `about.readme`, `about.authorReport`)
    as a link where a URL exists (install help, `REPO#readme`, `REPO/issues/new`), otherwise
    plain text. Other numeric placeholders get the values the game uses (import the constants
    or repeat them in one exported map, then test that they match). A line whose placeholder
    cannot be resolved fails the build, so no `{x}` ever reaches a page.
  - HTML-escape every text. `<html lang>`, `<title>`, `description`, canonical
    `https://tapkotyper.com/about/<lang>/`, `hreflang` alternates for every language +
    `x-default`, OG tags (`og:url` the canonical, `og:image` the existing `og.png`, `og:locale`),
    a JSON-LD `WebPage` with `about` pointing to the root `WebApplication` URL and `inLanguage`.
  - Look: one inline `<style>`, the game's fonts (`/fonts/lexend-*`, Atkinson), its green and
    paper colours, light and dark by `prefers-color-scheme`, readable column (about 70ch),
    16px side gutter, no horizontal scroll on a phone. A top bar with the logo picture, the
    "Play" link and the language links (current one marked `aria-current`).
  - Also `redirectPage(langs)` for `/about/`.
- [x] **Vite plugin** in `vite.config.ts`: on build, `emitFile` `about/<lang>/index.html` and
  `about/index.html`. In dev, a `configureServer` middleware serves the same HTML for
  `/about/...`, so the start link works in `npm run dev` too. Exclude every `about/` file
  from the service worker list.
- [x] **Start page** (`src/screens/start.ts`, `src/styles.css`): the signature becomes two links,
  `aboutPage.link` -> `/about/<lang>/` (the game's language, or the base of an own language),
  then `MIT · Atiris` as before, separated by ` · `, same small style and hover. In the
  installed web app (`standalone()` from `src/ui/install.ts`) the about link is not shown, only
  `MIT · Atiris` as today: the player already has the game, and the page would open outside the
  app window. Check it on a
  phone width and in the gated (phone without keyboard) layout so it never covers buttons.
- [x] **Root head** (`index.html`): title, `og:title`, description, `og:description`,
  `og:image:alt`, JSON-LD `alternateName` and description as decided. Keep the noscript in sync
  with the new description, and add links to `/about/sk/` and `/about/en/` in the noscript.
- [x] **Sitemap** `public/sitemap.xml`: the root plus `/about/sk/` and `/about/en/`, the about
  entries with `xhtml:link rel="alternate" hreflang` for every language and `x-default`.
  Still no `lastmod`, `changefreq` or `priority`.
- [x] **Tests** `src/app/seo.test.ts`: every official dictionary gives a page with no `{` left
  in text, a canonical equal to its sitemap entry, hreflang for all languages, and parsing
  JSON-LD. The root title and JSON-LD contain "Ťapko". The sitemap lists exactly the root and
  one about page per dictionary.
- [x] **Spec**: `.specify/experience/discoverability.md`: the game keeps one address. Each
  language has a short static page with basic information, generated from the game's own texts,
  linked from the start page and listed for search engines. The game is findable as Ťapko too.
  Why: parents search in their own language and by the character's name, and the start page
  must stay a game, not a text page. Update the start-screen sentence in `privacy.md` (the
  signature now also holds the about link).
- [x] **Verify**: `npm run build`, `npm test`, lint. `dist/about/sk/index.html`,
  `dist/about/en/index.html` and `dist/about/index.html` exist, and `sw.js` lists none of them.
  `vite preview` + Playwright MCP: the start page looks as before apart from the signature. The
  link opens the about page in the game's language, the language links switch, "Play" opens the
  game, and `/about/` sends to the browser language. No console errors. The game still installs
  and starts offline after a first visit (DevTools offline: `/` loads). Online, `/about/sk/` is
  the about page, not the game, also after the service worker is active.
  `npx lighthouse <preview>/about/sk/ --only-categories=seo,accessibility --quiet
  --chrome-flags=--headless`: fix everything below 100 that this plan covers.
- [~] After the deploy: `curl -sI https://tapkotyper.com/about/sk/` and `/about/en/` return 200. (deferred: runs after the push deploys)

## Owner steps after the deploy (not for the runner)

1. Search Console: resubmit `sitemap.xml`, request indexing of `/about/sk/` and `/about/en/`.

## Done - 2026-11-02

Shipped: `/about/sk/` and `/about/en/`, built from the dictionaries by `src/app/about-page.ts`
(the dev server serves them too); `/about/` sends to the browser's language; hreflang between
them; the sitemap with the three addresses; the start-page link before "MIT · Atiris" (not in the
installed app); "Zadarmo" in the first promise; Ťapko in the root title, description and JSON-LD
`alternateName`. Tests in `src/app/seo.test.ts`, translator guide lines for the new texts.
Lighthouse SEO and accessibility 100 on both about pages (light and dark). Offline, an about
address opens the game without errors.

Deviations: the parents and teachers part uses only `help.teach`; the `help.mentor` lines describe
the teacher page's buttons and read badly outside the game. The icon and manifest links in
`index.html` became absolute, so the game served offline at an about address finds them. The new
`baseLanguage()` in `src/i18n/i18n.ts` gives the official language under an own language for the link.
The generator is `src/app/about-page.ts` (not `scripts/about-pages.mjs`), so `tsc` checks it and the tests import it; the texts are `about.page.*` (not a new `aboutPage` group), inside the translator's existing about group.
Left out: the deploy check (curl) and the owner's Search Console step.
