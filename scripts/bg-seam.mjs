// Makes generated world background layers repeat horizontally without a seam.
// See assets-src/PROMPTS.md, section 3, for the whole procedure.
//
//   node scripts/bg-seam.mjs check <img> [--band 0.45] [--floor 0.85]   size, sky or band, seam score
//   node scripts/bg-seam.mjs strips <img> <dir>          the strips of a sheet, each at the bottom of a frame
//   node scripts/bg-seam.mjs prep <img> <dir>            rolled.png and seam-in.png for Gemini
//   node scripts/bg-seam.mjs merge <dir> <gemini> <out>  the repainted middle joined to the exact sides
//   node scripts/bg-seam.mjs quilt <dir> <donor> <out>   the middle filled from another strip, no Gemini
//   node scripts/bg-seam.mjs black <img> <out> [floor]   stars on black moved onto magenta, by brightness
//   node scripts/bg-seam.mjs lift <img> <px> <out>       a strip moved up; the near layer hides its bottom
//   node scripts/bg-seam.mjs preview <world> <out>       the three processed layers repeated side by side
//
// Gemini draws a strip as tall as half its picture, whatever the prompt says; asked for a sheet of
// several low strips stacked above each other, it draws them at the scale of the target band.
// strips cuts them apart (without the dark line Gemini draws under a strip) and puts each one at
// the bottom of a magenta frame; their ends, which do not reach the edges, meet in the middle at
// prep and are repainted with it.
// prep rolls the picture by half its width: the old middle (one continuous piece) becomes
// the left and right edges, so they join exactly, and the old edges meet in the middle.
// The middle GAP of the width is painted one flat color for Gemini to repaint. merge keeps
// Gemini's middle only: the sides come back pixel for pixel from rolled.png, joined along
// the path where both pictures agree best, so the edges still join exactly.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

export const W = 1376;
export const H = 768;
const GAP = 0.3;
const PAD = 3;
// strips: how many rows at a strip's bottom may be its dark baseline.
const LINE_ROWS = 12;
// black: darker than the floor is empty sky (a higher floor keeps only the brighter stars),
// brighter than BLACK_FULL is a solid star.
const BLACK_FLOOR = 24;
const BLACK_FULL = 200;
const EDGE_CLEAR = 6;
// check: a strip's drawing may rise this part of the height above its band.
const BAND_SLACK = 0.05;
const MAGENTA = [255, 0, 255];
// The middle is painted white like empty paper: a colored fill tinted the sky Gemini painted into it.
const FILL = [255, 255, 255];
// merge: how far Gemini's picture may be shifted against the original, and how wide
// the zone beside each gap edge is in which the join path is searched.
const SHIFT = 12;
const SIZE_SLACK = 4;
const ZONE = 96;
const FEATHER = 6;
// merge fails when Gemini changed the sides this much (mean RGB difference after alignment),
// or left this share of the gap's columns mostly white (clouds are never that tall).
const MAX_SIDE_DIFF = 28;
const MAX_FILL_LEFT = 0.01;
// A warning when the middle may be painted in another tone: a step this much above the usual one at its edges.
const MAX_EDGE_STEP = 3;

async function load(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

const save = (img, file) => sharp(img.data, { raw: { width: img.w, height: img.h, channels: 3 } }).png().toFile(file);
const dist = (d, i, c) => Math.hypot(d[i] - c[0], d[i + 1] - c[1], d[i + 2] - c[2]);
const isKey = (d, i) => dist(d, i, MAGENTA) < 120 && Math.min(d[i], d[i + 2]) - d[i + 1] > 90;

function sizeOk(img, file) {
  if (img.w === W && img.h === H) return true;
  console.log(`FAIL size: ${file} is ${img.w} x ${img.h}, needs ${W} x ${H} - generate again`);
  return false;
}

/** Mean RGB difference between the last and the first column, against neighbouring columns. */
function seamScore({ data, w, h }) {
  const col = (a, b) => {
    let s = 0;
    for (let y = 0; y < h; y++) for (let c = 0; c < 3; c++) s += Math.abs(data[(y * w + a) * 3 + c] - data[(y * w + b) * 3 + c]);
    return s / h / 3;
  };
  let inner = 0;
  for (let x = 1; x < w; x++) inner += col(x - 1, x);
  return { seam: col(w - 1, 0), inner: inner / (w - 1) };
}

/** Rows (fraction of the height) from the top down to the skyline, as the median over the columns. */
function skyline({ data, w, h }) {
  const tops = [];
  // The sky is clearly blue or a light cloud; the skyline is the first pixel that is neither
  // (sunset or night skies are judged by eye).
  for (let x = 0; x < w; x += 4) {
    let y = 0;
    for (; y < h; y++) {
      const i = (y * w + x) * 3;
      const light = Math.min(data[i], data[i + 1], data[i + 2]) > 200;
      if (!light && data[i + 2] < data[i] + 40) break;
    }
    tops.push(y / h);
  }
  return tops.sort((a, b) => a - b)[tops.length >> 1];
}

/** Share of key pixels in a range of rows. */
function keyShare({ data, w }, y0, y1) {
  let n = 0;
  for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) if (isKey(data, (y * w + x) * 3)) n++;
  return n / Math.max(1, (y1 - y0) * w);
}

// --floor: the band must be solid down to this part of the height; below it the near layer hides it.
async function check(file, band, floor) {
  const img = await load(file);
  let ok = sizeOk(img, file);
  const { seam, inner } = seamScore(img);
  if (band) {
    const above = keyShare(img, 0, Math.round(img.h * (1 - band - BAND_SLACK)));
    const y = Math.round(img.h * Math.min(floor, 0.95));
    const bottom = keyShare(img, y, y + Math.round(img.h * 0.05));
    console.log(`key above the band ${(above * 100).toFixed(1)} %, key at ${Math.round(floor * 100)} % of the height ${(bottom * 100).toFixed(1)} %`);
    if (above < 0.99) { ok = false; console.log('FAIL band: something is drawn high above the band'); }
    if (bottom > 0.02) { ok = false; console.log('FAIL band: the band is not solid down there'); }
  } else {
    const sky = skyline(img);
    console.log(`sky ${(sky * 100).toFixed(0)} % of the height`);
    if (sky > 0.3) { ok = false; console.log('FAIL sky: more than 30 % of the height'); }
  }
  console.log(`seam ${seam.toFixed(1)} against ${inner.toFixed(1)} between neighbouring columns`);
  console.log(ok ? 'OK' : 'NOT OK');
  return ok;
}

const gapRange = (w) => [Math.round(w * (0.5 - GAP / 2)), Math.round(w * (0.5 + GAP / 2))];

async function prep(file, dir) {
  const img = await load(file);
  if (!sizeOk(img, file)) return false;
  await mkdir(dir, { recursive: true });
  const { w, h, data } = img;
  const rolled = Buffer.alloc(data.length);
  const half = w >> 1;
  for (let y = 0; y < h; y++) {
    data.copy(rolled, (y * w) * 3, (y * w + half) * 3, (y * w + w) * 3);
    data.copy(rolled, (y * w + w - half) * 3, (y * w) * 3, (y * w + half) * 3);
  }
  const [g0, g1] = gapRange(w);
  // Above the highest drawing of a strip the key stays: Gemini keeps the empty sky empty.
  let top = 0;
  while (top < h && keyShare({ data: rolled, w }, top, top + 1) > 0.995) top++;
  top = Math.max(0, top - 8);
  // In a strip only the drawing (and a few px around it) turns white: the magenta above it stays,
  // so Gemini keeps the silhouette and does not fill the whole rectangle with grass.
  const seamIn = Buffer.from(rolled);
  const near = (x, y) => {
    for (let dy = -PAD; dy <= PAD; dy++) for (let dx = -PAD; dx <= PAD; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy >= 0 && yy < h && xx >= 0 && xx < w && !isKey(rolled, (yy * w + xx) * 3)) return true;
    }
    return false;
  };
  // The solid body of a strip (rows drawn almost all across beside the gap) turns white across the
  // whole gap too: a strip from a sheet ends short of the edges, and its ends meet in the gap.
  let body = h;
  const solid = (y) => {
    let n = 0, m = 0;
    for (let x = 0; x < w; x++) if (x < g0 - ZONE || x >= g1 + ZONE) { m++; if (!isKey(rolled, (y * w + x) * 3)) n++; }
    return n / m > 0.95;
  };
  while (body > top && solid(body - 1)) body--;
  for (let y = top; y < h; y++) for (let x = g0; x < g1; x++) if (y >= body || near(x, y)) seamIn.set(FILL, (y * w + x) * 3);
  await save({ data: rolled, w, h }, join(dir, 'rolled.png'));
  await save({ data: seamIn, w, h }, join(dir, 'seam-in.png'));
  await writeFile(join(dir, 'seam.json'), JSON.stringify({ top }) + '\n');
  console.log(`gap ${g0}-${g1} px, from row ${top}`);
  return true;
}

async function strips(file, dir) {
  const img = await load(file);
  if (!sizeOk(img, file)) return false;
  await mkdir(dir, { recursive: true });
  const { w, h, data } = img;
  // Rows with drawing, grouped into strips; short groups are specks.
  const bands = [];
  for (let y = 0; y < h; y++) {
    if (keyShare(img, y, y + 1) > 0.995) continue;
    const last = bands.at(-1);
    if (last && y - last[1] <= 2) last[1] = y + 1;
    else bands.push([y, y + 1]);
  }
  const found = bands.filter(([a, b]) => b - a > h * 0.08);
  for (const [n, [y0, y1]] of found.entries()) {
    // The dark baseline: the lowest rows whose drawing is mostly dark.
    let bottom = y1;
    const dark = (y) => {
      let d = 0, n = 0;
      for (let x = 0; x < w; x++) { const i = (y * w + x) * 3; if (!isKey(data, i)) { n++; if (Math.max(data[i], data[i + 1], data[i + 2]) < 90) d++; } }
      return n > 0 && d / n > 0.5;
    };
    while (bottom > y0 && (bottom > y1 - LINE_ROWS) && dark(bottom - 1)) bottom--;
    bottom = Math.max(y0 + 1, bottom - 2);
    const frame = Buffer.alloc(w * h * 3);
    for (let p = 0; p < w * h; p++) frame.set(MAGENTA, p * 3);
    const height = bottom - y0;
    data.copy(frame, (h - height) * w * 3, y0 * w * 3, bottom * w * 3);
    const out = join(dir, `strip-${n + 1}.png`);
    await save({ data: frame, w, h }, out);
    console.log(`${out}: ${height} px tall (${(height / h * 100).toFixed(0)} % of the frame)`);
  }
  return found.length > 0;
}

function gray({ data, w, h }) {
  const g = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) g[p] = data[p * 3] * 0.3 + data[p * 3 + 1] * 0.59 + data[p * 3 + 2] * 0.11;
  return g;
}

/** The shift of `b` against `a` with the least difference on the sides (outside the gap). */
function align(a, b, g0, g1) {
  const ga = gray(a), gb = gray(b);
  const { w, h } = a;
  let best = [0, 0], bestE = Infinity;
  for (let dy = -SHIFT; dy <= SHIFT; dy++) for (let dx = -SHIFT; dx <= SHIFT; dx++) {
    let e = 0, n = 0;
    for (let y = SHIFT; y < h - SHIFT; y += 3) for (let x = SHIFT; x < w - SHIFT; x += 3) {
      if (x > g0 - 16 && x < g1 + 16) continue;
      e += Math.abs(ga[y * w + x] - gb[(y + dy) * w + x + dx]);
      n++;
    }
    if (e / n < bestE) { bestE = e / n; best = [dx, dy]; }
  }
  return best;
}

function shifted({ data, w, h }, dx, dy) {
  const out = Buffer.alloc(data.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = Math.min(w - 1, Math.max(0, x + dx)), sy = Math.min(h - 1, Math.max(0, y + dy));
    data.copy(out, (y * w + x) * 3, (sy * w + sx) * 3, (sy * w + sx) * 3 + 3);
  }
  return { data: out, w, h };
}

/** Per channel gain and offset that bring `b` to the colors of `a` in the zones beside the gap. */
function matchColors(a, b, zones) {
  const { w, h } = a;
  for (let c = 0; c < 3; c++) {
    let sa = 0, sb = 0, sbb = 0, sab = 0, n = 0;
    for (const [x0, x1] of zones) for (let y = 0; y < h; y++) for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 3 + c;
      sa += a.data[i]; sb += b.data[i]; sbb += b.data[i] ** 2; sab += a.data[i] * b.data[i]; n++;
    }
    const varB = sbb / n - (sb / n) ** 2;
    const gain = varB > 1 ? Math.min(1.25, Math.max(0.8, (sab / n - (sa / n) * (sb / n)) / varB)) : 1;
    const off = sa / n - gain * (sb / n);
    for (let i = c; i < b.data.length; i += 3) b.data[i] = Math.max(0, Math.min(255, Math.round(b.data[i] * gain + off)));
  }
}

/** For every row, the column in [x0, x1) of the cheapest top-to-bottom path through the difference of a and b. */
function cutPath(a, b, x0, x1) {
  const { w, h } = a;
  const zw = x1 - x0;
  const cost = new Float32Array(zw * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < zw; x++) {
    const i = (y * w + x0 + x) * 3;
    cost[y * zw + x] = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
  }
  const acc = Float32Array.from(cost);
  for (let y = 1; y < h; y++) for (let x = 0; x < zw; x++) {
    let m = acc[(y - 1) * zw + x];
    if (x > 0) m = Math.min(m, acc[(y - 1) * zw + x - 1]);
    if (x < zw - 1) m = Math.min(m, acc[(y - 1) * zw + x + 1]);
    acc[y * zw + x] += m;
  }
  const path = new Int32Array(h);
  let bx = 0;
  for (let x = 1; x < zw; x++) if (acc[(h - 1) * zw + x] < acc[(h - 1) * zw + bx]) bx = x;
  path[h - 1] = bx;
  for (let y = h - 2; y >= 0; y--) {
    const px = path[y + 1];
    let nx = px;
    for (const cx of [px - 1, px + 1]) if (cx >= 0 && cx < zw && acc[y * zw + cx] < acc[y * zw + nx]) nx = cx;
    path[y] = nx;
  }
  let sum = 0;
  for (let y = 0; y < h; y++) sum += cost[y * zw + path[y]] / 3;
  return { path: Array.from(path, (x) => x + x0), mean: sum / h };
}

/**
 * Median over the rows of the color step across column x in Gemini's picture (4 px on each side).
 * At a gap edge it shows a middle painted lighter or darker than the sides.
 */
function stepAt({ data, w, h }, x, top) {
  const steps = [];
  for (let y = top; y < h; y++) {
    let d = 0;
    for (let c = 0; c < 3; c++) {
      let l = 0, r = 0;
      for (let k = 1; k <= 4; k++) { l += data[(y * w + x - k) * 3 + c]; r += data[(y * w + x + k - 1) * 3 + c]; }
      d += Math.abs(l - r) / 4;
    }
    steps.push(d / 3);
  }
  return steps.sort((p, q) => p - q)[steps.length >> 1];
}

async function merge(dir, file, out) {
  const a = await load(join(dir, 'rolled.png'));
  let g = await load(file);
  // A repaint a few px off the size (1377 wide) is cropped or stretched; align() finds the shift.
  if (g.w !== W || g.h !== H) {
    if (Math.abs(g.w - W) > SIZE_SLACK || Math.abs(g.h - H) > SIZE_SLACK) return sizeOk(g, file);
    const { data, info } = await sharp(file).removeAlpha().resize(W, H, { fit: 'cover', position: 'left top' }).raw().toBuffer({ resolveWithObject: true });
    console.log(`repaint was ${g.w} x ${g.h}, fitted to ${W} x ${H}`);
    g = { data, w: info.width, h: info.height };
  }
  const { top } = JSON.parse(await readFile(join(dir, 'seam.json'), 'utf8'));
  const { w, h } = a;
  const [g0, g1] = gapRange(w);
  const [dx, dy] = align(a, g, g0, g1);
  const b = shifted(g, dx, dy);
  const zones = [[g0 - ZONE, g0], [g1, g1 + ZONE]];
  matchColors(a, b, zones);
  // How much Gemini changed the sides it was told to keep.
  let side = 0, n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x >= g0 && x < g1) continue;
    const i = (y * w + x) * 3;
    side += Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
    n += 3;
  }
  side /= n;
  let left = 0;
  for (let x = g0; x < g1; x++) {
    let white = 0;
    for (let y = top; y < h; y++) if (dist(b.data, (y * w + x) * 3, FILL) < 30) white++;
    if (white > (h - top) * 0.6) left++;
  }
  left /= g1 - g0;
  // A step at the gap edges against the steps elsewhere in Gemini's picture
  const base = [0.1, 0.2, 0.8, 0.9].map((f) => stepAt(b, Math.round(w * f), top)).sort((p, q) => p - q)[2];
  const step = Math.max(stepAt(b, g0, top), stepAt(b, g1, top));
  const L = cutPath(a, b, g0 - ZONE, g0);
  const R = cutPath(a, b, g1, g1 + ZONE);
  const res = Buffer.from(a.data);
  for (let y = 0; y < h; y++) for (let x = g0 - ZONE; x < g1 + ZONE; x++) {
    // Weight of Gemini's pixel: 1 between the two paths, fading out over FEATHER px beyond them.
    const t = Math.min(1, Math.max(0, (x - L.path[y] + FEATHER) / (2 * FEATHER)), Math.max(0, (R.path[y] - x + FEATHER) / (2 * FEATHER)));
    if (t <= 0) continue;
    const i = (y * w + x) * 3;
    for (let c = 0; c < 3; c++) res[i + c] = Math.round(a.data[i + c] * (1 - t) + b.data[i + c] * t);
  }
  await save({ data: res, w, h }, out);
  // A close look at both joins, twice enlarged, for the eye.
  const crop = (x) => sharp(res, { raw: { width: w, height: h, channels: 3 } }).extract({ left: x - 96, top: 0, width: 192, height: h }).resize(384, h * 2).png().toBuffer();
  const strips = await Promise.all([crop(g0), crop(g1)]);
  await sharp({ create: { width: 784, height: h * 2, channels: 3, background: '#ff0000' } })
    .composite([{ input: strips[0], left: 0, top: 0 }, { input: strips[1], left: 400, top: 0 }]).png().toFile(out.replace(/\.png$/, '-joins.png'));
  console.log(`shift ${dx},${dy} px; sides changed by ${side.toFixed(1)}; step at the gap edges ${step.toFixed(1)} against ${base.toFixed(1)}; fill left ${(left * 100).toFixed(2)} %; join paths ${L.mean.toFixed(1)} / ${R.mean.toFixed(1)}`);
  const ok = side <= MAX_SIDE_DIFF && left <= MAX_FILL_LEFT;
  // A step can be meant (a tree trunk along the edge): only a warning, the joins picture decides.
  if (step > base + MAX_EDGE_STEP) console.log('WARN: a step at the gap edges - look at the joins picture for a stripe of another tone');
  if (side > MAX_SIDE_DIFF) console.log('FAIL: Gemini redrew the sides too much - repaint again');
  if (left > MAX_FILL_LEFT) console.log('FAIL: the white fill is still in the middle - repaint again');
  const s = seamScore({ data: res, w, h });
  console.log(`wrap seam ${s.seam.toFixed(1)} against ${s.inner.toFixed(1)}`);
  console.log(ok ? 'OK' : 'NOT OK');
  return ok;
}

/**
 * The gap of rolled.png filled with the piece of another strip of the same sheet (same style and
 * scale) that fits both gap edges best, joined along the cheapest paths like merge.
 */
async function quilt(dir, donorFile, out) {
  const a = await load(join(dir, 'rolled.png'));
  const d = await load(donorFile);
  if (!sizeOk(d, donorFile)) return false;
  const { w, h } = a;
  const [g0, g1] = gapRange(w);
  const span = g1 - g0 + 2 * ZONE;
  // The donor's x where its piece (zones included) starts, by the difference in both zones.
  const zoneCost = (dx) => {
    let e = 0;
    for (let y = 0; y < h; y += 2) for (let x = 0; x < ZONE; x += 2) {
      for (const [ax, bx] of [[g0 - ZONE + x, dx + x], [g1 + x, dx + span - ZONE + x]]) {
        const i = (y * w + ax) * 3, j = (y * w + bx) * 3;
        e += Math.abs(a.data[i] - d.data[j]) + Math.abs(a.data[i + 1] - d.data[j + 1]) + Math.abs(a.data[i + 2] - d.data[j + 2]);
      }
    }
    return e;
  };
  let best = 0, bestE = Infinity;
  for (let dx = 0; dx + span <= w; dx += 4) { const e = zoneCost(dx); if (e < bestE) { bestE = e; best = dx; } }
  // The donor piece placed over the gap, the rest of b is the original.
  const b = { data: Buffer.from(a.data), w, h };
  for (let y = 0; y < h; y++) d.data.copy(b.data, (y * w + g0 - ZONE) * 3, (y * w + best) * 3, (y * w + best + span) * 3);
  const L = cutPath(a, b, g0 - ZONE, g0);
  const R = cutPath(a, b, g1, g1 + ZONE);
  const res = Buffer.from(a.data);
  for (let y = 0; y < h; y++) for (let x = g0 - ZONE; x < g1 + ZONE; x++) {
    const t = Math.min(1, Math.max(0, (x - L.path[y] + FEATHER) / (2 * FEATHER)), Math.max(0, (R.path[y] - x + FEATHER) / (2 * FEATHER)));
    if (t <= 0) continue;
    const i = (y * w + x) * 3;
    for (let c = 0; c < 3; c++) res[i + c] = Math.round(a.data[i + c] * (1 - t) + b.data[i + c] * t);
  }
  await save({ data: res, w, h }, out);
  console.log(`donor piece from x ${best}; join paths ${L.mean.toFixed(1)} / ${R.mean.toFixed(1)}`);
  return true;
}

/**
 * Stars painted on black, put on the magenta key: brightness is coverage. On magenta Gemini lays
 * small things out like a sticker sheet (neat groups); on black it scatters them like a real sky.
 */
async function black(file, out, floor = BLACK_FLOOR) {
  const img = await load(file);
  if (!sizeOk(img, file)) return false;
  const { w, h, data } = img;
  const res = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 3) {
    const a = Math.min(1, Math.max(0, (Math.max(data[i], data[i + 1], data[i + 2]) - floor) / (BLACK_FULL - floor)));
    for (let c = 0; c < 3; c++) {
      const color = a > 0 ? Math.min(255, data[i + c] / Math.max(a, 0.05)) : 0;
      res[i + c] = Math.round(MAGENTA[c] * (1 - a) + color * a);
    }
  }
  // A star cut by the left or right edge would show half at each join: every star that comes
  // within EDGE_CLEAR px of those edges is taken out whole, so the layer repeats as it is.
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let y = 0; y < h; y++) for (const x0 of [0, w - EDGE_CLEAR]) for (let x = x0; x < x0 + EDGE_CLEAR; x++) {
    const p = y * w + x;
    if (!seen[p] && !isKey(res, p * 3)) { seen[p] = 1; stack.push(p); }
  }
  while (stack.length) {
    const p = stack.pop();
    res.set(MAGENTA, p * 3);
    const x = p % w, y = (p - x) / w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy, q = yy * w + xx;
      if (xx >= 0 && xx < w && yy >= 0 && yy < h && !seen[q] && !isKey(res, q * 3)) { seen[q] = 1; stack.push(q); }
    }
  }
  await save({ data: res, w, h }, out);
  return true;
}

/** The strip moved up by px; the rows freed at the bottom are key (the near layer covers them). */
async function lift(file, px, out) {
  const img = await load(file);
  if (!sizeOk(img, file)) return false;
  const { w, h, data } = img;
  const res = Buffer.alloc(data.length);
  for (let p = 0; p < w * h; p++) res.set(MAGENTA, p * 3);
  data.copy(res, 0, px * w * 3);
  await save({ data: res, w, h }, out);
  console.log(`lifted by ${px} px`);
  return true;
}

/** The processed far, mid and near layers of a world, each repeated across 2.5 widths, their seams at different places. */
async function preview(world, out) {
  const width = Math.round(W * 2.5);
  const layers = [];
  for (const [layer, offset] of [['far', 0], ['mid', 0.33], ['near', 0.66]]) {
    const file = `public/assets/bg-${world}-${layer}.webp`;
    const tile = await sharp(file).resize({ height: H }).png().toBuffer();
    const { width: tw } = await sharp(tile).metadata();
    for (let x = -Math.round(offset * tw); x < width; x += tw) {
      const left = Math.max(0, x);
      const input = x < 0 ? await sharp(tile).extract({ left: -x, top: 0, width: tw + x, height: H }).toBuffer() : tile;
      layers.push({ input, left, top: 0 });
      // A small tick above every seam.
      if (x > 0) layers.push({ input: { create: { width: 2, height: 10, channels: 4, background: '#ff0000' } }, left: x, top: 0 });
    }
  }
  await sharp({ create: { width, height: H, channels: 4, background: '#000000' } }).composite(layers).png().toFile(out);
  console.log(`preview ${out}`);
  return true;
}

const [cmd, ...args] = process.argv.slice(2);
const bandAt = args.indexOf('--band');
const band = bandAt >= 0 ? Number(args.splice(bandAt, 2)[1]) : 0;
const floorAt = args.indexOf('--floor');
const floor = floorAt >= 0 ? Number(args.splice(floorAt, 2)[1]) : 1;
const ok = cmd === 'check' ? await check(args[0], band, floor)
  : cmd === 'strips' ? await strips(args[0], args[1])
  : cmd === 'prep' ? await prep(args[0], args[1])
  : cmd === 'merge' ? await merge(args[0], args[1], args[2])
  : cmd === 'quilt' ? await quilt(args[0], args[1], args[2])
  : cmd === 'black' ? await black(args[0], args[1], args[2] ? Number(args[2]) : undefined)
  : cmd === 'lift' ? await lift(args[0], Number(args[1]), args[2])
  : cmd === 'preview' ? await preview(args[0], args[1])
  : (console.log('usage: check <img> [--band f] [--floor f] | strips <img> <dir> | prep <img> <dir> | merge <dir> <gemini> <out> | quilt <dir> <donor> <out> | black <img> <out> [floor] | lift <img> <px> <out> | preview <world> <out>'), false);
process.exitCode = ok ? 0 : 1;
