import { app } from '../app/app';
import { imageUrl } from '../gfx/assets';
import { WORLDS } from '../game/levels';
import { BADGE_GOLD, BADGE_SILVER, type BadgeTier, worldStars } from '../game/rewards';
import { t } from '../i18n/i18n';
import { h } from './dom';

/** Disc colour of each world's badge when it has no picture. */
const COLORS = ['#8fd18a', '#7fb2f0', '#6fd6c4', '#f3a46b', '#f1d36a', '#b7a99a', '#c9a27a', '#8fc8f0', '#a8b6cc', '#f4a6b8', '#f7a8c9', '#8fcf8a', '#7fd0e0', '#c3a6e8', '#9a8ee0'];

/** What the badge is for and what its tier means; short of gold, also what gold needs. */
function badgeTip(world: number, tier: BadgeTier | null): string {
  const name = t(`worlds.${WORLDS[world]}`);
  if (!tier) return t('badge.tip.locked', { world: name });
  const line = t(`badge.tip.${tier}`, { world: name, silver: BADGE_SILVER, gold: BADGE_GOLD });
  const have = app.profile ? worldStars(app.profile, world) : 0;
  if (tier === 'gold') return line;
  const next = tier === 'bronze' ? t('badge.tip.toSilver', { silver: BADGE_SILVER, have }) : t('badge.tip.toGold', { gold: BADGE_GOLD, have });
  return `${line} ${next}`;
}

/**
 * A world's badge: a round medal with the world's picture (`badge-WORLD`, else its map
 * island, else its number on a coloured disc) in a ring of its tier; null tier = not earned yet.
 */
export function badge(world: number, tier: BadgeTier | null, small = false): HTMLElement {
  const w = WORLDS[world];
  const src = imageUrl(`badge-${w}`) ?? imageUrl(`ui-map-${w}`);
  const name = t(`worlds.${w}`);
  const label = tier ? t('badge.aria', { world: name, tier: t(`badge.${tier}`) }) : t('badge.locked', { n: world + 1 });
  return h('span', { class: `badge ${tier ?? 'none'} ${small ? 'small' : ''}`, role: 'img', 'aria-label': label, tip: badgeTip(world, tier), style: `--c:${COLORS[world]}` },
    src ? h('img', { src, alt: '' }) : h('span', { class: 'badge-num' }, String(world + 1)));
}

/** The Parrot badge (every finished world's parrot at home): its picture, about 28 px, with what it is for. */
export function parrotBadge(): HTMLElement {
  const src = imageUrl('ui-badge-parrot');
  return h('span', { class: 'parrot-badge', role: 'img', 'aria-label': t('parrot.badge'), tip: t('parrot.badge') },
    src ? h('img', { src, alt: '' }) : h('span', { class: 'parrot-badge-fallback' }, 'P'));
}
