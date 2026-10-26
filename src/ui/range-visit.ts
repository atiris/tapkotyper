import { reduceMotion } from '../app/app';
import { audio } from '../audio/audio';
import { imageUrl } from '../gfx/assets';
import { THINGS } from '../game/modes/aim-things';
import { h } from './dom';

/** Milliseconds the thing takes across the page: an easy pace, nothing like a throw. */
const ACROSS_MS = 6000;

/**
 * Just for fun (the range's word typed on the map): a random thing of the target range drifts across
 * the page from left to right on a gentle arc, turning slowly, above everything with clicks passing
 * through. With reduced motion it does not come.
 */
export function rangeVisit(): void {
  const pics = THINGS.flatMap((th) => th.pics).map(imageUrl).filter((src) => src !== null);
  if (!pics.length || reduceMotion() || document.querySelector('.range-visit')) return;
  const thing = h('img', { class: 'range-visit', src: pics[Math.floor(Math.random() * pics.length)], alt: '' });
  document.body.append(thing);
  const y = innerHeight * (0.25 + Math.random() * 0.4);
  const lift = innerHeight * (0.08 + Math.random() * 0.12);
  const turn = (Math.random() < 0.5 ? -1 : 1) * 200;
  thing.animate([
    { transform: `translate(-140px, ${y}px) rotate(0deg)` },
    { transform: `translate(${innerWidth / 2}px, ${y - lift}px) rotate(${turn / 2}deg)` },
    { transform: `translate(${innerWidth + 140}px, ${y}px) rotate(${turn}deg)` },
  ], { duration: ACROSS_MS, easing: 'linear' }).onfinish = () => thing.remove();
  audio.sfx('whoosh');
}
