import { app, go } from '../app/app';
import { imageUrl } from '../gfx/assets';
import { STORIES, WORLDS, worldLevels } from '../game/levels';
import { worldThing } from '../game/modes/aim-things';
import { t } from '../i18n/i18n';
import type { Profile } from '../storage/schema';
import { barChart, lineChart } from '../ui/charts';
import { cornerControls, starRow } from '../ui/chrome';
import { button, h } from '../ui/dom';
import { badgeShow } from '../ui/badge-show';
import { barTabLinks, tabBar } from '../ui/tabs';
import { tip } from '../ui/tooltip';
import { onTypedWord } from '../ui/typed-word';
import { exercisesTab, keysTab, progressTab, storyPicture } from './stats';

const TABS = ['progress', 'keys', 'levels', 'exercises'] as const;
type Tab = (typeof TABS)[number];

/** The trends over the last sessions: accuracy, rhythm and time per day. */
function trendCharts(p: Profile): HTMLElement {
  const sessions = p.stats.sessions.slice(-14);
  const labels = sessions.map((s) => s.date.slice(5));
  return h('div', { class: 'chart-grid' },
    h('section', {}, h('h3', {}, t('parent.accuracyTrend')),
      lineChart(sessions.map((s) => Math.round((s.chars / Math.max(1, s.chars + s.errors)) * 100)), labels, '%', '#3f8fd6')),
    h('section', {}, h('h3', {}, t('parent.rhythmTrend')),
      lineChart(sessions.map((s) => s.cpm), labels, t('parent.cpm'), '#e08a3c')),
    h('section', {}, h('h3', {}, t('parent.timePerDay')),
      barChart(sessions.map((s) => Math.round(s.seconds / 60)), labels, 'min')));
}

/** What a world gave besides stars, beside its name: its parrot at home and its rare range thing, in color once won, grey until then. */
function worldExtras(p: Profile, w: number): HTMLElement {
  const th = worldThing(w);
  const mark = (pic: string | null, has: boolean, say: string): HTMLElement => {
    const el = h('span', { class: `world-extra ${has ? 'found' : 'waiting'}`, role: 'img', 'aria-label': say }, pic ? h('img', { src: pic, alt: '' }) : null);
    tip(el, say);
    return el;
  };
  const parrot = p.progress.parrots.includes(w);
  const found = !!th && p.progress.rangeFinds.includes(th.id);
  return h('span', { class: 'world-extras' },
    mark(imageUrl('ui-act-parrot-head'), parrot, t(parrot ? 'progress.parrotHome' : 'progress.parrotAway')),
    th ? mark(imageUrl(th.pics[0]), found, found ? t('progress.rareFound', { name: t(`aim.things.${th.id}.name`) }) : t('progress.rareWaiting')) : null);
}

/** The levels of each story under its picture and title, one row of level cells per world. */
function storyLevels(p: Profile): HTMLElement {
  return h('div', {}, ...STORIES.map((story) => {
    const pic = storyPicture(story);
    return h('section', { class: 'story-levels' },
      h('h3', { class: 'story-head' }, pic ? h('img', { class: 'story-pic', src: pic, alt: '' }) : null, t(story.title)),
      ...story.worlds.map((w) => h('div', { class: 'world-levels' },
        h('h4', {}, t(`worlds.${WORLDS[w]}`), worldExtras(p, w)),
        h('div', { class: 'level-grid' }, ...worldLevels(w).map((l) => h('div', { class: 'level-cell' },
          h('span', { class: 'level-name' }, l.isSuper ? t('map.super') : String(l.index + 1)), starRow(p.progress.levels[l.id] ?? 0, 'stars cell-stars')))))));
  }));
}

/** The secret words of the page: every longer word of the story titles and of the badges' heading. */
function showWords(): string[] {
  return [...STORIES.map((s) => t(s.title)), t('progress.badges')].flatMap((s) => s.split(/\s+/)).filter((w) => w.length >= 4);
}

/** "My progress" as a page of its own, opened from the map: progress, keys with the trends, levels and exercises; one of its words typed brings the badge show. */
export function progressScreen(root: HTMLElement): () => void {
  const p = app.profile!;
  const body = h('div', { class: 'tab-panel stats-body' });
  const nav = tabBar(TABS.map((tab) => [tab, t(`progress.tab${tab[0].toUpperCase()}${tab.slice(1)}`)] as const), 'progress', (tab: Tab) => body.replaceChildren(
    tab === 'progress' ? progressTab(p, false)
      : tab === 'keys' ? h('div', {}, keysTab(p, () => {}), trendCharts(p))
        : tab === 'levels' ? storyLevels(p) : exercisesTab(p)));
  const bar = h('header', { class: 'bar' }, button(t('common.back'), () => go('map'), 'btn ghost small', 'back'), h('h1', {}, t('progress.title')));
  barTabLinks(bar, nav);
  root.append(h('div', { class: 'screen progress-screen' }, bar, cornerControls(), nav, body));
  return onTypedWord(showWords(), badgeShow);
}
