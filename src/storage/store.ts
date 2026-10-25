import { WARDROBE_MAX, WARDROBE_SHARE } from '../game/wardrobe-time';
import { firstKeys } from '../learning/lessons';
import {
  type CompanionKind,
  type LangRef,
  type LayoutId,
  type ParentLock,
  type Profile,
  type StoreData,
  type Theme,
  COMPANION_KINDS,
  GUEST_ID,
  defaultSettings,
  emptyKeyStat,
} from './schema';

export const STORE_KEY = 'tapkotyper:v1';
const GUEST_KEY = 'tapkotyper:guest';

export const STORE_VERSION = 8;

/** Migrations from older stored shapes, keyed by the version they upgrade from. */
const migrations: Record<number, (data: any) => any> = {
  // v2: the character is the player; its old default name becomes an empty nickname, and a seed is added.
  1: (data) => ({
    ...data,
    profiles: Array.isArray(data.profiles) ? data.profiles.map((p: any) => !p || typeof p !== 'object' ? p : {
      ...p,
      seed: typeof p.name === 'string' ? nameSeed(p.name) : p.seed,
      companion: p.companion && ['Ťapko', 'Tapko'].includes(p.companion.name) ? { ...p.companion, name: '' } : p.companion,
    }) : data.profiles,
  }),
  // v3: wardrobe time is earned by practice; existing players start with what their training so far gives.
  2: (data) => ({
    ...data,
    profiles: Array.isArray(data.profiles) ? data.profiles.map((p: any) => !p || typeof p !== 'object' ? p : {
      ...p,
      settings: { ...p.settings, wardrobeLimit: true },
      progress: { ...p.progress, wardrobeSeconds: earnedFrom(p.progress?.trainedSeconds) },
    }) : data.profiles,
  }),
  // v4 (nickname required, name optional, word language, key font) needs no step of its own:
  // `normalizeProfile` fills an empty nickname from the name, and the new settings from the
  // defaults of the profile's language.
  // v5: the device's theme; an existing device keeps following the system.
  4: (data) => ({ ...data, theme: 'system' }),
  // v6: the target range's collection of world things starts empty.
  5: (data) => ({
    ...data,
    profiles: Array.isArray(data.profiles) ? data.profiles.map((p: any) => !p || typeof p !== 'object' ? p : {
      ...p,
      progress: { ...p.progress, rangeFinds: [] },
    }) : data.profiles,
  }),
  // v7 listed the levels and marked the accounts the service menu simulated; nothing to add from v6.
  6: (data) => data,
  // v8: the service menu no longer simulates, so the simulated levels and the account mark go.
  7: (data) => ({
    ...data,
    profiles: Array.isArray(data.profiles) ? data.profiles.map((p: any) => {
      if (!p || typeof p !== 'object') return p;
      const { serviced: _, ...rest } = p;
      if (!p.progress || typeof p.progress !== 'object') return rest;
      const { simulated: __, ...progress } = p.progress;
      return { ...rest, progress };
    }) : data.profiles,
  }),
};

const THEMES: Theme[] = ['system', 'light', 'dark'];

function earnedFrom(trained: unknown): number {
  return typeof trained === 'number' && trained > 0 ? Math.min(WARDROBE_MAX, trained * WARDROBE_SHARE) : 0;
}

/** FNV-1a 32-bit hash of the normalized name: the same name always deals the same rewards. */
export function nameSeed(name: string): number {
  let h = 0x811c9dc5;
  for (const ch of name.trim().normalize('NFC').toLocaleLowerCase()) {
    for (let i = 0; i < ch.length; i++) h = Math.imul(h ^ ch.charCodeAt(i), 0x01000193);
  }
  return h >>> 0;
}

/** Longest nickname the child can type. */
export const NICK_MAX = 16;

/** The name the game calls the player. */
export function nickname(p: Profile): string {
  return p.companion.name;
}

/** A nickname made from a name, for players created or stored without one. */
function nickFrom(name: string): string {
  return name.trim().slice(0, NICK_MAX).trim() || '?';
}

function emptyStore(): StoreData {
  return { version: STORE_VERSION, profiles: [], lastProfileId: null, language: null, theme: 'system' };
}

export function migrate(raw: any): StoreData {
  if (!raw || typeof raw !== 'object') return emptyStore();
  let data = raw;
  let version = typeof data.version === 'number' ? data.version : 1;
  while (migrations[version]) data = migrations[version](data), version++;
  const store: StoreData = { ...emptyStore(), ...data, version: STORE_VERSION };
  store.profiles = Array.isArray(store.profiles) ? store.profiles.filter(isProfile).map(normalizeProfile) : [];
  if (!isParentLock(store.parentLock)) delete store.parentLock;
  if (typeof store.lockRemovedAt !== 'number' || !Number.isFinite(store.lockRemovedAt)) delete store.lockRemovedAt;
  if (!THEMES.includes(store.theme)) store.theme = 'system';
  return store;
}

/** Fills fields that are missing in older or hand-edited profiles. */
export function normalizeProfile(p: Profile): Profile {
  const base = newProfile(p.name, p.language === 'en' ? 'en' : 'sk', p.layout, p.avatar);
  return {
    ...base,
    ...p,
    seed: typeof p.seed === 'number' ? p.seed >>> 0 : base.seed,
    companion: { ...base.companion, ...p.companion, name: p.companion?.name?.trim() || base.companion.name },
    settings: { ...base.settings, ...p.settings },
    progress: { ...base.progress, ...p.progress },
    stats: {
      keys: Object.fromEntries(Object.entries(p.stats?.keys ?? {}).map(([k, st]) => [k, { ...emptyKeyStat(), ...st }])),
      sessions: p.stats?.sessions ?? [],
    },
  };
}

function isParentLock(l: any): l is ParentLock {
  return !!l && typeof l === 'object' && typeof l.salt === 'string' && typeof l.hash === 'string';
}

export function isProfile(p: any): p is Profile {
  return !!p && typeof p === 'object' && typeof p.id === 'string' && typeof p.name === 'string' &&
    typeof p.progress === 'object' && typeof p.settings === 'object';
}

/** A new player; without a nickname the name gives one. */
export function newProfile(name: string, language: LangRef, layout?: LayoutId, kind: CompanionKind = 'fox', nick = ''): Profile {
  const lay: LayoutId = layout ?? (language === 'sk' ? 'sk-qwertz' : 'us-qwerty');
  const start: CompanionKind = COMPANION_KINDS.includes(kind) ? kind : 'fox';
  const real = name.trim();
  const nickname = nick.trim().slice(0, NICK_MAX) || nickFrom(real);
  return {
    id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
    name: real,
    seed: nameSeed(real || nickname),
    avatar: start,
    companion: { name: nickname, kind: start, accessories: [] },
    customMessages: [],
    surprises: [],
    tasks: [],
    layout: lay,
    language,
    settings: defaultSettings(language),
    progress: {
      unlockedKeys: firstKeys(lay),
      introducedKeys: [],
      levels: {},
      worldsDone: [],
      rewards: [],
      friends: [],
      lastTips: [],
      scenesSeen: [],
      growth: 0,
      growthSeconds: 0,
      pawHelp: 0,
      companionsUnlocked: [start],
      trainedSeconds: 0,
      levelsFinished: 0,
      starsEarned: 0,
      wardrobeSeconds: 0,
      rangeFinds: [],
    },
    stats: { keys: {}, sessions: [] },
    createdAt: Date.now(),
  };
}

function safeGet(storage: Storage | undefined, key: string): string | null {
  try { return storage?.getItem(key) ?? null; } catch { return null; }
}

function safeSet(storage: Storage | undefined, key: string, value: string): boolean {
  try { storage?.setItem(key, value); return true; } catch { return false; }
}

export class Store {
  data: StoreData;
  guest: Profile | null = null;

  constructor(private local: Storage | undefined = globalThis.localStorage, private session: Storage | undefined = globalThis.sessionStorage) {
    let raw: any = null;
    try { raw = JSON.parse(safeGet(local, STORE_KEY) ?? 'null'); } catch { raw = null; }
    this.data = migrate(raw);
    try {
      const g = JSON.parse(safeGet(session, GUEST_KEY) ?? 'null');
      if (isProfile(g)) this.guest = normalizeProfile(g);
    } catch { this.guest = null; }
  }

  save(): boolean {
    if (this.guest) safeSet(this.session, GUEST_KEY, JSON.stringify(this.guest));
    return safeSet(this.local, STORE_KEY, JSON.stringify(this.data));
  }

  get profiles(): Profile[] {
    return this.data.profiles;
  }

  get(id: string): Profile | null {
    if (id === GUEST_ID) return this.guest;
    return this.data.profiles.find((p) => p.id === id) ?? null;
  }

  add(p: Profile): Profile {
    this.data.profiles.push(p);
    this.save();
    return p;
  }

  update(p: Profile): void {
    if (p.id === GUEST_ID) this.guest = p;
    else {
      const i = this.data.profiles.findIndex((x) => x.id === p.id);
      if (i >= 0) this.data.profiles[i] = p;
    }
    this.save();
  }

  remove(id: string): void {
    this.data.profiles = this.data.profiles.filter((p) => p.id !== id);
    if (this.data.lastProfileId === id) this.data.lastProfileId = null;
    this.save();
  }

  /** The guest of this browser session, created with `nick` the first time. */
  startGuest(language: LangRef, nick: string): Profile {
    if (!this.guest) {
      const g = newProfile('', language, undefined, 'fox', nick);
      g.id = GUEST_ID;
      this.guest = g;
    }
    this.save();
    return this.guest;
  }

  /** JSON for the export file: one profile or all of them. */
  exportJson(ids?: string[]): string {
    const profiles = ids ? this.data.profiles.filter((p) => ids.includes(p.id)) : this.data.profiles;
    return JSON.stringify({ app: 'tapkotyper', version: STORE_VERSION, exportedAt: new Date().toISOString(), profiles }, null, 2);
  }
}

export interface ImportPlan {
  profiles: Profile[];
  /** Profiles whose id already exists here. */
  conflicts: Profile[];
}

/** Validates an export file. Throws an Error with an i18n key as message when it is not valid. */
export function parseImport(text: string): Profile[] {
  let raw: any;
  try { raw = JSON.parse(text); } catch { throw new Error('import.errorJson'); }
  const file = raw?.app === 'tapkotyper' && Array.isArray(raw.profiles) ? raw : isProfile(raw) ? { version: STORE_VERSION, profiles: [raw] } : null;
  if (!file) throw new Error('import.errorShape');
  const profiles = migrate({ version: file.version, profiles: file.profiles }).profiles;
  if (!profiles.length) throw new Error('import.errorShape');
  return profiles;
}

export function planImport(store: Store, profiles: Profile[]): ImportPlan {
  return { profiles, conflicts: profiles.filter((p) => store.data.profiles.some((x) => x.id === p.id)) };
}

/** Applies an import. `replace`: conflicting profiles overwrite; otherwise both are kept. */
export function applyImport(store: Store, plan: ImportPlan, replace: boolean): void {
  for (const p of plan.profiles) {
    const i = store.data.profiles.findIndex((x) => x.id === p.id);
    if (i >= 0 && replace) store.data.profiles[i] = p;
    else if (i >= 0) store.data.profiles.push({ ...p, id: newProfile(p.name, p.language).id });
    else store.data.profiles.push(p);
  }
  store.save();
}

