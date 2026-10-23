import { app, applyProfileLook, go, openRoute, selectProfile, useLanguage } from '../app/app';
import { keyboardGated, onKeyboard, takeWaiting } from '../app/keyboard-gate';
import { audio } from '../audio/audio';
import { imageUrl } from '../gfx/assets';
import { language, t } from '../i18n/i18n';
import type { Lang, Profile } from '../storage/schema';
import { arrowFocus, bigButton, button, h, icon, keyboardArt, modal, teacherArt } from '../ui/dom';
import { cornerControls, languageControls } from '../ui/chrome';
import { roundButton } from '../ui/hud';
import { numberPick, profileCard } from '../ui/profile-card';
import { MAX_PER_ROW, rowSplit } from '../ui/rows';
import { listenForSuperPassword, superProfile } from '../app/super';
import { COUNTER, visitCount } from './help';

export function startScreen(root: HTMLElement): () => void {
  app.profile = null;
  applyProfileLook(null);
  audio.music(app.menuTrack);
  const logo = imageUrl('ui-icon-hr');
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
  let picked = false;
  const play = async (p: Profile) => {
    if (picked) return;
    picked = true;
    await selectProfile(p);
    go('map');
  };
  const cards = players.map((p, i) => profileCard(p, i, () => void play(p)));
  // Up to four profiles the new player is one more card; with more, or when the card would start a row of its own, it is a button by the incognito button.
  const newCard = players.length < MAX_PER_ROW
    ? h('button', { class: 'profile-card new', type: 'button', onClick: () => go('newProfile') },
      h('span', { class: 'plus' }, icon('plus')), h('span', { class: 'profile-name' }, t('start.newProfile')))
    : null;
  if (newCard) cards.push(newCard);
  const newButton = button(t('start.newProfile'), () => go('newProfile'), 'btn primary', 'plus');
  const profiles = h('div', { class: 'profile-list' });
  arrowFocus(profiles, '.profile-card');
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
    gated ? keyboardButton() : h('section', { class: 'panel' },
      h('h2', {}, t('start.whoPlays')),
      profiles,
      h('div', { class: 'row center' },
        newButton,
        button(t('start.guest'), async () => {
          const g = app.store.startGuest(language(), t('start.guestName'));
          await selectProfile(g);
          go('map');
        }, 'btn ghost', 'user'),
        button(t('start.import'), () => void import('./parent').then((m) => m.importDialog(() => go('start'))), 'btn ghost', 'upload'))),
    gated ? teacherButton() : null,
    startPromise()));
  // A key of a real keyboard lifts the gate at once: the start page (or a waiting task link) opens.
  const offKeyboard = gated ? onKeyboard(() => {
    const waiting = takeWaiting();
    if (waiting) void openRoute(waiting);
    else go('start', {}, false);
  }) : () => undefined;
  const placeNew = () => {
    if (!newCard) return;
    newCard.hidden = false;
    const first = cards[0];
    const wraps = newCard !== first && newCard.offsetTop > first.offsetTop;
    newCard.hidden = wraps;
    newButton.hidden = !wraps;
  };
  placeNew();
  window.addEventListener('resize', placeNew);
  // The first player (or the new player) waits for Enter; a number key picks one too.
  if (!gated) (root.querySelector<HTMLElement>('.profile-card') ?? root.querySelector<HTMLElement>('.panel .btn.primary'))?.focus();
  const offPick = gated ? () => undefined : pickByNumber(players.length, (i) => void play(players[i]));
  const offSuper = listenForSuperPassword(async () => {
    app.superPlayer = superProfile(language());
    await selectProfile(app.superPlayer);
    go('map');
  });
  return () => {
    window.removeEventListener('resize', placeNew);
    offKeyboard();
    offPick();
    offSuper();
  };
}

/**
 * The number keys 1-9 pick a player by its place: by the key, not its character, so a Slovak
 * keyboard's "ľ" is 2. Letters are left to the super password.
 */
function pickByNumber(count: number, pick: (i: number) => void): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || document.querySelector('.modal-back')) return;
    const i = numberPick(e, count);
    if (i === null) return;
    e.preventDefault();
    pick(i);
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}

/** A phone or tablet without a keyboard: the game needs one. A tap says how to connect it, unless it is there by now. */
function keyboardButton(): HTMLButtonElement {
  return bigButton(keyboardArt(), t('start.gate.title'), t('start.gate.sub'), () => {
    if (!keyboardGated()) return go('start', {}, false);
    modal(h('div', { class: 'keyboard-gate' }, keyboardArt(), h('h2', {}, t('start.gate.connect')), h('p', {}, t('start.gate.text'))));
  });
}

/**
 * The promise in one quiet line: on a wide screen with the open visit count and the licence, on a
 * narrow one only its short form. Its "data stays on your device" (or the short form) opens the
 * help's about tab. Its class avoids words like "privacy" or "cookie": cookie-banner blockers hide those.
 */
function startPromise(): HTMLElement {
  const ext = { target: '_blank', rel: 'noopener' };
  const about = (text: string) => h('a', { href: '#/help/about', onClick: (e: Event) => { e.preventDefault(); go('help', { tab: 'about' }); } }, text);
  const visits = h('span', {});
  void visitCount().then((count) => {
    if (count === null) return;
    const n = Number(count.replace(/\D/g, ''));
    const key = n === 1 ? 'privacy.visitsOne' : n > 1 && n < 5 ? 'privacy.visitsFew' : 'privacy.visitsMany';
    visits.replaceChildren(' · ', h('a', { href: COUNTER, ...ext }, t(key, { n: count })));
  });
  return h('footer', { class: 'start-promise' },
    h('p', { class: 'note-long' }, t('privacy.short'), ' · ', about(t('privacy.local')), visits, ' · ', h('a', { href: 'https://github.com/atiris/tapkotyper', ...ext }, 'MIT Atiris')),
    h('p', { class: 'note-short' }, about(t('privacy.tiny'))));
}

/** The teacher needs no keyboard: straight to the scanner and the class results. */
function teacherButton(): HTMLButtonElement {
  return bigButton(teacherArt(), t('start.teacher.title'), t('start.teacher.sub'), () => go('teacher'));
}
