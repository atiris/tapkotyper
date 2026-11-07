import { imageUrl } from '../gfx/assets';
import { Rng } from '../engine/rng';
import { h } from './dom';

/** The rhythm note pictures: half, quarter, eighth and two beamed eighths. */
const KINDS = ['half', 'quarter', 'eighth', 'beamed'] as const;
/** A note leans at most this many degrees either way. */
const LEAN = 25;

/** The `n`-th rhythm note of a profile (its `seed`): always the same kind and lean for the same note. */
export function notePic(n: number, seed: number): HTMLElement {
  const rng = new Rng((seed ^ Math.imul(n + 1, 0x9e3779b1)) >>> 0);
  const kind = KINDS[Math.floor(rng.next() * KINDS.length)];
  const lean = Math.round((rng.next() * 2 - 1) * LEAN);
  const src = imageUrl(`ui-note-${kind}`);
  const style = `transform: rotate(${lean}deg)`;
  return src ? h('img', { class: 'rhythm-note', src, alt: '', style }) : h('span', { class: 'rhythm-note', style }, '♪');
}
