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
/** Rays from the nail's middle to its edge: the nail's outline. */
const RAYS = 40;

/** The lines of a hand (paths in keyboard units): middle lines stroked this wide, or filled bands (width 0). */
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
    if (l.width) { ctx.lineWidth = l.width; ctx.stroke(path); } else ctx.fill(path, 'evenodd');
  }
  const ink = ctx.getImageData(0, 0, size, size).data;
  const wall = (x: number, y: number) => x < 0 || y < 0 || x >= size || y >= size || ink[4 * (y * size + x) + 3] > 60;
  const c = size / 2, max = Math.max(reach.along, reach.across) * PX;
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
  // Its edge, seen from the middle.
  const out: Pt[] = [];
  for (let k = 0; k < RAYS; k++) {
    const a = (2 * Math.PI * k) / RAYS, dx = Math.cos(a), dy = Math.sin(a);
    let r = 0;
    while (r < max + 2) {
      const x = Math.round(seed[0] + dx * (r + 1)), y = Math.round(seed[1] + dy * (r + 1));
      if (x < 0 || y < 0 || x >= size || y >= size || !inside[y * size + x]) break;
      r++;
    }
    out.push([(seed[0] + dx * (r + 0.5)) / PX + at[0] - half, (seed[1] + dy * (r + 0.5)) / PX + at[1] - half]);
  }
  return out;
}
