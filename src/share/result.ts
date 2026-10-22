import { localDate, masterySummary, weakKeys } from '../learning/stats';
import type { Profile, Task } from '../storage/schema';
import { checksum, decode, encode } from './codec';
import { TASK_GROUP_MAX } from './task';

/** What a child hands in after a task. */
export interface TaskResult {
  taskId: string;
  title: string;
  /** The task's group label, when it had one. */
  group?: string;
  name: string;
  /** Local date the task was finished. */
  date: string;
  /** Minutes played, one decimal. */
  minutes: number;
  /** Percent of correct presses. */
  accuracy: number;
  /** Rhythm, correct characters per minute. */
  cpm: number;
  /** Levels the child has finished so far, their current level. */
  levels?: number;
  /** The weakest keys now, with their recent accuracy in percent, weakest first. */
  weak: [string, number][];
}

export const RESULT_WEAK_KEYS = 5;

export function makeResult(p: Profile, task: Task): TaskResult {
  const total = task.chars + task.errors;
  return {
    taskId: task.id,
    title: task.title,
    ...(task.group && { group: task.group }),
    name: p.name,
    date: task.doneAt ?? '',
    minutes: Math.round(task.seconds / 6) / 10,
    accuracy: total ? Math.round((task.chars / total) * 100) : 100,
    cpm: task.cpm,
    levels: Object.keys(p.progress.levels).length,
    weak: weakKeys(p, Object.keys(p.stats.keys), RESULT_WEAK_KEYS).map((k) => [k.key, Math.round(k.accuracy * 100)]),
  };
}

/** Task id of the result that holds a player's whole statistics, so the teacher keeps one row of it per child. */
export const OVERALL_ID = '_overall';

/** All of a player's training in the shape of a task result: all minutes and the accuracy over all recorded sessions. */
export function makeOverallResult(p: Profile, title: string): TaskResult {
  const sessions = p.stats.sessions;
  const chars = sessions.reduce((a, s) => a + s.chars, 0);
  const errors = sessions.reduce((a, s) => a + s.errors, 0);
  return {
    taskId: OVERALL_ID,
    title,
    name: p.name,
    date: localDate(),
    minutes: Math.round(p.progress.trainedSeconds / 6) / 10,
    accuracy: chars + errors ? Math.round((chars / (chars + errors)) * 100) : 100,
    cpm: masterySummary(p).cpm || (sessions[sessions.length - 1]?.cpm ?? 0),
    levels: Object.keys(p.progress.levels).length,
    weak: weakKeys(p, Object.keys(p.stats.keys), RESULT_WEAK_KEYS).map((k) => [k.key, Math.round(k.accuracy * 100)]),
  };
}

/** Fields in a fixed order, so the checksum does not depend on how the object was built. */
/** The group and the levels join the sum only when set, so results without one keep verifying. */
const sumOf = (r: TaskResult) => checksum(JSON.stringify([r.taskId, r.title, r.name, r.date, r.minutes, r.accuracy, r.cpm, r.weak, ...(r.group ? [r.group] : []), ...(r.levels === undefined ? [] : [r.levels])]));

export function resultCode(r: TaskResult): Promise<string> {
  return encode({ app: 'tapkotyper', type: 'result', ...r, sum: sumOf(r) });
}

/** A handed-in result; `intact` is false when the checksum does not match (a broken copy). Throws `share.broken`. */
export async function parseResult(code: string): Promise<{ result: TaskResult; intact: boolean }> {
  const v: any = await decode(code);
  if (v?.app !== 'tapkotyper' || v.type !== 'result') throw new Error('share.broken');
  const str = (x: unknown) => (typeof x === 'string' ? x.slice(0, 80) : '');
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
  const result: TaskResult = {
    taskId: str(v.taskId),
    title: str(v.title),
    ...(str(v.group) && { group: str(v.group).trim().slice(0, TASK_GROUP_MAX) }),
    name: str(v.name),
    date: str(v.date),
    minutes: num(v.minutes),
    accuracy: num(v.accuracy),
    cpm: num(v.cpm),
    ...(typeof v.levels === 'number' && { levels: num(v.levels) }),
    weak: Array.isArray(v.weak) ? v.weak.filter((w: unknown) => Array.isArray(w) && typeof w[0] === 'string').slice(0, RESULT_WEAK_KEYS).map((w: any[]) => [w[0].slice(0, 12), num(w[1])]) : [],
  };
  if (!result.name || !result.taskId) throw new Error('share.broken');
  return { result, intact: v.sum === sumOf(result) };
}
