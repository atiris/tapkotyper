import { app, go, layout, reduceMotion, routeOf } from '../app/app';
import { hasClef } from '../game/rhythm-notes';
import { imageUrl } from '../gfx/assets';
import { type Mood, otherMood, renderTapkoInto, tapkoElement } from '../gfx/tapko';
import { DRILL_SECONDS, STORIES, type StoryDef, WORLDS, storyDone, storyOpen, worldName } from '../game/levels';
import { MAX_CHEST, LEVEL_STARS, badgeTier, chestPoints, totalStars, worldStars } from '../game/rewards';
import { locale, t, tn } from '../i18n/i18n';
import { allKeys } from '../keyboard/layouts';
import { STATS_WINDOW, activeKeys, lessonKeyOf } from '../learning/lessons';
import { agoOf, keyHistory, keyReport, keyboardSummary, lastTraining, masterySummary, recentPractice, recentTyping, weakKeys } from '../learning/stats';
import { linkOf } from '../share/codec';
import { makeOverallResult, resultCode } from '../share/result';
import type { Profile, RhythmNote } from '../storage/schema';
import { nickname } from '../storage/store';
import { lineChart } from '../ui/charts';
import { HEAT_BANDS, KeyboardGuide, fingerChip, keyCap, keyLabel } from '../ui/keyboard-guide';
import { button, h, icon, modal } from '../ui/dom';
import { tip } from '../ui/tooltip';
import { tabBar } from '../ui/tabs';
import { bigCode } from '../ui/big-code';
import { badge } from '../ui/badge';
import { aroPerch } from '../ui/aro';
import { hasParrotBadge } from '../game/parrots';
import { rangeFinds } from '../ui/finds';
import { type NoteLook, noteLook, notePic } from '../ui/notes';
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

export function heatAccuracy(shifted = false): Record<string, number | null> {
  const p = app.profile!;
  const scores: Record<string, number | null> = {};
  for (const def of allKeys(layout())) {
    const key = keyForCode(def.code, shifted);
    if (!key) continue;
    const r = keyReport(p, key);
    scores[key] = r && r.window >= 3 ? r.accuracy : null;
  }
  return scores;
}

/** A key as a link to its statistics on My progress's keys tab. */
export function keyStatsCap(key: string): HTMLElement {
  const params = { tab: 'keys', key };
  return keyCap(layout(), key, () => go('progress', params), routeOf('progress', params));
}

/**
 * How one key goes: the last presses only (old habits fade out), what it is
 * mistaken for (each such key opens its own detail by `open`), and its days over time.
 */
export function keyDetail(p: Profile, key: string, open: (key: string) => void, practice?: (key: string) => void): HTMLElement {
  const r = keyReport(p, key);
  const head = h('div', { class: 'key-detail-head' }, h('span', { class: `big-key small ${keyLabel(key) !== key ? 'named' : ''}` }, keyLabel(key)),
    h('p', {}, t('stats.fingerLine'), ' ', fingerChip(layout(), key)));
  if (!r) return h('div', { class: 'key-detail' }, head, h('p', { class: 'hint' }, t('stats.keyNoData')));
  const days = keyHistory(p, key).slice(-14);
  const labels = days.map((d) => d.date.slice(5));
  const drill = practice ? button(t('stats.drillKey'), () => practice(key), 'btn primary', 'practice') : null;
  if (drill) tip(drill, t('stats.drillKeyTip', { key: keyLabel(key) }));
  const el = h('div', { class: 'key-detail' },
    head,
    h('ul', { class: 'key-facts' },
      h('li', {}, t('stats.keyAccuracy', { n: r.window, acc: Math.round(r.accuracy * 100) })),
      r.avgMs ? h('li', {}, t('stats.keySpeed', { s: (r.avgMs / 1000).toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })) : null,
      h('li', {}, t('stats.keyTotal', { n: r.presses })),
      h('li', {}, r.confusions.length
        ? [t('stats.keyConfused'), ' ', ...r.confusions.slice(0, 3).flatMap((c) => [keyCap(layout(), c.ch, () => open(c.ch)), ` ${c.n}× `])]
        : t('stats.keyNoConfusion'))),
    days.length > 1 ? h('div', { class: 'key-charts' },
      h('div', {}, h('h4', {}, t('stats.keyAccuracyTrend')), lineChart(days.map((d) => Math.round(d.accuracy * 100)), labels, '%', '#3f8fd6')),
      h('div', {}, h('h4', {}, t('stats.keySpeedTrend')), lineChart(days.map((d) => Math.round(d.avgMs) / 1000), labels, 's', '#e08a3c')))
      : h('p', { class: 'hint' }, t('stats.keyHistorySoon')),
    drill);
  return el;
}

/** The whole keyboard in the detail panel: the keys' mean accuracy, their usual speed and how many keys count; the hint to tap a key under it. */
export function wholeKeyboard(p: Profile): HTMLElement {
  const s = keyboardSummary(p);
  return h('div', { class: 'key-detail whole-keyboard' },
    h('h4', {}, t('stats.whole')),
    s.keys ? h('ul', { class: 'key-facts' },
      h('li', {}, t('stats.wholeAccuracy', { acc: Math.round(s.accuracy * 100) })),
      s.cpm ? h('li', {}, t('stats.wholeSpeed', { letters: tn('end.letters', s.cpm) })) : null,
      h('li', {}, tn('stats.wholeKeys', s.keys))) : null,
    h('p', { class: 'hint' }, t('stats.clickKey')));
}

/**
 * Heat map keyboard whose keys are picked by `pick`; `select` marks a key (latching the Shift symbols for a
 * shifted one), null marks none. Under the left Shift a key that latches the shifted symbols instead of the keys'
 * base characters, under the right one a key with a keyboard that releases them and picks the whole keyboard (null).
 */
function clickableHeatmap(pick: (key: string | null) => void): { el: HTMLElement; select: (key: string | null) => void } {
  const kb = new KeyboardGuide(layout());
  let shifted = false;
  kb.el.classList.add('heatmap', 'clickable');
  const unselect = () => kb.el.querySelectorAll('.selected').forEach((k) => k.classList.remove('selected'));
  const paint = () => {
    kb.el.classList.toggle('shifted', shifted);
    unselect();
    kb.heat(heatAccuracy(shifted), (code) => keyForCode(code, shifted));
  };
  kb.onKeyClick((code) => {
    const key = keyForCode(code, shifted);
    if (key) pick(key);
  });
  const toggle = kb.toolKey('ShiftLeft', t('stats.shifted'), t('stats.shiftedTip'), (on) => {
    shifted = on;
    paint();
  }, true);
  // Everything back to the start: the Shift symbols released too.
  const whole = kb.toolKey('ShiftRight', icon('keyboard'), t('stats.wholeTip'), () => pick(null));
  kb.bottomSlots(toggle, whole);
  paint();
  const codeOf = (key: string, shift: boolean) => allKeys(layout()).find((d) => keyForCode(d.code, shift) === key)?.code;
  const select = (key: string | null) => {
    const code = key ? codeOf(key, shifted) : undefined;
    const other = key && !code ? codeOf(key, !shifted) : undefined;
    if (other || (!key && shifted)) toggle.click();
    unselect();
    const at = code ?? other;
    if (at) kb.keyEl(at)?.classList.add('selected');
  };
  return { el: h('div', { class: 'heat-host' }, kb.el), select };
}

/** The accuracy a heat band asks over a key's last presses: from its bound up to the next band's, the top one at least, the lowest under. */
function bandTip(from: number, below: number | undefined): string {
  const pct = (v: number) => Math.round(v * 100);
  const n = STATS_WINDOW;
  if (below === undefined) return t('stats.bandFrom', { from: pct(from), n });
  if (!from) return t('stats.bandUnder', { to: pct(below), n });
  return t('stats.bandBetween', { from: pct(from), to: pct(below), n });
}

/** An icon (or a glyph) with a number; the meaning is in the tooltip and the aria-label only. */
function chip(pic: string | null, glyph: string, text: string, label: string): HTMLElement {
  return h('li', { class: 'sum-chip', tip: label, 'aria-label': label, role: 'img' },
    pic ? h('img', { src: pic, alt: '' }) : h('span', { class: 'sum-glyph' }, glyph), h('b', {}, text));
}

/** Typing time short (`45 min`, `1 h 25`) for a chip and in full (`1 h 25 min`) for its tooltip. */
function typingTime(seconds: number): { short: string; full: string } {
  const min = Math.round(seconds / 60);
  if (min < 60) {
    const short = t('progress.timeMin', { m: min });
    return { short, full: short };
  }
  const hm = { h: Math.floor(min / 60), m: min % 60 };
  return { short: t('progress.timeHours', hm), full: t('progress.timeHoursFull', hm) };
}

/** The long-term picture in one row (mastered keys, finished stories and worlds, the chest's points, the parrots at home against their best count, the best stars of all levels), the last 14 days in the next (accuracy, rhythm, speed, letters, days with practice, typing time), the totals ever in the third (growth medals, parrot rounds won, stars earned, the target range's record and its day, and when the child last typed). */
export function summaryRow(p: Profile): HTMLElement {
  const m = masterySummary(p);
  const stories = STORIES.filter((x) => storyDone(p, x)).length;
  const recent = recentTyping(p, 14);
  const practice = recentPractice(p, 14);
  const time = typingTime(practice.seconds);
  const percent = Math.round(recent.accuracy * 100);
  const chest = chestPoints(p), stars = totalStars(p);
  const parrots = { n: p.progress.parrots.length, best: p.progress.parrotBest };
  const { rangeRecordAt } = p.progress;
  return h('div', { class: 'progress-sums' }, h('ul', { class: 'progress-sum' },
    chip(imageUrl('ui-key'), '⌨', `${m.mastered}/${m.total}`, t('progress.keys', { n: m.mastered, total: m.total })),
    chip(imageUrl('ui-level'), '▲', `${stories}/${STORIES.length}`, t('progress.stories', { n: stories, total: STORIES.length })),
    chip(imageUrl('ui-earth'), '●', `${p.progress.worldsDone.length}/${WORLDS.length}`, t('progress.worlds', { n: p.progress.worldsDone.length, total: WORLDS.length })),
    chip(imageUrl('ui-chest'), '◆', `${chest}/${MAX_CHEST}`, t('progress.chest', { n: chest, total: MAX_CHEST })),
    parrots.best ? chip(imageUrl('ui-act-parrot-head'), 'P', t('progress.parrotCount', parrots), t('progress.parrots', parrots)) : null,
    chip(imageUrl('ui-star'), '★', `${stars}/${LEVEL_STARS}`, t('progress.stars', { n: stars, total: LEVEL_STARS }))),
  h('ul', { class: 'progress-sum' },
    recent.chars ? chip(imageUrl('ui-accuracy'), '✓', `${percent} %`, t('progress.quality', { n: percent })) : null,
    recent.rhythm !== null ? chip(imageUrl('ui-act-rhythm'), '♩', String(recent.rhythm), t('progress.rhythm14', { n: recent.rhythm })) : null,
    recent.cpm ? chip(imageUrl('ui-typing-speed'), '»', String(recent.cpm), t('progress.speed', { n: recent.cpm })) : null,
    chip(imageUrl('ui-keys-typed'), 'Aa', String(recent.chars), t('progress.chars14', { n: recent.chars })),
    chip(imageUrl('ui-days-trained'), '▦', `${practice.days}/14`, t('progress.days14', { n: practice.days })),
    chip(imageUrl('ui-typing-time'), '◷', time.short, t('progress.time14', { time: time.full }))),
  h('ul', { class: 'progress-sum' },
    chip(imageUrl('ui-medals'), '◉', String(p.progress.growth), t('progress.medals', { n: p.progress.growth })),
    chip(imageUrl('ui-parrots-earned'), 'P', String(p.progress.parrotsEarned), t('progress.parrotsEarned', { n: p.progress.parrotsEarned })),
    chip(imageUrl('ui-stars-earned'), '★', String(p.progress.starsEarned), t('progress.starsEarned', { n: p.progress.starsEarned })),
    rangeRecordAt ? chip(imageUrl('obj-aim-target'), '◎', String(p.progress.rangeRecord),
      t('progress.rangeRecord', { n: p.progress.rangeRecord, date: new Date(rangeRecordAt).toLocaleDateString(locale()) })) : null,
    lastTrainingChip(p)));
}

/** Who a story is about, for its row: a close-up head that still reads at a small size. */
export function storyPicture(story: StoryDef): string | null {
  return imageUrl(`ui-story-${story.id}`);
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
      const name = worldName(w);
      return src ? h('img', { class: on ? 'done' : '', src, alt: '', tip: name }) : h('span', { class: `world-dot ${on ? 'done' : ''}`, tip: name });
    })),
    h('p', { class: 'story-stars', tip: t('progress.storyStars', { n: stars }), 'aria-label': t('progress.storyStars', { n: stars }) },
      h('b', {}, String(stars)), star ? h('img', { src: star, alt: '' }) : '★'));
}

/** A row of badges per tier, gold first, without headings; a tier nobody holds has no row, no badge at all shows a grey empty badge and says so. */
function badgeTiers(p: Profile): HTMLElement[] {
  const rows = (['gold', 'silver', 'bronze'] as const).flatMap((tier) => {
    const worlds = WORLDS.map((_, w) => w).filter((w) => badgeTier(p, w) === tier);
    return worlds.length ? [h('div', { class: 'badge-row' }, ...worlds.map((w) => badge(w, tier, true)))] : [];
  });
  const none = imageUrl('ui-badge-none');
  return rows.length ? rows : [h('p', { class: 'badge-none' }, none ? h('img', { src: none, alt: '' }) : null, t('progress.badgeNone'))];
}

/** Notes drawn at most in the row: more never fit, the count says the rest. */
const NOTES_SHOWN = 60;

/**
 * My rhythm: the treble clef while held, then the notes left today in one row, as many as fit, each a
 * little over the one before, the exact count right after the last, and the child's Rytmus tempo once
 * played; a note's tooltip names the world it was earned in.
 */
function rhythmShelf(p: Profile, notes: RhythmNote[]): HTMLElement {
  const head = h('h4', {}, t('progress.rhythmTitle'));
  const n = p.progress.rhythmTempo;
  const tempo = n === null ? null : h('ul', { class: 'progress-sum rhythm-tempo' }, chip(imageUrl('ui-act-rhythm'), '♩', String(n), t('progress.rhythmTempo', { n })));
  if (!notes.length) return h('div', { class: 'badge-shelf' }, head, h('div', { class: 'rhythm-notes' }, h('p', { class: 'badge-none' }, t('progress.rhythmNone')), tempo));
  let prev: NoteLook | undefined;
  const pics = notes.slice(-NOTES_SHOWN).map((n) => {
    prev = noteLook(n.n, p.seed, prev);
    const label = t('progress.rhythmNoteTip', { world: worldName(n.world) });
    return h('span', { class: 'note-pic', tip: label, 'aria-label': label, role: 'img' }, notePic(prev));
  });
  const count = t('progress.rhythmNotes', { n: notes.length });
  const clefPic = imageUrl('ui-treble-clef'), clefTip = t('progress.clef');
  const clef = hasClef(p) ? h('span', { class: 'rhythm-clef', tip: clefTip, 'aria-label': clefTip, role: 'img' }, clefPic ? h('img', { src: clefPic, alt: '' }) : '𝄞') : null;
  return h('div', { class: 'badge-shelf' }, head,
    h('div', { class: 'rhythm-notes' }, clef, h('div', { class: 'rhythm-note-list' }, ...pics), h('b', { class: 'rhythm-count', tip: count, 'aria-label': count }, String(notes.length)), tempo));
}

/** The summary rows, a row per story under their heading, the badge shelf, the range awards and the rhythm notes. */
function progressSection(p: Profile): HTMLElement {
  const notes = p.progress.rhythmNoteList;
  return h('section', { class: 'progress-view' },
    summaryRow(p),
    h('div', { class: 'badge-shelf' }, h('h4', {}, t('progress.storiesTitle'))),
    ...STORIES.map((s) => storyRow(p, s)),
    h('div', { class: 'badge-shelf' }, h('h4', {}, t('progress.badges')), ...badgeTiers(p)),
    h('div', { class: 'badge-shelf' }, h('h4', {}, t('progress.rangeAwards')), rangeFinds(p)),
    rhythmShelf(p, notes));
}

/** When the child last typed, a chip of the totals: the keyboard picture and "včera"; its tooltip says the day too. */
function lastTrainingChip(p: Profile): HTMLElement {
  const { date, daysAgo } = lastTraining(p);
  const ago = daysAgo === null ? null : agoOf(daysAgo);
  const when = ago ? t(`progress.${ago.key}`, 'n' in ago ? { n: ago.n } : {}) : t('progress.agoNever');
  const tipText = date ? t('progress.lastTip', { when, date: new Date(`${date}T12:00`).toLocaleDateString(locale()) }) : t('progress.lastNever');
  return chip(imageUrl('ui-world-keys'), '⌨', when, tipText);
}

type StatsTab = 'progress' | 'keys';

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

/** Progress: the summary rows and badges, the code of all statistics and the certificate; `title` off where the page already says it. */
export function progressTab(p: Profile, title = true): HTMLElement {
  return h('div', {},
    h('div', { class: 'stats-head' }, h('div', { class: 'stats-hero' }, playfulTapko(p), hasParrotBadge(p) ? aroPerch(true, (aro) => aro.hop())?.el ?? null : null),
      h('div', {}, title ? h('h2', {}, t('progress.title')) : null, progressSection(p))),
    h('div', { class: 'row stats-code' }, button(t('progress.showCode'), () => void showOverallCode(p), 'btn', 'code'),
      button(t('cert.button'), () => openCertificate(p), 'btn', 'print')));
}

/** The keyboard heat map with the check and the legend under it, the keys to practise and the details of one key (or the whole keyboard). */
export function keysTab(p: Profile, close: () => void, start: string | null = null, onKey?: (key: string | null) => void): HTMLElement {
  const practice = (keys: string[]) => { close(); go('level', { id: 'practice', keys, seconds: DRILL_SECONDS }); };
  const detail = h('div', { class: 'key-detail-host' });
  const showKey = (key: string | null) => {
    heat.select(key);
    detail.replaceChildren(key ? keyDetail(p, key, showKey, (k) => practice([k])) : wholeKeyboard(p));
    onKey?.(key);
  };
  const heat = clickableHeatmap(showKey);
  showKey(start);
  const weak = weakKeys(p, activeKeys(p));
  const total = Object.values(p.stats.keys).reduce((a, s) => a + s.presses, 0);
  // The placement check measures the keys from the start of the lesson order; it only ever adds keys, so it may run any time.
  const check = button(t('stats.placement'), () => { close(); go('level', { id: 'placement' }); }, 'btn', 'keyboard');
  tip(check, t('stats.placementTip'));
  const drill = weak.length ? button(t('stats.drill'), () => practice(weak.map((w) => w.key)), 'btn primary', 'practice') : null;
  if (drill) tip(drill, t('stats.drillTip', { keys: weak.map((w) => keyLabel(w.key)).join(' ') }));
  return h('div', {},
    h('h3', {}, t('stats.title')),
    h('p', {}, total ? t('stats.intro', { n: STATS_WINDOW }) : t('stats.empty')),
    heat.el,
    h('div', { class: 'keys-foot' }, check,
      h('p', { class: 'legend' },
        ...HEAT_BANDS.map((b, i) => h('span', { class: `lg ${b.cls}`, tip: bandTip(b.from, HEAT_BANDS[i - 1]?.from) }, `${b.mark} ${t(b.label)}`)))),
    h('div', { class: 'stats-split' },
      weak.length ? h('div', { class: 'weak' },
        h('h3', {}, t('stats.practiceKeys')),
        h('ul', { class: 'weak-list' }, ...weak.map((r) => h('li', {},
          keyCap(layout(), r.key, () => showKey(r.key)),
          h('span', {}, t('stats.keyLine', { acc: Math.round(r.accuracy * 100) }), ' ', fingerChip(layout(), r.key))))),
        drill)
        : null,
      detail));
}

/** The child's quick look at the progress (click on the character), in tabs: progress and keys; the map's button opens the whole page. */
export function openStats(): void {
  const p = app.profile!;
  let close = () => {};
  const tabs: [StatsTab, string][] = [['progress', t('progress.tabProgress')], ['keys', t('progress.tabKeys')]];
  const body = h('div', { class: 'stats-body' });
  const nav = tabBar(tabs, 'progress', (tab) => body.replaceChildren(tab === 'progress' ? progressTab(p) : keysTab(p, close)));
  close = modal(h('div', { class: 'stats' }, nav, body), { cls: 'stats-modal' });
}
