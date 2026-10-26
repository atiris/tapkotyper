import './styles.css';
import { type Screen, app, go, openRoute, parseRoute, registerScreen, screenVisit, useLanguage } from './app/app';
import { installTheme } from './app/theme';
import { loadManifest, preloadPlay } from './gfx/assets';
import { GUEST_ID, SUPER_ID } from './storage/schema';
import { detectLanguage } from './i18n/i18n';
import { appShortcuts, watchAutoFullscreen } from './ui/chrome';
import { noteVisit } from './ui/install';
import { installTooltips } from './ui/tooltip';
import { installing, watchUpdates } from './ui/update';
import { parentAccess } from './screens/parent-gate';
import { breakScreen } from './screens/break';
import { friendsScreen } from './screens/friends';
import { helpScreen } from './screens/help';
import { levelScreen } from './screens/level';
import { moveImportScreen, taskImportScreen } from './screens/link-import';
import { mapScreen } from './screens/map';
import { newProfileScreen } from './screens/new-profile';
import { startScreen } from './screens/start';
import { storyScreen } from './screens/story';
import { teacherScreen } from './screens/teacher';
import { wardrobeScreen } from './screens/wardrobe';
import { progressScreen } from './screens/progress';

/** Screens that need a selected profile go back to the start without one. */
const needsProfile = (s: (root: HTMLElement, params: any) => any) => (root: HTMLElement, params: any) => {
  if (!app.profile) return go('start');
  return s(root, params);
};

registerScreen('start', startScreen);
registerScreen('newProfile', newProfileScreen);
registerScreen('teacher', teacherScreen);
registerScreen('taskImport', taskImportScreen);
registerScreen('moveImport', moveImportScreen);
registerScreen('map', needsProfile(mapScreen));
registerScreen('level', needsProfile(levelScreen));
registerScreen('story', needsProfile(storyScreen));
/**
 * A parent's page behind the parent question. It is big and rarely opened: it loads on first
 * use, while the question is asked; until then the page shows the loading look. `no` runs when
 * the parent says no.
 */
const parentPage = (name: 'parent' | 'translate', load: () => Promise<Screen>, no: () => void) => (root: HTMLElement, params: any) => {
  const visit = screenVisit();
  root.append(Object.assign(document.createElement('div'), { className: 'boot', textContent: 'TapkoTyper' }));
  // A chunk that will not load (an update replaced it) comes anew with the page, after the question.
  const page = load().catch(() => null);
  let stop: ReturnType<Screen>;
  void (async () => {
    if (!params.granted) {
      app.asking = name;
      const yes = await parentAccess();
      if (visit !== screenVisit()) return;
      app.asking = null;
      if (!yes) return no();
    }
    const screen = await page;
    if (visit !== screenVisit()) return;
    if (!screen) return location.reload();
    root.replaceChildren();
    stop = screen(root, params);
  })();
  return () => stop?.();
};

registerScreen('parent', parentPage('parent', () => import('./screens/parent').then((m) => m.parentScreen), () => go(app.profile ? 'map' : 'start')));
registerScreen('translate', parentPage('translate', () => import('./screens/translate').then((m) => m.translateScreen), () => go(app.profile ? 'map' : 'start')));
registerScreen('wardrobe', needsProfile(wardrobeScreen));
registerScreen('progress', needsProfile(progressScreen));
registerScreen('friends', needsProfile(friendsScreen));
registerScreen('break', needsProfile(breakScreen));
// Help works without a player too: the start page opens it on the about tab.
registerScreen('help', helpScreen);

/** Milliseconds after the start before the level pictures begin to load. */
const PRELOAD_AFTER_MS = 1500;

async function boot(): Promise<void> {
  installTheme(app.store);
  const lang = app.store.data.language ?? detectLanguage();
  await Promise.all([loadManifest(), useLanguage(lang)]);
  document.body.classList.remove('booting');
  installTooltips();
  appShortcuts();
  window.addEventListener('popstate', () => void openRoute(location.hash));
  watchAutoFullscreen();
  noteVisit();
  // The level pictures load while the child picks a player; the first screen's own pictures go first.
  setTimeout(() => void preloadPlay(), PRELOAD_AFTER_MS);
  // An installed app opened with a `.tapko` file (Chrome, Edge): the mentor page loads it.
  const queue = (window as { launchQueue?: { setConsumer(f: (p: { files: { getFile(): Promise<File> }[] }) => void): void } }).launchQueue;
  queue?.setConsumer((p) => void Promise.all(p.files.map((f) => f.getFile())).then((files) => {
    if (!files.length) return;
    app.openedFiles.push(...files);
    go('teacher', { tab: 'files' }, false);
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
