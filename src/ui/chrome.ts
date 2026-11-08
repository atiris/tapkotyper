import { type ScreenName, app, cycleSound, go, setSound, shownScreen, toggleLook } from '../app/app';
import { onThemeChange, shownLook } from '../app/theme';
import { audio } from '../audio/audio';
import { SOUND_LEVELS } from '../audio/levels';
import { imageUrl } from '../gfx/assets';
import { MAX_LEVEL_STARS, WORLDS, worldName } from '../game/levels';
import { LANGS, LANGUAGES, language, languageName, t } from '../i18n/i18n';
import { installShortcuts, setDefaultShortcuts, withKey } from '../input/shortcuts';
import type { Lang, SoundLevel } from '../storage/schema';
import { type Child, ICONS, h, icon } from './dom';
import { paintRound, roundButton } from './hud';
import { cornerMenu } from './menu';
import { superStar } from './service';
import { toast } from './toast';
import { hideTip, tip } from './tooltip';
import { updateButton } from './update';

const LEVEL_ICON: Record<SoundLevel, keyof typeof ICONS> = { normal: 'sound', quiet: 'soundLow', important: 'soundImportant', off: 'mute' };

const levelName = (level: SoundLevel) => t(`common.sound_${level}`);
const soundLabel = () => levelName(audio.level);

/**
 * Quick sound switch (on every screen): a click opens the list of the levels (normal, quiet, only
 * where it matters, off), F4 steps through them. Full sound has the orange ring; the tooltip names the
 * song playing, and with `important` where sound plays.
 */
export function soundButton(): HTMLButtonElement {
  const b: HTMLButtonElement = roundButton('control', LEVEL_ICON[audio.level], '', () => (openDrop?.btn === b ? openDrop.close() : soundList(b)));
  b.classList.add('sound-btn');
  b.setAttribute('aria-haspopup', 'listbox');
  b.setAttribute('aria-expanded', 'false');
  // Right click: another track from the whole library.
  b.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    audio.shuffleTrack(shownScreen() === 'level');
  });
  const paint = (b: HTMLButtonElement) => {
    const label = soundLabel();
    b.setAttribute('aria-label', label);
    const where = audio.level === 'important' ? `\n${t('common.soundImportantTip')}` : '';
    const song = audio.playing && !audio.silent ? `\n${t('common.song', { name: trackName(audio.playing) })}` : '';
    tip(b, `${withKey(label, 'F4')}${where}${song}\n${t('common.nextSong')}`);
    b.dataset.level = audio.level;
    b.setAttribute('aria-pressed', String(audio.level === 'normal'));
    paintRound(b, LEVEL_ICON[audio.level]);
  };
  paint(b);
  // Held weakly: a screen left behind is not kept in memory until the sound changes next.
  const ref = new WeakRef(b);
  const off = audio.onChange(() => {
    const btn = ref.deref();
    if (!btn?.isConnected) return off();
    paint(btn);
  });
  return b;
}

/** Fullscreen on or off; a refused request says so instead of doing nothing. */
function toggleFullscreen(): void {
  if (document.fullscreenElement) return void document.exitFullscreen().catch(() => undefined);
  void document.documentElement.requestFullscreen().catch(() => toast(t('common.fullscreenBlocked')));
}

/** Fullscreen switch, with the orange ring while on; null where the browser has no fullscreen. */
export function fullscreenButton(): HTMLButtonElement | null {
  if (!document.fullscreenEnabled) return null;
  const b = roundButton('control', 'fullscreen', '', toggleFullscreen);
  b.classList.add('fullscreen-btn');
  const paint = (b: HTMLButtonElement) => {
    const on = !!document.fullscreenElement;
    const label = t(on ? 'common.fullscreenExit' : 'common.fullscreen');
    b.setAttribute('aria-label', label);
    b.setAttribute('aria-pressed', String(on));
    tip(b, `${label} (F11)`);
    paintRound(b, on ? 'fullscreenExit' : 'fullscreen');
  };
  // Held weakly, as the sound button.
  const ref = new WeakRef(b);
  const onChange = () => {
    const btn = ref.deref();
    if (btn?.isConnected) paint(btn);
    else document.removeEventListener('fullscreenchange', onChange);
  };
  document.addEventListener('fullscreenchange', onChange);
  paint(b);
  return b;
}

/** The help tab that fits a screen; the others open help on its default tab. */
const HELP_TAB: Partial<Record<ScreenName, string>> = { map: 'ui', progress: 'progress', parent: 'settings', teacher: 'mentoring' };

/**
 * The help page on the tab of the screen shown now (My progress open: how to progress), else on
 * the buttons for a player, on the about tab before a player is chosen.
 */
export function openScreenHelp(): void {
  const shown = shownScreen();
  // The break is not skipped through the help page either.
  if (shown === 'help' || document.querySelector('.break-modal')) return;
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
  const world = (WORLDS as string[]).indexOf(track);
  return world >= 0 ? worldName(world) : t(`tracks.${track}`);
}

/**
 * No pinch zoom: a touchpad pinch enlarges only what the window shows and pushes the page's right
 * side (a word to type too) out of sight with no scrollbar. The browser sends it as a wheel marked
 * with Ctrl while no Ctrl key is down; Ctrl with the wheel or + and - still zoom the whole page.
 */
export function blockPinchZoom(): void {
  let ctrlDown = false;
  const track = (e: KeyboardEvent) => { ctrlDown = e.ctrlKey; };
  window.addEventListener('keydown', track, true);
  window.addEventListener('keyup', track, true);
  window.addEventListener('blur', () => { ctrlDown = false; });
  window.addEventListener('wheel', (e) => { if (e.ctrlKey && !ctrlDown) e.preventDefault(); }, { passive: false });
}

/** The app's function keys: F1 the screen's help, F4 the sound level, F8 the next song, F11 fullscreen; a level adds its own. */
export function appShortcuts(): void {
  // F11 takes the page's fullscreen instead of the browser's own, so the fullscreen button can leave it again.
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'F11' || e.ctrlKey || e.altKey || e.metaKey || !document.fullscreenEnabled) return;
    e.preventDefault();
    toggleFullscreen();
  }, true);
  setDefaultShortcuts({
    help: openScreenHelp,
    sound: () => {
      cycleSound();
      toast(soundLabel());
    },
    track: () => {
      const track = audio.shuffleTrack(shownScreen() === 'level');
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

/** The settings gear: the player's settings, or before a player is chosen the ones without a profile. */
export function settingsButton(): HTMLButtonElement {
  const b = roundButton('control', 'gear', t('map.settings'), () => go('parent'));
  b.classList.add('settings-btn');
  return b;
}

/** Dark or light: a moon in the light look, a sun in the dark one. */
export function themeButton(): HTMLButtonElement {
  const b = roundButton('control', 'moon', '', toggleLook);
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
  const b: HTMLButtonElement = roundButton('control', 'language', t('start.langNow', { name: languageName() }), () => (openDrop?.btn === b ? openDrop.close() : languageList(b, pick)));
  b.classList.add('lang-btn');
  b.setAttribute('aria-haspopup', 'listbox');
  b.setAttribute('aria-expanded', 'false');
  return b;
}

/** After a screen re-rendered in the picked language: the focus goes back to its language button (or the Menu holding it). */
export function focusLanguageButton(root: HTMLElement): void {
  [...root.querySelectorAll<HTMLElement>('.top-right .lang-btn, .top-right .menu-btn')].find((e) => e.offsetParent)?.focus();
}

function languageList(b: HTMLButtonElement, pick: (l: Lang) => void): void {
  const now = language();
  dropList(b, 'lang-list', t('start.language'), LANGS.map((l) => ({
    content: [h('span', {}, LANGUAGES[l])], selected: l === now, attrs: { lang: l }, pick: () => { if (l !== now) pick(l); },
  })));
}

function soundList(b: HTMLButtonElement): void {
  dropList(b, 'sound-list', t('common.sound'), SOUND_LEVELS.map((l) => ({
    content: [icon(LEVEL_ICON[l]), h('span', {}, levelName(l))], selected: l === audio.level, attrs: { 'data-level': l },
    tip: l === 'important' ? t('common.soundImportantTip') : undefined, pick: () => setSound(l),
  })));
}

/** One choice of a drop list: what it shows, whether it is the current one, and what picking it does. */
interface DropItem {
  content: Child[];
  selected: boolean;
  pick(): void;
  attrs?: Record<string, string>;
  tip?: string;
}

/** The drop list open now (one at a time) with its button; null while none is open. */
let openDrop: { btn: HTMLButtonElement; close: () => void } | null = null;

/**
 * A list under its round button (under the corner controls when the button sits in the Menu, under
 * the bar in a level), the current choice marked. The arrows move, Enter picks, Escape, a click
 * outside or Tab away closes; focus returns to the button (or to the Menu it was opened from).
 */
function dropList(b: HTMLButtonElement, cls: string, label: string, choices: DropItem[]): void {
  openDrop?.close();
  const corner = b.closest<HTMLElement>('.top-right, .hud')!;
  const items = choices.map((c) => h('button', { class: 'drop-item', type: 'button', role: 'option', 'aria-selected': String(c.selected), tip: c.tip, ...c.attrs, onClick: () => { close(); c.pick(); } },
    ...c.content, c.selected ? icon('check') : null));
  const list = h('div', { class: `drop-list ${cls}`, role: 'listbox', 'aria-label': label }, ...items);
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
    if (openDrop?.close === close) openDrop = null;
    list.remove();
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('pointerdown', onPointer, true);
    b.setAttribute('aria-expanded', 'false');
    // Below 600 px the button itself is hidden in the Menu.
    if (refocus) (b.offsetParent ? b : corner.querySelector<HTMLElement>('.menu-btn'))?.focus();
  }
  openDrop = { btn: b, close };
  hideTip();
  if (b.offsetParent) list.style.right = `${corner.getBoundingClientRect().right - b.getBoundingClientRect().right}px`;
  list.addEventListener('focusout', onFocusOut);
  corner.append(list);
  b.setAttribute('aria-expanded', 'true');
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('pointerdown', onPointer, true);
  items[Math.max(0, choices.findIndex((c) => c.selected))].focus();
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
    // F11 and the fullscreen button switch it themselves: asking too would switch it right back.
    const own = e instanceof KeyboardEvent ? e.key === 'F11' : (e.target as Element | null)?.closest?.('.fullscreen-btn');
    window.removeEventListener('keydown', ask, true);
    window.removeEventListener('pointerdown', ask, true);
    if (!own && document.fullscreenEnabled && !document.fullscreenElement) toggleFullscreen();
  };
  window.addEventListener('keydown', ask, true);
  window.addEventListener('pointerdown', ask, true);
}

/** The 1-5 places of a level's stars, filled from the left. */
const STAR_PLACES = Array.from({ length: MAX_LEVEL_STARS }, (_, i) => i + 1);

/** One star picture, or a drawn star when the picture is missing. */
const starPic = (src: string | null, cls: string) => (src ? h('img', { class: cls, src, alt: '' }) : h('span', { class: `${cls} star-fallback` }, '★'));

/** A level's stars in one row: all places empty from the start, `n` gold ones popping onto them one after another. */
export function starRow(n: number): HTMLElement {
  const star = imageUrl('ui-star'), empty = imageUrl('ui-star-empty');
  return h('div', { class: 'stars', role: 'img', 'aria-label': t('results.starsAria', { n, max: MAX_LEVEL_STARS }) },
    ...STAR_PLACES.map((i) => h('span', { class: 'star', style: `--i:${i}` },
      starPic(empty, 'star-empty'),
      i <= n ? starPic(star, 'star-gold') : null)));
}
