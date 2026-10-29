// Repeatable speed measurement (plan 82): builds the e2e app, serves it with `vite preview`, plays
// chosen levels for a fixed time by typing with `window.tapkoType` and records per scene the frame
// times, long tasks and JS heap; a Chrome trace of each scene goes to test-results/perf/.
//
//   node scripts/perf.mjs [--machine normal|slow|big|all] [--only meadow-1,map] [--seconds 30]
//                         [--no-build] [--no-trace] [--load] [--leak] [--budget] [--low]
//
// Machines: normal = 1366 x 768 at DPR 1; slow = the same with CPU throttling x 6; big = 1920 x 1080
// at DPR 2 (the largest canvas the stage makes). `--load` measures a cold first load and a level
// open on "Fast 3G"; `--leak` opens and leaves ten levels and compares the heap; `--budget` fails
// (exit code 1) when a story level is over the budget of .specify/architecture.md; `--low` forces
// the simple graphics. Needs the tester profile `.e2e/tester-profile.json` (git-ignored).
import { chromium } from '@playwright/test';
import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const PORT = 4175;
const BASE = `http://localhost:${PORT}/tapkotyper/`;
const OUT = 'test-results/perf';
const SECONDS = Number(opt('seconds', '30'));
const MACHINES = {
  normal: { viewport: { width: 1366, height: 768 }, dpr: 1, cpu: 1 },
  slow: { viewport: { width: 1366, height: 768 }, dpr: 1, cpu: 6 },
  big: { viewport: { width: 1920, height: 1080 }, dpr: 2, cpu: 1 },
};
/** p95 frame time budget per machine, in ms (.specify/architecture.md, Performance budget). */
const BUDGET = { normal: 20, slow: 33, big: 33 };

/** Scenes: a level (its map island and node, or the target range of a world), the map or the start page. */
const SCENES = [
  { name: 'meadow-1', island: 'meadow', node: 0 },
  { name: 'meadow-5', island: 'meadow', node: 4 },
  { name: 'space-1', island: 'space', node: 0 },
  { name: 'space-5', island: 'space', node: 4 },
  { name: 'planet-2', island: 'planet', node: 1 },
  { name: 'planet-3', island: 'planet', node: 2 },
  { name: 'planet-5', island: 'planet', node: 4 },
  { name: 'valley-1', island: 'dragons', node: 0 },
  { name: 'valley-3', island: 'dragons', node: 2 },
  { name: 'valley-5', island: 'dragons', node: 4 },
  { name: 'placeholder', island: 'egg', node: 0 },
  { name: 'range', island: 'meadow', aim: true },
  { name: 'map', screen: 'map' },
  { name: 'start', screen: 'start' },
];

const profileJson = '.e2e/tester-profile.json';
if (!existsSync(profileJson)) {
  console.error(`${profileJson} is missing: make it as the memory note "browser-test-typing" says.`);
  process.exit(2);
}
const tester = JSON.parse(readFileSync(profileJson, 'utf8'));

if (!flag('no-build')) execSync('npx vite build --mode e2e --outDir .e2e/dist', { stdio: 'inherit' });
const server = spawn(`npx vite preview --outDir .e2e/dist --port ${PORT} --strictPort`, { shell: true, stdio: 'ignore' });
const stopServer = () => {
  if (process.platform === 'win32') {
    try { execSync(`taskkill /pid ${server.pid} /t /f`, { stdio: 'ignore' }); } catch { /* already gone */ }
  } else server.kill();
};
mkdirSync(OUT, { recursive: true });

async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('vite preview did not start');
}

/** Frame and long task sampling in the page, started before the app's own code. */
const SAMPLER = () => {
  const w = window;
  w.__perf = { frames: [], long: 0, longMs: 0, on: false };
  let last = 0;
  const tick = (now) => {
    if (w.__perf.on && last) w.__perf.frames.push(now - last);
    last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  try {
    new PerformanceObserver((list) => {
      if (!w.__perf.on) return;
      for (const e of list.getEntries()) {
        w.__perf.long++;
        w.__perf.longMs += e.duration;
      }
    }).observe({ type: 'longtask', buffered: false });
  } catch { /* no long task timing */ }
};

async function newPage(browser, m, low) {
  const context = await browser.newContext({ viewport: m.viewport, deviceScaleFactor: m.dpr, serviceWorkers: 'block' });
  await context.addInitScript(SAMPLER);
  // The tester profile, opened directly; `low` forces the simple graphics.
  const profile = structuredClone(tester);
  if (low) profile.settings.graphics = 'simple';
  await context.addInitScript((p) => {
    const raw = JSON.parse(localStorage.getItem('tapkotyper:v1') ?? 'null') ?? { profiles: [] };
    raw.profiles = [...(raw.profiles ?? []).filter((x) => x.id !== p.id), p];
    raw.lastProfileId = p.id;
    localStorage.setItem('tapkotyper:v1', JSON.stringify(raw));
  }, profile);
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('  page error:', e.message));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  if (m.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: m.cpu });
  return { context, page, cdp };
}

/** One step of play: Space on a card, the sample key on a key card, the next key of the guide in play. */
async function step(page) {
  const s = await page.evaluate(() => {
    if (document.querySelector('.results-card')) return 'results';
    if (document.querySelector('.keys-intro')) return 'space';
    const nk = document.querySelector('.newkey-card');
    if (nk && !nk.matches('.homerow-card') && nk.querySelectorAll('.newkey-mark.ok').length >= 3) return 'wait';
    if (nk) {
      window.tapkoType(nk.dataset.sample ?? '');
      return 'typed';
    }
    if (document.querySelector('.posture-card, .story-screen')) return 'space';
    const next = document.querySelector('.kb-guide')?.dataset.next;
    if (next) {
      window.tapkoType(next);
      return 'typed';
    }
    return 'wait';
  });
  if (s === 'space') await page.keyboard.press('Space');
  return s;
}

const pct = (sorted, p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0;

async function heap(cdp) {
  await cdp.send('HeapProfiler.collectGarbage');
  const { usedSize } = await cdp.send('Runtime.getHeapUsage');
  return Math.round(usedSize / 1048576 * 10) / 10;
}

/** Main thread seconds so far: all tasks, script, style and layout. */
async function busy(cdp) {
  const { metrics } = await cdp.send('Performance.getMetrics');
  const get = (n) => metrics.find((x) => x.name === n)?.value ?? 0;
  return { task: get('TaskDuration'), script: get('ScriptDuration'), style: get('RecalcStyleDuration'), layout: get('LayoutDuration') };
}

async function openScene(page, sc) {
  await page.goto(`${BASE}?fast#/p/${tester.id}`);
  await page.locator('.map-screen').waitFor();
  if (sc.screen === 'start') {
    await page.goto(`${BASE}?fast#/`);
    await page.locator('.start-screen').waitFor();
    return;
  }
  if (sc.screen === 'map') return;
  const island = page.locator(`.island-${sc.island}`);
  await island.scrollIntoViewIfNeeded();
  await (sc.aim ? island.locator('.aim-node') : island.locator('.level-node').nth(sc.node)).click();
  await page.locator('.level-screen canvas').first().waitFor();
}

async function measure(browser, machine, sc, low) {
  const m = MACHINES[machine];
  const { context, page, cdp } = await newPage(browser, m, low);
  await openScene(page, sc);
  const level = !sc.screen;
  // Through the cards into play, untimed.
  if (level) for (let i = 0; i < 80 && !(await page.locator('.kb-guide[data-next]:not([data-next=""])').count()); i++) {
    await step(page);
    await page.waitForTimeout(250);
  }
  const heapStart = await heap(cdp);
  const trace = !flag('no-trace');
  if (trace) await browser.startTracing(page, { path: `${OUT}/${machine}${low ? '-low' : ''}-${sc.name}.json`, screenshots: false });
  await page.evaluate(() => { window.__perf.frames = []; window.__perf.long = 0; window.__perf.longMs = 0; window.__perf.on = true; });
  const b0 = await busy(cdp);
  const t0 = Date.now();
  const end = t0 + SECONDS * 1000;
  let endedAt = null;
  while (Date.now() < end) {
    if (level && endedAt === null && (await step(page)) === 'results') endedAt = Math.round(SECONDS - (end - Date.now()) / 1000);
    // About three keys a second, a child's steady pace.
    await page.waitForTimeout(level ? 330 : 500);
  }
  const p = await page.evaluate(() => { window.__perf.on = false; return window.__perf; });
  const b1 = await busy(cdp);
  const wall = (Date.now() - t0) / 1000;
  // Share of the wall time the main thread was busy, in %; script, style and layout of it.
  const share = (k) => Math.round((b1[k] - b0[k]) / wall * 1000) / 10;
  if (trace) await browser.stopTracing();
  const heapEnd = await heap(cdp);
  await context.close();
  const f = [...p.frames].sort((a, b) => a - b);
  return {
    scene: sc.name, machine: machine + (low ? '-low' : ''), frames: f.length,
    p50: +pct(f, 0.5).toFixed(1), p95: +pct(f, 0.95).toFixed(1), p99: +pct(f, 0.99).toFixed(1),
    over33: f.filter((x) => x > 34).length, long: p.long, longMs: Math.round(p.longMs),
    busy: share('task'), script: share('script'), style: share('style'), layout: share('layout'),
    heapStart, heapEnd, endedAt, level,
  };
}

/** Cold first load and the valley's first level on "Fast 3G": seconds to the map and to the level's first card, KB by kind until 5 s after each. */
async function load(browser) {
  const { context, page, cdp } = await newPage(browser, MACHINES.normal, false);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 562.5, downloadThroughput: 180 * 1024, uploadThroughput: 84 * 1024 });
  let phase = 'map';
  const bytes = { map: {}, level: {} };
  const kind = (url) => /\.webp$/.test(url) ? 'pictures' : /\.mp3$/.test(url) ? 'music' : /\.js$/.test(url) ? 'code' : /\.json$/.test(url) ? 'data' : 'other';
  cdp.on('Network.loadingFinished', (e) => {
    const k = urls.get(e.requestId) ?? 'other';
    bytes[phase][k] = (bytes[phase][k] ?? 0) + e.encodedDataLength;
  });
  const urls = new Map();
  cdp.on('Network.requestWillBeSent', (e) => urls.set(e.requestId, kind(e.request.url)));
  const t0 = Date.now();
  await page.goto(`${BASE}?fast#/p/${tester.id}`);
  await page.locator('.map-screen').waitFor();
  const toMap = (Date.now() - t0) / 1000;
  // The map downloads the play pictures in the background: the network does not go idle on a slow line, so a fixed while.
  await page.waitForTimeout(5000);
  phase = 'level';
  const t1 = Date.now();
  await page.locator('.island-dragons .level-node').first().click();
  await page.locator('.level-screen canvas').first().waitFor({ timeout: 180_000 });
  await page.locator('.posture-card, .newkey-card, .keys-intro, .story-screen').first().waitFor({ timeout: 180_000 });
  const toLevel = (Date.now() - t1) / 1000;
  await page.waitForTimeout(5000);
  await context.close();
  const kb = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v / 1024)]));
  return { toMap, toLevel, mapKB: kb(bytes.map), levelKB: kb(bytes.level) };
}

/** Heap after one level against after ten (each opened, played a few seconds and left). */
async function leak(browser) {
  const { context, page, cdp } = await newPage(browser, MACHINES.normal, false);
  const heaps = [];
  const listeners = [];
  for (let i = 0; i < 10; i++) {
    const sc = SCENES[i % 10];
    await openScene(page, sc);
    for (let k = 0; k < 20; k++) {
      await step(page);
      await page.waitForTimeout(250);
    }
    await page.goto(`${BASE}?fast#/p/${tester.id}`);
    await page.locator('.map-screen').waitFor();
    heaps.push(await heap(cdp));
    const { result } = await cdp.send('Runtime.evaluate', { expression: 'window' });
    const { listeners: l } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
    listeners.push(l.length);
  }
  await context.close();
  return { heaps, listeners };
}

function table(rows) {
  const head = '| scene | machine | frames | p50 | p95 | p99 | >33 ms | long tasks (ms) | busy % (script/style/layout) | heap MB start/end | ended at s |';
  const lines = rows.map((r) => `| ${r.scene} | ${r.machine} | ${r.frames} | ${r.p50} | ${r.p95} | ${r.p99} | ${r.over33} | ${r.long} (${r.longMs}) | ${r.busy} (${r.script}/${r.style}/${r.layout}) | ${r.heapStart}/${r.heapEnd} | ${r.endedAt ?? '-'} |`);
  return [head, '|---|---|---|---|---|---|---|---|---|---|---|', ...lines].join('\n');
}

let failed = false;
try {
  await waitForServer();
  const browser = await chromium.launch();
  const only = opt('only', '').split(',').filter(Boolean);
  const scenes = only.length ? SCENES.filter((s) => only.includes(s.name)) : SCENES;
  const which = opt('machine', 'normal');
  const machines = which === 'all' ? Object.keys(MACHINES) : which.split(',');
  const rows = [];
  if (!flag('load') && !flag('leak') || only.length) {
    for (const machine of machines) {
      for (const sc of scenes) {
        const r = await measure(browser, machine, sc, flag('low'));
        console.log(`${r.machine} ${r.scene}: p50 ${r.p50} p95 ${r.p95} p99 ${r.p99} >33 ${r.over33} long ${r.long} busy ${r.busy}% heap ${r.heapStart}/${r.heapEnd}`);
        rows.push(r);
        if (flag('budget') && r.level && r.p95 > BUDGET[machine]) {
          console.log(`  OVER BUDGET: p95 ${r.p95} ms > ${BUDGET[machine]} ms`);
          failed = true;
        }
      }
    }
    console.log(`\n${table(rows)}`);
  }
  if (flag('load')) console.log('\nload (Fast 3G, cold):', JSON.stringify(await load(browser)));
  if (flag('leak')) console.log('\nleak (heap MB and window listeners after each of ten levels):', JSON.stringify(await leak(browser)));
  writeFileSync(`${OUT}/last.json`, JSON.stringify(rows, null, 1));
  await browser.close();
} catch (e) {
  console.error(e);
  failed = true;
} finally {
  stopServer();
}
process.exit(failed ? 1 : 0);
