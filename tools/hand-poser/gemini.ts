import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { extname, join } from 'node:path';
import type { Side } from '../../src/ui/hand-svg';
import { MIRROR_X, VIEW } from './pose-file';

/**
 * The way through Gemini (dev server only): a pair's picture for Gemini (a muted keyboard, both hands' 3D outlines, two
 * magenta marks) with each hand's silhouette, in `assets-src/hands/gemini/<left>+<right>/`; then Gemini's answer
 * (`answer.png` or `.jpg` there, drawn in the approved style) traced back into each hand's outline.
 */

export const GEMINI_DIR = 'assets-src/hands/gemini';
/** The look Gemini copies (the owner's approved drawing), the second picture sent with each pair's. */
export const STYLE_SAMPLE = 'assets-src/hands/style-sample.jpg';
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
  /** Each hand's outline, thin lines (folds, knuckles, nail beds) and silhouette, black on white PNGs over VIEW. */
  lines: string[];
  creases: string[];
  silhouettes: Record<Side, string>;
}

const PAIR = /^[a-z0-9]+\+[a-z0-9]+$/;
/** Gemini's answer for a pair. */
const ANSWER = /^answer\.(png|jpe?g|webp)$/;
/** The silhouettes are kept at this many pixels per unit (enough to tell the hands apart). */
const MASK_PX = 2;
/** The hands in the picture: a bold black outline (grown by this many pixels) and hairline black details. */
const OUTLINE_GROW = 1;

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
  // The hands laid over the keyboard in black, a VIEW pixel per picture pixel: the outline bold (grown), the details as they are.
  const lines = await Promise.all(b.lines.map((l) => grey(l, f.px)));
  const creases = await Promise.all(b.creases.map((l) => grey(l, f.px)));
  const ox = Math.round((f.x - VIEW.x) * f.px), oy = Math.round((f.y - VIEW.y) * f.px);
  const inkAt = (maps: { data: Buffer; w: number; h: number }[], vx: number, vy: number) =>
    vx < 0 || vy < 0 || vx >= maps[0].w || vy >= maps[0].h ? 0 : Math.max(...maps.map((l) => 255 - l.data[vy * l.w + vx])) / 255;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const vx = x + ox, vy = y + oy;
    let ink = inkAt(creases, vx, vy) * 0.85;
    for (let dy = -OUTLINE_GROW; dy <= OUTLINE_GROW; dy++) for (let dx = -OUTLINE_GROW; dx <= OUTLINE_GROW; dx++) ink = Math.max(ink, inkAt(lines, vx + dx, vy + dy));
    if (!ink) continue;
    const o = (y * W + x) * 3;
    for (let k = 0; k < 3; k++) base[o + k] = Math.round(base[o + k] * (1 - ink));
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

/** An outline pixel belongs to a hand near its 3D silhouette (keyboard units; up to twice as far on the hand's own side). */
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
  const answer = readdirSync(dir).find((f) => ANSWER.test(f));
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
    // The keyboard is pink and the marks magenta: only grey and black is the hands.
    if (r - g > 30 && b - g > 30) continue;
    if (0.3 * r + 0.59 * g + 0.11 * b > DARK) continue;
    const [ux, uy] = toUnits(i % W, Math.floor(i / W));
    // A line goes to the hand on its side of the keyboard's middle (a thumb Gemini drew further out than the 3D one
    // still belongs there), unless it is far from that hand and near the other one.
    const d = [distOf(0, ux, uy), distOf(1, ux, uy)], own = ux < MIRROR_X ? 0 : 1, k = d[own] > NEAR_HAND && d[1 - own] <= NEAR_HAND ? 1 - own : own;
    if (d[k] <= NEAR_HAND * 2) inks[k][i] = 0;
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

/**
 * The pairs sent to Gemini, newest first: their names, when their picture was made, whether an answer is there and when
 * it was traced into the hands' SVGs (0: not yet).
 */
export function listPairs(): { pair: string; time: number; answer: boolean; traced: number }[] {
  if (!existsSync(GEMINI_DIR)) return [];
  return readdirSync(GEMINI_DIR).filter((p) => PAIR.test(p) && existsSync(join(GEMINI_DIR, p, 'picture.png'))).map((pair) => {
    const dir = join(GEMINI_DIR, pair), traced = join(dir, 'left-traced.png');
    return {
      pair,
      time: statSync(join(dir, 'picture.png')).mtimeMs,
      answer: readdirSync(dir).some((f) => ANSWER.test(f)),
      traced: existsSync(traced) ? statSync(traced).mtimeMs : 0,
    };
  }).sort((a, b) => b.time - a.time);
}

/** A file of a pair the poser shows: its picture, its prompt or Gemini's answer. */
export function pairFile(pair: string, name: string): { data: Buffer; type: string } | null {
  const dir = dirOf(pair);
  const file = name === 'answer' ? readdirSync(dir).find((f) => ANSWER.test(f)) : ['picture.png', 'prompt.txt'].includes(name) ? name : undefined;
  if (!file || !existsSync(join(dir, file))) return null;
  const type = file.endsWith('.txt') ? 'text/plain; charset=utf-8' : file.endsWith('.png') ? 'image/png' : file.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  return { data: readFileSync(join(dir, file)), type };
}

/**
 * Takes the newest picture in the owner's Downloads as the pair's answer, when it is newer than the pair's picture (Gemini's
 * download from the owner's own chat); the answer's file name, or null when there is none newer.
 */
export function answerFromDownloads(pair: string): string | null {
  const dir = dirOf(pair), downloads = join(homedir(), 'Downloads');
  if (!existsSync(downloads)) return null;
  const since = statSync(join(dir, 'picture.png')).mtimeMs;
  const newest = readdirSync(downloads).filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .map((f) => ({ f, time: statSync(join(downloads, f)).mtimeMs })).filter((x) => x.time > since).sort((a, b) => b.time - a.time)[0];
  if (!newest) return null;
  for (const old of readdirSync(dir).filter((f) => ANSWER.test(f))) rmSync(join(dir, old));
  const name = `answer${extname(newest.f).toLowerCase().replace('.jpeg', '.jpg')}`;
  copyFileSync(join(downloads, newest.f), join(dir, name));
  return name;
}
