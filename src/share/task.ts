import type { NotedTask, Profile, Task, TaskGame, TaskLimit, TaskRun, TaskSpec, TeacherTask } from '../storage/schema';
import { localDate } from '../learning/stats';
import { OWN_TEXT_MAX, type WordSourceOwn, parseOwnWords } from '../words/words';
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
/** Seconds a run may fall short of the task's time and still finish it (pauses round down). */
const TASK_SLACK = 2;

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

/** Gives a task to a player, on top; the same task again only refreshes what the teacher made and keeps what was played. */
export function addTask(p: Profile, spec: TaskSpec): Task {
  const had = p.tasks.find((x) => x.id === spec.id);
  const clean = specOf(spec);
  const task: Task = had ? { ...had, group: undefined, ...clean } : { ...clean, seconds: 0, chars: 0, errors: 0, cpm: 0, finished: 0 };
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

/** Seconds of the run going on still to play. */
export function taskLeft(task: Task): number {
  return Math.max(0, task.minutes * 60 - task.seconds);
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

/** A new run of a finished task starts from zero; the best stays until a better one finishes. */
export function restartTask(task: Task): void {
  task.seconds = task.chars = task.errors = task.cpm = 0;
}

/**
 * Adds one sitting to the run going on; true when it finished the run. A finished run that is
 * better than the best (or the first one) becomes the best, and the next run starts from zero.
 */
export function recordTaskRun(task: Task, r: { seconds: number; chars: number; errors: number; cpm: number }): boolean {
  task.seconds += Math.round(r.seconds);
  task.chars += r.chars;
  task.errors += r.errors;
  if (r.cpm > 0) task.cpm = r.cpm;
  if (taskLeft(task) > TASK_SLACK) return false;
  task.finished += 1;
  const run: TaskRun = { seconds: task.seconds, chars: task.chars, errors: task.errors, cpm: task.cpm, doneAt: localDate(), try: task.finished };
  if (!task.best || betterRun(run, task.best)) task.best = run;
  restartTask(task);
  return true;
}

/** The task's words and text as the levels' own content: only them. */
export function taskOwn(task: Task): WordSourceOwn {
  return { words: task.words, text: task.text, share: 1 };
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
