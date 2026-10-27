import { audio } from '../audio/audio';
import { t, tMap } from '../i18n/i18n';
import { type Layout, enterAfter, homeKey } from '../keyboard/layouts';
import { layout } from '../app/app';
import type { Profile, Surprise } from '../storage/schema';
import { surpriseCount } from './own-content';
import type { Style } from './typing';
import { type KeyboardGuide, fingerChip, lessonFinger } from '../ui/keyboard-guide';
import { button, closeButton, h, icon } from '../ui/dom';
import { tapkoElement } from '../gfx/tapko';
import { imageUrl } from '../gfx/assets';
import { SHIFT_L, SHIFT_R, SPACE } from '../learning/lessons';

interface CardOpts {
  button?: string;
  cls?: string;
}

/**
 * Captures keys for a card while it is on screen. A card that leaves together with its
 * screen (back button, map) lets go by itself, so it never swallows the next level's keys.
 */
export function captureKeys(overlay: HTMLElement, onKey: (e: KeyboardEvent) => void): () => void {
  const stop = () => window.removeEventListener('keydown', listener, true);
  const listener = (e: KeyboardEvent) => (overlay.isConnected ? onKey(e) : stop());
  window.addEventListener('keydown', listener, true);
  return stop;
}

/** Overlay card over the stage; Enter, Space or Escape dismisses it, and it resolves then. */
export function showCard(host: HTMLElement, content: HTMLElement, o: CardOpts = {}): Promise<void> {
  return new Promise((resolve) => {
    const card = h('div', { class: `card ${o.cls ?? ''}` }, content);
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

const POSTURE_TIPS = ['back', 'feet', 'wrists', 'home', 'eyes'];

/** Good posture picture with one line: the given tip, else one random posture reminder (one is read, a list is skipped). */
/** The posture picture and a tip (or `line`); before a story level `story` tells what the level is about. */
export function postureContent(line?: string, story?: string | null): HTMLElement {
  const src = imageUrl('ui-posture');
  const tip = POSTURE_TIPS[Math.floor(Math.random() * POSTURE_TIPS.length)];
  return h('div', { class: 'posture' },
    h('h2', {}, t('posture.title')),
    src ? h('img', { class: 'posture-img', src, alt: '' }) : h('div', { class: 'posture-img', html: postureSvg() }),
    // The story and the tip read as one paragraph, apart from the title and from what to press.
    h('p', { class: 'posture-text' }, story ? `${story} ` : null, line ?? t(`posture.${tip}`)));
}

/**
 * Get-ready card before every adventure, with the level's story line when it has one, the session's preparation tip when one is due
 * and the question of a parent's surprise asked in this run (with what is still left when it
 * counts) and a note on the run when one is due; the space bar, Enter or Escape (or a tap on the
 * space bar's drawing or the close button) closes it and opens the adventure.
 */
export function showPosture(host: HTMLElement, p: Profile, tip?: string, surprise?: Surprise | null, note?: string, story?: string | null): Promise<void> {
  return new Promise((resolve) => {
    const close = () => {
      stop();
      overlay.remove();
      resolve();
    };
    const space = h('button', { class: 'space-key', type: 'button', 'aria-label': t('posture.space'), onClick: close }, t('posture.spaceKey'));
    const card = h('div', { class: 'card posture-card' },
      closeButton(close, t('posture.close')),
      postureContent(tip, story),
      surprise ? surpriseAsk(surprise.q) : null,
      surprise ? surpriseLeft(p, surprise) : null,
      note ? h('p', { class: 'hint style-note' }, note) : null,
      h('p', { class: 'space-label' }, t('posture.space')),
      space);
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
export function surpriseTold(s: Surprise): HTMLElement {
  const pic = imageUrl('ui-surprise-open');
  return h('div', { class: 'surprise-told' },
    pic ? h('img', { class: 'surprise-box', src: pic, alt: '' }) : null,
    h('div', { class: 'surprise-result' }, surpriseAsk(s.q), h('p', { class: 'surprise answer' }, s.a)));
}

/** What a counting surprise still needs ("2 more levels"), or null when it is reached or does not count. */
export function surpriseLeft(p: Profile, s: Surprise): HTMLElement | null {
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

/** Simple friendly posture illustration. */
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

