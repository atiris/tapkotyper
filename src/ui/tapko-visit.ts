import { reduceMotion } from '../app/app';
import { audio } from '../audio/audio';
import { randomOutfit, tapkoElement } from '../gfx/tapko';
import { allTexts, t, tList } from '../i18n/i18n';
import { COMPANION_KINDS } from '../storage/schema';
import { h } from './dom';

/** Height of the visitor, about the start page's grass. */
const VISIT_SIZE = 260;
/** Seconds the visitor's bubble stays before it fades; the visitor itself stays. */
const BUBBLE_S = 20;
/** Clicks on the visitor that bring Aro to sit beside it. */
const PARROT_CLICKS = 15;
/** Seconds Aro sits after landing before his next round over the page, at random within. */
const ROUND_S = [5, 15];

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
  let clicks = 0;
  fig.addEventListener('click', () => {
    if (++clicks === PARROT_CLICKS) void parrotJoins(visit, fig);
  });
  host.append(visit);
  audio.sfx('pop');
}

/**
 * Aro flies in and sits on a perch beside the visitor; then, every while, he flies round the page and lands there
 * again. A click on him makes him hop. It all ends when the visitor leaves.
 */
async function parrotJoins(visit: HTMLElement, fig: HTMLElement): Promise<void> {
  // A first visit's start page has only its own texts and code; Aro's lines and Aro himself come only now.
  const [{ aroPerch }] = await Promise.all([import('./aro'), allTexts()]);
  const aro = visit.isConnected ? aroPerch(false, (a) => a.hop(), false) : null;
  if (!aro) return;
  fig.after(aro.el);
  // Each landing sets the next round.
  const sit = () => window.setTimeout(round, (ROUND_S[0] + Math.random() * (ROUND_S[1] - ROUND_S[0])) * 1000);
  const round = () => {
    if (!visit.isConnected || visit.classList.contains('out')) return aro.stop();
    aro.flyOff(tList('parrot.takeoff'), true, 0, sit);
  };
  aro.arrive(tList('parrot.arrive'), sit);
}
