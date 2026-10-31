import { imageUrl } from '../gfx/assets';
import { h } from './dom';

/** The small crown in the corner of a world's last level (its great challenge), beside its game's picture. */
export function crown(cls: string): HTMLElement | null {
  const src = imageUrl('ui-act-super');
  return src ? h('img', { class: cls, src, alt: '' }) : null;
}
