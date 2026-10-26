import { imageUrl } from '../gfx/assets';
import { WORLDS, aimOpen } from '../game/levels';
import { WORLD_THINGS } from '../game/modes/aim-things';
import { t } from '../i18n/i18n';
import type { Profile } from '../storage/schema';
import { h } from './dom';
import { tip } from './tooltip';

/** Every world's own range thing: the found ones in color, the rest grey with a question mark naming the world where they wait. */
export function rangeFinds(p: Profile): HTMLElement {
  return h('ul', { class: 'aim-finds' }, ...WORLD_THINGS.map((th) => {
    const has = p.progress.rangeFinds.includes(th.id);
    const src = imageUrl(th.pics[0]);
    const say = has ? t(`aim.things.${th.id}.name`) : t('aim.collection.waiting', { world: t(`worlds.${WORLDS[th.world!]}`) });
    const el = h('li', { class: `aim-find ${has ? 'found' : 'waiting'}`, role: 'img', 'aria-label': say },
      src ? h('img', { src, alt: '' }) : null,
      has ? null : h('span', { class: 'aim-find-q', 'aria-hidden': 'true' }, '?'));
    tip(el, say);
    return el;
  }));
}

/** Every world's parrot: in color while it is at home, grey while it flew away or its world is not finished yet. */
export function parrotShelf(p: Profile): HTMLElement {
  const src = imageUrl('ui-act-parrot');
  return h('ul', { class: 'aim-finds' }, ...WORLDS.map((w, i) => {
    const home = p.progress.parrots.includes(i);
    const world = t(`worlds.${w}`);
    const say = home ? `${world}: ${t('map.parrotHome')}` : aimOpen(p, i) ? t('progress.parrotAway', { world }) : t('aim.collection.waiting', { world });
    const el = h('li', { class: `aim-find ${home ? 'found' : 'waiting'}`, role: 'img', 'aria-label': say },
      src ? h('img', { src, alt: '' }) : null,
      home || aimOpen(p, i) ? null : h('span', { class: 'aim-find-q', 'aria-hidden': 'true' }, '?'));
    tip(el, say);
    return el;
  }));
}
