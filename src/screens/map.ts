import { app, go, saveProfile } from '../app/app';
import { audio } from '../audio/audio';
import { imageUrl } from '../gfx/assets';
import { tapkoElement } from '../gfx/tapko';
import { t, tList } from '../i18n/i18n';
import { LEVELS, STORIES, type StoryDef, WORLDS, isLevelReached, isWorldUnlocked, keysMissing, nextLevel, rescueUnlocked, storyOpen, worldLevels, worldLock } from '../game/levels';
import { GUEST_ID, type Profile, SUPER_ID } from '../storage/schema';
import { activeKeys } from '../learning/lessons';
import { badgeTier } from '../game/rewards';
import { badge } from '../ui/badge';
import { button, closeButton, h, icon } from '../ui/dom';
import { cornerControls } from '../ui/chrome';
import { offerInstall } from '../ui/install';
import { ownTextPhrases } from '../game/modes/practice';
import { levelTitleWords, roundButton } from '../ui/hud';
import { startFreeType } from './free-type';
import { openPracticeKeys } from './practice-keys';
import { openStats } from './stats';
import { taskCard } from './task';

/**
 * Starts a level (for a task, with its words), showing the world's intro scene the first time;
 * the very first level is introduced by Tapko's own story before it.
 */
export function playLevel(id: string, task?: string): void {
  const p = app.profile!;
  const l = LEVELS.find((x) => x.id === id);
  if (l && l.index === 0) {
    const scene = `world${l.world + 1}`;
    const level = { next: 'level', nextParams: { id, task } };
    const world = p.progress.scenesSeen.includes(scene) ? null : { scene, ...level };
    if (l.world === 0 && !p.progress.scenesSeen.includes('intro')) {
      go('story', { scene: 'intro', ...(world ? { next: 'story', nextParams: world } : level) });
      return;
    }
    if (world) {
      go('story', world);
      return;
    }
  }
  go('level', { id, task });
}

/** The first greeting of a new player: what to do on the map; closing or starting marks it seen. */
function welcomeCard(p: Profile, start: () => void): HTMLElement | null {
  if (p.id === GUEST_ID || p.id === SUPER_ID || p.progress.scenesSeen.includes('welcome')) return null;
  const done = () => {
    p.progress.scenesSeen.push('welcome');
    saveProfile();
    card.remove();
  };
  const card = h('section', { class: 'panel welcome-card', 'aria-labelledby': 'welcome-title' },
    closeButton(done),
    h('div', { class: 'welcome-tapko' }, tapkoElement(p.companion, 'happy', 110)),
    h('div', { class: 'welcome-text' },
      h('h2', { id: 'welcome-title' }, t('map.welcome.title', { name: p.name, tapko: p.companion.name })),
      h('ul', {}, ...tList('map.welcome.lines').map((l) => h('li', {}, l))),
      button(t('map.welcome.start'), () => { done(); start(); }, 'btn primary', 'play')));
  return card;
}

function settingsButton(): HTMLButtonElement {
  return roundButton('control', 'gear', t('map.settings'), () => go('parent'));
}

export function mapScreen(root: HTMLElement): void {
  const p = app.profile!;
  audio.music(app.menuTrack);
  const tapko = h('button', { class: 'map-tapko', type: 'button', title: t('tapko.statsHint'), 'aria-label': t('progress.title'), onClick: () => openStats() },
    tapkoElement(p.companion, 'idle', 130));
  // Tapko's bubble on the map: why a level waits for more keys.
  const bubble = h('div', { class: 'bubble static map-bubble', role: 'status', 'aria-live': 'polite' });
  bubble.hidden = true;
  const keysBubble = (n: number) => {
    bubble.replaceChildren(
      h('p', {}, t(n === 1 ? 'map.keysOne' : n < 5 ? 'map.keysFew' : 'map.keysMany', { n })),
      h('div', { class: 'bubble-actions' }, button(t('map.practice'), () => openPracticeKeys(), 'btn small', 'practice')));
    bubble.hidden = false;
  };
  // A closed world: what is still needed to open it.
  const lockBubble = (world: number) => {
    const lock = worldLock(p, world);
    if (!lock) return;
    bubble.replaceChildren(h('p', {}, lock.kind === 'world'
      ? t('map.lockWorld', { world: t(`worlds.${WORLDS[lock.prev]}`) })
      : t('map.lockKeys', { n: lock.need, have: lock.have })),
    ...(lock.kind === 'keys' ? [h('div', { class: 'bubble-actions' }, button(t('map.practice'), () => openPracticeKeys(), 'btn small', 'practice'))] : []));
    bubble.hidden = false;
  };
  const next = nextLevel(p);
  const rescue = rescueUnlocked(p);
  // Nothing open for the child's keys: continue means practice, which brings new keys.
  const start = () => (next ? playLevel(next.id) : openPracticeKeys());
  const play = button(t('map.continue'), start, 'btn primary big', 'play');
  const welcome = welcomeCard(p, start);
  const nextName = next ? levelTitleWords(next.world, next.index) : t('map.practice');
  play.title = nextName;
  play.setAttribute('aria-label', `${t('map.continue')}: ${nextName}`);
  root.append(h('div', { class: 'screen map-screen' },
    h('header', { class: 'map-top' },
      button(t('map.switchProfile'), () => go('start'), 'btn ghost small', 'back'),
      cornerControls(settingsButton())),
    h('main', { class: 'map-body' },
      h('aside', { class: 'map-side' },
        h('h1', { class: 'map-hello' }, t('map.hello', { name: p.name })),
        tapko,
        bubble,
        taskCard(p),
        play,
        button(t('map.practice'), () => openPracticeKeys(), 'btn', 'practice'),
        ownTextPhrases(p).length ? button(t('map.ownText'), () => go('level', { id: 'practice', text: true }), 'btn', 'read') : null,
        button(t('map.freeType'), startFreeType, 'btn', 'keyboard'),
        button(t('map.wardrobe'), () => go('wardrobe'), 'btn', 'shirt'),
        button(t('progress.title'), () => openStats(), 'btn', 'chart'),
        rescue ? button(t('map.rescue'), () => go('level', { id: 'rescue' }), 'btn', 'rescue') : null,
        rescue ? button(t('map.friends'), () => go('friends'), 'btn', 'dragon') : null),
      h('div', { class: 'story-rows' }, welcome, ...STORIES.map((s) => storyRow(p, s, next?.id, keysBubble, lockBubble))))));
  (root.querySelector('.btn.primary') as HTMLElement | null)?.focus();
  // One greeting at a time: the install offer waits for a map without the welcome.
  if (p.id !== SUPER_ID && !welcome) offerInstall(p.companion);
}

/**
 * One story: its title and its worlds as islands; a story still closed says when it opens.
 * A level reached without enough keys shows a key and lets Tapko say how many are missing.
 */
function storyRow(p: Profile, story: StoryDef, nextId: string | undefined, keysBubble: (n: number) => void, lockBubble: (world: number) => void): HTMLElement {
  const islands = story.worlds.map((wi) => {
    const w = WORLDS[wi];
    const open = isWorldUnlocked(p, wi);
    const img = imageUrl(`ui-map-${w}`);
    const levels = worldLevels(wi).map((l) => {
      const reached = isLevelReached(p, l);
      const missing = reached ? keysMissing(p, l) : 0;
      const stars = p.progress.levels[l.id] ?? 0;
      const b = h('button', {
        class: `level-node ${l.isSuper ? 'super' : ''} ${stars ? 'done' : ''} ${l.id === nextId ? 'current' : ''} ${missing ? 'keys' : ''}`,
        type: 'button',
        disabled: !reached,
        'aria-label': `${t(`worlds.${w}`)} ${l.isSuper ? t('map.super') : l.index + 1}${stars ? `, ${t('map.starsAria', { n: stars })}` : ''}${missing ? `, ${t('map.keysLocked')}` : ''}`,
        onClick: () => (missing ? keysBubble(missing) : playLevel(l.id)),
      }, h('span', { class: 'num' }, l.isSuper ? '★' : String(l.index + 1)),
        missing ? icon('key', 'icon level-key') : h('span', { class: 'mini-stars' }, ...[1, 2, 3].map((s) => h('i', { class: s <= stars ? 'on' : '' }))));
      return b;
    });
    const tier = badgeTier(p, wi);
    return h('div', { class: `island ${open ? '' : 'locked'} island-${w}` },
      h('div', { class: 'island-art', ...(open ? {} : {
        onClick: () => lockBubble(wi),
        onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') lockBubble(wi); },
        role: 'button',
        tabindex: '0',
        'aria-label': t(`worlds.${w}`),
      }) }, img ? h('img', { src: img, alt: '' }) : h('div', { class: 'island-fallback' }), open ? null : h('span', { class: 'lock' }, icon('lock')),
        tier ? badge(wi, tier, true) : null),
      h('h3', {}, `${wi + 1}. ${t(`worlds.${w}`)}`),
      h('div', { class: 'level-row' }, ...levels));
  });
  const closed = !storyOpen(p, story);
  return h('section', { class: `story-row story-${story.id}` },
    h('h2', { class: 'story-name' }, t(story.title)),
    closed ? h('p', { class: 'story-opens' }, t('map.storyOpens', { n: story.opensAtKeys!, have: activeKeys(p).length })) : null,
    h('div', { class: 'islands' }, ...islands));
}
