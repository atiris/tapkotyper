import { app, go, isBreakDue, saveProfile } from '../app/app';
import { starRow } from '../ui/chrome';
import { tapkoElement } from '../gfx/tapko';
import { t, tList, tn } from '../i18n/i18n';
import { LEVELS, type LevelDef, type StoryDef, aimLevel, aimOpen, aimWorld, freeTypeLevel, isLevelUnlocked, isWorldUnlocked, levelById, parrotLevel, practiceLevel, rescueLevel, storyOf } from '../game/levels';
import type { LevelResult } from '../game/progress';
import type { Style } from '../game/typing';
import { WORLD_REWARDS } from '../game/rewards';
import { LevelRuntime } from '../game/runtime';
import { loadMode } from '../game/modes';
import { captureKeys } from '../game/cards';
import { type SurpriseRun, surpriseOutcome, surpriseRun, surpriseWonIn, surprisesToldOn } from '../game/own-content';
import { type News, bestLetter, greenLine, levelNews } from '../game/end-news';
import { ownTextPhrases } from '../game/modes/practice';
import type { AimMode } from '../game/modes/aim';
import type { FreeTyped } from '../game/modes/freetype';
import type { ParrotMode } from '../game/modes/parrot';
import { loseParrot, winParrot } from '../game/parrots';
import { THINGS } from '../game/modes/aim-things';
import { imageUrl } from '../gfx/assets';
import type { Friend, Surprise, Task } from '../storage/schema';
import { recordTaskRun, taskOwn } from '../share/task';
import { localDate, recentTyping } from '../learning/stats';
import { type Child, closeButton, h } from '../ui/dom';
import { type EndAction, type EndCardOpts, endCard, focusMain } from '../ui/end-card';
import { keyLabel } from '../ui/keyboard-guide';
import { badge, parrotBadge } from '../ui/badge';
import { medal } from '../ui/medal';
import { roundButton } from '../ui/hud';
import { openPlacePicker, openWorlds } from './free-type';
import { openHelp } from './help';
import { openStats } from './stats';
import { handInDialog, minutesLeft, startTask } from './task';
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
  /** Id of the task this level is played for. */
  task?: string;
  /** Free practice: copy typing, dictation or memory, chosen in the key picker. */
  style?: Style;
  /** Just typing: the world index chosen in the place picker; the target range and the parrot: its world. */
  world?: number;
  /** Staying a while in this story level: no end, no stars. */
  stay?: boolean;
}

export function levelScreen(root: HTMLElement, params: LevelParams): () => void {
  const p = app.profile!;
  let def: LevelDef;
  if (params.id === 'practice') def = practiceLevel(params.seconds ?? null, params.text ? ownTextPhrases(p) : undefined);
  else if (params.id === 'freetype') def = freeTypeLevel(params.world != null && isWorldUnlocked(p, params.world) ? params.world : 0);
  else if (params.id === 'aim') def = aimLevel(p, params.world != null && aimOpen(p, params.world) ? params.world : aimWorld(p, 0) ?? 0);
  else if (params.id === 'parrot') def = parrotLevel(params.world != null && aimOpen(p, params.world) ? params.world : aimWorld(p, 0) ?? 0);
  else if (params.id === 'rescue') def = rescueLevel(p.progress.friends.length * 7 + Math.floor(Math.random() * 5));
  else def = levelById(params.id) ?? LEVELS[0];
  // A super-obstacle has no endless form (the asteroids' has): staying plays the world's last regular level.
  const stayDef = params.stay && def.isSuper && def.kind !== 'asteroid' ? LEVELS.find((l) => l.world === def.world && l.index === def.index - 1) ?? def : def;
  const task = p.tasks.find((x) => x.id === params.task && !x.doneAt) ?? null;
  const next = params.stay ? nextOpen(def) : undefined;
  let rt: LevelRuntime | null = null;
  let left = false;
  const exit = () => go('map');
  // The level's mode comes with its own code; leaving before it is there opens nothing.
  void loadMode(stayDef).then((makeMode) => {
    if (left) return;
    const runtime = rt = new LevelRuntime(root, stayDef, makeMode, {
      keys: params.keys,
      chosen: params.chosen,
      seconds: params.seconds ?? null,
      own: task ? taskOwn(task) : undefined,
      style: params.style,
      stay: params.stay,
      next: next && (() => go('level', { id: next.id })),
      onExit: exit,
      onFreeDone: (typed) => showFreeDone(root, typed, params),
      onTapko: openStats,
      onHelp: (back, now) => openHelp(root.querySelector('.level-screen')!, back, now),
      onBreak: (back, play) => openBreak(back, play),
      onLayout: () => go('level', params, false),
      onFinish: (result) => {
        if (!result) return exit();
        if (def.kind === 'aim') return showAimDone(root, def, result, runtime.mode as AimMode, params, runtime.surprise);
        if (def.kind === 'parrot') return showParrotDone(root, def, result, runtime.mode as ParrotMode, params, runtime.surprise);
        if (params.stay) return showStayDone(root, def, result);
        if (task) {
          recordTaskRun(task, result);
          saveProfile();
        }
        showResults(root, def, result, params, runtime.surprise, task);
      },
    });
    if (def.kind === 'freetype' && openWorlds(p).length > 1) {
      root.querySelector('.hud-title')!.after(roundButton('control', 'map', t('freeType.place'), () => openPlacePicker(def.world)));
    }
    if (def.kind === 'practice' && !params.seconds) {
      // Untimed practice ends when the child wants: the round X, like in just typing, shows the results.
      const end = roundButton('control', 'close', t('level.end'), () => runtime.endPractice());
      end.dataset.tip = t('practice.backTip');
      root.querySelector('.hud')!.prepend(end);
    }
  });
  return () => {
    left = true;
    rt?.dispose();
  };
}

const NAMES_FALLBACK: Record<Friend['kind'], string[]> = { dragon: ['Iskra', 'Mäta', 'Luna', 'Bubu'], robot: ['Bip', 'Zip', 'Kolík', 'Dioda'], forest: ['Pipi', 'Iskrička', 'Perko', 'Lúčik'] };
/** The friend a rescue mission helps, by the mission's story. */
const FRIEND_OF: Record<StoryDef['id'], Friend['kind']> = { dragon: 'dragon', robot: 'robot', fairy: 'forest' };
const RESCUED_LINE: Record<Friend['kind'], string> = { dragon: 'results.rescued', robot: 'results.repaired', forest: 'results.guided' };

const MODIFIERS = ['Shift', 'Alt', 'Control', 'Meta', 'AltGraph'];

/**
 * A results card the child can look under: Esc or the round X hides the card and its dimming over
 * the last frame of the game, whose bar and keyboard work again; a typed character while peeking
 * does `type` when given (play on in the same level without an end), any other key or a click into
 * the game brings the card back with the same focus. A dialog or the help page over it goes first.
 */
function peekable(overlay: HTMLElement, card: HTMLElement, type?: () => void): void {
  let focused: HTMLElement | null = null;
  const peek = (on: boolean) => {
    if (on) focused = document.activeElement as HTMLElement | null;
    overlay.classList.toggle('peek', on);
    if (!on) focused?.focus();
  };
  card.prepend(closeButton(() => peek(true), t('results.peek')));
  // Peeking, the hidden card lets every click through.
  overlay.parentElement!.querySelector('.stage-wrap')!.addEventListener('click', () => {
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
/** Whole minutes, at least one. */
const minutes = (seconds: number) => tn('end.minutes', Math.max(1, Math.round(seconds / 60)));

/** The end card over the level's last frame, its main button focused; Esc and typing as in `peekable`. */
function showEnd(root: HTMLElement, o: Omit<EndCardOpts, 'onBreak' | 'toMap'>, type?: () => void): void {
  const card = endCard({ ...o, toMap, onBreak: isBreakDue() ? (back) => openBreak(back) : null });
  const overlay = h('div', { class: 'overlay results' }, card);
  root.querySelector('.level-screen')!.append(overlay);
  focusMain(card);
  peekable(overlay, card, type);
}

/** Accuracy and rhythm, the rows every typing end starts with. */
function typingRows(r: LevelResult): [string, Child][] {
  return [[t('end.accuracy'), `${pct(r.accuracy)} %`], r.cpm > 0 ? [t('end.rhythm'), letters(r.cpm)] : null].filter((x): x is [string, string] => x !== null);
}

/** The green line's content: the first news with its picture, and how many more rewards came with it. */
function newsLine(news: News[]): Child[] | null {
  const line = greenLine(news);
  if (!line) return null;
  const n = line.news;
  const keys = (k: string[]) => (k.length === 1 ? t('results.newKey', { key: keyLabel(k[0]) }) : t('results.newKeys', { keys: k.map(keyLabel).join(', ') }));
  const [pic, text]: [Child, string] =
    n.kind === 'rescued' ? [null, t(RESCUED_LINE[n.friend.kind], { name: n.friend.name })]
    : n.kind === 'badge' ? [badge(n.world, n.tier, true), t(!n.upgrade ? 'results.badgeNew' : n.tier === 'gold' ? 'results.badgeGold' : 'results.badgeSilver')]
    : n.kind === 'parrotBadge' ? [parrotBadge(), t('parrot.badge')]
    : n.kind === 'keys' ? [null, keys(n.keys)]
    : n.kind === 'medal' ? [medal(n.growth.medal, true), t('results.growthTitle')]
    : n.kind === 'wardrobe' ? [null, t('results.newAccessory', { n: n.n })]
    : n.kind === 'companion' ? [null, t('results.newCompanion', { kind: t(`kinds.${n.companion}`) })]
    : n.kind === 'trend' ? [null, t('results.trendUp')]
    : n.kind === 'find' ? [findPic(n.thing), t('end.newFind')]
    : n.kind === 'letter' ? [null, t('end.letterBetter', { key: keyLabel(n.key), before: pct(n.before), after: pct(n.after) })]
    : [null, t('end.faster')];
  return [pic, h('span', {}, line.more ? `${text} ${tn('end.moreRewards', line.more)}` : text)];
}

/** The picture of a range thing in the green line. */
function findPic(id: string): Child {
  const src = imageUrl(THINGS.find((th) => th.id === id)?.pics[0] ?? '');
  return src && h('img', { class: 'ec-find', src, alt: '' });
}

/** Tells and records the surprises the run reached (a story level keeps them in its world); the card then shows today's told ones, or none. */
function toldSurprises(def: LevelDef, asked: Surprise | null, run: SurpriseRun): Surprise[] {
  const p = app.profile!;
  const { revealed } = surpriseOutcome(p, asked, run);
  if (!revealed.length) return [];
  if (def.index >= 0 && !def.rescue) for (const s of revealed) surpriseWonIn(s, def.world);
  saveProfile();
  return surprisesToldOn(p);
}

function showResults(root: HTMLElement, def: LevelDef, r: LevelResult, params: LevelParams, surprise: Surprise | null, task: Task | null): void {
  const p = app.profile!;
  let rescued: Friend | null = null;
  if (def.rescue) {
    // The friend helped follows the mission's story.
    const kind = FRIEND_OF[storyOf(def.world).id];
    const names = tList(`${kind}Names`);
    const pool = names.length ? names : NAMES_FALLBACK[kind];
    const same = p.progress.friends.filter((f) => f.kind === kind).length;
    rescued = { kind, name: pool[same % pool.length], hue: Math.floor(Math.random() * 360), date: localDate() };
    p.progress.friends.push(rescued);
    saveProfile();
  }
  const practice = def.kind === 'practice';
  const taskOn = task && !task.doneAt ? task : null;
  // A task still running takes the third row.
  const rows: [string, Child][] = [...typingRows(r)];
  if (taskOn) rows.push([t('end.task'), t('end.taskLeft', { n: minutesLeft(taskOn) })]);
  if (r.byStyle) rows.push([t(`end.${r.byStyle.style}Clean`), t('end.ofTotal', { n: r.byStyle.clean, total: r.byStyle.total })]);
  const actions: EndAction[] = [];
  if (task?.doneAt) actions.push({ label: t('task.handIn'), icon: 'upload', run: () => void handInDialog(p, task) });
  const nextDef = def.index >= 0 && !def.isSuper ? LEVELS.find((l) => l.world === def.world && l.index === def.index + 1) : undefined;
  if (r.worldDone !== null) actions.push({ label: t('results.reward'), icon: 'star', run: () => go('story', { scene: WORLD_REWARDS[r.worldDone!], next: 'map' }) });
  else if (nextDef) actions.push({ label: t('results.next'), icon: 'next', run: () => go('level', { id: nextDef.id, task: taskOn?.id }) });
  else if (def.rescue) actions.push({ label: t('results.nextRescue'), icon: 'rescue', run: () => go('level', { id: 'rescue' }) });
  // A task's practice plays what is left of it.
  actions.push({ label: t('results.replay'), icon: 'replay', run: () => (taskOn && practice ? startTask(p, taskOn) : go('level', params)) });
  const stay = def.index >= 0 && !task ? () => go('level', { id: def.id, stay: true }) : undefined;
  if (stay) actions.push({ label: t('results.stay'), icon: 'play', run: stay });
  showEnd(root, {
    cls: practice ? 'practice-done' : 'level-done',
    title: t(practice ? 'end.practice' : 'end.level'),
    picture: practice ? 'ui-end-practice' : tapkoElement(p.companion, 'happy', 120),
    under: practice ? minutes(r.seconds) : starRow(r.shownStars),
    rows: rows.slice(0, 3),
    news: newsLine(levelNews(r, rescued)),
    tip: r.byTapko ? t('results.byTapko') : null,
    surprises: toldSurprises(def, surprise, surpriseRun(def, !!params.keys)),
    actions,
  }, stay);
}

/** The level after a story level, when open: staying a while goes on to it. */
function nextOpen(def: LevelDef): LevelDef | undefined {
  const next = LEVELS.includes(def) ? LEVELS[LEVELS.indexOf(def) + 1] : undefined;
  return next && isLevelUnlocked(app.profile!, next) ? next : undefined;
}

/** The end of staying a while: accuracy and rhythm like after a practice, the next level first. */
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
