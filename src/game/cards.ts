import { audio } from '../audio/audio';
import { t, tList, tMap } from '../i18n/i18n';
import { type Finger, LAYOUTS, type Layout, enterAfter, homeKey } from '../keyboard/layouts';
import { layout } from '../app/app';
import type { Profile, Surprise } from '../storage/schema';
import { surpriseCount } from './own-content';
import type { Style } from './typing';
import { FINGER_COLORS, type KeyboardGuide, chipOf, fingerChip, lessonFinger, textColorsOn } from '../ui/keyboard-guide';
import { button, closeButton, confirmDialog, h, icon, modal, richText } from '../ui/dom';
import { endCard, focusMain } from '../ui/end-card';
import { pickStretch, stretchExercise } from './runtime/pause';
import { tapkoElement } from '../gfx/tapko';
import { imageUrl } from '../gfx/assets';
import { SHIFT_L, SHIFT_R, SPACE } from '../learning/lessons';

interface CardOpts {
  button?: string;
  cls?: string;
  /** The round X's label: the card gets one, top right. */
  close?: string;
}

/**
 * Captures keys for a card while it is on screen. A card that leaves together with its
 * screen (back button, map) lets go by itself, so it never swallows the next level's keys.
 * While the level's pause card lies over the card (beside it on the stage) the keys are the pause's,
 * while the keyboard layout's menu is open they are the menu's.
 */
export function captureKeys(overlay: HTMLElement, onKey: (e: KeyboardEvent) => void): () => void {
  const stop = () => window.removeEventListener('keydown', listener, true);
  const paused = () => overlay.parentElement?.querySelector(':scope > .pause-card') || document.querySelector('.kb-layout-menu');
  const listener = (e: KeyboardEvent) => (!overlay.isConnected ? stop() : paused() ? undefined : onKey(e));
  window.addEventListener('keydown', listener, true);
  return stop;
}

/** Overlay card over the stage; Enter, Space or Escape dismisses it, and it resolves then. */
export function showCard(host: HTMLElement, content: HTMLElement, o: CardOpts = {}): Promise<void> {
  return new Promise((resolve) => {
    const card = h('div', { class: `card ${o.cls ?? ''}` }, o.close ? closeButton(() => done(), o.close) : null, content);
    const overlay = h('div', { class: 'overlay' }, card);
    const done = () => {
      stop();
      overlay.remove();
      resolve();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || ['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        done();
      }
    };
    if (o.button) {
      const b = button(o.button, done, 'btn primary');
      card.append(h('div', { class: 'row' }, b));
      queueMicrotask(() => b.focus());
    }
    const stop = captureKeys(overlay, onKey);
    host.append(overlay);
  });
}

/** Tips that only make sense on a Slovak keyboard, and those only on Slovak QWERTZ. */
const SK_ONLY_TIPS = new Set(['yz-swap', 'z-finger', 'number-row', 'dead-keys', 'caron-shift', 'accent-pinky', 'diacritics-fun']);
const QWERTZ_ONLY_TIPS = new Set(['yz-swap', 'z-finger']);
/** Tips about keys far from the home row; shown once the child knows more keys. */
const LATER_TIPS = new Set(['number-row', 'number-fingers', 'dead-keys', 'caron-shift', 'accent-pinky', 'diacritics-fun', 'shift-opposite', 'capital-a', 'yz-swap', 'z-finger', 'pinky-p', 'reach-t', 'middle-ei', 'ring-finger']);

/** The style a tip is about: listening tips for dictation, remembering tips for memory; null = any run. */
function tipStyle(id: string): Style | null {
  return id.startsWith('listen-') ? 'dictation' : id.startsWith('remember-') ? 'memory' : null;
}

/** A dictation or memory run gets a tip about its own way of typing, a copy run never does. */
function fitsStyle(id: string, style: Style): boolean {
  const own = tipStyle(id);
  return style === 'copy' ? !own : style === 'mixed' ? !!own : own === style;
}

/** The right little finger's home key of the player's layout, as printed on it (Ô, or ; on US keyboards). */
export function homePinky(): string {
  return enterAfter(layout()).toUpperCase();
}

/** One random preparation tip for a run of this style, never one of the last five shown. */
export function pickTip(p: Profile, style: Style = 'copy'): { id: string; text: string } | null {
  const tips = tMap('tips');
  const ids = Object.keys(tips).filter((id) => fitsStyle(id, style) && (p.layout !== 'us-qwerty' || !SK_ONLY_TIPS.has(id)) && (p.layout === 'sk-qwertz' || !QWERTZ_ONLY_TIPS.has(id)) && (p.progress.unlockedKeys.length >= 12 || !LATER_TIPS.has(id)));
  if (!ids.length) return null;
  const fresh = ids.filter((id) => !p.progress.lastTips.includes(id));
  const id = (fresh.length ? fresh : ids)[Math.floor(Math.random() * (fresh.length || ids.length))];
  p.progress.lastTips = [...p.progress.lastTips, id].slice(-5);
  return { id, text: t(`tips.${id}`, { pinky: homePinky() }) };
}

const POSTURE_TIPS = ['back', 'feet', 'wrists', 'eyes'];

/** Seconds without the space bar before the card says where the fingers go. */
const FINGERS_AFTER_S = 10;

/** The home keys of the layout as the child sees them on the keyboard: `ASDF JKLÔ`. */
function homeKeys(lay: Layout): string {
  const keys = (fingers: Finger[]) => fingers.map((f) => homeKey(lay, f) ?? '').join('').toUpperCase();
  return `${keys([0, 1, 2, 3])} ${keys([6, 7, 8, 9])}`;
}

/** The posture pictures, a boy's and a girl's; the card takes one at random. */
const POSTURE_PICTURES = ['ui-posture-boy', 'ui-posture-girl'];

/**
 * Get-ready card before every adventure, the only one before a level apart from the key cards. Two
 * panels side by side on a wide enough screen: on the left the technical part, a posture picture with
 * the session's preparation tip when one is due (else a posture reminder) under it, where the fingers
 * go (shown only after a while without the space bar) and a note on the run when one is due; on the
 * right the title (a task's own, else the usual) on the close button's line, in the middle the story (`**phrase**` marks highlight)
 * and the question of a parent's surprise asked in this run (with what is still left when it counts), the space bar's
 * drawing always at the bottom. The space bar, Enter or Escape (or a tap on the space
 * bar's drawing or the close button) closes it and opens the adventure.
 */
export function showPosture(host: HTMLElement, p: Profile, tip?: string, surprise?: Surprise | null, note?: string, story?: string | null, under?: string | null, title?: string): Promise<void> {
  return new Promise((resolve) => {
    const close = () => {
      stop();
      clearTimeout(timer);
      overlay.remove();
      resolve();
    };
    const space = h('button', { class: 'space-key', type: 'button', 'aria-label': t('posture.spaceKey'), onClick: close }, t('posture.spaceKey'));
    const fingers = h('p', { class: 'posture-fingers later' }, t('posture.space', { keys: homeKeys(LAYOUTS[p.layout]) }));
    const src = imageUrl(POSTURE_PICTURES[Math.floor(Math.random() * POSTURE_PICTURES.length)]);
    const reminder = POSTURE_TIPS[Math.floor(Math.random() * POSTURE_TIPS.length)];
    const side = h('div', { class: 'card posture-side' },
      h('figure', { class: 'posture-pic' },
        src ? h('img', { class: 'posture-img', src, alt: '' }) : h('div', { class: 'posture-img', html: postureSvg() }),
        h('figcaption', { class: 'posture-tip' }, tip ?? t(`posture.${reminder}`)),
        fingers),
      note ? h('p', { class: 'hint style-note' }, note) : null);
    const card = h('div', { class: 'card posture-card' },
      closeButton(close, t('posture.close')),
      h('h2', {}, title ?? t('posture.title')),
      h('div', { class: 'posture-body' },
        story ? h('p', { class: 'posture-text' }, ...richText(story)) : null,
        under ? h('p', { class: 'posture-under' }, ...richText(under)) : null,
        surprise ? surpriseAsk(surprise.q) : null,
        surprise ? surpriseLeft(p, surprise) : null),
      space);
    const overlay = h('div', { class: 'overlay' }, h('div', { class: 'posture-cards' }, side, card));
    const timer = setTimeout(() => fingers.classList.remove('later'), FINGERS_AFTER_S * 1000);
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== ' ' && e.key !== 'Enter' && e.key !== 'Escape')) return;
      e.preventDefault();
      e.stopPropagation();
      audio.sfx('pop');
      close();
    };
    const stop = captureKeys(overlay, onKey);
    host.append(overlay);
  });
}

/**
 * Leaving a hero's journey, from the panel between parts or the pause card: the one question,
 * going on being the safe choice (focused, Esc). Resolves true when the child ends it.
 */
export function giveUpJourney(): Promise<boolean> {
  return confirmDialog({ title: t('journey.giveUp.title'), text: t('journey.giveUp.text'), ok: t('journey.giveUp.end'), cancel: t('journey.giveUp.keep') });
}

/**
 * Between two parts of a hero's journey, on the card of every end: the map picture of the world the
 * next part goes to and the part's own story. "On we go" (focused; the X, Esc, the space bar and
 * Enter too), the pause card's short stretch exercise (then the panel again) and giving up, which
 * asks first. Resolves true to play on, false to leave the journey.
 */
export function showJourneyPanel(host: HTMLElement, world: string, text: string, onBreak: (back: () => void, go: () => void) => void): Promise<boolean> {
  return new Promise((resolve) => {
    let stopStretch = () => {};
    const close = (on: boolean) => {
      stopStretch();
      stop();
      overlay.remove();
      resolve(on);
    };
    const go = () => close(true);
    const show = () => {
      overlay.replaceChildren(panel);
      focusMain(panel);
    };
    const stretch = () => {
      const card = h('div', { class: 'card pause-card journey-stretch', role: 'dialog', 'aria-label': t('level.stretch') });
      overlay.replaceChildren(card);
      stopStretch = stretchExercise(card, pickStretch(), show, go, () => onBreak(show, go));
    };
    const giveUp = async () => {
      if (await giveUpJourney()) close(false);
      else focusMain(panel);
    };
    const panel = endCard({
      cls: 'journey-panel',
      title: t('journey.panelTitle'),
      picture: `ui-map-${world}`,
      text,
      actions: [
        { label: t('journey.go'), icon: 'next', run: go },
        { label: t('level.stretch'), icon: 'smile', run: stretch },
        { label: t('journey.giveUp.button'), icon: 'close', run: () => void giveUp() },
      ],
      onClose: go,
    });
    const overlay = h('div', { class: 'overlay' }, panel);
    // Esc goes on; the space bar and Enter press the focused button (on the panel the main one). A dialog over it keeps its keys.
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.key !== 'Escape' || document.querySelector('.modal-back') || !panel.isConnected) return;
      e.preventDefault();
      e.stopPropagation();
      audio.sfx('pop');
      go();
    };
    const stop = captureKeys(overlay, onKey);
    host.append(overlay);
    queueMicrotask(() => focusMain(panel));
  });
}

/**
 * Told once, before the very first new key: why new keys come, how a key card is closed (the key
 * typed right three times, or Esc) and that this card closes with the space bar. The space bar,
 * Enter, Escape, the drawn space bar or the X closes it.
 */
export function showKeysIntro(host: HTMLElement, p: Profile): Promise<void> {
  return new Promise((resolve) => {
    const close = () => {
      stop();
      overlay.remove();
      resolve();
    };
    const card = h('div', { class: 'card newkey-card keys-intro' },
      closeButton(close, t('keysIntro.close')),
      h('div', { class: 'newkey-tapko' }, tapkoElement(p.companion, 'happy', 220)),
      h('div', { class: 'newkey-how' },
        h('h2', {}, t('keysIntro.title')),
        ...tList('keysIntro.text').map((line) => h('p', {}, ...richText(line))),
        h('button', { class: 'space-key', type: 'button', 'aria-label': t('posture.spaceKey'), onClick: close }, t('posture.spaceKey'))));
    const overlay = h('div', { class: 'overlay' }, card);
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== ' ' && e.key !== 'Enter' && e.key !== 'Escape')) return;
      e.preventDefault();
      e.stopPropagation();
      audio.sfx('pop');
      close();
    };
    const stop = captureKeys(overlay, onKey);
    host.append(overlay);
  });
}

/** The question of a parent's surprise. */
export function surpriseAsk(question: string): HTMLElement {
  return h('p', { class: 'surprise ask' }, h('b', {}, t('surprise.ask')), ' ', question);
}

/** A told surprise: the open golden box beside its question with the answer highlighted under it. */
function surpriseTold(s: Surprise): HTMLElement {
  const pic = imageUrl('ui-surprise-open');
  return h('div', { class: 'surprise-told' },
    pic ? h('img', { class: 'surprise-box', src: pic, alt: '' }) : null,
    h('div', { class: 'surprise-result' }, surpriseAsk(s.q), h('p', { class: 'surprise answer' }, s.a)));
}

/** The window of surprises: the told ones with their answers, then `more` (the waiting ones on the map); `onClose` after it closes. */
export function openSurprises(title: string, told: Surprise[], more: HTMLElement[] = [], onClose?: () => void): void {
  modal(h('div', { class: 'surprises-won' }, h('h2', {}, title), ...told.map(surpriseTold), ...more), { cls: 'surprises-modal', onClose });
}

/** What a counting surprise still needs ("2 more levels"), or null when it is reached or does not count. */
function surpriseLeft(p: Profile, s: Surprise): HTMLElement | null {
  if (s.trigger !== 'minutes' && s.trigger !== 'levels' && s.trigger !== 'stars') return null;
  const { have, need } = surpriseCount(p, s);
  const n = need - have;
  if (n <= 0) return null;
  const form = s.trigger === 'minutes' ? '' : n === 1 ? 'One' : n < 5 ? 'Few' : 'Many';
  return h('p', { class: 'surprise left' }, t(`surprise.left.${s.trigger}${form}`, { n }));
}

/** Big symbol of a lesson key on its card. */
function bigKeyText(key: string): string {
  return key === SPACE ? '␣' : key === SHIFT_L || key === SHIFT_R ? '⇧' : key;
}

/** What the child types on a key's card: a capital served by a Shift, else the key itself. */
export function cardSample(key: string): string {
  return key === SHIFT_L ? 'J' : key === SHIFT_R ? 'F' : key;
}

/** The card's line under the key: Shifts and space say how they are used. */
function cardHint(key: string): string {
  if (key === SHIFT_L) return t('newKey.shiftL', { sample: cardSample(key) });
  if (key === SHIFT_R) return t('newKey.shiftR', { sample: cardSample(key) });
  if (key === SPACE) return t('newKey.space');
  return t('newKey.typeIt', { key });
}

/** How to press the key: its finger, and the key to go back to when the finger does not rest on it. */
function fingerLine(layout: Layout, key: string): HTMLElement | null {
  const finger = lessonFinger(layout, key), chip = fingerChip(layout, key);
  if (finger == null || !chip) return null;
  const home = homeKey(layout, finger);
  const back = home != null && home !== key;
  // The finger name sits inside the sentence, highlighted in the finger's color.
  const [before, after] = t(back ? 'newKey.fingerBack' : 'newKey.finger', { finger: '\u0000', home: home?.toUpperCase() ?? '' }).split('\u0000');
  return h('p', { class: 'newkey-finger' }, before, chip, after ?? '');
}

/** Most marks of right and wrong keys in the card's row; older ones make room. */
const MARKS_MAX = 10;

/**
 * Introduces a new key alone: where it is and which finger, typed three times; Tapko shows it, and every
 * typed character jumps off his head. Each key leaves a green check or a red cross in the line.
 */
export function showNewKey(host: HTMLElement, key: string, layout: Layout, guide: KeyboardGuide, p: Profile): Promise<void> {
  return new Promise((resolve) => {
    const marks = h('span', { class: 'newkey-marks', 'aria-hidden': 'true' });
    const big = h('span', { class: `big-key small ${key === SPACE ? 'wide' : ''}` }, bigKeyText(key));
    const sample = cardSample(key);
    const shift = key === SHIFT_L ? 'ShiftLeft' : key === SHIFT_R ? 'ShiftRight' : null;
    const tapko = h('div', { class: 'newkey-tapko' }, tapkoElement(p.companion, 'happy', 220));
    const hint = h('span', {}, cardHint(key));
    const card = h('div', { class: 'card newkey-card', 'data-sample': sample },
      closeButton(() => done(), t('newKey.skip')),
      tapko,
      h('div', { class: 'newkey-how' },
        h('h2', {}, big, t('newKey.title')),
        fingerLine(layout, key),
        h('p', { class: 'hint newkey-type' }, hint, ' ', marks)));
    const overlay = h('div', { class: 'overlay' }, card);
    host.append(overlay);
    guide.show(sample);
    let n = 0;
    let shiftCode: string | null = null;
    const mark = (ok: boolean) => {
      if (marks.children.length >= MARKS_MAX) marks.firstElementChild!.remove();
      marks.append(h('span', { class: `newkey-mark ${ok ? 'ok' : 'bad'}` }, icon(ok ? 'check' : 'close')));
    };
    // The typed character jumps off Tapko's head in a random direction upward and fades.
    const jump = (ch: string) => {
      const a = (Math.random() * 0.8 + 0.1) * Math.PI, d = 70 + Math.random() * 40;
      const el = h('span', { class: 'newkey-jump', 'aria-hidden': 'true' }, ch === ' ' ? '␣' : ch);
      el.style.setProperty('--dx', `${Math.round(Math.cos(a) * d)}px`);
      el.style.setProperty('--dy', `${Math.round(-Math.sin(a) * d)}px`);
      el.addEventListener('animationend', () => el.remove());
      tapko.append(el);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        return done();
      }
      if (e.key === 'Shift') shiftCode = e.code;
      if (e.repeat || [...e.key].length !== 1 || n >= 3) return;
      e.preventDefault();
      // Shift cards count the capital with either Shift, but say once when it was the wrong one.
      const ok = e.key.normalize('NFC') === sample;
      if (ok && shift && shiftCode && shiftCode !== shift) hint.textContent = t('level.shiftOtherHand');
      jump(e.key);
      mark(ok);
      if (ok) {
        n++;
        audio.sfx('pop');
        if (n >= 3) setTimeout(done, 350);
      } else {
        big.classList.remove('wobble');
        void big.offsetWidth;
        big.classList.add('wobble');
        audio.sfx('wrong');
      }
    };
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      stop();
      overlay.remove();
      guide.show(null);
      resolve();
    };
    const stop = captureKeys(overlay, onKey);
  });
}

/**
 * Keys that steer the game but never count among the learned keys: the key's name in key
 * events, its symbol on the card, the finger that presses it and how many presses close its card.
 */
const CONTROL_KEYS = {
  escape: { key: 'Escape', symbol: 'Esc', finger: 0, presses: 3 },
  tab: { key: 'Tab', symbol: 'Tab', finger: 0, presses: 3 },
  backspace: { key: 'Backspace', symbol: '⌫', finger: 9, presses: 3 },
} as const;
export type ControlKey = keyof typeof CONTROL_KEYS;

/**
 * Teaches a control key once (Esc before the first key card, Tab a level after Enter came, Backspace
 * before the first crossroads): what it does in the game, which finger presses it, and tips; the child presses
 * it to close the card. Escape also skips the other cards, as on a new-key card.
 */
export function showControlKey(host: HTMLElement, id: ControlKey, lay: Layout, p: Profile): Promise<void> {
  return new Promise((resolve) => {
    const ck = CONTROL_KEYS[id];
    const marks = h('span', { class: 'newkey-marks', 'aria-hidden': 'true' });
    const home = (homeKey(lay, ck.finger) ?? '').toUpperCase();
    const [before, after] = t('newKey.fingerBack', { finger: '\u0000', home }).split('\u0000');
    const card = h('div', { class: 'card newkey-card controlkey-card', 'data-key': ck.key },
      closeButton(() => done(), t(`controlKey.${id}.close`)),
      h('div', { class: 'newkey-tapko' }, tapkoElement(p.companion, 'happy', 220)),
      h('div', { class: 'newkey-how' },
        h('h2', {}, h('span', { class: `big-key small ${ck.symbol.length > 1 ? 'named' : ''}` }, ck.symbol), t(`controlKey.${id}.title`)),
        ...tList(`controlKey.${id}.text`).map((line) => h('p', {}, ...richText(line))),
        h('p', { class: 'newkey-finger' }, before, chipOf(ck.finger), after ?? ''),
        h('p', { class: 'hint newkey-type' }, h('span', {}, t(`controlKey.${id}.type`)), ' ', marks)));
    const overlay = h('div', { class: 'overlay' }, card);
    host.append(overlay);
    let n = 0;
    const onKey = (e: KeyboardEvent) => {
      const own = e.key === ck.key;
      if (e.key === 'Escape' && !own) {
        e.preventDefault();
        e.stopPropagation();
        return done();
      }
      if (e.repeat || n >= ck.presses || (!own && [...e.key].length !== 1)) return;
      e.preventDefault();
      e.stopPropagation();
      if (marks.children.length >= MARKS_MAX) marks.firstElementChild!.remove();
      marks.append(h('span', { class: `newkey-mark ${own ? 'ok' : 'bad'}` }, icon(own ? 'check' : 'close')));
      if (!own) return audio.sfx('wrong');
      n++;
      audio.sfx('pop');
      if (n >= ck.presses) setTimeout(done, 350);
    };
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      stop();
      overlay.remove();
      resolve();
    };
    const stop = captureKeys(overlay, onKey);
  });
}

/** The home row's fingers, left pinky to right pinky. */
const HOME_FINGERS: Finger[] = [0, 1, 2, 3, 6, 7, 8, 9];
/** What the child types on the home-row card: F and J by turns. */
const HOME_TYPE = 'fjfjfj';

/** The home row's keys as small keys in their fingers' colors, a gap between the hands. */
function homeRow(lay: Layout): HTMLElement {
  return h('div', { class: 'home-row', 'aria-hidden': 'true' }, ...HOME_FINGERS.map((f) => {
    const [bg, ink] = textColorsOn(FINGER_COLORS[f]);
    const key = h('span', { class: `home-key ${f === 3 || f === 6 ? 'bump' : ''}` }, (homeKey(lay, f) ?? '').toUpperCase());
    key.style.setProperty('--finger', bg);
    key.style.setProperty('--finger-ink', ink);
    return key;
  }));
}

/**
 * The home row, taught once right after the new-key cards of F and J: where all eight fingers
 * rest (the keys of the child's layout, in the fingers' colors), the bumps on F and J, the thumbs
 * over the space bar; the child confirms it by typing F and J by turns three times. Escape skips
 * it, as on a new-key card.
 */
export function showHomeRow(host: HTMLElement, lay: Layout, guide: KeyboardGuide, p: Profile): Promise<void> {
  return new Promise((resolve) => {
    const f = homeKey(lay, 3) ?? 'f', j = homeKey(lay, 6) ?? 'j';
    const target = HOME_TYPE.replace(/f/g, f).replace(/j/g, j);
    const marks = h('span', { class: 'newkey-marks', 'aria-hidden': 'true' });
    const row = homeRow(lay);
    const card = h('div', { class: 'card newkey-card homerow-card', 'data-sample': target },
      closeButton(() => done(), t('newKey.skip')),
      h('div', { class: 'newkey-tapko' }, tapkoElement(p.companion, 'happy', 220)),
      h('div', { class: 'newkey-how' },
        h('h2', {}, t('homeRow.title')),
        row,
        h('p', {}, t('homeRow.text', { left: homeKeys(lay).split(' ')[0], right: homeKeys(lay).split(' ')[1], f: f.toUpperCase(), j: j.toUpperCase() })),
        h('p', { class: 'hint newkey-type' }, h('span', {}, t('homeRow.type', { keys: `${f}${j} ${f}${j} ${f}${j}` })), ' ', marks)));
    const overlay = h('div', { class: 'overlay' }, card);
    host.append(overlay);
    let n = 0;
    guide.show(target[0]);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        return done();
      }
      if (e.repeat || [...e.key].length !== 1 || n >= target.length) return;
      e.preventDefault();
      // A space between the pairs is fine, it neither counts nor costs.
      if (e.key === ' ') return;
      const ok = e.key.normalize('NFC') === target[n];
      if (marks.children.length >= MARKS_MAX) marks.firstElementChild!.remove();
      marks.append(h('span', { class: `newkey-mark ${ok ? 'ok' : 'bad'}` }, icon(ok ? 'check' : 'close')));
      if (!ok) return audio.sfx('wrong');
      n++;
      audio.sfx('pop');
      guide.show(target[n] ?? null);
      if (n >= target.length) setTimeout(done, 350);
    };
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      stop();
      overlay.remove();
      guide.show(null);
      resolve();
    };
    const stop = captureKeys(overlay, onKey);
  });
}

/** Simple friendly posture illustration, when the pictures are missing. */
function postureSvg(): string {
  return `<svg viewBox="0 0 220 150" role="img" aria-hidden="true">
  <rect x="120" y="20" width="80" height="55" rx="8" fill="#cfe8ff" stroke="#5a3d2b" stroke-width="3"/>
  <rect x="155" y="75" width="10" height="20" fill="#5a3d2b"/>
  <rect x="95" y="95" width="120" height="8" rx="4" fill="#c9a27a"/>
  <rect x="110" y="88" width="60" height="7" rx="3" fill="#8fa3bf"/>
  <circle cx="60" cy="38" r="16" fill="#f2c9a0" stroke="#5a3d2b" stroke-width="3"/>
  <path d="M60 54 L60 100" stroke="#4f8fd6" stroke-width="16" stroke-linecap="round"/>
  <path d="M62 66 L100 84 L118 88" stroke="#f2c9a0" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M60 100 L95 100 L95 135" stroke="#3b5d8f" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="30" y="96" width="45" height="8" rx="4" fill="#c9a27a"/><rect x="34" y="104" width="6" height="40" fill="#c9a27a"/>
  <path d="M38 40 l-8 0" stroke="#5a3d2b" stroke-width="2"/>
  <path d="M76 36 Q100 34 120 40" stroke="#ffb23e" stroke-width="2" stroke-dasharray="4 4" fill="none"/>
  <path d="M85 138 h24" stroke="#5a3d2b" stroke-width="4" stroke-linecap="round"/>
  </svg>`;
}

