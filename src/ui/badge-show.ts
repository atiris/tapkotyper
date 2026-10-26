import { audio } from '../audio/audio';
import { imageUrl } from '../gfx/assets';
import { WORLDS } from '../game/levels';
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
 * Just for fun (a secret word on My progress): the screen goes dark and a random world's
 * badge in a random tier rises in rotating rays and a glow, a random range award landing on
 * its rim. Nothing is earned; a click, Esc or ten seconds put it away.
 */
export function badgeShow(): void {
  const world = pick(WORLDS.map((_, i) => i));
  const tier = pick(TIERS);
  const thing = pick(WORLD_THINGS);
  const award = imageUrl(thing.pics[0]);
  const title = t('badge.aria', { world: t(`worlds.${WORLDS[world]}`), tier: t(`badge.${tier}`) });
  const awardName = t(`aim.things.${thing.id}.name`);
  const medal = badge(world, tier);
  medal.removeAttribute('tip');
  const view = h('div', { class: 'badge-show', role: 'dialog', 'aria-modal': 'true', 'aria-label': `${title}, ${awardName}` },
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
    h('p', { class: 'badge-show-caption' }, h('b', {}, title), h('span', {}, awardName)));
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
