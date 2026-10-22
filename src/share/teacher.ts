import type { TaskResult } from './result';

/** The teacher's collected results live apart from the players, in this browser only. */
export const TEACHER_KEY = 'tapkotyper:teacher';

export interface StoredResult extends TaskResult {
  /** The checksum matched when the result was added. */
  intact: boolean;
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

  /** Results by group (none last), then task, then child. */
  sorted(rows: StoredResult[] = this.results): StoredResult[] {
    return [...rows].sort((a, b) => (a.group ? 0 : 1) - (b.group ? 0 : 1) || (a.group ?? '').localeCompare(b.group ?? '') || a.title.localeCompare(b.title) || a.taskId.localeCompare(b.taskId) || a.name.localeCompare(b.name));
  }

  /** CSV for a spreadsheet of `rows` (all by default); `head` are the translated column names. */
  csv(head: string[], keyName: (k: string) => string, rows: StoredResult[] = this.results): string {
    const cell = (v: string | number) => (/[",;\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const body = this.sorted(rows).map((r) => [r.group ?? '', r.title, r.name, r.date, r.minutes, r.accuracy, r.cpm, r.weak.map(([k, a]) => `${keyName(k)} ${a} %`).join(', '), r.intact ? '' : '!']);
    return [head, ...body].map((row) => row.map(cell).join(',')).join('\n');
  }
}
