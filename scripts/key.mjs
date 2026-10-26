// Removes the flat key color (magenta or green) Gemini paints behind a picture. Used by assets.mjs and cert-frame.mjs.

// Keying works on the RGB distance from the sampled background color.
const D_FLOOD = 70; // border-connected background
const D_ENCLOSED = 38; // enclosed gaps (between arm and body)
const D_SOFT = 120; // edge feather: fully opaque above this distance
// Glass lenses on outfits: how much the key channel dominates the others.
const K_LENS = 150;
const K_GLASS = 70; // light key-tinted reflections at a lens edge become white glass
const K_SHINE = 20; // inside a lens even a pale key tint is a painted highlight

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
export function keyOut(data, w, h, { glass = false, layer = false, tint = null, pocket = 0.6 } = {}) {
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
export function bleedColor(data, w, h) {
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
