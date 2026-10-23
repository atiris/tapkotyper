// Turns the raw Gemini images and music in assets-src/ into small web files in
// public/assets/ and writes public/assets/manifest.json. Run with `npm run assets`.
import { readdir, mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, parse } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';

const SRC = 'assets-src';
const OUT = 'public/assets';
const SPRITE_MAX = 384;
const BG_WIDTH = 1920;
// Parallax layers drawn as close-up strips are placed into a frame of this size.
const FRAME_W = 1376;
const FRAME_H = 768;
// Height of each strip layer as a fraction of the frame (the values in PROMPTS.md).
const STRIP_HEIGHT = {
  'bg-meadow-mid': 0.45, 'bg-meadow-near': 0.25,
  'bg-planet-mid': 0.5, 'bg-planet-near': 0.3,
  'bg-dragons-mid': 0.45, 'bg-dragons-near': 0.25,
  'bg-egg-mid': 0.5, 'bg-egg-near': 0.2,
  'bg-junkyard-mid': 0.45, 'bg-junkyard-near': 0.25,
  'bg-workshop-mid': 0.45, 'bg-workshop-near': 0.25,
  'bg-raintown-mid': 0.4, 'bg-raintown-near': 0.2,
  'bg-robocity-mid': 0.4, 'bg-robocity-near': 0.2,
  'bg-robohome-mid': 0.4, 'bg-robohome-near': 0.2,
  'bg-garden-mid': 0.45, 'bg-garden-near': 0.25,
  'bg-forestpath-mid': 0.5, 'bg-forestpath-near': 0.25,
  'bg-lilylake-mid': 0.4, 'bg-lilylake-near': 0.2,
  'bg-musictree-mid': 0.45, 'bg-musictree-near': 0.2,
  'bg-moonball-mid': 0.4, 'bg-moonball-near': 0.2,
};
// A layer at least this wide (width / height) is a strip (generated at 21:9); older
// 16:9 layer files keep their content in the lower part and are used as they are.
const STRIP_ASPECT = 2;

// Keying works on the RGB distance from the sampled background color.
const D_FLOOD = 70; // border-connected background
const D_ENCLOSED = 38; // enclosed gaps (between arm and body)
const D_SOFT = 120; // edge feather: fully opaque above this distance
// Glass lenses on outfits: how much the key channel dominates the others.
const K_LENS = 150;
const K_GLASS = 70; // light key-tinted reflections at a lens edge become white glass
const K_SHINE = 20; // inside a lens even a pale key tint is a painted highlight

// Outfit sets: item ids, slots and a pixel classifier (normalized x, y in 0..1).
// The first rule that matches wins; the last rule is the fallback.
const near = (x, y, ax, ay, bx, by, r) => {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - ax - t * dx, y - ay - t * dy) < r;
};
const nearPath = (x, y, pts, r) => pts.some((p, i) => i > 0 && near(x, y, pts[i - 1][0], pts[i - 1][1], p[0], p[1], r));
const BALLOON_STRING = [[0.828, 0.33], [0.818, 0.44], [0.79, 0.55], [0.75, 0.64], [0.712, 0.72], [0.69, 0.78]];
const OUTFITS = {
  a: [['cap', 'head', (x, y) => y < 0.28], ['round-glasses', 'eyes', (x, y) => y < 0.45], ['scarf', 'neck', (x, y) => y < 0.75], ['sneakers', 'feet', () => true]],
  b: [['crown', 'head', (x, y) => y < 0.2], ['star-glasses', 'eyes', (x, y) => y < 0.44 && x > 0.3 && x < 0.7], ['bow-tie', 'neck', (x, y) => x > 0.4 && x < 0.6 && y > 0.48 && y < 0.6], ['butterfly-wings', 'back', () => true]],
  c: [['wizard-hat', 'head', (x, y) => y < 0.3], ['wand', 'hand', (x, y) => near(x, y, 0.68, 0.75, 0.79, 0.575, 0.016) || Math.hypot(x - 0.787, y - 0.565) < 0.045], ['boots', 'feet', (x, y) => y > 0.795 && x > 0.355 && x < 0.645], ['star-cape', 'back', () => true]],
  d: [['flower-wreath', 'head', (x, y) => y < 0.3], ['rain-boots', 'feet', (x, y) => y > 0.76], ['backpack', 'back', (x, y, r, g, b) => r > 170 && g > 70 && g < 160 && b < 90 && r - g > 70], ['knit-vest', 'body', () => true]],
  e: [['balloon', 'hand', (x, y) => ((x - 0.835) / 0.13) ** 2 + ((y - 0.19) / 0.165) ** 2 < 1 || nearPath(x, y, BALLOON_STRING, 0.011) || y > 0.62 && x > 0.6], ['beanie', 'head', (x, y) => y < 0.32], ['neckerchief', 'neck', (x) => x > 0.352 && x < 0.647], ['dragon-wings', 'back', () => true]],
  f: [['hair-bow', 'head', (x, y) => y < 0.25], ['heart-glasses', 'eyes', (x, y) => y < 0.46], ['star-shirt', 'body', (x, y) => y < 0.76], ['pink-sneakers', 'feet', () => true]],
  g: [['explorer-hat', 'head', (x, y) => y < 0.3], ['lantern', 'hand', (x) => x < 0.35], ['explorer-vest', 'body', (x, y) => y < 0.76], ['green-boots', 'feet', () => true]],
};

// Accessories that never were part of an outfit set: drawn alone (`acc-<id>`).
// `tint`: lenses become this semi-transparent color instead of clear glass.
const SINGLES = {
  sunglasses: { slot: 'eyes', tint: [40, 32, 52, 0.5] },
  // Story 2 rewards.
  umbrella: { slot: 'head' },
  raincoat: { slot: 'body' },
  'hard-hat': { slot: 'head' },
  goggles: { slot: 'eyes' },
  jetpack: { slot: 'back' },
  'antenna-band': { slot: 'head' },
  // Story 3 rewards.
  feather: { slot: 'head' },
  harp: { slot: 'hand' },
  'fairy-wings': { slot: 'back' },
  // Wardrobe additions.
  'hero-cape': { slot: 'back' },
  chain: { slot: 'neck' },
  medallion: { slot: 'neck' },
  'hair-clip': { slot: 'head' },
  'walking-stick': { slot: 'hand' },
  'white-gloves': { slot: 'hand' },
  'black-gloves': { slot: 'hand' },
  'eye-mask': { slot: 'eyes' },
  'carnival-mask': { slot: 'eyes' },
};

const run = promisify(execFile);

function sampleKey(data, w, h) {
  // The most saturated corner is the key; corners covered by artwork (the ground
  // of a background layer) are left out of the average.
  const corners = [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]].map(([x, y]) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  });
  const chroma = (c) => Math.max(...c) - Math.min(...c);
  const ref = corners.reduce((a, b) => (chroma(b) > chroma(a) ? b : a));
  const same = corners.filter((c) => Math.hypot(c[0] - ref[0], c[1] - ref[1], c[2] - ref[2]) < 60);
  return [0, 1, 2].map((ch) => same.reduce((a, c) => a + c[ch], 0) / same.length);
}

/** Removes the flat key background in place (RGBA buffer). */
function keyOut(data, w, h, { glass = false, layer = false, tint = null } = {}) {
  const key = sampleKey(data, w, h);
  const green = key[1] > key[0] && key[1] > key[2];
  const kKey = green ? key[1] - Math.max(key[0], key[2]) : Math.min(key[0], key[2]) - key[1];
  const n = w * h;
  const dist = new Float32Array(n);
  const k = new Int16Array(n);
  for (let p = 0; p < n; p++) {
    const r = data[p * 4], g = data[p * 4 + 1], b = data[p * 4 + 2];
    dist[p] = Math.hypot(r - key[0], g - key[1], b - key[2]);
    k[p] = green ? g - Math.max(r, b) : Math.min(r, b) - g;
  }

  // 1. Flood fill from the border.
  const removed = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0, tail = 0;
  // Background layers have shaded key pockets between grass blades: the flood
  // follows the key tint into them.
  const seed = (p) => { if (!removed[p] && (dist[p] < D_FLOOD || layer && k[p] > kKey * 0.3)) { removed[p] = 1; queue[tail++] = p; } };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
  while (head < tail) {
    const p = queue[head++];
    const x = p % w, y = (p / w) | 0;
    if (x > 0) seed(p - 1);
    if (x < w - 1) seed(p + 1);
    if (y > 0) seed(p - w);
    if (y < h - 1) seed(p + w);
  }
  // 2. Enclosed gaps that match the key closely (and glass lenses, and strongly
  // tinted pockets of background layers).
  const enclosed = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    if (!removed[p] && (dist[p] < D_ENCLOSED || glass && k[p] > K_LENS || layer && k[p] > kKey * 0.6)) { removed[p] = 1; enclosed[p] = 1; }
  }

  // 3. Pixels up to 2 px from removed ones form the edge feather band.
  const band = new Uint8Array(n);
  const nearEnclosed = new Uint8Array(n);
  const shine = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    if (removed[p]) continue;
    const x = p % w, y = (p / w) | 0;
    search: for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const q = yy * w + xx;
        if (removed[q]) { band[p] = 1; if (enclosed[q]) nearEnclosed[p] = 1; break search; }
      }
    }
  }
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (removed[p]) {
      if (tint && enclosed[p]) { data[i] = tint[0]; data[i + 1] = tint[1]; data[i + 2] = tint[2]; data[i + 3] = Math.round(tint[3] * 255); }
      else data[i + 3] = 0;
      continue;
    }
    // A painted highlight is light; a darker green item (vest, boots) never is.
    const light = Math.min(data[i], data[i + 1], data[i + 2]) > 140;
    if (glass && (k[p] > K_GLASS || light && k[p] > K_SHINE) && (nearEnclosed[p] && k[p] > K_GLASS || isInsideEnclosed(p, enclosed, w))) {
      // Light reflection on a glass lens: semi-transparent white.
      data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 110;
      shine[p] = 1;
      continue;
    }
    if (!band[p]) continue;
    // Edge alpha from the color distance, and from the key tint: a pixel mixed with
    // the key keeps some of its dominance, though far from the key in RGB.
    const aDist = Math.min(1, (dist[p] - D_ENCLOSED) / (D_SOFT - D_ENCLOSED));
    const aTint = 1 - Math.max(0, k[p]) / kKey;
    const a = Math.max(0.05, Math.min(aDist, aTint));
    if (a >= 1) continue;
    // Unmix the edge pixel: observed = a * color + (1 - a) * key.
    for (let c = 0; c < 3; c++) data[i + c] = Math.max(0, Math.min(255, Math.round((data[i + c] - (1 - a) * key[c]) / a)));
    // Despill: a shadowed key tint survives the unmix; take it out of the key
    // channels, and on background layers fade such pixels out.
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const spill = green ? g - Math.max(r, b) : Math.min(r, b) - g;
    let fade = 1;
    if (spill > 0) {
      if (green) data[i + 1] = g - spill;
      else { data[i] = r - spill; data[i + 2] = b - spill; }
      if (layer) fade = Math.max(0, 1 - spill / 40);
    }
    data[i + 3] = Math.round(data[i + 3] * a * fade);
  }
  if (glass) growShine(data, w, h, k, shine, removed);
  bleedColor(data, w, h);
}

/**
 * The ends of a reflection stripe touch the lens frame, so they are not found
 * inside the lens; key-tinted pixels touching a reflection join it.
 */
function growShine(data, w, h, k, shine, removed) {
  const queue = [];
  for (let p = 0; p < w * h; p++) if (shine[p]) queue.push(p);
  while (queue.length) {
    const p = queue.pop();
    const x = p % w;
    for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
      if (q < 0 || q >= w * h || shine[q] || removed[q] || k[q] <= K_SHINE) continue;
      shine[q] = 1;
      data.fill(255, q * 4, q * 4 + 3);
      data[q * 4 + 3] = 110;
      queue.push(q);
    }
  }
}

// Lossy WebP mixes the color of transparent pixels into their visible neighbors,
// so transparent pixels take the color of the nearest visible pixel in their row.
function bleedColor(data, w, h) {
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let last = -1;
    for (let x = 0; x < w; x++) {
      const i = (row + x) * 4;
      if (data[i + 3] > 0) {
        if (last < 0) for (let j = row * 4; j < i; j += 4) data.copy(data, j, i, i + 3);
        last = i;
      } else if (last >= 0) data.copy(data, i, last, last + 3);
    }
  }
}

// A reflection stripe inside a lens: enclosed key pixels on both sides along a row.
function isInsideEnclosed(p, enclosed, w) {
  const x = p % w, row = p - x;
  let left = false, right = false;
  for (let d = 1; d < 40 && !(left && right); d++) {
    if (!left && x - d >= 0 && enclosed[row + x - d]) left = true;
    if (!right && x + d < w && enclosed[row + x + d]) right = true;
  }
  return left && right;
}

async function loadRgba(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function bbox(data, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > 10) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  const pad = 3;
  return { left: Math.max(0, x0 - pad), top: Math.max(0, y0 - pad), width: Math.min(w, x1 + pad + 1) - Math.max(0, x0 - pad), height: Math.min(h, y1 + pad + 1) - Math.max(0, y0 - pad) };
}

const webp = (img) => img.webp({ quality: 84, alphaQuality: 90, effort: 5 });

async function writeSquare(name, data, w, h, manifest) {
  await webp(sharp(data, { raw: { width: w, height: h, channels: 4 } }).resize(SPRITE_MAX, SPRITE_MAX)).toFile(join(OUT, `${name}.webp`));
  manifest.images[name] = { w: SPRITE_MAX, h: SPRITE_MAX };
}

async function processImage(name, file, manifest) {
  if (name.startsWith('bg-') && name.endsWith('-far')) {
    const out = sharp(file).resize({ width: BG_WIDTH, withoutEnlargement: true });
    const info = await webp(out).toFile(join(OUT, `${name}.webp`));
    manifest.images[name] = { w: info.width, h: info.height };
    return;
  }
  const { data, w, h } = await loadRgba(file);
  if (name.startsWith('outfit-')) return processOutfit(name.slice(7), data, w, h, manifest);
  if (name.startsWith('acc-')) return processAccessory(name.slice(4), data, w, h, manifest);
  keyOut(data, w, h, { layer: name.startsWith('bg-') });
  // Bolt's pictures stay square, so the raincoat overlay fits every one of them; Melody's keep her size in every mood.
  if (name === 'base-template' || name.startsWith('tapko-') || name.startsWith('robot') || name.startsWith('fairy-')) return writeSquare(name, data, w, h, manifest);
  if (STRIP_HEIGHT[name] && w >= h * STRIP_ASPECT) return writeStrip(name, data, w, h, bbox(data, w, h), manifest);
  if (name.startsWith('bg-')) {
    const info = await webp(sharp(data, { raw: { width: w, height: h, channels: 4 } }).resize({ width: BG_WIDTH, withoutEnlargement: true })).toFile(join(OUT, `${name}.webp`));
    manifest.images[name] = { w: info.width, h: info.height };
    return;
  }
  const box = bbox(data, w, h);
  const info = await webp(sharp(data, { raw: { width: w, height: h, channels: 4 } }).extract(box).resize(SPRITE_MAX, SPRITE_MAX, { fit: 'inside', withoutEnlargement: true })).toFile(join(OUT, `${name}.webp`));
  manifest.images[name] = { w: info.width, h: info.height };
}

/**
 * A close-up strip: scaled to its target height, repeated across the frame (a whole
 * number of copies is fitted in) and placed at the bottom of a transparent frame.
 */
async function writeStrip(name, data, w, h, box, manifest) {
  const stripH = Math.round(FRAME_H * STRIP_HEIGHT[name]);
  // The 3 px bbox padding at the sides would leave gaps between the copies.
  const crop = { ...box, left: 0, width: w };
  // A whole number of copies side by side: the picture's left and right edges join.
  const copies = Math.max(1, Math.round(FRAME_W / (w * stripH / crop.height)));
  const tileW = Math.round(FRAME_W / copies);
  const tile = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).extract(crop).resize(tileW, stripH, { fit: 'fill' }).png().toBuffer();
  const row = await sharp({ create: { width: tileW * copies, height: stripH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(Array.from({ length: copies }, (_, i) => ({ input: tile, left: i * tileW, top: 0 }))).png().toBuffer();
  const fitted = await sharp(row).resize(FRAME_W, stripH, { fit: 'fill' }).png().toBuffer();
  const frame = await sharp({ create: { width: FRAME_W, height: FRAME_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fitted, left: 0, top: FRAME_H - stripH }]).raw().toBuffer();
  bleedColor(frame, FRAME_W, FRAME_H);
  const info = await webp(sharp(frame, { raw: { width: FRAME_W, height: FRAME_H, channels: 4 } })).toFile(join(OUT, `${name}.webp`));
  manifest.images[name] = { w: info.width, h: info.height };
}

/** Ids that have their own `acc-<id>` source, which replaces the item cut from its outfit. */
const singleAccessories = new Set();

/** One accessory drawn alone on the template position (no other item can cut it). */
async function processAccessory(id, data, w, h, manifest) {
  // The front part of a back item (a cape's clasp), drawn over the body.
  if (id.endsWith('-front')) {
    keyOut(data, w, h);
    return writeSquare(`acc-${id}`, data, w, h, manifest);
  }
  const single = SINGLES[id] && { rid: id, slot: SINGLES[id].slot, set: 'single', tint: SINGLES[id].tint };
  const entry = single ?? Object.entries(OUTFITS).flatMap(([set, rules]) => rules.map(([rid, slot]) => ({ rid, slot, set }))).find((r) => r.rid === id);
  if (!entry) { console.warn(`acc-${id}: not in an outfit table nor in SINGLES, skipped`); return; }
  // Only glasses have lenses; elsewhere the lens rules would eat thin key-mixed lines (a chain).
  keyOut(data, w, h, { glass: entry.slot === 'eyes', tint: entry.tint ?? null });
  singleAccessories.add(id);
  await writeAccessory(id, entry.slot, entry.set, data, w, h, manifest);
}

async function writeAccessory(id, slot, set, data, w, h, manifest) {
  await writeSquare(`acc-${id}`, data, w, h, manifest);
  // Trimmed thumbnail for the wardrobe.
  const box = bbox(data, w, h);
  await webp(sharp(data, { raw: { width: w, height: h, channels: 4 } }).extract(box).resize(160, 160, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })).toFile(join(OUT, `acc-${id}-thumb.webp`));
  manifest.images[`acc-${id}-thumb`] = { w: 160, h: 160 };
  manifest.accessories.push({ id, slot, set });
}

async function processOutfit(set, data, w, h, manifest) {
  const rules = OUTFITS[set];
  if (!rules) { console.warn(`outfit-${set}: no item table, skipped`); return; }
  keyOut(data, w, h, { glass: true });
  const layers = rules.map(() => Buffer.alloc(w * h * 4));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (data[i + 3] === 0) continue;
    const idx = rules.findIndex(([, , test]) => test(x / w, y / h, data[i], data[i + 1], data[i + 2]));
    data.copy(layers[idx], i, i, i + 4);
  }
  for (const [j, [id, slot]] of rules.entries()) {
    if (!singleAccessories.has(id)) await writeAccessory(id, slot, set, layers[j], w, h, manifest);
  }
}

async function processMusic(name, file, manifest) {
  const out = join(OUT, `${name}.mp3`);
  await run(ffmpeg, ['-y', '-loglevel', 'error', '-i', file, '-ac', '1', '-ar', '44100', '-b:a', '60k', '-af', 'loudnorm=I=-20:TP=-2:LRA=11', '-map_metadata', '-1', out]);
  manifest.music.push(name);
}

async function main() {
  if (!existsSync(SRC)) { console.log('assets-src/ is missing, nothing to do'); return; }
  // An optional name prefix reprocesses only matching files and keeps the manifest.
  const only = process.argv[2];
  if (!only) await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const manifest = { images: {}, accessories: [], music: [] };
  for (const entry of (await readdir(SRC)).sort()) {
    const { name, ext } = parse(entry);
    if (only && !name.startsWith(only)) continue;
    const file = join(SRC, entry);
    const e = ext.toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(e)) await processImage(name, file, manifest);
    else if (['.mp3', '.wav', '.m4a', '.ogg'].includes(e)) await processMusic(name, file, manifest);
    else continue;
    console.log('ok', name);
  }
  if (!only) await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
}

await main();
