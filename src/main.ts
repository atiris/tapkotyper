import './styles.css';
import { app, go, openRoute, registerScreen, selectProfile, useLanguage } from './app/app';
import { loadManifest } from './gfx/assets';
import { SUPER_ID } from './storage/schema';
import { detectLanguage } from './i18n/i18n';
import { watchAutoFullscreen } from './ui/chrome';
import { noteVisit } from './ui/install';
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
// The settings screen is the biggest and rarely opened: it loads on first use.
registerScreen('parent', needsProfile((root, params) => void import('./screens/parent').then((m) => m.parentScreen(root, params))));
registerScreen('wardrobe', needsProfile(wardrobeScreen));
registerScreen('friends', needsProfile(friendsScreen));
registerScreen('break', needsProfile(breakScreen));
// Help works without a player too: the start page opens it on the about tab.
registerScreen('help', helpScreen);

async function boot(): Promise<void> {
  const lang = app.store.data.language ?? detectLanguage();
  await Promise.all([loadManifest(), useLanguage(lang)]);
  document.body.classList.remove('booting');
  window.addEventListener('popstate', () => void openRoute(location.hash));
  watchAutoFullscreen();
  noteVisit();
  if (location.hash.length > 2) return openRoute(location.hash);
  // A guest session survives reloads of the same tab only.
  if (app.store.guest) {
    await selectProfile(app.store.guest);
    go('map', {}, false);
  } else go('start', {}, false);
}

void boot();

// Leaving the whole app by accident (a stray shortcut, the back button) asks first.
window.addEventListener('beforeunload', (e) => {
  if (!app.profile || app.profile.id === SUPER_ID) return;
  e.preventDefault();
  e.returnValue = '';
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
  });
}
