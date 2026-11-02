# 100 - SEO basics for tapkotyper.com

## What and why

Search engines and link previews know almost nothing about the game today: there is no
`robots.txt` and no `sitemap.xml`, no canonical address, no Open Graph or Twitter tags, no
structured data, and the only description is one English sentence on a page marked
`lang="sk"`. A parent or teacher who searches "písanie všetkými desiatimi pre deti" or shares
the link in a school chat gets no picture and no clear text.

This plan adds the professional **technical minimum** (the owner's choice, 2026-11-02): correct
head metadata, crawl files, a share image and structured data. It adds **no new pages** and does
not change the game, its boot or its hash routing.

Decisions already taken:
- One URL, `https://tapkotyper.com/`. The game is one page with hash routes (`#/...`), which
  search engines do not index as separate pages, so the sitemap lists only the root and there is
  **no `hreflang`** (it needs one URL per language; both languages share one URL).
- **Slovak first** (product principle 5): `<title>`, `description` and OG texts are Slovak; the
  English text goes in `og:locale:alternate`, JSON-LD `inLanguage` and the `<noscript>` text.
- No new runtime requests, no tracking, no verification meta tag: Search Console and Bing are
  verified by a DNS TXT record (owner step below), so `privacy.md` stays true.
- No hidden text for robots (search engines punish it). The boot screen stays as it is.

Affected: `index.html`, `public/` (new `robots.txt`, `sitemap.xml`, `og.png`),
`vite.config.ts` (service worker file list), `scripts/readme-shots.mjs` (share image),
a unit test, `.specify/experience/`. No contracts, no stored data, no DB impact.

## Steps

- [x] **Head metadata in `index.html`** (keep the existing tags, the theme script and GoatCounter):
  - `<title>TapkoTyper – písanie všetkými desiatimi pre deti</title>`
  - `description` (Slovak, 140-160 characters): a peaceful story game that teaches children
    touch typing with all ten fingers, Slovak and English keyboard, free, no ads, no accounts.
  - `<link rel="canonical" href="https://tapkotyper.com/">`
  - Open Graph: `og:type` `website`, `og:site_name` `TapkoTyper`, `og:url` (the canonical),
    `og:title`, `og:description` (same texts as above), `og:locale` `sk_SK`,
    `og:locale:alternate` `en_US`, `og:image` `https://tapkotyper.com/og.png` (absolute URL,
    required by Facebook and Slack), `og:image:width` `1200`, `og:image:height` `630`,
    `og:image:alt`.
  - `twitter:card` `summary_large_image` (other Twitter fields fall back to OG).
  - `<meta name="robots" content="index, follow, max-image-preview:large">`
  - One `<script type="application/ld+json">` with a `WebApplication`: `name`, `url`,
    `description`, `image`, `applicationCategory` `EducationalApplication`,
    `operatingSystem` `Any (web browser)`, `inLanguage` `["sk", "en"]`,
    `isAccessibleForFree` `true`, `offers` (`price` `0`, `priceCurrency` `EUR`),
    `audience` (`PeopleAudience`, `suggestedMinAge` 10, `suggestedMaxAge` 15),
    `author` (`Person`, the copyright holder in `LICENSE`), `license` (MIT URL).
  - `<noscript>`: replace the one line with a short paragraph in Slovak and one in English
    that says what the game is and that it needs JavaScript.
- [x] **`public/robots.txt`**: `User-agent: *`, `Allow: /`,
  `Sitemap: https://tapkotyper.com/sitemap.xml`.
- [x] **`public/sitemap.xml`**: a valid sitemap with the one `<loc>https://tapkotyper.com/</loc>`
  and no `lastmod`, `changefreq` or `priority` (search engines ignore them or distrust a value
  that changes on every deploy).
- [x] **Share image `public/og.png`**, 1200x630 PNG under 300 KB: `scripts/readme-shots.mjs`
  also takes the start screen at a 1200x630 viewport and writes it to `public/og.png` (same
  sharp size rule as the other shots). Run the script once and commit the image.
- [x] **Service worker list** (`vite.config.ts`): leave `og.png` and `sitemap.xml` out of the
  offline files (as `.txt` and `.mp3` already are); a player never needs them offline.
- [x] **Unit test** `src/app/seo.test.ts` reading `index.html`: canonical, `og:url` and the
  JSON-LD `url` are the same `https://tapkotyper.com/`; the JSON-LD parses; `og:image` is
  absolute; `public/robots.txt` names the sitemap; `public/sitemap.xml` holds the canonical.
  A domain change then cannot leave one of them behind.
- [x] **Spec**: new `.specify/experience/discoverability.md` (WHAT and WHY: parents and teachers
  find the game by search and see a clear preview when it is shared; Slovak first; one URL; no
  hidden text, no tracking, no verification tags) and its line in `.specify/experience/index.md`.
- [x] **Verify**: `npm run build` and `npm test`; `dist/` holds `robots.txt`, `sitemap.xml`,
  `og.png`; `sw.js` lists neither `og.png` nor `sitemap.xml`. Serve `dist` with `vite preview`,
  open it with the Playwright MCP: the game starts as before, no console errors, the head holds
  the new tags. Run `npx lighthouse <preview url> --only-categories=seo --quiet
  --chrome-flags=--headless` and fix everything below 100 that this plan covers.
- [x] After the deploy: `curl -sI https://tapkotyper.com/robots.txt`, `/sitemap.xml` and
  `/og.png` return 200; `http://` and `www.` already return 301 to `https://tapkotyper.com/`
  (checked 2026-11-02), confirm it still holds.

## Owner steps after the deploy (not for the runner)

1. Google Search Console: add the **Domain** property `tapkotyper.com`, verify with the DNS TXT
   record at the domain registrar, submit `https://tapkotyper.com/sitemap.xml`, and request
   indexing of the root URL.
2. Bing Webmaster Tools: import the site from Search Console (covers Bing, DuckDuckGo, Yahoo).
3. Check the preview with the Facebook Sharing Debugger and Google's Rich Results Test.

## Done - 2026-11-02

Shipped: Slovak title and description, canonical, Open Graph and Twitter tags, robots meta,
`WebApplication` JSON-LD, a two-language `<noscript>`, `public/robots.txt`, `public/sitemap.xml`,
`public/og.png` (start screen at 1200x630, 122 KB, made by `scripts/readme-shots.mjs`), crawler
files kept out of `sw.js`, `src/app/seo.test.ts`, spec `.specify/experience/discoverability.md`.
Lighthouse SEO 100 on `vite preview`; after the deploy `robots.txt`, `sitemap.xml` and `og.png`
return 200, `http://` and `www.` still 301 to `https://tapkotyper.com/`.

Decisions: `og:image:alt` names Tapko as a friend (the start screen shows the fox); the README
shots the script also rewrites were left as they were, only `og.png` was committed.
Left out: nothing; the owner steps (Search Console, Bing, preview debuggers) stay with the owner.
