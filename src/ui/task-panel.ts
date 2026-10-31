import { t } from '../i18n/i18n';
import type { TaskSpec } from '../storage/schema';
import { h } from './dom';

/** The task's limit in words: the limit, with its minutes when it has time. */
export const limitLine = (spec: TaskSpec): string =>
  spec.limit === 'text' ? t('task.limits.text') : `${t(`task.limits.${spec.limit}`)} ${t('parent.minutes', { n: spec.minutes })}`;

/** The task in one line: its game and its limit. */
export const taskSummary = (spec: TaskSpec): string => `${t(`task.game.${spec.game}`)} · ${limitLine(spec)}`;

/**
 * A task's panel: its title, its game, limit and group, its words or text, and under them what
 * the caller adds (a pick hint, actions).
 */
export function taskPanel(spec: TaskSpec, ...below: (HTMLElement | null)[]): HTMLElement {
  return h('section', { class: 'task-panel', 'aria-labelledby': 'task-title' },
    h('header', {},
      h('p', { class: 'task-label' }, t('task.importTitle')),
      h('h1', { id: 'task-title' }, spec.title || t('task.untitled'))),
    h('div', { class: 'task-body' },
      h('dl', {},
        h('dt', {}, t('task.gameLabel')), h('dd', {}, t(`task.game.${spec.game}`)),
        h('dt', {}, t('task.limit')), h('dd', {}, limitLine(spec)),
        ...(spec.group ? [h('dt', {}, t('task.groupShort')), h('dd', {}, spec.group)] : [])),
      spec.words.length ? h('p', { class: 'task-words' }, spec.words.slice(0, 20).join(', '), spec.words.length > 20 ? ' …' : '') : null,
      spec.text ? h('p', { class: 'task-text' }, spec.text.length > 160 ? `${spec.text.slice(0, 160)} …` : spec.text) : null),
    ...below);
}
