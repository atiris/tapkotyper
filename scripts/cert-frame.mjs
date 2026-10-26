// Cuts the certificate frame's parts out of one top-left corner picture (a band with a sleeping fox in
// the corner and pairs of paw prints along both arms, measured on its 1024 px square) into transparent
// PNGs in assets-src, to touch up by hand before `npm run assets`:
//   ui-cert-fox.png   the fox alone; the band's outer edge lies 88.5 px in from its top and its left
//   ui-cert-paws.png  one pair of paw prints toes up, as wide as the band
//   ui-cert-band.png  one row of the plain band, its outer edge on the left
// Run with `node scripts/cert-frame.mjs [corner.jpg]` (default assets-src/cert-src/ui-cert-frame.jpg).
import sharp from 'sharp';
import { keyOut } from './key.mjs';

const SRC = process.argv[2] ?? 'assets-src/cert-src/ui-cert-frame.jpg';
const OUT = 'assets-src';
const FRAME_SRC = 1024;
/** The fox's square from the corner (shifted FOX_X px right, so the band's outer edge lies 88.5 px in from its top and its left). */
const FOX_SIZE = 372;
const FOX_X = 2;
/** A point inside the fox, and the row under its tail (a paw print touches the tail from below). */
const FOX_SEED = [160, 180];
const FOX_BOTTOM = 355;
/** The left arm's columns, and one pair of paw prints on it (toes up): its rows. */
const BAND_COLS = [90, 232];
const PAWS_ROWS = [452, 534];
/** Plain places of the arms (no fox, no prints): a column of the top arm, a row of the left arm. */
const PLAIN_COL = 800;
const PLAIN_ROW = 800;

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
if (w !== FRAME_SRC || h !== FRAME_SRC) throw new Error(`${SRC}: the cut lines are measured on a ${FRAME_SRC} px square`);
const raw = Buffer.from(data);
keyOut(data, w, h);
const rgb = (x, y) => raw.subarray((y * w + x) * 4, (y * w + x) * 4 + 3);
// The plain band (or the key outside it) at (x, y): the top arm's profile above the corner's diagonal, the left arm's below it.
const plain = (x, y) => (y - 88 <= x - 90 ? rgb(PLAIN_COL, y) : rgb(x, PLAIN_ROW));
const differs = (x, y, limit) => {
  const a = rgb(x, y), b = plain(x, y);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > limit;
};
// Pixels of the box x0..x1, y0..y1 picked by `keep` (or all), grown by one pixel for the soft edge, cut out of the keyed picture as a PNG.
const cut = (x0, y0, x1, y1, keep, name) => {
  const bw = x1 - x0, bh = y1 - y0;
  const out = Buffer.alloc(bw * bh * 4);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    let near = !keep;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1 && !near; dx++) near = keep(x + dx, y + dy);
    if (near) data.copy(out, (y * bw + x) * 4, ((y + y0) * w + x + x0) * 4, ((y + y0) * w + x + x0) * 4 + 4);
  }
  return sharp(out, { raw: { width: bw, height: bh, channels: 4 } }).png().toFile(`${OUT}/${name}.png`);
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
const nearFox = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (fox[(y + dy) * FOX_SIZE + x + dx]) return true; return false; };
const outline = [];
for (let y = 3; y < FOX_BOTTOM; y++) for (let x = 3; x < FOX_SIZE - 3; x++) if (!fox[y * FOX_SIZE + x] && dark(x, y) && nearFox(x, y, 3)) outline.push(y * FOX_SIZE + x);
for (const q of outline) fox[q] = 1;
const outside = new Uint8Array(n);
const edge = [];
for (let i = 0; i < FOX_SIZE; i++) edge.push(i, (FOX_SIZE - 1) * FOX_SIZE + i, i * FOX_SIZE, i * FOX_SIZE + FOX_SIZE - 1);
flood(outside, edge.filter((p) => !fox[p]), (x, y) => !fox[y * FOX_SIZE + x]);
await cut(FOX_X, 0, FOX_X + FOX_SIZE, FOX_SIZE, (x, y) => x >= 0 && y >= 0 && x < FOX_SIZE && y < FOX_SIZE && !outside[y * FOX_SIZE + x], 'ui-cert-fox');

// The paw pair: everything unlike the band in one stretch of the left arm.
const [c0, c1] = BAND_COLS, [r0, r1] = PAWS_ROWS;
await cut(c0, r0, c1, r1, (x, y) => x >= 0 && y >= 0 && x < c1 - c0 && y < r1 - r0 && differs(x + c0, y + r0, 50), 'ui-cert-paws');
// The band: one plain row of the left arm.
await cut(c0, PLAIN_ROW, c1, PLAIN_ROW + 1, null, 'ui-cert-band');
console.log('ok ui-cert-fox, ui-cert-paws, ui-cert-band');
