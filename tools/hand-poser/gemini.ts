import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Side } from '../../src/ui/hand-svg';
import { VIEW } from './pose-file';

/**
 * The way through Gemini (dev server only): a pair's picture for Gemini (a muted keyboard, both hands' 3D outlines, two
 * magenta marks) with each hand's silhouette, in `assets-src/hands/gemini/<left>+<right>/`; then Gemini's answer
 * (`answer.png` or `.jpg` there, drawn in the approved style) traced back into each hand's outline.
 */

export const GEMINI_DIR = 'assets-src/hands/gemini';
const SIDES: Side[] = ['left', 'right'];

/** The part of VIEW Gemini sees and its pixels per keyboard unit. */
export interface Frame { x: number; y: number; w: number; h: number; px: number }
interface Mark { x: number; y: number; size: number }
interface Meta { frame: Frame; marks: Mark[]; maskPx: number }

export interface PictureBody {
  pair: string;
  view: Frame;
  /** The renders' pixels per unit (over VIEW). */
  px: number;
  marks: Mark[];
  /** The muted keyboard as SVG elements in keyboard units. */
  keyboard: string;
  /** The prompt for this pair (./gemini-prompt.ts), saved next to the picture. */
  prompt: string;
  /** Each hand's outline and silhouette, black on white PNGs over VIEW. */
  lines: string[];
  silhouettes: Record<Side, string>;
}

const PAIR = /^[a-z0-9]+\+[a-z0-9]+$/;
/** The silhouettes are kept at this many pixels per unit (enough to tell the hands apart). */
const MASK_PX = 2;
/** The hands' outlines in the picture: their colour and thickness (pixels at the picture's size). */
const OUTLINE = { color: [70, 66, 74], width: 2 };

const pngOf = (dataUrl: string) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
const sharpOf = async () => (await import('sharp')).default;

function dirOf(pair: string): string {
  if (!PAIR.test(pair)) throw new Error(`bad pair ${pair}`);
  return join(GEMINI_DIR, pair);
}

/** A black on white render over VIEW, resized to `px` per unit: one byte per pixel, 0 where it is black. */
async function grey(dataUrl: string, px: number): Promise<{ data: Buffer; w: number; h: number }> {
  const sharp = await sharpOf();
  const w = Math.round(VIEW.w * px), h = Math.round(VIEW.h * px);
  const data = await sharp(pngOf(dataUrl)).resize(w, h, { fit: 'fill' }).greyscale().raw().toBuffer();
  return { data, w, h };
}

/** Writes the pair's picture for Gemini, its prompt and the hands' silhouettes; the picture's path. */
export async function savePicture(b: PictureBody): Promise<string> {
  const sharp = await sharpOf();
  const dir = dirOf(b.pair), f = b.view;
  mkdirSync(dir, { recursive: true });
  const W = Math.round(f.w * f.px), H = Math.round(f.h * f.px);
  const marks = b.marks.map((m) => `<rect x="${m.x}" y="${m.y}" width="${m.size}" height="${m.size}" fill="#ff00ff"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${f.x} ${f.y} ${f.w} ${f.h}"><rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="#ffffff"/>${b.keyboard}${marks}</svg>`;
  const base = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
  // The outlines laid over the keyboard: a VIEW pixel per picture pixel, darkened where an outline is.
  const lines = await Promise.all(b.lines.map((l) => grey(l, f.px)));
  const ox = Math.round((f.x - VIEW.x) * f.px), oy = Math.round((f.y - VIEW.y) * f.px);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const vx = x + ox, vy = y + oy;
    if (vx < 0 || vy < 0 || vx >= lines[0].w || vy >= lines[0].h) continue;
    const ink = Math.max(...lines.map((l) => 255 - l.data[vy * l.w + vx])) / 255;
    if (!ink) continue;
    const o = (y * W + x) * 3;
    for (let k = 0; k < 3; k++) base[o + k] = Math.round(base[o + k] * (1 - ink) + OUTLINE.color[k] * ink);
  }
  const file = join(dir, 'picture.png');
  await sharp(base, { raw: { width: W, height: H, channels: 3 } }).png().toFile(file);
  for (const s of SIDES) {
    const m = await grey(b.silhouettes[s], MASK_PX);
    await sharp(m.data, { raw: { width: m.w, height: m.h, channels: 1 } }).png().toFile(join(dir, `${s}-silhouette.png`));
  }
  writeFileSync(join(dir, 'prompt.txt'), b.prompt);
  writeFileSync(join(dir, 'meta.json'), `${JSON.stringify({ frame: f, marks: b.marks, maskPx: MASK_PX } satisfies Meta, null, 2)}\n`);
  return file.replaceAll('\\', '/');
}

/** Distances (in mask pixels, chamfer 3-4 / 3) from every pixel to the nearest black one. */
function distances(mask: Buffer, w: number, h: number): Float32Array {
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] < 128 ? 0 : 1e9;
  const pass = (ys: number[], xs: number[], n: [number, number, number][]) => {
    for (const y of ys) for (const x of xs) {
      const i = y * w + x;
      for (const [dx, dy, c] of n) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h) d[i] = Math.min(d[i], d[yy * w + xx] + c);
      }
    }
  };
  const range = (n: number) => Array.from({ length: n }, (_, i) => i);
  pass(range(h), range(w), [[-1, 0, 3], [0, -1, 3], [-1, -1, 4], [1, -1, 4]]);
  pass(range(h).reverse(), range(w).reverse(), [[1, 0, 3], [0, 1, 3], [1, 1, 4], [-1, 1, 4]]);
  for (let i = 0; i < d.length; i++) d[i] /= 3;
  return d;
}

/** An outline pixel belongs to a hand only this near its 3D silhouette (keyboard units). */
const NEAR_HAND = 30;
/** Gemini's lines are drawn darker than this (0-255); the muted keyboard stays lighter. */
const DARK = 200;

/**
 * Traces Gemini's answer for a pair into the two hands' outlines: the magenta marks place it on the keyboard, its dark
 * lines go to the hand whose silhouette is nearer. The traced outline of each hand, as an SVG path in keyboard units.
 */
export async function traceAnswer(pair: string, trace: (png: Buffer, toUnits: (x: number, y: number) => [number, number]) => Promise<string>): Promise<Record<Side, string>> {
  const sharp = await sharpOf();
  const dir = dirOf(pair);
  const answer = readdirSync(dir).find((f) => /^answer\.(png|jpe?g|webp)$/.test(f));
  if (!answer) throw new Error(`v ${dir} chýba answer.png (odpoveď Gemini)`);
  const meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')) as Meta;
  const { data, info } = await sharp(join(dir, answer)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const at = (i: number) => [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];
  const magenta = (r: number, g: number, b: number) => r > 150 && b > 150 && g < 120 && r - g > 80;
  // The marks: the middles of the magenta pixels in the left and the right half.
  const sum = [[0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < W * H; i++) {
    const [r, g, b] = at(i);
    if (!magenta(r, g, b)) continue;
    const half = i % W < W / 2 ? 0 : 1;
    sum[half][0] += i % W;
    sum[half][1] += Math.floor(i / W);
    sum[half][2]++;
  }
  if (sum.some((s) => s[2] < 20)) throw new Error('v odpovedi Gemini chýbajú purpurové značky');
  const [p1, p2] = sum.map(([x, y, n]) => [x / n, y / n]);
  const [m1, m2] = meta.marks.map((m) => [m.x + m.size / 2, m.y + m.size / 2]);
  const sx = (m2[0] - m1[0]) / (p2[0] - p1[0]), sy = (m2[1] - m1[1]) / (p2[1] - p1[1]);
  const toUnits = (x: number, y: number): [number, number] => [m1[0] + (x - p1[0]) * sx, m1[1] + (y - p1[1]) * sy];

  const near = await Promise.all(SIDES.map(async (s) => {
    const { data: m, info: mi } = await sharp(join(dir, `${s}-silhouette.png`)).greyscale().raw().toBuffer({ resolveWithObject: true });
    return { d: distances(m, mi.width, mi.height), w: mi.width, h: mi.height };
  }));
  const distOf = (k: number, ux: number, uy: number) => {
    const n = near[k], x = Math.round((ux - VIEW.x) * meta.maskPx), y = Math.round((uy - VIEW.y) * meta.maskPx);
    return x < 0 || y < 0 || x >= n.w || y >= n.h ? Infinity : n.d[y * n.w + x] / meta.maskPx;
  };
  const inks = SIDES.map(() => Buffer.alloc(W * H, 255));
  for (let i = 0; i < W * H; i++) {
    const [r, g, b] = at(i);
    if (magenta(r, g, b) || 0.3 * r + 0.59 * g + 0.11 * b > DARK) continue;
    const [ux, uy] = toUnits(i % W, Math.floor(i / W));
    const dl = distOf(0, ux, uy), dr = distOf(1, ux, uy), k = dl <= dr ? 0 : 1;
    if (Math.min(dl, dr) <= NEAR_HAND) inks[k][i] = 0;
  }
  const out = {} as Record<Side, string>;
  for (const [k, s] of SIDES.entries()) {
    const png = await sharp(inks[k], { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();
    writeFileSync(join(dir, `${s}-traced.png`), png);
    out[s] = await trace(png, toUnits);
  }
  return out;
}

/** Puts a traced outline into a hand's saved SVG (its pose stays), marked as drawn by Gemini; the file's path. */
export function writeOutline(file: string, lines: string): string {
  if (!existsSync(file)) throw new Error(`${file} neexistuje: najprv ulož pózu`);
  const svg = readFileSync(file, 'utf8')
    .replace(/<path class="hand-creases" d="[^"]*"/, '<path class="hand-creases" d=""')
    .replace(/<path class="hand-lines" d="[^"]*"( data-source="[^"]*")?/, `<path class="hand-lines" d="${lines}" data-source="gemini"`);
  writeFileSync(file, svg);
  return file.replaceAll('\\', '/');
}
