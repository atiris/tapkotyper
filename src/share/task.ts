import type { NotedTask, Profile, Task, TaskGame, TaskLimit, TaskRun, TaskSpec, TeacherTask } from '../storage/schema';
import { localDate } from '../learning/stats';
import { OWN_TEXT_MAX, parseOwnWords } from '../words/words';
import { decode, encode } from './codec';

export const TASK_TITLE_MAX = 60;
export const TASK_GROUP_MAX = 20;
export const TASK_MINUTES: [number, number] = [1, 30];
export const TASK_GAMES: TaskGame[] = ['chase', 'catch', 'copy', 'ribbon', 'transcribe'];
export const TASK_LIMITS: TaskLimit[] = ['time', 'text', 'both'];
/** Tasks a profile keeps; the oldest go first. */
export const TASKS_MAX = 30;
/** Tasks the teacher page keeps; the oldest go first. */
export const TEACHER_TASKS_MAX = 100;
/** Tasks a phone keeps noted. */
export const NOTED_MAX = 20;

/** The games that play the task's words; the others play its text. */
export const wordsGame = (game: TaskGame): boolean => game === 'chase' || game === 'catch';

export const newTaskId = (): string => Math.random().toString(36).slice(2, 8) + Date.now().toString(36);

export function taskCode(spec: TaskSpec): Promise<string> {
  return encode({ app: 'tapkotyper', type: 'task', ...specOf(spec) });
}

/** Only the fields of the spec, whatever else the object holds (a player's play, the teacher's date). */
function specOf(x: TaskSpec): TaskSpec {
  const { id, title, group, game, words, text, limit, minutes, dictionary, knownOnly, world } = x;
  return { id, title, ...(group && { group }), game, words, text, limit, minutes, dictionary, knownOnly, world };
}

/** A task from a link, cleaned like the parent's own content; the source its game does not use is dropped. Throws `share.broken`. */
export async function parseTask(code: string): Promise<TaskSpec> {
  const v: any = await decode(code);
  if (v?.app !== 'tapkotyper' || v.type !== 'task' || typeof v.id !== 'string' || typeof v.title !== 'string' || !TASK_GAMES.includes(v.game)) throw new Error('share.broken');
  const game: TaskGame = v.game;
  const words = wordsGame(game) && Array.isArray(v.words) ? parseOwnWords(v.words.filter((w: unknown) => typeof w === 'string').join('\n')) : [];
  const text = !wordsGame(game) && typeof v.text === 'string' ? v.text.slice(0, OWN_TEXT_MAX).trim() : '';
  if (!words.length && !text) throw new Error('share.broken');
  const group = typeof v.group === 'string' ? v.group.trim().slice(0, TASK_GROUP_MAX) : '';
  return {
    id: v.id.slice(0, 40),
    title: v.title.trim().slice(0, TASK_TITLE_MAX),
    ...(group && { group }),
    game,
    words,
    text,
    limit: TASK_LIMITS.includes(v.limit) ? v.limit : 'time',
    minutes: Math.round(Math.min(TASK_MINUTES[1], Math.max(TASK_MINUTES[0], Number(v.minutes) || 5))),
    dictionary: v.dictionary !== false,
    knownOnly: v.knownOnly !== false,
    world: v.world === 'random' ? 'random' : 'current',
  };
}

/** Gives a task to a player, on top; the same task again only refreshes what the teacher made and keeps its runs. */
export function addTask(p: Profile, spec: TaskSpec): Task {
  const had = p.tasks.find((x) => x.id === spec.id);
  const clean = specOf(spec);
  const task: Task = had ? { ...had, group: undefined, ...clean } : { ...clean, finished: 0 };
  if (!task.group) delete task.group;
  p.tasks = [task, ...p.tasks.filter((x) => x !== had)].slice(0, TASKS_MAX);
  return task;
}

/** A task with a finished run, the one handed in. */
export type FinishedTask = Task & { best: TaskRun };
export const isFinished = (task: Task): task is FinishedTask => !!task.best;

/** The task the map offers: the newest one never finished. */
export function activeTask(p: Profile): Task | null {
  return p.tasks.find((x) => !x.best) ?? null;
}

/** Correct characters in percent of all typed, rounded as the result shows it. */
export function runAccuracy(r: { chars: number; errors: number }): number {
  const total = r.chars + r.errors;
  return total ? Math.round((r.chars / total) * 100) : 100;
}

/** A finished run is better than another: higher accuracy, at equal accuracy a higher rhythm. */
export function betterRun(a: TaskRun, b: TaskRun): boolean {
  const accA = runAccuracy(a), accB = runAccuracy(b);
  return accA !== accB ? accA > accB : a.cpm > b.cpm;
}

/**
 * Records a finished run of the task (a task is played in one sitting, its limit ends it); it
 * becomes the best when it is the first or better. True when it did.
 */
export function recordTaskRun(task: Task, r: { seconds: number; chars: number; errors: number; cpm: number }): boolean {
  task.finished += 1;
  const run: TaskRun = { seconds: Math.round(r.seconds), chars: r.chars, errors: r.errors, cpm: r.cpm, doneAt: localDate(), try: task.finished };
  const better = !task.best || betterRun(run, task.best);
  if (better) task.best = run;
  return better;
}

/** The teacher's list with a task made or edited: an edit keeps its row and date, a new one goes on top. */
export function keepTeacherTask(list: TeacherTask[], spec: TaskSpec, now = Date.now()): TeacherTask[] {
  const had = list.find((x) => x.id === spec.id);
  const task: TeacherTask = { ...specOf(spec), madeAt: had?.madeAt ?? now };
  return had ? list.map((x) => (x === had ? task : x)) : [task, ...list].slice(0, TEACHER_TASKS_MAX);
}

/** The phone's noted tasks with one more on top; the same code again only moves to the top. */
export function noteTask(list: NotedTask[], code: string, title: string, now = Date.now()): NotedTask[] {
  return [{ code, title, at: now }, ...list.filter((x) => x.code !== code)].slice(0, NOTED_MAX);
}
