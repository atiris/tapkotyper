// Turns Gemini's hand pictures (assets-src/hands/) into the outline hands of the on-screen keyboard (public/hands/poses.json).
//
// Every picture is Gemini's drawing of flat grey hands with a black outline over assets-src/hands/keyboard.png (a keyboard on
// the real 15-unit grid, square keys). `home.jpg` holds both hands in the home position; `<KeyCode>.jpg` (KeyU.jpg ...) the
// pose of the hand that types that key, drawn from home.jpg with only that hand changed (prompt in assets-src/PROMPTS.md).
// The grey is dropped, the lines are traced to SVG paths, and the paths are moved onto the app's keyboard: units of the full
// size keyboard (a key and its gap 58 wide, a row 50 high, the digit row on top), the fingertips in the middle of their keys.
//
// Usage: node scripts/hands.mjs
import sharp from 'sharp';
import potrace from 'potrace';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';

const SRC = 'assets-src/hands';
const OUT = 'public/hands/poses.json';

/** The hand each pose belongs to, and how much lower it sits (picture key units) so a stretch is not overdone. */
const POSES = {
  KeyU: { hand: 'right', down: 5 },
};

// ---- the keyboard Gemini drew on: square keys, 44 per key, the Q key's middle at (86, 20) ----
const PITCH = 44, Q = [86, 20], AE_X = 570;
// The hands rest a little low and look small: lifted to the keys' middle, a little longer around their fingertips' line.
const FIT = { lift: 19, scale: [1.02, 1.14], tipY: 76, cx: { left: 163, right: 427 } };
// Onto the app's keyboard: a key and its gap 58 wide, a row 50 high, one row (the digits) above.
const APP = { unit: 58, row: 50 };
// The little fingers come this much closer to the others (picture key units).
const PINKY_IN = 4.5;
// Lines apart from the outline up to this size (pixels) are the joint creases.
const CREASE_MAX = 2500;

async function trace(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const px = (p) => [data[p * 3], data[p * 3 + 1], data[p * 3 + 2]];
  const lum = ([r, g, b]) => 0.3 * r + 0.59 * g + 0.11 * b;
  const chroma = ([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b);

  // Where the keyboard is: the orange stripe under Q and the green one under Ä.
  const stripe = (test, right) => {
    let best = null;
    for (let y = 0; y < H * 0.3; y++) for (let x = 0; x < W; x++) if (test(px(y * W + x)) && (!best || (right ? x > best.x : x < best.x))) best = { x, y };
    const xs = [], ys = [];
    for (let y = best.y - 8; y < best.y + 8; y++) for (let x = Math.max(0, best.x - 90); x < Math.min(W, best.x + 90); x++) if (test(px(y * W + x))) { xs.push(x); ys.push(y); }
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: ys.reduce((a, b) => a + b, 0) / ys.length };
  };
  const q = stripe(([r, g, b]) => r > 190 && g > 120 && g < 185 && b < 80, false);
  const ae = stripe(([r, g, b]) => g > 160 && r > 110 && r < 175 && b < 110 && g - b > 70, true);
  const s = (ae.x - q.x) / (AE_X - Q[0]);
  const qy = (q.y + ae.y) / 2 - 16 * s;
  const toKeys = (x, y) => [Q[0] + (x - q.x) / s, Q[1] + (y - qy) / s];
  const toPx = (X, Y) => [q.x + (X - Q[0]) * s, qy + (Y - Q[1]) * s];

  // The hands: big pieces of flat grey and black.
  const hand = new Uint8Array(W * H), fill = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) {
    const c = px(p), l = lum(c);
    hand[p] = chroma(c) < 20 && l < 175 ? 1 : 0;
    fill[p] = chroma(c) < 20 && l > 110 && l < 175 ? 1 : 0;
  }
  const components = (on, diagonal) => {
    const label = new Int32Array(W * H).fill(-1), sizes = [];
    const steps = diagonal ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let st = 0; st < W * H; st++) {
      if (!on(st) || label[st] >= 0) continue;
      const id = sizes.length, stack = [st];
      label[st] = id;
      let n = 0;
      while (stack.length) {
        const p = stack.pop(), x = p % W, y = (p - x) / W;
        n++;
        for (const [dx, dy] of steps) {
          const nx = x + dx, ny = y + dy, qq = ny * W + nx;
          if (nx >= 0 && ny >= 0 && nx < W && ny < H && on(qq) && label[qq] < 0) { label[qq] = id; stack.push(qq); }
        }
      }
      sizes.push(n);
    }
    return { label, sizes };
  };
  const pieces = components((p) => hand[p], false);
  const big = new Set(pieces.sizes.map((n, i) => [n, i]).filter(([n]) => n > W * H * 0.004).map(([, i]) => i));

  // The line art: dark pixels of the hands with grey close by (letters touching a fingertip have none).
  const nearFill = (x, y) => {
    for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && fill[ny * W + nx] && big.has(pieces.label[ny * W + nx])) return true;
    }
    return false;
  };
  let ink = Buffer.alloc(W * H, 255);
  for (let p = 0; p < W * H; p++) {
    const x = p % W, y = (p - x) / W;
    if (big.has(pieces.label[p]) && lum(px(p)) < 90 && nearFill(x, y)) ink[p] = 0;
  }

  // The little fingers move a little towards the others, softly: the full shift beyond the gap between A and S (L and Ô),
  // none past it and none below the bottom letter row.
  {
    const smooth = (v) => (v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v));
    const shift = PINKY_IN * s;
    const [lFull] = toPx(108, 0), [lNone] = toPx(128, 0), [rNone] = toPx(462, 0), [rFull] = toPx(482, 0);
    const [, yFull] = toPx(0, 110), [, yNone] = toPx(0, 150);
    const disp = (x, y) => {
      const v = 1 - smooth((y - yFull) / (yNone - yFull));
      if (x < (lNone + rNone) / 2) return shift * v * (1 - smooth((x - lFull) / (lNone - lFull)));
      return -shift * v * smooth((x - rNone) / (rFull - rNone));
    };
    const moved = Buffer.alloc(W * H, 255);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const sx = Math.round(x - disp(x, y));
      if (sx >= 0 && sx < W) moved[y * W + x] = ink[y * W + sx];
    }
    ink = moved;
  }

  // The outline is one big line per hand; the creases are small lines apart from it.
  const lines = components((p) => !ink[p], true);
  const layer = async (keep, thin) => {
    const out = Buffer.alloc(W * H, 255);
    for (let p = 0; p < W * H; p++) if (!ink[p] && keep(lines.sizes[lines.label[p]])) out[p] = 0;
    const img = sharp(out, { raw: { width: W, height: H, channels: 1 } });
    // A soft pixel off each side: the outline a little thinner than Gemini drew it.
    return (thin ? img.blur(1).threshold(85) : img).png().toBuffer();
  };
  const svgOf = (png) => new Promise((ok, fail) => potrace.trace(png, { turdSize: 20, alphaMax: 1, optTolerance: 0.4, threshold: 128 }, (err, out) => (err ? fail(err) : ok(out))));
  const halves = (svg) => {
    const out = { left: [], right: [] };
    const d = /\sd="([^"]*)"/.exec(svg)?.[1] ?? '';
    for (const sub of d.split(/(?=M)/).filter((x) => x.trim())) {
      const x = Number(/M\s*([\d.]+)/.exec(sub)[1]);
      out[x < (q.x + ae.x) / 2 ? 'left' : 'right'].push(sub.trim());
    }
    return out;
  };
  const outline = halves(await svgOf(await layer((n) => n > CREASE_MAX, true)));
  const creases = halves(await svgOf(await layer((n) => n <= CREASE_MAX, false)));

  /** Every point of a path from picture pixels into app keyboard units, with the hand's fit and its pose's drop. */
  const place = (d, side, down) => d.replace(/(-?\d+(?:\.\d+)?)[ ,]+(-?\d+(?:\.\d+)?)/g, (_, a, b) => {
    const [kx, ky] = toKeys(Number(a), Number(b));
    const fx = FIT.cx[side] + (kx - FIT.cx[side]) * FIT.scale[0];
    const fy = FIT.tipY + (ky - FIT.tipY) * FIT.scale[1] - FIT.lift + down;
    return `${((fx * APP.unit) / PITCH).toFixed(1)} ${(APP.row + (fy * APP.row) / PITCH).toFixed(1)}`;
  }).replace(/,/g, '');
  const hands = (down) => Object.fromEntries(['left', 'right'].map((side) => [side, { d: place(outline[side].join(' '), side, down), creases: place(creases[side].join(' '), side, down) }]));
  console.log(file, `${W}x${H}`, 'scale', s.toFixed(3));
  return hands;
}

if (!existsSync(`${SRC}/home.jpg`)) throw new Error('assets-src/hands/home.jpg is missing');
const out = { home: (await trace(`${SRC}/home.jpg`))(0), keys: {} };
for (const file of readdirSync(SRC).filter((f) => /^[A-Z]\w+\.jpg$/.test(f))) {
  const code = file.replace(/\.jpg$/, '');
  const pose = POSES[code];
  if (!pose) { console.warn(`no pose settings for ${code}, skipped`); continue; }
  out.keys[code] = { hand: pose.hand, ...(await trace(`${SRC}/${file}`))(pose.down)[pose.hand] };
}
writeFileSync(OUT, JSON.stringify(out));
console.log(`${OUT}: home and ${Object.keys(out.keys).length} key poses`);
