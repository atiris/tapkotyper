import './styles.css';
import { type Screen, app, go, openRoute, parseRoute, registerScreen, screenVisit, useLanguage } from './app/app';
import { installTheme } from './app/theme';
import { installTestTyping } from './app/test-typing';
import { loadManifest, preloadPlay } from './gfx/assets';
import { GUEST_ID, SUPER_ID } from './storage/schema';
import { allTexts, detectLanguage, onLateTexts } from './i18n/i18n';
import { appShortcuts, blockPinchZoom, watchAutoFullscreen } from './ui/chrome';
import { noteVisit } from './ui/install';
import { firstVisit } from './ui/start-pictures';
import { installTooltips } from './ui/tooltip';
import { installing, watchUpdates } from './ui/update';
import { startScreen } from './screens/start';

/**
 * A screen whose code loads on first use, so the start page draws without the rest of the app;
 * until it and every text are there the page shows the loading look. `before` runs while the code loads and
 * says whether to go on (the parent question). A chunk that will not load (an update replaced
 * it) comes anew with the page.
 */
const lazy = (load: () => Promise<Screen>, before?: (params: any) => Promise<boolean>): Screen => (root, params) => {
  const visit = screenVisit();
  root.append(Object.assign(document.createElement('div'), { className: 'boot', textContent: 'TapkoTyper' }));
  const page = Promise.all([load(), allTexts()]).then(([screen]) => screen, () => null);
  let stop: ReturnType<Screen>;
  void (async () => {
    if (before && !(await before(params))) return;
    const screen = await page;
    if (visit !== screenVisit()) return;
    if (!screen) return location.reload();
    root.replaceChildren();
    stop = screen(root, params);
  })();
  return () => stop?.();
};

/** Screens that need a selected profile go back to the start without one. */
const needsProfile = (s: Screen): Screen => (root, params) => {
  if (!app.profile) return go('start');
  return s(root, params);
};

/** The parent question before a parent's page; `false` when the parent says no or the player moved on. */
const askParent = (name: 'parent' | 'translate') => async (params: any): Promise<boolean> => {
  if (params.granted) return true;
  const visit = screenVisit();
  app.asking = name;
  const [{ parentAccess }] = await Promise.all([import('./screens/parent-gate'), allTexts()]);
  const yes = await parentAccess();
  if (visit !== screenVisit()) return false;
  app.asking = null;
  if (!yes) go(app.profile ? 'map' : 'start');
  return yes;
};

/** The screens a player opens next from the start page; their code loads once the start page is up. */
const loadMap = () => import('./screens/map').then((m) => m.mapScreen);
const loadLevel = () => import('./screens/level').then((m) => m.levelScreen);

registerScreen('start', startScreen);
registerScreen('newProfile', lazy(() => import('./screens/new-profile').then((m) => m.newProfileScreen)));
registerScreen('teacher', lazy(() => import('./screens/teacher').then((m) => m.teacherScreen)));
registerScreen('taskImport', lazy(() => import('./screens/link-import').then((m) => m.taskImportScreen)));
registerScreen('moveImport', lazy(() => import('./screens/link-import').then((m) => m.moveImportScreen)));
registerScreen('map', needsProfile(lazy(loadMap)));
registerScreen('level', needsProfile(lazy(loadLevel)));
registerScreen('story', needsProfile(lazy(() => import('./screens/story').then((m) => m.storyScreen))));
registerScreen('parent', lazy(() => import('./screens/parent').then((m) => m.parentScreen), askParent('parent')));
registerScreen('translate', lazy(() => import('./screens/translate').then((m) => m.translateScreen), askParent('translate')));
registerScreen('wardrobe', needsProfile(lazy(() => import('./screens/wardrobe').then((m) => m.wardrobeScreen))));
registerScreen('progress', needsProfile(lazy(() => import('./screens/progress').then((m) => m.progressScreen))));
registerScreen('tasks', needsProfile(lazy(() => import('./screens/tasks').then((m) => m.tasksScreen))));
registerScreen('taskNote', lazy(() => import('./screens/task-note').then((m) => m.taskNoteScreen)));
// Help works without a player too: the start page opens it on the about tab.
registerScreen('help', lazy(() => import('./screens/help').then((m) => m.helpScreen)));

/** Milliseconds after the start before the level pictures begin to load. */
const PRELOAD_AFTER_MS = 1500;

async function boot(): Promise<void> {
  installTheme(app.store);
  const lang = app.store.data.language ?? detectLanguage();
  // A first visit's start page (no player, nothing offline yet) draws from the start texts; a text it lacks draws again later.
  const firstStart = location.hash.length <= 2 && firstVisit() && !app.store.profiles.length;
  onLateTexts(() => void openRoute(location.hash));
  await Promise.all([loadManifest(), useLanguage(lang, firstStart)]);
  document.body.classList.remove('booting');
  installTooltips();
  installTestTyping();
  appShortcuts();
  blockPinchZoom();
  window.addEventListener('popstate', () => void openRoute(location.hash));
  watchAutoFullscreen();
  noteVisit();
  // The rest of the texts and the map's and the level's code and pictures load while the child picks a player; the first screen's own go first.
  setTimeout(() => {
    void allTexts();
    void loadMap().catch(() => {});
    void loadLevel().catch(() => {});
    void preloadPlay();
  }, PRELOAD_AFTER_MS);
  // An installed app opened with a `.tapko` file (Chrome, Edge): the mentor page loads it.
  const queue = (window as { launchQueue?: { setConsumer(f: (p: { files: { getFile(): Promise<File> }[] }) => void): void } }).launchQueue;
  queue?.setConsumer((p) => void Promise.all(p.files.map((f) => f.getFile())).then((files) => {
    if (!files.length) return;
    app.openedFiles.push(...files);
    go('teacher', { tab: 'eval/import' }, false);
  }));
  // A reload never opens the guest: the start page shows the players again.
  if (location.hash.length > 2 && parseRoute(location.hash).profileId !== GUEST_ID) return openRoute(location.hash);
  go('start', {}, false);
}

void boot();

// Leaving the whole app by accident (a stray shortcut, the back button) asks first.
window.addEventListener('beforeunload', (e) => {
  if (!app.profile || app.profile.id === SUPER_ID || installing) return;
  e.preventDefault();
  e.returnValue = '';
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => watchUpdates(`${import.meta.env.BASE_URL}sw.js`));
}
