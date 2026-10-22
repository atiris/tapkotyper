import { describe, expect, it } from 'vitest';
import { STORE_KEY, STORE_VERSION, Store, applyImport, migrate, nameSeed, newProfile, nickname, parseImport, planImport } from './store';

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

describe('nickname and seed', () => {
  it('falls back to the name when there is no nickname', () => {
    const p = newProfile('Ema', 'sk');
    expect(p.companion.name).toBe('');
    expect(nickname(p)).toBe('Ema');
    expect(nickname(newProfile('Ema', 'sk', undefined, 'cat', ' Líška '))).toBe('Líška');
  });

  it('hashes the normalized name and keeps the seed on rename', () => {
    expect(nameSeed(' EMA ')).toBe(nameSeed('ema'));
    expect(nameSeed('Ema')).not.toBe(nameSeed('Jano'));
    expect(nameSeed('Ema')).toBe(nameSeed('Ema'.normalize('NFD')));
    const p = newProfile('Ema', 'sk');
    expect(p.seed).toBe(nameSeed('Ema'));
    p.name = 'Emka';
    expect(migrate({ version: STORE_VERSION, profiles: [p] }).profiles[0].seed).toBe(nameSeed('Ema'));
  });

  it('migrates v1: seed from the name, old default nickname emptied, rewards kept', () => {
    const old: any = newProfile('Jano', 'sk');
    delete old.seed;
    old.companion = { name: 'Ťapko', kind: 'owl', accessories: ['cap'] };
    old.progress.rewards = ['acc:cap'];
    old.progress.companionsUnlocked = ['owl', 'cat'];
    const named: any = { ...newProfile('Ema', 'en'), companion: { name: 'Foxy', kind: 'fox', accessories: [] } };
    delete named.seed;
    const [a, b] = migrate({ version: 1, profiles: [old, named] }).profiles;
    expect(a.seed).toBe(nameSeed('Jano'));
    expect(a.companion.name).toBe('');
    expect(a.companion.accessories).toEqual(['cap']);
    expect(a.progress.rewards).toEqual(['acc:cap']);
    expect(a.progress.companionsUnlocked).toEqual(['owl', 'cat']);
    expect(b.companion.name).toBe('Foxy');
    expect(b.seed).toBe(nameSeed('Ema'));
  });
});

describe('migration v3', () => {
  it('turns the wardrobe limit on and gives the time the training so far earns', () => {
    const old: any = newProfile('Jano', 'sk');
    delete old.settings.wardrobeLimit;
    delete old.progress.wardrobeSeconds;
    old.progress.trainedSeconds = 600;
    const long: any = { ...newProfile('Ema', 'sk'), progress: { ...old.progress, trainedSeconds: 36000 } };
    const [a, b] = migrate({ version: 2, profiles: [old, long] }).profiles;
    expect(a.settings.wardrobeLimit).toBe(true);
    expect(a.progress.wardrobeSeconds).toBe(120);
    expect(b.progress.wardrobeSeconds).toBe(420);
    expect(newProfile('Nový', 'sk').progress.wardrobeSeconds).toBe(0);
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
    expect(b.profiles[0].seed).toBe(p.seed);
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
