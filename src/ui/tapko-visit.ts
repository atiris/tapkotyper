import { reduceMotion } from '../app/app';
import { audio } from '../audio/audio';
import { randomOutfit, tapkoElement } from '../gfx/tapko';
import { t } from '../i18n/i18n';
import { COMPANION_KINDS } from '../storage/schema';
import { h } from './dom';

/** Height of the visitor, about the start page's grass. */
const VISIT_SIZE = 260;
/** Seconds the visitor stays before it walks away. */
const STAY_S = 10;

/**
 * Just for fun (a greeting typed on the start page): a Tapko of a random kind in a random outfit walks in from the left
 * into `host`, hops, says hello, that it is Tapko, and invites the child to train for a while; a click or
 * a few seconds send it back.
 */
export function tapkoVisit(host: HTMLElement): void {
  if (host.querySelector('.tapko-visit')) return;
  const kind = COMPANION_KINDS[Math.floor(Math.random() * COMPANION_KINDS.length)];
  const fig = tapkoElement({ name: '', kind, accessories: randomOutfit(() => true) }, 'happy', VISIT_SIZE);
  const visit = h('div', { class: 'tapko-visit', role: 'status' }, fig,
    h('div', { class: 'bubble static side' },
      h('p', {}, h('b', {}, t('start.visit.hello')), ' ', t('start.visit.intro')),
      h('p', {}, t('start.visit.invite'))));
  let gone = false;
  const leave = () => {
    if (gone) return;
    gone = true;
    clearTimeout(timer);
    if (reduceMotion()) return visit.remove();
    visit.classList.add('out');
    visit.addEventListener('animationend', () => visit.remove());
  };
  const timer = window.setTimeout(leave, STAY_S * 1000);
  visit.addEventListener('click', leave);
  host.append(visit);
  audio.sfx('pop');
}
