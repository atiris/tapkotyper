import { app, go, routeOf } from '../app/app';
import { t, tList } from '../i18n/i18n';
import { captureKeys } from '../game/cards';
import { PAW_MAX, PAW_STREAK, PAW_WORDS } from '../game/paw';
import { type Child, ICONS, closeButton, h, icon } from '../ui/dom';
import { levelRing, pawRing, rhythmPic, roundPic, timerPic } from '../ui/hud';
import { tabBar } from '../ui/tabs';

const TABS = ['ui', 'typing', 'progress', 'settings', 'about'] as const;
export type HelpTab = (typeof TABS)[number];

/** The parent's settings tabs, in the order of the settings screen; each gets its own lines. */
const SETTINGS_TABS = ['settings', 'own', 'surprises', 'task', 'keys', 'dashboard', 'data'] as const;

const COUNTER = 'https://tapkotyper.goatcounter.com';

/** A top icon as the child sees it (a picture, not a working button) with its one line. */
function iconLine(pic: HTMLElement, text: string): HTMLElement {
  return h('li', {}, h('span', { class: 'help-pic' }, pic), h('span', {}, text));
}

function round(name: keyof typeof ICONS): HTMLElement {
  return roundPic('control', name);
}

function mapIcons(): HTMLElement[] {
  return [
    iconLine(h('span', { class: 'btn ghost small' }, icon('back'), h('span', {}, t('map.switchProfile'))), t('help.icons.players')),
    iconLine(round('gear'), t('help.icons.settings')),
    iconLine(round('sound'), t('help.icons.sound')),
    iconLine(round('fullscreen'), t('help.icons.fullscreen')),
    iconLine(round('help'), t('help.icons.help')),
    iconLine(round('menu'), t('help.icons.menu')),
    iconLine(timerPic(150).el, t('help.icons.timer')),
  ];
}

/** The buttons of a level; the super star only where it can appear on screen (the help page). */
export function levelIcons(withSuper = false): HTMLElement[] {
  const gauge = rhythmPic();
  gauge.set(0.6);
  return [
    iconLine(round('pause'), t('help.icons.pause')),
    iconLine(roundPic('paw', 'paw', pawRing(2, PAW_MAX)),
      t('help.icons.paw', { n: PAW_STREAK, words: PAW_WORDS })),
    iconLine(levelRing([true, true, false, false, false], 2, false), t('help.icons.ring')),
    iconLine(h('div', { class: 'progress' }, h('div', { class: 'progress-fill', style: 'width: 60%' })), t('help.icons.progress')),
    iconLine(gauge.el, t('help.icons.gauge')),
    iconLine(round('help'), t('help.icons.levelHelp')),
    iconLine(round('read'), t('help.icons.read')),
    iconLine(round('keyboard'), t('help.icons.guide')),
    iconLine(round('sound'), t('help.icons.sound')),
    iconLine(round('fullscreen'), t('help.icons.fullscreen')),
    ...(withSuper ? [iconLine(roundPic('super', 'star'), t('help.icons.super'))] : []),
  ];
}

function section(title: string, ...kids: Child[]): HTMLElement {
  return h('section', { class: 'help-section' }, h('h2', {}, title), ...kids);
}

const list = (key: string) => h('ul', {}, ...tList(key).map((l) => h('li', {}, l)));

/** Fills `line` with the visit count the public counter reports; stays empty when offline. */
async function showVisits(line: HTMLElement): Promise<void> {
  try {
    const r = await fetch(`${COUNTER}/counter/TOTAL.json`);
    const { count } = await r.json();
    if (typeof count !== 'string') return;
    line.replaceChildren(t('about.visits', { n: count }), ' ', h('a', { href: COUNTER, target: '_blank', rel: 'noopener' }, t('about.visitsLink')));
  } catch { /* offline or blocked: the line stays empty */ }
}

/** About the game and the privacy promise, for parents. */
function aboutTab(): HTMLElement[] {
  const visits = h('p', { class: 'hint' });
  void showVisits(visits);
  return [
    h('p', {}, t('about.intro')),
    section(t('about.privacyTitle'), list('about.privacy')),
    section(t('about.dataTitle'), list('about.data'), visits),
    section(t('about.howTitle'), list('about.how')),
    section(t('about.creditsTitle'), h('p', {}, t('about.credits')),
      h('div', { class: 'row about-actions' },
        h('a', { class: 'btn', href: 'https://github.com/atiris/tapkotyper', target: '_blank', rel: 'noopener' }, icon('code'), t('about.code')),
        h('a', { class: 'btn', href: 'https://github.com/atiris/tapkotyper/issues/new', target: '_blank', rel: 'noopener' }, icon('edit'), t('about.report')))),
  ];
}

function tabContent(tab: HelpTab): HTMLElement[] {
  switch (tab) {
    case 'ui': return [
      section(t('help.mapTitle'), h('ul', { class: 'help-icons' }, ...mapIcons())),
      section(t('help.cardTitle'), list('help.card')),
      section(t('help.levelTitle'), h('ul', { class: 'help-icons' }, ...levelIcons(true))),
    ];
    case 'typing': return [
      section(t('help.typeTitle'), list('help.type')),
      section(t('help.playTitle'), list('help.play')),
    ];
    case 'progress': return [
      section(t('help.journeyTitle'), list('help.journey')),
      section(t('help.progressTitle'), list('help.progress')),
      section(t('help.moreTitle'), list('help.more')),
      section(t('help.taskTitle'), list('help.task')),
    ];
    case 'settings': return [
      h('p', {}, t('help.settingsIntro')),
      ...SETTINGS_TABS.map((s) => section(t(`parent.tab.${s}`), list(`help.settings.${s}`))),
    ];
    case 'about': return aboutTab();
  }
}

/** The one help page: the buttons, how to type, how to progress, the settings and about the game, in tabs. */
function helpPage(tab: HelpTab, onBack: () => void, onTab: (tab: HelpTab) => void = () => {}): HTMLElement {
  const body = h('div', { class: 'tab-panel prose' });
  const nav = tabBar(TABS.map((x) => [x, t(`help.tab.${x}`)] as const), tab, (x) => {
    body.replaceChildren(...tabContent(x));
    body.scrollTop = 0;
    onTab(x);
  });
  return h('article', { class: 'help-page' },
    h('div', { class: 'bar' }, h('h1', {}, t('help.title')), closeButton(onBack)),
    nav, body);
}

/** Escape goes back, like the close button; a dialog over the help closes first. */
function escapeBack(el: HTMLElement, onBack: () => void): () => void {
  return captureKeys(el, (e) => {
    if (e.key !== 'Escape' || document.querySelector('.modal-back')) return;
    e.preventDefault();
    e.stopPropagation();
    onBack();
  });
}

/** Help as its own screen: from the map (on the buttons) or from the start page (on the about tab). */
export function helpScreen(root: HTMLElement, params: { tab?: string }): () => void {
  const back = () => go(app.profile ? 'map' : 'start');
  const tab = TABS.find((x) => x === params.tab) ?? (app.profile ? 'ui' : 'about');
  const screen = h('div', { class: 'screen help-screen' },
    helpPage(tab, back, (x) => history.replaceState(null, '', routeOf('help', { tab: x }))));
  root.append(screen);
  screen.querySelector<HTMLElement>('.modal-x')!.focus();
  return escapeBack(screen, back);
}

/** Help over a paused level, on how to type; close (or Escape) returns to the paused level. */
export function openHelp(host: HTMLElement, onBack: () => void): void {
  const overlay = h('div', { class: 'help-overlay', role: 'dialog', 'aria-label': t('help.title') });
  const close = () => {
    stop();
    overlay.remove();
    onBack();
  };
  overlay.append(helpPage('typing', close));
  const stop = escapeBack(overlay, close);
  host.append(overlay);
  overlay.querySelector<HTMLElement>('.modal-x')!.focus();
}
