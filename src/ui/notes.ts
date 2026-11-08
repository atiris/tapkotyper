import { imageUrl } from '../gfx/assets';
import { Rng } from '../engine/rng';
import { h } from './dom';

/** The rhythm note pictures: half, quarter, eighth and two beamed eighths, and the hue each is drawn in (degrees). */
const KINDS = ['half', 'quarter', 'eighth', 'beamed'] as const;
const KIND_HUE = [41, 202, 164, 26];
/** The hues a note is shown in, well spread around the colour wheel. */
const HUES = [15, 60, 105, 150, 195, 240, 285, 330];
/** A note leans at most this many degrees either way. */
const LEAN = 25;

/** How a note looks: its picture, its hue (of `HUES`) and its lean. */
export interface NoteLook {
  kind: number;
  hue: number;
  lean: number;
}

/**
 * The look of the `n`-th rhythm note of a profile (its `seed`): always the same for the same note after
 * the same one, never the kind or the hue of the note before it (`prev`).
 */
export function noteLook(n: number, seed: number, prev?: NoteLook): NoteLook {
  const rng = new Rng((seed ^ Math.imul(n + 1, 0x9e3779b1)) >>> 0);
  let kind = Math.floor(rng.next() * KINDS.length);
  const lean = Math.round((rng.next() * 2 - 1) * LEAN);
  let hue = Math.floor(rng.next() * HUES.length);
  if (prev && kind === prev.kind) kind = (kind + 1) % KINDS.length;
  if (prev && hue === prev.hue) hue = (hue + 1) % HUES.length;
  return { kind, hue, lean };
}

/** A note's picture in its look: turned to its hue (none in high contrast, see styles) and leaning. */
export function notePic(look: NoteLook): HTMLElement {
  const src = imageUrl(`ui-note-${KINDS[look.kind]}`);
  const style = `transform: rotate(${look.lean}deg); --note-hue: ${HUES[look.hue] - KIND_HUE[look.kind]}deg`;
  return src ? h('img', { class: 'rhythm-note', src, alt: '', style }) : h('span', { class: 'rhythm-note', style }, '♪');
}
