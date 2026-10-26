import { app, go, reduceMotion, saveProfile } from '../app/app';
import { audio } from '../audio/audio';
import { imageUrl } from '../gfx/assets';
import { tapkoElement } from '../gfx/tapko';
import { t, tList } from '../i18n/i18n';
import { nickname } from '../storage/store';
import { LEVELS, STORIES, type StoryDef, WORLDS, activityOf, aimOpen, aimWorld, isLevelReached, isWorldUnlocked, keysMissing, nextLevel, rescueUnlocked, storyOpen, worldLevels, worldLock } from '../game/levels';
import { GUEST_ID, type Profile, SUPER_ID } from '../storage/schema';
import { activeKeys, notReadyKeys } from '../learning/lessons';
import { keyLabel } from '../ui/keyboard-guide';
import { badgeTier } from '../game/rewards';
import { badge, parrotBadge } from '../ui/badge';
import { flyAway, hasParrotBadge } from '../game/parrots';
import { localDate } from '../learning/stats';
import { arrowFocus, button, closeButton, h, icon } from '../ui/dom';
import { cornerControls, settingsButton } from '../ui/chrome';
import { offerInstall } from '../ui/install';
import { tipShown } from '../ui/tooltip';
import { onTypedWord } from '../ui/typed-word';
import { flyingParrot, parrotVisit } from '../ui/parrot-visit';
import { ownTextPhrases } from '../game/modes/practice';
import { levelTitleWords } from '../ui/hud';
import { startFreeType } from './free-type';
import { openPracticeKeys } from './practice-keys';
import { openStats } from './stats';
import { taskCard } from './task';

/**
 * Starts a level (for a task, with its words), showing the world's intro scene the first time;
 * the very first level is introduced by the intro story before it.
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

/** The first greeting of a new player: what to do on the map; closing (X or Escape) or starting marks it seen. */
function welcomeCard(p: Profile, start: () => void): HTMLElement | null {
  if (p.id === GUEST_ID || p.id === SUPER_ID || p.progress.scenesSeen.includes('welcome')) return null;
  const done = () => {
    window.removeEventListener('keydown', onKey, true);
    p.progress.scenesSeen.push('welcome');
    saveProfile();
    card.remove();
  };
  // Escape closes the card like the X, unless a dialog lies over the map or a tooltip shows (that Escape hides the tooltip); a new screen drops the listener.
  const onKey = (e: KeyboardEvent) => {
    if (!card.isConnected) return window.removeEventListener('keydown', onKey, true);
    if (e.key !== 'Escape' || document.querySelector('.modal-back') || tipShown()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    done();
  };
  window.addEventListener('keydown', onKey, true);
  const card = h('section', { class: 'panel welcome-card', 'aria-labelledby': 'welcome-title' },
    closeButton(done, t('map.welcome.close')),
    h('div', { class: 'welcome-tapko' }, tapkoElement(p.companion, 'happy', 110)),
    h('div', { class: 'welcome-text' },
      h('h2', { id: 'welcome-title' }, t('map.welcome.title', { name: nickname(p) })),
      h('p', {}, t('map.welcome.home')),
      p.settings.kidHints ? h('ul', {}, ...tList('map.welcome.lines').map((l) => h('li', {}, l))) : null,
      button(t('map.welcome.start'), () => { done(); start(); }, 'btn primary', 'play')));
  return card;
}

export function mapScreen(root: HTMLElement): () => void {
  const p = app.profile!;
  audio.music(app.menuTrack);
  // Won parrots may fly away over the days; the map tells it once.
  const hadBadge = hasParrotBadge(p);
  flyAway(p, localDate());
  const flown = [...p.progress.parrotFlown].sort((a, b) => a - b);
  p.progress.parrotFlown = [];
  saveProfile();
  const badgeLost = flown.length > 0 && hadBadge && !hasParrotBadge(p);
  const tapko = h('button', { class: 'map-tapko', type: 'button', tip: t('tapko.statsHint'), 'aria-label': t('progress.title'), onClick: () => openStats() },
    tapkoElement(p.companion, 'idle', 130));
  // The narrator's bubble on the map: why a level waits for more keys.
  const bubble = h('div', { class: 'bubble static map-bubble', role: 'status', 'aria-live': 'polite' });
  bubble.hidden = true;
  // Letters not accurate enough yet: which ones, and the way out (the target range once a world is done, else own practice).
  const held = heldText(p);
  const practiceOffer = (world: number) => {
    const aim = aimWorld(p, world);
    return h('div', { class: 'bubble-actions' }, aim === null
      ? button(t('map.practice'), () => openPracticeKeys(), 'btn small', 'practice')
      : button(t('aim.title'), () => go('level', { id: 'aim', world: aim }), 'btn small', 'target'));
  };
  const keysBubble = (n: number, world: number) => {
    bubble.replaceChildren(
      h('p', {}, t(n === 1 ? 'map.keysOne' : n < 5 ? 'map.keysFew' : 'map.keysMany', { n })),
      ...(held ? [h('p', { class: 'held-keys' }, held)] : []),
      practiceOffer(world));
    bubble.hidden = false;
  };
  // A closed world: what is still needed to open it.
  const lockBubble = (world: number) => {
    const lock = worldLock(p, world);
    if (!lock) return;
    bubble.replaceChildren(h('p', {}, lockText(p, world)),
      ...(lock.kind === 'keys' ? [...(held ? [h('p', { class: 'held-keys' }, held)] : []), practiceOffer(world)] : []));
    bubble.hidden = false;
  };
  const next = nextLevel(p);
  const rescue = rescueUnlocked(p);
  // Nothing open for the child's keys: continue means practice, which brings new keys.
  const start = () => (next ? playLevel(next.id) : openPracticeKeys());
  const play = button(t('map.continue'), start, 'btn primary big', 'play');
  const welcome = welcomeCard(p, start);
  const nextName = next ? levelTitleWords(next.world, next.index) : t('map.practice');
  play.dataset.tip = nextName;
  play.setAttribute('aria-label', `${t('map.continue')}: ${nextName}`);
  root.append(h('div', { class: 'screen map-screen' },
    h('header', { class: 'bar' },
      button(t('map.switchProfile'), () => go('start'), 'btn ghost small', 'back'),
      h('h1', {}, t('map.title'))),
    cornerControls(settingsButton()),
    h('main', { class: 'map-body' },
      h('aside', { class: 'map-side' },
        h('h2', { class: 'map-hello' }, t('map.hello', { name: nickname(p) }), hasParrotBadge(p) || badgeLost ? parrotBadge() : null),
        tapko,
        bubble,
        taskCard(p),
        play,
        button(t('map.practice'), () => openPracticeKeys(), 'btn', 'practice'),
        ownTextPhrases(p).length ? button(t('map.ownText'), () => go('level', { id: 'practice', text: true }), 'btn', 'read') : null,
        button(t('map.freeType'), startFreeType, 'btn', 'keyboard'),
        button(t('map.wardrobe'), () => go('wardrobe'), 'btn', 'shirt'),
        button(t('progress.title'), () => go('progress'), 'btn', 'chart'),
        rescue ? button(t('map.rescue'), () => go('level', { id: 'rescue' }), 'btn', 'rescue') : null,
        rescue ? button(t('map.friends'), () => go('friends'), 'btn', 'dragon') : null),
      h('div', { class: 'story-rows' }, welcome, ...STORIES.map((s) => storyRow(p, s, next?.id, held, keysBubble, lockBubble, flown))))));
  // The arrows walk the levels and the closed worlds like a grid.
  arrowFocus(root.querySelector('.story-rows')!, '.level-node, .island-art[tabindex]');
  // Enter starts at once: the welcome's start (it marks the welcome seen), else Continue.
  (welcome?.querySelector<HTMLElement>('.btn.primary') ?? play).focus();
  if (flown.length) {
    const worlds = flown.map((w) => t(`worlds.${WORLDS[w]}`)).join(', ');
    bubble.replaceChildren(h('p', {}, t(flown.length === 1 ? 'map.parrotFlown' : 'map.parrotsFlown', { worlds })));
    bubble.hidden = false;
    flyOff(root, flown, badgeLost);
  }
  // One greeting at a time: the install offer waits for a map without the welcome.
  if (p.id !== SUPER_ID && !welcome) offerInstall(p.companion);
  // The word "parrot" typed on the map calls a parrot over the page.
  return onTypedWord([t('parrot.title')], parrotVisit);
}

/** Which letters still need accuracy before new ones open; empty when none holds them back. */
function heldText(p: Profile): string {
  const keys = notReadyKeys(p);
  return keys.length ? t('map.heldKeys', { keys: keys.map(keyLabel).join(', ') }) : '';
}

/** What a closed world still needs; empty for an open one. */
function lockText(p: Profile, world: number): string {
  const lock = worldLock(p, world);
  if (!lock) return '';
  return lock.kind === 'world'
    ? t('map.lockWorld', { world: t(`worlds.${WORLDS[lock.prev]}`) })
    : t('map.lockKeys', { n: lock.need, have: lock.have });
}

/** The key on a level still short of letters; its tooltip names the letters that need accuracy. */
function keyIcon(held: string): HTMLElement {
  const k = icon('key', 'icon level-key');
  if (held) k.dataset.tip = held;
  return k;
}

/** A node's tooltip; before the world is finished it also says when the node opens. */
const sideTip = (open: boolean, key: string) => (open ? t(key) : `${t(key)} ${t('map.sideOpens')}`);

/** The target range of a world: a small node with the range's target next to the super level's star, faded and closed until the world is finished. */
function aimNode(open: boolean, world: number): HTMLElement {
  const pic = imageUrl('obj-aim-target');
  return h('button', { class: 'level-node aim-node', type: 'button', disabled: !open, 'aria-label': t('aim.title'), tip: sideTip(open, 'map.aimTip'), onClick: () => go('level', { id: 'aim', world }) },
    pic ? h('img', { class: 'level-act', src: pic, alt: '' }) : icon('target', 'icon aim-icon'));
}

/** The parrot node's picture: the parrot sitting while it is at home, its empty perch after it flew away, else its head. */
const parrotPic = (home: boolean, won: boolean) => imageUrl(home ? 'ui-act-parrot' : won ? 'ui-act-parrot-perch' : 'ui-act-parrot-head');

/** The parrot of a world (its picture by `parrotPic`), faded and closed until the world is finished. */
function parrotNode(p: Profile, open: boolean, world: number, flying: boolean): HTMLElement {
  const home = flying || p.progress.parrots.includes(world);
  const pic = parrotPic(home, p.progress.parrotsMet.includes(world));
  return h('button', {
    class: `level-node parrot-node ${home ? 'home' : ''}`, type: 'button', disabled: !open, 'data-world': String(world),
    'aria-label': `${t('parrot.title')}${home ? `, ${t('map.parrotHome')}` : ''}`, tip: sideTip(open, 'map.parrotTip'),
    onClick: () => go('level', { id: 'parrot', world }),
  }, pic ? h('img', { class: 'level-act', src: pic, alt: '' }) : icon('star', 'icon'));
}

/** Parrots that flew away leave their nodes on the map: up and out of the window, the node showing the empty perch; a lost badge fades with them. */
function flyOff(root: HTMLElement, worlds: number[], badgeLost: boolean): void {
  const nodes = worlds.map((w) => root.querySelector<HTMLElement>(`.parrot-node[data-world="${w}"]`)).filter((n) => n !== null);
  const perch = parrotPic(false, true);
  const leave = () => {
    for (const n of nodes) {
      n.classList.remove('home');
      const img = n.querySelector('img');
      if (img && perch) img.src = perch;
    }
    if (badgeLost) root.querySelector('.map-hello .parrot-badge')?.remove();
  };
  if (reduceMotion() || !imageUrl('obj-parrot-flying')) return leave();
  requestAnimationFrame(() => {
    for (const n of nodes) {
      const r = n.getBoundingClientRect();
      const bird = flyingParrot('parrot-fly', `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px`)!;
      bird.addEventListener('animationend', (e) => e.target === bird && bird.remove());
      root.append(bird);
    }
    root.querySelector('.map-hello .parrot-badge')?.classList.toggle('leaving', badgeLost);
    setTimeout(leave, 600);
  });
}

/**
 * One story: its title and its worlds as islands; a story still closed says when it opens.
 * A level reached without enough keys shows a key and lets the bubble say how many are missing
 * and which letters need accuracy (`held`); every world shows its target range and its parrot, open once the world is finished
 * (in colour while the parrots in `flying` leave).
 */
function storyRow(p: Profile, story: StoryDef, nextId: string | undefined, held: string, keysBubble: (n: number, world: number) => void, lockBubble: (world: number) => void, flying: number[]): HTMLElement {
  const islands = story.worlds.map((wi) => {
    const w = WORLDS[wi];
    const open = isWorldUnlocked(p, wi);
    const img = imageUrl(`ui-map-${w}`);
    const levels = worldLevels(wi).map((l) => {
      const reached = isLevelReached(p, l);
      const missing = reached ? keysMissing(p, l) : 0;
      const stars = p.progress.levels[l.id] ?? 0;
      const num = l.isSuper ? '★' : String(l.index + 1);
      const act = activityOf(l);
      const actImg = imageUrl(`ui-act-${act}`);
      const b = h('button', {
        class: `level-node ${l.isSuper ? 'super' : ''} ${stars ? 'done' : ''} ${l.id === nextId ? 'current' : ''} ${missing ? 'keys' : ''}`,
        type: 'button',
        disabled: !reached,
        'aria-label': `${t(`worlds.${w}`)} ${l.isSuper ? t('map.super') : `${l.index + 1}, ${t(`map.act.${act}`)}`}${stars ? `, ${t('map.starsAria', { n: stars })}` : ''}${missing ? `, ${t('map.keysLocked')}` : ''}`,
        tip: l.isSuper ? t('map.act.super') : `${l.index + 1}. ${t(`map.act.${act}`)}`,
        onClick: () => (missing ? keysBubble(missing, wi) : playLevel(l.id)),
      }, actImg ? h('img', { class: 'level-act', src: actImg, alt: '' }) : h('span', { class: 'num' }, num),
        missing ? keyIcon(held) : h('span', { class: 'mini-stars' }, ...[1, 2, 3].map((s) => h('i', { class: s <= stars ? 'on' : '' }))));
      return b;
    });
    const tier = badgeTier(p, wi);
    const lock = open ? '' : [lockText(p, wi), worldLock(p, wi)?.kind === 'keys' ? held : ''].filter(Boolean).join(' ');
    return h('div', { class: `island ${open ? '' : 'locked'} island-${w}` },
      h('div', { class: 'island-art', ...(open ? {} : {
        onClick: () => lockBubble(wi),
        onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') lockBubble(wi); },
        role: 'button',
        tabindex: '0',
        'aria-label': t(`worlds.${w}`),
        tip: lock || null,
      }) }, img ? h('img', { src: img, alt: '' }) : h('div', { class: 'island-fallback' }), open ? null : h('span', { class: 'lock', tip: lock || null }, icon('lock')),
        tier ? badge(wi, tier, true) : null),
      h('h3', {}, `${wi + 1}. ${t(`worlds.${w}`)}`),
      h('div', { class: 'level-row' }, ...levels, aimNode(aimOpen(p, wi), wi), parrotNode(p, aimOpen(p, wi), wi, flying.includes(wi))));
  });
  const closed = !storyOpen(p, story);
  return h('section', { class: `story-row story-${story.id}` },
    h('h2', { class: 'story-name' }, t(story.title)),
    closed ? h('p', { class: 'story-opens' }, t('map.storyOpens', { n: story.opensAtKeys!, have: activeKeys(p).length })) : null,
    h('div', { class: 'islands' }, ...islands));
}
