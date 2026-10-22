import { OVERALL_ID, type TaskResult } from './result';

/** The teacher's collected results live apart from the players, in this browser only. */
export const TEACHER_KEY = 'tapkotyper:teacher';

export interface StoredResult extends TaskResult {
  /** The checksum matched when the result was added. */
  intact: boolean;
}

/** Accuracy in percent from which a child has mastered the task (two stars in the game). */
export const MASTERED = 85;

export const mastered = (r: TaskResult): boolean => r.accuracy >= MASTERED;

export type SortKey = 'child' | 'date' | 'minutes' | 'accuracy' | 'rhythm' | 'levels' | 'status';
export interface Sort { key: SortKey; desc: boolean }

/** The order of the children inside a task; ascending status puts "practice more" first. */
const SORT_VALUE: Record<Exclude<SortKey, 'child'>, (r: StoredResult) => string | number> = {
  date: (r) => r.date,
  minutes: (r) => r.minutes,
  accuracy: (r) => r.accuracy,
  rhythm: (r) => r.cpm,
  levels: (r) => r.levels ?? -1,
  status: (r) => (mastered(r) ? 1 : 0),
};

/** A click on a sort key: the first one sorts numbers and dates from the highest, names and status from the top; a second flips. */
export function nextSort(now: Sort, key: SortKey): Sort {
  return now.key === key ? { key, desc: !now.desc } : { key, desc: key !== 'child' && key !== 'status' };
}

/** One child: two children of one name in two groups stay apart. */
export const childKey = (r: Pick<TaskResult, 'group' | 'name'>): string => `${r.group ?? ''}\u0000${r.name}`;

export interface ChildSummary {
  accuracy: number;
  cpm: number;
  minutes: number;
  /** From the newest result with the whole statistics; none without one. */
  levels?: number;
  /** The four weakest keys over all results, each at its lowest accuracy. */
  weak: [string, number][];
}

/** What one child's results say together; `rows` are that child's results, newest first. */
export function childSummary(rows: TaskResult[]): ChildSummary {
  const avg = (pick: (r: TaskResult) => number) => (rows.length ? Math.round(rows.reduce((a, r) => a + pick(r), 0) / rows.length) : 0);
  const lowest = new Map<string, number>();
  for (const r of rows) for (const [k, a] of r.weak) lowest.set(k, Math.min(a, lowest.get(k) ?? Infinity));
  const overall = rows.find((r) => r.taskId === OVERALL_ID);
  return {
    accuracy: avg((r) => r.accuracy),
    cpm: avg((r) => r.cpm),
    minutes: Math.round(rows.reduce((a, r) => a + r.minutes, 0) * 10) / 10,
    ...(overall?.levels !== undefined && { levels: overall.levels }),
    weak: [...lowest].sort((a, b) => a[1] - b[1]).slice(0, 4),
  };
}

export class TeacherStore {
  results: StoredResult[] = [];

  constructor(private local: Storage | undefined = globalThis.localStorage) {
    try {
      const raw = JSON.parse(local?.getItem(TEACHER_KEY) ?? 'null');
      if (raw?.version === 1 && Array.isArray(raw.results)) this.results = raw.results;
    } catch { this.results = []; }
  }

  save(): void {
    try { this.local?.setItem(TEACHER_KEY, JSON.stringify({ version: 1, results: this.results })); } catch { /* full or blocked storage: kept for this visit */ }
  }

  /**
   * Adds a result; the same child's result of the same task replaces the older one and keeps a
   * group the teacher assigned when the new one has none.
   */
  add(r: TaskResult, intact: boolean): 'added' | 'updated' | 'same' {
    const i = this.results.findIndex((x) => x.taskId === r.taskId && x.name === r.name);
    const old = this.results[i];
    const next: StoredResult = { ...r, intact, ...(!r.group && old?.group && { group: old.group }) };
    if (old && JSON.stringify(old) === JSON.stringify(next)) return 'same';
    if (old) this.results.splice(i, 1);
    this.results.push(next);
    this.save();
    return old ? 'updated' : 'added';
  }

  remove(r: StoredResult): void {
    this.removeMany([r]);
  }

  removeMany(rows: StoredResult[]): void {
    this.results = this.results.filter((x) => !rows.includes(x));
    this.save();
  }

  /** Puts the chosen rows into a group; an empty name clears it. */
  assign(rows: StoredResult[], group: string): void {
    for (const r of rows) {
      if (group) r.group = group;
      else delete r.group;
    }
    this.save();
  }

  /** The group names in use, sorted. */
  groups(): string[] {
    return [...new Set(this.results.map((r) => r.group).filter((g): g is string => !!g))].sort((a, b) => a.localeCompare(b));
  }

  /** Results by group (none last), then task, then the children by `sort` (by name by default; ties by name). */
  sorted(rows: StoredResult[] = this.results, sort: Sort = { key: 'child', desc: false }): StoredResult[] {
    const by = (a: StoredResult, b: StoredResult) => {
      if (sort.key === 'child') return a.name.localeCompare(b.name);
      const x = SORT_VALUE[sort.key](a), y = SORT_VALUE[sort.key](b);
      return x < y ? -1 : x > y ? 1 : 0;
    };
    return [...rows].sort((a, b) => (a.group ? 0 : 1) - (b.group ? 0 : 1) || (a.group ?? '').localeCompare(b.group ?? '') || a.title.localeCompare(b.title) || a.taskId.localeCompare(b.taskId)
      || (sort.desc ? -by(a, b) : by(a, b)) || a.name.localeCompare(b.name));
  }

  /** One child's results, newest first. */
  childResults(key: string): StoredResult[] {
    return this.results.filter((r) => childKey(r) === key).sort((a, b) => b.date.localeCompare(a.date));
  }

  /** CSV for a spreadsheet of `rows` (all by default); `head` are the translated column names, `names` the key and status words. */
  csv(head: string[], names: { key: (k: string) => string; status: (ok: boolean) => string }, rows: StoredResult[] = this.results, sort?: Sort): string {
    const cell = (v: string | number) => (/[",;\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const body = this.sorted(rows, sort).map((r) => [r.group ?? '', r.title, r.name, r.date, r.minutes, r.accuracy, r.cpm, r.levels ?? '', names.status(mastered(r)), r.weak.map(([k, a]) => `${names.key(k)} ${a} %`).join(', '), r.intact ? '' : '!']);
    return [head, ...body].map((row) => row.map(cell).join(',')).join('\n');
  }
}
