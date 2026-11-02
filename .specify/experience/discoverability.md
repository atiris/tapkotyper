# Discoverability

## What
- Parents and teachers who search for touch typing for children (in Slovak first) find the
  game, also by the character's name **Ťapko** (and "Tapko" without the caron). A shared link
  shows a clear preview: a title, a short description and a picture of the start screen.
- Slovak first: the game's title, description and preview texts are Slovak; English is named as
  the second language. Without JavaScript the page says in both languages what the game is and
  links to the about pages.
- The game has one address, `https://tapkotyper.com/`. Its screens are not separate pages.
- Each official language has a short **about page** (`/about/sk/`, `/about/en/`) with the basic
  information: what the game is, how it goes, the kinds of games, how to type, how typing is
  taught, the promise to parents, the author and the licences. Its text comes from the game's own
  help, so the two never say different things. The pages link to each other by language and
  to the game, and search engines get them as language versions of one page. `/about/` opens the
  page in the browser's language.
- The start page links to the about page in the game's language, small, before "MIT · Atiris".
  The installed web app does not show the link.
- No hidden text for robots, no extra tracking and no verification tags in the page: search
  consoles are verified at the domain, so [privacy](privacy.md) stays true.
- The crawler files, the preview picture and the about pages are not part of the offline game;
  offline, an about address opens the game.

## Why
- Most players come through a parent or a teacher; a search result or a link in a school chat
  is often the first thing they see, and a bare link without text or picture is easy to skip.
- Children and parents call the game by its character, Ťapko, and search for it that way.
- The start page must stay a game, not a text page, so the longer text lives on its own page,
  one per language, which search engines can read and offer in the reader's language.
- Hidden text is punished by search engines and would not be honest to people either.
- Someone who installed the app already has the game; the about page would only open outside its
  window.
