import { app, go } from '../app/app';
import { imageUrl } from '../gfx/assets';
import { STORIES, type StoryDef, WORLDS, activityOf, aimOpen, isLevelUnlocked, journeyId, journeyOpen, worldLevels } from '../game/levels';
import { compassElement } from '../gfx/compass';
import { worldThing } from '../game/modes/aim-things';
import { t } from '../i18n/i18n';
import type { Profile } from '../storage/schema';
import { barChart, lineChart } from '../ui/charts';
import { cornerControls, starRow } from '../ui/chrome';
import { crown } from '../ui/crown';
import { button, h, icon } from '../ui/dom';
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

/** A cell's picture as a button that opens what it shows; disabled while that is still closed. */
function cellButton(pic: string | null, say: string, open: boolean, play: () => void): HTMLButtonElement {
  return h('button', { class: 'cell-act', type: 'button', disabled: !open, 'aria-label': say, tip: say, onClick: play },
    pic ? h('img', { src: pic, alt: '' }) : icon('play'));
}

/**
 * One world's cells: its levels by their game's picture (the last one the great challenge) with
 * the stars, then its parrot (its head while at home, else the empty perch) and its target range
 * with the rare thing, in color once found, grey until then. A picture opens what it shows.
 */
function worldCells(p: Profile, w: number): HTMLElement[] {
  const levels = worldLevels(w).map((l) => {
    const act = activityOf(l);
    const say = l.isSuper ? `${t('map.act.super')}: ${t(`map.act.${act}`)}` : `${l.index + 1}. ${t(`map.act.${act}`)}`;
    const cell = cellButton(imageUrl(`ui-act-${act}`), say, isLevelUnlocked(p, l), () => go('level', { id: l.id }));
    const mark = l.isSuper && crown('cell-crown');
    if (mark) cell.append(mark);
    return h('div', { class: 'level-cell' },
      cell,
      starRow(p.progress.levels[l.id] ?? 0, 'stars cell-stars'));
  });
  const open = aimOpen(p, w);
  const home = p.progress.parrots.includes(w);
  const parrot = h('div', { class: 'level-cell' },
    cellButton(imageUrl(home ? 'ui-act-parrot-head' : 'obj-parrot-perch-short'), t(home ? 'progress.parrotHome' : 'progress.parrotAway'), open, () => go('level', { id: 'parrot', world: w })));
  const th = worldThing(w);
  const found = !!th && p.progress.rangeFinds.includes(th.id);
  const rareSay = found ? t('progress.rareFound', { name: t(`aim.things.${th!.id}.name`) }) : t('progress.rareWaiting');
  const rarePic = th && imageUrl(th.pics[0]);
  const rare = rarePic ? h('span', { class: `cell-rare ${found ? 'found' : 'waiting'}`, role: 'img', 'aria-label': rareSay }, h('img', { src: rarePic, alt: '' })) : null;
  if (rare) tip(rare, rareSay);
  const range = h('div', { class: 'level-cell' },
    cellButton(imageUrl('obj-aim-target'), t('aim.title'), open, () => go('level', { id: 'aim', world: w })), rare);
  return [...levels, parrot, range];
}

/** The story's hero's journey after its last world: the compass, which opens it, and its stars. */
function journeyRow(p: Profile, story: StoryDef): HTMLElement {
  const open = journeyOpen(p, story);
  const say = t('journey.title');
  const cell = h('div', { class: 'level-cell' },
    h('button', { class: 'cell-act', type: 'button', disabled: !open, 'aria-label': say, tip: say, onClick: () => go('level', { id: 'journey', story: story.id }) }, compassElement('')),
    starRow(p.progress.levels[journeyId(story)] ?? 0, 'stars cell-stars'));
  return h('div', { class: 'world-levels journey-levels' }, h('h4', {}, say), h('div', { class: 'level-grid' }, cell));
}

/** The levels of each story under its picture and title, one row of cells per world, then its hero's journey. */
function storyLevels(p: Profile): HTMLElement {
  return h('div', {}, ...STORIES.map((story) => {
    const pic = storyPicture(story);
    return h('section', { class: 'story-levels' },
      h('h3', { class: 'story-head' }, pic ? h('img', { class: 'story-pic', src: pic, alt: '' }) : null, t(story.title)),
      ...story.worlds.map((w) => h('div', { class: 'world-levels' },
        h('h4', {}, t(`worlds.${WORLDS[w]}`)),
        h('div', { class: 'level-grid' }, ...worldCells(p, w)))),
      journeyRow(p, story));
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
