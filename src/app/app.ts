import { audio } from '../audio/audio';
import { resetFontFamily } from '../gfx/draw';
import { language, setLanguage, t, tList } from '../i18n/i18n';
import { LAYOUTS, type Layout } from '../keyboard/layouts';
import { Store } from '../storage/store';
import { GUEST_ID, type Lang, type Profile, SUPER_ID } from '../storage/schema';
import type { TaskSpec } from '../share/task';
import { loadWords } from '../words/words';

export type ScreenName = 'start' | 'newProfile' | 'map' | 'level' | 'story' | 'parent' | 'wardrobe' | 'friends' | 'break' | 'teacher' | 'taskImport' | 'moveImport' | 'help';
export type Screen = (root: HTMLElement, params: any) => (() => void) | void;

const screens = new Map<ScreenName, Screen>();
let cleanup: (() => void) | void;

/** App-wide state. */
export const app = {
  store: new Store(),
  profile: null as Profile | null,
  words: [] as string[],
  /** Active play seconds since the session started (or the last break). */
  sessionSeconds: 0,
  /** A preparation tip was shown in this session. */
  tipShown: false,
  /** Menu music for this visit: the menu track or the extra relaxing one. */
  menuTrack: Math.random() < 0.5 ? 'menu' : 'relaxing',
  breakCount: 0,
  /** The super player while super mode is on (memory only). */
  superPlayer: null as Profile | null,
  /** A task from a link that waits for the new player being created. */
  pendingTask: null as TaskSpec | null,
};

export function layout(): Layout {
  return LAYOUTS[app.profile?.layout ?? 'sk-qwertz'];
}

export function registerScreen(name: ScreenName, s: Screen): void {
  screens.set(name, s);
}

/** Screens with their own address; the others belong to the player's map. */
const ROUTES: Partial<Record<ScreenName, string>> = { wardrobe: 'wardrobe', friends: 'friends', parent: 'settings', help: 'help', level: 'play', story: 'play', break: 'play' };
const OWN_ROUTE: ScreenName[] = ['map', 'wardrobe', 'friends', 'parent', 'help'];

/** Screens of a link with data in it, by the link's first part. */
const LINKS: Partial<Record<string, ScreenName>> = { task: 'taskImport', move: 'moveImport', result: 'teacher' };

/** Address of a screen, so a player's map can be bookmarked or put on the desktop. */
export function routeOf(name: ScreenName, params: { code?: string; tab?: string } = {}): string {
  if (name === 'newProfile') return '#/new';
  // A result link is read once into the teacher's table.
  if (name === 'teacher') return '#/teacher';
  if (name === 'taskImport') return `#/task/${params.code ?? ''}`;
  if (name === 'moveImport') return `#/move/${params.code ?? ''}`;
  const id = app.profile?.id;
  const tab = name === 'help' && params.tab ? `/${params.tab}` : '';
  // Help works before a player is chosen too.
  if (name === 'help' && !id) return `#/help${tab}`;
  if (name === 'start' || !id) return '#/';
  const sub = ROUTES[name];
  return `#/p/${encodeURIComponent(id)}${sub ? `/${sub}` : ''}${tab}`;
}

export function parseRoute(hash: string): { name: ScreenName; profileId: string | null; code?: string; tab?: string } {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'new') return { name: 'newProfile', profileId: null };
  if (parts[0] === 'help') return { name: 'help', profileId: null, tab: parts[1] };
  if (parts[0] === 'teacher') return { name: 'teacher', profileId: null };
  const link = LINKS[parts[0]];
  if (link && parts[1]) return { name: link, profileId: null, code: parts[1] };
  if (parts[0] !== 'p' || !parts[1]) return { name: 'start', profileId: null };
  const name = (Object.keys(ROUTES) as ScreenName[]).find((n) => ROUTES[n] === parts[2] && OWN_ROUTE.includes(n)) ?? 'map';
  return { name, profileId: parts[1], ...(name === 'help' && parts[3] ? { tab: parts[3] } : {}) };
}

/** Opens the screen of an address (on start and on the browser's back and forward). */
export async function openRoute(hash: string): Promise<void> {
  const r = parseRoute(hash);
  const p = r.profileId === SUPER_ID ? app.superPlayer : r.profileId ? app.store.get(r.profileId) : null;
  if (r.profileId && !p) return go('start', {}, false);
  if (p && app.profile?.id !== p.id) await selectProfile(p);
  go(r.name, r.code ? { code: r.code } : r.tab ? { tab: r.tab } : {}, false);
}

export function go(name: ScreenName, params: any = {}, push = true): void {
  const route = routeOf(name, params);
  if (route !== location.hash) history[push ? 'pushState' : 'replaceState'](null, '', route);
  const root = document.querySelector<HTMLElement>('#app')!;
  try { cleanup?.(); } catch (e) { console.error(e); }
  document.querySelectorAll('.modal-back').forEach((m) => m.remove());
  root.replaceChildren();
  root.dataset.screen = name;
  window.scrollTo(0, 0);
  cleanup = screens.get(name)!(root, params);
}

export function saveProfile(): void {
  if (app.profile && app.profile.id !== SUPER_ID) app.store.update(app.profile);
}

/** Switches the UI language (and the word list when no profile decides it). */
export async function useLanguage(lang: Lang): Promise<void> {
  if (language() !== lang || !tList('tips').length) await setLanguage(lang);
  app.words = await loadWords(lang);
}

export async function selectProfile(p: Profile): Promise<void> {
  app.profile = p;
  if (p.id !== GUEST_ID && p.id !== SUPER_ID) {
    app.store.data.lastProfileId = p.id;
    app.store.save();
  }
  await useLanguage(p.language);
  // The guest is greeted in the language of the game.
  if (p.id === GUEST_ID) p.name = t('start.guestName');
  applyProfileLook(p);
}

/** Applies per-profile look and sound: font, text size, contrast, motion, volumes. */
export function applyProfileLook(p: Profile | null): void {
  const b = document.body;
  const s = p?.settings;
  b.dataset.font = s?.font ?? 'lexend';
  b.classList.toggle('large-text', !!s?.largeText);
  b.classList.toggle('high-contrast', !!s?.highContrast);
  b.classList.toggle('reduce-motion', reduceMotion());
  resetFontFamily();
  audio.setVolumes(s?.sfxVolume ?? 0.7, s?.musicVolume ?? 0.5);
}

export function reduceMotion(): boolean {
  return !!app.profile?.settings.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Text for one random message of a pool, never the same line twice in a row. */
const lastLine = new Map<string, string>();
export function pickLine(pool: string, params: Record<string, string | number> = {}, extra: string[] = []): string {
  const lines = [...tList(pool, params), ...extra];
  if (!lines.length) return '';
  const prev = lastLine.get(pool);
  const choices = lines.length > 1 ? lines.filter((l) => l !== prev) : lines;
  const line = choices[Math.floor(Math.random() * choices.length)];
  lastLine.set(pool, line);
  return line;
}
