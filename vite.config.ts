/// <reference types="vitest/config" />
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { type Plugin, defineConfig } from 'vite';
import { aboutPage, aboutPath, aboutRedirect } from './src/app/about-page';
import { CLOSE, LANGS } from './src/i18n/i18n';
import { START_TEXTS } from './src/i18n/start-texts';
import { STORE_KEY } from './src/storage/store';
import { LOW, MEADOW } from './src/ui/start-pictures';
import { handPoser } from './tools/hand-poser/server';

function publicFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? publicFiles(path) : [relative('public', path).split(sep).join('/')];
  });
}

/** Which build a browser runs: the commit and the build time, in the page's meta and at the top of sw.js. */
const BUILD = `${execSync('git rev-parse --short HEAD').toString().trim()} ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`;

/** Writes sw.js with the files to keep offline and their versions and stamps both with BUILD. */
function serviceWorker(): Plugin {
  return {
    name: 'tapkotyper-sw',
    apply: 'build',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { name: 'build', content: BUILD }, injectTo: 'head' }],
    generateBundle(_options, bundle) {
      // Each file's own version lets an update fetch only what changed; the page always changes (its BUILD meta).
      const short = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex').slice(0, 12);
      const files: Record<string, string> = { './': short(BUILD) };
      // The about pages are for visitors and crawlers; offline, a visit to them opens the game instead.
      for (const [name, out] of Object.entries(bundle)) if (!name.startsWith('about/')) files[name] = short(out.type === 'chunk' ? out.code : out.source);
      // Music is cached as it plays; robots.txt, the sitemap and the share picture are for crawlers, never needed offline;
      // the meadow's first-visit copy is never shown once the files are offline.
      const offline = (f: string) => !f.endsWith('.mp3') && !f.endsWith('.txt') && f !== 'sitemap.xml' && f !== 'og.png' && !f.endsWith(`${LOW}.webp`);
      for (const f of publicFiles('public').filter(offline)) files[f] = short(readFileSync(join('public', f)));
      const version = short(JSON.stringify(files));
      const source = readFileSync('scripts/sw-template.js', 'utf8')
        .replace('__BUILD__', BUILD)
        .replace('__VERSION__', version)
        .replace('__FILES__', JSON.stringify(files));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

/** The about pages by their published path: `about/<lang>/index.html` and the language pick `about/index.html`. */
function aboutFiles(): Record<string, string> {
  const pages: Record<string, string> = { 'about/index.html': aboutRedirect() };
  for (const lang of LANGS) pages[`${aboutPath(lang)}index.html`] = aboutPage(lang, JSON.parse(readFileSync(`public/i18n/${lang}.json`, 'utf8')));
  return pages;
}

/** Writes the static about pages into the build; the dev server serves the same pages. */
function aboutPages(): Plugin {
  return {
    name: 'tapkotyper-about',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0] ?? '';
        const html = /^\/about(\/|$)/.test(path) ? aboutFiles()[`${path.slice(1).replace(/\/?$/, '/')}index.html`] : undefined;
        if (!html) return next();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
      });
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries(aboutFiles())) this.emitFile({ type: 'asset', fileName, source });
    },
  };
}

/** Cuts the start texts (START_TEXTS) out of each official language: `i18n/<lang>.start.json`. */
function startTexts(): Plugin {
  return {
    name: 'tapkotyper-start-texts',
    apply: 'build',
    generateBundle() {
      for (const lang of LANGS) {
        const all = JSON.parse(readFileSync(`public/i18n/${lang}.json`, 'utf8')) as Record<string, unknown>;
        const part: Record<string, any> = {};
        for (const key of START_TEXTS) {
          const path = key.split('.');
          let from: any = all, to = part;
          for (const name of path.slice(0, -1)) {
            from = from[name];
            to = to[name] ??= {};
          }
          to[path.at(-1)!] = from[path.at(-1)!];
        }
        this.emitFile({ type: 'asset', fileName: `i18n/${lang}.start.json`, source: JSON.stringify(part) });
      }
    },
  };
}

/**
 * Starts the data the first screen waits for (the asset list, the interface language's texts and,
 * on the start page, the meadow of the shown look) with the page, not after the main script: the
 * language is the stored one, else the one `detectLanguage` picks; an own language is left to the app.
 * A build's start page on a first visit (no player, nothing offline) takes only the start texts (startTexts).
 */
function firstFetches(): Plugin {
  let build = false;
  const pick = () => `(function () {
  var store = {}, start = location.hash.length <= 2, first = !(navigator.serviceWorker && navigator.serviceWorker.controller);
  try { store = JSON.parse(localStorage.getItem(${JSON.stringify(STORE_KEY)}) || '{}') || {}; } catch (e) {}
  if (start) {
    var meadow = document.createElement('link');
    meadow.rel = 'preload'; meadow.as = 'image';
    meadow.href = '/assets/' + ${JSON.stringify(MEADOW)}[document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'] + (first ? '${LOW}' : '') + '.webp';
    document.head.appendChild(meadow);
  }
  var langs = ${JSON.stringify(LANGS)}, close = ${JSON.stringify(CLOSE)}, lang = store.language;
  if (lang && langs.indexOf(lang) < 0) return;
  if (!lang) {
    var codes = Array.prototype.map.call(navigator.languages || [], function (l) { return l.toLowerCase().split('-')[0]; });
    lang = codes.filter(function (c) { return langs.indexOf(c) >= 0; })[0] || codes.map(function (c) { return close[c]; }).filter(Boolean)[0] || 'en';
  }
  var link = document.createElement('link');
  link.rel = 'preload'; link.as = 'fetch'; link.crossOrigin = 'anonymous'; link.href = '/i18n/' + lang + (${build} && start && first && !(store.profiles && store.profiles.length) ? '.start' : '') + '.json';
  document.head.appendChild(link);
})();`;
  // At the placeholder above the stylesheet: an inline script after it waits until the stylesheet has loaded.
  const tags = () => `<link rel="preload" href="/assets/manifest.json" as="fetch" crossorigin="anonymous" />\n    <script>${pick()}</script>`;
  return {
    name: 'tapkotyper-first-fetches',
    configResolved: (config) => { build = config.command === 'build'; },
    transformIndexHtml: (html) => html.replace('<!-- first-fetches -->', tags()),
  };
}

// GitHub Pages serves the site at the root of tapkotyper.com
export default defineConfig({
  base: '/',
  // startTexts before serviceWorker, so the offline list has the start texts.
  plugins: [aboutPages(), startTexts(), firstFetches(), serviceWorker(), handPoser()],
  test: { include: ['src/**/*.test.ts'] },
});
