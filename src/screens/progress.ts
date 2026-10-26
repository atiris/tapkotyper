import { app, go } from '../app/app';
import { STORIES, WORLDS, worldLevels } from '../game/levels';
import { t } from '../i18n/i18n';
import type { Profile } from '../storage/schema';
import { barChart, lineChart } from '../ui/charts';
import { cornerControls, starRow } from '../ui/chrome';
import { button, h } from '../ui/dom';
import { barTabLinks, tabBar } from '../ui/tabs';
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

/** The levels of each story under its picture and title, one row of level cells per world. */
function storyLevels(p: Profile): HTMLElement {
  return h('div', {}, ...STORIES.map((story) => {
    const pic = storyPicture(story);
    return h('section', { class: 'story-levels' },
      h('h3', { class: 'story-head' }, pic ? h('img', { class: 'story-pic', src: pic, alt: '' }) : null, t(story.title)),
      ...story.worlds.map((w) => h('div', { class: 'world-levels' },
        h('h4', {}, t(`worlds.${WORLDS[w]}`)),
        h('div', { class: 'level-grid' }, ...worldLevels(w).map((l) => h('div', { class: 'level-cell' },
          h('span', { class: 'level-name' }, l.isSuper ? t('map.super') : String(l.index + 1)), starRow(p.progress.levels[l.id] ?? 0, 'stars cell-stars')))))));
  }));
}

/** "My progress" as a page of its own, opened from the map: progress, keys with the trends, levels and exercises. */
export function progressScreen(root: HTMLElement): void {
  const p = app.profile!;
  const body = h('div', { class: 'tab-panel stats-body' });
  const nav = tabBar(TABS.map((tab) => [tab, t(`progress.tab${tab[0].toUpperCase()}${tab.slice(1)}`)] as const), 'progress', (tab: Tab) => body.replaceChildren(
    tab === 'progress' ? progressTab(p, false)
      : tab === 'keys' ? h('div', {}, keysTab(p, () => {}), trendCharts(p))
        : tab === 'levels' ? storyLevels(p) : exercisesTab(p)));
  const bar = h('header', { class: 'bar' }, button(t('common.back'), () => go('map'), 'btn ghost small', 'back'), h('h1', {}, t('progress.title')));
  barTabLinks(bar, nav);
  root.append(h('div', { class: 'screen progress-screen' }, bar, cornerControls(), nav, body));
}
