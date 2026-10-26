/// <reference types="vitest/config" />
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { type Plugin, defineConfig } from 'vite';

function publicFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? publicFiles(path) : [relative('public', path).split(sep).join('/')];
  });
}

/** Which build a browser runs: the commit and the build time, in the page's meta and at the top of sw.js. */
const BUILD = `${execSync('git rev-parse --short HEAD').toString().trim()} ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`;

/** Writes sw.js with the files to keep offline and their versions (music is cached as it plays) and stamps both with BUILD. */
function serviceWorker(): Plugin {
  return {
    name: 'tapkotyper-sw',
    apply: 'build',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { name: 'build', content: BUILD }, injectTo: 'head' }],
    generateBundle(_options, bundle) {
      // Each file's own version lets an update fetch only what changed; the page always changes (its BUILD meta).
      const short = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex').slice(0, 12);
      const files: Record<string, string> = { './': short(BUILD) };
      for (const [name, out] of Object.entries(bundle)) files[name] = short(out.type === 'chunk' ? out.code : out.source);
      for (const f of publicFiles('public').filter((f) => !f.endsWith('.mp3') && !f.endsWith('.txt'))) files[f] = short(readFileSync(join('public', f)));
      const version = short(JSON.stringify(files));
      const source = readFileSync('scripts/sw-template.js', 'utf8')
        .replace('__BUILD__', BUILD)
        .replace('__VERSION__', version)
        .replace('__FILES__', JSON.stringify(files));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

// GitHub Pages serves the site from /tapkotyper/
export default defineConfig({
  base: '/tapkotyper/',
  plugins: [serviceWorker()],
  test: { include: ['src/**/*.test.ts'] },
});
