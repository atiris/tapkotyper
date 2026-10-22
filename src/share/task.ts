import type { Profile, Task, TaskKind } from '../storage/schema';
import { localDate } from '../learning/stats';
import { OWN_SHARE, OWN_TEXT_MAX, type WordSourceOwn, parseOwnWords } from '../words/words';
import { decode, encode } from './codec';

/** What a task link carries: the task without the child's play. */
export type TaskSpec = Pick<Task, 'id' | 'title' | 'words' | 'text' | 'minutes' | 'kind' | 'group'>;

export const TASK_TITLE_MAX = 60;
export const TASK_GROUP_MAX = 20;
export const TASK_MINUTES: [number, number] = [1, 20];
/** Tasks a profile keeps; the oldest go first. */
export const TASKS_MAX = 10;
/** Seconds a run may fall short of the task's time and still finish it (pauses round down). */
const TASK_SLACK = 2;

export function taskCode(spec: TaskSpec): Promise<string> {
  return encode({ app: 'tapkotyper', type: 'task', ...spec });
}

/** A task from a link, cleaned like the parent's own content. Throws `share.broken`. */
export async function parseTask(code: string): Promise<TaskSpec> {
  const v: any = await decode(code);
  if (v?.app !== 'tapkotyper' || v.type !== 'task' || typeof v.id !== 'string' || typeof v.title !== 'string') throw new Error('share.broken');
  const words = Array.isArray(v.words) ? parseOwnWords(v.words.filter((w: unknown) => typeof w === 'string').join('\n')) : [];
  const text = typeof v.text === 'string' ? v.text.slice(0, OWN_TEXT_MAX).trim() : '';
  if (!words.length && !text) throw new Error('share.broken');
  const minutes = Math.round(Math.min(TASK_MINUTES[1], Math.max(TASK_MINUTES[0], Number(v.minutes) || 5)));
  const kind: TaskKind = v.kind === 'story' ? 'story' : 'practice';
  const group = typeof v.group === 'string' ? v.group.trim().slice(0, TASK_GROUP_MAX) : '';
  return { id: v.id.slice(0, 40), title: v.title.trim().slice(0, TASK_TITLE_MAX), words, text, minutes, kind, ...(group && { group }) };
}

/** Gives a task to a player; the same task again keeps what was played of it. */
export function addTask(p: Profile, spec: TaskSpec): Task {
  const had = p.tasks.find((x) => x.id === spec.id);
  const task: Task = had ? { ...had, ...spec } : { ...spec, seconds: 0, chars: 0, errors: 0, cpm: 0 };
  p.tasks = [task, ...p.tasks.filter((x) => x !== had)].slice(0, TASKS_MAX);
  return task;
}

/** The task the map offers: the newest unfinished one. */
export function activeTask(p: Profile): Task | null {
  return p.tasks.find((x) => !x.doneAt) ?? null;
}

/** Seconds of the task still to play. */
export function taskLeft(task: Task): number {
  return Math.max(0, task.minutes * 60 - task.seconds);
}

/** Adds one finished run to its task; true when this run finished the task. */
export function recordTaskRun(task: Task, r: { seconds: number; chars: number; errors: number; cpm: number }): boolean {
  if (task.doneAt) return false;
  task.seconds += Math.round(r.seconds);
  task.chars += r.chars;
  task.errors += r.errors;
  if (r.cpm > 0) task.cpm = r.cpm;
  if (taskLeft(task) > TASK_SLACK) return false;
  task.doneAt = localDate();
  return true;
}

/** The task's words and text as the levels' own content: practice only them, story levels mostly. */
export function taskOwn(task: Task): WordSourceOwn {
  return { words: task.words, text: task.text, share: task.kind === 'practice' ? 1 : OWN_SHARE.most };
}
