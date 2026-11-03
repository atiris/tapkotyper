/**
 * A traced line (a thin filled band with two edges, as potrace draws it) turned into its middle line: the band is
 * painted on a canvas, thinned to one pixel (Zhang-Suen), followed into strokes and smoothed. A stroke moves as one
 * line, while a band's two edges, moved apart, open into wedges. Browser only (a canvas).
 */

type Pt = [number, number];

/** Canvas pixels per keyboard unit: the middle line's precision. */
const PX = 6;
/** Branches shorter than this (keyboard units) ending free are thinning's leftovers at a line's end. */
const SPUR = 1.5;
/** How far (keyboard units) the simplified line may leave the pixels. */
const SIMPLIFY = 0.3;

/** The band's middle lines as one path (smooth curves) and the band's mean width, both in keyboard units. */
export function centerline(d: string): { d: string; width: number } {
  const nums = [...d.matchAll(/-?\d*\.?\d+(?:e-?\d+)?/g)].map((m) => Number(m[0]));
  if (nums.length < 4) return { d: '', width: 0 };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    x0 = Math.min(x0, nums[i]); x1 = Math.max(x1, nums[i]);
    y0 = Math.min(y0, nums[i + 1]); y1 = Math.max(y1, nums[i + 1]);
  }
  x0 -= 4; y0 -= 4; x1 += 4; y1 += 4;
  const W = Math.ceil((x1 - x0) * PX), H = Math.ceil((y1 - y0) * PX);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.setTransform(PX, 0, 0, PX, -x0 * PX, -y0 * PX);
  ctx.fill(new Path2D(d), 'evenodd');
  const rgba = ctx.getImageData(0, 0, W, H).data;
  const img = new Uint8Array(W * H);
  let area = 0;
  for (let i = 0; i < W * H; i++) if (rgba[4 * i + 3] > 127) { img[i] = 1; area++; }
  thin(img, W, H);
  let length = 0;
  for (let i = 0; i < W * H; i++) length += img[i];
  const toUnits = (i: number): Pt => [(i % W + 0.5) / PX + x0, (Math.floor(i / W) + 0.5) / PX + y0];
  const out = strokes(img, W, H)
    .filter((s) => s.length > 1)
    .map((s) => smoothPath(simplify(s.map(toUnits), SIMPLIFY)))
    .join(' ');
  return { d: out, width: length ? Math.round((area / length / PX) * 10) / 10 : 0 };
}

/** Zhang-Suen thinning in place: 1 ink, 0 paper. */
function thin(img: Uint8Array, W: number, H: number): void {
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : img[y * W + x]);
  let changed = true;
  const gone: number[] = [];
  while (changed) {
    changed = false;
    for (const pass of [0, 1]) {
      gone.length = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!img[y * W + x]) continue;
        const p = [at(x, y - 1), at(x + 1, y - 1), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1), at(x - 1, y + 1), at(x - 1, y), at(x - 1, y - 1)];
        const b = p.reduce((s, v) => s + v, 0);
        if (b < 2 || b > 6) continue;
        let a = 0;
        for (let k = 0; k < 8; k++) if (!p[k] && p[(k + 1) % 8]) a++;
        if (a !== 1) continue;
        if (pass === 0 ? p[0] * p[2] * p[4] || p[2] * p[4] * p[6] : p[0] * p[2] * p[6] || p[0] * p[4] * p[6]) continue;
        gone.push(y * W + x);
      }
      for (const i of gone) img[i] = 0;
      if (gone.length) changed = true;
    }
  }
}

/**
 * The one-pixel lines followed from end to end (and the closed ones round). A pixel is an end or a junction by the
 * number of separate ink runs around it (a stair step of the line is neither); a step goes straight before diagonal, so
 * no pixel of a stair is skipped. Bits between neighbouring junction pixels and short free branches are left out.
 */
function strokes(img: Uint8Array, W: number, H: number): number[][] {
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : img[y * W + x]);
  // Straight neighbours first: (dx, dy) clockwise from the top for the runs, then sorted for walking.
  const RING: [number, number][] = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const STEPS = [...RING].sort((p, q) => Math.abs(p[0] * p[1]) - Math.abs(q[0] * q[1]));
  const xyOf = (i: number) => [i % W, Math.floor(i / W)];
  const runs = (i: number) => {
    const [x, y] = xyOf(i);
    let n = 0;
    for (let k = 0; k < 8; k++) if (!at(x + RING[k][0], y + RING[k][1]) && at(x + RING[(k + 1) % 8][0], y + RING[(k + 1) % 8][1])) n++;
    return n;
  };
  const near = (i: number) => {
    const [x, y] = xyOf(i);
    return STEPS.filter(([dx, dy]) => at(x + dx, y + dy)).map(([dx, dy]) => (y + dy) * W + x + dx);
  };
  const kind = new Map<number, number>();
  for (let i = 0; i < W * H; i++) if (img[i]) kind.set(i, runs(i));
  const isNode = (i: number) => kind.get(i) !== 2;
  const seen = new Set<number>();
  const walk = (from: number, to: number): number[] => {
    const line = [from, to];
    let cur = to;
    while (!isNode(cur)) {
      seen.add(cur);
      const next = near(cur).find((n) => !seen.has(n) && !line.includes(n));
      if (next == null) break;
      line.push(next);
      cur = next;
    }
    return line;
  };
  const out: number[][] = [];
  for (const [i] of kind) {
    if (!isNode(i)) continue;
    for (const n of near(i)) if (!seen.has(n) && !(isNode(n) && n < i)) out.push(walk(i, n));
  }
  // Closed lines have no end: start anywhere on them.
  for (const [i] of kind) {
    if (seen.has(i) || isNode(i)) continue;
    seen.add(i);
    const n = near(i).find((m) => !seen.has(m));
    if (n != null) out.push([i, ...walk(i, n).slice(1), i]);
  }
  const free = (i: number) => kind.get(i) === 1;
  return out.filter((l) => l.length >= 3 && !((free(l[0]) !== free(l.at(-1)!)) && l.length < SPUR * PX));
}

/** Ramer-Douglas-Peucker: the fewest points within `eps` of the line. */
function simplify(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts.at(-1)!];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  let far = 0, at = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const d = len ? Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / len : Math.hypot(p[0] - a[0], p[1] - a[1]);
    if (d > far) { far = d; at = i; }
  }
  if (far <= eps) return [a, b];
  return [...simplify(pts.slice(0, at + 1), eps).slice(0, -1), ...simplify(pts.slice(at), eps)];
}

/** A smooth curve through the points (Catmull-Rom as cubic curves). */
function smoothPath(pts: Pt[]): string {
  const f = (n: number) => n.toFixed(1);
  if (pts.length === 2) return `M${f(pts[0][0])} ${f(pts[0][1])} L${f(pts[1][0])} ${f(pts[1][1])}`;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])} C`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` ${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}
