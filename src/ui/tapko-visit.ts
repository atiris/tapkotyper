import { reduceMotion } from '../app/app';
import { audio } from '../audio/audio';
import { randomOutfit, tapkoElement } from '../gfx/tapko';
import { t } from '../i18n/i18n';
import { COMPANION_KINDS } from '../storage/schema';
import { h } from './dom';

/** Height of the visitor, about the start page's grass. */
const VISIT_SIZE = 260;
/** Seconds the visitor's bubble stays before it fades; the visitor itself stays. */
const BUBBLE_S = 20;

/** Sends a visitor away: it walks out to the left. */
function walkAway(visit: Element): void {
  if (visit.classList.contains('out')) return;
  if (reduceMotion()) return visit.remove();
  visit.classList.add('out');
  // The hop and the bubble end their own animations inside it too.
  visit.addEventListener('animationend', (e) => { if (e.target === visit) visit.remove(); });
}

/**
 * Just for fun (a greeting typed on the start page): a character of a random kind in a random outfit walks in from the
 * left into `host`, hops, says it is one of the characters of the app's adventures and how to make a profile. Its
 * bubble fades after a while or on a click; the character stays on the page until the next greeting sends it away.
 */
export function tapkoVisit(host: HTMLElement): void {
  const here = host.querySelector('.tapko-visit');
  if (here) return walkAway(here);
  const kind = COMPANION_KINDS[Math.floor(Math.random() * COMPANION_KINDS.length)];
  const fig = tapkoElement({ name: '', kind, accessories: randomOutfit(() => true) }, 'happy', VISIT_SIZE);
  const bubble = h('div', { class: 'bubble static side' },
    h('p', {}, h('b', {}, t('start.visit.hello')), ' ', t('start.visit.intro')),
    h('p', {}, t('start.visit.invite')));
  const visit = h('div', { class: 'tapko-visit', role: 'status' }, fig, bubble);
  const hush = () => {
    clearTimeout(timer);
    if (reduceMotion()) return bubble.remove();
    bubble.classList.add('fade');
    bubble.addEventListener('animationend', (e) => { if (e.animationName === 'fade-in') bubble.remove(); });
  };
  const timer = window.setTimeout(hush, BUBBLE_S * 1000);
  visit.addEventListener('click', hush);
  host.append(visit);
  audio.sfx('pop');
}
