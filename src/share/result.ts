import { localDate, masterySummary, weakKeys } from '../learning/stats';
import type { Profile } from '../storage/schema';
import { nickname } from '../storage/store';
import { checksum, decode, encode, hash53 } from './codec';
import { type FinishedTask, TASK_GROUP_MAX, runAccuracy } from './task';

/** What a typist hands in after a task. */
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
  /** The super player removed or changed the settings password on the child's device without the current one. */
  lockRemoved?: true;
  /** The player's hidden id, a hash of the profile's id: one child's results stay together whatever name or group they carry. */
  pid?: string;
  /** Which finished run of the task it is, 1 for the first; with `pid` and the task it names one hand-in. */
  try?: number;
}

export const RESULT_WEAK_KEYS = 5;

/** The mentor sees the real name, or the nickname of a player without one. */
const mentorName = (p: Profile): string => p.name || nickname(p);

const PID_LENGTH = 6;
/** The hidden id a player's results carry: the same on every result, telling nothing of the profile. */
export const playerId = (profileId: string): string => hash53(`pid:${profileId}`).padStart(PID_LENGTH, '0').slice(0, PID_LENGTH);

/** The result of a finished task's best run. `lockRemoved`: the super player removed or changed the device's settings password (`StoreData.lockRemovedAt`). */
export function makeResult(p: Profile, task: FinishedTask, lockRemoved = false): TaskResult {
  const best = task.best;
  return {
    taskId: task.id,
    title: task.title,
    ...(task.group && { group: task.group }),
    name: mentorName(p),
    date: best.doneAt,
    minutes: Math.round(best.seconds / 6) / 10,
    accuracy: runAccuracy(best),
    cpm: best.cpm,
    levels: Object.keys(p.progress.levels).length,
    weak: weakKeys(p, Object.keys(p.stats.keys), RESULT_WEAK_KEYS).map((k) => [k.key, Math.round(k.accuracy * 100)]),
    ...(lockRemoved && { lockRemoved: true }),
    pid: playerId(p.id),
    try: best.try,
  };
}

/** Task id of the result that holds a player's whole statistics, so the teacher keeps one row of it per child. */
export const OVERALL_ID = '_overall';

/** All of a player's training in the shape of a task result: all minutes and the accuracy over all recorded sessions. */
export function makeOverallResult(p: Profile, title: string, lockRemoved = false): TaskResult {
  const sessions = p.stats.sessions;
  const chars = sessions.reduce((a, s) => a + s.chars, 0);
  const errors = sessions.reduce((a, s) => a + s.errors, 0);
  return {
    taskId: OVERALL_ID,
    title,
    name: mentorName(p),
    date: localDate(),
    minutes: Math.round(p.progress.trainedSeconds / 6) / 10,
    accuracy: chars + errors ? Math.round((chars / (chars + errors)) * 100) : 100,
    cpm: masterySummary(p).cpm || (sessions[sessions.length - 1]?.cpm ?? 0),
    levels: Object.keys(p.progress.levels).length,
    weak: weakKeys(p, Object.keys(p.stats.keys), RESULT_WEAK_KEYS).map((k) => [k.key, Math.round(k.accuracy * 100)]),
    ...(lockRemoved && { lockRemoved: true }),
    pid: playerId(p.id),
  };
}

/**
 * Fields in a fixed order, so the checksum does not depend on how the object was built. The group, the levels, the
 * removed password, the player id and the run join the sum only when set, so results without one keep verifying.
 */
export const resultSum = (r: TaskResult): string => checksum(JSON.stringify([r.taskId, r.title, r.name, r.date, r.minutes, r.accuracy, r.cpm, r.weak, ...(r.group ? [r.group] : []), ...(r.levels === undefined ? [] : [r.levels]), ...(r.lockRemoved ? ['lockRemoved'] : []),
  ...(r.pid ? [`pid:${r.pid}`] : []), ...(r.try === undefined ? [] : [`try:${r.try}`])]));

export function resultCode(r: TaskResult): Promise<string> {
  return encode({ app: 'tapkotyper', type: 'result', ...r, sum: resultSum(r) });
}

/** The fields of a result from untrusted data, trimmed to their limits; null without a name or task. */
export function cleanResult(v: any): TaskResult | null {
  const str = (x: unknown) => (typeof x === 'string' ? x.slice(0, 80) : '');
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
  const result: TaskResult = {
    taskId: str(v?.taskId),
    title: str(v?.title),
    ...(str(v?.group).trim() && { group: str(v.group).trim().slice(0, TASK_GROUP_MAX) }),
    name: str(v?.name),
    date: str(v?.date),
    minutes: num(v?.minutes),
    accuracy: num(v?.accuracy),
    cpm: num(v?.cpm),
    ...(typeof v?.levels === 'number' && { levels: num(v.levels) }),
    weak: Array.isArray(v?.weak) ? v.weak.filter((w: unknown) => Array.isArray(w) && typeof w[0] === 'string').slice(0, RESULT_WEAK_KEYS).map((w: any[]) => [w[0].slice(0, 12), num(w[1])]) : [],
    ...(v?.lockRemoved === true && { lockRemoved: true }),
    ...(typeof v?.pid === 'string' && /^[0-9a-z]{6}$/.test(v.pid) && { pid: v.pid }),
    ...(Number.isInteger(v?.try) && v.try > 0 && { try: v.try }),
  };
  return result.name && result.taskId ? result : null;
}

/** A handed-in result; `intact` is false when the checksum does not match (a broken copy). Throws `share.broken`. */
export async function parseResult(code: string): Promise<{ result: TaskResult; intact: boolean }> {
  const v: any = await decode(code);
  if (v?.app !== 'tapkotyper' || v.type !== 'result') throw new Error('share.broken');
  const result = cleanResult(v);
  if (!result) throw new Error('share.broken');
  return { result, intact: v.sum === resultSum(result) };
}
