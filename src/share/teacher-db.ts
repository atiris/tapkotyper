import { done, openDb } from '../storage/idb';

/** The mentor's database: hand-ins, sets of them and loaded `.tapko` files, apart from the players. */
export const TEACHER_DB = 'tapkotyper-mentor';

export type TeacherTable = 'results' | 'sets' | 'files';

/** Opens the database, creating its stores on the first visit; null when the browser blocks IndexedDB. */
export function openTeacherDb(idb: IDBFactory | null): Promise<IDBDatabase | null> {
  return openDb(idb, TEACHER_DB, 1, (db) => {
    const results = db.createObjectStore('results', { keyPath: 'id' });
    results.createIndex('child', 'child');
    results.createIndex('group', 'group');
    results.createIndex('date', 'date');
    db.createObjectStore('sets', { keyPath: 'id' }).createIndex('start', 'start');
    db.createObjectStore('files', { autoIncrement: true });
  });
}

export function getAll<T>(db: IDBDatabase, table: TeacherTable): Promise<T[]> {
  return done(db.transaction(table).objectStore(table).getAll());
}

/** Puts `put` and deletes the keys in `drop`, all in one transaction. */
export function write(db: IDBDatabase, table: TeacherTable, put: unknown[], drop: IDBValidKey[] = []): Promise<void> {
  return new Promise((ok, fail) => {
    const tx = db.transaction(table, 'readwrite');
    const store = tx.objectStore(table);
    for (const key of drop) store.delete(key);
    for (const value of put) store.put(value);
    tx.oncomplete = () => ok();
    tx.onerror = tx.onabort = () => fail(tx.error);
  });
}

/** Replaces everything in `table` with `values`, in one transaction. */
export function replace(db: IDBDatabase, table: TeacherTable, values: unknown[]): Promise<void> {
  return new Promise((ok, fail) => {
    const tx = db.transaction(table, 'readwrite');
    const store = tx.objectStore(table);
    store.clear();
    for (const value of values) store.put(value);
    tx.oncomplete = () => ok();
    tx.onerror = tx.onabort = () => fail(tx.error);
  });
}

/** Empties the given stores in one transaction. */
export function clear(db: IDBDatabase, tables: TeacherTable[]): Promise<void> {
  return new Promise((ok, fail) => {
    const tx = db.transaction(tables, 'readwrite');
    for (const table of tables) tx.objectStore(table).clear();
    tx.oncomplete = () => ok();
    tx.onerror = tx.onabort = () => fail(tx.error);
  });
}
