import { ACCURACY } from '../learning/lessons';
import { localDate } from '../learning/stats';
import { hash53 } from './codec';
import type { TaskResult } from './result';
import { TASK_GROUP_MAX } from './task';
import { clear, getAll, openTeacherDb, replace, write } from './teacher-db';

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
  /** The student it belongs to; every result of one student carries the same group. */
  student: string;
  /** Every way it came in: `scan`, `link` or a loaded file's id; a hand-in that came only from deleted files goes with them. */
  from: string[];
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
  id: string;
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
  // The removed password, the player id and the run join only when set, so earlier hand-ins keep their fingerprint.
  return hash53(JSON.stringify([r.taskId, r.name, r.group ?? '', r.date, r.minutes, r.accuracy, r.cpm, r.levels ?? null, r.weak, ...(r.lockRemoved ? ['lockRemoved'] : []),
    ...(r.pid ? [r.pid] : []), ...(r.try === undefined ? [] : [r.try])]));
}

/** One hand-in whatever it says: the player, the task and the run; none for a result without them. */
const handIn = (r: TaskResult): string | null => (r.pid && r.try !== undefined ? `${r.pid}\u0000${r.taskId}\u0000${r.try}` : null);

/** A group name for comparing: "5a", "5.A" and "5 A" are one group. */
export const foldGroup = (g: string): string => g.toLowerCase().replace(/[\s.]/g, '');

/** A hand-in dated before the local date a year before `now`. */
function isOld(r: TaskResult, now: number): boolean {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() - 1);
  return r.date < localDate(d);
}

/** Accuracy in percent from which a child has mastered the task: the game's lowest step of its accuracy scale. */
export const MASTERED = Math.round(ACCURACY.fair * 100);

export const mastered = (r: Pick<TaskResult, 'accuracy'>): boolean => r.accuracy >= MASTERED;

export type SortKey = 'child' | 'date' | 'minutes' | 'accuracy' | 'speed' | 'levels' | 'status';
export type WriterKey = SortKey | 'group' | 'handIns';
export interface Sort<K extends string = SortKey> { key: K; desc: boolean }

/** The order of the children inside a task; ascending status puts "practice more" first. */
const SORT_VALUE: Record<Exclude<SortKey, 'child'>, (r: StoredResult) => string | number> = {
  date: (r) => r.date,
  minutes: (r) => r.minutes,
  accuracy: (r) => r.accuracy,
  speed: (r) => r.cpm,
  levels: (r) => r.levels ?? -1,
  status: (r) => (mastered(r) ? 1 : 0),
};

/** A click on a sort key: the first one sorts numbers and dates from the highest, names and status from the top; a second flips. */
export function nextSort<K extends string>(now: Sort<K>, key: K): Sort<K> {
  return now.key === key ? { key, desc: !now.desc } : { key, desc: key !== 'child' && key !== 'status' && key !== 'group' };
}

/** Newest first: by hand-in date, then by when it came in. */
const newestFirst = (a: StoredResult, b: StoredResult) => b.date.localeCompare(a.date) || b.addedAt - a.addedAt;

/** The newest hand-in of each child and task, for the tables that count a child's task once. */
export function newest(rows: StoredResult[]): StoredResult[] {
  const best = new Map<string, StoredResult>();
  for (const r of rows) {
    const k = `${r.student}\u0000${r.taskId}`;
    const was = best.get(k);
    if (!was || newestFirst(r, was) < 0) best.set(k, r);
  }
  return [...best.values()];
}

export interface ChildSummary {
  accuracy: number;
  cpm: number;
  minutes: number;
  /** From the newest result that says them; none without one. */
  levels?: number;
  /** The four weakest keys over all results, each at its lowest accuracy. */
  weak: [string, number][];
}

/** What one child's results say together; `rows` are that child's results, newest first. */
export function childSummary(rows: TaskResult[]): ChildSummary {
  const avg = (pick: (r: TaskResult) => number) => (rows.length ? Math.round(rows.reduce((a, r) => a + pick(r), 0) / rows.length) : 0);
  const lowest = new Map<string, number>();
  for (const r of rows) for (const [k, a] of r.weak) lowest.set(k, Math.min(a, lowest.get(k) ?? Infinity));
  const said = rows.find((r) => r.levels !== undefined);
  return {
    accuracy: avg((r) => r.accuracy),
    cpm: avg((r) => r.cpm),
    minutes: Math.round(rows.reduce((a, r) => a + r.minutes, 0) * 10) / 10,
    ...(said && { levels: said.levels }),
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
  /** One of the hand-ins says the super player removed or changed the settings password. */
  lockRemoved: boolean;
}

export function writer(rows: StoredResult[]): Writer {
  const all = [...rows].sort(newestFirst);
  const sum = childSummary(newest(all).sort(newestFirst));
  const [last, first] = [all[0], all[all.length - 1]];
  return {
    ...sum,
    key: last.student,
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
  speed: (w) => w.cpm,
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

/** The results added last, by group: the group with the newest addition first, inside it the newest first. */
export function recentByGroup(rows: StoredResult[], n: number): { group: string; rows: StoredResult[] }[] {
  const by = new Map<string, StoredResult[]>();
  for (const r of [...rows].sort((a, b) => b.addedAt - a.addedAt).slice(0, n)) by.set(r.group ?? '', [...(by.get(r.group ?? '') ?? []), r]);
  return [...by].map(([group, list]) => ({ group, rows: list }));
}

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
        getAll<Partial<StoredResult> & StoredResult & { child: string }>(this.db, 'results'),
        getAll<ResultSet>(this.db, 'sets'),
        getAll<Partial<LoadedFile> & Omit<LoadedFile, 'id'>>(this.db, 'files'),
      ]);
      // Records from before the students and sources get their defaults: a student by name and group, no source.
      this.results = results.map(({ child: _, ...r }) => ({ ...r, student: r.student ?? `${r.group ?? ''}\u0000${r.name}`, from: r.from ?? [] }));
      this.sets = sets;
      this.files = files.map((f) => ({ ...f, id: f.id ?? randomId() })).sort((a, b) => b.loadedAt - a.loadedAt);
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
    const records = put.map((r) => ({ ...r, from: [...r.from], child: r.student }));
    const setRecords = sets.map((x) => ({ ...x, results: [...x.results] }));
    this.queue(async (db) => {
      if (put.length || drop.length) await write(db, 'results', records, drop);
      if (sets.length || dropSets.length) await write(db, 'sets', setRecords, dropSets);
    });
  }

  private saveFiles(): void {
    const files = this.files.map((f) => ({ ...f }));
    this.queue((db) => replace(db, 'files', files));
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

  /** The group name as it is spelt here already ("5a" joins "5.A"), else as given, trimmed; `except` is a group that does not count. */
  spelling(name: string, except?: string): string {
    const g = name.trim().slice(0, TASK_GROUP_MAX);
    return this.groups().find((x) => x !== except && foldGroup(x) === foldGroup(g)) ?? g;
  }

  /**
   * The student a result belongs to, with that student's group: by the player id, or for a result
   * without one by the name in the same group (or the only student of that name); null for a new one.
   */
  private studentOf(r: TaskResult): { student: string; group: string } | null {
    const found = (x: StoredResult | undefined) => (x ? { student: x.student, group: x.group ?? '' } : null);
    if (r.pid) return found(this.results.find((x) => x.pid === r.pid));
    const same = this.results.filter((x) => !x.pid && x.name === r.name);
    if (r.group) return found(same.find((x) => foldGroup(x.group ?? '') === foldGroup(r.group!)));
    return new Set(same.map((x) => x.student)).size === 1 ? found(same[0]) : null;
  }

  /** The student and group of a result coming in; a new student takes the task's group. */
  private placeOf(r: TaskResult, student?: string): { student: string; group: string } {
    const known = this.studentOf(r);
    if (known) return known;
    const same = student ? this.results.find((x) => x.student === student) : undefined;
    if (same) return { student: same.student, group: same.group ?? '' };
    return { student: student ?? r.pid ?? randomId(), group: this.spelling(r.group ?? '') };
  }

  /** Is this hand-in here already: the same fingerprint, or the same player, task and run. */
  private holds(id: string, r: TaskResult): StoredResult | true | null {
    const same = this.results.find((x) => x.id === id);
    if (same) return same;
    const key = handIn(r);
    return key && this.results.some((x) => handIn(x) === key) ? true : null;
  }

  /**
   * Adds a hand-in to its student's group, a new student's into the task's group. Null when this
   * hand-in is here already: the same one only notes the new way it came; another copy of the same
   * player's run (changed or damaged) leaves the stored one as it is.
   */
  add(r: TaskResult, intact: boolean, source: 'scan' | 'link', now = Date.now()): StoredResult | null {
    const id = fingerprint(r);
    const held = this.holds(id, r);
    if (held) {
      if (held !== true && !held.from.includes(source)) {
        held.from.push(source);
        this.save([held]);
      }
      return null;
    }
    const { student, group } = this.placeOf(r);
    const { group: _, ...rest } = r;
    const next: StoredResult = { ...rest, ...(group && { group }), id, intact, addedAt: now, student, from: [source] };
    const set = this.setFor(group, now);
    set.results.push(id);
    set.end = Math.max(set.end, now);
    this.results.push(next);
    this.save([next], [], [set]);
    return next;
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

  /** Puts `rows` into `group` (the empty name clears it); a set whose results all share a group then takes it. */
  private regroup(rows: StoredResult[], group: string, student?: string): void {
    for (const r of rows) {
      if (group) r.group = group;
      else delete r.group;
      if (student) r.student = student;
    }
    const ids = new Set(rows.map((r) => r.id));
    const moved = this.sets.filter((s) => s.results.some((id) => ids.has(id)) && this.setResults(s).every((r) => (r.group ?? '') === group));
    for (const s of moved) s.group = group;
    this.save(rows, [], moved);
  }

  /** Moves whole students into a group, spelt as one here already; the empty name is "without a group". */
  moveStudents(students: string[], group: string): void {
    const keys = new Set(students);
    this.regroup(this.results.filter((r) => keys.has(r.student)), this.spelling(group));
  }

  /** Renames a group, or merges it into another of that name; the empty name dissolves it (its students stay, without a group). */
  renameGroup(from: string, to: string): void {
    const target = this.spelling(to, from);
    const rows = this.results.filter((r) => (r.group ?? '') === from);
    for (const s of this.sets) if (s.group === from) s.group = target;
    this.regroup(rows, target);
    this.save([], [], this.sets.filter((s) => s.group === target));
  }

  /** The old student's hand-ins join the target student and its group. */
  mergeStudents(old: string, target: string): void {
    const into = this.results.find((r) => r.student === target);
    if (!into || old === target) return;
    this.regroup(this.results.filter((r) => r.student === old), into.group ?? '', target);
  }

  /** Removes a loaded file and the hand-ins that came only from deleted files. */
  deleteFile(id: string): void {
    this.files = this.files.filter((f) => f.id !== id);
    const kept = new Set(this.files.map((f) => f.id));
    const onlyFiles = (r: StoredResult) => r.from.length > 0 && r.from.every((s) => s !== 'scan' && s !== 'link' && !kept.has(s));
    const touched = this.results.filter((r) => r.from.includes(id) && !onlyFiles(r));
    for (const r of touched) r.from = r.from.filter((s) => s !== id);
    this.save(touched);
    this.removeMany(this.results.filter(onlyFiles));
    this.saveFiles();
  }

  /** The group names in use, sorted. */
  groups(): string[] {
    return [...new Set(this.results.map((r) => r.group).filter((g): g is string => !!g))].sort((a, b) => a.localeCompare(b));
  }

  setResults(set: ResultSet): StoredResult[] {
    const ids = new Set(set.results);
    return this.results.filter((r) => ids.has(r.id));
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

  /** One student's hand-ins, newest first. */
  childResults(student: string): StoredResult[] {
    return this.results.filter((r) => r.student === student).sort(newestFirst);
  }

  /** Every writer of `rows`. */
  writers(rows: StoredResult[] = this.results): Writer[] {
    const by = new Map<string, StoredResult[]>();
    for (const r of rows) by.set(r.student, [...(by.get(r.student) ?? []), r]);
    return [...by.values()].map(writer);
  }

  /** Everything goes, the list of loaded files too. */
  clearAll(): void {
    this.results = [];
    this.sets = [];
    this.files = [];
    this.queue((db) => clear(db, ['results', 'sets', 'files']));
  }

  /**
   * Takes in the sets and results of a `.tapko` file: a hand-in already here only notes the file, a
   * set already here gets only what it lacks, results of no set form a new one per group. A student
   * of the file joins the one here with the same player id (or key); a new one keeps its group.
   * Returns how many hand-ins were new.
   */
  importFile(name: string, sets: ResultSet[], results: StoredResult[], now = Date.now()): number {
    const file: LoadedFile = { id: randomId(), name, loadedAt: now, from: '', to: '', groups: [], results: results.length, added: 0 };
    const fresh: StoredResult[] = [];
    const noted: StoredResult[] = [];
    const students = new Map<string, { student: string; group: string }>();
    for (const r of results) {
      const held = this.holds(r.id, r);
      if (held) {
        if (held !== true && !held.from.includes(file.id)) {
          held.from.push(file.id);
          if (!fresh.includes(held)) noted.push(held);
        }
        continue;
      }
      const place = students.get(r.student) ?? this.placeOf(r, r.student);
      students.set(r.student, place);
      const { group: _, ...rest } = r;
      const next: StoredResult = { ...rest, ...(place.group && { group: place.group }), student: place.student, from: [file.id], addedAt: now };
      fresh.push(next);
      this.results.push(next);
    }
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
    const dates = results.map((r) => r.date).sort();
    Object.assign(file, { from: dates[0] ?? '', to: dates[dates.length - 1] ?? '', groups: [...new Set(results.map((r) => r.group ?? ''))].sort(), added: fresh.length });
    this.files.unshift(file);
    this.save([...fresh, ...noted], [], touched);
    this.saveFiles();
    return fresh.length;
  }

  /** CSV for a spreadsheet of `rows` (all by default); `head` are the translated column names, `names` the key and status words. */
  csv(head: string[], names: { key: (k: string) => string; status: (ok: boolean) => string }, rows: StoredResult[] = this.results, sort?: Sort): string {
    // A text from a child's link that starts like a formula stays text in a spreadsheet.
    const cell = (v: string | number) => {
      const s = typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : String(v);
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const body = this.sorted(rows, sort).map((r) => [r.group ?? '', r.title, r.name, r.date, r.minutes, r.accuracy, r.cpm, r.levels ?? '', names.status(mastered(r)), r.weak.map(([k, a]) => `${names.key(k)} ${a} %`).join(', '), r.intact ? '' : '!']);
    return [head, ...body].map((row) => row.map(cell).join(',')).join('\n');
  }
}
