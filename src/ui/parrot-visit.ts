import { reduceMotion } from '../app/app';
import { audio } from '../audio/audio';
import { imageUrl } from '../gfx/assets';
import { h } from './dom';

/** The flying parrot's pictures over one wing beat, there and back: up, middle, down, middle. */
export const FLAP = ['obj-parrot-flying', 'obj-parrot-flying-2', 'obj-parrot-flying-3', 'obj-parrot-flying-2'];
/** Seconds of one wing beat. */
export const BEAT_S = 0.44;
/** Places the parrot flies by on its way across the window. */
const STOPS = 5;
/** Milliseconds of one leg between two places. */
export const LEG_MS = 1950;
/** Steps of the smooth curve on each leg. */
const LEG_STEPS = 12;

/** A flying parrot facing right that beats its wings (the beat's pictures in turn, or just the first when one is missing) and lifts a little on each downstroke; null without a picture. */
export function flyingParrot(cls: string, style = ''): HTMLElement | null {
  const all = FLAP.map(imageUrl);
  const pics = (all.every((s) => s !== null) ? all : all.slice(0, 1)).filter((s) => s !== null);
  if (!pics.length) return null;
  return h('div', { class: `flying-parrot ${cls}`, style: `--beat:${BEAT_S}s;${style}` }, ...pics.map((src, i) => h('img', { src, alt: '', style: `--i:${i}` })));
}

/** A point of a flight, in window pixels. */
export interface FlightPoint {
  x: number;
  y: number;
}

/** The point `k` (0-1) of the way from `b` to `c` on a smooth curve through `a`, `b`, `c` and `d` (Catmull-Rom). */
const curve = (a: number, b: number, c: number, d: number, k: number) =>
  b + 0.5 * k * (c - a + k * (2 * a - 5 * b + 4 * c - d + k * (3 * (b - c) + d - a)));

/**
 * A flapping parrot flies over the page through `points` (LEG_MS between two) on one smooth curve,
 * slowing only at the start and the end, facing where it goes, above everything with clicks passing
 * through, `width` px wide (else 110); resolves when it reaches the last point (and is removed), null
 * without its picture. `stop` removes it on the way.
 */
export function flyAlong(points: FlightPoint[], width?: number): { done: Promise<void>; stop: () => void } | null {
  const parrot = flyingParrot('');
  if (!parrot) return null;
  const duration = LEG_MS * (points.length - 1);
  const bird = h('div', { class: 'parrot-visit', style: width ? `width:${width}px;margin:${-width / 2}px 0 0 ${-width / 2}px` : '' }, parrot);
  document.body.append(bird);
  // A small tilt at each place, eased along the curve like the way itself.
  const tilts = points.map(() => (Math.random() - 0.5) * 16);
  const at = (i: number) => Math.max(0, Math.min(points.length - 1, i));
  const frames: Keyframe[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [a, b, c, d] = [i - 1, i, i + 1, i + 2].map(at);
    for (let s = 0; s < LEG_STEPS; s++) {
      const k = s / LEG_STEPS;
      const x = curve(points[a].x, points[b].x, points[c].x, points[d].x, k);
      const y = curve(points[a].y, points[b].y, points[c].y, points[d].y, k);
      frames.push({ transform: `translate(${x}px, ${y}px) rotate(${curve(tilts[a], tilts[b], tilts[c], tilts[d], k)}deg)` });
    }
  }
  const last = points[points.length - 1];
  frames.push({ transform: `translate(${last.x}px, ${last.y}px) rotate(${tilts[tilts.length - 1]}deg)` });
  const flight = bird.animate(frames, { duration, easing: 'ease-in-out' });
  // The picture faces right; it turns at once (no squeeze) at each place where its way goes left.
  parrot.animate(points.map((pt, i) => ({ transform: `scaleX(${points[Math.min(i + 1, points.length - 1)].x < pt.x ? -1 : 1})`, easing: 'steps(1, end)' })), { duration });
  const done = flight.finished.then(() => bird.remove(), () => bird.remove());
  return { done, stop: () => bird.remove() };
}

/** A random place over the page: `x` and `y` as shares of the window, within the given ranges. */
export const somewhere = (x0: number, x1: number, y0: number, y1: number): FlightPoint =>
  ({ x: innerWidth * (x0 + Math.random() * (x1 - x0)), y: innerHeight * (y0 + Math.random() * (y1 - y0)) });

/**
 * Just for fun (the word "parrot" typed on the map): a parrot flies in from one side, flutters
 * through a few random places over the page, and leaves on the other side.
 */
export function parrotVisit(): void {
  if (reduceMotion() || document.querySelector('.parrot-visit')) return;
  const fromLeft = Math.random() < 0.5;
  const edge = (left: boolean) => (left ? -120 : innerWidth + 120);
  const points = [
    { x: edge(fromLeft), y: innerHeight * (0.2 + Math.random() * 0.4) },
    ...Array.from({ length: STOPS }, () => somewhere(0.1, 0.9, 0.1, 0.8)),
    { x: edge(!fromLeft), y: innerHeight * (0.05 + Math.random() * 0.3) },
  ];
  if (!flyAlong(points)) return;
  audio.sfx('squawk');
  setTimeout(() => document.querySelector('.parrot-visit') && audio.sfx('squawk'), LEG_MS * 3);
}
