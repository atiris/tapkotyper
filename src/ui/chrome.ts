import { type ScreenName, app, go, shownScreen } from '../app/app';
import { onThemeChange, shownLook, toggleTheme } from '../app/theme';
import { audio, type SoundLevel } from '../audio/audio';
import { imageUrl } from '../gfx/assets';
import { WORLDS } from '../game/levels';
import { LANGS, LANGUAGES, language, languageName, t } from '../i18n/i18n';
import { installShortcuts, setDefaultShortcuts, withKey } from '../input/shortcuts';
import type { Lang } from '../storage/schema';
import { type Child, ICONS, h, icon } from './dom';
import { paintRound, roundButton } from './hud';
import { cornerMenu } from './menu';
import { superStar } from './service';
import { toast } from './toast';
import { hideTip, tip } from './tooltip';
import { updateButton } from './update';

const LEVEL_ICON: Record<SoundLevel, keyof typeof ICONS> = { normal: 'sound', quiet: 'soundLow', off: 'mute' };

const soundLabel = () => `${t('common.sound')}: ${t(`common.sound_${audio.level}`)}`;

/** Quick sound switch (on every screen): normal, quiet, off; F4 too. */
export function soundButton(): HTMLButtonElement {
  const b = roundButton('control', LEVEL_ICON[audio.level], '', () => audio.cycleLevel());
  b.classList.add('sound-btn');
  // Right click: another track from the whole library.
  b.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    audio.shuffleTrack();
  });
  const paint = () => {
    const label = soundLabel();
    b.setAttribute('aria-label', label);
    tip(b, `${withKey(label, 'F4')}\n${t('common.nextSong')}`);
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
    // F11 is the browser's own fullscreen key, not one of the game's.
    tip(b, `${label} (F11)`);
    paintRound(b, on ? 'fullscreenExit' : 'fullscreen');
  };
  const onChange = () => (b.isConnected ? paint() : document.removeEventListener('fullscreenchange', onChange));
  document.addEventListener('fullscreenchange', onChange);
  paint();
  return b;
}

/** The help tab that fits a screen; the others open help on its default tab. */
const HELP_TAB: Partial<Record<ScreenName, string>> = { map: 'ui', parent: 'settings', teacher: 'mentoring' };

/**
 * The help page on the tab of the screen shown now (My progress open: how to progress), else on
 * the buttons for a player, on the about tab before a player is chosen.
 */
export function openScreenHelp(): void {
  const shown = shownScreen();
  // The break is not skipped through the help page either.
  if (shown === 'help' || shown === 'break') return;
  const tab = document.querySelector('.stats-modal') ? 'progress' : HELP_TAB[shown ?? 'start'];
  go('help', tab ? { tab } : {});
}

/** The round "?", F1 too. */
export function helpButton(): HTMLButtonElement {
  const b = roundButton('control', 'help', t('help.title'), openScreenHelp);
  tip(b, withKey(t('help.title'), 'F1'));
  b.classList.add('help-btn');
  return b;
}

/** A track's name: its world's, or the menu's, the relaxing one's or the break's. */
function trackName(track: string): string {
  return t((WORLDS as string[]).includes(track) ? `worlds.${track}` : `tracks.${track}`);
}

/** The app's function keys: F1 the screen's help, F4 the sound level, F8 the next song; a level adds its own. */
export function appShortcuts(): void {
  setDefaultShortcuts({
    help: openScreenHelp,
    sound: () => {
      audio.cycleLevel();
      toast(soundLabel());
    },
    track: () => {
      const track = audio.shuffleTrack();
      if (track) toast(t('common.song', { name: trackName(track) }));
    },
  });
  installShortcuts();
}

/**
 * The global round buttons, right to left: the super star, a new version (hidden until there is
 * one), help, the theme (outside a level), fullscreen, sound. A level passes its own help.
 */
export function globalButtons(help: HTMLButtonElement = helpButton(), theme: HTMLButtonElement | null = null): (HTMLButtonElement | null)[] {
  return [soundButton(), fullscreenButton(), theme, help, updateButton(), superStar()];
}

/** Dark or light: a moon in the light look, a sun in the dark one. */
export function themeButton(): HTMLButtonElement {
  const b = roundButton('control', 'moon', '', toggleTheme);
  b.classList.add('theme-btn');
  paintTheme(b);
  return b;
}

function paintTheme(b: HTMLButtonElement): void {
  const dark = shownLook() === 'dark';
  const label = t(dark ? 'common.lightMode' : 'common.darkMode');
  b.setAttribute('aria-label', label);
  tip(b, label);
  paintRound(b, dark ? 'sun' : 'moon');
}

// One listener for every theme button on the page, so leaving a screen leaves nothing behind.
onThemeChange(() => document.querySelectorAll<HTMLButtonElement>('.theme-btn').forEach(paintTheme));

/** The language: the language symbol; a click opens the list of the official languages by their own names (own ones are picked in the settings), a second click closes it. */
export function languageButton(pick: (l: Lang) => void): HTMLButtonElement {
  const b: HTMLButtonElement = roundButton('control', 'language', t('start.langNow', { name: languageName() }), () => (closeLanguages && document.querySelector('.lang-list') ? closeLanguages() : languageList(b, pick)));
  b.classList.add('lang-btn');
  b.setAttribute('aria-haspopup', 'listbox');
  b.setAttribute('aria-expanded', 'false');
  return b;
}

/** Closes the open language list; null while none is open. */
let closeLanguages: (() => void) | null = null;

/**
 * The list under the language button (under the corner controls when the button sits in the
 * Menu), the current language marked. The arrows move, Enter picks, Escape, a click outside or
 * Tab away closes; focus returns to the button (or to the Menu it was opened from).
 */
function languageList(b: HTMLButtonElement, pick: (l: Lang) => void): void {
  const corner = b.closest<HTMLElement>('.top-right')!;
  const now = language();
  const items = LANGS.map((l) => h('button', { class: 'lang-item', type: 'button', role: 'option', lang: l, 'aria-selected': String(l === now), onClick: () => { close(); if (l !== now) pick(l); } },
    h('span', {}, LANGUAGES[l]), l === now ? icon('check') : null));
  const list = h('div', { class: 'lang-list', role: 'listbox', 'aria-label': t('start.language') }, ...items);
  const onKey = (e: KeyboardEvent) => {
    // The screen went away with the list in it.
    if (!list.isConnected) return close(false);
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const i = items.indexOf(document.activeElement as HTMLButtonElement);
      items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus();
    }
  };
  // The button's own click toggles the list, so a press on it is not "outside".
  const onPointer = (e: PointerEvent) => {
    if (!list.contains(e.target as Node) && !b.contains(e.target as Node)) close(false);
  };
  const onFocusOut = (e: FocusEvent) => {
    const to = e.relatedTarget as Node | null;
    if (list.isConnected && !list.contains(to) && !b.contains(to)) close(false);
  };
  let closed = false;
  function close(refocus = true): void {
    // Removing the focused list fires its focusout, which closes again.
    if (closed) return;
    closed = true;
    if (closeLanguages === close) closeLanguages = null;
    list.remove();
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('pointerdown', onPointer, true);
    b.setAttribute('aria-expanded', 'false');
    // Below 600 px the button itself is hidden in the Menu.
    if (refocus) (b.offsetParent ? b : corner.querySelector<HTMLElement>('.menu-btn'))?.focus();
  }
  closeLanguages = close;
  hideTip();
  if (b.offsetParent) list.style.right = `${corner.getBoundingClientRect().right - b.getBoundingClientRect().right}px`;
  list.addEventListener('focusout', onFocusOut);
  corner.append(list);
  b.setAttribute('aria-expanded', 'true');
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('pointerdown', onPointer, true);
  items[Math.max(0, LANGS.indexOf(now as Lang))].focus();
}

/**
 * The top right corner of every screen but a level, at one fixed offset: the screen's own
 * buttons (`lead`), then the global ones with the theme; below 600 px all of them fold into the Menu button.
 */
export function cornerControls(...lead: Child[]): HTMLElement {
  const row = h('div', { class: 'corner-row' }, ...lead, ...globalButtons(helpButton(), themeButton()));
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
