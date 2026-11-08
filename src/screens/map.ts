import { app, go, reduceMotion, saveProfile, useLanguage } from '../app/app';
import { audio } from '../audio/audio';
import { imageUrl } from '../gfx/assets';
import { ROSE, compassElement } from '../gfx/compass';
import { tapkoElement } from '../gfx/tapko';
import { t, tList, tn } from '../i18n/i18n';
import { nickname } from '../storage/store';
import { LEVELS, STORIES, type StoryDef, WORLDS, activityOf, aimOpen, aimWorld, isLevelReached, isWorldUnlocked, journeyId, journeyOpen, keysMissing, levelById, nextLevel, rhythmOpen, storyOpen, worldLevels, worldLock, worldName } from '../game/levels';
import { GUEST_ID, type Profile, SUPER_ID, type Surprise } from '../storage/schema';
import { activeKeys } from '../learning/lessons';
import { badgeTier } from '../game/rewards';
import { badge } from '../ui/badge';
import { badgeShow } from '../ui/badge-show';
import type { BadgeTier } from '../game/rewards';
import { flyAway, hasParrotBadge } from '../game/parrots';
import { localDate } from '../learning/stats';
import { arrowFocus, button, closeButton, h, icon, modal } from '../ui/dom';
import { openSurprises, surpriseAsk } from '../game/cards';
import { TRIGGERS, surpriseAnnounced, surpriseCount, surprisesToldOn, surprisesWonIn } from '../game/own-content';
import { cornerControls, focusLanguageButton, languageButton, settingsButton } from '../ui/chrome';
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
import { heldText, openWorldKeys, worldKeysButton, worldLockText } from './world-keys';
import { taskCard } from './task';
import { menuMusic, rhythmNotes } from '../game/rhythm-notes';

/** Ms Turtle's pictures, one after another with her tips. */
const TEACHER_PICTURES = ['ui-teacher', 'ui-teacher-2', 'ui-teacher-3'];

/**
 * The teacher turtle's tip above the worlds, when one is due: one thing about the app, read with
 * OK, the X or Escape, or with its second button, which leads to where it is told more. Any of
 * them marks it read; a tip that follows it takes its place at once.
 */
function teacherPanel(p: Profile): HTMLElement | null {
  if (p.id === GUEST_ID || p.id === SUPER_ID) return null;
  const tip: TeacherTip | null = dueTip(p);
  if (!tip) return null;
  const done = () => {
    window.removeEventListener('keydown', onKey, true);
    tipSeen(p, tip.id);
    saveProfile();
    const next = teacherPanel(p);
    if (!next) return panel.remove();
    panel.replaceWith(next);
    next.querySelector<HTMLElement>('.btn.primary')?.focus();
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
  const src = imageUrl(TEACHER_PICTURES[p.progress.appTips.seen.length % TEACHER_PICTURES.length]) ?? imageUrl('ui-mentor');
  const panel = h('section', { class: 'panel teacher-tip', 'aria-labelledby': 'teacher-name' },
    closeButton(done, t('map.teacher.close')),
    src ? h('img', { class: 'teacher-img', src, alt: '' }) : null,
    h('div', { class: 'teacher-text' },
      h('h2', { id: 'teacher-name' }, t('map.teacher.name')),
      h('p', {}, t(`map.teacher.tips.${tip.id}`, { name: nickname(p) })),
      h('div', { class: 'row' }, button(t('map.teacher.ok'), done, 'btn primary', 'check'), follow || null)));
  return panel;
}

/** The id the later placement offer is kept under among the turtle's read tips, so it comes once. */
const PLACEMENT_OFFER = 'placementOffer';

/**
 * Which placement question the turtle asks now, or null: the first map visit of a profile without a
 * star, or once after a very good level while the student is still in the first world (and no check
 * opened keys yet).
 */
function placementAsk(p: Profile): 'first' | 'offer' | null {
  if (p.id === GUEST_ID || p.id === SUPER_ID) return null;
  if (!p.progress.placementAsked && !p.progress.starsEarned) return 'first';
  const offer = app.placementOffer && !p.progress.placementKeys && !p.progress.worldsDone.length && !p.progress.appTips.seen.includes(PLACEMENT_OFFER);
  return offer ? 'offer' : null;
}

/**
 * The turtle's placement question above the worlds: start from the beginning (the default) or be
 * checked; checking first asks honestly whether the student types with all fingers without looking,
 * and No ends with a kind line and changes nothing. Any answer, the X or Escape keeps it asked.
 */
function placementPanel(p: Profile): HTMLElement | null {
  const kind = placementAsk(p);
  if (!kind) return null;
  const src = imageUrl(TEACHER_PICTURES[0]) ?? imageUrl('ui-mentor');
  const panel = h('section', { class: 'panel teacher-tip placement-ask', 'aria-labelledby': 'teacher-name' });
  const asked = () => {
    window.removeEventListener('keydown', onKey, true);
    p.progress.placementAsked = true;
    if (kind === 'offer') p.progress.appTips.seen.push(PLACEMENT_OFFER);
    app.placementOffer = false;
    saveProfile();
  };
  const close = () => {
    asked();
    panel.remove();
    document.querySelector<HTMLElement>('.map-side .btn.primary')?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    if (!panel.isConnected) return window.removeEventListener('keydown', onKey, true);
    if (e.key !== 'Escape' || document.querySelector('.modal-back') || tipShown()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    close();
  };
  window.addEventListener('keydown', onKey, true);
  const say = (text: string, buttons: [string, () => void, Parameters<typeof button>[3]][]) => {
    panel.replaceChildren(...[
      closeButton(close, t('map.teacher.close')),
      src ? h('img', { class: 'teacher-img', src, alt: '' }) : null,
      h('div', { class: 'teacher-text' },
        h('h2', { id: 'teacher-name' }, t('map.teacher.name')),
        h('p', {}, text),
        h('div', { class: 'row' }, ...buttons.map(([label, run, ic], i) => button(label, run, i ? 'btn' : 'btn primary', ic)))),
    ].filter((x) => x !== null));
    panel.querySelector<HTMLElement>('.btn.primary')?.focus();
  };
  const check = () => {
    asked();
    go('level', { id: 'placement' });
  };
  const fingers = () => say(t('map.teacher.placement.fingers'), [
    [t('map.teacher.placement.no'), () => say(t('map.teacher.placement.fromStartLine'), [[t('map.teacher.ok'), close, 'check']]), 'back'],
    [t('map.teacher.placement.yes'), check, 'check'],
  ]);
  say(t(`map.teacher.placement.${kind}`, { name: nickname(p) }), [
    [t('map.teacher.placement.fromStart'), close, 'play'],
    [t('map.teacher.placement.check'), fingers, 'keyboard'],
  ]);
  return panel;
}

/** Milliseconds Aro waits after Tapko's line about flown parrots before he says goodbye. */
const ARO_AFTER_MS = 1800;

export function mapScreen(root: HTMLElement, { focus }: { focus?: 'language' } = {}): () => void {
  const p = app.profile!;
  // Notes fade away over the days; a chosen note's world music plays here.
  if (rhythmNotes(p, localDate()).changed) saveProfile();
  audio.music(menuMusic(p));
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
    bubble.replaceChildren(...keysLines(n, held), practiceOffer(world));
    bubble.hidden = false;
  };
  const next = nextLevel(p);
  // Nothing open for the child's keys: continue means practice, which brings new keys.
  const start = () => (next ? go('level', { id: next.id }) : openPracticeKeys());
  const play = button(t('map.continue'), start, 'btn primary big', 'play');
  // The map marks the level to continue with only while it is still to play: with everything played none is.
  const current = next && !p.progress.levels[next.id] ? next.id : undefined;
  // One turtle panel at a time: the placement question goes before the tips.
  const placement = placementPanel(p);
  const teacher = placement ?? teacherPanel(p);
  const nextName = next ? levelTitleWords(next.world, next.index) : t('map.practice');
  play.dataset.tip = nextName;
  play.setAttribute('aria-label', `${t('map.continue')}: ${nextName}`);
  root.append(h('div', { class: 'screen map-screen' },
    h('header', { class: 'bar' },
      button(t('map.switchProfile'), () => go('start'), 'btn ghost small', 'back'),
      h('h1', {}, t('map.title'))),
    cornerControls(languageButton(async (l) => {
      // The player's own interface language, as in the settings; the map comes back as it was.
      p.language = l;
      saveProfile();
      await useLanguage(l);
      if (root.dataset.screen !== 'map') return;
      go('map', { focus: 'language' }, false);
    }), settingsButton()),
    h('main', { class: 'map-body' },
      h('aside', { class: 'map-side' },
        h('h2', { class: 'map-hello' }, t('map.hello', { name: nickname(p) })),
        h('div', { class: `map-hero ${aro ? 'with-aro' : ''}` }, aro?.el ?? null, tapko, surprisesBox(p)),
        bubble,
        taskCard(p),
        button(t('map.warmUp'), () => openBreak(() => undefined), 'btn', 'wave'),
        play,
        button(t('task.pageTitle'), () => go('tasks'), 'btn', 'tasks'),
        button(t('map.practice'), () => openPracticeKeys(), 'btn', 'practice'),
        ownTextPhrases(p).length ? button(t('map.ownText'), () => go('level', { id: 'practice', text: true }), 'btn', 'read') : null,
        button(t('map.freeType'), startFreeType, 'btn', 'keyboard'),
        button(t('map.wardrobe'), () => go('wardrobe'), 'btn', 'shirt'),
        button(t('progress.title'), () => go('progress'), 'btn', 'chart')),
      h('div', { class: 'story-rows' }, teacher, ...STORIES.map((s) => storyRow(p, s, current, held, keysBubble))))));
  // The arrows walk the levels and the closed worlds like a grid.
  arrowFocus(root.querySelector('.story-rows')!, '.level-node, .island-art[tabindex]');
  // Enter starts at once; the placement question takes the focus, starting from the beginning first.
  play.focus();
  placement?.querySelector<HTMLElement>('.btn.primary')?.focus();
  // Back from a language switch: the focus stays on the language.
  if (focus === 'language') focusLanguageButton(root);
  if (flown.length) {
    const worlds = flown.map((w) => worldName(w)).join(', ');
    bubble.replaceChildren(h('p', {}, t(flown.length === 1 ? 'map.parrotFlown' : 'map.parrotsFlown', { worlds })));
    bubble.hidden = false;
  }
  // Tapko tells which parrots flew away first, then Aro says goodbye and leaves.
  if (aroLeaves) aro?.flyOff(tList('parrot.goodbye'), false, flown.length ? ARO_AFTER_MS : 0);
  if (aroArrives) aro?.arrive(tList('parrot.arrive'));
  // One greeting at a time: the install offer waits for a map without the teacher's tip.
  if (p.id !== SUPER_ID && !teacher) offerInstall(p.companion);
  // The first word of the parrot's hint typed on the map calls a parrot over the page, the range's sends one of its things across.
  const offParrot = onTypedWord([firstWord(t('map.parrotTip'))], parrotVisit);
  const offRange = onTypedWord([firstWord(t('map.aimTip'))], rangeVisit);
  return () => {
    offParrot();
    offRange();
    aro?.stop();
  };
}

/** Why a level waits: the count of letters still missing, then the letters that need accuracy. */
export function keysLines(n: number, held: string): HTMLElement[] {
  return [
    h('p', {}, t(n === 1 ? 'map.keysOne' : n < 5 ? 'map.keysFew' : 'map.keysMany', { n })),
    ...(held ? [h('p', { class: 'held-keys' }, held)] : [])];
}

/** The key on a level still short of letters; its tooltip names the letters that need accuracy. */
function keyIcon(held: string): HTMLElement {
  const k = icon('key', 'icon level-key');
  if (held) k.dataset.tip = held;
  return k;
}

/** A node's tooltip; before the world is finished it also says when the node opens. */
const sideTip = (open: boolean, key: string) => (open ? t(key) : `${t(key)} ${t('map.sideOpens')}`);

/** A node's mark under its picture: a check once its game is won (the target range's thing found, the parrot's round won); none before, so the picture stands in the middle. */
const miniCheck = (on: boolean) => (on ? h('span', { class: 'mini-marks' }, icon('check', 'mini-check')) : null);

/** The target range of a world: a card like a level's with the range's target and a check once the world's own thing is found there; faded and closed until the world is finished. */
function aimNode(p: Profile, open: boolean, world: number): HTMLElement {
  const pic = imageUrl('obj-aim-target');
  const found = WORLD_THINGS.some((th) => th.world === world && p.progress.rangeFinds.includes(th.id));
  return h('button', { class: `level-node aim-node ${found ? 'done' : ''}`, type: 'button', disabled: !open, 'aria-label': t('aim.title'), tip: sideTip(open, 'map.aimTip'), onClick: () => go('level', { id: 'aim', world }) },
    pic ? h('img', { class: 'level-act', src: pic, alt: '' }) : icon('target', 'icon aim-icon'), miniCheck(found));
}

/** The parrot of a world: its head while it is at home, else its empty short perch, and a check once its round was ever won; faded and closed until the world is finished. */
function parrotNode(p: Profile, open: boolean, world: number): HTMLElement {
  const home = p.progress.parrots.includes(world);
  const pic = imageUrl(home ? 'ui-act-parrot-head' : 'obj-parrot-perch-short');
  return h('button', {
    class: `level-node parrot-node ${home ? 'home' : ''} ${p.progress.parrotsWon.includes(world) ? 'done' : ''}`, type: 'button', disabled: !open,
    'aria-label': `${t('parrot.title')}${home ? `, ${t('map.parrotHome')}` : ''}`, tip: sideTip(open, 'map.parrotTip'),
    onClick: () => go('level', { id: 'parrot', world }),
  }, pic ? h('img', { class: 'level-act', src: pic, alt: '' }) : icon('star', 'icon'), miniCheck(p.progress.parrotsWon.includes(world)));
}

/** Rytmus of a world: the metronome, and a check once its target tempo was held accurately; faded and closed until the world is finished. */
function rhythmNode(p: Profile, open: boolean, world: number): HTMLElement {
  const won = p.progress.rhythmWon.includes(world);
  const pic = imageUrl('ui-act-rhythm');
  return h('button', { class: `level-node rhythm-node ${won ? 'done' : ''}`, type: 'button', disabled: !open, 'aria-label': t('rhythm.title'), tip: sideTip(open, 'map.rhythmTip'), onClick: () => go('level', { id: 'rhythm', world }) },
    pic ? h('img', { class: 'level-act', src: pic, alt: '' }) : icon('wave', 'icon'), miniCheck(won));
}

/** The journey badge's tooltip: a welcome before the first finish, the best stars after it, and what the journey is; before it opens, when it opens. */
function journeyTip(open: boolean, stars: number): string {
  const hello = stars ? tn('map.journey.again', stars) : t('map.journey.welcome');
  return [hello, open ? t('map.journey.about') : t('map.sideOpens')].join('\n');
}

/**
 * The story's hero's journey as a badge at the bottom right of its last world's island: the compass rose in
 * a ring coloured by its best stars (none white-grey, then grey, pink, light blue, light green, golden
 * yellow); a click starts it. Faded and closed until that world is finished; open, the rose turns now and then.
 */
function journeyBadge(p: Profile, story: StoryDef): HTMLElement {
  const open = journeyOpen(p, story);
  const stars = p.progress.levels[journeyId(story)] ?? 0;
  const name = `${t('journey.title')}${stars ? `, ${t('map.starsAria', { n: stars })}` : ''}`;
  const rose = compassElement('journey-compass', ROSE);
  swing(rose, open);
  return h('button', {
    class: `journey-badge badge small stars-${stars} ${open ? '' : 'closed'}`, type: 'button', disabled: !open,
    'aria-label': name, tip: journeyTip(open, stars),
    onClick: (e: MouseEvent) => {
      e.stopPropagation();
      go('level', { id: 'journey', story: story.id });
    },
  }, rose);
}

/** The swing's length (s), how fast it dies out and how fast it swings (per second), and its frames. */
const SWING_S = 3.2;
const SWING_DAMP = 1.5;
const SWING_FREQ = 3.4;
const SWING_FRAMES = 64;

/**
 * Share of the turn done after `s` seconds: a needle on a spring let go from rest, so it starts
 * slowly, swings past the heading and back ever less, and ends exactly on it.
 */
function swingShare(s: number): number {
  const spring = (x: number) => 1 - Math.exp(-SWING_DAMP * x) * (Math.cos(SWING_FREQ * x) + (SWING_DAMP / SWING_FREQ) * Math.sin(SWING_FREQ * x));
  return spring(s) + (1 - spring(SWING_S)) * (s / SWING_S);
}

/** Turns `el` like a compass needle: a random heading when the map opens, then every 10 to 30 s another one, settling there with a smooth swing. */
function swing(el: HTMLElement, open: boolean): void {
  let at = Math.random() * 360;
  el.style.transform = `rotate(${at}deg)`;
  if (!open || reduceMotion()) return;
  const later = () => window.setTimeout(turn, 10_000 + Math.random() * 20_000);
  const turn = () => {
    if (!el.isConnected) return;
    const by = (Math.random() < 0.5 ? -1 : 1) * (50 + Math.random() * 150);
    const frames = Array.from({ length: SWING_FRAMES + 1 }, (_, i) => ({ transform: `rotate(${at + by * swingShare((i / SWING_FRAMES) * SWING_S)}deg)` }));
    el.animate(frames, { duration: SWING_S * 1000, easing: 'linear', fill: 'forwards' });
    at = (at + by) % 360;
    later();
  };
  later();
}

/** The world's badge at the island's top right: a click shows it big in the middle of the screen. */
function worldBadge(world: number, tier: BadgeTier): HTMLElement {
  const b = badge(world, tier, true);
  // The button carries the badge's name and tooltip.
  const label = b.getAttribute('aria-label') ?? '', tip = b.dataset.tip ?? '';
  b.removeAttribute('aria-label');
  b.removeAttribute('role');
  delete b.dataset.tip;
  return h('button', { class: 'world-badge-btn', type: 'button', 'aria-label': label, tip, onClick: (e: MouseEvent) => {
    e.stopPropagation();
    badgeShow({ world, tier });
  } }, b);
}

/** A node's best stars, small, only the earned ones: one in the middle, two side by side, three as a triangle, four two over two, five like the rings; none before the first finish, so the picture stands in the middle. */
const miniStars = (stars: number) => (stars ? h('span', { class: `mini-stars n${stars}` }, ...Array.from({ length: stars }, () => h('i'))) : null);

/** Story levels still to finish up to the level `id`, counted from the next one (at least that level itself). */
function levelsToGo(p: Profile, id: string): number {
  const next = nextLevel(p);
  return Math.max(1, next ? LEVELS.findIndex((l) => l.id === id) - LEVELS.indexOf(next) + 1 : 1);
}

/** What a waiting surprise still needs, with what the child has so far. */
function surpriseNeed(p: Profile, s: Surprise): string {
  if (s.trigger === 'level') {
    const l = s.level ? levelById(s.level) : undefined;
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
  const show = () => openSurprises(title, told, waiting.map((s) => h('div', { class: 'surprise-result' }, surpriseAsk(s.q), h('p', { class: 'surprise left' }, surpriseNeed(p, s)))));
  return h('button', { class: 'surprises-box', type: 'button', 'aria-label': title, tip: t(told.length ? 'surprise.toldTip' : 'surprise.waitingTip'), onClick: show },
    pic ? h('img', { src: pic, alt: '' }) : icon('star'));
}

/** The surprises told in the world's story levels: an open golden box at the island's top left; a click lists them. Null without any. */
function surprisesMark(p: Profile, world: number): HTMLElement | null {
  const won = surprisesWonIn(p, world);
  if (!won.length) return null;
  const pic = imageUrl('ui-surprise-open');
  const title = t('map.surprisesTitle', { world: worldName(world) });
  const show = () => modal(h('div', { class: 'surprises-won' },
    h('h2', {}, title),
    ...won.map((s) => h('div', { class: 'surprise-result' }, surpriseAsk(s.q), h('p', { class: 'surprise answer' }, s.a)))), { cls: 'surprises-modal' });
  return h('button', { class: 'surprises-mark', type: 'button', 'aria-label': title, tip: t('map.surprisesWon'), onClick: show },
    pic ? h('img', { src: pic, alt: '' }) : icon('star'));
}

/**
 * One story: its title and its worlds as islands; a story still closed says when it opens.
 * A level reached without enough keys shows a key and lets the bubble say how many are missing
 * and which letters need accuracy (`held`); every world shows its target range and its parrot, open once the world is finished, a world with Rytmus its metronome,
 * and the story's last world its hero's journey as a badge on its island.
 */
function storyRow(p: Profile, story: StoryDef, nextId: string | undefined, held: string, keysBubble: (n: number, world: number) => void): HTMLElement {
  const islands = story.worlds.map((wi) => {
    const w = WORLDS[wi];
    const open = isWorldUnlocked(p, wi);
    const img = imageUrl(`ui-map-${w}`);
    const levels = worldLevels(wi).map((l) => {
      const reached = isLevelReached(p, l);
      const missing = reached ? keysMissing(p, l) : 0;
      const stars = p.progress.levels[l.id] ?? 0;
      const act = activityOf(l);
      // Every level is named by its place and game; the world's last one is its finale.
      const name = `${l.index + 1}. ${l.isSuper ? `${t('map.act.super')}: ` : ''}${t(`map.act.${act}`)}`;
      // A surprise the parent announced shows its golden box in place of the game's picture.
      const gift = surpriseAnnounced(p, l.id);
      const actImg = imageUrl(gift ? 'ui-surprise' : `ui-act-${act}`);
      const b = h('button', {
        class: `level-node ${stars ? 'done' : ''} ${l.id === nextId ? 'current' : ''} ${missing ? 'keys' : ''} ${gift ? 'gift' : ''}`,
        type: 'button',
        disabled: !reached,
        'aria-label': `${worldName(wi)} ${name}${stars ? `, ${t('map.starsAria', { n: stars })}` : ''}${missing ? `, ${t('map.keysLocked')}` : ''}${gift ? `, ${t('map.surpriseHere')}` : ''}`,
        tip: `${name}${gift ? `\n${t('map.surpriseHere')}` : ''}`,
        onClick: () => (missing ? keysBubble(missing, wi) : go('level', { id: l.id })),
      }, actImg ? h('img', { class: 'level-act', src: actImg, alt: '' }) : h('span', { class: 'num' }, String(l.index + 1)),
        missing ? keyIcon(held) : miniStars(stars));
      return b;
    });
    const tier = badgeTier(p, wi);
    const lock = open ? '' : [worldLockText(p, wi), worldLock(p, wi)?.kind === 'keys' ? held : ''].filter(Boolean).join(' ');
    return h('div', { class: `island ${open ? '' : 'locked'} island-${w}` },
      h('div', { class: 'island-art', ...(open ? {} : {
        onClick: () => openWorldKeys(p, wi),
        onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') openWorldKeys(p, wi); },
        role: 'button',
        tabindex: '0',
        'aria-label': worldName(wi),
        tip: lock || null,
      }) }, img ? h('img', { src: img, alt: '' }) : h('div', { class: 'island-fallback' }), open ? worldKeysButton(p, wi) : h('span', { class: 'lock', tip: lock || null }, icon('lock')),
        tier ? worldBadge(wi, tier) : null, surprisesMark(p, wi), open && wi === story.worlds[story.worlds.length - 1] ? journeyBadge(p, story) : null),
      h('h3', {}, `${wi + 1}. ${worldName(wi)}`),
      h('div', { class: 'level-row' }, ...levels, aimNode(p, aimOpen(p, wi), wi), parrotNode(p, aimOpen(p, wi), wi), rhythmNode(p, rhythmOpen(p, wi), wi)));
  });
  const closed = !storyOpen(p, story);
  return h('section', { class: `story-row story-${story.id}` },
    h('h2', { class: 'story-name' }, t(story.title)),
    closed ? h('p', { class: 'story-opens' }, t('map.storyOpens', { n: story.opensAtKeys!, have: activeKeys(p).length })) : null,
    h('div', { class: 'islands' }, ...islands));
}
