import { app, go, pickLine, saveProfile } from '../app/app';
import { starRow } from '../ui/chrome';
import { tapkoElement } from '../gfx/tapko';
import { t, tList } from '../i18n/i18n';
import { nickname } from '../storage/store';
import { LEVELS, type LevelDef, type StoryDef, WORLDS, aimLevel, aimOpen, aimWorld, freeTypeLevel, isLevelUnlocked, isWorldUnlocked, levelById, parrotLevel, practiceLevel, rescueLevel, storyOf } from '../game/levels';
import type { LevelResult } from '../game/progress';
import type { Style } from '../game/typing';
import { WORLD_REWARDS } from '../game/rewards';
import { LevelRuntime } from '../game/runtime';
import { captureKeys, surpriseAsk, surpriseLeft } from '../game/cards';
import { surpriseOutcome, surpriseWonIn } from '../game/own-content';
import { ownTextPhrases } from '../game/modes/practice';
import type { AimMode } from '../game/modes/aim';
import type { ParrotMode } from '../game/modes/parrot';
import { loseParrot, winParrot } from '../game/parrots';
import { imageUrl } from '../gfx/assets';
import { WORLD_THINGS } from '../game/modes/aim-things';
import type { Friend, Profile, Surprise, Task } from '../storage/schema';
import { recordTaskRun, taskOwn } from '../share/task';
import { localDate, recentTyping } from '../learning/stats';
import { type Child, button, closeButton, h } from '../ui/dom';
import { tip } from '../ui/tooltip';
import { keyLabel } from '../ui/keyboard-guide';
import { badge, parrotBadge } from '../ui/badge';
import { medal } from '../ui/medal';
import { roundButton } from '../ui/hud';
import { rangeFinds } from '../ui/finds';
import { playLevel } from './map';
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
  else if (params.id === 'rescue') def = rescueLevel(p, p.progress.friends.length * 7 + Math.floor(Math.random() * 5));
  else def = levelById(params.id) ?? LEVELS[0];
  // A super-obstacle has no endless form: staying plays the world's last regular level.
  const stayDef = params.stay && def.isSuper ? LEVELS.find((l) => l.world === def.world && l.index === def.index - 1) ?? def : def;
  const task = p.tasks.find((x) => x.id === params.task && !x.doneAt) ?? null;
  let rt: LevelRuntime;
  const exit = () => go('map');
  rt = new LevelRuntime(root, stayDef, {
    keys: params.keys,
    chosen: params.chosen,
    seconds: params.seconds ?? null,
    own: task ? taskOwn(task) : undefined,
    style: params.style,
    stay: params.stay,
    onExit: exit,
    onTapko: openStats,
    onHelp: (back, now) => openHelp(root.querySelector('.level-screen')!, back, now),
    onFinish: (result) => {
      if (!result) return exit();
      if (def.kind === 'aim') return showAimDone(root, result, rt.mode as AimMode, params);
      if (def.kind === 'parrot') return showParrotDone(root, def, result, rt.mode as ParrotMode, params);
      if (params.stay) return showStayDone(root, def, result);
      if (task) {
        recordTaskRun(task, result);
        saveProfile();
      }
      showResults(root, def, result, params, rt.surprise, task);
    },
  });
  if (def.kind === 'freetype' && openWorlds(p).length > 1) {
    root.querySelector('.hud-title')!.after(roundButton('control', 'map', t('freeType.place'), () => openPlacePicker(def.world)));
  }
  if (def.kind === 'practice' && !params.seconds) {
    // Untimed practice ends when the child wants: the round X, like in just typing, shows the results.
    const end = roundButton('control', 'close', t('level.endPractice'), () => rt.endPractice());
    end.dataset.tip = t('practice.backTip');
    root.querySelector('.hud')!.prepend(end);
  }
  return () => rt.dispose();
}

const NAMES_FALLBACK: Record<Friend['kind'], string[]> = { dragon: ['Iskra', 'Mäta', 'Luna', 'Bubu'], robot: ['Bip', 'Zip', 'Kolík', 'Dioda'], forest: ['Pipi', 'Iskrička', 'Perko', 'Lúčik'] };
/** The friend a rescue mission helps, by the mission's story. */
const FRIEND_OF: Record<StoryDef['id'], Friend['kind']> = { dragon: 'dragon', robot: 'robot', fairy: 'forest' };
const RESCUED_LINE: Record<Friend['kind'], string> = { dragon: 'results.rescued', robot: 'results.repaired', forest: 'results.guided' };

/** The break as the results' first action; back from it the card goes on without it, with the narrator's `line`. */
function breakAction(actions: HTMLElement, bubble: HTMLElement, line: string): void {
  const b = button(t('results.takeBreak'), () => openBreak(() => {
    b.remove();
    bubble.textContent = line;
    actions.querySelector('button')?.focus();
  }), 'btn primary', 'play');
  actions.append(b);
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
  const stars = starRow(r.stars);
  // The facts as small chips in one wrapping row, accuracy first.
  const chip = (cls: string, ...kids: Child[]) => h('span', { class: `fact ${cls}` }, ...kids);
  const facts: HTMLElement[] = [
    chip('main', r.byTapko ? t('results.byTapko') : t('results.accuracy', { n: Math.round(r.accuracy * 100) })),
  ];
  if (r.byStyle) facts.push(chip('', t(`results.${r.byStyle.style}Clean`, { n: r.byStyle.clean, total: r.byStyle.total })));
  if (r.cpm > 0) facts.push(chip('', t('results.rhythm', { n: r.cpm })));
  if (r.trend && r.trend > 1.05) facts.push(chip('good', t('results.trendUp')));
  if (r.newKeys.length) {
    facts.push(chip('new-key', r.newKeys.length === 1 ? t('results.newKey', { key: keyLabel(r.newKeys[0]) }) : t('results.newKeys', { keys: r.newKeys.map(keyLabel).join(', ') })));
  }
  if (r.newAccessories.length) facts.push(chip('good', t('results.newAccessory', { n: r.newAccessories.length })));
  for (const kind of r.newCompanions) facts.push(chip('good', t('results.newCompanion', { kind: t(`kinds.${kind}`) })));
  if (r.badge) {
    const line = !r.badge.upgrade ? 'results.badgeNew' : r.badge.tier === 'gold' ? 'results.badgeGold' : 'results.badgeSilver';
    facts.push(chip('badge-fact', badge(r.badge.world, r.badge.tier, true), h('b', {}, t(line))));
  }
  if (rescued) facts.push(chip('good', t(RESCUED_LINE[rescued.kind], { name: rescued.name })));
  if (r.growth) {
    facts.push(chip('growth', medal(r.growth.medal, true), h('span', {}, h('b', {}, t('results.growthTitle')), ' ',
      r.growth.kind === 'difficulty' ? t('results.growthDifficulty') : t('results.growthWordLen', { n: r.growth.value }))));
  }
  const sentence = pickLine('tapko.level_done', { name: nickname(p) }, p.customMessages);

  const actions = h('div', { class: 'row center' });
  const taskOn = task && !task.doneAt ? task : null;
  if (task?.doneAt) actions.append(button(t('task.handIn'), () => void handInDialog(p, task), 'btn primary', 'upload'));
  else if (taskOn && def.kind === 'practice') actions.append(button(t('task.continue'), () => startTask(p, taskOn), 'btn primary', 'play'));
  const breakDue = app.sessionSeconds >= p.settings.sessionMinutes * 60;
  // A break or a finished task's hand-in is the main action then.
  const calm = breakDue || !!task?.doneAt;
  const nextDef = def.index >= 0 && !def.isSuper ? LEVELS.find((l) => l.world === def.world && l.index === def.index + 1) : undefined;
  const bubble = h('p', { class: 'bubble static side' }, breakDue ? pickLine('tapko.break') : sentence);
  if (breakDue) breakAction(actions, bubble, sentence);
  if (r.worldDone !== null) {
    actions.append(button(t('results.reward'), () => go('story', { scene: WORLD_REWARDS[r.worldDone!], next: 'map' }), `btn ${calm ? '' : 'primary'}`, 'star'));
  } else if (nextDef) {
    actions.append(button(t('results.next'), () => playLevel(nextDef.id, taskOn?.id), `btn ${calm ? '' : 'primary'}`, 'next'));
  } else if (def.rescue) {
    actions.append(button(t('results.nextRescue'), () => go('level', { id: 'rescue' }), `btn ${calm ? '' : 'primary'}`, 'rescue'));
  }
  if (def.index >= 0 && !task) actions.append(button(t('results.stay'), () => go('level', { id: def.id, stay: true }), 'btn', 'play'));
  actions.append(button(t('results.replay'), () => go('level', params), 'btn', 'replay'));
  const toMap = () => go('map');
  actions.append(button(t('level.toMap'), toMap, 'btn', 'map'));

  // The task, the surprise and the narrator's question share one small framed block; a run with a
  // surprise has no built-in teaser.
  const outcome = surpriseOutcome(p, surprise, !!params.keys);
  // A story level keeps the told surprise in its world on the map.
  if (outcome?.revealed && def.index >= 0 && !def.rescue) surpriseWonIn(outcome.rule, def.world);
  if (outcome) saveProfile();
  const notes = [
    outcome ? surpriseResult(p, outcome.rule, outcome.revealed) : null,
    task ? h('p', { class: `task-line ${task.doneAt ? 'good' : ''}` }, task.doneAt ? t('task.doneLine', { title: task.title }) : t('task.leftLine', { title: task.title, n: minutesLeft(task) })) : null,
    ...(outcome ? [] : teaser(def, !!nextDef && r.worldDone === null)),
  ].filter((x) => x !== null);
  const card = h('div', { class: 'card results-card' },
    closeButton(toMap, t('results.close')),
    h('div', { class: 'results-top' },
      h('h2', {}, def.kind === 'practice' ? t('results.practiceDone') : t('results.title')),
      def.kind === 'practice' ? null : stars),
    h('div', { class: 'results-tapko' }, tapkoElement(p.companion, 'happy', 80), bubble),
    h('div', { class: 'results-facts' }, ...facts),
    notes.length ? h('div', { class: 'results-notes' }, ...notes) : null,
    actions);
  const overlay = h('div', { class: 'overlay results' }, card);
  root.querySelector('.level-screen')!.append(overlay);
  (actions.querySelector('button') as HTMLButtonElement).focus();
  // Escape closes the results like every other card (back to the map); a dialog over them closes first.
  const stop = captureKeys(overlay, (e) => {
    if (e.key !== 'Escape' || document.querySelector('.modal-back')) return;
    e.preventDefault();
    stop();
    toMap();
  });
}

/** The end of staying a while: accuracy and rhythm like after a practice, the map first. */
function showStayDone(root: HTMLElement, def: LevelDef, r: LevelResult): void {
  const p = app.profile!;
  const chip = (cls: string, text: string) => h('span', { class: `fact ${cls}` }, text);
  const facts = [chip('main', t('results.accuracy', { n: Math.round(r.accuracy * 100) }))];
  if (r.cpm > 0) facts.push(chip('', t('results.rhythm', { n: r.cpm })));
  if (r.newKeys.length) {
    facts.push(chip('new-key', r.newKeys.length === 1 ? t('results.newKey', { key: keyLabel(r.newKeys[0]) }) : t('results.newKeys', { keys: r.newKeys.map(keyLabel).join(', ') })));
  }
  if (r.growth) facts.push(chip('good', r.growth.kind === 'difficulty' ? t('results.growthDifficulty') : t('results.growthWordLen', { n: r.growth.value })));
  const breakDue = app.sessionSeconds >= p.settings.sessionMinutes * 60;
  const next = LEVELS[LEVELS.indexOf(def) + 1];
  const actions = h('div', { class: 'row center' });
  const line = pickLine('tapko.level_done', { name: nickname(p) }, p.customMessages);
  const bubble = h('p', { class: 'bubble static side' }, breakDue ? pickLine('tapko.break') : line);
  if (breakDue) breakAction(actions, bubble, line);
  actions.append(button(t('level.toMap'), () => go('map'), `btn ${breakDue ? '' : 'primary'}`, 'map'));
  if (next && isLevelUnlocked(p, next)) actions.append(button(t('results.next'), () => playLevel(next.id), 'btn', 'next'));
  const card = h('div', { class: 'card results-card stay-done' },
    closeButton(() => go('map'), t('results.close')),
    h('div', { class: 'results-top' }, h('h2', {}, t('results.practiceDone'))),
    h('div', { class: 'results-tapko' }, tapkoElement(p.companion, 'happy', 80), bubble),
    h('div', { class: 'results-facts' }, ...facts),
    actions);
  const overlay = h('div', { class: 'overlay results' }, card);
  root.querySelector('.level-screen')!.append(overlay);
  (actions.querySelector('button') as HTMLButtonElement).focus();
  const stop = captureKeys(overlay, (e) => {
    if (e.key !== 'Escape' || document.querySelector('.modal-back')) return;
    e.preventDefault();
    stop();
    go('map');
  });
}

/** The end of the target range over it: accuracy before and after per weak key, the hits, new keys when the lesson advanced; no stars. */
function showAimDone(root: HTMLElement, r: LevelResult, mode: AimMode, params: LevelParams): void {
  const p = app.profile!;
  const pct = (n: number) => Math.round(n * 100);
  const rows = mode.report().map((k) => h('li', { class: `aim-row ${k.after > k.before ? 'good' : ''}` },
    h('b', { class: 'aim-row-key' }, keyLabel(k.key)),
    h('span', {}, t('aim.beforeAfter', { before: pct(k.before), after: pct(k.after) }))));
  const facts = [h('span', { class: 'fact main' }, t('results.accuracy', { n: pct(r.accuracy) })), h('span', { class: 'fact' }, t('aim.hitsDone', { n: mode.hits, center: mode.centers }))];
  if (r.newKeys.length) facts.push(h('span', { class: 'fact new-key' }, t('aim.opened', { keys: r.newKeys.map(keyLabel).join(', ') })));
  const breakDue = app.sessionSeconds >= p.settings.sessionMinutes * 60;
  const actions = h('div', { class: 'row center' });
  const line = pickLine('tapko.level_done', { name: nickname(p) }, p.customMessages);
  const bubble = h('p', { class: 'bubble static side' }, breakDue ? pickLine('tapko.break') : line);
  if (breakDue) breakAction(actions, bubble, line);
  actions.append(button(t('aim.again'), () => go('level', { ...params, stay: undefined }), `btn ${breakDue ? '' : 'primary'}`, 'replay'));
  const stay = () => go('level', { ...params, stay: true });
  const stayBtn = button(t('aim.stay'), stay, 'btn', 'play');
  tip(stayBtn, t('aim.stayTip'));
  actions.append(stayBtn, button(t('aim.toMap'), () => go('map'), 'btn', 'map'));
  const card = h('div', { class: 'card results-card aim-done' },
    closeButton(stay, `${t('aim.stay')} (Esc)`),
    h('div', { class: 'results-top' }, h('h2', {}, t('aim.done'))),
    h('div', { class: 'results-tapko' }, tapkoElement(p.companion, 'happy', 80), bubble),
    h('ul', { class: 'aim-rows', 'aria-label': t('aim.keys') }, ...rows),
    h('div', { class: 'results-facts' }, ...facts),
    aimCollection(p),
    actions);
  const overlay = h('div', { class: 'overlay results' }, card);
  root.querySelector('.level-screen')!.append(overlay);
  (actions.querySelector('button') as HTMLButtonElement).focus();
  // Escape stays at the range; Escape there ends it and brings this card back.
  const stop = captureKeys(overlay, (e) => {
    if (e.key !== 'Escape' || document.querySelector('.modal-back')) return;
    e.preventDefault();
    e.stopPropagation();
    stop();
    // After this key is done, or the new range would take the same Escape as its end.
    setTimeout(stay);
  });
}

/**
 * The end of a parrot round: the parrot is at home, the words it learned, the speeds, the badge when
 * this win brought it; or its empty perch when it flew off, and a new try. No stars.
 */
function showParrotDone(root: HTMLElement, def: LevelDef, r: LevelResult, mode: ParrotMode, params: LevelParams): void {
  const p = app.profile!;
  const lost = mode.flewOff;
  const badgeNew = !lost && winParrot(p, def.world, localDate());
  if (lost) loseParrot(p, def.world);
  saveProfile();
  const pic = imageUrl(lost ? 'ui-act-parrot-perch' : 'ui-act-parrot');
  const words = h('div', { class: 'results-facts parrot-words' }, h('span', { class: 'fact main' }, t('parrot.learned', { words: mode.round.words.join(', ') })));
  const facts: HTMLElement[] = [];
  // How fast the fingers got: the usual speed of the last 14 days, the learning part and the repeating part.
  const usual = recentTyping(p, 14).cpm, learn = mode.speed(1), repeat = mode.speed(2);
  if (usual) facts.push(h('span', { class: 'fact' }, t('parrot.speedUsual', { n: usual })));
  if (learn) facts.push(h('span', { class: 'fact' }, t('parrot.speedLearn', { n: learn })));
  if (repeat) facts.push(h('span', { class: `fact ${repeat > learn ? 'good' : ''}` }, t('parrot.speedRepeat', { n: repeat })));
  if (r.newKeys.length) facts.push(h('span', { class: 'fact new-key' }, t('aim.opened', { keys: r.newKeys.map(keyLabel).join(', ') })));
  if (badgeNew) facts.push(h('span', { class: 'fact badge-fact' }, parrotBadge(), h('b', {}, t('parrot.badgeNew'))));
  const breakDue = app.sessionSeconds >= p.settings.sessionMinutes * 60;
  const actions = h('div', { class: 'row center' });
  const line = lost ? t('parrot.flown') : pickLine('tapko.level_done', { name: nickname(p) }, p.customMessages);
  const bubble = h('p', { class: 'bubble static side' }, breakDue && !lost ? pickLine('tapko.break') : line);
  if (breakDue) breakAction(actions, bubble, line);
  actions.append(button(t(lost ? 'results.replay' : 'parrot.again'), () => go('level', params), `btn ${breakDue ? '' : 'primary'}`, 'replay'),
    button(t('level.toMap'), () => go('map'), 'btn', 'map'));
  const card = h('div', { class: 'card results-card parrot-done' },
    closeButton(() => go('map'), t('results.close')),
    h('div', { class: 'results-top' }, h('h2', {}, t('parrot.done'))),
    h('div', { class: 'results-tapko' }, pic ? h('img', { class: 'parrot-done-pic', src: pic, alt: '' }) : tapkoElement(p.companion, 'happy', 80), bubble),
    words,
    h('div', { class: 'results-facts' }, ...facts),
    actions);
  const overlay = h('div', { class: 'overlay results' }, card);
  root.querySelector('.level-screen')!.append(overlay);
  (actions.querySelector('button') as HTMLButtonElement).focus();
  const stop = captureKeys(overlay, (e) => {
    if (e.key !== 'Escape' || document.querySelector('.modal-back')) return;
    e.preventDefault();
    stop();
    go('map');
  });
}

/** The range's collection under the run's result, with how many are found. */
function aimCollection(p: Profile): HTMLElement {
  const found = WORLD_THINGS.filter((th) => p.progress.rangeFinds.includes(th.id)).length;
  return h('div', { class: 'aim-collection' },
    h('p', { class: 'aim-collection-count' }, t('aim.collection.count', { n: found })),
    rangeFinds(p));
}

/** A surprise asked again: its answer highlighted right under it, or what is still left. */
function surpriseResult(p: Profile, s: Surprise, revealed: boolean): HTMLElement {
  return h('div', { class: 'surprise-result' },
    surpriseAsk(s.q),
    revealed ? h('p', { class: 'surprise answer' }, s.a) : surpriseLeft(p, s));
}

/**
 * A curious question about the next level, answered only after that level is
 * finished, so the child wants to go on; the answer comes with its question. Story levels only.
 */
function teaser(def: LevelDef, hasNext: boolean): HTMLElement[] {
  if (def.index < 0) return [];
  const world = WORLDS[def.world];
  const questions = tList(`teaser.${world}.q`);
  const answer = def.index > 0 ? tList(`teaser.${world}.a`)[def.index - 1] : undefined;
  const asked = def.index > 0 ? questions[def.index - 1] : undefined;
  const question = hasNext ? questions[def.index] : undefined;
  const out: HTMLElement[] = [];
  if (answer) {
    out.push(h('div', { class: 'teaser-result' },
      asked ? h('p', { class: 'teaser asked' }, h('b', {}, t('teaser.asked')), ' ', asked) : null,
      h('p', { class: 'teaser answer' }, h('b', {}, t('teaser.answer')), ' ', answer)));
  }
  if (question) out.push(h('p', { class: 'teaser ask' }, h('b', {}, t('teaser.ask')), ' ', question, h('br'), h('small', {}, t('teaser.later'))));
  return out;
}
