import { audio } from '../audio/audio';
import { t, tMap } from '../i18n/i18n';
import type { Layout } from '../keyboard/layouts';
import type { Profile, Surprise } from '../storage/schema';
import { surpriseCount } from './own-content';
import type { Style } from './typing';
import { type KeyboardGuide, fingerChip } from '../ui/keyboard-guide';
import { button, h } from '../ui/dom';
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

/** Overlay card over the stage; resolves when dismissed. */
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
      if (e.key === 'Enter' || e.key === 'Escape') {
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

/** One random preparation tip for a run of this style, never one of the last five shown. */
export function pickTip(p: Profile, style: Style = 'copy'): { id: string; text: string } | null {
  const tips = tMap('tips');
  const ids = Object.keys(tips).filter((id) => fitsStyle(id, style) && (p.layout !== 'us-qwerty' || !SK_ONLY_TIPS.has(id)) && (p.layout === 'sk-qwertz' || !QWERTZ_ONLY_TIPS.has(id)) && (p.progress.unlockedKeys.length >= 12 || !LATER_TIPS.has(id)));
  if (!ids.length) return null;
  const fresh = ids.filter((id) => !p.progress.lastTips.includes(id));
  const id = (fresh.length ? fresh : ids)[Math.floor(Math.random() * (fresh.length || ids.length))];
  p.progress.lastTips = [...p.progress.lastTips, id].slice(-5);
  return { id, text: tips[id] };
}

const POSTURE_TIPS = ['back', 'feet', 'wrists', 'home', 'eyes'];

/** Good posture picture with one line: the given tip, else one random posture reminder (one is read, a list is skipped). */
export function postureContent(line?: string): HTMLElement {
  const src = imageUrl('ui-posture');
  const tip = POSTURE_TIPS[Math.floor(Math.random() * POSTURE_TIPS.length)];
  return h('div', { class: 'posture' },
    h('h2', {}, t('posture.title')),
    src ? h('img', { class: 'posture-img', src, alt: '' }) : h('div', { class: 'posture-img', html: postureSvg() }),
    h('p', { class: 'posture-tip' }, line ?? t(`posture.${tip}`)));
}

/**
 * Get-ready card before every adventure, with the session's preparation tip when one is due
 * and the question of a parent's surprise asked in this run (with what is still left when it
 * counts) and a note on the run when one is due; the space bar (or a tap on its drawing)
 * opens the adventure, Escape cancels it.
 */
export function showPosture(host: HTMLElement, p: Profile, tip?: string, surprise?: Surprise | null, note?: string): Promise<'start' | 'cancel'> {
  return new Promise((resolve) => {
    const close = (how: 'start' | 'cancel') => {
      stop();
      overlay.remove();
      resolve(how);
    };
    const space = h('button', { class: 'space-key', type: 'button', 'aria-label': t('posture.space'), onClick: () => close('start') }, t('posture.spaceKey'));
    const card = h('div', { class: 'card posture-card' },
      postureContent(tip),
      surprise ? surpriseAsk(surprise.q) : null,
      surprise ? surpriseLeft(p, surprise) : null,
      note ? h('p', { class: 'hint style-note' }, note) : null,
      h('p', { class: 'space-label' }, t('posture.space')),
      space,
      h('p', { class: 'hint' }, t('posture.escHint')));
    const overlay = h('div', { class: 'overlay' }, card);
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== ' ' && e.key !== 'Escape')) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') return close('cancel');
      audio.sfx('pop');
      close('start');
    };
    const stop = captureKeys(overlay, onKey);
    host.append(overlay);
  });
}

/** The question of a parent's surprise. */
export function surpriseAsk(question: string): HTMLElement {
  return h('p', { class: 'surprise ask' }, h('b', {}, t('surprise.ask')), ' ', question);
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

/** Introduces a new key alone: where it is and which finger, typed three times; Tapko shows it. */
export function showNewKey(host: HTMLElement, key: string, layout: Layout, guide: KeyboardGuide, p: Profile): Promise<void> {
  return new Promise((resolve) => {
    const chip = fingerChip(layout, key);
    const dots = h('div', { class: 'dots' }, h('span'), h('span'), h('span'));
    const big = h('div', { class: `big-key ${key === SPACE ? 'wide' : ''}` }, bigKeyText(key));
    const sample = cardSample(key);
    const shift = key === SHIFT_L ? 'ShiftLeft' : key === SHIFT_R ? 'ShiftRight' : null;
    // The finger name sits inside the sentence, highlighted in the finger's color.
    const [before, after] = t('newKey.finger', { finger: '\u0000' }).split('\u0000');
    const card = h('div', { class: 'card newkey-card', 'data-sample': sample },
      h('h2', {}, t('newKey.title', { key: bigKeyText(key) })),
      h('div', { class: 'newkey-body' },
        tapkoElement(p.companion, 'happy', 120),
        h('div', { class: 'newkey-how' },
          big,
          chip ? h('p', { class: 'newkey-finger' }, before, chip, after ?? '') : null,
          h('p', { class: 'hint' }, cardHint(key)),
          dots)),
      button(`${t('common.skip')} (Esc)`, () => done(), 'btn small ghost'));
    const overlay = h('div', { class: 'overlay' }, card);
    host.append(overlay);
    guide.show(sample);
    let n = 0;
    let shiftCode: string | null = null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        return done();
      }
      if (e.key === 'Shift') shiftCode = e.code;
      if (e.repeat || [...e.key].length !== 1) return;
      e.preventDefault();
      // Shift cards count the capital with either Shift, but say once when it was the wrong one.
      const ok = e.key.normalize('NFC') === sample;
      if (ok && shift && shiftCode && shiftCode !== shift) hint.textContent = t('level.shiftOtherHand');
      if (ok) {
        dots.children[n]?.classList.add('on');
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
    const hint = card.querySelector<HTMLElement>('.hint')!;
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

