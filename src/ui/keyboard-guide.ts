import { ENTER, type Finger, type Layout, type KeyStep, allKeys, fingerFor, shiftKeyFor, stepsFor } from '../keyboard/layouts';
import { t } from '../i18n/i18n';
import { SHIFT_L, SHIFT_R, SPACE } from '../learning/lessons';

/** Finger colors (Okabe-Ito based, colorblind-safe) plus a number label on each key. */
export const FINGER_COLORS: Record<Finger, string> = {
  0: '#e69f00', 1: '#56b4e9', 2: '#009e73', 3: '#f0c419', 4: '#bbbbbb',
  5: '#bbbbbb', 6: '#0072b2', 7: '#d55e00', 8: '#cc79a7', 9: '#8fbc3a',
};
/** 1 = thumb .. 5 = pinky, as children count fingers. */
export const FINGER_NUMBER: Record<Finger, number> = { 0: 5, 1: 4, 2: 3, 3: 2, 4: 1, 5: 1, 6: 2, 7: 3, 8: 4, 9: 5 };
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

function label(base: string, shift: string): string {
  if (base === 'dead:acute') return '´ ˇ';
  if (base === 'shift') return '⇧';
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
  private hands: HTMLElement;
  private paws: HTMLElement;
  private hint: HTMLElement;

  constructor(private layout: Layout) {
    this.el = document.createElement('div');
    this.el.className = 'kb-guide';
    const board = this.board = document.createElement('div');
    board.className = 'kb';
    board.setAttribute('aria-hidden', 'true');
    for (const row of layout.rows) {
      const r = document.createElement('div');
      r.className = 'kb-row';
      for (const def of row) {
        const k = document.createElement('div');
        k.className = 'kb-key';
        if (def.bump) k.classList.add('bump');
        k.style.setProperty('--w', String(def.w ?? 1));
        k.style.setProperty('--finger', FINGER_COLORS[def.finger]);
        k.style.setProperty('--finger-ink', inkOn(FINGER_COLORS[def.finger]));
        const [textBg, textInk] = textColorsOn(FINGER_COLORS[def.finger]);
        k.style.setProperty('--next-bg', textBg);
        k.style.setProperty('--next-ink', textInk);
        k.innerHTML = `<span class="kb-label">${zeroDot(label(def.base, def.shift))}</span>` +
          (def.base !== ' ' && def.base !== 'shift' ? `<span class="kb-shift">${def.base.startsWith('dead') || def.shift.toLowerCase() === def.base ? '' : zeroDot(def.shift)}</span><span class="kb-num">${FINGER_NUMBER[def.finger]}</span>` : '');
        r.appendChild(k);
        this.keys.set(def.code, k);
      }
      board.appendChild(r);
    }
    this.hands = document.createElement('div');
    this.hands.className = 'kb-hands';
    this.hands.innerHTML = handsSvg();
    this.paws = document.createElement('div');
    this.paws.className = 'kb-paws';
    this.paws.innerHTML = pawSvg('l') + pawSvg('r');
    this.hint = document.createElement('div');
    this.hint.className = 'kb-hint';
    this.hint.setAttribute('aria-live', 'polite');
    this.el.append(this.hint, board, this.hands, this.paws);
  }

  /**
   * Shows the next character. `deadDone`: the accent key was already pressed.
   * `fade`: 0 full guide .. 1 almost hidden (the key is mastered).
   */
  show(ch: string | null, deadDone = false, fade = 0): void {
    for (const k of this.keys.values()) k.classList.remove('next', 'next2', 'shift-next');
    this.hands.querySelectorAll('.finger').forEach((f) => f.classList.remove('active'));
    this.el.style.setProperty('--fade', String(fade));
    this.hint.textContent = '';
    this.el.dataset.next = ch ?? '';
    if (!ch) return;
    const steps = stepsFor(this.layout, ch);
    if (!steps.length) return;
    const current: KeyStep = steps.length > 1 && deadDone ? steps[steps.length - 1] : steps[0];
    this.mark(current, 'next');
    if (steps.length > 1) {
      if (!deadDone) this.mark(steps[steps.length - 1], 'next2');
      this.hint.textContent = deadDone ? t('guide.deadStep2', { ch }) : t('guide.deadStep1', { ch });
    }
  }

  private mark(step: KeyStep, cls: string): void {
    const key = this.keys.get(step.code);
    key?.classList.add(cls);
    const def = allKeys(this.layout).find((d) => d.code === step.code);
    if (def && cls === 'next') this.hands.querySelector(`[data-f="${def.finger}"]`)?.classList.add('active');
    const shift = shiftKeyFor(this.layout, step);
    if (shift && cls === 'next') {
      this.keys.get(shift)?.classList.add('shift-next');
      const sdef = allKeys(this.layout).find((d) => d.code === shift);
      if (sdef) this.hands.querySelector(`[data-f="${sdef.finger}"]`)?.classList.add('active');
    }
  }

  setVisible(on: boolean): void {
    this.el.classList.toggle('hidden', !on);
  }

  /** Tapko's paws (fur and toe-bean colors) take the hands' place; null brings the hands back. */
  setPaws(colors: [string, string] | null): void {
    this.el.classList.toggle('paws-on', !!colors);
    if (!colors) return;
    this.paws.style.setProperty('--paw', colors[0]);
    this.paws.style.setProperty('--bean', colors[1]);
  }

  /** The paw on the side of the finger for `ch` presses a key. */
  pawTap(ch: string): void {
    const f = fingerFor(this.layout, ch);
    const paw = f == null ? null : this.paws.querySelector(`.kb-paw-${f < 5 ? 'l' : 'r'}`);
    if (!paw) return;
    paw.classList.remove('tap');
    void (paw as HTMLElement).getBoundingClientRect();
    paw.classList.add('tap');
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

function handsSvg(): string {
  // Two hands seen from above ("soft palm"): rounded skin fingers with a band in the finger's
  // color over a faint palm; each finger carries data-f with its finger index.
  const finger = (f: Finger, cx: number, top: number, rot: number, bx: number, by: number, bottom = 98) =>
    `<g class="finger" data-f="${f}"><g transform="rotate(${rot} ${bx} ${by})">` +
    `<rect class="skin" x="${cx - 10.5}" y="${top}" width="21" height="${bottom - top}" rx="10.5"/>` +
    `<rect class="tip-band" x="${cx - 9.6}" y="${top + 13}" width="19.2" height="6" fill="${FINGER_COLORS[f]}"/></g></g>`;
  const hand = (side: 'l' | 'r') => {
    const f = (left: Finger): Finger => (side === 'l' ? left : (9 - left) as Finger);
    const body = '<path class="palm" d="M14 88C14 80 20 78 28 78L86 78C95 78 99 84 98 92C97 104 93 114 86 120C80 125 73 127 62 127L46 127C33 127 24 122 19 113C15 106 14 98 14 88Z"/>' +
      finger(f(0), 22, 46, -7, 22, 96) + finger(f(1), 43, 22, -2, 43, 96) +
      finger(f(2), 64, 12, 1, 64, 96) + finger(f(3), 85, 26, 5, 85, 96) +
      finger(f(4), 92, 62, 40, 92, 104, 108);
    return `<svg viewBox="0 0 130 132" class="hand hand-${side}"><g${side === 'r' ? ' transform="translate(130 0) scale(-1 1)"' : ''}>${body}</g></svg>`;
  };
  return hand('l') + hand('r');
}

/** One of Tapko's paws seen from above: a soft paw with four toes and toe beans. */
function pawSvg(side: 'l' | 'r'): string {
  const toes = [[22, 50], [48, 30], [82, 30], [108, 50]]
    .map(([x, y]) => `<ellipse class="paw-fur" cx="${x}" cy="${y}" rx="15" ry="18"/><ellipse class="bean" cx="${x}" cy="${y + 3}" rx="7" ry="9"/>`).join('');
  return `<svg viewBox="0 0 130 132" class="kb-paw kb-paw-${side}" aria-hidden="true">${toes}` +
    `<ellipse class="paw-fur" cx="65" cy="96" rx="48" ry="34"/><ellipse class="bean" cx="65" cy="100" rx="24" ry="17"/></svg>`;
}
