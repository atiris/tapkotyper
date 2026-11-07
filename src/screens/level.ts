import { app, go, isBreakDue, saveProfile } from '../app/app';
import { starRow } from '../ui/chrome';
import { tapkoElement } from '../gfx/tapko';
import { t, tn } from '../i18n/i18n';
import { JOURNEYS, LEVELS, type LevelDef, STORIES, type StoryDef, WORLDS, DRILL_SECONDS, worldName, aimLevel, aimOpen, aimWorld, freeTypeLevel, isLevelUnlocked, isWorldUnlocked, journeyLevel, journeyOpen, levelAt, levelById, nextLevel, parrotLevel, placementLevel, practiceLevel, rhythmLevel, rhythmOpen, taskLevel } from '../game/levels';
import { type LevelResult, newJourneyRun } from '../game/progress';
import type { Style } from '../game/typing';
import { WORLD_REWARDS, dressForMission } from '../game/rewards';
import { LevelRuntime } from '../game/runtime';
import { loadMode } from '../game/modes';
import { captureKeys } from '../game/cards';
import { type SurpriseRun, surpriseOutcome, surpriseRun, surpriseWonIn, surprisesToldOn } from '../game/own-content';
import { type DrillKey, type News, bestLetter, drillImproved, drillNews, drillRows, greenLine, levelNews } from '../game/end-news';
import { ownTextPhrases } from '../game/modes/practice';
import type { AimMode } from '../game/modes/aim';
import type { FreeTyped } from '../game/modes/freetype';
import type { ParrotMode } from '../game/modes/parrot';
import type { RhythmMode } from '../game/modes/rhythm';
import { earnsNote, rhythmWord } from '../game/beat';
import { addRhythmRound } from '../game/rhythm-notes';
import type { PlacementMode } from '../game/modes/placement';
import { strongWeak } from '../learning/placement';
import { activeKeys, keyMastery, recentAccuracy } from '../learning/lessons';
import { loseParrot, winParrot } from '../game/parrots';
import { THINGS } from '../game/modes/aim-things';
import { imageUrl } from '../gfx/assets';
import { compassElement } from '../gfx/compass';
import { type Profile, SUPER_ID, type Surprise, type Task } from '../storage/schema';
import { isFinished, recordTaskRun } from '../share/task';
import { localDate, recentTyping } from '../learning/stats';
import { type Child, closeButton, h } from '../ui/dom';
import { notePic } from '../ui/notes';
import { type EndAction, type EndCardOpts, endCard, focusMain } from '../ui/end-card';
import { keyLabel } from '../ui/keyboard-guide';
import { badge, parrotBadge } from '../ui/badge';
import { medal } from '../ui/medal';
import { roundButton } from '../ui/hud';
import { openPlacePicker, openWorlds } from './free-type';
import { openHelp } from './help';
import { openStats } from './stats';
import { handInDialog, startTask } from './task';
import { openBreak } from './break';

interface LevelParams {
  id: string;
  /** Drill keys (practice now). */
  keys?: string[];
  /** Free practice: the keys chosen in the key picker. */
  chosen?: string[];
  seconds?: number;
  /** Free practice of the parent's own text. */
  text?: boolean;
  /** A teacher's task: its id. */
  task?: string;
  /** Free practice: copy typing, dictation or memory, chosen in the key picker. */
  style?: Style;
  /** Just typing: the world index chosen in the place picker; the target range, the parrot and Rytmus: its world. */
  world?: number;
  /** Staying a while in this story level: no end, no stars. */
  stay?: boolean;
  /** A hero's journey: the id of its story. */
  story?: StoryDef['id'];
}

export function levelScreen(root: HTMLElement, params: LevelParams): () => void {
  const p = app.profile!;
  // A drill of a few keys tells at its end how they got better since now.
  const drill = params.id === 'practice' && params.keys ? drillStart(p, params.keys) : null;
  const task = p.tasks.find((x) => x.id === params.task) ?? null;
  let def: LevelDef;
  if (params.id === 'task' && task) def = taskLevel(task, taskWorld(p, task));
  else if (params.id === 'practice') def = practiceLevel(params.seconds ?? null, params.text ? ownTextPhrases(p) : undefined);
  else if (params.id === 'freetype') def = freeTypeLevel(params.world != null && isWorldUnlocked(p, params.world) ? params.world : 0);
  else if (params.id === 'aim') def = aimLevel(p, params.world != null && aimOpen(p, params.world) ? params.world : aimWorld(p, 0) ?? 0);
  else if (params.id === 'rhythm') def = rhythmLevel(params.world != null && rhythmOpen(p, params.world) ? params.world : 0);
  else if (params.id === 'parrot') def = parrotLevel(params.world != null && aimOpen(p, params.world) ? params.world : aimWorld(p, 0) ?? 0);
  else if (params.id === 'journey' && journeyStory(params.story)) def = journeyLevel(journeyStory(params.story)!, 0);
  else if (params.id === 'placement') def = placementLevel();
  else def = levelById(params.id) ?? LEVELS[0];
  // A mission (a story level or a hero's journey, not staying on) dresses the character by its random choices first.
  if (!params.stay && (def.journey || LEVELS.includes(def))) {
    dressForMission(p, def.world);
    saveProfile();
  }
  // A super-obstacle has no endless form (the asteroids' has): staying plays the world's last regular level.
  const stayDef = params.stay && def.isSuper && def.kind !== 'asteroid' ? levelAt(def.world, def.index - 1) ?? def : def;
  const next = params.stay ? nextOpen(def) : undefined;
  // A hero's journey plays its parts one after another on this screen and keeps them as one run.
  const journey = def.journey ? newJourneyRun() : undefined;
  // A story's own journey ends its story the first time it is finished: its end card says so.
  const firstHome = !!def.journey && !!JOURNEYS[def.journey.story] && !p.progress.levels[def.id];
  // The surprise asked on its first part's get-ready card is told at its end.
  let asked: Surprise | null = null;
  let rt: LevelRuntime | null = null;
  let left = false;
  // A task goes back to the Tasks page it is played from.
  const exit = () => go(task ? 'tasks' : 'map');
  // The level's mode comes with its own code; leaving before it is there opens nothing.
  const play = (level: LevelDef) => void loadMode(level).then((makeMode) => {
    if (left) return;
    rt?.dispose();
    rt?.el.remove();
    const part = level.journey;
    const runtime = rt = new LevelRuntime(root, level, makeMode, {
      keys: params.keys,
      chosen: params.chosen,
      seconds: params.seconds ?? null,
      style: params.style,
      stay: params.stay,
      next: next && (() => go('level', { id: next.id })),
      onExit: exit,
      onFreeDone: (typed) => showFreeDone(root, typed, params),
      onTapko: openStats,
      onHelp: (back, now) => openHelp(root.querySelector('.level-screen')!, back, now),
      onBreak: (back, play) => openBreak(back, play),
      onLayout: () => go('level', params, false),
      journey,
      onPart: part && (() => play(journeyLevel(journeyStory(part.story)!, part.part + 1))),
      onFinish: (result) => {
        if (!result) return exit();
        if (part) return showJourneyDone(root, level, result, params, asked, firstHome);
        if (def.kind === 'aim') return showAimDone(root, def, result, runtime.mode as AimMode, params, runtime.surprise);
        if (def.kind === 'rhythm') return showRhythmDone(root, def, result, runtime.mode as RhythmMode, params, runtime.surprise);
        if (def.kind === 'parrot') return showParrotDone(root, def, result, runtime.mode as ParrotMode, params, runtime.surprise);
        if (def.kind === 'placement') return showPlacementDone(root, result, runtime.mode as PlacementMode);
        if (drill) return showDrillDone(root, result, drillReport(p, drill), params);
        if (params.stay) return showStayDone(root, def, result);
        if (task) return showTaskDone(root, task, result);
        showResults(root, def, result, params, runtime.surprise);
      },
    });
    if (part?.part === 0) asked = runtime.surprise;
    if (def.kind === 'freetype' && openWorlds(p).length > 1) {
      root.querySelector('.hud-title')!.after(roundButton('control', 'map', t('freeType.place'), () => openPlacePicker(def.world)));
    }
    if (def.kind === 'freetype' && import.meta.env.DEV) {
      // Dev server only: the hand tool opens the pose of the key typed last; a save there shows here at once. Not translated.
      const poser = () => window.open(`${import.meta.env.BASE_URL}tools/hand-poser/?pose=${runtime.handPose()}`, 'hand-poser');
      root.querySelector('.hud-title')!.after(roundButton('control', 'paw', 'Ruky (nástroj)', poser));
    }
    if (def.kind === 'practice' && !params.seconds) {
      // Untimed practice ends when the child wants: the round X, like in just typing, shows the results.
      const end = roundButton('control', 'close', t('level.end'), () => runtime.endPractice());
      end.dataset.tip = t('practice.backTip');
      root.querySelector('.hud')!.prepend(end);
    }
  });
  play(stayDef);
  return () => {
    left = true;
    rt?.dispose();
  };
}

/** The world behind a task: the one of the child's next level, or any at random (only a backdrop, nothing opens). */
function taskWorld(p: Profile, task: Task): number {
  return task.world === 'random' ? Math.floor(Math.random() * WORLDS.length) : nextLevel(p)?.world ?? 0;
}

/** The story whose hero's journey is asked for, when the journey is open. */
function journeyStory(id: string | undefined): StoryDef | undefined {
  const story = STORIES.find((s) => s.id === id);
  return story && journeyOpen(app.profile!, story) ? story : undefined;
}

const MODIFIERS = ['Shift', 'Alt', 'Control', 'Meta', 'AltGraph'];

/**
 * A results card the child can look under: Esc or the round X hides the card and its dimming over
 * the last frame of the game, whose bar and keyboard work again; a typed character while peeking
 * does `type` when given (play on in the same level without an end), any other key, a click into
 * the game or the pause button brings the card back with the same focus. A dialog or the help page over it goes first.
 */
function peekable(overlay: HTMLElement, card: HTMLElement, type?: () => void): void {
  let focused: HTMLElement | null = null;
  const peek = (on: boolean) => {
    if (on) focused = document.activeElement as HTMLElement | null;
    overlay.classList.toggle('peek', on);
    overlay.parentElement!.classList.toggle('peeking', on);
    if (!on) focused?.focus();
  };
  card.prepend(closeButton(() => peek(true), t('results.peek')));
  // Peeking, the hidden card lets every click through; a click into the game or on the pause button (nothing to pause after the end) brings it back.
  for (const el of overlay.parentElement!.querySelectorAll('.stage-wrap, .pause-btn')) el.addEventListener('click', () => {
    if (overlay.classList.contains('peek')) peek(false);
  });
  const stop = captureKeys(overlay, (e) => {
    if (document.querySelector('.modal-back, .level-help') || MODIFIERS.includes(e.key)) return;
    const peeking = overlay.classList.contains('peek');
    if (e.key !== 'Escape' && !peeking) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat) return;
    if (e.key !== 'Escape' && type && e.key.length === 1) {
      stop();
      // After this key is done, or the new run would take it as its first.
      setTimeout(type);
    } else peek(!peeking);
  });
}

const toMap = () => go('map');
const pct = (n: number) => Math.round(n * 100);
const letters = (n: number) => tn('end.letters', n);
/** Whole minutes of typing; under a minute says so. */
const minutes = (seconds: number) => seconds < 60 ? t('end.underMinute') : tn('end.minutes', Math.round(seconds / 60));

/** The end card over the level's last frame, its main button focused, "World map" last unless the end has its own way there; Esc and typing as in `peekable`. */
function showEnd(root: HTMLElement, o: Omit<EndCardOpts, 'onBreak'>, type?: () => void): void {
  const card = endCard({ toMap, ...o, onBreak: isBreakDue() ? (back) => openBreak(back) : null });
  const overlay = h('div', { class: 'overlay results' }, card);
  root.querySelector('.level-screen')!.append(overlay);
  focusMain(card);
  peekable(overlay, card, type);
}

/** Accuracy and speed, the rows every typing end starts with. */
function typingRows(r: LevelResult): [string, Child][] {
  return [[t('end.accuracy'), `${pct(r.accuracy)} %`], r.cpm > 0 ? [t('end.speed'), letters(r.cpm)] : null].filter((x): x is [string, string] => x !== null);
}

/** The green line's content: the first news with its picture, and how many more rewards came with it. */
function newsLine(news: News[]): Child[] | null {
  const line = greenLine(news);
  if (!line) return null;
  const n = line.news;
  const keys = (k: string[]) => (k.length === 1 ? t('results.newKey', { key: keyLabel(k[0]) }) : t('results.newKeys', { keys: k.map(keyLabel).join(', ') }));
  const [pic, text]: [Child, string] =
    n.kind === 'badge' ? [badge(n.world, n.tier, true), t(!n.upgrade ? 'results.badgeNew' : n.tier === 'gold' ? 'results.badgeGold' : 'results.badgeSilver')]
    : n.kind === 'parrotBadge' ? [parrotBadge(), t('parrot.badge')]
    : n.kind === 'keys' ? [null, keys(n.keys)]
    : n.kind === 'medal' ? [medal(n.growth.medal, true), t('results.growthTitle')]
    : n.kind === 'wardrobe' ? [null, t('results.newAccessory', { n: n.n })]
    : n.kind === 'companion' ? [null, t('results.newCompanion', { kind: t(`kinds.${n.companion}`) })]
    : n.kind === 'trend' ? [null, t('results.trendUp')]
    : n.kind === 'find' ? [findPic(n.thing), t('end.newFind')]
    : n.kind === 'mastered' ? [null, t('end.keyMastered', { key: keyLabel(n.key) })]
    : n.kind === 'letter' ? [null, t('end.letterBetter', { key: keyLabel(n.key), before: pct(n.before), after: pct(n.after) })]
    : n.kind === 'journeyHome' ? [null, t(`end.journeyHome.${n.story}`)]
    : n.kind === 'rhythmNote' ? [notePic(n.n, app.profile!.seed), t('end.rhythmNote', { world: worldName(n.world) })]
    : n.kind === 'tempoTop' ? [null, t('end.rhythmTop', { n: n.tempo })]
    : n.kind === 'beatBetter' ? [null, t('end.rhythmBetter')]
    : [null, t('end.faster')];
  return [pic, h('span', {}, line.more ? `${text} ${tn('end.moreRewards', line.more)}` : text)];
}

/** The picture of a range thing in the green line. */
function findPic(id: string): Child {
  const src = imageUrl(THINGS.find((th) => th.id === id)?.pics[0] ?? '');
  return src && h('img', { class: 'ec-find', src, alt: '' });
}

/** Tells and records the surprises the run reached (a story level keeps them in its world, a hero's journey in its story's last world); the card then shows today's told ones, or none. */
function toldSurprises(def: LevelDef, asked: Surprise | null, run: SurpriseRun): Surprise[] {
  const p = app.profile!;
  const { revealed } = surpriseOutcome(p, asked, run);
  if (!revealed.length) return [];
  const story = STORIES.find((s) => s.id === def.journey?.story);
  const world = story ? story.worlds[story.worlds.length - 1] : def.index >= 0 ? def.world : null;
  if (world !== null) for (const s of revealed) surpriseWonIn(s, world);
  saveProfile();
  return surprisesToldOn(p);
}

function showResults(root: HTMLElement, def: LevelDef, r: LevelResult, params: LevelParams, surprise: Surprise | null): void {
  const p = app.profile!;
  const practice = def.kind === 'practice';
  const rows: [string, Child][] = [...typingRows(r)];
  if (r.byStyle) rows.push([t(`end.${r.byStyle.style}Clean`), t('end.ofTotal', { n: r.byStyle.clean, total: r.byStyle.total })]);
  const actions: EndAction[] = [];
  const nextDef = def.index >= 0 && !def.isSuper ? levelAt(def.world, def.index + 1) : undefined;
  if (r.worldDone !== null) actions.push({ label: t('results.reward'), icon: 'star', run: () => go('story', { scene: WORLD_REWARDS[r.worldDone!], next: 'map' }) });
  else if (nextDef) actions.push({ label: t('results.next'), icon: 'next', run: () => go('level', { id: nextDef.id }) });
  actions.push({ label: t('results.replay'), icon: 'replay', run: () => go('level', params) });
  const stay = def.index >= 0 ? () => go('level', { id: def.id, stay: true }) : undefined;
  if (stay) actions.push({ label: t('results.stay'), icon: 'play', run: stay });
  showEnd(root, {
    cls: practice ? 'practice-done' : 'level-done',
    title: t(practice ? 'end.practice' : 'end.level'),
    picture: practice ? 'ui-end-practice' : tapkoElement(p.companion, 'happy', 120),
    under: practice ? minutes(r.seconds) : starRow(r.stars),
    rows: rows.slice(0, 3),
    news: newsLine(levelNews(r)),
    tip: r.byTapko ? t('results.byTapko') : null,
    surprises: toldSurprises(def, surprise, surpriseRun(def, !!params.keys)),
    actions,
  }, stay);
}

/**
 * The end of a teacher's task: the run is recorded (the best stays unless this one is better),
 * accuracy, speed and minutes, whether it is the best; handing in the best and playing again.
 */
function showTaskDone(root: HTMLElement, task: Task, r: LevelResult): void {
  const p = app.profile!;
  const better = recordTaskRun(task, r);
  saveProfile();
  const actions: EndAction[] = [];
  if (isFinished(task)) actions.push({ label: t('task.handIn'), icon: 'upload', run: () => void handInDialog(p, task) });
  actions.push({ label: t('results.replay'), icon: 'replay', run: () => startTask(task) });
  showEnd(root, {
    cls: 'task-run-done',
    title: t('end.taskDone'),
    picture: 'ui-end-task',
    under: minutes(r.seconds),
    rows: [...typingRows(r), [t('end.task'), t(better ? 'end.taskBest' : 'end.taskKept')]],
    news: newsLine(levelNews(r)),
    actions,
  });
}

/** The end of a hero's journey: its compass, the stars of all its parts together, accuracy, speed and minutes; no staying a while. A story's own journey finished the first time says how its story ends. */
function showJourneyDone(root: HTMLElement, def: LevelDef, r: LevelResult, params: LevelParams, surprise: Surprise | null, firstHome: boolean): void {
  const news = levelNews(r);
  if (firstHome) news.unshift({ kind: 'journeyHome', story: def.journey!.story });
  showEnd(root, {
    cls: 'journey-done',
    title: t('end.journey'),
    picture: compassElement('ec-img'),
    under: starRow(r.stars),
    rows: [...typingRows(r), [t('end.time'), minutes(r.seconds)]],
    news: newsLine(news),
    tip: r.byTapko ? t('results.byTapko') : null,
    surprises: toldSurprises(def, surprise, 'all'),
    actions: [{ label: t('results.replay'), icon: 'replay', run: () => go('level', params) }],
  });
}

/** The level after a story level, when open: staying a while goes on to it. */
function nextOpen(def: LevelDef): LevelDef | undefined {
  const next = LEVELS.includes(def) ? LEVELS[LEVELS.indexOf(def) + 1] : undefined;
  return next && isLevelUnlocked(app.profile!, next) ? next : undefined;
}

/** The drill keys before the run: their recent accuracy, presses ever and whether they were mastered. */
function drillStart(p: Profile, keys: string[]): DrillKey[] {
  return keys.map((key) => ({ key, before: recentAccuracy(p.stats.keys[key]), after: 0, presses: p.stats.keys[key]?.presses ?? 0, mastered: !!keyMastery(p, key) }));
}

/** How the drill keys went: the accuracy now, the presses of this run, mastered in this run. */
function drillReport(p: Profile, start: DrillKey[]): DrillKey[] {
  return start.map((k) => ({
    key: k.key,
    before: k.before,
    after: recentAccuracy(p.stats.keys[k.key]),
    presses: (p.stats.keys[k.key]?.presses ?? 0) - k.presses,
    mastered: !k.mastered && !!keyMastery(p, k.key),
  }));
}

/**
 * The end of a short drill: each key (up to three, pressed enough) with its accuracy before and after,
 * a small green arrow when it grew, or the trained keys together; then accuracy and speed. The green
 * line names a key the run mastered, else the most improved one. Once more plays the same drill.
 */
function showDrillDone(root: HTMLElement, r: LevelResult, report: DrillKey[], params: LevelParams): void {
  const keyRows: [Child, Child][] = drillRows(report).map((row) => [
    row.key === null ? t('end.drillKeys') : h('kbd', { class: 'kbd' }, keyLabel(row.key)),
    h('span', { class: 'ec-change' }, `${pct(row.before)} % → ${pct(row.after)} %`,
      drillImproved(row) ? h('span', { class: 'ec-up', role: 'img', 'aria-label': t('end.drillUp') }, '▲') : null),
  ]);
  showEnd(root, {
    cls: 'practice-done drill-done',
    title: t('end.practice'),
    picture: 'ui-end-practice',
    under: minutes(r.seconds),
    rows: [...keyRows, ...typingRows(r)].slice(0, 3),
    news: newsLine(drillNews(r, report)),
    actions: [{ label: t('end.onceMore'), icon: 'replay', run: () => go('level', params) }],
  });
}

/** The end of staying a while: accuracy and speed like after a practice, the next level first. */
function showStayDone(root: HTMLElement, def: LevelDef, r: LevelResult): void {
  const next = nextOpen(def);
  const stay = () => go('level', { id: def.id, stay: true });
  const actions: EndAction[] = [];
  if (next) actions.push({ label: t('results.next'), icon: 'next', run: () => go('level', { id: next.id }) });
  actions.push({ label: t('results.stay'), icon: 'play', run: stay });
  showEnd(root, { cls: 'stay-done', title: t('end.stay'), picture: 'ui-end-stay', under: minutes(r.seconds), rows: typingRows(r), news: newsLine(levelNews(r)), actions }, stay);
}

/** The end of the target range: the hits (a new record has its own title and picture), the points, accuracy and the middle hits; no stars. */
function showAimDone(root: HTMLElement, def: LevelDef, r: LevelResult, mode: AimMode, params: LevelParams, surprise: Surprise | null): void {
  const better = bestLetter(mode.report());
  const stay = () => go('level', { ...params, stay: true });
  showEnd(root, {
    cls: 'aim-done',
    title: t(mode.newRecord ? 'end.rangeRecord' : 'end.range'),
    picture: mode.newRecord ? 'ui-end-range-record' : 'ui-end-range',
    under: tn('end.hits', mode.hits),
    rows: [[t('end.points'), mode.points], [t('end.accuracy'), `${pct(r.accuracy)} %`], [t('end.centers'), mode.centers]],
    // A thing new in the collection comes before everything else.
    news: newsLine([...mode.won.map((thing) => ({ kind: 'find', thing }) as const), ...levelNews({ ...r, growth: null, trend: null }), ...(better ? [better] : [])]),
    // Staying at the range keeps no surprises.
    surprises: params.stay ? [] : toldSurprises(def, surprise, 'time'),
    actions: [
      { label: t('results.replay'), icon: 'replay', run: () => go('level', { ...params, stay: undefined }) },
      { label: t('results.stay'), icon: 'play', run: stay, tip: t('aim.stayTip') },
    ],
  }, stay);
}

/**
 * The end of a parrot round: the parrot at home with the words it learned and the speeds, the badge
 * when this win brought it; or its empty perch when it flew off, and a tip for the new try. No stars.
 */
function showParrotDone(root: HTMLElement, def: LevelDef, r: LevelResult, mode: ParrotMode, params: LevelParams, surprise: Surprise | null): void {
  const p = app.profile!;
  const lost = mode.flewOff;
  const badgeNew = !lost && winParrot(p, def.world, localDate());
  if (lost) loseParrot(p, def.world);
  saveProfile();
  const words = mode.round.words;
  const learn = mode.speed(1), repeat = mode.speed(2);
  // Faster while repeating than the usual speed of the last 14 days.
  const usual = recentTyping(p, 14).cpm;
  const news: News[] = [...(badgeNew ? [{ kind: 'parrotBadge' } as const] : []), ...levelNews({ ...r, growth: null, trend: null }), ...(usual && repeat > usual ? [{ kind: 'faster' } as const] : [])];
  const rows: [string, Child][] = [[t('end.parrotWords'), words.slice(0, 3).join(', ') + (words.length > 3 ? ', …' : '')]];
  if (learn) rows.push([t('end.speedStart'), letters(learn)]);
  if (!lost && repeat) rows.push([t('end.speedRepeat'), letters(repeat)]);
  // The words typed faster in the second half than at their best in the first.
  if (!lost && mode.beaten.size) rows.push([t('end.parrotBeaten'), [...mode.beaten].join(', ')]);
  showEnd(root, {
    cls: 'parrot-done',
    title: t(lost ? 'end.parrotLost' : 'end.parrotHome'),
    picture: lost ? 'ui-act-parrot-perch' : 'ui-act-parrot',
    under: lost ? t('end.tryAgain') : tn('end.words', words.length),
    rows,
    news: lost ? null : newsLine(news),
    tip: lost ? t('end.parrotTip') : null,
    surprises: toldSurprises(def, surprise, 'time'),
    actions: [{ label: t(lost ? 'results.replay' : 'parrot.again'), icon: 'replay', run: () => go('level', params) }],
  });
}

/**
 * The end of a placement check: the turtle, the letters the student can use now, the strong and weak
 * keys of this run as key caps and how many letters opened (or, when the timing looked like eyes on
 * the keys, the kind line); in super mode the touch-typing measures too. With weak keys the short
 * drill of them comes first; "World map" shows the opened worlds.
 */
function showPlacementDone(root: HTMLElement, r: LevelResult, mode: PlacementMode): void {
  const p = app.profile!, check = mode.check;
  const { strong, weak } = strongWeak(check.presses, p.layout, check.difficulty);
  const caps = (keys: string[]) => h('span', { class: 'ec-keys' }, ...keys.map((k) => h('kbd', { class: 'kbd' }, keyLabel(k))));
  const rows: [string, Child][] = [
    [t('end.placementStrong'), strong.length ? caps(strong) : '–'],
    [t('end.placementWeak'), weak.length ? caps(weak) : t('end.placementNoWeak')],
  ];
  // The owner tunes the signal's limits from these numbers: two fingers and ten.
  if (p.id === SUPER_ID) {
    const n = (v: number | null) => (v === null ? '–' : v.toFixed(2));
    rows.push([t('end.placementSignal'), `${n(check.signal.fit)} · ${n(check.signal.contrast)} · ${check.signal.pass ? '✓' : '✗'}`]);
  }
  const actions: EndAction[] = weak.length ? [{
    label: t('stats.drill'), icon: 'practice', tip: t('stats.drillTip', { keys: weak.map(keyLabel).join(' ') }),
    run: () => go('level', { id: 'practice', keys: weak, seconds: DRILL_SECONDS }),
  }] : [];
  const opened = r.newKeys.length;
  showEnd(root, {
    cls: 'placement-done',
    title: t('end.placement'),
    picture: 'ui-teacher',
    under: tn('end.placementLetters', activeKeys(p).length),
    rows,
    news: opened ? [h('span', {}, tn('end.placementOpened', opened))] : null,
    tip: check.end === 'signal' ? t('end.placementEyes') : null,
    actions,
  });
}

/** The end of free typing after something was typed: the words, the time and the last text; none of it counts in the statistics. */
function showFreeDone(root: HTMLElement, typed: FreeTyped, params: LevelParams): void {
  const again = () => go('level', params);
  showEnd(root, {
    cls: 'free-done',
    title: t('end.freeType'),
    picture: 'ui-end-freetype',
    under: tn('end.words', typed.words),
    rows: [[t('end.time'), minutes(typed.seconds)], [t('end.lastText'), typed.last]],
    actions: [{ label: t('level.keepTyping'), icon: 'play', run: again }],
  }, again);
}

/**
 * The end of a Rytmus round: the basket full of letters; accuracy, rhythm with its word, the tempo held
 * and the letters caught. The world keeps the tempo to start with next time, the rhythm and the
 * highest tempo; the node's check comes with the world's target tempo held accurately; a great
 * round adds a rhythm note to those left today. No stars.
 */
function showRhythmDone(root: HTMLElement, def: LevelDef, r: LevelResult, mode: RhythmMode, params: LevelParams, surprise: Surprise | null): void {
  const p = app.profile!;
  const before = p.progress.rhythm[def.world];
  const score = mode.score, held = mode.held || mode.song.phrases[0].tempo;
  p.progress.rhythm[def.world] = { tempo: mode.nextTempo, at: localDate(), rhythm: score, top: Math.max(before?.top ?? 0, mode.held) };
  if (mode.reached && !p.progress.rhythmWon.includes(def.world)) p.progress.rhythmWon.push(def.world);
  const note = addRhythmRound(p, def.world, earnsNote(score, r.accuracy), localDate());
  saveProfile();
  const news: News[] = [
    ...(note ? [{ kind: 'rhythmNote', n: note.n, world: note.world } as const] : []),
    ...(before && mode.held > before.top ? [{ kind: 'tempoTop', tempo: mode.held } as const] : []),
    ...(before?.rhythm != null && score !== null && score > before.rhythm ? [{ kind: 'beatBetter' } as const] : []),
    ...levelNews({ ...r, growth: null, trend: null }),
  ];
  showEnd(root, {
    cls: 'rhythm-done',
    title: t('end.rhythmDone'),
    picture: 'obj-rhythm-basket-full',
    rows: [
      [t('end.accuracy'), `${pct(r.accuracy)} %`],
      [t('end.rhythm'), score === null ? '–' : t('end.rhythmScore', { n: score, word: t(`rhythm.words.${rhythmWord(score)}`) })],
      [t('end.tempo'), letters(held)],
      [t('end.caught'), t('end.ofTotal', { n: mode.caught, total: mode.due })],
    ],
    news: newsLine(news),
    surprises: toldSurprises(def, surprise, 'time'),
    actions: [{ label: t('results.replay'), icon: 'replay', run: () => go('level', params) }],
  });
}
