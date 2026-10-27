import { imageUrl } from '../gfx/assets';
import { tapkoElement } from '../gfx/tapko';
import { STORIES, WORLDS } from '../game/levels';
import { hasParrotBadge } from '../game/parrots';
import { locale, t, tList } from '../i18n/i18n';
import { masterySummary, recentTyping } from '../learning/stats';
import type { Profile } from '../storage/schema';
import { nickname } from '../storage/store';
import { button, h, modal } from '../ui/dom';
import { storyPicture } from './stats';

/** The name on the certificate: the full name when the profile has one, else the nickname. */
function certName(p: Profile): string {
  return p.name?.trim() || nickname(p);
}

/** How far the writer is, as one of the praise lines: by the share of the layout's keys mastered. */
function praise(p: Profile, mastered: number, total: number, accuracy: number, typed: boolean): string {
  const share = total ? mastered / total : 0;
  const lines = tList('cert.praise');
  const line = lines[share < 0.1 ? 0 : share < 0.4 ? 1 : share < 0.75 ? 2 : 3].replace('{name}', certName(p));
  if (!typed) return line;
  return accuracy >= 0.95 ? `${line} ${t('cert.precise')}` : accuracy >= 0.85 ? `${line} ${t('cert.careful')}` : line;
}

/** One result: its picture, the number big, what it is under it. */
function stat(pic: string, value: string, label: string): HTMLElement {
  const src = imageUrl(pic);
  return h('div', { class: 'cert-stat' }, src ? h('img', { src, alt: '' }) : null, h('b', {}, value), h('span', {}, label));
}

/** One signature at the bottom: its picture over the signer's name. */
function signature(pic: string, name: string, cls: string): HTMLElement {
  const src = imageUrl(pic);
  return h('span', { class: 'cert-sign' }, src ? h('img', { class: cls, src, alt: '' }) : null, h('span', {}, name));
}

const SIDES = ['top', 'right', 'bottom', 'left'];
const CORNERS = ['tl', 'tr', 'br', 'bl'];

/**
 * The frame: the band along each side, the fox in every corner and pairs of paw prints along each
 * side, walking round clockwise; every piece is already turned for its place, so nothing is turned
 * on the page. Null without its pictures.
 */
function frame(): HTMLElement | null {
  const pics = [...SIDES.flatMap((s) => [`ui-cert-band-${s}`, `ui-cert-paws-${s}`]), ...CORNERS.map((c) => `ui-cert-fox-${c}`)];
  const urls = Object.fromEntries(pics.map((name) => [name, imageUrl(name)]));
  if (pics.some((name) => !urls[name])) return null;
  return h('div', { class: 'cert-frame', 'aria-hidden': 'true' },
    ...SIDES.map((s) => h('div', { class: `cert-band ${s}`, style: `background-image:url(${urls[`ui-cert-band-${s}`]})` })),
    ...SIDES.map((s) => h('div', { class: `cert-paws ${s}`, style: `background-image:url(${urls[`ui-cert-paws-${s}`]})` })),
    ...CORNERS.map((c) => h('img', { class: `cert-fox ${c}`, src: urls[`ui-cert-fox-${c}`], alt: '' })));
}

/** The certificate: the brand, the writer and their character, the results, the progress in the stories, a line on how it goes, the date and the signatures (Aro's while the Parrot badge is held, and Tapko's). */
function certificate(p: Profile): HTMLElement {
  const m = masterySummary(p);
  const recent = recentTyping(p, 14);
  const border = frame();
  const stats = [
    stat('ui-key', `${m.mastered}/${m.total}`, t('cert.keys')),
    recent.chars ? stat('ui-accuracy', `${Math.round(recent.accuracy * 100)} %`, t('cert.accuracy')) : null,
    recent.cpm ? stat('ui-typing-speed', String(recent.cpm), t('cert.speed')) : null,
    stat('ui-star', String(p.progress.starsEarned), t('cert.stars')),
    stat('ui-earth', `${p.progress.worldsDone.length}/${WORLDS.length}`, t('cert.worlds')),
  ];
  const stories = STORIES.map((s) => {
    const done = s.worlds.filter((w) => p.progress.worldsDone.includes(w)).length;
    const pic = storyPicture(s);
    return h('li', {}, pic ? h('img', { src: pic, alt: '' }) : null, h('span', {}, t(s.title)), h('b', {}, `${done}/${s.worlds.length}`));
  });
  return h('div', { class: 'cert-sheet' }, border,
    h('div', { class: `cert${border ? '' : ' no-frame'}` },
      h('header', { class: 'cert-brand' }, h('span', {}, 'Tapko'), h('span', { class: 'title-b' }, 'Typer')),
      h('h1', { class: 'cert-title' }, t('cert.title')),
      h('p', { class: 'cert-sub' }, t('cert.subtitle')),
      h('p', { class: 'cert-awarded' }, t('cert.awarded')),
      h('p', { class: 'cert-name' }, certName(p)),
      h('div', { class: 'cert-hero' }, tapkoElement(p.companion, 'happy', 200)),
      h('div', { class: 'cert-stats' }, ...stats),
      h('div', { class: 'cert-stories' }, h('h2', {}, t('cert.stories')), h('ul', {}, ...stories)),
      h('p', { class: 'cert-praise' }, praise(p, m.mastered, m.total, recent.accuracy, recent.chars > 0)),
      h('footer', { class: 'cert-foot' },
        h('span', { class: 'cert-date' }, t('cert.date', { date: new Date().toLocaleDateString(locale()) })),
        h('span', { class: 'cert-signs' },
          hasParrotBadge(p) ? signature('ui-cert-parrot', t('cert.signParrot'), 'cert-parrot') : null,
          signature('ui-icon-hr', t('cert.sign'), 'cert-tapko')))));
}

/**
 * The writer's certificate in a window, with a button that prints it. Any print while it is open
 * (the button or the browser's own) gives only the sheet, on A4 portrait (the print styles).
 */
export function openCertificate(p: Profile): void {
  modal(h('div', { class: 'cert-view' }, certificate(p),
    h('div', { class: 'row center' }, button(t('cert.print'), () => window.print(), 'btn primary', 'print'))), { cls: 'cert-modal' });
}
