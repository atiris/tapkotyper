import { app, go, layout, reduceMotion } from '../app/app';
import { imageUrl } from '../gfx/assets';
import { type Mood, otherMood, renderTapkoInto, tapkoElement } from '../gfx/tapko';
import { STORIES, type StoryDef, WORLDS, storyDone, storyOpen } from '../game/levels';
import { MAX_CHEST, MAX_STARS, badgeTier, chestPoints, totalStars, worldStars } from '../game/rewards';
import { locale, t } from '../i18n/i18n';
import { allKeys } from '../keyboard/layouts';
import { activeKeys, lessonKeyOf } from '../learning/lessons';
import { STATS_WINDOW, keyHistory, keyReport, lastTraining, masterySummary, recentTyping, weakKeys } from '../learning/stats';
import { linkOf } from '../share/codec';
import { makeOverallResult, makeResult, resultCode } from '../share/result';
import type { Profile } from '../storage/schema';
import { nickname } from '../storage/store';
import { lineChart } from '../ui/charts';
import { KeyboardGuide, fingerChip, keyLabel } from '../ui/keyboard-guide';
import { button, h, modal } from '../ui/dom';
import { tabBar } from '../ui/tabs';
import { bigCode } from '../ui/big-code';
import { badge } from '../ui/badge';
import { aroPerch } from '../ui/aro';
import { hasParrotBadge } from '../game/parrots';
import { medal } from '../ui/medal';
import { rangeFinds } from '../ui/finds';
import { openCertificate } from './certificate';

/**
 * Map key code -> the key it measures: letters by their unshifted char (capitals count
 * there too), Shifts by side, space. `shifted`: a key's shifted symbol (`?`, a Slovak
 * digit) instead of its base.
 */
export function keyForCode(code: string, shifted = false): string | null {
  const def = allKeys(layout()).find((d) => d.code === code);
  if (!def) return null;
  const base = lessonKeyOf(def);
  const symbol = shifted && base && [...def.shift].length === 1 && def.shift !== base.toUpperCase();
  return symbol ? def.shift : base;
}

export function heatScores(shifted = false): Record<string, number | null> {
  const p = app.profile!;
  const scores: Record<string, number | null> = {};
  for (const def of allKeys(layout())) {
    const key = keyForCode(def.code, shifted);
    if (!key) continue;
    const r = keyReport(p, key);
    scores[key] = r && r.window >= 3 ? r.score : null;
  }
  return scores;
}

/**
 * How one key goes: the last presses only (old habits fade out), what it is
 * mistaken for, and its days over time.
 */
export function keyDetail(p: Profile, key: string, practice?: () => void): HTMLElement {
  const r = keyReport(p, key);
  const head = h('div', { class: 'key-detail-head' }, h('span', { class: `big-key small ${keyLabel(key) !== key ? 'named' : ''}` }, keyLabel(key)),
    h('p', {}, t('stats.fingerLine'), ' ', fingerChip(layout(), key)));
  if (!r) return h('div', { class: 'key-detail' }, head, h('p', { class: 'hint' }, t('stats.keyNoData')));
  const days = keyHistory(p, key).slice(-14);
  const labels = days.map((d) => d.date.slice(5));
  return h('div', { class: 'key-detail' },
    head,
    h('ul', { class: 'key-facts' },
      h('li', {}, t('stats.keyAccuracy', { n: r.window, acc: Math.round(r.accuracy * 100) })),
      r.avgMs ? h('li', {}, t('stats.keySpeed', { s: (r.avgMs / 1000).toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })) : null,
      h('li', {}, t('stats.keyTotal', { n: r.presses })),
      h('li', {}, r.confusions.length
        ? [t('stats.keyConfused'), ' ', ...r.confusions.slice(0, 3).flatMap((c) => [h('b', { class: 'kbd' }, c.ch), ` ${c.n}× `])]
        : t('stats.keyNoConfusion'))),
    days.length > 1 ? h('div', { class: 'key-charts' },
      h('div', {}, h('h4', {}, t('stats.keyAccuracyTrend')), lineChart(days.map((d) => Math.round(d.accuracy * 100)), labels, '%', '#3f8fd6')),
      h('div', {}, h('h4', {}, t('stats.keySpeedTrend')), lineChart(days.map((d) => Math.round(d.avgMs) / 1000), labels, 's', '#e08a3c')))
      : h('p', { class: 'hint' }, t('stats.keyHistorySoon')),
    practice ? button(t('stats.practiceKey', { key: keyLabel(key) }), practice, 'btn primary', 'practice') : null);
}

/**
 * Heat map keyboard whose keys open their detail in `detail`, with a switch between
 * the keys' base characters and their shifted symbols.
 */
export function clickableHeatmap(p: Profile, detail: HTMLElement, practice?: (key: string) => void): HTMLElement {
  const kb = new KeyboardGuide(layout());
  let shifted = false;
  kb.el.classList.add('heatmap', 'clickable');
  const paint = () => {
    kb.el.classList.toggle('shifted', shifted);
    kb.el.querySelectorAll('.selected').forEach((k) => k.classList.remove('selected'));
    kb.heat(heatScores(shifted), (code) => keyForCode(code, shifted));
  };
  kb.onKeyClick((code, el) => {
    const key = keyForCode(code, shifted);
    if (!key) return;
    kb.el.querySelectorAll('.selected').forEach((k) => k.classList.remove('selected'));
    el.classList.add('selected');
    detail.replaceChildren(keyDetail(p, key, practice && (() => practice(key))));
  });
  const toggle = h('button', { class: 'chip shift-toggle', type: 'button', 'aria-pressed': 'false', onClick: () => {
    shifted = !shifted;
    toggle.classList.toggle('on', shifted);
    toggle.setAttribute('aria-pressed', String(shifted));
    paint();
  } }, t('stats.shifted'));
  paint();
  return h('div', { class: 'heat-host' }, toggle, kb.el);
}

/** An icon (or a glyph) with a number; the meaning is in the tooltip and the aria-label only. */
function chip(pic: string | null, glyph: string, text: string, label: string): HTMLElement {
  return h('li', { class: 'sum-chip', tip: label, 'aria-label': label, role: 'img' },
    pic ? h('img', { src: pic, alt: '' }) : h('span', { class: 'sum-glyph' }, glyph), h('b', {}, text));
}

/** The long-term picture in one row (mastered keys, finished stories and worlds, the chest's points, the parrots at home against their best count, the best stars of all levels), the last 14 days in the next (accuracy, speed, letters). */
export function summaryRow(p: Profile): HTMLElement {
  const m = masterySummary(p);
  const stories = STORIES.filter((x) => storyDone(p, x)).length;
  const recent = recentTyping(p, 14);
  const percent = Math.round(recent.accuracy * 100);
  const chest = chestPoints(p), stars = totalStars(p);
  const parrots = { n: p.progress.parrots.length, best: p.progress.parrotBest };
  return h('div', { class: 'progress-sums' }, h('ul', { class: 'progress-sum' },
    chip(imageUrl('ui-key'), '⌨', `${m.mastered}/${m.total}`, t('progress.keys', { n: m.mastered, total: m.total })),
    chip(imageUrl('ui-level'), '▲', `${stories}/${STORIES.length}`, t('progress.stories', { n: stories, total: STORIES.length })),
    chip(imageUrl('ui-earth'), '●', `${p.progress.worldsDone.length}/${WORLDS.length}`, t('progress.worlds', { n: p.progress.worldsDone.length, total: WORLDS.length })),
    chip(imageUrl('ui-chest'), '◆', `${chest}/${MAX_CHEST}`, t('progress.chest', { n: chest, total: MAX_CHEST })),
    parrots.best ? chip(imageUrl('ui-act-parrot-head'), 'P', t('progress.parrotCount', parrots), t('progress.parrots', parrots)) : null,
    chip(imageUrl('ui-star'), '★', `${stars}/${MAX_STARS}`, t('progress.stars', { n: stars, total: MAX_STARS }))),
  h('ul', { class: 'progress-sum' },
    recent.chars ? chip(imageUrl('ui-accuracy'), '✓', `${percent} %`, t('progress.quality', { n: percent })) : null,
    recent.cpm ? chip(imageUrl('ui-typing-speed'), '»', String(recent.cpm), t('progress.speed', { n: recent.cpm })) : null,
    chip(imageUrl('ui-keys-typed'), 'Aa', String(recent.chars), t('progress.chars14', { n: recent.chars }))));
}

/** Who a story is about, for its row. */
export function storyPicture(story: StoryDef): string | null {
  return imageUrl(story.id === 'robot' ? 'robot-happy' : story.id === 'fairy' ? 'fairy-happy' : 'obj-dragon-hatched');
}

/** One row per story: its picture and name, its worlds (done in colour), and its stars. */
function storyRow(p: Profile, story: StoryDef): HTMLElement {
  const star = imageUrl('ui-star');
  const stars = story.worlds.reduce((a, w) => a + worldStars(p, w), 0);
  const pic = storyPicture(story);
  return h('div', { class: `progress-story ${storyOpen(p, story) ? '' : 'closed'}` },
    h('div', { class: 'story-head' }, pic ? h('img', { class: 'story-pic', src: pic, alt: '' }) : null, h('h4', {}, t(story.title))),
    h('div', { class: 'world-icons' }, ...story.worlds.map((w) => {
      const src = imageUrl(`ui-map-${WORLDS[w]}`);
      const on = p.progress.worldsDone.includes(w);
      const name = t(`worlds.${WORLDS[w]}`);
      return src ? h('img', { class: on ? 'done' : '', src, alt: '', tip: name }) : h('span', { class: `world-dot ${on ? 'done' : ''}`, tip: name });
    })),
    h('p', { class: 'story-stars', tip: t('progress.storyStars', { n: stars }), 'aria-label': t('progress.storyStars', { n: stars }) },
      h('b', {}, String(stars)), star ? h('img', { src: star, alt: '' }) : '★'));
}

/** The summary row, a row per story, the badge shelf and the range awards, and when the child last trained. */
function progressSection(p: Profile): HTMLElement {
  const { daysAgo, weekMinutes } = lastTraining(p);
  const last = daysAgo === null ? t('progress.never') : daysAgo === 0 ? t('progress.lastToday') : daysAgo === 1 ? t('progress.lastYesterday') : t('progress.lastDays', { n: daysAgo });
  return h('section', { class: 'progress-view' },
    summaryRow(p),
    ...STORIES.map((s) => storyRow(p, s)),
    h('div', { class: 'badge-shelf' }, h('h4', {}, t('progress.badges')),
      h('div', { class: 'badge-row' }, ...WORLDS.map((_, w) => badge(w, badgeTier(p, w), true)))),
    h('div', { class: 'badge-shelf' }, h('h4', {}, t('progress.rangeAwards')), rangeFinds(p)),
    h('p', { class: 'progress-last' }, last, daysAgo === null ? null : [' ', t('progress.week', { n: weekMinutes })]));
}

type StatsTab = 'progress' | 'keys' | 'exercises';

/** The QR code of all the player's statistics, over the whole screen. */
export async function showOverallCode(p: Profile): Promise<void> {
  const link = linkOf('result', await resultCode(makeOverallResult(p, t('progress.overallTitle'), app.store.data.lockRemovedAt !== undefined)));
  bigCode(link, nickname(p), t('progress.overallCaption'), 'overall');
}

/** Milliseconds between the character's changes of smile on My progress, at least and at most. */
const SMILE_MS = [5000, 20000];

/**
 * The child's own character, big, in its outfit: now and then (every 5-20 s) its big smile turns
 * into the usual one and back. A click pulls another face at once (surprise too, never the same
 * twice in a row), now and then with a hop; the smiles go on from there.
 */
function playfulTapko(p: Profile): HTMLElement {
  const fig = tapkoElement(p.companion, 'happy', 210);
  let mood: Mood = 'happy';
  let timer = 0;
  const show = (m: Mood) => renderTapkoInto(fig, p.companion, mood = m);
  const smile = () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (!fig.isConnected) return;
      show(mood === 'happy' ? 'idle' : 'happy');
      smile();
    }, SMILE_MS[0] + Math.random() * (SMILE_MS[1] - SMILE_MS[0]));
  };
  smile();
  fig.addEventListener('animationend', () => fig.classList.remove('jump'));
  return h('button', { class: 'stats-tapko', type: 'button', 'aria-label': `${p.companion.name}: ${t('wardrobe.tickle')}`, onClick: () => {
    show(otherMood(p.companion.kind, mood));
    if (!reduceMotion() && Math.random() < 0.5) {
      fig.classList.remove('jump');
      void fig.offsetWidth;
      fig.classList.add('jump');
    }
    smile();
  } }, fig);
}

/** Progress: the summary rows and badges, the growth medals, the code of all statistics and the certificate; `title` off where the page already says it. */
export function progressTab(p: Profile, title = true): HTMLElement {
  return h('div', {},
    h('div', { class: 'stats-head' }, h('div', { class: 'stats-hero' }, playfulTapko(p), hasParrotBadge(p) ? aroPerch(true, (aro) => aro.hop())?.el ?? null : null),
      h('div', {}, title ? h('h2', {}, t('progress.title')) : null, progressSection(p))),
    p.progress.growth ? h('div', { class: 'medals' }, h('h3', {}, t('stats.medals')), h('p', { class: 'hint' }, t('stats.medalsHint')),
      h('div', { class: 'medal-row' }, ...Array.from({ length: p.progress.growth }, (_, i) => medal(i + 1, true)))) : null,
    h('div', { class: 'row stats-code' }, button(t('progress.showCode'), () => void showOverallCode(p), 'btn', 'code'),
      button(t('cert.button'), () => openCertificate(p), 'btn', 'print')));
}

/** The keyboard heat map, the keys to practice and the details of one key. */
export function keysTab(p: Profile, close: () => void): HTMLElement {
  const practice = (keys: string[]) => { close(); go('level', { id: 'practice', keys, seconds: 60 }); };
  const detail = h('div', { class: 'key-detail-host' }, h('p', { class: 'hint' }, t('stats.clickKey')));
  const heat = clickableHeatmap(p, detail, (key) => practice([key]));
  const showKey = (key: string) => detail.replaceChildren(keyDetail(p, key, () => practice([key])));
  const weak = weakKeys(p, activeKeys(p));
  const total = Object.values(p.stats.keys).reduce((a, s) => a + s.presses, 0);
  return h('div', {},
    h('h3', {}, t('stats.title')),
    h('p', {}, total ? t('stats.intro', { n: STATS_WINDOW }) : t('stats.empty')),
    heat,
    h('p', { class: 'legend' },
      h('span', { class: 'lg heat-good' }, `✓ ${t('stats.good')}`),
      h('span', { class: 'lg heat-ok' }, `~ ${t('stats.ok')}`),
      h('span', { class: 'lg heat-practice' }, `! ${t('stats.practice')}`)),
    h('div', { class: 'stats-split' },
      weak.length ? h('div', { class: 'weak' },
        h('h3', {}, t('stats.practiceKeys')),
        h('ul', {}, ...weak.map((r) => h('li', {},
          h('button', { class: 'kbd key-link', type: 'button', onClick: () => showKey(r.key) }, keyLabel(r.key)),
          ' ', t('stats.keyLine', { acc: Math.round(r.accuracy * 100) }), ' ', fingerChip(layout(), r.key),
          r.confusions[0] ? h('small', {}, ` ${t('stats.instead', { key: r.confusions[0].ch })}`) : null))),
        button(t('stats.practiceNow'), () => practice(weak.map((w) => w.key)), 'btn primary', 'practice'))
        : null,
      detail));
}

/** The exercises given by a teacher or parent, newest first, each with the code of its result. */
export function exercisesTab(p: Profile): HTMLElement {
  const played = p.tasks.filter((x) => x.seconds > 0 || x.doneAt);
  if (!played.length) return h('p', { class: 'hint center' }, t('progress.exercisesEmpty'));
  return h('ul', { class: 'exercise-list' }, ...played.map((task) => {
    const total = task.chars + task.errors;
    const show = async () => bigCode(linkOf('result', await resultCode(makeResult(p, task, app.store.data.lockRemovedAt !== undefined))), nickname(p), t('progress.exerciseCaption', { title: task.title || t('task.untitled') }), 'exercise');
    return h('li', { class: `exercise ${task.doneAt ? 'done' : ''}` },
      h('div', {},
        h('b', {}, task.title || t('task.untitled')), task.group ? h('span', { class: 'chip' }, task.group) : null,
        h('p', { class: 'hint' }, task.doneAt ?? t('progress.exerciseOpen'), ' · ',
          t('progress.exerciseLine', { min: Math.round(task.seconds / 6) / 10, acc: total ? Math.round((task.chars / total) * 100) : 100, cpm: task.cpm }))),
      button(t('progress.exerciseCode'), () => void show(), 'btn small', 'code'));
  }));
}

/** The child's quick look at the progress (click on the character), in tabs: progress, keys, exercises; the map's button opens the whole page. */
export function openStats(): void {
  const p = app.profile!;
  let close = () => {};
  const tabs: [StatsTab, string][] = [['progress', t('progress.tabProgress')], ['keys', t('progress.tabKeys')], ['exercises', t('progress.tabExercises')]];
  const body = h('div', { class: 'stats-body' });
  const nav = tabBar(tabs, 'progress', (tab) => body.replaceChildren(tab === 'progress' ? progressTab(p) : tab === 'keys' ? keysTab(p, close) : exercisesTab(p)));
  close = modal(h('div', { class: 'stats' }, nav, body), { cls: 'stats-modal' });
}
