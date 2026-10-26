import { app, applyProfileLook, go, openRoute, selectProfile, useLanguage } from '../app/app';
import { keyboardGated, onKeyboard, takeWaiting } from '../app/keyboard-gate';
import { audio } from '../audio/audio';
import { imageUrl } from '../gfx/assets';
import { language, t, tList } from '../i18n/i18n';
import type { Lang, Profile } from '../storage/schema';
import { type ICONS, arrowFocus, bigButton, button, h, icon, keyboardArt, modal, teacherArt } from '../ui/dom';
import { cornerControls, languageButton, settingsButton } from '../ui/chrome';
import { roundButton } from '../ui/hud';
import { numberPick, profileCard } from '../ui/profile-card';
import { MAX_PER_ROW, rowSplit } from '../ui/rows';
import { skyScene } from '../ui/sky';
import { tapkoVisit } from '../ui/tapko-visit';
import { onTypedWord } from '../ui/typed-word';
import { listenForSuperPassword, superProfile } from '../app/super';

/** The narrowest player card (its four counts still in one line) and the gap between cards, for the number of cards a row holds. */
const CARD_MIN = 140;
const CARD_GAP = 12;
/** In two columns the title's column keeps at least this share of the width; the card takes the rest. */
const TITLE_SHARE = 0.32;

export function startScreen(root: HTMLElement): () => void {
  app.profile = null;
  applyProfileLook(null);
  audio.music(app.menuTrack);
  const lang = languageButton(async (l: Lang) => {
    app.store.data.language = l;
    app.store.save();
    await useLanguage(l);
    // Re-render only if the child is still here (the file may load slowly); the focus goes back to the language.
    if (root.dataset.screen !== 'start') return;
    go('start');
    [...root.querySelectorAll<HTMLElement>('.top-right .lang-btn, .top-right .menu-btn')].find((e) => e.offsetParent)?.focus();
  });
  const gated = keyboardGated();

  const top = h('div', { class: 'start-top' },
    gated ? logoFace('gate-logo') : null,
    h('h1', { class: 'wordmark', 'aria-label': 'TapkoTyper' },
      h('span', { class: 'wm-halo', 'aria-hidden': 'true' }, 'TapkoTyper'),
      h('span', { class: 'wm-back', 'aria-hidden': 'true' }, 'TapkoTyper'),
      h('span', { 'aria-hidden': 'true' }, h('span', { class: 'wm-o' }, 'Tapko'), h('span', { class: 'wm-g' }, 'Typer'))),
    h('p', { class: 'slogan' }, ...tList('start.slogan').map((line) => h('span', {}, line))));

  let card: HTMLElement | null = null;
  let offPick: () => void = () => undefined;
  let placeRows: () => void = () => undefined;
  if (!gated) {
    // Super Tapko comes last, so it never shifts the order of the real players.
    const players = [...app.store.profiles, ...(app.superPlayer ? [app.superPlayer] : [])];
    let picked = false;
    const play = async (p: Profile) => {
      if (picked) return;
      picked = true;
      await selectProfile(p);
      go('map');
    };
    const guest = button(t('start.guest'), async () => {
      const g = app.store.startGuest(language(), t('start.guestName'));
      await selectProfile(g);
      go('map');
    }, 'btn ghost', 'play');
    const cards = players.map((p, i) => profileCard(p, i, () => void play(p)));
    const list = h('div', { class: 'profile-list' });
    arrowFocus(list, '.profile-card');
    let perRow = 0;
    /**
     * The card is as wide as its player cards want, up to what the title's column leaves it. As many
     * cards in a row as that has room for (at most five), in balanced rows.
     */
    placeRows = () => {
      const wrap = list.closest<HTMLElement>('.start-wrap');
      if (!wrap || !card) return;
      const ws = getComputedStyle(wrap), cs = getComputedStyle(card);
      const inner = wrap.clientWidth - parseFloat(ws.paddingLeft) - parseFloat(ws.paddingRight);
      const twoColumns = ws.gridTemplateColumns.split(' ').length > 1;
      const room = twoColumns ? inner * (1 - TITLE_SHARE) - parseFloat(ws.columnGap) : inner;
      card.style.maxWidth = `${Math.floor(room)}px`;
      const width = room - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const per = Math.max(1, Math.min(MAX_PER_ROW, Math.floor((width + CARD_GAP) / (CARD_MIN + CARD_GAP))));
      if (per === perRow) return;
      perRow = per;
      let at = 0;
      list.replaceChildren(...rowSplit(cards.length, per).map((size) => h('div', { class: 'profile-row' }, ...cards.slice((at += size) - size, at))));
    };
    card = h('section', { class: 'start-card', 'aria-labelledby': 'start-who' },
      logoFace('card-logo'),
      h('h2', { id: 'start-who' }, t('start.whoPlays')),
      // Profiles are loaded on the start page only before the first player; later in the settings.
      ...(players.length ? [
        list,
        h('div', { class: 'start-ghosts' }, guest, button(t('start.newProfile'), () => go('newProfile'), 'btn ghost new-player', 'plus')),
      ] : [
        h('p', { class: 'start-first' }, t('start.first')),
        button(t('start.newFirst'), () => go('newProfile'), 'btn primary big new-player', 'plus'),
        h('div', { class: 'start-ghosts' }, guest,
          button(t('start.import'), () => void import('./parent').then((m) => m.importDialog(() => go('start'))), 'btn ghost', 'upload')),
      ]));
    offPick = pickByNumber(players.length, (i) => void play(players[i]));
  }

  const more = h('div', { class: 'start-more' },
    ...(gated ? [
      h('p', { class: 'start-intro' }, t('start.phoneIntro')),
      bigButton(teacherArt(), t('start.teacher.title'), t('start.teacher.sub'), () => go('teacher')),
      keyboardButton(),
    ] : [
      h('p', { class: 'start-intro' }, t('start.intro')),
      promises(),
    ]));

  const screen = h('div', { class: `screen start-screen${gated ? ' gated' : ''}` });
  const sky = skyScene(screen, () => [top], () => [card, card?.querySelector('.card-logo') ?? null]);
  screen.append(sky.el,
    cornerControls(lang, gated ? null : settingsButton(), roundButton('control', 'chart', t('teacher.title'), () => go('teacher'))),
    h('div', { class: 'start-wrap' }, top, card, more),
    h('a', { class: 'start-sig', href: 'https://github.com/atiris/tapkotyper', target: '_blank', rel: 'noopener' }, 'MIT · Atiris'));
  root.append(screen);

  // A key of a real keyboard lifts the gate at once: the start page (or a waiting task link) opens.
  const offKeyboard = gated ? onKeyboard(() => {
    const waiting = takeWaiting();
    if (waiting) void openRoute(waiting);
    else go('start', {}, false);
  }) : () => undefined;
  placeRows();
  window.addEventListener('resize', placeRows);
  // The first player (or the new player) waits for Enter; a number key picks one too.
  if (!gated) (root.querySelector<HTMLElement>('.profile-card') ?? root.querySelector<HTMLElement>('.start-card .btn.primary'))?.focus();
  const offSuper = listenForSuperPassword(async () => {
    app.superMode = true;
    app.superPlayer = superProfile(language());
    await selectProfile(app.superPlayer);
    go('map');
  });
  // A greeting typed brings a Tapko to say hello.
  const offGreet = gated ? () => undefined : onTypedWord(tList('start.visit.words'), () => tapkoVisit(screen));
  return () => {
    offGreet();
    window.removeEventListener('resize', placeRows);
    sky.destroy();
    offKeyboard();
    offPick();
    offSuper();
  };
}

/** The logo face: its picture for a light page and the one drawn for a dark page; the CSS shows one. */
function logoFace(cls: string): HTMLElement | null {
  const light = imageUrl('ui-icon-hr'), dark = imageUrl('ui-icon-hr-darkbg');
  if (!light) return null;
  return h('span', { class: `logo-face ${cls}` }, h('img', { class: 'on-light', src: light, alt: '' }), h('img', { class: 'on-dark', src: dark ?? light, alt: '' }));
}

/** The four promises, each with a green icon; "data stays on your device" opens the help's about tab. */
function promises(): HTMLElement {
  const about = (text: string) => h('a', { href: '#/help/about', onClick: (e: Event) => { e.preventDefault(); go('help', { tab: 'about' }); } }, text);
  const item = (glyph: keyof typeof ICONS, text: string | Node) => h('li', {}, icon(glyph, 'promise-icon'), text);
  return h('ul', { class: 'start-promises' },
    item('noAds', t('start.promises.ads')),
    item('lock', about(t('start.promises.local'))),
    item('star', t('start.promises.wardrobe')),
    item('chart', t('start.promises.mentors')));
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
  const b = bigButton(keyboardArt(), t('start.gate.title'), t('start.gate.sub'), () => {
    if (!keyboardGated()) return go('start', {}, false);
    modal(h('div', { class: 'keyboard-gate' }, keyboardArt(), h('h2', {}, t('start.gate.connect')), h('p', {}, t('start.gate.text'))));
  });
  b.classList.add('alt');
  return b;
}
