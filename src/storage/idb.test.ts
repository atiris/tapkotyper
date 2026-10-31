import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { done, openDb } from './idb';

describe('openDb', () => {
  it('creates the stores on the first open only', async () => {
    const idb = new IDBFactory();
    let upgrades = 0;
    const upgrade = (db: IDBDatabase) => { upgrades++; db.createObjectStore('things', { keyPath: 'id' }); };
    const db = (await openDb(idb, 'test', 1, upgrade))!;
    expect([...db.objectStoreNames]).toEqual(['things']);
    await done(db.transaction('things', 'readwrite').objectStore('things').put({ id: 'a' }));
    db.close();
    const again = (await openDb(idb, 'test', 1, upgrade))!;
    expect(upgrades).toBe(1);
    expect(await done(again.transaction('things').objectStore('things').get('a'))).toEqual({ id: 'a' });
  });

  it('is null without IndexedDB', async () => {
    expect(await openDb(null, 'test', 1, () => undefined)).toBeNull();
    expect(await openDb(undefined, 'test', 1, () => undefined)).toBeNull();
  });
});
