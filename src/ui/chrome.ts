import { type ScreenName, app, go, shownScreen } from '../app/app';
import { audio, type SoundLevel } from '../audio/audio';
import { imageUrl } from '../gfx/assets';
import { WORLDS } from '../game/levels';
import { LANGS, language, t } from '../i18n/i18n';
import { installShortcuts, setDefaultShortcuts, withKey } from '../input/shortcuts';
import type { Lang } from '../storage/schema';
import { type Child, ICONS, button, h } from './dom';
import { paintRound, roundButton, roundTextSvg } from './hud';
import { cornerMenu } from './menu';
import { toast } from './toast';
import { tip } from './tooltip';
import { updateButton } from './update';

/** Super mode is on: a round star in the top row; clicking it ends the mode. Nothing otherwise. */
export function superStar(): HTMLButtonElement | null {
  if (!app.superPlayer) return null;
  return roundButton('super', 'star', t('super.badge'), () => {
    app.superPlayer = null;
    go('start');
  });
}

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

/** The global round buttons, right to left: a new version (hidden until there is one), help, fullscreen, sound, the super star. A level passes its own help. */
export function globalButtons(help: HTMLButtonElement = helpButton()): (HTMLButtonElement | null)[] {
  return [superStar(), soundButton(), fullscreenButton(), help, updateButton()];
}

/**
 * The language: the SK/EN switch on a wide window, one round button showing the language on
 * a narrower one (a click goes to the next language). CSS shows one of the two.
 */
export function languageControls(pick: (l: Lang) => void): HTMLElement[] {
  const now = language();
  const next = LANGS[(LANGS.indexOf(now) + 1) % LANGS.length];
  const round = h('button', { class: 'round-btn control lang-btn', type: 'button', tip: `${t('start.langNow')}. ${t('start.langNext')}`, 'aria-label': t('start.langNow'),
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
