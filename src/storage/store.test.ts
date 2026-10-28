import { describe, expect, it } from 'vitest';
import { STORE_KEY, Store, applyImport, readStore, nameSeed, newProfile, nickname, parseImport, planImport } from './store';

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
  });

  it('deletes every player at once', () => {
    const local = mem();
    const s = new Store(local, mem());
    s.add(newProfile('Ema', 'sk'));
    s.add(newProfile('Adam', 'sk'));
    s.removeAll();
    expect(new Store(local, mem()).profiles).toHaveLength(0);
  });

  it('keeps the guest only in session storage', () => {
    const local = mem(), session = mem();
    const s = new Store(local, session);
    const g = s.startGuest('en', 'Guest');
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
    expect(readStore({ profiles: [{ nope: true }] }).profiles).toEqual([]);
  });

  it('fills missing fields of older profiles', () => {
    const p: any = newProfile('Ema', 'sk');
    delete p.settings.font;
    delete p.progress.friends;
    const out = readStore({ profiles: [p] }).profiles[0];
    expect(out.settings.font).toBe('lexend');
    expect(out.progress.friends).toEqual([]);
  });

  it('keeps a parent lock and drops a broken one', () => {
    const lock = { salt: 'ab', hash: 'cd' };
    expect(readStore({ profiles: [], parentLock: lock }).parentLock).toEqual(lock);
    expect('parentLock' in readStore({ profiles: [], parentLock: { salt: 1 } })).toBe(false);
  });
});

describe('nickname and seed', () => {
  it('makes the nickname from the name when none is given', () => {
    const p = newProfile('Ema', 'sk');
    expect(nickname(p)).toBe('Ema');
    expect(nickname(newProfile('Ema', 'sk', undefined, 'cat', ' Líška '))).toBe('Líška');
  });

  it('creates a player with a nickname and no name', () => {
    const p = newProfile('  ', 'en', undefined, 'cat', 'Bolt');
    expect(p.name).toBe('');
    expect(nickname(p)).toBe('Bolt');
    expect(p.seed).toBe(nameSeed('Bolt'));
    expect(p.settings.wordLang).toBe('en');
    expect(p.settings.ownWordLang).toBe('en');
    expect(p.settings.keyFont).toBe(true);
  });

  it('hashes the normalized name and keeps the seed on rename', () => {
    expect(nameSeed(' EMA ')).toBe(nameSeed('ema'));
    expect(nameSeed('Ema')).not.toBe(nameSeed('Jano'));
    expect(nameSeed('Ema')).toBe(nameSeed('Ema'.normalize('NFD')));
    const p = newProfile('Ema', 'sk');
    expect(p.seed).toBe(nameSeed('Ema'));
    p.name = 'Emka';
    expect(readStore({ profiles: [p] }).profiles[0].seed).toBe(nameSeed('Ema'));
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

describe('stored data', () => {
  it('keeps when the password was removed, and only as a number', () => {
    expect(readStore({ profiles: [], theme: 'light', lockRemovedAt: 5 }).lockRemovedAt).toBe(5);
    expect('lockRemovedAt' in readStore({ profiles: [], theme: 'light', lockRemovedAt: 'x' })).toBe(false);
  });
});
