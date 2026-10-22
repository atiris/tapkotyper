import { imageUrl } from '../gfx/assets';
import { WORLDS } from '../game/levels';
import type { BadgeTier } from '../game/rewards';
import { t } from '../i18n/i18n';
import { h } from './dom';

/** Disc colour of each world's badge when it has no picture. */
const COLORS = ['#8fd18a', '#7fb2f0', '#6fd6c4', '#f3a46b', '#f1d36a', '#b7a99a', '#c9a27a', '#8fc8f0', '#a8b6cc', '#f4a6b8', '#f7a8c9', '#8fcf8a', '#7fd0e0', '#c3a6e8', '#9a8ee0'];

/**
 * A world's badge: a round medal with the world's picture (`badge-WORLD`, else its map
 * island, else its number on a coloured disc) in a ring of its tier; null tier = not earned yet.
 */
export function badge(world: number, tier: BadgeTier | null, small = false): HTMLElement {
  const w = WORLDS[world];
  const src = imageUrl(`badge-${w}`) ?? imageUrl(`ui-map-${w}`);
  const name = t(`worlds.${w}`);
  const label = tier ? t('badge.aria', { world: name, tier: t(`badge.${tier}`) }) : t('badge.locked', { n: world + 1 });
  return h('span', { class: `badge ${tier ?? 'none'} ${small ? 'small' : ''}`, role: 'img', 'aria-label': label, title: label, style: `--c:${COLORS[world]}` },
    src ? h('img', { src, alt: '' }) : h('span', { class: 'badge-num' }, String(world + 1)));
}
