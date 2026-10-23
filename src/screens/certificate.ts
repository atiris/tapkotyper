import { imageUrl } from '../gfx/assets';
import { tapkoElement } from '../gfx/tapko';
import { STORIES, WORLDS, storyDone, storyOpen } from '../game/levels';
import { t, tList } from '../i18n/i18n';
import { masterySummary, recentTyping } from '../learning/stats';
import type { Profile } from '../storage/schema';
import { nickname } from '../storage/store';
import { button, h, modal } from '../ui/dom';
import { storyPicture } from './stats';

/** How far the writer is, as one of the praise lines: by the share of the layout's keys mastered. */
function praise(p: Profile, mastered: number, total: number, accuracy: number, typed: boolean): string {
  const share = total ? mastered / total : 0;
  const lines = tList('cert.praise');
  const line = lines[share < 0.1 ? 0 : share < 0.4 ? 1 : share < 0.75 ? 2 : 3].replace('{name}', nickname(p));
  if (!typed) return line;
  return accuracy >= 0.95 ? `${line} ${t('cert.precise')}` : accuracy >= 0.85 ? `${line} ${t('cert.careful')}` : line;
}

/** One result: its picture, the number big, what it is under it. */
function stat(pic: string, value: string, label: string): HTMLElement {
  const src = imageUrl(pic);
  return h('div', { class: 'cert-stat' }, src ? h('img', { src, alt: '' }) : null, h('b', {}, value), h('span', {}, label));
}

/** The certificate: the logo, the writer and their character, the results, the stories, a line on how it goes, the date and the stamp. */
function certificate(p: Profile): HTMLElement {
  const m = masterySummary(p);
  const recent = recentTyping(p, 14);
  const frame = imageUrl('ui-cert-frame');
  const logo = imageUrl('ui-icon-hr');
  const stamp = imageUrl('ui-cert-stamp');
  const realName = p.name && p.name !== nickname(p) ? p.name : '';
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
    return h('li', { class: `${storyDone(p, s) ? 'done' : ''} ${storyOpen(p, s) ? '' : 'closed'}` },
      pic ? h('img', { src: pic, alt: '' }) : null,
      h('span', {}, t(s.title)),
      h('b', {}, storyDone(p, s) ? '✓' : `${done}/${s.worlds.length}`));
  });
  return h('div', { class: 'cert-sheet' },
    h('div', { class: `cert${frame ? '' : ' no-frame'}`, style: frame ? `border-image-source: url(${frame})` : '' },
      h('header', { class: 'cert-head' },
        logo ? h('img', { class: 'cert-logo', src: logo, alt: '' }) : null,
        h('span', { class: 'cert-brand' }, h('span', {}, 'Tapko'), h('span', { class: 'title-b' }, 'Typer'))),
      h('h1', { class: 'cert-title' }, t('cert.title')),
      h('p', { class: 'cert-sub' }, t('cert.subtitle')),
      h('p', { class: 'cert-awarded' }, t('cert.awarded')),
      h('p', { class: 'cert-name' }, nickname(p), realName ? h('small', {}, realName) : null),
      h('div', { class: 'cert-body' },
        h('div', { class: 'cert-hero' }, tapkoElement(p.companion, 'happy', 200)),
        h('div', { class: 'cert-stats' }, ...stats),
        h('div', { class: 'cert-stories' }, h('h2', {}, t('cert.stories')), h('ul', {}, ...stories))),
      h('p', { class: 'cert-praise' }, praise(p, m.mastered, m.total, recent.accuracy, recent.chars > 0)),
      h('footer', { class: 'cert-foot' },
        h('span', { class: 'cert-date' }, t('cert.date', { date: new Date().toLocaleDateString(p.language) })),
        h('span', { class: 'cert-sign' }, stamp ? h('img', { class: 'cert-stamp', src: stamp, alt: '' }) : null, h('span', {}, t('cert.sign'))))));
}

/**
 * The writer's certificate in a window, with a button that prints it. Any print while it is open
 * (the button or the browser's own) gives only the sheet, on A4 landscape (the print styles).
 */
export function openCertificate(p: Profile): void {
  modal(h('div', { class: 'cert-view' }, certificate(p),
    h('div', { class: 'row center' }, button(t('cert.print'), () => window.print(), 'btn primary', 'print'))), { cls: 'cert-modal' });
}
