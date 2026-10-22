import { describe, expect, it } from 'vitest';
import { STORE_KEY, STORE_VERSION, Store, applyImport, migrate, newProfile, parseImport, planImport } from './store';

class MemStorage {
  map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(k: string) { return this.map.get(k) ?? null; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  removeItem(k: string) { this.map.delete(k); }
  setItem(k: string, v: string) { this.map.set(k, v); }
}

const mem = () => new MemStorage() as unknown as Storage;

describe('Store', () => {
  it('saves and loads profiles', () => {
    const local = mem();
    const s = new Store(local, mem());
    s.add(newProfile('Ema', 'sk'));
    const again = new Store(local, mem());
    expect(again.profiles.map((p) => p.name)).toEqual(['Ema']);
    expect(JSON.parse(local.getItem(STORE_KEY)!).version).toBe(STORE_VERSION);
  });

  it('keeps the guest only in session storage', () => {
    const local = mem(), session = mem();
    const s = new Store(local, session);
    const g = s.startGuest('en');
    g.progress.levels['w1-1'] = 3;
    s.update(g);
    expect(new Store(local, session).guest?.progress.levels['w1-1']).toBe(3);
    expect(new Store(local, mem()).guest).toBeNull();
    expect(new Store(local, session).profiles).toHaveLength(0);
  });

  it('survives broken data', () => {
    const local = mem();
    local.setItem(STORE_KEY, '{oops');
    expect(new Store(local, mem()).profiles).toEqual([]);
    expect(migrate({ version: 1, profiles: [{ nope: true }] }).profiles).toEqual([]);
  });

  it('fills missing fields of older profiles', () => {
    const p: any = newProfile('Ema', 'sk');
    delete p.settings.font;
    delete p.progress.friends;
    const out = migrate({ version: 1, profiles: [p] }).profiles[0];
    expect(out.settings.font).toBe('lexend');
    expect(out.progress.friends).toEqual([]);
  });

  it('keeps a parent lock and drops a broken one', () => {
    const lock = { salt: 'ab', hash: 'cd' };
    expect(migrate({ version: 1, profiles: [], parentLock: lock }).parentLock).toEqual(lock);
    expect('parentLock' in migrate({ version: 1, profiles: [], parentLock: { salt: 1 } })).toBe(false);
  });
});

describe('export and import', () => {
  it('round-trips and asks before replacing', () => {
    const a = new Store(mem(), mem());
    const p = a.add(newProfile('Ema', 'sk'));
    const json = a.exportJson();
    const b = new Store(mem(), mem());
    const plan = planImport(b, parseImport(json));
    expect(plan.conflicts).toHaveLength(0);
    applyImport(b, plan, false);
    expect(b.profiles[0].id).toBe(p.id);
    const again = planImport(b, parseImport(json));
    expect(again.conflicts).toHaveLength(1);
    applyImport(b, again, false);
    expect(b.profiles).toHaveLength(2);
    expect(b.profiles[1].id).not.toBe(p.id);
  });

  it('rejects files that are not TapkoTyper exports', () => {
    expect(() => parseImport('nope')).toThrow('import.errorJson');
    expect(() => parseImport('{"hello":1}')).toThrow('import.errorShape');
  });
});
