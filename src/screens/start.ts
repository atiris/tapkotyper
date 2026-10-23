import { app, applyProfileLook, go, openRoute, reduceMotion, selectProfile, useLanguage } from '../app/app';
import { keyboardGated, onKeyboard, takeWaiting } from '../app/keyboard-gate';
import { audio } from '../audio/audio';
import { imageUrl } from '../gfx/assets';
import { tapkoElement } from '../gfx/tapko';
import { totalStars } from '../game/rewards';
import { language, t } from '../i18n/i18n';
import { nickname } from '../storage/store';
import type { Lang } from '../storage/schema';
import { KEYBOARD_ART, TEACHER_ART, button, h, icon } from '../ui/dom';
import { cornerControls, languageControls } from '../ui/chrome';
import { roundButton } from '../ui/hud';
import { MAX_PER_ROW, rowSplit } from '../ui/rows';
import { listenForSuperPassword, superProfile } from '../app/super';

export function startScreen(root: HTMLElement): () => void {
  app.profile = null;
  applyProfileLook(null);
  audio.music(app.menuTrack);
  const logo = imageUrl('ui-logo');
  const lang = languageControls(async (l: Lang) => {
    app.store.data.language = l;
    app.store.save();
    await useLanguage(l);
    // Re-render only if the child is still here (the file may load slowly).
    if (root.dataset.screen === 'start') go('start');
  });
  const gated = keyboardGated();

  // Super Tapko comes last, so it never shifts the order of the real players.
  const players = [...app.store.profiles, ...(app.superPlayer ? [app.superPlayer] : [])];
  const cards = players.map((p) =>
    h('button', { class: 'profile-card', type: 'button', onClick: async () => { await selectProfile(p); go('map'); } },
      tapkoElement(p.companion, 'idle', 96),
      h('span', { class: 'profile-name' }, nickname(p)),
      // Siblings recognize their own tile by the real name under the nickname.
      p.name && p.name !== nickname(p) ? h('span', { class: 'profile-real' }, p.name) : null,
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

  root.append(h('div', { class: `screen start-screen${gated ? ' gated' : ''}` },
    cornerControls(...lang, roundButton('control', 'chart', t('teacher.title'), () => go('teacher'))),
    h('header', { class: 'hero' },
      logo ? h('img', { class: 'logo', src: logo, alt: '' }) : null,
      h('div', { class: 'hero-text' },
        h('h1', { class: 'title' }, h('span', {}, 'Tapko'), h('span', { class: 'title-b' }, 'Typer')),
        h('p', { class: 'tagline' }, t('start.tagline')))),
    gated ? keyboardGate() : h('section', { class: 'panel' },
      h('h2', {}, t('start.whoPlays')),
      profiles,
      h('div', { class: 'row center' },
        newAsCard ? null : button(t('start.newProfile'), () => go('newProfile'), 'btn primary', 'plus'),
        button(t('start.guest'), async () => {
          const g = app.store.startGuest(language(), t('start.guestName'));
          await selectProfile(g);
          go('map');
        }, 'btn ghost', 'user'),
        button(t('start.import'), () => void import('./parent').then((m) => m.importDialog(() => go('start'))), 'btn ghost', 'upload'))),
    gated ? teacherButton() : null,
    h('footer', { class: 'privacy-note' }, h('p', {}, t('privacy.short')))));
  // A key of a real keyboard lifts the gate at once: the start page (or a waiting task link) opens.
  const offKeyboard = gated ? onKeyboard(() => {
    const waiting = takeWaiting();
    if (waiting) void openRoute(waiting);
    else go('start', {}, false);
  }) : () => undefined;
  const offSuper = listenForSuperPassword(async () => {
    app.superPlayer = superProfile(language());
    await selectProfile(app.superPlayer);
    go('map');
  });
  return () => {
    offKeyboard();
    offSuper();
  };
}

/** A phone or tablet without a keyboard: the game needs one, so the card asks for it first. */
function keyboardGate(): HTMLElement {
  const status = h('p', { class: 'gate-status', role: 'status' }, t('start.gate.none'));
  const card = h('section', { class: 'panel keyboard-gate' },
    h('span', { class: 'gate-art', html: KEYBOARD_ART }),
    h('h2', {}, t('start.gate.title')),
    h('p', {}, t('start.gate.text')),
    status,
    button(t('start.gate.recheck'), () => {
      if (!keyboardGated()) return go('start', {}, false);
      status.textContent = t('start.gate.press');
      if (reduceMotion()) return;
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
    }, 'btn ghost', 'recheck'));
  return card;
}

/** The teacher needs no keyboard: straight to the scanner and the class results. */
function teacherButton(): HTMLButtonElement {
  return h('button', { class: 'teacher-big', type: 'button', onClick: () => go('teacher') },
    h('span', { class: 'teacher-art', html: TEACHER_ART }),
    h('span', { class: 'teacher-big-text' },
      h('span', { class: 'teacher-big-title' }, t('start.teacher.title')),
      h('span', {}, t('start.teacher.sub'))));
}
