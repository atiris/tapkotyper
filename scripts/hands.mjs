// Turns the base drawing of the hands into the rigged outline hands of the on-screen keyboard (public/hands/rig.json).
//
// assets-src/hands/home-base.png (made by scripts/hands-base.mjs) holds both hands in the home position, flat grey with a black
// outline, over assets-src/hands/keyboard.png (a keyboard on the real 15-unit grid, square keys). The grey is dropped, the
// lines are traced to SVG paths once, and every point of every path is bound to the hand's skeleton (palm, and three bones a
// finger, the thumb's from its base): it belongs to the finger whose area it lies by, and along the finger to the bone it lies
// on, blended over the joints. The app bends the skeleton for each key (src/ui/hand-rig.ts) and the lines follow it.
// Everything is written in units of the full size app keyboard (a key and its gap 58 wide, a row 50 high, the digit row on
// top). The owner's rules for the hands: assets-src/PROMPTS.md, section 12.
//
// Usage: node scripts/hands.mjs   (a picture of the areas and bones goes to assets-src/hands/debug/rig.png)
import sharp from 'sharp';
import potrace from 'potrace';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const SRC = 'assets-src/hands';
const HOME = `${SRC}/home-base.png`;
const OUT = 'public/hands/rig.json';

// Positions below are picture key units: the keyboard of the drawing has square keys, 44 per key, the Q key's middle at (86, 20).
const PITCH = 44, Q = [86, 20], AE_X = 570;
// Onto the app's keyboard: a key and its gap 58 wide, a row 50 high, one row (the digits) above.
const APP = { unit: 58, row: 50 };
const toApp = ([x, y]) => [+((x * APP.unit) / PITCH).toFixed(1), +(APP.row + (y * APP.row) / PITCH).toFixed(1)];

/**
 * The skeleton, read off home-base.png on a grid of picture key units (the fingers' middle lines and their joint creases):
 * per finger its knuckle, middle joint, last joint and the middle of its fingertip pad; per thumb its base, knuckle, joint and
 * pad. `seed` is a point inside the finger, `knuckle` the height where its area ends (above the gaps beside it).
 * Fingers: 0-3 left little to index, 4 left thumb, 5 right thumb, 6-9 right index to little.
 */
const SKELETON = {
  0: { joints: [[74, 150], [82, 110], [88, 86], [93, 68]], seed: [84, 105], knuckle: 153 },
  1: { joints: [[108, 150], [123, 104], [135, 82], [142, 64]], seed: [124, 100], knuckle: 153 },
  2: { joints: [[150, 150], [165, 103], [175, 80], [182, 62]], seed: [172, 94], knuckle: 153 },
  3: { joints: [[186, 155], [203, 108], [214, 80], [222, 62]], seed: [215, 94], knuckle: 157 },
  4: { joints: [[198, 250], [216, 212], [231, 182], [238, 148]], seed: [240, 142], knuckle: 211 },
  5: { joints: [[380, 250], [360, 212], [345, 182], [338, 148]], seed: [345, 146], knuckle: 212 },
  6: { joints: [[395, 155], [378, 108], [366, 82], [361, 64]], seed: [375, 94], knuckle: 157 },
  7: { joints: [[433, 150], [418, 103], [407, 80], [402, 62]], seed: [415, 94], knuckle: 154 },
  8: { joints: [[468, 150], [455, 104], [446, 82], [442, 64]], seed: [455, 100], knuckle: 154 },
  9: { joints: [[505, 150], [497, 110], [491, 88], [487, 70]], seed: [495, 105], knuckle: 154 },
};
const HAND_FINGERS = { left: [0, 1, 2, 3, 4], right: [5, 6, 7, 8, 9] };
/** The wrist: the hand turns around it. */
const WRIST = { left: [130, 300], right: [440, 300] };
/** Share of a bone's length over which a point blends into the next bone (and the first bone into the palm). */
const BLEND = 0.15;

// Lines apart from the outline up to this size (pixels) are the joint creases.
const CREASE_MAX = 2500;
// A nail is a small grey area closed by the nail's curve and the fingertip; the lines are widened by NAIL_GAP pixels first.
const NAIL_GAP = 2, NAIL_MIN = 150, NAIL_MAX = 5000;
// A line belongs to a finger up to this many pixels from its area.
const REACH = 12;

if (!existsSync(HOME)) throw new Error(`${HOME} is missing (node scripts/hands-base.mjs)`);
const { data, info } = await sharp(HOME).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const N = W * H;
const px = (p) => [data[p * 3], data[p * 3 + 1], data[p * 3 + 2]];
const lum = ([r, g, b]) => 0.3 * r + 0.59 * g + 0.11 * b;
const chroma = ([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b);

// ---- where the keyboard is: the orange stripe under Q and the green one under Ä ----
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

// ---- masks: the hands' grey, their lines, their nails ----
function components(on, diagonal) {
  const label = new Int32Array(N).fill(-1), sizes = [];
  const steps = diagonal ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let st = 0; st < N; st++) {
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
}
function dilate(m, r) {
  const a = new Uint8Array(N), b = new Uint8Array(N);
  for (let y = 0; y < H; y++) { let last = -1e9; for (let x = 0; x < W; x++) { if (m[y * W + x]) last = x; a[y * W + x] = x - last <= r ? 1 : 0; } last = 1e9; for (let x = W - 1; x >= 0; x--) { if (m[y * W + x]) last = x; if (last - x <= r) a[y * W + x] = 1; } }
  for (let x = 0; x < W; x++) { let last = -1e9; for (let y = 0; y < H; y++) { if (a[y * W + x]) last = y; b[y * W + x] = y - last <= r ? 1 : 0; } last = 1e9; for (let y = H - 1; y >= 0; y--) { if (a[y * W + x]) last = y; if (last - y <= r) b[y * W + x] = 1; } }
  return b;
}
/** Steps (4-neighbour) from the mask, up to `reach`; farther pixels get reach + 1. */
function distance(m, reach) {
  const d = new Uint8Array(N).fill(reach + 1);
  let front = [];
  for (let p = 0; p < N; p++) if (m[p]) { d[p] = 0; front.push(p); }
  for (let k = 1; k <= reach && front.length; k++) {
    const next = [];
    for (const p of front) {
      const x = p % W;
      for (const qq of [p - 1, p + 1, p - W, p + W]) {
        if (qq < 0 || qq >= N || (qq === p - 1 && x === 0) || (qq === p + 1 && x === W - 1) || d[qq] <= k) continue;
        d[qq] = k;
        next.push(qq);
      }
    }
    front = next;
  }
  return d;
}
const handish = new Uint8Array(N), grey = new Uint8Array(N), dark = new Uint8Array(N);
for (let p = 0; p < N; p++) {
  const c = px(p), l = lum(c);
  handish[p] = chroma(c) < 20 && l < 175 ? 1 : 0;
  grey[p] = chroma(c) < 20 && l > 110 && l < 175 ? 1 : 0;
  dark[p] = l < 90 ? 1 : 0;
}
const pieces = components((p) => handish[p], false);
const big = new Set(pieces.sizes.map((n, i) => [n, i]).filter(([n]) => n > N * 0.004).map(([, i]) => i));
for (let p = 0; p < N; p++) if (!big.has(pieces.label[p])) grey[p] = 0;
const nearGrey = dilate(grey, 7);
const ink = new Uint8Array(N);
for (let p = 0; p < N; p++) ink[p] = dark[p] && big.has(pieces.label[p]) && nearGrey[p] ? 1 : 0;
const nearDark = dilate(dark, NAIL_GAP);
const open = new Uint8Array(N);
for (let p = 0; p < N; p++) open[p] = grey[p] && !nearDark[p] ? 1 : 0;
const areas = components((p) => open[p], false);
const small = new Uint8Array(N);
for (let p = 0; p < N; p++) small[p] = open[p] && areas.sizes[areas.label[p]] >= NAIL_MIN && areas.sizes[areas.label[p]] <= NAIL_MAX ? 1 : 0;
const nails = dilate(small, NAIL_GAP);
const inkParts = components((p) => ink[p], true);

// ---- the fingers' areas: from a point inside, without crossing the outline (creases and nails belong to the finger), above the knuckle ----
const nailZone = dilate(small, 6);
const passable = (p) => grey[p] || nails[p] || nailZone[p] || (ink[p] && inkParts.sizes[inkParts.label[p]] <= CREASE_MAX);
const owner = new Int8Array(N).fill(-1), ownerDist = new Uint8Array(N).fill(255);
for (const [f, bone] of Object.entries(SKELETON)) {
  const [sx0, sy0] = toPx(...bone.seed).map(Math.round), cut = toPx(0, bone.knuckle)[1];
  let start = -1;
  for (let r = 0; r < 14 && start < 0; r++) for (let dy = -r; dy <= r && start < 0; dy++) for (let dx = -r; dx <= r; dx++) {
    const p = (sy0 + dy) * W + sx0 + dx;
    if (grey[p]) { start = p; break; }
  }
  if (start < 0) throw new Error(`no grey at finger ${f}`);
  const area = new Uint8Array(N), stack = [start];
  area[start] = 1;
  while (stack.length) {
    const p = stack.pop(), x = p % W, y = (p - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, qq = ny * W + nx;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && ny < cut && !area[qq] && passable(qq)) { area[qq] = 1; stack.push(qq); }
    }
  }
  const d = distance(area, REACH);
  for (let p = 0; p < N; p++) if (d[p] <= REACH && d[p] < ownerDist[p]) { ownerDist[p] = d[p]; owner[p] = Number(f); }
}

// ---- trace ----
const png = (on, thin = false) => {
  const out = Buffer.alloc(N, 255);
  for (let p = 0; p < N; p++) if (on(p)) out[p] = 0;
  const img = sharp(out, { raw: { width: W, height: H, channels: 1 } });
  // A soft pixel off each side: the outline a little thinner than drawn.
  return (thin ? img.blur(1).threshold(85) : img).png().toBuffer();
};
const svgOf = async (buf) => new Promise((ok, fail) => potrace.trace(buf, { turdSize: 20, alphaMax: 1, optTolerance: 0.4, threshold: 128 }, (err, out) => (err ? fail(err) : ok(out))));
const subpaths = (svg) => (/\sd="([^"]*)"/.exec(svg)?.[1] ?? '').split(/(?=M)/).map((x) => x.trim()).filter(Boolean);
const outline = subpaths(await svgOf(await png((p) => ink[p] && inkParts.sizes[inkParts.label[p]] > CREASE_MAX, true)));
const creases = subpaths(await svgOf(await png((p) => ink[p] && inkParts.sizes[inkParts.label[p]] <= CREASE_MAX)));
const nailPaths = subpaths(await svgOf(await png((p) => nails[p])));
const midX = (q.x + ae.x) / 2;
const sideOfPath = (d) => (Number(/M\s*([\d.]+)/.exec(d)[1]) < midX ? 'left' : 'right');

// ---- binding: each point to at most two bones (bone f*3+i of finger f, -1 the palm) ----
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
/** Where a point lies along a finger: 0 at its first joint, 1 at the next, ... 3 at the pad (beyond the ends too). */
function along(f, p) {
  const j = SKELETON[f].joints;
  let best = { t: 0, d: Infinity };
  for (let i = 0; i < 3; i++) {
    const a = j[i], ab = sub(j[i + 1], a), len2 = dot(ab, ab);
    const u = dot(sub(p, a), ab) / len2, c = Math.max(0, Math.min(1, u));
    const d = Math.hypot(p[0] - (a[0] + ab[0] * c), p[1] - (a[1] + ab[1] * c));
    if (d < best.d) best = { t: i + (i === 0 ? Math.min(1, u) : i === 2 ? Math.max(0, u) : c), d };
  }
  return best.t;
}
/** Weights of a point in picture pixels: [boneA, weightA, boneB] (B weighs 1 - weightA; -1 is the palm). */
function bind(pxPoint) {
  const [x, y] = pxPoint.map(Math.round);
  const f = x >= 0 && y >= 0 && x < W && y < H ? owner[y * W + x] : -1;
  if (f < 0) return [-1, 1, -1];
  const t = along(f, toKeys(...pxPoint));
  if (t < BLEND) return [-1, Math.max(0, Math.min(1, (BLEND - t) / (2 * BLEND))), f * 3];
  for (let i = 1; i < 3; i++) if (Math.abs(t - i) < BLEND) return [f * 3 + i - 1, (i + BLEND - t) / (2 * BLEND), f * 3 + i];
  return [f * 3 + Math.min(2, Math.floor(t)), 1, -1];
}
/** A path as its commands with '#' for each point, its points in app units and their weights. */
function rigged(d) {
  const pts = [], w = [];
  const cmds = d.replace(/(-?\d+(?:\.\d+)?)[ ,]+(-?\d+(?:\.\d+)?)/g, (_, a, b) => {
    const p = [Number(a), Number(b)];
    pts.push(...toApp(toKeys(...p)));
    const [b1, w1, b2] = bind(p);
    w.push(b1, +w1.toFixed(2), b2);
    return '#';
  }).replace(/,/g, '').replace(/\s+/g, ' ');
  return { cmds, pts, w };
}
/** The finger a nail lies on: the owner of its middle. */
function nailFinger(d) {
  const n = d.match(/-?\d+(?:\.\d+)?/g).map(Number), xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2);
  return owner[Math.round((Math.min(...ys) + Math.max(...ys)) / 2) * W + Math.round((Math.min(...xs) + Math.max(...xs)) / 2)];
}
const out = {};
for (const side of ['left', 'right']) {
  out[side] = {
    skeleton: Object.fromEntries(HAND_FINGERS[side].map((f) => [f, SKELETON[f].joints.map(toApp)])),
    wrist: toApp(WRIST[side]),
    lines: outline.filter((d) => sideOfPath(d) === side).map(rigged),
    creases: creases.filter((d) => sideOfPath(d) === side).map(rigged),
    nails: nailPaths.filter((d) => sideOfPath(d) === side).map((d) => ({ f: nailFinger(d), ...rigged(d) })),
  };
}
writeFileSync(OUT, JSON.stringify(out));

// ---- debug: the fingers' areas and the bones ----
mkdirSync(`${SRC}/debug`, { recursive: true });
const colours = [[230, 159, 0], [86, 180, 233], [0, 158, 115], [240, 196, 25], [150, 150, 150], [150, 150, 150], [0, 114, 178], [213, 94, 0], [204, 121, 167], [143, 188, 58]];
const pic = Buffer.alloc(N * 3, 255);
for (let p = 0; p < N; p++) if (ink[p]) pic.set([30, 30, 30], p * 3); else if (owner[p] >= 0) pic.set(colours[owner[p]].map((c) => Math.round(255 - (255 - c) * 0.35)), p * 3);
const bones = Object.values(SKELETON).map((b) => `<polyline points="${b.joints.map((j) => toPx(...j).join(',')).join(' ')}" fill="none" stroke="#d00" stroke-width="3"/>`).join('');
await sharp(pic, { raw: { width: W, height: H, channels: 3 } }).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${bones}</svg>`) }]).png().toFile(`${SRC}/debug/rig.png`);
console.log(`${OUT}: ${['left', 'right'].map((s2) => `${s2} ${out[s2].lines.length} outline, ${out[s2].creases.length} creases, ${out[s2].nails.length} nails (fingers ${out[s2].nails.map((n) => n.f).join(',')})`).join('; ')}`);
