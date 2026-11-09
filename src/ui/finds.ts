import { imageUrl } from '../gfx/assets';
import { aimOpen, worldName } from '../game/levels';
import { WORLD_THINGS } from '../game/modes/aim-things';
import { t } from '../i18n/i18n';
import type { Profile } from '../storage/schema';
import { h } from './dom';
import { tip } from './tooltip';

/**
 * The thing of every open target range: the found ones in color, the rest two grey crossed arrows turned at random,
 * naming the world where they wait. A range not open yet has no place here.
 */
export function rangeFinds(p: Profile): HTMLElement {
  const arrows = imageUrl('ui-aim-arrows');
  return h('ul', { class: 'aim-finds' }, ...WORLD_THINGS.filter((th) => aimOpen(p, th.world!)).map((th) => {
    const has = p.progress.rangeFinds.includes(th.id);
    const src = has ? imageUrl(th.pics[0]) : arrows;
    const say = has ? t(`aim.things.${th.id}.name`) : t('aim.collection.waiting', { world: worldName(th.world!) });
    const el = h('li', { class: `aim-find ${has ? 'found' : 'waiting'}`, role: 'img', 'aria-label': say, style: has ? '' : `--turn:${Math.round(Math.random() * 360)}deg` },
      src ? h('img', { src, alt: '' }) : has ? null : h('span', { class: 'aim-find-sight', 'aria-hidden': 'true' }, '⌖'));
    tip(el, say);
    return el;
  }));
}
