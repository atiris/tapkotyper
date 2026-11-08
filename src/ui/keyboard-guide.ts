import { ENTER, type Finger, type KeyDef, type Layout, type KeyStep, allKeys, fingerFor, keyByCode, shiftKeyFor, stepsFor, typesChar } from '../keyboard/layouts';
import { t } from '../i18n/i18n';
import { codeOfName } from '../keyboard/key-names';
import { FINGER_COLORS } from './finger-colors';
import { Hands } from './hands';
import { ACCURACY, SHIFT_L, SHIFT_R, SPACE } from '../learning/lessons';

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

/** The heat map's bands, best first, on the accuracy scale: super, it goes, almost, let's practise. */
export const HEAT_BANDS = [
  { cls: 'heat-super', mark: '★', label: 'stats.super', from: ACCURACY.great },
  { cls: 'heat-good', mark: '✓', label: 'stats.good', from: ACCURACY.good },
  { cls: 'heat-ok', mark: '~', label: 'stats.ok', from: ACCURACY.fair },
  { cls: 'heat-practice', mark: '!', label: 'stats.practice', from: 0 },
] as const;

/** The band of a key's accuracy. */
export function heatBand(accuracy: number): (typeof HEAT_BANDS)[number] {
  return HEAT_BANDS.find((b) => accuracy >= b.from)!;
}

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

/** The marks of the dead keys, as their caps show them. */
const DEAD_MARKS: Record<string, string> = { 'dead:acute': '´', 'dead:caron': 'ˇ' };

/** A key named by place (keyName) as its cap on the layout: its character, a digit on Shift small under it, the Shifts and space by name. */
export function namedKeyLabel(layout: Layout, name: string): { main: string; small: string } {
  const def = keyByCode(layout, codeOfName(layout, name) ?? '');
  if (!def) return { main: name, small: '' };
  if (def.base === 'shift') return { main: keyLabel(def.code === 'ShiftLeft' ? SHIFT_L : SHIFT_R), small: '' };
  const main = DEAD_MARKS[def.base] ?? keyLabel(def.base);
  return { main, small: /^\d$/.test(def.shift) && !/^\d$/.test(def.base) ? def.shift : '' };
}

/** Keys named by place as small caps in a row: a key the child knows full, one still to learn (not in `known`) as an outline. */
export function namedKeyCaps(layout: Layout, names: readonly string[], known: Set<string>): HTMLElement {
  const row = document.createElement('span');
  row.className = 'named-keys';
  for (const name of names) {
    const { main, small } = namedKeyLabel(layout, name);
    const cap = document.createElement('kbd');
    cap.className = known.has(name) ? 'kbd' : 'kbd to-learn';
    cap.textContent = main;
    if (small) cap.append(Object.assign(document.createElement('small'), { textContent: small }));
    row.append(cap);
  }
  return row;
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

/** A lesson key as a small outlined key like the on-screen keyboard's, its finger's colour on the bottom edge. */
export function keyCap(layout: Layout, key: string, onClick: () => void): HTMLButtonElement {
  const cap = document.createElement('button');
  cap.type = 'button';
  cap.className = 'key-cap';
  const f = lessonFinger(layout, key);
  if (f != null) cap.style.setProperty('--finger', FINGER_COLORS[f]);
  cap.textContent = keyLabel(key);
  cap.addEventListener('click', onClick);
  return cap;
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

/** A key's colour: its finger's; the space bar, pressed by either thumb, has one colour, the left thumb's. */
const keyColor = (def: KeyDef): string => FINGER_COLORS[def.code === 'Space' ? 4 : def.finger];

/** On-screen keyboard with finger colors, next-key highlight and dead-key two-step hints. */
export class KeyboardGuide {
  readonly el: HTMLElement;
  private keys = new Map<string, HTMLElement>();
  /** The keys `show` lit, so the next one clears only them: a change on every key restyles the whole keyboard. */
  private lit: HTMLElement[] = [];
  private board: HTMLElement;
  /** How far the board is faded (`show`). */
  private fade = 0;
  /** The outline hands on the keys, made the first time a key is shown (heat maps and pickers never show one). */
  private hands: Hands | null = null;
  private hint: HTMLElement;

  constructor(private layout: Layout) {
    this.el = document.createElement('div');
    this.el.className = 'kb-guide';
    const board = this.board = document.createElement('div');
    board.className = 'kb';
    board.setAttribute('aria-hidden', 'true');
    this.drawKeys();
    this.hint = document.createElement('div');
    this.hint.className = 'kb-hint';
    this.hint.setAttribute('aria-live', 'polite');
    this.el.append(this.hint, board);
  }

  /**
   * Another layout or fingering in place: the keys are drawn again (letters and finger colours) and the hands take
   * their poses from it; nothing else of the level changes. The key due is shown again by whoever shows it.
   */
  relayout(layout: Layout): void {
    this.layout = layout;
    this.board.querySelectorAll(':scope > .kb-row').forEach((r) => r.remove());
    this.keys.clear();
    this.drawKeys();
    this.hands?.setLayout(layout);
  }

  /** The rows of keys, after the hands' layer: the hands come first, so a sibling rule can hide the lit key's letter under them. */
  private drawKeys(): void {
    const layout = this.layout, board = this.board;
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
        k.style.setProperty('--finger', keyColor(def));
        k.style.setProperty('--finger-ink', inkOn(keyColor(def)));
        const [textBg, textInk] = textColorsOn(keyColor(def));
        k.style.setProperty('--next-bg', textBg);
        k.style.setProperty('--next-ink', textInk);
        k.innerHTML = `<span class="kb-label">${zeroDot(label(def.base, def.shift))}</span>` +
          (typesChar(def) && def.base !== ' ' ? `<span class="kb-shift">${def.base.startsWith('dead') || def.shift.toLowerCase() === def.base ? '' : zeroDot(def.shift)}</span>` : '');
        r.appendChild(k);
        this.keys.set(def.code, k);
      }
      board.append(r);
    }
  }

  private handsView(): Hands {
    if (!this.hands) {
      this.hands = new Hands(this.layout);
      this.hands.look(this.handsMode);
      this.board.prepend(this.hands.el);
    }
    return this.hands;
  }

  private handsMode: 'on' | 'bold' | 'off' = 'on';
  /** The hands shown, emphasized or hidden (the profile's choice). */
  setHands(mode: 'on' | 'bold' | 'off'): void {
    this.handsMode = mode;
    this.hands?.look(mode);
  }

  /** The hands rest beside the keyboard (on) or come onto the keys in the home position (off), at once or gliding for `glideS` seconds. */
  parkHands(on: boolean, glideS = 0): void {
    this.handsView().park(on, glideS);
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
    for (const k of this.lit) k.classList.remove('next', 'next2', 'shift-next');
    this.lit = [];
    // The board's own opacity, not an inherited value: a change then restyles one element, not every key.
    if (fade !== this.fade) this.board.style.opacity = String(1 - (this.fade = fade));
    this.hint.textContent = '';
    this.el.dataset.next = ch ?? '';
    const steps = ch ? stepsFor(this.layout, ch) : [];
    if (!ch || !steps.length) {
      this.handsView().show(null);
      return;
    }
    const current: KeyStep = steps.length > 1 && deadDone ? steps[steps.length - 1] : steps[0];
    const def = keyByCode(this.layout, current.code)!;
    this.handsView().show({ step: current, label: label(def.base, def.shift), color: keyColor(def) });
    this.mark(current, 'next');
    if (steps.length > 1) {
      if (!deadDone) this.mark(steps[steps.length - 1], 'next2');
      this.hint.textContent = deadDone ? t('guide.deadStep2', { ch }) : t('guide.deadStep1', { ch });
    }
  }

  private mark(step: KeyStep, cls: string): void {
    const light = (k: HTMLElement | undefined, c: string) => {
      if (!k) return;
      k.classList.add(c);
      this.lit.push(k);
    };
    light(this.keys.get(step.code), cls);
    // An L-shaped Enter lights up whole.
    if (step.code === 'Enter') light(this.keys.get('EnterTop'), cls);
    const shift = shiftKeyFor(this.layout, step);
    if (shift && cls === 'next') light(this.keys.get(shift), 'shift-next');
  }

  /**
   * Sticky finger: the keys a run holds (codes), drawn as pressed with a soft golden glow; those of them that are up
   * (`up`) blink gently instead. The hands rest the holding finger on each key held down.
   */
  hold(codes: readonly string[], up: readonly string[]): void {
    for (const [code, k] of this.keys) {
      k.classList.toggle('held', codes.includes(code) && !up.includes(code));
      k.classList.toggle('hold-up', up.includes(code));
    }
    if (codes.length || this.hands) this.handsView().hold(codes.filter((c) => !up.includes(c)));
  }

  setVisible(on: boolean): void {
    this.el.classList.toggle('hidden', !on);
  }

  /** Free typing: the hands show the key just typed (its code, with or without Shift) for a moment. */
  press(code: string, shift: boolean): void {
    const def = keyByCode(this.layout, code);
    if (!def) return;
    this.handsView().press({ step: { code, shift }, label: label(def.base, def.shift), color: keyColor(def) });
  }

  /** Colors keys by accuracy for the stats heat map, in the bands of the accuracy scale (null = no data). */
  heat(accuracy: Record<string, number | null>, keyFor: (code: string) => string | null): void {
    for (const [code, el] of this.keys) {
      const key = keyFor(code);
      const a = key ? accuracy[key] : undefined;
      el.classList.remove(...HEAT_BANDS.map((b) => b.cls));
      el.removeAttribute('data-heat');
      if (a == null) continue;
      const band = heatBand(a);
      el.classList.add(band.cls);
      el.dataset.heat = band.mark;
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

  /**
   * A key cap for a tool under a Shift (`under`), as wide as that Shift: a latch (`latch`, it stays pressed until
   * pressed again, as Caps Lock) or a plain key. The content is its label or picture, `label` its tooltip and name.
   */
  toolKey(under: 'ShiftLeft' | 'ShiftRight', content: Node | string, label: string, onPress: (on: boolean) => void, latch = false): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'kb-key kb-tool';
    b.style.setProperty('--w', String(keyByCode(this.layout, under)?.w ?? 1));
    b.setAttribute('aria-label', label);
    b.dataset.tip = label;
    if (latch) b.setAttribute('aria-pressed', 'false');
    b.append(content);
    b.addEventListener('click', () => {
      const on = latch && b.getAttribute('aria-pressed') !== 'true';
      if (latch) {
        b.setAttribute('aria-pressed', String(on));
        b.classList.toggle('on', on);
      } else {
        // A plain key goes down visibly for a moment, also when Enter or Space pressed it.
        b.classList.add('pressed');
        setTimeout(() => b.classList.remove('pressed'), 250);
      }
      onPress(on);
    });
    return b;
  }

  /**
   * Tool keys in the free room of the bottom row beside the space bar: `left` under the left Shift and, optionally,
   * `right` under the right one. They sit outside the board, which is hidden from screen readers.
   */
  bottomSlots(left: HTMLElement, right?: HTMLElement): void {
    const slot = (el: HTMLElement) => {
      const s = document.createElement('div');
      s.className = 'kb-slot';
      s.append(el);
      return s;
    };
    const slots = document.createElement('div');
    slots.className = 'kb-slots';
    slots.append(slot(left), ...(right ? [slot(right)] : []));
    this.el.append(slots);
  }

  keyEl(code: string): HTMLElement | undefined {
    return this.keys.get(code);
  }
}
