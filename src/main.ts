import './styles.css';
import { app, go, openRoute, parseRoute, registerScreen, screenVisit, useLanguage } from './app/app';
import { loadManifest } from './gfx/assets';
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
// The settings screen is the biggest and rarely opened: it loads on first use, while the
// parent question is asked; until then the page shows the loading look.
registerScreen('parent', needsProfile((root, params) => {
  const visit = screenVisit();
  root.append(Object.assign(document.createElement('div'), { className: 'boot', textContent: 'TapkoTyper' }));
  // A chunk that will not load (an update replaced it) comes anew with the page, after the question.
  const page = import('./screens/parent').catch(() => null);
  void (async () => {
    if (!params.granted) {
      app.asking = 'parent';
      const yes = await parentAccess();
      if (visit !== screenVisit()) return;
      app.asking = null;
      if (!yes) return go('map');
    }
    const m = await page;
    if (visit !== screenVisit()) return;
    if (!m) return location.reload();
    root.replaceChildren();
    m.parentScreen(root, params);
  })();
}));
registerScreen('wardrobe', needsProfile(wardrobeScreen));
registerScreen('friends', needsProfile(friendsScreen));
registerScreen('break', needsProfile(breakScreen));
// Help works without a player too: the start page opens it on the about tab.
registerScreen('help', helpScreen);

async function boot(): Promise<void> {
  const lang = app.store.data.language ?? detectLanguage();
  await Promise.all([loadManifest(), useLanguage(lang)]);
  document.body.classList.remove('booting');
  installTooltips();
  appShortcuts();
  window.addEventListener('popstate', () => void openRoute(location.hash));
  watchAutoFullscreen();
  noteVisit();
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
