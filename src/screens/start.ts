import { app, applyProfileLook, go, selectProfile, useLanguage } from '../app/app';
import { audio } from '../audio/audio';
import { imageUrl } from '../gfx/assets';
import { tapkoElement } from '../gfx/tapko';
import { totalStars } from '../game/rewards';
import { LANGS, language, t } from '../i18n/i18n';
import { nickname } from '../storage/store';
import type { Lang } from '../storage/schema';
import { button, h, icon } from '../ui/dom';
import { cornerControls } from '../ui/chrome';
import { roundButton } from '../ui/hud';
import { MAX_PER_ROW, rowSplit } from '../ui/rows';
import { listenForSuperPassword, superProfile } from '../app/super';

export function startScreen(root: HTMLElement): () => void {
  app.profile = null;
  applyProfileLook(null);
  audio.music(app.menuTrack);
  const logo = imageUrl('ui-logo');
  const langSwitch = h('div', { class: 'lang-switch', role: 'group', 'aria-label': t('start.language') },
    ...LANGS.map((l) => button(l.toUpperCase(), async () => {
      app.store.data.language = l as Lang;
      app.store.save();
      await useLanguage(l);
      // Re-render only if the child is still here (the file may load slowly).
      if (root.dataset.screen === 'start') go('start');
    }, `chip ${language() === l ? 'on' : ''}`)));

  const players = [...(app.superPlayer ? [app.superPlayer] : []), ...app.store.profiles];
  const cards = players.map((p) =>
    h('button', { class: 'profile-card', type: 'button', onClick: async () => { await selectProfile(p); go('map'); } },
      tapkoElement(p.companion, 'idle', 96),
      h('span', { class: 'profile-name' }, nickname(p)),
      // Siblings recognize their own tile by the real name under the nickname.
      nickname(p) !== p.name ? h('span', { class: 'profile-real' }, p.name) : null,
      h('span', { class: 'profile-sub' }, t('start.stars', { n: totalStars(p) }))));
  // Up to four profiles the new player is one more card; with more it is a button by the guest button.
  const newAsCard = players.length < MAX_PER_ROW;
  if (newAsCard) {
    cards.push(h('button', { class: 'profile-card new', type: 'button', onClick: () => go('newProfile') },
      h('span', { class: 'plus' }, icon('plus')), h('span', { class: 'profile-name' }, t('start.newProfile'))));
  }
  const profiles = h('div', { class: 'profile-list' });
  let at = 0;
  for (const size of rowSplit(cards.length)) {
    profiles.append(h('div', { class: 'profile-row' }, ...cards.slice(at, at + size)));
    at += size;
  }

  root.append(h('div', { class: 'screen start-screen' },
    cornerControls(langSwitch, roundButton('control', 'chart', t('teacher.title'), () => go('teacher'))),
    h('header', { class: 'hero' },
      logo ? h('img', { class: 'logo', src: logo, alt: '' }) : null,
      h('div', { class: 'hero-text' },
        h('h1', { class: 'title' }, h('span', {}, 'Tapko'), h('span', { class: 'title-b' }, 'Typer')),
        h('p', { class: 'tagline' }, t('start.tagline')))),
    h('section', { class: 'panel' },
      h('h2', {}, t('start.whoPlays')),
      profiles,
      h('div', { class: 'row center' },
        newAsCard ? null : button(t('start.newProfile'), () => go('newProfile'), 'btn primary', 'plus'),
        button(t('start.guest'), async () => {
          const g = app.store.startGuest(language());
          await selectProfile(g);
          go('map');
        }, 'btn ghost', 'user'),
        button(t('start.import'), () => void import('./parent').then((m) => m.importDialog(() => go('start'))), 'btn ghost', 'upload'))),
    h('footer', { class: 'privacy-note' }, h('p', {}, t('privacy.short')))));
  return listenForSuperPassword(async () => {
    app.superPlayer = superProfile(language());
    await selectProfile(app.superPlayer);
    go('map');
  });
}
