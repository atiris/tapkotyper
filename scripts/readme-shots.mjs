// README pictures: `node scripts/readme-shots.mjs` builds the e2e app, plays it in Chromium and writes docs/*.png.
import { chromium } from '@playwright/test';
import { spawn, execSync } from 'node:child_process';
import { createServer as freePort } from 'node:net';
import { statSync } from 'node:fs';
import sharp from 'sharp';
import { createServer } from 'vite';

/** Pictures larger than this are scaled down to `SMALL_W`, and to 256 colors if that is not enough. */
const MAX_BYTES = 400 * 1024;
const SMALL_W = 1200;

// The lesson order and the keys the levels need, from the game's own code.
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { lessonOrder } = await vite.ssrLoadModule('/src/learning/lessons.ts');
const { STORIES } = await vite.ssrLoadModule('/src/game/levels.ts');
await vite.close();
/** Worlds 1-4 done: every key their levels and the next level need is unlocked. */
const DONE_WORLDS = [0, 1, 2, 3];
const keys = lessonOrder('sk-qwertz').slice(0, Math.max(...STORIES[0].keys.slice(0, DONE_WORLDS.length * 5 + 1)));

const port = await new Promise((resolve) => {
  const s = freePort().listen(0, () => {
    const { port: p } = s.address();
    s.close(() => resolve(p));
  });
});
const BASE = `http://localhost:${port}/`;

execSync('npx vite build --mode e2e --outDir .e2e/dist', { stdio: 'inherit' });
const server = spawn(`npx vite preview --outDir .e2e/dist --port ${port} --strictPort`, { shell: true, stdio: 'ignore' });
const stopServer = () => {
  if (process.platform === 'win32') {
    try { execSync(`taskkill /pid ${server.pid} /t /f`, { stdio: 'ignore' }); } catch { /* already gone */ }
  } else server.kill();
};

async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('vite preview did not start');
}

/** Changes the stored data and reloads the page. */
async function editStore(page, fn, arg) {
  await page.evaluate(([body, a]) => {
    const data = JSON.parse(localStorage.getItem('tapkotyper:v1'));
    new Function('d', 'a', body)(data, a);
    localStorage.setItem('tapkotyper:v1', JSON.stringify(data));
  }, [`(${fn})(d, a)`, arg]);
  await page.reload();
}

/** The viewport as a PNG in docs/, made smaller when it is too large; no focus, so no tooltip shows. */
async function shot(page, name, settle = 300) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => document.activeElement?.blur());
  await page.waitForTimeout(settle);
  const png = await page.screenshot();
  const file = `docs/${name}.png`;
  await sharp(png).png({ compressionLevel: 9 }).toFile(file);
  if (statSync(file).size > MAX_BYTES) await sharp(png).resize({ width: SMALL_W }).png({ compressionLevel: 9 }).toFile(file);
  if (statSync(file).size > MAX_BYTES) await sharp(png).resize({ width: SMALL_W }).png({ compressionLevel: 9, palette: true, effort: 10 }).toFile(file);
  console.log(`${file}: ${Math.round(statSync(file).size / 1024)} KB`);
}

/** Opens a level from its map node, closes the cards before play, types `chars` characters and one more as the shot. */
async function playShot(page, id, island, node, name, chars = 20) {
  await page.goto(`${BASE}?fast#/p/${id}`);
  await page.locator('.map-screen').waitFor();
  const isl = page.locator(`.island-${island}`);
  await isl.scrollIntoViewIfNeeded();
  await isl.locator('.level-node').nth(node).click();
  await page.locator('.level-screen canvas').first().waitFor();
  let typed = 0;
  for (let i = 0; i < 2000 && typed < chars; i++) {
    const s = await page.evaluate(() => {
      if (document.querySelector('.posture-card, .keys-intro, .story-screen')) return 'space';
      const ck = document.querySelector('.controlkey-card');
      if (ck) return `press:${ck.dataset.key}`;
      if (document.querySelector('.newkey-card')) return 'wait';
      const next = document.querySelector('.kb-guide')?.dataset.next;
      return next ? `next:${next}` : 'wait';
    });
    if (s === 'space') await page.keyboard.press('Space');
    else if (s.startsWith('press:')) await page.keyboard.press(s.slice(6));
    else if (s.startsWith('next:')) {
      await page.evaluate((ch) => window.tapkoType(ch), s.slice(5));
      typed++;
    }
    await page.waitForTimeout(s.startsWith('next:') ? 220 : 250);
  }
  // The next key; the picture catches what it sets off.
  const next = await page.locator('.kb-guide').getAttribute('data-next');
  await page.evaluate((ch) => window.tapkoType(ch), next);
  await shot(page, name, 120);
}

const errors = [];
let browser;
try {
  await waitForServer();
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'sk-SK', colorScheme: 'light', reducedMotion: 'reduce', serviceWorkers: 'block' });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  // A new player through the start page's form.
  await page.goto(BASE);
  await page.locator('.start-card .new-player').first().click();
  await page.locator('#np-nick').fill('Ema');
  await page.locator('#np-lang').selectOption('sk');
  await page.locator('#np-layout').selectOption('sk-qwertz');
  await page.locator('form button[type=submit]').click();
  await page.locator('.map-screen').waitFor();
  const id = await page.evaluate(() => JSON.parse(localStorage.getItem('tapkotyper:v1')).profiles[0].id);

  // Worlds 1-4 done with three stars, their keys known, a calm look; two tasks from a teacher.
  const levels = Object.fromEntries(DONE_WORLDS.flatMap((w) => [1, 2, 3, 4, 5].map((i) => [`w${w + 1}-${i}`, 3])));
  const today = new Date().toISOString().slice(0, 10);
  await editStore(page, (d, a) => {
    const p = d.profiles[0];
    d.theme = 'light';
    Object.assign(p.settings, { theme: 'light', sound: 'off', reduceMotion: true, appTips: false });
    Object.assign(p.progress, { levels: a.levels, worldsDone: a.worlds, unlockedKeys: a.keys, introducedKeys: a.keys, levelsFinished: 20, starsEarned: 60, trainedSeconds: 20 * 150 });
    const task = (tid, title, words, extra) => ({ id: tid, title, group: '3.A', game: 'chase', words, text: '', limit: 'time', minutes: 5, dictionary: true, knownOnly: true, world: 'current', finished: 0, ...extra });
    p.tasks = [
      task('readme-2', 'Slová s písmenom r', ['rad', 'ruka', 'more', 'hora', 'dar'], {}),
      task('readme-1', 'Domáci rad', ['sad', 'las', 'dal', 'kal', 'fajn'], { finished: 2, best: { seconds: 300, chars: 412, errors: 9, cpm: 82, doneAt: a.today, try: 2 } }),
    ];
  }, { levels, worlds: DONE_WORLDS, keys, today });
  await page.locator('.map-screen').waitFor();

  await shot(page, 'map');
  await page.goto(`${BASE}#/p/${id}/tasks`);
  await page.locator('.tasks-screen, main').first().waitFor();
  await shot(page, 'tasks');
  await page.goto(`${BASE}#/`);
  await page.locator('.start-screen').waitFor();
  await shot(page, 'start');
  await playShot(page, id, 'meadow', 2, 'meadow');
  await playShot(page, id, 'space', 0, 'space');
} finally {
  await browser?.close();
  stopServer();
}
if (errors.length) {
  console.error('page errors:\n' + errors.join('\n'));
  process.exitCode = 1;
}
