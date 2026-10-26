import { reduceMotion } from '../app/app';
import { audio } from '../audio/audio';
import { imageUrl } from '../gfx/assets';
import { h } from './dom';

/** The flying parrot's pictures in the order of one wing beat: up, level, down, rising. */
const FLAP = ['obj-parrot-flying', 'obj-parrot-flying-2', 'obj-parrot-flying-3', 'obj-parrot-flying-4'];
/** Seconds of one wing beat. */
const BEAT_S = 0.44;
/** Places the parrot flies by on its way across the window. */
const STOPS = 5;
/** Milliseconds of one leg between two places. */
const LEG_MS = 1300;

/** A flying parrot facing right that beats its wings (the beat's pictures in turn, all four or just the first); null without a picture. */
export function flyingParrot(cls: string, style = ''): HTMLElement | null {
  const all = FLAP.map(imageUrl);
  const pics = (all.every((s) => s !== null) ? all : all.slice(0, 1)).filter((s) => s !== null);
  if (!pics.length) return null;
  return h('div', { class: `flying-parrot ${cls}`, style: `--beat:${BEAT_S}s;${style}` }, ...pics.map((src, i) => h('img', { src, alt: '', style: `--i:${i}` })));
}

/**
 * Just for fun (the word "parrot" typed on the map): a parrot flies in from one side, flutters
 * through a few random places over the page, facing where it goes, and leaves on the other side.
 */
export function parrotVisit(): void {
  const parrot = flyingParrot('');
  if (!parrot || reduceMotion() || document.querySelector('.parrot-visit')) return;
  const w = window.innerWidth, ht = window.innerHeight;
  const fromLeft = Math.random() < 0.5;
  const edge = (left: boolean) => (left ? -120 : w + 120);
  const points = [
    { x: edge(fromLeft), y: ht * (0.2 + Math.random() * 0.4) },
    ...Array.from({ length: STOPS }, () => ({ x: w * (0.1 + Math.random() * 0.8), y: ht * (0.1 + Math.random() * 0.7) })),
    { x: edge(!fromLeft), y: ht * (0.05 + Math.random() * 0.3) },
  ];
  const duration = LEG_MS * (points.length - 1);
  const bird = h('div', { class: 'parrot-visit' }, parrot);
  document.body.append(bird);
  const flight = bird.animate(points.map((pt) => ({ transform: `translate(${pt.x}px, ${pt.y}px) rotate(${(Math.random() - 0.5) * 16}deg)` })), { duration, easing: 'ease-in-out' });
  // The picture faces right; it turns at once (no squeeze) at each place where its way goes left.
  parrot.animate(points.map((pt, i) => ({ transform: `scaleX(${points[Math.min(i + 1, points.length - 1)].x < pt.x ? -1 : 1})`, easing: 'steps(1, end)' })), { duration });
  flight.onfinish = () => bird.remove();
  audio.sfx('squawk');
  setTimeout(() => bird.isConnected && audio.sfx('squawk'), LEG_MS * 3);
}
