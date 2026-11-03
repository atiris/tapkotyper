import { ENTER, type Finger, type Layout, type KeyStep, allKeys, fingerFor, keyByCode, shiftKeyFor, stepsFor, typesChar } from '../keyboard/layouts';
import { t } from '../i18n/i18n';
import { FINGER_COLORS } from './finger-colors';
import { Hands } from './hands';
import { SHIFT_L, SHIFT_R, SPACE } from '../learning/lessons';

/** 1 = thumb .. 5 = pinky, as children count fingers. */
export const FINGER_KEYS: Record<Finger, string> = {
  0: 'leftPinky', 1: 'leftRing', 2: 'leftMiddle', 3: 'leftIndex', 4: 'leftThumb',
  5: 'rightThumb', 6: 'rightIndex', 7: 'rightMiddle', 8: 'rightRing', 9: 'rightPinky',
};

const DARK_INK = '#2d2140';

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Text color on a highlighted key: white or dark, whichever reads better on the finger color. */
export function inkOn(hex: string): string {
  return contrast(hex, '#ffffff') >= contrast(hex, DARK_INK) ? '#ffffff' : DARK_INK;
}

/** WCAG AA contrast for normal-size text. */
const TEXT_CONTRAST = 4.5;

/**
 * Background and ink for text on a finger color: the color itself when one ink reaches
 * AA, else the color darkened step by step until white text does.
 */
export function textColorsOn(hex: string): [string, string] {
  let bg = hex;
  for (let k = 0.95; contrast(bg, inkOn(bg)) < TEXT_CONTRAST && k > 0.5; k -= 0.05) {
    const n = parseInt(hex.slice(1), 16);
    bg = `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * k).toString(16).padStart(2, '0')).join('')}`;
  }
  return [bg, inkOn(bg)];
}

/** How a lesson key is named in texts: space, Enter and the Shifts by name, other keys as they are. */
export function keyLabel(key: string): string {
  return key === SPACE ? t('keys.space') : key === ENTER ? t('keys.enter') : key === SHIFT_L ? t('keys.shiftL') : key === SHIFT_R ? t('keys.shiftR') : key;
}

/** Finger of a lesson key; each Shift is pressed by its own hand's pinky. */
export function lessonFinger(layout: Layout, key: string): Finger | null {
  return key === SHIFT_L ? 0 : key === SHIFT_R ? 9 : fingerFor(layout, key);
}

/** Finger name on the finger's own color, as on the keyboard guide. */
export function fingerChip(layout: Layout, key: string): HTMLElement | null {
  const f = lessonFinger(layout, key);
  return f == null ? null : chipOf(f);
}

/** A finger's name on its own color. */
export function chipOf(f: Finger): HTMLElement {
  const chip = document.createElement('b');
  chip.className = 'finger-chip';
  const [bg, ink] = textColorsOn(FINGER_COLORS[f]);
  chip.style.setProperty('--finger', bg);
  chip.style.setProperty('--finger-ink', ink);
  chip.textContent = t(`fingers.${FINGER_KEYS[f]}`);
  return chip;
}

/** Signs of the keys drawn only for the keyboard's shape (the upper part of an L-shaped Enter has none). */
const SHAPE_LABELS: Record<string, string> = { tab: '⇥', caps: '⇪', backspace: '⌫', 'enter-top': '' };

function label(base: string, shift: string): string {
  if (base === 'dead:acute') return '´ ˇ';
  if (base === 'shift') return '⇧';
  if (base in SHAPE_LABELS) return SHAPE_LABELS[base];
  if (base === ' ') return '';
  if (base.length === 1 && base.toUpperCase() === shift) return base.toUpperCase();
  return base;
}

/** A slashed zero, so it is never taken for the letter O. */
function zeroDot(text: string): string {
  return text === '0' ? '<span class="kb-zero">0</span>' : text;
}

/** On-screen keyboard with finger colors, next-key highlight and dead-key two-step hints. */
export class KeyboardGuide {
  readonly el: HTMLElement;
  private keys = new Map<string, HTMLElement>();
  private board: HTMLElement;
  /** The outline hands on the keys, made the first time a key is shown (heat maps and pickers never show one). */
  private hands: Hands | null = null;
  private hint: HTMLElement;

  constructor(private layout: Layout) {
    this.el = document.createElement('div');
    this.el.className = 'kb-guide';
    const board = this.board = document.createElement('div');
    board.className = 'kb';
    board.setAttribute('aria-hidden', 'true');
    const isoEnter = allKeys(layout).some((d) => d.base === 'enter-top');
    for (const row of layout.rows) {
      const r = document.createElement('div');
      r.className = 'kb-row';
      for (const def of row) {
        const k = document.createElement('div');
        k.className = 'kb-key';
        if (def.bump) k.classList.add('bump');
        k.style.setProperty('--w', String(def.w ?? 1));
        if (def.x) k.style.setProperty('--x', String(def.x));
        if (def.base === 'enter-top') k.classList.add('kb-enter-top');
        if (def.code === 'Enter' && isoEnter) k.classList.add('kb-enter-l');
        k.style.setProperty('--finger', FINGER_COLORS[def.finger]);
        k.style.setProperty('--finger-ink', inkOn(FINGER_COLORS[def.finger]));
        const [textBg, textInk] = textColorsOn(FINGER_COLORS[def.finger]);
        k.style.setProperty('--next-bg', textBg);
        k.style.setProperty('--next-ink', textInk);
        k.innerHTML = `<span class="kb-label">${zeroDot(label(def.base, def.shift))}</span>` +
          (typesChar(def) && def.base !== ' ' ? `<span class="kb-shift">${def.base.startsWith('dead') || def.shift.toLowerCase() === def.base ? '' : zeroDot(def.shift)}</span>` : '');
        r.appendChild(k);
        this.keys.set(def.code, k);
      }
      board.appendChild(r);
    }
    this.hint = document.createElement('div');
    this.hint.className = 'kb-hint';
    this.hint.setAttribute('aria-live', 'polite');
    this.el.append(this.hint, board);
  }

  private handsView(): Hands {
    if (!this.hands) {
      this.hands = new Hands(this.layout);
      this.board.append(this.hands.el);
    }
    return this.hands;
  }

  /** The hands rest beside the keyboard (on) or come onto the keys in the home position (off). */
  parkHands(on: boolean): void {
    this.handsView().park(on);
  }

  /** The hands' outline of the key typed last, `<side>/<name>`. */
  get handPose(): string {
    return this.handsView().lastPose;
  }

  /**
   * Shows the next character. `deadDone`: the accent key was already pressed.
   * `fade`: 0 full guide .. 1 almost hidden (the key is mastered).
   */
  show(ch: string | null, deadDone = false, fade = 0): void {
    for (const k of this.keys.values()) k.classList.remove('next', 'next2', 'shift-next');
    this.el.style.setProperty('--fade', String(fade));
    this.hint.textContent = '';
    this.el.dataset.next = ch ?? '';
    const steps = ch ? stepsFor(this.layout, ch) : [];
    if (!ch || !steps.length) {
      this.handsView().show(null);
      return;
    }
    const current: KeyStep = steps.length > 1 && deadDone ? steps[steps.length - 1] : steps[0];
    const def = keyByCode(this.layout, current.code)!;
    this.handsView().show({ step: current, label: label(def.base, def.shift), color: FINGER_COLORS[def.finger] });
    this.mark(current, 'next');
    if (steps.length > 1) {
      if (!deadDone) this.mark(steps[steps.length - 1], 'next2');
      this.hint.textContent = deadDone ? t('guide.deadStep2', { ch }) : t('guide.deadStep1', { ch });
    }
  }

  private mark(step: KeyStep, cls: string): void {
    const key = this.keys.get(step.code);
    key?.classList.add(cls);
    // An L-shaped Enter lights up whole.
    if (step.code === 'Enter') this.keys.get('EnterTop')?.classList.add(cls);
    const shift = shiftKeyFor(this.layout, step);
    if (shift && cls === 'next') this.keys.get(shift)?.classList.add('shift-next');
  }

  setVisible(on: boolean): void {
    this.el.classList.toggle('hidden', !on);
  }

  /** Free typing: the hands show the key just typed (its code, with or without Shift) for a moment. */
  press(code: string, shift: boolean): void {
    const def = keyByCode(this.layout, code);
    if (!def) return;
    this.handsView().press({ step: { code, shift }, label: label(def.base, def.shift), color: FINGER_COLORS[def.finger] });
  }

  /** The keys of `ch` go down for a moment: the hands type it (the paw help). */
  tap(ch: string): void {
    for (const step of stepsFor(this.layout, ch)) {
      const key = this.keys.get(step.code);
      if (!key) continue;
      key.classList.remove('tap');
      void key.offsetWidth;
      key.classList.add('tap');
    }
  }

  /** Colors keys by score for the stats heat map (0 bad .. 1 good, null = no data). */
  heat(scores: Record<string, number | null>, keyFor: (code: string) => string | null): void {
    for (const [code, el] of this.keys) {
      const key = keyFor(code);
      const s = key ? scores[key] : undefined;
      el.classList.remove('heat-good', 'heat-ok', 'heat-practice');
      el.removeAttribute('data-heat');
      if (s == null) continue;
      const cls = s >= 0.85 ? 'heat-good' : s >= 0.65 ? 'heat-ok' : 'heat-practice';
      el.classList.add(cls);
      el.dataset.heat = s >= 0.85 ? '✓' : s >= 0.65 ? '~' : '!';
    }
  }

  /** Makes keys clickable (key pickers, heat map). */
  onKeyClick(fn: (code: string, el: HTMLElement) => void): void {
    for (const [code, el] of this.keys) el.addEventListener('click', () => fn(code, el));
  }

  /** Lets the keyboard and screen readers reach the keys; the picker gives them role, label and state. */
  exposeKeys(): void {
    this.board.removeAttribute('aria-hidden');
    this.board.addEventListener('keydown', (e) => {
      const key = (e.target as HTMLElement).closest<HTMLElement>('.kb-key[role="button"]');
      if (!key || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      key.click();
    });
  }

  keyEl(code: string): HTMLElement | undefined {
    return this.keys.get(code);
  }
}
