import { app, go } from '../app/app';
import { audio, type SoundLevel } from '../audio/audio';
import { imageUrl } from '../gfx/assets';
import { LANGS, language, t } from '../i18n/i18n';
import type { Lang } from '../storage/schema';
import { type Child, ICONS, button, h } from './dom';
import { paintRound, roundButton, roundTextSvg } from './hud';
import { cornerMenu } from './menu';

/** Super mode is on: a round star in the top row; clicking it ends the mode. Nothing otherwise. */
export function superStar(): HTMLButtonElement | null {
  if (!app.superPlayer) return null;
  return roundButton('super', 'star', t('super.badge'), () => {
    app.superPlayer = null;
    go('start');
  });
}

const LEVEL_ICON: Record<SoundLevel, keyof typeof ICONS> = { normal: 'sound', quiet: 'soundLow', off: 'mute' };

/** Quick sound switch (on every screen): normal, quiet, off. */
export function soundButton(): HTMLButtonElement {
  const b = roundButton('control', LEVEL_ICON[audio.level], '', () => audio.cycleLevel());
  b.classList.add('sound-btn');
  // Right click: another track from the whole library.
  b.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    audio.shuffleTrack();
  });
  const paint = () => {
    const label = `${t('common.sound')}: ${t(`common.sound_${audio.level}`)}`;
    b.setAttribute('aria-label', label);
    b.title = label;
    b.dataset.level = audio.level;
    paintRound(b, LEVEL_ICON[audio.level]);
  };
  paint();
  const off = audio.onLevelChange(() => {
    if (!b.isConnected) return off();
    paint();
  });
  return b;
}

function toggleFullscreen(): void {
  const req = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  void req.catch(() => undefined);
}

/** Fullscreen switch; null where the browser has no fullscreen. */
export function fullscreenButton(): HTMLButtonElement | null {
  if (!document.fullscreenEnabled) return null;
  const b = roundButton('control', 'fullscreen', '', toggleFullscreen);
  b.classList.add('fullscreen-btn');
  const paint = () => {
    const on = !!document.fullscreenElement;
    const label = t(on ? 'common.fullscreenExit' : 'common.fullscreen');
    b.setAttribute('aria-label', label);
    b.title = label;
    paintRound(b, on ? 'fullscreenExit' : 'fullscreen');
  };
  const onChange = () => (b.isConnected ? paint() : document.removeEventListener('fullscreenchange', onChange));
  document.addEventListener('fullscreenchange', onChange);
  paint();
  return b;
}

/** The round "?": the help page, on the buttons for a player, on the about tab before a player is chosen. */
export function helpButton(): HTMLButtonElement {
  const b = roundButton('control', 'help', t('help.title'), () => go('help'));
  b.classList.add('help-btn');
  return b;
}

/** The global round buttons, right to left: help, fullscreen, sound, the super star. A level passes its own help. */
export function globalButtons(help: HTMLButtonElement = helpButton()): (HTMLButtonElement | null)[] {
  return [superStar(), soundButton(), fullscreenButton(), help];
}

/**
 * The language: the SK/EN switch on a wide window, one round button showing the language on
 * a narrower one (a click goes to the next language). CSS shows one of the two.
 */
export function languageControls(pick: (l: Lang) => void): HTMLElement[] {
  const now = language();
  const next = LANGS[(LANGS.indexOf(now) + 1) % LANGS.length];
  const round = h('button', { class: 'round-btn control lang-btn', type: 'button', title: `${t('start.langNow')}. ${t('start.langNext')}`, 'aria-label': t('start.langNow'),
    onClick: () => pick(next), html: roundTextSvg(now.toUpperCase()) });
  return [
    h('div', { class: 'lang-switch', role: 'group', 'aria-label': t('start.language') },
      ...LANGS.map((l) => button(l.toUpperCase(), () => pick(l), `chip ${now === l ? 'on' : ''}`))),
    round,
  ];
}

/**
 * The top right corner of every screen but a level, at one fixed offset: the screen's own
 * buttons (`lead`), then the global ones; below 600 px all of them fold into the Menu button.
 */
export function cornerControls(...lead: Child[]): HTMLElement {
  const row = h('div', { class: 'corner-row' }, ...lead, ...globalButtons());
  return h('div', { class: 'top-right' }, row, cornerMenu(row));
}

/**
 * With the profile's setting on, the first key press or click after start asks for
 * fullscreen: browsers allow it only from a user gesture.
 */
export function watchAutoFullscreen(): void {
  const ask = (e: Event) => {
    // Escape is no gesture for fullscreen; wait for the next key.
    if (!app.profile?.settings.autoFullscreen || (e instanceof KeyboardEvent && e.key === 'Escape')) return;
    window.removeEventListener('keydown', ask, true);
    window.removeEventListener('pointerdown', ask, true);
    if (document.fullscreenEnabled && !document.fullscreenElement) toggleFullscreen();
  };
  window.addEventListener('keydown', ask, true);
  window.addEventListener('pointerdown', ask, true);
}

/** Three stars, `n` of them filled: the same pictures as on the results card. */
export function starRow(n: number, cls = 'stars'): HTMLElement {
  const star = imageUrl('ui-star'), empty = imageUrl('ui-star-empty');
  return h('div', { class: cls, role: 'img', 'aria-label': t('results.starsAria', { n }) },
    ...[1, 2, 3].map((i) => {
      const on = i <= n;
      const src = on ? star : empty;
      return src ? h('img', { class: `star ${on ? 'on' : ''}`, src, alt: '', style: `--i:${i}` }) : h('span', { class: `star-fallback ${on ? 'on' : ''}`, style: `--i:${i}` }, '★');
    }));
}
