import { app, go } from '../app/app';
import { STORIES } from '../game/levels';
import { t } from '../i18n/i18n';
import type { Profile } from '../storage/schema';
import { barChart, lineChart } from '../ui/charts';
import { cornerControls } from '../ui/chrome';
import { button, h } from '../ui/dom';
import { badgeShow } from '../ui/badge-show';
import { barTabLinks, tabBar } from '../ui/tabs';
import { onTypedWord } from '../ui/typed-word';
import { keysTab, progressTab } from './stats';

const TABS = ['progress', 'keys'] as const;
type Tab = (typeof TABS)[number];

/** The trends over the last sessions: accuracy, speed and time per day. */
function trendCharts(p: Profile): HTMLElement {
  const sessions = p.stats.sessions.slice(-14);
  const labels = sessions.map((s) => s.date.slice(5));
  return h('div', { class: 'chart-grid' },
    h('section', {}, h('h3', {}, t('parent.accuracyTrend')),
      lineChart(sessions.map((s) => Math.round((s.chars / Math.max(1, s.chars + s.errors)) * 100)), labels, '%', '#3f8fd6')),
    h('section', {}, h('h3', {}, t('parent.speedTrend')),
      lineChart(sessions.map((s) => s.cpm), labels, t('parent.cpm'), '#e08a3c')),
    h('section', {}, h('h3', {}, t('parent.timePerDay')),
      barChart(sessions.map((s) => Math.round(s.seconds / 60)), labels, 'min')));
}

/** The secret words of the page: every longer word of the story titles and of the badges' heading. */
function showWords(): string[] {
  return [...STORIES.map((s) => t(s.title)), t('progress.badges')].flatMap((s) => s.split(/\s+/)).filter((w) => w.length >= 4);
}

/** "My progress" as a page of its own, opened from the map: progress, and keys with the trends; one of its words typed brings the badge show. */
export function progressScreen(root: HTMLElement): () => void {
  const p = app.profile!;
  const body = h('div', { class: 'tab-panel stats-body' });
  const nav = tabBar(TABS.map((tab) => [tab, t(`progress.tab${tab[0].toUpperCase()}${tab.slice(1)}`)] as const), 'progress', (tab: Tab) => body.replaceChildren(
    tab === 'progress' ? progressTab(p, false) : h('div', {}, keysTab(p, () => {}), trendCharts(p))));
  const bar = h('header', { class: 'bar' }, button(t('common.back'), () => go('map'), 'btn ghost small', 'back'), h('h1', {}, t('progress.title')));
  barTabLinks(bar, nav);
  root.append(h('div', { class: 'screen progress-screen' }, bar, cornerControls(), nav, body));
  return onTypedWord(showWords(), badgeShow);
}
