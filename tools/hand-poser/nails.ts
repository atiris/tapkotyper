/**
 * A finger's nail found on the drawn outline: the area around the axis's tip point (the owner places it in the middle
 * of the nail) closed by the lines around it (the fingertip's outline, the nail bed's arc). A nail line drawn with a
 * gap still closes: the area reaches no farther than a nail can be big, an oval along the finger. Browser only (a canvas).
 */

type Pt = [number, number];

/** Canvas pixels per keyboard unit. */
const PX = 5;
/** How far a nail reaches from its middle (keyboard units), along the finger and across: the area stops there where a line has a gap. */
export interface NailSize { along: number; across: number }

/** The lines of a hand (paths in keyboard units): middle lines stroked this wide. */
export interface Lines { d: string; width: number }

/** The nail around `at` as a closed polygon (keyboard units); null when `at` lies on no free area. */
export function findNail(lines: Lines[], at: Pt, dir: Pt, reach: NailSize): Pt[] | null {
  const half = Math.max(reach.along, reach.across) + 4, size = Math.ceil(2 * half * PX);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.setTransform(PX, 0, 0, PX, -(at[0] - half) * PX, -(at[1] - half) * PX);
  ctx.lineCap = ctx.lineJoin = 'round';
  for (const l of lines) {
    const path = new Path2D(l.d);
    ctx.lineWidth = l.width;
    ctx.stroke(path);
  }
  const ink = ctx.getImageData(0, 0, size, size).data;
  const wall = (x: number, y: number) => x < 0 || y < 0 || x >= size || y >= size || ink[4 * (y * size + x) + 3] > 60;
  const c = size / 2;
  // Inside the oval along the finger (dir: a unit vector along it), from the nail's middle.
  const inOval = (dx: number, dy: number) => {
    const a = (dx * dir[0] + dy * dir[1]) / (reach.along * PX), b = (dy * dir[0] - dx * dir[1]) / (reach.across * PX);
    return a * a + b * b <= 1;
  };
  // The middle on a line: the nearest free pixel.
  let seed: [number, number] | null = null;
  for (let r = 0; r <= 3 * PX && !seed; r++) {
    for (let k = 0; k < 16 && !seed; k++) {
      const x = Math.round(c + r * Math.cos((k * Math.PI) / 8)), y = Math.round(c + r * Math.sin((k * Math.PI) / 8));
      if (!wall(x, y)) seed = [x, y];
    }
  }
  if (!seed) return null;
  // The free area around it, no farther than a nail reaches.
  const inside = new Uint8Array(size * size), todo: number[] = [seed[1] * size + seed[0]];
  inside[todo[0]] = 1;
  while (todo.length) {
    const i = todo.pop()!, x = i % size, y = (i - x) / size;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, j = ny * size + nx;
      if (wall(nx, ny) || inside[j] || !inOval(nx - seed[0], ny - seed[1])) continue;
      inside[j] = 1;
      todo.push(j);
    }
  }
  // A little under the lines around (they cover it), so no paper shows between the nail and its lines.
  for (let step = 0; step < UNDER; step++) {
    const grown = inside.slice();
    for (let i = 0; i < size * size; i++) {
      if (inside[i]) continue;
      const x = i % size, y = (i - x) / size;
      if (wall(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < size && y + dy < size && inside[(y + dy) * size + x + dx])) grown[i] = 1;
    }
    inside.set(grown);
  }
  // Its edge followed all the way round (into every corner), then simplified.
  const edge = traceEdge(inside, size).map(([x, y]): Pt => [(x + 0.5) / PX + at[0] - half, (y + 0.5) / PX + at[1] - half]);
  return edge.length > 2 ? simplify(edge, SIMPLIFY) : null;
}

/** Pixels a nail reaches under its lines. */
const UNDER = 2;
/** How far (keyboard units) the nail's simplified edge may leave the pixels. */
const SIMPLIFY = 0.25;

/** The outer edge of the set pixels around the first one found (Moore neighbour tracing), as pixel coordinates. */
function traceEdge(mask: Uint8Array, size: number): [number, number][] {
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < size && y < size && mask[y * size + x] === 1;
  let start = -1;
  for (let i = 0; i < size * size && start < 0; i++) if (mask[i]) start = i;
  if (start < 0) return [];
  // Clockwise from the west: the eight neighbours.
  const N: [number, number][] = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]];
  const sx = start % size, sy = (start - sx) / size, out: [number, number][] = [[sx, sy]];
  let x = sx, y = sy, from = 0;
  for (let guard = 0; guard < size * size * 2; guard++) {
    let found = false;
    for (let k = 0; k < 8; k++) {
      const d = (from + k) % 8, nx = x + N[d][0], ny = y + N[d][1];
      if (!at(nx, ny)) continue;
      x = nx;
      y = ny;
      // Look on from the neighbour before the one we came from.
      from = (d + 6) % 8;
      found = true;
      break;
    }
    if (!found || (x === sx && y === sy)) break;
    out.push([x, y]);
  }
  return out;
}

/** Ramer-Douglas-Peucker on a closed line: the fewest points within `eps` of it. */
function simplify(pts: Pt[], eps: number): Pt[] {
  const line = (a: number, b: number): Pt[] => {
    const p = pts[a], q = pts[b], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    let far = 0, at = -1;
    for (let i = a + 1; i < b; i++) {
      const r = pts[i], d = len ? Math.abs((q[0] - p[0]) * (p[1] - r[1]) - (p[0] - r[0]) * (q[1] - p[1])) / len : Math.hypot(r[0] - p[0], r[1] - p[1]);
      if (d > far) { far = d; at = i; }
    }
    return far > eps && at > 0 ? [...line(a, at).slice(0, -1), ...line(at, b)] : [p, q];
  };
  const mid = Math.floor(pts.length / 2);
  return [...line(0, mid).slice(0, -1), ...line(mid, pts.length - 1).slice(0, -1)];
}
