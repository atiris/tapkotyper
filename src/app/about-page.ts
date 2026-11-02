import { CLOSE, LANGS, LANGUAGES } from '../i18n/i18n';
import { LAYOUTS, enterAfter } from '../keyboard/layouts';
import type { Lang, LayoutId } from '../storage/schema';

/**
 * The static about pages, `/about/<lang>/`: basic information for parents, teachers and search
 * engines, built from the game's own texts so they never drift from the help. No JavaScript.
 */

export const SITE = 'https://tapkotyper.com/';
const REPO = 'https://github.com/atiris/tapkotyper';
export const aboutPath = (lang: Lang) => `about/${lang}/`;

type Dict = Record<string, unknown>;

/** The keyboard a language's texts assume, for the home-row pinky in the typing tips. */
const LAYOUT_OF: Record<Lang, LayoutId> = { sk: 'sk-qwertz', en: 'us-qwerty' };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function at(d: Dict, key: string): unknown {
  return key.split('.').reduce<unknown>((v, k) => (v as Dict | undefined)?.[k], d);
}

function text(d: Dict, key: string): string {
  const v = at(d, key);
  if (typeof v !== 'string') throw new Error(`about page: no text ${key}`);
  return v;
}

function lines(d: Dict, key: string): string[] {
  const v = at(d, key);
  if (!Array.isArray(v)) throw new Error(`about page: no lines ${key}`);
  return v as string[];
}

/** A line as HTML: escaped, `**x**` bold, every `{mark}` from `marks`; an unknown mark fails the build. */
function rich(line: string, marks: Record<string, string>): string {
  const html = esc(line).split('**').map((p, i) => (i % 2 ? `<strong>${p}</strong>` : p)).join('');
  return html.replace(/\{(\w+)\}/g, (_, m: string) => {
    if (!(m in marks)) throw new Error(`about page: unknown {${m}} in "${line}"`);
    return marks[m];
  });
}

const link = (href: string, label: string) => `<a href="${esc(href)}">${esc(label)}</a>`;

/** The page for one language; `langs` are all the languages with a page, for the links between them. */
export function aboutPage(lang: Lang, d: Dict, langs: readonly Lang[] = LANGS): string {
  const marks: Record<string, string> = {
    install: link(text(d, 'about.installHelp'), text(d, 'about.install')),
    readme: link(`${REPO}#readme`, text(d, 'about.readme')),
    report: link(`${REPO}/issues/new`, text(d, 'about.authorReport')),
    pinky: esc(enterAfter(LAYOUTS[LAYOUT_OF[lang]]).toUpperCase()),
  };
  const p = (key: string) => `<p>${rich(text(d, key), marks)}</p>`;
  const ul = (items: string[]) => `<ul>${items.map((l) => `<li>${rich(l, marks)}</li>`).join('')}</ul>`;
  const section = (titleKey: string, body: string) => `<section><h2>${esc(text(d, titleKey))}</h2>${body}</section>`;
  const games = Object.entries(at(d, 'help.games') as Dict).filter(([k]) => k !== 'intro').map(([, v]) => v as string);
  const promises = Object.values(at(d, 'start.promises') as Dict) as string[];

  const url = `${SITE}${aboutPath(lang)}`;
  const title = text(d, 'about.page.title');
  const description = text(d, 'about.page.description');
  const alternates = [...langs.map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE}${aboutPath(l)}">`),
    `<link rel="alternate" hreflang="x-default" href="${SITE}${aboutPath('en')}">`].join('\n    ');
  const ld = { '@context': 'https://schema.org', '@type': 'WebPage', name: title, url, description, inLanguage: lang,
    about: { '@type': 'WebApplication', name: 'TapkoTyper', alternateName: ['Ťapko', 'Tapko'], url: SITE } };
  const langLinks = langs.map((l) => (l === lang
    ? `<a href="/${aboutPath(l)}" lang="${l}" aria-current="page">${esc(LANGUAGES[l])}</a>`
    : `<a href="/${aboutPath(l)}" lang="${l}" hreflang="${l}">${esc(LANGUAGES[l])}</a>`)).join('');
  const play = `<a class="play" href="/">${esc(text(d, 'about.page.play'))}</a>`;
  const navLabel = esc(text(d, 'about.page.languages'));

  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta name="theme-color" content="#7cc79a">
    <link rel="canonical" href="${url}">
    ${alternates}
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="TapkoTyper">
    <meta property="og:url" content="${url}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:locale" content="${lang === 'sk' ? 'sk_SK' : 'en_US'}">
    <meta property="og:image" content="${SITE}og.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:card" content="summary_large_image">
    <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
    <link rel="icon" href="/icons/tapko-48.png" type="image/png" sizes="48x48">
    <link rel="apple-touch-icon" href="/icons/tapko-180.png">
    <style>${STYLE}</style>
  </head>
  <body>
    <header>
      <a class="brand" href="/"><img src="/icons/tapko-180.png" alt="" width="48" height="48"><span>TapkoTyper</span></a>
      <nav aria-label="${navLabel}">${langLinks}</nav>
    </header>
    <main>
      <h1>${esc(text(d, 'about.page.heading'))}</h1>
      ${p('about.intro')}
      ${p('start.intro')}
      <ul class="promises">${promises.map((l) => `<li>${rich(l, marks)}</li>`).join('')}</ul>
      ${play}
      ${section('help.journeyTitle', ul(lines(d, 'help.journey')))}
      ${section('help.playTitle', ul(lines(d, 'help.play')))}
      ${section('help.gamesTitle', ul(games))}
      ${section('help.typeTitle', ul(lines(d, 'help.type')))}
      ${section('help.teachTitle', ul(lines(d, 'help.teach')))}
      ${section('about.privacyTitle', ul([...lines(d, 'about.privacy'), lines(d, 'about.data')[0]]))}
      ${section('about.authorTitle', p('about.author'))}
      ${section('about.creditsTitle', `${p('about.credits')}<p>${link(REPO, text(d, 'about.code'))} · ${link(`${REPO}/issues/new`, text(d, 'about.report'))}</p>`)}
      ${play}
    </main>
    <script data-goatcounter="https://tapkotyper.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
  </body>
</html>
`;
}

/** `/about/`: sends the visitor to the page of the browser's language (the game's own rule); links for no JavaScript. */
export function aboutRedirect(langs: readonly Lang[] = LANGS): string {
  const links = langs.map((l) => `<li><a href="/${aboutPath(l)}" lang="${l}" hreflang="${l}">${esc(LANGUAGES[l])}</a></li>`).join('');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TapkoTyper</title>
    <meta name="robots" content="noindex, follow">
    <script>
      (function () {
        var langs = ${JSON.stringify(langs)}, close = ${JSON.stringify(CLOSE)};
        var codes = (navigator.languages || [navigator.language || '']).map(function (l) { return String(l).toLowerCase().split('-')[0]; });
        var lang = codes.filter(function (c) { return langs.indexOf(c) >= 0; })[0] || codes.map(function (c) { return close[c]; }).filter(Boolean)[0] || 'en';
        location.replace('/about/' + lang + '/');
      })();
    </script>
    <style>${STYLE}</style>
  </head>
  <body><main><h1>TapkoTyper</h1><ul>${links}</ul></main></body>
</html>
`;
}

const STYLE = `
@font-face { font-family: 'Lexend'; font-weight: 600; font-display: swap; src: url('/fonts/lexend-latin-ext-600-normal.woff2') format('woff2'); unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF; }
@font-face { font-family: 'Lexend'; font-weight: 600; font-display: swap; src: url('/fonts/lexend-latin-600-normal.woff2') format('woff2'); unicode-range: U+0000-00FF, U+2000-206F; }
@font-face { font-family: 'Atkinson Hyperlegible'; font-weight: 400; font-display: swap; src: url('/fonts/atkinson-hyperlegible-latin-ext-400-normal.woff2') format('woff2'); unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF; }
@font-face { font-family: 'Atkinson Hyperlegible'; font-weight: 400; font-display: swap; src: url('/fonts/atkinson-hyperlegible-latin-400-normal.woff2') format('woff2'); unicode-range: U+0000-00FF, U+2000-206F; }
@font-face { font-family: 'Atkinson Hyperlegible'; font-weight: 700; font-display: swap; src: url('/fonts/atkinson-hyperlegible-latin-ext-700-normal.woff2') format('woff2'); unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF; }
@font-face { font-family: 'Atkinson Hyperlegible'; font-weight: 700; font-display: swap; src: url('/fonts/atkinson-hyperlegible-latin-700-normal.woff2') format('woff2'); unicode-range: U+0000-00FF, U+2000-206F; }
:root { --ink: #3b2a3f; --soft: #6b5a70; --paper: #fffdf7; --line: rgba(90, 61, 43, 0.18); --link: #ad4f0e; --green: #2e7549; --on-green: #fff;
  --bg: linear-gradient(180deg, #c9ecfa 0%, #e9f8ef 40rem, #fffdf7 70rem); color-scheme: light; }
@media (prefers-color-scheme: dark) {
  :root { --ink: #f4ecdf; --soft: #c2b7d2; --paper: #2b2742; --line: rgba(255, 240, 220, 0.16); --link: #ffa866; --green: #8fd9a6; --on-green: #171631;
    --bg: linear-gradient(180deg, #171631 0%, #2b2742 40rem); color-scheme: dark; }
}
* { box-sizing: border-box; }
html { background: var(--paper); }
body { margin: 0; min-height: 100vh; background: var(--bg) no-repeat, var(--paper); color: var(--ink); font: 1.0625rem/1.6 'Atkinson Hyperlegible', system-ui, sans-serif; }
header, main { max-width: 46rem; margin: 0 auto; padding: 0 16px; }
header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding-block: 16px; }
.brand img { border-radius: 12px; }
.brand { display: flex; align-items: center; gap: 10px; color: var(--ink); text-decoration: none; font: 600 1.25rem 'Lexend', system-ui, sans-serif; }
nav { display: flex; gap: 6px; }
nav a { padding: 4px 12px; border: 1px solid var(--line); border-radius: 999px; color: var(--ink); text-decoration: none; }
nav a[aria-current] { background: var(--green); border-color: var(--green); color: var(--on-green); }
main { padding-bottom: 48px; }
h1, h2 { font-family: 'Lexend', system-ui, sans-serif; font-weight: 600; line-height: 1.25; }
h1 { font-size: clamp(1.6rem, 5vw, 2.2rem); margin: 16px 0; }
h2 { font-size: 1.3rem; margin: 40px 0 8px; padding-top: 16px; border-top: 1px solid var(--line); }
a { color: var(--link); }
ul { padding-left: 1.3rem; }
li { margin: 6px 0; }
.promises { display: flex; flex-wrap: wrap; gap: 8px; padding: 0; list-style: none; }
.promises li { margin: 0; padding: 4px 12px; border-radius: 999px; background: var(--paper); border: 1px solid var(--line); }
.play { display: inline-block; margin: 16px 0; padding: 12px 28px; border-radius: 999px; background: var(--green); color: var(--on-green); font: 600 1.1rem 'Lexend', system-ui, sans-serif; text-decoration: none; }
.play:hover, .play:focus-visible { filter: brightness(1.08); }
`;
