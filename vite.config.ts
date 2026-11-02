/// <reference types="vitest/config" />
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { type Plugin, defineConfig } from 'vite';
import { aboutPage, aboutPath, aboutRedirect } from './src/app/about-page';
import { LANGS } from './src/i18n/i18n';
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
      // Music is cached as it plays; robots.txt, the sitemap and the share picture are for crawlers, never needed offline.
      const offline = (f: string) => !f.endsWith('.mp3') && !f.endsWith('.txt') && f !== 'sitemap.xml' && f !== 'og.png';
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

// GitHub Pages serves the site at the root of tapkotyper.com
export default defineConfig({
  base: '/',
  plugins: [aboutPages(), serviceWorker(), handPoser()],
  test: { include: ['src/**/*.test.ts'] },
});
