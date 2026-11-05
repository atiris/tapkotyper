import { cleanResult, resultSum } from './result';
import { TASK_GROUP_MAX } from './task';
import { type ResultSet, type StoredResult, fingerprint } from './teacher';

/** The mentor's results as one file, to carry from a phone to a computer without a server. */
export const TAPKO_FORMAT = 'tapkotyper-mentor';
export const TAPKO_VERSION = 1;
export const TAPKO_TYPE = 'application/x-tapkotyper';

const two = (n: number) => String(n).padStart(2, '0');
/** `tt-YYYYMMDDHHMMSS.tapko` in local time. */
export function tapkoName(now = Date.now()): string {
  const d = new Date(now);
  return `tt-${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}${two(d.getHours())}${two(d.getMinutes())}${two(d.getSeconds())}.tapko`;
}

/** The file's text: the sets and their results, each result with its student and a checksum of its fields as they are now. */
export function tapkoFile(sets: ResultSet[], results: StoredResult[], now = Date.now()): string {
  const ids = new Set(results.map((r) => r.id));
  return JSON.stringify({
    format: TAPKO_FORMAT,
    version: TAPKO_VERSION,
    exportedAt: new Date(now).toISOString(),
    sets: sets.map((s) => ({ ...s, results: s.results.filter((id) => ids.has(id)) })).filter((s) => s.results.length),
    results: results.map(({ addedAt: _, from: __, ...r }) => ({ ...r, sum: resultSum(r) })),
  });
}

/** Reads a `.tapko` file; throws `teacher.file.unknown` for another format or version, `share.broken` for a damaged one. */
export function parseTapko(text: string): { sets: ResultSet[]; results: StoredResult[] } {
  let v: any;
  try { v = JSON.parse(text); } catch { throw new Error('teacher.file.unknown'); }
  if (v?.format !== TAPKO_FORMAT || v.version !== TAPKO_VERSION) throw new Error('teacher.file.unknown');
  if (!Array.isArray(v.results) || !Array.isArray(v.sets)) throw new Error('share.broken');
  const results: StoredResult[] = v.results.flatMap((x: any) => {
    const r = cleanResult(x);
    if (!r) return [];
    const id = typeof x.id === 'string' && /^[0-9a-z]{1,16}$/.test(x.id) ? x.id : fingerprint(r);
    const student = typeof x.student === 'string' && x.student ? x.student.slice(0, 120) : `${r.group ?? ''}\u0000${r.name}`;
    // A result keeps its own check: one changed in the file shows as damaged.
    return [{ ...r, id, intact: x.intact === true && x.sum === resultSum(r), addedAt: 0, student, from: [] }];
  });
  const ids = new Set(results.map((r) => r.id));
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
  const sets: ResultSet[] = v.sets.flatMap((s: any) => (typeof s?.id === 'string' && Array.isArray(s.results) ? [{
    id: s.id.slice(0, 40),
    group: typeof s.group === 'string' ? s.group.trim().slice(0, TASK_GROUP_MAX) : '',
    start: num(s.start),
    end: num(s.end),
    source: 'file' as const,
    results: s.results.filter((id: unknown): id is string => typeof id === 'string' && ids.has(id)),
  }] : []));
  return { sets, results };
}
