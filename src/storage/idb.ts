/** The device's own IndexedDB databases (the mentor's, the translator's), apart from the players' profiles. */

/** The request as a promise. */
export const done = <T>(req: IDBRequest<T>): Promise<T> => new Promise((ok, fail) => {
  req.onsuccess = () => ok(req.result);
  req.onerror = () => fail(req.error);
});

/** Opens the database `name`, running `upgrade` when it is new or older than `version`; null when IndexedDB is missing or blocked. */
export async function openDb(idb: IDBFactory | null | undefined, name: string, version: number, upgrade: (db: IDBDatabase) => void): Promise<IDBDatabase | null> {
  try {
    if (!idb) return null;
    const req = idb.open(name, version);
    req.onupgradeneeded = () => upgrade(req.result);
    return await done(req);
  } catch {
    return null;
  }
}

let persistAsked = false;

/** Asks the browser once a visit to keep the device's data when space runs low. */
export function askPersist(): void {
  if (persistAsked) return;
  persistAsked = true;
  void navigator.storage?.persist?.().catch(() => undefined);
}
