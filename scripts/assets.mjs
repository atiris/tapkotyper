// Turns the raw Gemini images and music in assets-src/ into small web files in
// public/assets/ and writes public/assets/manifest.json. Run with `npm run assets`.
import { readdir, mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, parse } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { bleedColor, keyOut } from './key.mjs';

const SRC = 'assets-src';
const OUT = 'public/assets';
const SPRITE_MAX = 384;
const ICON_MAX = 512; // ui-icon is also the app icon (scripts/icons.mjs), ui-icon-hr the start page's large logo
// The certificate frame's pieces, in assets-src/cert-src as lossless PNGs already turned for their
// corner or side (made by scripts/cert-frame.mjs, checked by hand): a fox per corner, a pair of paw
// prints and a one-pixel row of the band per side. They stay lossless and the page turns nothing.
const CERT_SRC = join(SRC, 'cert-src');
const CERT_CORNERS = ['tl', 'tr', 'br', 'bl'];
const CERT_SIDES = ['top', 'right', 'bottom', 'left'];
/** The band's row is repeated to this many rows, so the page never tiles a picture thinner than a pixel. */
const BAND_ROWS = 8;
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

/** The certificate frame's pieces as drawn (no key): `ui-cert-fox-<corner>`, `ui-cert-paws-<side>` and `ui-cert-band-<side>`. */
async function processCertFrame(manifest) {
  const lossless = async (img, name) => {
    const info = await img.webp({ lossless: true }).toFile(join(OUT, `${name}.webp`));
    manifest.images[name] = { w: info.width, h: info.height };
    console.log('ok', name);
  };
  for (const corner of CERT_CORNERS) await lossless(sharp(join(CERT_SRC, `cert-fox-${corner}.png`)), `ui-cert-fox-${corner}`);
  for (const side of CERT_SIDES) {
    await lossless(sharp(join(CERT_SRC, `cert-paws-${side}.png`)), `ui-cert-paws-${side}`);
    const file = join(CERT_SRC, `cert-band-${side}.png`);
    const { width, height } = await sharp(file).metadata();
    // The row runs across the side: top and bottom repeat it sideways, left and right downwards.
    const across = side === 'top' || side === 'bottom';
    await lossless(sharp(file).resize(across ? BAND_ROWS : width, across ? height : BAND_ROWS, { fit: 'fill', kernel: 'nearest' }), `ui-cert-band-${side}`);
  }
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
  if (!only || only.startsWith('ui-cert')) await processCertFrame(manifest);
  if (!only) await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
}

await main();
