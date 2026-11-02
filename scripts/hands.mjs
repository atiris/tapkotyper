// Turns Gemini's hand pictures (assets-src/hands/) into the outline hands of the on-screen keyboard (public/hands/poses.json).
//
// Every picture is a drawing of flat grey hands with a black outline over assets-src/hands/keyboard.png (a keyboard on the real
// 15-unit grid, square keys). `home-base.png` (made by scripts/hands-base.mjs) holds both hands in the home position, fingertips
// in the middle of their keys; `<KeyCode>.png` (KeyU.png ...) is Gemini's reach of one hand to another key, drawn from
// home-base.png (prompt and the owner's rules for the hands in assets-src/PROMPTS.md, section 12). Small changes Gemini cannot draw (a home key
// pressed, the thumbs on the space bar, a finger a little more bent) are made here: a finger's own area of the picture (its grey
// between its outline, up to its knuckle) moves, its tip most, its middle joint less, its knuckle not at all; no other finger moves.
// The grey is then dropped, the lines are traced to SVG paths, and the paths are moved onto the app's keyboard: units of the full
// size keyboard (a key and its gap 58 wide, a row 50 high, the digit row on top), the fingertips in the middle of their keys.
//
// Usage: node scripts/hands.mjs   (a picture of each result goes to assets-src/hands/debug/)
import sharp from 'sharp';
import potrace from 'potrace';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';

const SRC = 'assets-src/hands';
const HOME = `${SRC}/home-base.png`;
const OUT = 'public/hands/poses.json';

// All positions below are picture key units: the keyboard Gemini drew on has square keys, 44 per key, the Q key's middle at (86, 20).
const PITCH = 44, Q = [86, 20], AE_X = 570;

/**
 * The fingers (0-3 left little to index, 4 and 5 the thumbs, 6-9 right index to little) as home-base.png has them: a point
 * inside each, and the height where it joins the hand (just above the higher of the two gaps beside it).
 */
const FINGERS = {
  0: { seed: [84, 105], knuckle: 153 }, 1: { seed: [124, 100], knuckle: 153 }, 2: { seed: [172, 94], knuckle: 153 }, 3: { seed: [215, 94], knuckle: 157 },
  4: { seed: [240, 142], knuckle: 211 }, 5: { seed: [345, 146], knuckle: 212 },
  6: { seed: [375, 94], knuckle: 157 }, 7: { seed: [415, 94], knuckle: 154 }, 8: { seed: [455, 100], knuckle: 154 }, 9: { seed: [495, 105], knuckle: 154 },
};
const sideOf = (f) => (f <= 4 ? 'left' : 'right');

/**
 * A finger's move: `tip` and `mid` (its middle joint) as [dx, dy]; the knuckle stays. Rules the owner gave:
 * - a pressed home key moves its finger's tip a little towards the palm and its middle joint with it, never only the last joint
 *   (that looks broken); a little finger and a ring finger also come closer to the finger beside them (towards the index), the
 *   ring finger as if it slid a little under the middle finger;
 * - no other finger moves, except where said (the index pressed brings the middle finger very slightly closer);
 * - the thumbs on the space bar go a little lower;
 * - reaching up with the index pulls the thumb a little up, after the finger, and towards the reach;
 * - a finger beside a reaching one bends a little more, and the whole hand moves up a hair.
 */
const press = (f, tip, mid) => ({ f, tip, mid });
/** Gemini's reaches: the hand, how much it moves down (negative: up), the moves made on top and points inside moved fingers. */
const POSES = {
  // A reach up: Gemini draws the index finger only; the middle finger bends a little after it, the ring finger hardly, the little
  // finger not at all, the thumb follows a little up and towards the reach, the whole hand moves up a hair.
  KeyR: { hand: 'left', down: -2, moves: [press(2, [1, 4], [0.5, 2]), press(1, [0.5, 1], [0.5, 0.5]), press(4, [2, -3], [1, -1.5])] },
  KeyT: { hand: 'left', down: -2, moves: [press(2, [1, 4], [0.5, 2]), press(1, [0.5, 1], [0.5, 0.5]), press(4, [2, -3], [1, -1.5])] },
  KeyU: { hand: 'right', down: -2, moves: [press(7, [-1, 4], [-0.5, 2]), press(8, [-0.5, 1], [-0.5, 0.5]), press(5, [-2, -3], [-1, -1.5])] },
};
/** Made from home.jpg: the home keys pressed and the space bar. */
const MADE = {
  KeyA: [press(0, [2, 5], [2, 2])],
  KeyS: [press(1, [1, 5], [3, 2])],
  KeyD: [press(2, [0, 5], [0, 3])],
  KeyF: [press(3, [2, 5], [1.5, 3]), press(2, [1, 0], [1.5, 0])],
  KeyJ: [press(6, [-2, 5], [-1.5, 3]), press(7, [-1, 0], [-1.5, 0])],
  KeyK: [press(7, [0, 5], [0, 3])],
  KeyL: [press(8, [-1, 5], [-3, 2])],
  Semicolon: [press(9, [-2, 5], [-2, 2])],
  // Both thumbs are made; the app presses the one of the hand that did not type the last key.
  Space: [press(4, [0, 4], [0, 2]), press(5, [0, 4], [0, 2])],
};

// home-base.png already has the fingertips in the middle of the keys: no fit left (kept as a knob for a later base).
const FIT = { lift: 0, scale: [1, 1], tipY: 64, cx: { left: 163, right: 427 } };
// Onto the app's keyboard: a key and its gap 58 wide, a row 50 high, one row (the digits) above.
const APP = { unit: 58, row: 50 };
// Lines apart from the outline up to this size (pixels) are the joint creases.
const CREASE_MAX = 2500;
// A nail is a small grey area closed by the nail's curve and the fingertip; the lines are widened by NAIL_GAP pixels
// first, so a curve that does not quite meet the outline still closes it. Smaller areas are the keys' bumps.
const NAIL_GAP = 2, NAIL_MIN = 150, NAIL_MAX = 5000;
// A moving finger takes the lines up to this many pixels from its area (its outline is about 6 thick).
const OWN_REACH = 10;
// A line this close to another finger's grey is shared with it.
const SHARED = 7;

/** Traces one picture with `moves` made first; returns per hand its outline, creases and nails in app units. */
async function trace(file, moves, seeds = {}, down = 0, debug = null) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const N = W * H;
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

  // ---- masks: the hands (big pieces of flat grey and black), their grey, their lines, their nails ----
  const components = (on, diagonal) => {
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
  };
  /** A mask grown by r pixels (a square). */
  const dilate = (m, r) => {
    const a = new Uint8Array(N), b = new Uint8Array(N);
    for (let y = 0; y < H; y++) { let last = -1e9; for (let x = 0; x < W; x++) { if (m[y * W + x]) last = x; a[y * W + x] = x - last <= r ? 1 : 0; } last = 1e9; for (let x = W - 1; x >= 0; x--) { if (m[y * W + x]) last = x; if (last - x <= r) a[y * W + x] = 1; } }
    for (let x = 0; x < W; x++) { let last = -1e9; for (let y = 0; y < H; y++) { if (a[y * W + x]) last = y; b[y * W + x] = y - last <= r ? 1 : 0; } last = 1e9; for (let y = H - 1; y >= 0; y--) { if (a[y * W + x]) last = y; if (last - y <= r) b[y * W + x] = 1; } }
    return b;
  };
  /** Steps (4-neighbour) from the mask, up to `reach`; farther pixels get reach + 1. */
  const distance = (m, reach) => {
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
  };
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
  // The lines: dark pixels of the hands with grey close by (letters touching a fingertip have none).
  const nearGrey = dilate(grey, 7);
  const ink = new Uint8Array(N);
  for (let p = 0; p < N; p++) ink[p] = dark[p] && big.has(pieces.label[p]) && nearGrey[p] ? 1 : 0;
  // The nails: grey away from the widened lines, in small closed pieces, grown back by the widening.
  const nearDark = dilate(dark, NAIL_GAP);
  const open = new Uint8Array(N);
  for (let p = 0; p < N; p++) open[p] = grey[p] && !nearDark[p] ? 1 : 0;
  const areas = components((p) => open[p], false);
  const small = new Uint8Array(N);
  for (let p = 0; p < N; p++) small[p] = open[p] && areas.sizes[areas.label[p]] >= NAIL_MIN && areas.sizes[areas.label[p]] <= NAIL_MAX ? 1 : 0;
  let nails = dilate(small, NAIL_GAP);
  let lines = ink;

  // ---- the fingers' own moves ----
  // Only the outline parts fingers: a joint crease, a nail's curve and the nail inside it belong to the finger they lie on.
  const inkParts = components((p) => ink[p], true);
  const nailZone = dilate(small, 6);
  const passable = (p) => grey[p] || nails[p] || nailZone[p] || (ink[p] && inkParts.sizes[inkParts.label[p]] <= CREASE_MAX);
  /** A finger's own area: reached from its point without crossing its outline, above its knuckle. */
  const fingerArea = (f) => {
    const [sx0, sy0] = toPx(...(seeds[f] ?? FINGERS[f].seed)).map(Math.round);
    const cut = toPx(0, FINGERS[f].knuckle)[1];
    let start = -1;
    for (let r = 0; r < 14 && start < 0; r++) for (let dy = -r; dy <= r && start < 0; dy++) for (let dx = -r; dx <= r; dx++) {
      const p = (sy0 + dy) * W + sx0 + dx;
      if (grey[p]) { start = p; break; }
    }
    if (start < 0) throw new Error(`${file}: no grey at finger ${f}`);
    const area = new Uint8Array(N), stack = [start];
    area[start] = 1;
    let top = H;
    while (stack.length) {
      const p = stack.pop(), x = p % W, y = (p - x) / W;
      top = Math.min(top, y);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, qq = ny * W + nx;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && ny < cut && !area[qq] && passable(qq)) { area[qq] = 1; stack.push(qq); }
      }
    }
    return { area, top, cut };
  };
  const byFinger = new Map();
  for (const m of moves) {
    const was = byFinger.get(m.f) ?? { f: m.f, tip: [0, 0], mid: [0, 0] };
    byFinger.set(m.f, { f: m.f, tip: [was.tip[0] + m.tip[0], was.tip[1] + m.tip[1]], mid: [was.mid[0] + m.mid[0], was.mid[1] + m.mid[1]] });
  }
  for (const m of byFinger.values()) {
    const { area, top, cut } = fingerArea(m.f);
    // The finger's outline moves whole; a line it shares with a finger it touches stays whole with that finger (a moved half
    // would leave a thin ghost of the neighbour's).
    const otherGrey = new Uint8Array(N);
    for (let p = 0; p < N; p++) otherGrey[p] = grey[p] && !area[p] ? 1 : 0;
    const toArea = distance(area, OWN_REACH), toOther = distance(otherGrey, OWN_REACH);
    const own = new Uint8Array(N);
    for (let p = 0; p < N; p++) own[p] = toArea[p] <= OWN_REACH && toArea[p] < toOther[p] && toOther[p] > SHARED ? 1 : 0;
    const shift = (y) => {
      const t = Math.max(0, Math.min(1, (cut - y) / (cut - top)));
      const [a, b] = t < 0.5 ? [[0, 0], m.mid] : [m.mid, m.tip];
      const u = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
      return [(a[0] + (b[0] - a[0]) * u) * s, (a[1] + (b[1] - a[1]) * u) * s];
    };
    const move = (buf) => {
      const out = new Uint8Array(N);
      for (let p = 0; p < N; p++) out[p] = buf[p] && !own[p] ? 1 : 0;
      for (let y = 0; y < H; y++) {
        const [dx, dy] = shift(y);
        for (let x = 0; x < W; x++) {
          const sx = Math.round(x - dx), sy = Math.round(y - dy);
          if (sx >= 0 && sy >= 0 && sx < W && sy < H && buf[sy * W + sx] && own[sy * W + sx]) out[y * W + x] = 1;
        }
      }
      return out;
    };
    lines = move(lines);
    nails = move(nails);
  }

  // ---- to SVG ----
  const lineParts = components((p) => lines[p], true);
  const png = (on, thin = false) => {
    const out = Buffer.alloc(N, 255);
    for (let p = 0; p < N; p++) if (on(p)) out[p] = 0;
    const img = sharp(out, { raw: { width: W, height: H, channels: 1 } });
    // A soft pixel off each side: the outline a little thinner than Gemini drew it.
    return (thin ? img.blur(1).threshold(85) : img).png().toBuffer();
  };
  if (debug) {
    const out = Buffer.alloc(N * 3, 255);
    for (let p = 0; p < N; p++) if (nails[p]) out.set([240, 180, 60], p * 3); else if (lines[p]) out.set([40, 40, 40], p * 3);
    await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toFile(debug);
  }
  const svgOf = async (buf) => new Promise((ok, fail) => potrace.trace(buf, { turdSize: 20, alphaMax: 1, optTolerance: 0.4, threshold: 128 }, (err, out) => (err ? fail(err) : ok(out))));
  const halves = (svg) => {
    const out = { left: [], right: [] };
    const d = /\sd="([^"]*)"/.exec(svg)?.[1] ?? '';
    for (const sub of d.split(/(?=M)/).filter((x) => x.trim())) {
      const x = Number(/M\s*([\d.]+)/.exec(sub)[1]);
      out[x < (q.x + ae.x) / 2 ? 'left' : 'right'].push(sub.trim());
    }
    return out;
  };
  const outline = halves(await svgOf(await png((p) => lines[p] && lineParts.sizes[lineParts.label[p]] > CREASE_MAX, true)));
  const creases = halves(await svgOf(await png((p) => lines[p] && lineParts.sizes[lineParts.label[p]] <= CREASE_MAX)));
  const nailPaths = halves(await svgOf(await png((p) => nails[p])));

  /** Every point of a path from picture pixels into app keyboard units, with the hand's fit and its move down. */
  const place = (d, side) => d.replace(/(-?\d+(?:\.\d+)?)[ ,]+(-?\d+(?:\.\d+)?)/g, (_, a, b) => {
    const [kx, ky] = toKeys(Number(a), Number(b));
    const fx = FIT.cx[side] + (kx - FIT.cx[side]) * FIT.scale[0];
    const fy = FIT.tipY + (ky - FIT.tipY) * FIT.scale[1] - FIT.lift + down;
    return `${((fx * APP.unit) / PITCH).toFixed(1)} ${(APP.row + (fy * APP.row) / PITCH).toFixed(1)}`;
  }).replace(/,/g, '');
  const middle = (d) => {
    const n = d.match(/-?\d+(?:\.\d+)?/g).map(Number), xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2);
    return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  };
  console.log(file, moves.map((m) => m.f).join(',') || '-', `scale ${s.toFixed(3)}`);
  return Object.fromEntries(['left', 'right'].map((side) => [side, {
    d: place(outline[side].join(' '), side),
    creases: place(creases[side].join(' '), side),
    nails: nailPaths[side].map((sub) => { const d = place(sub, side); return { d, at: middle(d) }; }),
  }]));
}

/** The fingers of a hand's home nails: the thumb's the lowest, the others by x from the little finger. */
const ORDER = { left: [0, 1, 2, 3], right: [6, 7, 8, 9] }, THUMB = { left: 4, right: 5 };
function homeFingers(side, nails) {
  const thumb = nails.reduce((a, b) => (b.at[1] > a.at[1] ? b : a));
  const rest = nails.filter((n) => n !== thumb).sort((a, b) => a.at[0] - b.at[0]);
  if (rest.length !== 4) throw new Error(`home: ${side} hand has ${rest.length + 1} nails, 5 expected`);
  return [{ ...thumb, f: THUMB[side] }, ...rest.map((n, i) => ({ ...n, f: ORDER[side][i] }))];
}
/** A pose's nails take the finger of the nearest home nail; a finger whose nail the picture does not close keeps its home nail. */
const nearest = (home, at) => home.reduce((a, b) => (Math.hypot(b.at[0] - at[0], b.at[1] - at[1]) < Math.hypot(a.at[0] - at[0], a.at[1] - at[1]) ? b : a)).f;
function poseNails(home, nails) {
  const found = nails.map((n) => ({ d: n.d, f: nearest(home, n.at) }));
  for (const n of home) if (!found.some((m) => m.f === n.f)) found.push({ d: n.d, f: n.f });
  return found.map(({ d, f }) => ({ d, f }));
}
const hand = (lines, home) => ({ d: lines.d, creases: lines.creases, nails: poseNails(home, lines.nails) });

if (!existsSync(HOME)) throw new Error(`${HOME} is missing (node scripts/hands-base.mjs)`);
mkdirSync(`${SRC}/debug`, { recursive: true });
const home = await trace(HOME, [], {}, 0, `${SRC}/debug/home.png`);
const homeNails = { left: homeFingers('left', home.left.nails), right: homeFingers('right', home.right.nails) };
const out = { home: { left: hand(home.left, homeNails.left), right: hand(home.right, homeNails.right) }, keys: {} };
for (const file of readdirSync(SRC).filter((f) => /^[A-Z]\w+\.(jpg|png)$/.test(f))) {
  const code = file.replace(/\.(jpg|png)$/, '');
  const pose = POSES[code];
  if (!pose) { console.warn(`no pose settings for ${code}, skipped`); continue; }
  const lines = await trace(`${SRC}/${file}`, pose.moves, pose.seeds, pose.down, `${SRC}/debug/${code}.png`);
  out.keys[code] = { [pose.hand]: hand(lines[pose.hand], homeNails[pose.hand]) };
}
for (const [code, moves] of Object.entries(MADE)) {
  const lines = await trace(HOME, moves, {}, 0, `${SRC}/debug/${code}.png`);
  const sides = [...new Set(moves.map((m) => sideOf(m.f)))];
  out.keys[code] = Object.fromEntries(sides.map((side) => [side, hand(lines[side], homeNails[side])]));
}
writeFileSync(OUT, JSON.stringify(out));
console.log(`${OUT}: home and ${Object.keys(out.keys).length} key poses`);
