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
const ICON_MAX = 512; // ui-icon is also the app icon (scripts/icons.mjs), ui-icon-hr the start page's large logo
// The certificate's frame comes from one top-left corner (measured on the 1024 px source): a band with
// a sleeping fox in the corner and pairs of paw prints along both arms. The page draws the band itself
// (CSS, its colors and widths measured here) and lays on it the fox, cut out and turned into every
// corner, and the paw pairs, repeated with even gaps so they always walk round clockwise.
const FRAME = 'ui-cert-frame';
const FRAME_SRC = 1024;
/** The fox's square from the corner (shifted FOX_X px right, so the band's outer edge lies 88.5 px in from its top and its left). */
const FOX_SIZE = 372;
const FOX_X = 2;
/** A point inside the fox, and the row under its tail (a paw print touches the tail from below). */
const FOX_SEED = [160, 180];
const FOX_BOTTOM = 355;
/** One pair of paw prints on the left arm, toes up: its rows, and the arm's columns. */
const PAWS_ROWS = [452, 534];
const PAWS_COLS = [90, 232];
/** Plain places of the arms (no fox, no prints), to tell them from the band: a column of the top arm, a row of the left arm. */
const PLAIN_COL = 800;
const PLAIN_ROW = 800;
// The parrot's signature on the certificate is printed a few centimetres wide.
const STAMP_MAX = 640;
const BG_WIDTH = 1920;
// The flying parrot's wing-beat pictures (obj-parrot-flying, -2, -3, -4) take one shared crop, so they lie on each other.
const FLAP = 'obj-parrot-flying';
// The start page's meadow (day and night) repeats across the window: its left and right edges are
// blended into each other over this part of its width.
const MEADOW = 'ui-start-meadow';
const MEADOW_SEAM = 0.1;
// The night meadow is the day one with its flowers closed, drawn in day colors: scaled to the day
// picture's size (so its plants lie on the day ones) and recolored to the night palette.
const MEADOW_CLOSED = 'ui-start-meadow-closed';

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
function keyOut(data, w, h, { glass = false, layer = false, tint = null, pocket = 0.6 } = {}) {
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
    if (!removed[p] && (dist[p] < D_ENCLOSED || glass && k[p] > K_LENS || layer && k[p] > kKey * pocket)) { removed[p] = 1; enclosed[p] = 1; }
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

// The flap pictures at the first one's size, keyed out, toned like the first one, and the box around all of them.
let flapCache = null;
function flapFrames() {
  flapCache ??= (async () => {
    const files = (await readdir(SRC)).filter((f) => parse(f).name.startsWith(FLAP)).sort().map((f) => join(SRC, f));
    const base = await sharp(files[0]).metadata();
    const frames = new Map();
    for (const file of files) {
      const { data, info } = await sharp(file).resize(base.width, base.height, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      keyOut(data, info.width, info.height, { layer: false });
      frames.set(file, data);
    }
    matchTone([...frames.values()], base.width * base.height);
    const boxes = [...frames.values()].map((d) => bbox(d, base.width, base.height));
    const left = Math.min(...boxes.map((b) => b.left)), top = Math.min(...boxes.map((b) => b.top));
    const box = { left, top, width: Math.max(...boxes.map((b) => b.left + b.width)) - left, height: Math.max(...boxes.map((b) => b.top + b.height)) - top };
    return { frames, box, w: base.width, h: base.height };
  })();
  return flapCache;
}

// Gemini draws each frame a little lighter or darker: every frame gets the first one's mean color, per channel,
// measured on the pixels all frames cover (the body, head and tail, which do not move).
function matchTone(frames, n) {
  const mean = (d) => {
    const sum = [0, 0, 0];
    let count = 0;
    for (let p = 0; p < n; p++) {
      if (frames.some((f) => f[p * 4 + 3] < 250)) continue;
      for (let c = 0; c < 3; c++) sum[c] += d[p * 4 + c];
      count++;
    }
    return sum.map((s) => s / Math.max(1, count));
  };
  const target = mean(frames[0]);
  for (const d of frames.slice(1)) {
    const gain = mean(d).map((m, c) => target[c] / Math.max(1, m));
    for (let p = 0; p < n; p++) for (let c = 0; c < 3; c++) d[p * 4 + c] = Math.min(255, Math.round(d[p * 4 + c] * gain[c]));
  }
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
  if (name === MEADOW_CLOSED) return writeNightMeadow(file, manifest);
  if (name.startsWith(FLAP)) {
    const { frames, box, w, h } = await flapFrames();
    const info = await webp(sharp(frames.get(file), { raw: { width: w, height: h, channels: 4 } }).extract(box).resize(SPRITE_MAX, SPRITE_MAX, { fit: 'inside', withoutEnlargement: true })).toFile(join(OUT, `${name}.webp`));
    manifest.images[name] = { w: info.width, h: info.height };
    return;
  }
  const { data, w, h } = await loadRgba(file);
  if (name.startsWith('outfit-')) return processOutfit(name.slice(7), data, w, h, manifest);
  if (name.startsWith('acc-')) return processAccessory(name.slice(4), data, w, h, manifest);
  // The meadow's grass leaves many small shaded key pockets, which the strips' threshold keeps as purple specks.
  keyOut(data, w, h, name.startsWith(MEADOW) ? { layer: true, pocket: 0.3 } : { layer: name.startsWith('bg-') });
  // Bolt's pictures stay square, so the raincoat overlay fits every one of them; Melody's keep her size in every mood.
  if (name === 'base-template' || name.startsWith('tapko-') || name.startsWith('robot') || name.startsWith('fairy-')) return writeSquare(name, data, w, h, manifest);
  if (name === FRAME) return writeFrame(file, data, w, h, manifest);
  if (name.startsWith(MEADOW)) return writeTile(name, data, w, h, bbox(data, w, h), manifest);
  if (name.startsWith('bg-')) {
    // A mid or near layer (1376 x 768, its band on the key; see scripts/bg-seam.mjs): the colors
    // bleed into the cleared key, so scaling in the game shows no key fringe.
    bleedColor(data, w, h);
    const info = await webp(sharp(data, { raw: { width: w, height: h, channels: 4 } }).resize({ width: BG_WIDTH, withoutEnlargement: true })).toFile(join(OUT, `${name}.webp`));
    manifest.images[name] = { w: info.width, h: info.height };
    return;
  }
  const box = bbox(data, w, h);
  const max = name.startsWith('ui-icon') ? ICON_MAX : name === 'ui-cert-parrot' ? STAMP_MAX : SPRITE_MAX;
  const info = await webp(sharp(data, { raw: { width: w, height: h, channels: 4 } }).extract(box).resize(max, max, { fit: 'inside', withoutEnlargement: true })).toFile(join(OUT, `${name}.webp`));
  manifest.images[name] = { w: info.width, h: info.height };
}

/**
 * The certificate frame's pictures from its keyed source `data`: `ui-cert-fox` (the fox alone, the page
 * turns it into each corner) and one pair of paw prints alone, `ui-cert-paws-up` and `ui-cert-paws-right`.
 * They are told from the band by comparing every pixel of the raw source with the plain band at its place.
 */
async function writeFrame(file, data, w, h, manifest) {
  if (w !== FRAME_SRC || h !== FRAME_SRC) throw new Error(`${file}: the cut lines are measured on a ${FRAME_SRC} px square`);
  const raw = await sharp(file).removeAlpha().raw().toBuffer();
  const rgb = (x, y) => raw.subarray((y * w + x) * 3, (y * w + x) * 3 + 3);
  // The plain band (or the key outside it) at (x, y): the top arm's profile above the corner's diagonal, the left arm's below it.
  const plain = (x, y) => (y - 88 <= x - 90 ? rgb(PLAIN_COL, y) : rgb(x, PLAIN_ROW));
  const differs = (x, y, limit) => {
    const a = rgb(x, y), b = plain(x, y);
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > limit;
  };
  // Pixels of the box x0..x1, y0..y1 picked by `keep`, grown by one pixel for the soft edge, cut out of the keyed picture.
  const cut = (x0, y0, x1, y1, keep) => {
    const bw = x1 - x0, bh = y1 - y0;
    const out = Buffer.alloc(bw * bh * 4);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1 && !near; dx++) near = keep(x + dx, y + dy);
      if (near) data.copy(out, (y * bw + x) * 4, ((y + y0) * w + x + x0) * 4, ((y + y0) * w + x + x0) * 4 + 4);
    }
    return { out, bw, bh };
  };
  // The fox: everything unlike the band joined to its middle, with the holes inside it filled (band lines it covers).
  const n = FOX_SIZE * FOX_SIZE;
  const fox = new Uint8Array(n);
  const flood = (mark, start, ok) => {
    const queue = [...start];
    for (const p of queue) mark[p] = 1;
    while (queue.length) {
      const p = queue.pop();
      const x = p % FOX_SIZE, y = (p / FOX_SIZE) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy, q = yy * FOX_SIZE + xx;
        if (xx < 0 || yy < 0 || xx >= FOX_SIZE || yy >= FOX_SIZE || mark[q] || !ok(xx, yy)) continue;
        mark[q] = 1;
        queue.push(q);
      }
    }
  };
  flood(fox, [FOX_SEED[1] * FOX_SIZE + FOX_SEED[0]], (x, y) => y < FOX_BOTTOM && differs(x + FOX_X, y, 70));
  // Where the fox's outline lay on a band line it looked like the band: dark pixels close to the fox are its outline.
  const dark = (x, y) => { const c = rgb(x + FOX_X, y); return c[0] < 140 && c[1] < 110 && c[2] < 100; };
  const near = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (fox[(y + dy) * FOX_SIZE + x + dx]) return true; return false; };
  const outline = [];
  for (let y = 3; y < FOX_BOTTOM; y++) for (let x = 3; x < FOX_SIZE - 3; x++) if (!fox[y * FOX_SIZE + x] && dark(x, y) && near(x, y, 3)) outline.push(y * FOX_SIZE + x);
  for (const q of outline) fox[q] = 1;
  const outside = new Uint8Array(n);
  const edge = [];
  for (let i = 0; i < FOX_SIZE; i++) edge.push(i, (FOX_SIZE - 1) * FOX_SIZE + i, i * FOX_SIZE, i * FOX_SIZE + FOX_SIZE - 1);
  flood(outside, edge.filter((p) => !fox[p]), (x, y) => !fox[y * FOX_SIZE + x]);
  const inFox = (x, y) => x >= 0 && y >= 0 && x < FOX_SIZE && y < FOX_SIZE && !outside[y * FOX_SIZE + x];
  const f = cut(FOX_X, 0, FOX_X + FOX_SIZE, FOX_SIZE, inFox);
  await webp(sharp(f.out, { raw: { width: f.bw, height: f.bh, channels: 4 } })).toFile(join(OUT, 'ui-cert-fox.webp'));
  manifest.images['ui-cert-fox'] = { w: f.bw, h: f.bh };
  // The paw pair: everything unlike the band in one stretch of the left arm.
  const [c0, c1] = PAWS_COLS, [r0, r1] = PAWS_ROWS;
  const paw = (x, y) => x >= 0 && y >= 0 && x < c1 - c0 && y < r1 - r0 && differs(x + c0, y + r0, 50);
  const t = cut(c0, r0, c1, r1, paw);
  const tile = sharp(t.out, { raw: { width: t.bw, height: t.bh, channels: 4 } });
  await webp(tile.clone()).toFile(join(OUT, 'ui-cert-paws-up.webp'));
  await webp(tile.clone().rotate(90)).toFile(join(OUT, 'ui-cert-paws-right.webp'));
  manifest.images['ui-cert-paws-up'] = { w: t.bw, h: t.bh };
  manifest.images['ui-cert-paws-right'] = { w: t.bh, h: t.bw };
}

/**
 * A strip that the page repeats side by side: cut from the top of the tallest piece down and
 * shortened by the seam. In the seam the picture's right end lies over its left one, both whole
 * (a cross-fade left see-through ghosts), each fading in only near its own cut edge.
 */
async function writeTile(name, data, w, h, box, manifest) {
  const seam = Math.round(box.width * MEADOW_SEAM);
  const tw = box.width - seam;
  const out = Buffer.alloc(tw * box.height * 4);
  const ramp = (v) => Math.min(1, Math.max(0, v * 3));
  for (let y = 0; y < box.height; y++) for (let x = 0; x < tw; x++) {
    const a = ((box.top + y) * w + box.left + x) * 4;
    const d = (y * tw + x) * 4;
    if (x >= seam) { data.copy(out, d, a, a + 4); continue; }
    // Column x also continues the column tw further on, where the previous copy ends.
    const b = a + tw * 4;
    const t = x / seam;
    const top = data[b + 3] / 255 * ramp(1 - t);
    const under = data[a + 3] / 255 * ramp(t);
    const alpha = top + under * (1 - top);
    for (let c = 0; c < 3; c++) out[d + c] = alpha ? Math.round((data[b + c] * top + data[a + c] * under * (1 - top)) / alpha) : data[a + c];
    out[d + 3] = Math.round(alpha * 255);
  }
  bleedColor(out, tw, box.height);
  const info = await webp(sharp(out, { raw: { width: tw, height: box.height, channels: 4 } })).toFile(join(OUT, `${name}.webp`));
  manifest.images[name] = { w: info.width, h: info.height };
}

/** The night meadow: the closed flowers cut out like the day meadow, in the night's colors. */
async function writeNightMeadow(file, manifest) {
  const day = await sharp(join(SRC, `${MEADOW}.jpg`)).metadata();
  const { data, info } = await sharp(file).resize(day.width, day.height, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [w, h] = [info.width, info.height];
  keyOut(data, w, h, { layer: true, pocket: 0.3 });
  nightColors(data);
  return writeTile(`${MEADOW}-night`, data, w, h, bbox(data, w, h), manifest);
}

/**
 * Moonlight: the greens turn into a dark blue-green (the night meadow's palette), the flowers keep
 * their colors a little darker and bluer, so the daisies stay pale and the buttercups golden.
 */
function nightColors(data) {
  const moon = [138, 134, 184];
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) continue;
    const [hue, sat, light] = toHsl(data[i], data[i + 1], data[i + 2]);
    // Greens fully, the rest not at all, with a soft edge between them; the key's purple left in
    // the grass's shaded pockets and the grey of see-through edges turn into grass too.
    const residue = (hue > 280 && (hue < 320 || (hue < 335 && sat < 0.45))) || (data[i + 3] < 255 && sat < 0.2 && light < 0.7);
    const green = residue ? 1 : Math.min(1, Math.max(0, Math.min(hue - 50, 180 - hue) / 15)) * Math.min(1, sat / 0.12);
    const grass = fromHsl(174, Math.min(Math.max(sat, 0.3), 0.42), 0.07 + 0.4 * light);
    const flower = fromHsl(hue, sat * 0.9, light * 0.82).map((v, c) => v * 0.85 + moon[c] * 0.15);
    for (let c = 0; c < 3; c++) data[i + c] = Math.round(grass[c] * green + flower[c] * (1 - green));
  }
}

function toHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const hue = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [hue * 60, d / (1 - Math.abs(2 * l - 1)), l];
}

function fromHsl(hue, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((hue / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
  return [r, g, b].map((v) => (v + m) * 255);
}

/** Ids that have their own `acc-<id>` source, which replaces the item cut from its outfit. */
const singleAccessories = new Set();
/** Ids whose wardrobe thumbnail comes from a whole `acc-<id>-full` picture (the worn one is cut for the paw). */
const fullThumbs = new Set();

/** One accessory drawn alone on the template position (no other item can cut it). */
async function processAccessory(id, data, w, h, manifest) {
  // The front part of a back item (a cape's clasp), drawn over the body.
  if (id.endsWith('-front')) {
    keyOut(data, w, h);
    return writeSquare(`acc-${id}`, data, w, h, manifest);
  }
  if (id.endsWith('-full')) {
    keyOut(data, w, h);
    return writeThumb(id.slice(0, -5), data, w, h, manifest);
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
  if (!fullThumbs.has(id)) await writeThumb(id, data, w, h, manifest);
  manifest.accessories.push({ id, slot, set });
}

/** Trimmed thumbnail for the wardrobe. */
async function writeThumb(id, data, w, h, manifest) {
  const box = bbox(data, w, h);
  await webp(sharp(data, { raw: { width: w, height: h, channels: 4 } }).extract(box).resize(160, 160, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })).toFile(join(OUT, `acc-${id}-thumb.webp`));
  manifest.images[`acc-${id}-thumb`] = { w: 160, h: 160 };
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
  const entries = (await readdir(SRC)).sort();
  for (const entry of entries) {
    const { name } = parse(entry);
    if (name.startsWith('acc-') && name.endsWith('-full')) fullThumbs.add(name.slice(4, -5));
  }
  for (const entry of entries) {
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
