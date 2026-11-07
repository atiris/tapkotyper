import { audio } from '../audio/audio';
import { imageUrl } from '../gfx/assets';
import { WORLDS, worldName } from '../game/levels';
import { WORLD_THINGS } from '../game/modes/aim-things';
import type { BadgeTier } from '../game/rewards';
import { t } from '../i18n/i18n';
import { badge } from './badge';
import { h } from './dom';

const TIERS: BadgeTier[] = ['bronze', 'silver', 'gold'];
/** Sparkles twinkling around the badge. */
const SPARKS = 14;
/** Seconds the show stays before it fades by itself. */
const SHOW_S = 10;

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

/**
 * The screen goes dark and a world's badge rises in rotating rays and a glow. On the map a click on an
 * island's badge shows that badge alone; just for fun (a secret word on My progress) a random badge
 * in a random tier with a random range award landing on its rim. A click, Esc or ten seconds put it away.
 */
export function badgeShow(chosen?: { world: number; tier: BadgeTier }): void {
  const world = chosen?.world ?? pick(WORLDS.map((_, i) => i));
  const tier = chosen?.tier ?? pick(TIERS);
  const thing = chosen ? null : pick(WORLD_THINGS);
  const award = thing ? imageUrl(thing.pics[0]) : null;
  const title = t('badge.aria', { world: worldName(world), tier: t(`badge.${tier}`) });
  const awardName = thing ? t(`aim.things.${thing.id}.name`) : '';
  const medal = badge(world, tier);
  delete medal.dataset.tip;
  const view = h('div', { class: 'badge-show', role: 'dialog', 'aria-modal': 'true', 'aria-label': awardName ? `${title}, ${awardName}` : title },
    h('div', { class: 'badge-show-stage', 'aria-hidden': 'true' },
      h('span', { class: 'badge-show-rays' }),
      h('span', { class: 'badge-show-halo' }),
      h('span', { class: 'sparkles' }, ...Array.from({ length: SPARKS }, (_, k) => {
        // Around the badge on a ring, a little off at random.
        const a = (k / SPARKS) * 2 * Math.PI, r = 30 + Math.random() * 16;
        return h('i', { style: `--k:${k};left:${50 + r * Math.cos(a)}%;top:${50 + r * Math.sin(a)}%` });
      })),
      medal,
      award ? h('img', { class: 'badge-show-award', src: award, alt: '' }) : null),
    h('p', { class: 'badge-show-caption' }, h('b', {}, title), awardName ? h('span', {}, awardName) : null));
  let gone = false;
  const close = () => {
    if (gone) return;
    gone = true;
    clearTimeout(timer);
    window.removeEventListener('keydown', onKey, true);
    view.classList.add('out');
    setTimeout(() => view.remove(), 300);
  };
  // Esc closes it; other keys do nothing while it shows.
  const onKey = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') close();
  };
  const timer = window.setTimeout(close, SHOW_S * 1000);
  window.addEventListener('keydown', onKey, true);
  view.addEventListener('click', close);
  document.body.append(view);
  audio.sfx('reward');
}
