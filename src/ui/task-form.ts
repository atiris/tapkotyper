import { t } from '../i18n/i18n';
import { TASK_GAMES, TASK_GROUP_MAX, TASK_LIMITS, TASK_MINUTES, TASK_TITLE_MAX, newTaskId, wordsGame } from '../share/task';
import type { TaskGame, TaskLimit, TaskSpec } from '../storage/schema';
import { OWN_TEXT_MAX, parseOwnWords } from '../words/words';
import { button, h } from './dom';
import { check, field, range, segmented, switchField } from './form';

export interface TaskForm {
  el: HTMLElement;
  /** Fills the form with a task to change; saving keeps its id. */
  edit(spec: TaskSpec): void;
}

const DEFAULT_MINUTES = 5;

/**
 * The teacher's form for a task: name and group, the game, its words or text (only the one the
 * game uses), the limit, the dictionary, the known letters, the minutes (for a limit with time)
 * and the world. `onSave` gets a task with content; while editing, its id is kept.
 */
export function taskForm(onSave: (spec: TaskSpec) => void): TaskForm {
  let editing: string | null = null;
  let game: TaskGame = 'chase';
  let limit: TaskLimit = 'time';
  let world: TaskSpec['world'] = 'current';
  let minutes = DEFAULT_MINUTES;
  let dictionary = true;
  let knownOnly = true;
  const title = h('input', { type: 'text', maxlength: TASK_TITLE_MAX, placeholder: t('task.titlePlaceholder') });
  const group = h('input', { type: 'text', maxlength: TASK_GROUP_MAX, placeholder: t('task.groupPlaceholder') });
  const words = h('textarea', { rows: 3, placeholder: t('own.wordsPlaceholder') });
  const text = h('textarea', { rows: 4, maxlength: OWN_TEXT_MAX, placeholder: t('own.textPlaceholder') });
  const wordsField = field(t('task.words'), words, t('task.wordsHint'));
  const textField = field(t('task.text'), text);
  const minutesRange = range(minutes, TASK_MINUTES[0], TASK_MINUTES[1], 1, (v) => (minutes = v), (v) => t('parent.minutes', { n: v }));
  const minutesField = field(t('task.minutes'), minutesRange);
  const dictionaryBox = check(dictionary, (v) => (dictionary = v));
  const knownBox = check(knownOnly, (v) => (knownOnly = v));
  const msg = h('p', { class: 'error', role: 'alert' });
  const gameChoice = segmented(t('task.gameLabel'), game, TASK_GAMES.map((g) => [g, t(`task.game.${g}`)]), (v) => { game = v; show(); });
  const limitChoice = segmented(t('task.limit'), limit, TASK_LIMITS.map((l) => [l, t(`task.limits.${l}`)]), (v) => { limit = v; show(); });
  const worldChoice = segmented(t('task.world'), world, [['current', t('task.worlds.current')], ['random', t('task.worlds.random')]], (v) => (world = v));
  const submit = button(t('task.make'), () => save(), 'btn primary', 'code');
  const cancel = button(t('task.cancelEdit'), () => reset(), 'btn ghost', 'close');

  /** Only the source the game uses, and the minutes only for a limit with time. */
  const show = () => {
    wordsField.hidden = !wordsGame(game);
    textField.hidden = wordsGame(game);
    minutesField.hidden = limit === 'text';
    submit.lastElementChild!.textContent = t(editing ? 'task.save' : 'task.make');
    cancel.hidden = !editing;
  };
  const setMinutes = (n: number) => {
    minutes = n;
    const input = minutesRange.querySelector('input')!;
    input.value = String(n);
    input.dispatchEvent(new Event('input'));
  };
  const fill = (spec: TaskSpec | null) => {
    editing = spec?.id ?? null;
    title.value = spec?.title ?? '';
    group.value = spec?.group ?? '';
    words.value = spec?.words.join('\n') ?? '';
    text.value = spec?.text ?? '';
    gameChoice.set(game = spec?.game ?? 'chase');
    limitChoice.set(limit = spec?.limit ?? 'time');
    worldChoice.set(world = spec?.world ?? 'current');
    setMinutes(spec?.minutes ?? DEFAULT_MINUTES);
    dictionaryBox.checked = dictionary = spec?.dictionary ?? true;
    knownBox.checked = knownOnly = spec?.knownOnly ?? true;
    msg.textContent = '';
    show();
  };
  const reset = () => fill(null);
  const save = () => {
    const spec: TaskSpec = {
      id: editing ?? newTaskId(),
      title: title.value.trim(),
      ...(group.value.trim() && { group: group.value.trim() }),
      game,
      words: wordsGame(game) ? parseOwnWords(words.value) : [],
      text: wordsGame(game) ? '' : text.value.slice(0, OWN_TEXT_MAX).trim(),
      limit,
      minutes,
      dictionary,
      knownOnly,
      world,
    };
    if (!spec.words.length && !spec.text) return void (msg.textContent = t('task.needContent'));
    reset();
    onSave(spec);
  };

  const el = h('form', { class: 'task-form', onSubmit: (e: Event) => { e.preventDefault(); save(); } },
    h('div', { class: 'task-form-names' }, field(t('task.title'), title), field(t('task.group'), group, t('task.groupHint'))),
    field(t('task.gameLabel'), gameChoice.el, undefined, 'div'),
    wordsField,
    textField,
    field(t('task.limit'), limitChoice.el, t('task.limitHint'), 'div'),
    switchField(t('task.dictionary'), dictionaryBox, t('task.dictionaryHint')),
    switchField(t('task.knownOnly'), knownBox, t('task.knownOnlyHint')),
    minutesField,
    field(t('task.world'), worldChoice.el, t('task.worldHint'), 'div'),
    msg,
    h('div', { class: 'row' }, submit, cancel));
  show();
  return {
    el,
    edit(spec) {
      fill(spec);
      el.scrollIntoView({ block: 'start' });
      title.focus();
    },
  };
}
