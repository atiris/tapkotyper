import { app, go, saveProfile } from '../app/app';
import { audio } from '../audio/audio';
import { imageUrl } from '../gfx/assets';
import { tapkoElement } from '../gfx/tapko';
import { t, tList } from '../i18n/i18n';
import { nickname } from '../storage/store';
import { LEVELS, STORIES, type StoryDef, WORLDS, activityOf, aimOpen, aimWorld, isLevelReached, isWorldUnlocked, keysMissing, nextLevel, rescueUnlocked, storyOpen, worldLevels, worldLock } from '../game/levels';
import { GUEST_ID, type Profile, SUPER_ID, type Surprise } from '../storage/schema';
import { activeKeys, notReadyKeys } from '../learning/lessons';
import { keyLabel } from '../ui/keyboard-guide';
import { badgeTier } from '../game/rewards';
import { badge } from '../ui/badge';
import { flyAway, hasParrotBadge } from '../game/parrots';
import { localDate } from '../learning/stats';
import { arrowFocus, button, closeButton, h, icon, modal } from '../ui/dom';
import { surpriseAsk, surpriseTold } from '../game/cards';
import { TRIGGERS, surpriseAnnounced, surpriseCount, surprisesToldOn, surprisesWonIn } from '../game/own-content';
import { cornerControls, settingsButton } from '../ui/chrome';
import { offerInstall } from '../ui/install';
import { tipShown } from '../ui/tooltip';
import { firstWord, onTypedWord } from '../ui/typed-word';
import { parrotVisit } from '../ui/parrot-visit';
import { rangeVisit } from '../ui/range-visit';
import { aroPerch } from '../ui/aro';
import { WORLD_THINGS } from '../game/modes/aim-things';
import { ownTextPhrases } from '../game/modes/practice';
import { levelTitleWords } from '../ui/hud';
import { startFreeType } from './free-type';
import { openBreak } from './break';
import { openPracticeKeys } from './practice-keys';
import { type TeacherTip, dueTip, tipSeen } from '../app/teacher-tips';
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
      button(t('map.welcome.start'), () => { done(); start(); }, 'btn primary', 'play')));
  return card;
}

/**
 * The teacher turtle's tip above the worlds, when one is due: one thing about the app, read with
 * OK, the X or Escape, or with its second button, which leads to where it is told more. Any of
 * them marks it read.
 */
function teacherPanel(p: Profile): HTMLElement | null {
  if (p.id === GUEST_ID || p.id === SUPER_ID) return null;
  const tip: TeacherTip | null = dueTip(p);
  if (!tip) return null;
  const done = () => {
    window.removeEventListener('keydown', onKey, true);
    tipSeen(p, tip.id);
    saveProfile();
    panel.remove();
  };
  const onKey = (e: KeyboardEvent) => {
    if (!panel.isConnected) return window.removeEventListener('keydown', onKey, true);
    if (e.key !== 'Escape' || document.querySelector('.modal-back') || tipShown()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    done();
  };
  window.addEventListener('keydown', onKey, true);
  const link = tip.link;
  const follow = link && button(t(`map.teacher.tips.${tip.id}Button`), () => {
    done();
    if ('help' in link) go('help', { tab: link.help });
    else go(link.screen);
  }, 'btn', 'help');
  const src = imageUrl('ui-teacher') ?? imageUrl('ui-mentor');
  const panel = h('section', { class: 'panel teacher-tip', 'aria-labelledby': 'teacher-name' },
    closeButton(done, t('map.welcome.close')),
    src ? h('img', { class: 'teacher-img', src, alt: '' }) : null,
    h('div', { class: 'teacher-text' },
      h('h2', { id: 'teacher-name' }, t('map.teacher.name')),
      h('p', {}, t(`map.teacher.tips.${tip.id}`)),
      h('div', { class: 'row' }, button(t('map.teacher.ok'), done, 'btn primary', 'check'), follow || null)));
  return panel;
}

/** Milliseconds Aro waits after Tapko's line about flown parrots before he says goodbye. */
const ARO_AFTER_MS = 1800;

export function mapScreen(root: HTMLElement): () => void {
  const p = app.profile!;
  audio.music(app.menuTrack);
  // Won parrots may fly away over the days; the map tells it once.
  flyAway(p, localDate());
  const flown = [...p.progress.parrotFlown].sort((a, b) => a - b);
  p.progress.parrotFlown = [];
  // Aro (the Parrot badge) sits on his perch left of Tapko: he flies off once when the badge is lost,
  // and lands on the empty perch the first time the map opens with it won.
  const hasBadge = hasParrotBadge(p);
  const aroLeaves = !hasBadge && p.progress.parrotPerched;
  const aroArrives = hasBadge && !p.progress.parrotPerched;
  p.progress.parrotPerched = hasBadge;
  saveProfile();
  const aro = hasBadge || aroLeaves ? aroPerch(!aroArrives, (a) => a.flyOff(tList('parrot.takeoff'), true)) : null;
  const tapko = h('button', { class: 'map-tapko', type: 'button', tip: t('tapko.statsHint'), 'aria-label': t('progress.title'), onClick: () => openStats() },
    tapkoElement(p.companion, 'idle', 163));
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
  // One greeting at a time: the teacher's tip waits for a map without the welcome.
  const teacher = welcome ? null : teacherPanel(p);
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
        h('h2', { class: 'map-hello' }, t('map.hello', { name: nickname(p) })),
        h('div', { class: `map-hero ${aro ? 'with-aro' : ''}` }, aro?.el ?? null, tapko, surprisesBox(p)),
        bubble,
        taskCard(p),
        button(t('map.warmUp'), () => openBreak(() => undefined, start), 'btn', 'wave'),
        play,
        button(t('map.practice'), () => openPracticeKeys(), 'btn', 'practice'),
        ownTextPhrases(p).length ? button(t('map.ownText'), () => go('level', { id: 'practice', text: true }), 'btn', 'read') : null,
        button(t('map.freeType'), startFreeType, 'btn', 'keyboard'),
        button(t('map.wardrobe'), () => go('wardrobe'), 'btn', 'shirt'),
        button(t('progress.title'), () => go('progress'), 'btn', 'chart'),
        rescue ? button(t('map.rescue'), () => go('level', { id: 'rescue' }), 'btn', 'rescue') : null,
        rescue ? button(t('map.friends'), () => go('friends'), 'btn', 'dragon') : null),
      h('div', { class: 'story-rows' }, welcome, teacher, ...STORIES.map((s) => storyRow(p, s, next?.id, held, keysBubble, lockBubble))))));
  // The arrows walk the levels and the closed worlds like a grid.
  arrowFocus(root.querySelector('.story-rows')!, '.level-node, .island-art[tabindex]');
  // Enter starts at once: the welcome's start (it marks the welcome seen), else Continue.
  (welcome?.querySelector<HTMLElement>('.btn.primary') ?? play).focus();
  if (flown.length) {
    const worlds = flown.map((w) => t(`worlds.${WORLDS[w]}`)).join(', ');
    bubble.replaceChildren(h('p', {}, t(flown.length === 1 ? 'map.parrotFlown' : 'map.parrotsFlown', { worlds })));
    bubble.hidden = false;
  }
  // Tapko tells which parrots flew away first, then Aro says goodbye and leaves.
  if (aroLeaves) aro?.flyOff(tList('parrot.goodbye'), false, flown.length ? ARO_AFTER_MS : 0);
  if (aroArrives) aro?.arrive(tList('parrot.arrive'));
  // One greeting at a time: the install offer waits for a map without the welcome.
  if (p.id !== SUPER_ID && !welcome && !teacher) offerInstall(p.companion);
  // The first word of the parrot's hint typed on the map calls a parrot over the page, the range's sends one of its things across.
  const offParrot = onTypedWord([firstWord(t('map.parrotTip'))], parrotVisit);
  const offRange = onTypedWord([firstWord(t('map.aimTip'))], rangeVisit);
  return () => {
    offParrot();
    offRange();
    aro?.stop();
  };
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

/** The target range of a world: a small node with the range's target next to the super level's star, faded and closed until the world is finished; green once the world's own thing is found there. */
function aimNode(p: Profile, open: boolean, world: number): HTMLElement {
  const pic = imageUrl('obj-aim-target');
  const found = WORLD_THINGS.some((th) => th.world === world && p.progress.rangeFinds.includes(th.id));
  return h('button', { class: `level-node aim-node ${found ? 'done' : ''}`, type: 'button', disabled: !open, 'aria-label': t('aim.title'), tip: sideTip(open, 'map.aimTip'), onClick: () => go('level', { id: 'aim', world }) },
    pic ? h('img', { class: 'level-act', src: pic, alt: '' }) : icon('target', 'icon aim-icon'));
}

/** The parrot of a world: its head while it is at home, else its empty short perch; faded and closed until the world is finished; green once its round was ever won. */
function parrotNode(p: Profile, open: boolean, world: number): HTMLElement {
  const home = p.progress.parrots.includes(world);
  const pic = imageUrl(home ? 'ui-act-parrot-head' : 'obj-parrot-perch-short');
  return h('button', {
    class: `level-node parrot-node ${home ? 'home' : ''} ${p.progress.parrotsWon.includes(world) ? 'done' : ''}`, type: 'button', disabled: !open,
    'aria-label': `${t('parrot.title')}${home ? `, ${t('map.parrotHome')}` : ''}`, tip: sideTip(open, 'map.parrotTip'),
    onClick: () => go('level', { id: 'parrot', world }),
  }, pic ? h('img', { class: 'level-act', src: pic, alt: '' }) : icon('star', 'icon'));
}

/** Story levels still to finish up to the level `id`, counted from the next one (at least that level itself). */
function levelsToGo(p: Profile, id: string): number {
  const next = nextLevel(p);
  return Math.max(1, next ? LEVELS.findIndex((l) => l.id === id) - LEVELS.indexOf(next) + 1 : 1);
}

/** What a waiting surprise still needs, with what the child has so far. */
function surpriseNeed(p: Profile, s: Surprise): string {
  if (s.trigger === 'level') {
    const l = LEVELS.find((x) => x.id === s.level);
    return t('surprise.need.level', { level: l ? levelTitleWords(l.world, l.index) : '', left: levelsToGo(p, s.level ?? '') });
  }
  const { have, need } = surpriseCount(p, s);
  return t(`surprise.need.${s.trigger}${need === 1 ? 'One' : need < 5 ? 'Few' : 'Many'}`, { n: need, have });
}

/**
 * A golden box beside Tapko while surprises wait (also those not tied to a level, which the map
 * shows nowhere else) or one was told today: open after a telling today, else closed. A click
 * lists today's told ones first with their answers, then the waiting ones with what each still
 * needs. Null without any.
 */
function surprisesBox(p: Profile): HTMLElement | null {
  const told = surprisesToldOn(p);
  const waiting = p.surprises.filter((s) => !s.doneAt && !told.includes(s)).sort((a, b) => TRIGGERS.indexOf(a.trigger) - TRIGGERS.indexOf(b.trigger));
  if (!told.length && !waiting.length) return null;
  const title = t(told.length ? 'surprise.toldTitle' : 'surprise.waitingTitle');
  const pic = imageUrl(told.length ? 'ui-surprise-open' : 'ui-surprise');
  const show = () => modal(h('div', { class: 'surprises-won' },
    h('h2', {}, title),
    ...told.map(surpriseTold),
    ...waiting.map((s) => h('div', { class: 'surprise-result' }, surpriseAsk(s.q), h('p', { class: 'surprise left' }, surpriseNeed(p, s))))), { cls: 'surprises-modal' });
  return h('button', { class: 'surprises-box', type: 'button', 'aria-label': title, tip: t(told.length ? 'surprise.toldTip' : 'surprise.waitingTip'), onClick: show },
    pic ? h('img', { src: pic, alt: '' }) : icon('star'));
}

/** The surprises told in the world's story levels: an open golden box at the island's top left; a click lists them. Null without any. */
function surprisesMark(p: Profile, world: number): HTMLElement | null {
  const won = surprisesWonIn(p, world);
  if (!won.length) return null;
  const pic = imageUrl('ui-surprise-open');
  const title = t('map.surprisesTitle', { world: t(`worlds.${WORLDS[world]}`) });
  const show = () => modal(h('div', { class: 'surprises-won' },
    h('h2', {}, title),
    ...won.map((s) => h('div', { class: 'surprise-result' }, surpriseAsk(s.q), h('p', { class: 'surprise answer' }, s.a)))), { cls: 'surprises-modal' });
  return h('button', { class: 'surprises-mark', type: 'button', 'aria-label': title, tip: t('map.surprisesWon'), onClick: show },
    pic ? h('img', { src: pic, alt: '' }) : icon('star'));
}

/**
 * One story: its title and its worlds as islands; a story still closed says when it opens.
 * A level reached without enough keys shows a key and lets the bubble say how many are missing
 * and which letters need accuracy (`held`); every world shows its target range and its parrot, open once the world is finished.
 */
function storyRow(p: Profile, story: StoryDef, nextId: string | undefined, held: string, keysBubble: (n: number, world: number) => void, lockBubble: (world: number) => void): HTMLElement {
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
      // A surprise the parent announced shows its golden box in place of the game's picture.
      const gift = surpriseAnnounced(p, l.id);
      const actImg = imageUrl(gift ? 'ui-surprise' : `ui-act-${act}`);
      const b = h('button', {
        class: `level-node ${l.isSuper ? 'super' : ''} ${stars ? 'done' : ''} ${l.id === nextId ? 'current' : ''} ${missing ? 'keys' : ''} ${gift ? 'gift' : ''}`,
        type: 'button',
        disabled: !reached,
        'aria-label': `${t(`worlds.${w}`)} ${l.isSuper ? t('map.super') : `${l.index + 1}, ${t(`map.act.${act}`)}`}${stars ? `, ${t('map.starsAria', { n: stars })}` : ''}${missing ? `, ${t('map.keysLocked')}` : ''}${gift ? `, ${t('map.surpriseHere')}` : ''}`,
        tip: `${l.isSuper ? t('map.act.super') : `${l.index + 1}. ${t(`map.act.${act}`)}`}${gift ? `\n${t('map.surpriseHere')}` : ''}`,
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
        tier ? badge(wi, tier, true) : null, surprisesMark(p, wi)),
      h('h3', {}, `${wi + 1}. ${t(`worlds.${w}`)}`),
      h('div', { class: 'level-row' }, ...levels, aimNode(p, aimOpen(p, wi), wi), parrotNode(p, aimOpen(p, wi), wi)));
  });
  const closed = !storyOpen(p, story);
  return h('section', { class: `story-row story-${story.id}` },
    h('h2', { class: 'story-name' }, t(story.title)),
    closed ? h('p', { class: 'story-opens' }, t('map.storyOpens', { n: story.opensAtKeys!, have: activeKeys(p).length })) : null,
    h('div', { class: 'islands' }, ...islands));
}
