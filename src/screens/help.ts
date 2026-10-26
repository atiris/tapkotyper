import { app, go, routeOf } from '../app/app';
import { t, tList } from '../i18n/i18n';
import { captureKeys } from '../game/cards';
import { PAW_MAX, PAW_STREAK, PAW_WORDS } from '../game/paw';
import { type Child, ICONS, button, h, icon, richText } from '../ui/dom';
import { levelRing, pawRing, rhythmPic, roundPic, timerPic } from '../ui/hud';
import { barTabLinks, tabBar } from '../ui/tabs';
import { installApp } from '../ui/install';

const TABS = ['ui', 'typing', 'progress', 'settings', 'mentoring', 'about'] as const;
export type HelpTab = (typeof TABS)[number];

/** The parent's settings tabs, in the order of the settings screen; each gets its own lines. */
const SETTINGS_TABS = ['settings', 'own', 'surprises', 'task', 'keys', 'dashboard', 'data'] as const;

const COUNTER = 'https://tapkotyper.goatcounter.com';

/** A top icon as the child sees it (a picture, not a working button) with its one line. */
function iconLine(pic: HTMLElement, text: string): HTMLElement {
  return h('li', {}, h('span', { class: 'help-pic' }, pic), h('span', {}, ...richText(text)));
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
    iconLine(round('moon'), t('help.icons.theme')),
    iconLine(round('help'), t('help.icons.help')),
    iconLine(round('language'), t('help.icons.language')),
    iconLine(roundPic('update', 'update'), t('help.icons.update')),
    iconLine(round('menu'), t('help.icons.menu')),
    iconLine(timerPic(150).el, t('help.icons.timer')),
  ];
}

/** The buttons of a level, and the super star. */
function levelIcons(): HTMLElement[] {
  const gauge = rhythmPic();
  gauge.set(0.6);
  return [
    iconLine(round('pause'), t('help.icons.pause')),
    iconLine(roundPic('paw', 'paw', pawRing(2, PAW_MAX)),
      t('help.icons.paw', { n: PAW_STREAK, words: PAW_WORDS })),
    iconLine(levelRing(5, 2), t('help.icons.ring')),
    iconLine(h('div', { class: 'progress' }, h('div', { class: 'progress-fill', style: 'width: 60%' })), t('help.icons.progress')),
    iconLine(gauge.el, t('help.icons.gauge')),
    iconLine(round('help'), t('help.icons.levelHelp')),
    iconLine(round('read'), t('help.icons.read')),
    iconLine(round('keyboardOff'), t('help.icons.guide')),
    iconLine(round('sound'), t('help.icons.sound')),
    iconLine(round('fullscreen'), t('help.icons.fullscreen')),
    iconLine(roundPic('super', 'star'), t('help.icons.super')),
  ];
}

function section(title: string, ...kids: Child[]): HTMLElement {
  return h('section', { class: 'help-section' }, h('h2', {}, title), ...kids);
}

const list = (key: string) => h('ul', {}, ...tList(key).map((l) => h('li', {}, ...richText(l))));

/** A list item of `line` with `{mark}` replaced by `link`. */
function linkedItem(line: string, mark: string, link: () => HTMLElement): HTMLElement {
  const [before, after] = line.split(`{${mark}}`);
  return after === undefined ? h('li', {}, ...richText(line)) : h('li', {}, ...richText(before), link(), ...richText(after));
}

/** The privacy promise; "{install}" is a link that installs the web app, or opens the browser's guide when the browser cannot. */
function privacyList(): HTMLElement {
  return h('ul', {}, ...tList('about.privacy').map((l) => linkedItem(l, 'install', () =>
    h('a', { href: t('about.installHelp'), target: '_blank', rel: 'noopener', onClick: (e: MouseEvent) => { if (installApp()) e.preventDefault(); } }, t('about.install')))));
}

/** The visit count the public counter reports; null when offline or blocked. */
async function visitCount(): Promise<string | null> {
  try {
    const r = await fetch(`${COUNTER}/counter/TOTAL.json`);
    const { count } = await r.json();
    return typeof count === 'string' ? count : null;
  } catch {
    return null;
  }
}

/** The open-data bullet; the visit count joins it once the counter answers (not offline). */
function openData(): HTMLElement {
  const visits = h('span', {});
  void visitCount().then((count) => {
    if (count === null) return;
    const n = Number(count.replace(/\D/g, ''));
    visits.textContent = ` ${t(n === 1 ? 'about.visitsOne' : n > 1 && n < 5 ? 'about.visitsFew' : 'about.visitsMany', { n: count })}`;
  });
  return h('li', {}, t('about.open'), ' ', h('a', { href: `${COUNTER}/`, target: '_blank', rel: 'noopener' }, new URL(COUNTER).host), '.', visits);
}

/** About the game and the privacy promise, for parents. */
function aboutTab(): HTMLElement[] {
  const data = h('ul', {}, ...tList('about.data').map((l) => linkedItem(l, 'readme', () =>
    h('a', { href: 'https://github.com/atiris/tapkotyper#readme', target: '_blank', rel: 'noopener' }, t('about.readme')))));
  data.append(openData());
  return [
    h('p', {}, ...richText(t('about.intro'))),
    section(t('about.privacyTitle'), privacyList()),
    section(t('about.dataTitle'), data),
    section(t('about.howTitle'), list('about.how')),
    section(t('about.creditsTitle'), h('p', {}, t('about.credits')),
      h('div', { class: 'row about-actions' },
        h('a', { class: 'btn', href: 'https://github.com/atiris/tapkotyper', target: '_blank', rel: 'noopener' }, icon('code'), t('about.code')),
        h('a', { class: 'btn', href: 'https://github.com/atiris/tapkotyper/issues/new', target: '_blank', rel: 'noopener' }, icon('edit'), t('about.report')))),
  ];
}

/** A tab's sections; in a level the typing tab starts with what this level asks (`now`). */
function tabContent(tab: HelpTab, now: Child[] = []): HTMLElement[] {
  switch (tab) {
    case 'ui': return [
      section(t('help.mapTitle'), h('ul', { class: 'help-icons' }, ...mapIcons())),
      section(t('help.cardTitle'), list('help.card')),
      section(t('help.levelTitle'), h('ul', { class: 'help-icons' }, ...levelIcons())),
      section(t('help.keysTitle'), list('help.keys')),
    ];
    case 'typing': return [
      ...(now.length ? [section(t('level.helpNow'), ...now)] : []),
      section(t('help.typeTitle'), list('help.type')),
    ];
    case 'progress': return [
      section(t('help.journeyTitle'), list('help.journey')),
      section(t('help.playTitle'), list('help.play')),
      section(t('help.gamesTitle'), list('help.games')),
      section(t('help.progressTitle'), list('help.progress')),
      section(t('help.moreTitle'), list('help.more')),
    ];
    // Who the settings are for and how they open, under their first heading.
    case 'settings': return SETTINGS_TABS.map((s) => section(t(`parent.tab.${s}`),
      s === 'settings' ? h('p', {}, ...richText(t('help.settingsIntro'))) : null, list(`help.settings.${s}`)));
    case 'mentoring': return [
      section(t('help.mentorTitle'), list('help.mentor')),
      section(t('help.taskTitle'), list('help.task')),
    ];
    case 'about': return aboutTab();
  }
}

/**
 * The one help page: the buttons, how to type, how to progress, the settings, mentoring and
 * about the game, in tabs; the bar with Back like the settings' bar (with the tabs as links once
 * they scrolled away), then the tabs in a narrower column.
 */
function helpPage(cls: string, tab: HelpTab, onBack: () => void, onTab: (tab: HelpTab) => void = () => {}, now: Child[] = []): HTMLElement {
  const body = h('div', { class: 'tab-panel prose' });
  const nav = tabBar(TABS.map((x) => [x, t(`help.tab.${x}`)] as const), tab, (x) => {
    body.replaceChildren(...tabContent(x, now));
    body.scrollTop = 0;
    onTab(x);
  });
  const bar = h('header', { class: 'bar' }, button(t('common.back'), onBack, 'btn ghost small', 'back'), h('h1', {}, t('help.title')));
  barTabLinks(bar, nav);
  return h('div', { class: `help-page ${cls}` }, bar, h('div', { class: 'help-column' }, nav, body));
}

/** Escape goes back, like the Back button; a dialog over the help closes first. */
function escapeBack(el: HTMLElement, onBack: () => void): () => void {
  return captureKeys(el, (e) => {
    if (e.key !== 'Escape' || document.querySelector('.modal-back')) return;
    e.preventDefault();
    e.stopPropagation();
    onBack();
  });
}

/**
 * Help as its own screen: Back returns where it was opened from (settings without asking
 * again), else to the map, or to the start page before a player is chosen.
 */
export function helpScreen(root: HTMLElement, params: { tab?: string }): () => void {
  const from = app.helpReturn;
  const back = () => (from ? go(from.name, from.name === 'parent' ? { ...from.params, granted: true } : from.params) : go(app.profile ? 'map' : 'start'));
  const tab = TABS.find((x) => x === params.tab) ?? (app.profile ? 'ui' : 'about');
  const screen = helpPage('screen help-screen', tab, back, (x) => history.replaceState(null, '', routeOf('help', { tab: x })));
  root.append(screen);
  screen.querySelector<HTMLElement>('.bar .btn')!.focus();
  return escapeBack(screen, back);
}

/**
 * Help in a paused level: the same page as the help screen over the whole level (no route
 * change, so the level stays as it was), on how to type with what this level asks first.
 * Back (or Escape) returns to the paused level; open already, it stays.
 */
export function openHelp(host: HTMLElement, onBack: () => void, now: Child[] = []): void {
  if (host.querySelector('.level-help')) return;
  const layer = h('div', { class: 'level-help', role: 'dialog', 'aria-label': t('help.title') });
  const close = () => {
    stop();
    layer.remove();
    onBack();
  };
  layer.append(helpPage('screen', 'typing', close, undefined, now));
  const stop = escapeBack(layer, close);
  host.append(layer);
  layer.querySelector<HTMLElement>('.bar .btn')!.focus();
}
