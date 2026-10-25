import { localDate } from '../learning/stats';
import { OVERALL_ID, type TaskResult } from './result';
import { clear, getAll, openTeacherDb, write } from './teacher-db';

/** Where the teacher's results lived before IndexedDB; removed on sight. */
const OLD_KEY = 'tapkotyper:teacher';

/** Results added to one group this long after a set's first one join that set. */
export const SET_WINDOW_MS = 20 * 60_000;
/** Results whose hand-in is older than a year go, once they have been in this browser this long. */
export const GRACE_MS = 7 * 86_400_000;

export interface StoredResult extends TaskResult {
  /** The hand-in's fingerprint as it came in, its key in the database; it stays when the group changes. */
  id: string;
  /** The checksum matched when the result was added. */
  intact: boolean;
  /** When it came into this browser (ms). */
  addedAt: number;
}

export type SetSource = 'scan' | 'link' | 'file';

/** Results that came in together: one camera scan, or links of one group within 20 minutes, or a set of a loaded file. */
export interface ResultSet {
  id: string;
  /** The empty name is "without a group". */
  group: string;
  start: number;
  end: number;
  source: SetSource;
  /** The fingerprints of its results. */
  results: string[];
}

/** A `.tapko` file loaded here. */
export interface LoadedFile {
  name: string;
  loadedAt: number;
  /** The hand-in dates inside, oldest and newest. */
  from: string;
  to: string;
  groups: string[];
  results: number;
  /** How many of them were new here. */
  added: number;
}

/** A hash of what a hand-in says: the same hand-in from any source has the same one. */
export function fingerprint(r: TaskResult): string {
  // The removed password joins only when set, so earlier hand-ins keep their fingerprint.
  const text = JSON.stringify([r.taskId, r.name, r.group ?? '', r.date, r.minutes, r.accuracy, r.cpm, r.levels ?? null, r.weak, ...(r.lockRemoved ? ['lockRemoved'] : [])]);
  // cyrb53: 53 bits are plenty for a class's hand-ins.
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** The local date `months` and `days` before `now`; hand-ins dated before it are older. */
export function dateBefore(now: number, months: number, days = 0): string {
  const d = new Date(now);
  d.setMonth(d.getMonth() - months, d.getDate() - days);
  return localDate(d);
}

/** A hand-in older than a year. */
export const isOld = (r: TaskResult, now: number): boolean => r.date < dateBefore(now, 12);

/** Accuracy in percent from which a child has mastered the task (two stars in the game). */
export const MASTERED = 85;

export const mastered = (r: Pick<TaskResult, 'accuracy'>): boolean => r.accuracy >= MASTERED;

export type SortKey = 'child' | 'date' | 'minutes' | 'accuracy' | 'rhythm' | 'levels' | 'status';
export type WriterKey = SortKey | 'group' | 'handIns';
export interface Sort<K extends string = SortKey> { key: K; desc: boolean }

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
export function nextSort<K extends string>(now: Sort<K>, key: K): Sort<K> {
  return now.key === key ? { key, desc: !now.desc } : { key, desc: key !== 'child' && key !== 'status' && key !== 'group' };
}

/** One child: two children of one name in two groups stay apart. */
export const childKey = (r: Pick<TaskResult, 'group' | 'name'>): string => `${r.group ?? ''}\u0000${r.name}`;

/** Newest first: by hand-in date, then by when it came in. */
const newestFirst = (a: StoredResult, b: StoredResult) => b.date.localeCompare(a.date) || b.addedAt - a.addedAt;

/** The newest hand-in of each child and task, for the tables that count a child's task once. */
export function newest(rows: StoredResult[]): StoredResult[] {
  const best = new Map<string, StoredResult>();
  for (const r of rows) {
    const k = `${childKey(r)}\u0000${r.taskId}`;
    const was = best.get(k);
    if (!was || newestFirst(r, was) < 0) best.set(k, r);
  }
  return [...best.values()];
}

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

/** One writer over all hand-ins: the summary of the newest per task, and how the hand-ins moved. */
export interface Writer extends ChildSummary {
  key: string;
  name: string;
  group?: string;
  /** Every hand-in, newest first. */
  rows: StoredResult[];
  last: string;
  /** From the first hand-in to the last; 0 with one hand-in. */
  accuracyChange: number;
  cpmChange: number;
  mastered: boolean;
  intact: boolean;
  /** One of the hand-ins says the service menu removed the settings password. */
  lockRemoved: boolean;
}

export function writer(rows: StoredResult[]): Writer {
  const all = [...rows].sort(newestFirst);
  const sum = childSummary(newest(all).sort(newestFirst));
  const [last, first] = [all[0], all[all.length - 1]];
  return {
    ...sum,
    key: childKey(last),
    name: last.name,
    ...(last.group && { group: last.group }),
    rows: all,
    last: last.date,
    accuracyChange: last.accuracy - first.accuracy,
    cpmChange: last.cpm - first.cpm,
    mastered: mastered(sum),
    intact: all.every((r) => r.intact),
    lockRemoved: all.some((r) => r.lockRemoved),
  };
}

const WRITER_VALUE: Record<Exclude<WriterKey, 'child' | 'group'>, (w: Writer) => string | number> = {
  handIns: (w) => w.rows.length,
  date: (w) => w.last,
  minutes: (w) => w.minutes,
  accuracy: (w) => w.accuracy,
  rhythm: (w) => w.cpm,
  levels: (w) => w.levels ?? -1,
  status: (w) => (w.mastered ? 1 : 0),
};

/** Writers in the order of `sort`, ties by name. */
export function sortWriters(list: Writer[], sort: Sort<WriterKey>): Writer[] {
  const by = (a: Writer, b: Writer) => {
    if (sort.key === 'child') return a.name.localeCompare(b.name);
    if (sort.key === 'group') return (a.group ?? '￿').localeCompare(b.group ?? '￿');
    const x = WRITER_VALUE[sort.key](a), y = WRITER_VALUE[sort.key](b);
    return x < y ? -1 : x > y ? 1 : 0;
  };
  return [...list].sort((a, b) => (sort.desc ? -by(a, b) : by(a, b)) || a.name.localeCompare(b.name));
}

const randomId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/**
 * The teacher's hand-ins, sets and loaded files, kept in IndexedDB in this browser only.
 * `load()` reads them all once and drops what is old; the changes then land in memory at once
 * and are written in the background, record by record.
 */
export class TeacherStore {
  results: StoredResult[] = [];
  sets: ResultSet[] = [];
  files: LoadedFile[] = [];
  /** False when the browser blocks IndexedDB: the results last for this visit only. */
  kept = true;
  private db: IDBDatabase | null = null;
  private writes: Promise<void> = Promise.resolve();
  private persistAsked = false;
  /** The sets of the running camera scan, by group: one scan is one set, however long. */
  private scan: Map<string, ResultSet> | null = null;

  constructor(private idb: IDBFactory | null = globalThis.indexedDB ?? null) {}

  async load(now = Date.now()): Promise<void> {
    try { globalThis.localStorage?.removeItem(OLD_KEY); } catch { /* blocked storage */ }
    this.db = await openTeacherDb(this.idb);
    this.kept = !!this.db;
    if (!this.db) return;
    try {
      const [results, sets, files] = await Promise.all([
        getAll<StoredResult & { child: string }>(this.db, 'results'),
        getAll<ResultSet>(this.db, 'sets'),
        getAll<LoadedFile>(this.db, 'files'),
      ]);
      this.results = results.map(({ child: _, ...r }) => r);
      this.sets = sets;
      this.files = files.sort((a, b) => b.loadedAt - a.loadedAt);
    } catch { this.results = []; this.sets = []; this.files = []; }
    // Older than a year goes, but what was just loaded stays its 7 days.
    this.removeMany(this.results.filter((r) => isOld(r, now) && now - r.addedAt >= GRACE_MS));
  }

  /** Resolves once every change so far is written. */
  saved(): Promise<void> {
    return this.writes;
  }

  private queue(job: (db: IDBDatabase) => Promise<unknown>): void {
    const db = this.db;
    if (!db) return;
    if (!this.persistAsked) {
      this.persistAsked = true;
      // So the browser does not clear the results on its own when space runs low.
      void navigator.storage?.persist?.().catch(() => undefined);
    }
    this.writes = this.writes.then(() => job(db)).then(() => undefined, () => { /* full or blocked: kept for this visit */ });
  }

  private save(put: StoredResult[], drop: string[] = [], sets: ResultSet[] = [], dropSets: string[] = []): void {
    const records = put.map((r) => ({ ...r, child: childKey(r) }));
    this.queue(async (db) => {
      if (put.length || drop.length) await write(db, 'results', records, drop);
      if (sets.length || dropSets.length) await write(db, 'sets', sets.map((x) => ({ ...x, results: [...x.results] })), dropSets);
    });
  }

  /** A camera scan starts: what it adds forms one set per group until `endScan`. */
  beginScan(): void {
    this.scan = new Map();
  }

  endScan(): void {
    this.scan = null;
  }

  /** The set a new result of `group` joins: the scan's, or a link set started less than 20 minutes ago, or a new one. */
  private setFor(group: string, now: number): ResultSet {
    let set = this.scan ? this.scan.get(group) : this.sets.filter((s) => s.source === 'link' && s.group === group && now - s.start <= SET_WINDOW_MS).sort((a, b) => b.start - a.start)[0];
    if (!set) {
      set = { id: randomId(), group, start: now, end: now, source: this.scan ? 'scan' : 'link', results: [] };
      this.sets.push(set);
      this.scan?.set(group, set);
    }
    return set;
  }

  /**
   * Adds a hand-in, into `group` when given (a scan's group), else its own; one without any keeps
   * the group the teacher gave that child. Null when this hand-in is here already.
   */
  add(r: TaskResult, intact: boolean, group?: string, now = Date.now()): StoredResult | null {
    const id = fingerprint(r);
    if (this.results.some((x) => x.id === id)) return null;
    const own = group || r.group || this.knownGroup(r.name);
    const { group: _, ...rest } = r;
    const next: StoredResult = { ...rest, ...(own && { group: own }), id, intact, addedAt: now };
    const set = this.setFor(own ?? '', now);
    set.results.push(id);
    set.end = Math.max(set.end, now);
    this.results.push(next);
    this.save([next], [], [set]);
    return next;
  }

  /** The one group the hand-ins of `name` are in; none when there are none or several. */
  private knownGroup(name: string): string | undefined {
    const groups = new Set(this.results.filter((x) => x.name === name).map((x) => x.group ?? ''));
    return groups.size === 1 ? [...groups][0] || undefined : undefined;
  }

  remove(r: StoredResult): void {
    this.removeMany([r]);
  }

  /** Removes the results, and the sets left empty. */
  removeMany(rows: StoredResult[]): void {
    if (!rows.length) return;
    const gone = new Set(rows.map((r) => r.id));
    this.results = this.results.filter((x) => !gone.has(x.id));
    const touched = this.sets.filter((s) => s.results.some((id) => gone.has(id)));
    for (const s of touched) s.results = s.results.filter((id) => !gone.has(id));
    const empty = touched.filter((s) => !s.results.length);
    this.sets = this.sets.filter((s) => !empty.includes(s));
    this.save([], [...gone], touched.filter((s) => s.results.length), empty.map((s) => s.id));
  }

  /** Puts the chosen rows into a group (an empty name clears it); a set whose results all moved moves too. */
  assign(rows: StoredResult[], group: string): void {
    for (const r of rows) {
      if (group) r.group = group;
      else delete r.group;
    }
    const ids = new Set(rows.map((r) => r.id));
    const moved = this.sets.filter((s) => s.results.some((id) => ids.has(id)) && this.setResults(s).every((r) => (r.group ?? '') === group));
    for (const s of moved) s.group = group;
    this.save(rows, [], moved);
  }

  /** The group names in use, sorted. */
  groups(): string[] {
    return [...new Set(this.results.map((r) => r.group).filter((g): g is string => !!g))].sort((a, b) => a.localeCompare(b));
  }

  setResults(set: ResultSet): StoredResult[] {
    const ids = new Set(set.results);
    return this.results.filter((r) => ids.has(r.id));
  }

  /** The set a result came in with. */
  setOf(r: StoredResult): ResultSet | undefined {
    return this.sets.find((s) => s.results.includes(r.id));
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

  /** One child's hand-ins, newest first. */
  childResults(key: string): StoredResult[] {
    return this.results.filter((r) => childKey(r) === key).sort(newestFirst);
  }

  /** Every writer of `rows`. */
  writers(rows: StoredResult[] = this.results): Writer[] {
    const by = new Map<string, StoredResult[]>();
    for (const r of rows) by.set(childKey(r), [...(by.get(childKey(r)) ?? []), r]);
    return [...by.values()].map(writer);
  }

  /** What deleting the hand-ins dated before `date` takes: the results, and the sets it leaves empty. */
  olderThan(date: string): { results: StoredResult[]; sets: ResultSet[] } {
    const results = this.results.filter((r) => r.date < date);
    const ids = new Set(results.map((r) => r.id));
    return { results, sets: this.sets.filter((s) => s.results.length && s.results.every((id) => ids.has(id))) };
  }

  /** Everything goes, the list of loaded files too. */
  clearAll(): void {
    this.results = [];
    this.sets = [];
    this.files = [];
    this.queue((db) => clear(db, ['results', 'sets', 'files']));
  }

  /**
   * Takes in the sets and results of a `.tapko` file: a hand-in already here is skipped, a set
   * already here gets only what it lacks, results of no set form a new one per group. Returns what
   * was added and how many of those are older than a year.
   */
  importFile(name: string, sets: ResultSet[], results: StoredResult[], now = Date.now()): { added: number; old: number } {
    const have = new Set(this.results.map((r) => r.id));
    const fresh = results.filter((r) => !have.has(r.id) && have.add(r.id)).map((r) => ({ ...r, addedAt: now }));
    const freshIds = new Set(fresh.map((r) => r.id));
    const touched: ResultSet[] = [];
    const placed = new Set<string>();
    for (const s of sets) {
      const ids = s.results.filter((id) => freshIds.has(id) && !placed.has(id));
      if (!ids.length) continue;
      ids.forEach((id) => placed.add(id));
      let set = this.sets.find((x) => x.id === s.id);
      if (set) set.results.push(...ids);
      else this.sets.push(set = { ...s, source: 'file', results: ids });
      touched.push(set);
    }
    for (const r of fresh.filter((x) => !placed.has(x.id))) {
      let set = touched.find((s) => s.source === 'file' && s.start === now && s.group === (r.group ?? ''));
      if (!set) {
        this.sets.push(set = { id: randomId(), group: r.group ?? '', start: now, end: now, source: 'file', results: [] });
        touched.push(set);
      }
      set.results.push(r.id);
    }
    this.results.push(...fresh);
    const dates = results.map((r) => r.date).sort();
    const file: LoadedFile = { name, loadedAt: now, from: dates[0] ?? '', to: dates[dates.length - 1] ?? '', groups: [...new Set(results.map((r) => r.group ?? ''))].sort(), results: results.length, added: fresh.length };
    this.files.unshift(file);
    this.save(fresh, [], touched);
    this.queue((db) => write(db, 'files', [file]));
    return { added: fresh.length, old: fresh.filter((r) => isOld(r, now)).length };
  }

  /** CSV for a spreadsheet of `rows` (all by default); `head` are the translated column names, `names` the key and status words. */
  csv(head: string[], names: { key: (k: string) => string; status: (ok: boolean) => string }, rows: StoredResult[] = this.results, sort?: Sort): string {
    const cell = (v: string | number) => (/[",;\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const body = this.sorted(rows, sort).map((r) => [r.group ?? '', r.title, r.name, r.date, r.minutes, r.accuracy, r.cpm, r.levels ?? '', names.status(mastered(r)), r.weak.map(([k, a]) => `${names.key(k)} ${a} %`).join(', '), r.intact ? '' : '!']);
    return [head, ...body].map((row) => row.map(cell).join(',')).join('\n');
  }
}
