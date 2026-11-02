// Makes the base picture for Gemini's hand poses, assets-src/hands/home-base.png, from Gemini's first home picture
// (assets-src/hands/home-gemini.jpg) and the keyboard it was drawn on (assets-src/hands/keyboard.png).
//
// Gemini drew the fingertips low on their keys, the right hand a little to the right, the little fingers spread and the ring
// fingers' middle joints apart from the middle fingers. Every pose drawn from that picture kept those faults, so this
// picture fixes them once, in the drawing itself: the hands are stretched up from the wrists until the fingertips rest in
// the middle of their keys, the right hand moves a little left, the little fingers come closer and the ring fingers' middle
// joints lie against the middle fingers. The keyboard is the original one, so keys the hands no longer cover show.
//
// Usage: node scripts/hands-base.mjs
import sharp from 'sharp';

const SRC = 'assets-src/hands';
// Picture key units: square keys, 44 per key, the Q key's middle at (86, 20); the home row's middle is at 64.
const PITCH = 44, Q = [86, 20], AE_X = 570;
/** Where the fingertips' top edge is now and where it goes (a fingertip's pad then lies on the key's middle). */
const TIP_NOW = 76, TIP_TO = 57;
/** The right hand moves this much to the left. */
const RIGHT_IN = 5;
/** The little fingers come this much closer to the others. */
const PINKY_IN = 4.5;
/** The ring fingers: a point inside, their knuckle's height, and their middle joint's (and tip's) move towards the middle finger. */
const RINGS = [{ seed: [122, 115], knuckle: 164, mid: 3, tip: 1 }, { seed: [462, 115], knuckle: 165, mid: -3, tip: -1 }];

const smooth = (v) => (v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v));

async function calibrate(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const px = (p) => [data[p * 3], data[p * 3 + 1], data[p * 3 + 2]];
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
  return { data, W, H, px, s, toPx: (X, Y) => [q.x + (X - Q[0]) * s, qy + (Y - Q[1]) * s], toKeys: (x, y) => [Q[0] + (x - q.x) / s, Q[1] + (y - qy) / s] };
}

const pic = await calibrate(`${SRC}/home-gemini.jpg`);
const kb = await calibrate(`${SRC}/keyboard.png`);
const { W, H, px, s, toPx, toKeys } = pic;
const N = W * H;

// The hands: big pieces of flat grey and black.
const lum = ([r, g, b]) => 0.3 * r + 0.59 * g + 0.11 * b;
const chroma = ([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b);
const handish = new Uint8Array(N), grey = new Uint8Array(N);
for (let p = 0; p < N; p++) {
  const c = px(p);
  handish[p] = chroma(c) < 20 && lum(c) < 175 ? 1 : 0;
  grey[p] = chroma(c) < 20 && lum(c) > 110 && lum(c) < 175 ? 1 : 0;
}
const label = new Int32Array(N).fill(-1), sizes = [];
for (let st = 0; st < N; st++) {
  if (!handish[st] || label[st] >= 0) continue;
  const id = sizes.length, stack = [st];
  label[st] = id;
  let n = 0;
  while (stack.length) {
    const p = stack.pop(), x = p % W, y = (p - x) / W;
    n++;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, q = ny * W + nx;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && handish[q] && label[q] < 0) { label[q] = id; stack.push(q); }
    }
  }
  sizes.push(n);
}
const hand = new Uint8Array(N);
for (let p = 0; p < N; p++) hand[p] = label[p] >= 0 && sizes[label[p]] > N * 0.004 ? 1 : 0;
// The hands' small gaps (nails, creases) belong to them too: close the mask over a few pixels.
const dilate = (m, r) => {
  const a = new Uint8Array(N), b = new Uint8Array(N);
  for (let y = 0; y < H; y++) { let last = -1e9; for (let x = 0; x < W; x++) { if (m[y * W + x]) last = x; a[y * W + x] = x - last <= r ? 1 : 0; } last = 1e9; for (let x = W - 1; x >= 0; x--) { if (m[y * W + x]) last = x; if (last - x <= r) a[y * W + x] = 1; } }
  for (let x = 0; x < W; x++) { let last = -1e9; for (let y = 0; y < H; y++) { if (a[y * W + x]) last = y; b[y * W + x] = y - last <= r ? 1 : 0; } last = 1e9; for (let y = H - 1; y >= 0; y--) { if (a[y * W + x]) last = y; if (last - y <= r) b[y * W + x] = 1; } }
  return b;
};
const erode = (m, r) => { const inv = new Uint8Array(N); for (let p = 0; p < N; p++) inv[p] = m[p] ? 0 : 1; const d = dilate(inv, r); for (let p = 0; p < N; p++) inv[p] = d[p] ? 0 : 1; return inv; };
const handArea = erode(dilate(hand, 3), 3);

// The ring fingers' own grey (reached from their point without crossing a line, above the knuckle), grown over their outline.
const ink = new Uint8Array(N);
for (let p = 0; p < N; p++) ink[p] = handArea[p] && lum(px(p)) < 90 ? 1 : 0;
const rings = RINGS.map((r) => {
  const [sx0, sy0] = toPx(...r.seed).map(Math.round), cut = toPx(0, r.knuckle)[1];
  const area = new Uint8Array(N);
  let start = -1;
  for (let k = 0; k < 14 && start < 0; k++) for (let dy = -k; dy <= k && start < 0; dy++) for (let dx = -k; dx <= k; dx++) {
    const p = (sy0 + dy) * W + sx0 + dx;
    if (grey[p] && !ink[p]) { start = p; break; }
  }
  const stack = [start];
  area[start] = 1;
  let top = H;
  while (stack.length) {
    const p = stack.pop(), x = p % W, y = (p - x) / W;
    top = Math.min(top, y);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, q = ny * W + nx;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && ny < cut && !area[q] && handArea[q] && !ink[q]) { area[q] = 1; stack.push(q); }
    }
  }
  return { ...r, own: dilate(area, 5), top, cut };
});

// ---- where each new pixel comes from: undo the stretch and the right hand's move, the little fingers', the ring fingers' ----
const [, tipNow] = toPx(0, TIP_NOW), [, tipTo] = toPx(0, TIP_TO);
const k = (H - tipTo) / (H - tipNow);
const midX = (toPx(273, 0)[0] + toPx(317, 0)[0]) / 2;
const [lFull] = toPx(108, 0), [lNone] = toPx(128, 0), [rNone] = toPx(462, 0), [rFull] = toPx(482, 0);
const [, yFull] = toPx(0, 110), [, yNone] = toPx(0, 150);
const pinky = (x, y) => {
  const v = 1 - smooth((y - yFull) / (yNone - yFull));
  if (x < midX) return PINKY_IN * s * v * (1 - smooth((x - lFull) / (lNone - lFull)));
  return -PINKY_IN * s * v * smooth((x - rNone) / (rFull - rNone));
};
/** The source of a pixel of the new picture, in the old one (null when it is not hand). */
function source(x, y) {
  // The stretch from the bottom edge and the right hand's move.
  let sy = H - (H - y) / k, sx = x >= midX ? x + RIGHT_IN * s : x;
  sx -= pinky(sx, sy);
  for (const r of rings) {
    const t = Math.max(0, Math.min(1, (r.cut - sy) / (r.cut - r.top)));
    const dx = (t < 0.5 ? r.mid * (t / 0.5) : r.mid + (r.tip - r.mid) * ((t - 0.5) / 0.5)) * s;
    const p = Math.round(sy) * W + Math.round(sx - dx);
    if (r.own[p]) return p;
  }
  const p = Math.round(sy) * W + Math.round(sx);
  return sx >= 0 && sx < W && sy >= 0 && sy < H && handArea[p] ? p : null;
}

// The keyboard under the hands: keyboard.png, scaled and placed onto this picture by the stripes under Q and Ä.
const kbScale = kb.s / s;
const keyboard = await sharp(`${SRC}/keyboard.png`).removeAlpha().resize(Math.round(kb.W / kbScale), Math.round(kb.H / kbScale)).raw().toBuffer({ resolveWithObject: true });
const [kx0, ky0] = kb.toPx(0, 0).map((v) => v / kbScale), [px0, py0] = toPx(0, 0);
const out = Buffer.alloc(N * 3, 255);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const o = (y * W + x) * 3, src = source(x, y);
  if (src !== null) { out.set(pic.data.subarray(src * 3, src * 3 + 3), o); continue; }
  const bx = Math.round(x - px0 + kx0), by = Math.round(y - py0 + ky0);
  if (bx >= 0 && by >= 0 && bx < keyboard.info.width && by < keyboard.info.height) out.set(keyboard.data.subarray((by * keyboard.info.width + bx) * 3, (by * keyboard.info.width + bx) * 3 + 3), o);
}
await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toFile(`${SRC}/home-base.png`);
console.log(`${SRC}/home-base.png ${W}x${H}, stretch ${k.toFixed(3)}`);
