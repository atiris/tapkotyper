import { app, go, pickLine, saveProfile } from '../app/app';
import { starRow } from '../ui/chrome';
import { tapkoElement } from '../gfx/tapko';
import { t, tList } from '../i18n/i18n';
import { LEVELS, type LevelDef, type StoryDef, WORLDS, freeTypeLevel, isWorldUnlocked, levelById, practiceLevel, rescueLevel, storyOf } from '../game/levels';
import type { LevelResult } from '../game/progress';
import type { Style } from '../game/typing';
import { WORLD_REWARDS } from '../game/rewards';
import { LevelRuntime } from '../game/runtime';
import { captureKeys, surpriseAsk, surpriseLeft } from '../game/cards';
import { surpriseOutcome } from '../game/own-content';
import { ownTextPhrases } from '../game/modes/practice';
import type { Friend, Profile, Surprise, Task } from '../storage/schema';
import { recordTaskRun, taskOwn } from '../share/task';
import { localDate } from '../learning/stats';
import { type Child, button, h } from '../ui/dom';
import { keyLabel } from '../ui/keyboard-guide';
import { badge } from '../ui/badge';
import { medal } from '../ui/medal';
import { roundButton } from '../ui/hud';
import { playLevel } from './map';
import { openPlacePicker, openWorlds } from './free-type';
import { openHelp } from './help';
import { openStats } from './stats';
import { handInDialog, minutesLeft, startTask } from './task';

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
  /** Just typing: the world index chosen in the place picker. */
  world?: number;
}

export function levelScreen(root: HTMLElement, params: LevelParams): () => void {
  const p = app.profile!;
  let def: LevelDef;
  if (params.id === 'practice') def = practiceLevel(params.seconds ?? null, params.text ? ownTextPhrases(p) : undefined);
  else if (params.id === 'freetype') def = freeTypeLevel(params.world != null && isWorldUnlocked(p, params.world) ? params.world : 0);
  else if (params.id === 'rescue') def = rescueLevel(p, p.progress.friends.length * 7 + Math.floor(Math.random() * 5));
  else def = levelById(params.id) ?? LEVELS[0];
  const task = p.tasks.find((x) => x.id === params.task && !x.doneAt) ?? null;
  let rt: LevelRuntime;
  const exit = () => go('map');
  rt = new LevelRuntime(root, def, {
    keys: params.keys,
    chosen: params.chosen,
    seconds: params.seconds ?? null,
    own: task ? taskOwn(task) : undefined,
    style: params.style,
    onExit: exit,
    onTapko: openStats,
    onHelp: (back) => openHelp(root.querySelector('.level-screen')!, back),
    onFinish: (result) => {
      if (!result) return exit();
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
    // Untimed practice ends when the child wants.
    root.querySelector('.hud')!.append(button(t('practice.finish'), () => rt.endPractice(), 'btn small'));
  }
  return () => rt.dispose();
}

const NAMES_FALLBACK: Record<Friend['kind'], string[]> = { dragon: ['Iskra', 'Mäta', 'Luna', 'Bubu'], robot: ['Bip', 'Zip', 'Kolík', 'Dioda'], forest: ['Pipi', 'Iskrička', 'Perko', 'Lúčik'] };
/** The friend a rescue mission helps, by the mission's story. */
const FRIEND_OF: Record<StoryDef['id'], Friend['kind']> = { dragon: 'dragon', robot: 'robot', fairy: 'forest' };
const RESCUED_LINE: Record<Friend['kind'], string> = { dragon: 'results.rescued', robot: 'results.repaired', forest: 'results.guided' };

function showResults(root: HTMLElement, def: LevelDef, r: LevelResult, params: LevelParams, surprise: Surprise | null, task: Task | null): void {
  const p = app.profile!;
  let rescued: Friend | null = null;
  if (def.id === 'rescue') {
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
    chip('main', r.byTapko ? t('results.byTapko', { tapko: p.companion.name }) : t('results.accuracy', { n: Math.round(r.accuracy * 100) })),
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
  const sentence = pickLine('tapko.level_done', { name: p.name }, p.customMessages);

  const actions = h('div', { class: 'row center' });
  const taskOn = task && !task.doneAt ? task : null;
  if (task?.doneAt) actions.append(button(t('task.handIn'), () => void handInDialog(p, task), 'btn primary', 'upload'));
  else if (taskOn && def.kind === 'practice') actions.append(button(t('task.continue'), () => startTask(p, taskOn), 'btn primary', 'play'));
  const breakDue = app.sessionSeconds >= p.settings.sessionMinutes * 60;
  // A break or a finished task's hand-in is the main action then.
  const calm = breakDue || !!task?.doneAt;
  const nextDef = def.index >= 0 && !def.isSuper ? LEVELS.find((l) => l.world === def.world && l.index === def.index + 1) : undefined;
  if (breakDue) actions.append(button(t('results.takeBreak'), () => go('break'), 'btn primary', 'play'));
  if (r.worldDone !== null) {
    actions.append(button(t('results.reward'), () => go('story', { scene: WORLD_REWARDS[r.worldDone!], next: 'map' }), `btn ${calm ? '' : 'primary'}`, 'star'));
  } else if (nextDef) {
    actions.append(button(t('results.next'), () => playLevel(nextDef.id, taskOn?.id), `btn ${calm ? '' : 'primary'}`, 'next'));
  } else if (def.id === 'rescue') {
    actions.append(button(t('results.nextRescue'), () => go('level', { id: 'rescue' }), `btn ${calm ? '' : 'primary'}`, 'rescue'));
  }
  actions.append(button(t('results.replay'), () => go('level', params), 'btn', 'replay'));
  const toMap = () => go('map');
  actions.append(button(t('level.toMap'), toMap, 'btn', 'map'));

  // The task, the surprise and Tapko's question share one small framed block; a run with a
  // surprise has no built-in teaser.
  const outcome = surpriseOutcome(p, surprise, !!params.keys);
  if (outcome) saveProfile();
  const notes = [
    outcome ? surpriseResult(p, outcome.rule, outcome.revealed) : null,
    task ? h('p', { class: `task-line ${task.doneAt ? 'good' : ''}` }, task.doneAt ? t('task.doneLine', { title: task.title }) : t('task.leftLine', { title: task.title, n: minutesLeft(task) })) : null,
    ...(outcome ? [] : teaser(p, def, !!nextDef && r.worldDone === null)),
  ].filter((x) => x !== null);
  const card = h('div', { class: 'card results-card' },
    h('div', { class: 'results-top' },
      h('h2', {}, def.kind === 'practice' ? t('results.practiceDone') : t('results.title')),
      def.kind === 'practice' ? null : stars),
    h('div', { class: 'results-tapko' }, tapkoElement(p.companion, 'happy', 80), h('p', { class: 'bubble static side' }, breakDue ? pickLine('tapko.break') : sentence)),
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

/** A surprise asked again: its answer highlighted right under it, or what is still left. */
function surpriseResult(p: Profile, s: Surprise, revealed: boolean): HTMLElement {
  return h('div', { class: 'surprise-result' },
    surpriseAsk(p, s.q),
    revealed ? h('p', { class: 'surprise answer' }, s.a) : surpriseLeft(p, s));
}

/**
 * Tapko's curious question about the next level, answered only after that level is
 * finished, so the child wants to go on; the answer comes with its question. Story levels only.
 */
function teaser(p: Profile, def: LevelDef, hasNext: boolean): HTMLElement[] {
  if (def.index < 0) return [];
  const world = WORLDS[def.world];
  const questions = tList(`teaser.${world}.q`);
  const answer = def.index > 0 ? tList(`teaser.${world}.a`)[def.index - 1] : undefined;
  const asked = def.index > 0 ? questions[def.index - 1] : undefined;
  const question = hasNext ? questions[def.index] : undefined;
  const tapko = p.companion.name;
  const out: HTMLElement[] = [];
  if (answer) {
    out.push(h('div', { class: 'teaser-result' },
      asked ? h('p', { class: 'teaser asked' }, h('b', {}, t('teaser.asked')), ' ', asked) : null,
      h('p', { class: 'teaser answer' }, h('b', {}, t('teaser.answer')), ' ', answer)));
  }
  if (question) out.push(h('p', { class: 'teaser ask' }, h('b', {}, t('teaser.ask', { tapko })), ' ', question, h('br'), h('small', {}, t('teaser.later'))));
  return out;
}
