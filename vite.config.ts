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

/** Writes sw.js with the list of files to keep offline (music is cached as it plays) and stamps both with BUILD. */
function serviceWorker(): Plugin {
  return {
    name: 'tapkotyper-sw',
    apply: 'build',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { name: 'build', content: BUILD }, injectTo: 'head' }],
    generateBundle(_options, bundle) {
      const files = ['./', ...Object.keys(bundle), ...publicFiles('public').filter((f) => !f.endsWith('.mp3') && !f.endsWith('.txt'))];
      // Bundle names carry their content hash; public files keep their names, so their bytes go into the version.
      const hash = createHash('sha256').update(files.join('\n'));
      for (const f of publicFiles('public')) hash.update(readFileSync(join('public', f)));
      const version = hash.digest('hex').slice(0, 12);
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
