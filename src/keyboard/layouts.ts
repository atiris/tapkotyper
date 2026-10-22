import type { LayoutId } from '../storage/schema';

/** Finger index: 0-4 left pinky..thumb, 5-9 right thumb..pinky. */
export type Finger = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface KeyDef {
  code: string;
  /** Character without Shift; `dead:acute` style for dead keys. */
  base: string;
  shift: string;
  finger: Finger;
  /** Width in key units (1 = normal key). */
  w?: number;
  /** Home key with a bump (F, J). */
  bump?: boolean;
}

/** One press on the way to a character. */
export interface KeyStep {
  code: string;
  shift: boolean;
}

export interface Layout {
  id: LayoutId;
  rows: KeyDef[][];
  /** Dead key name -> (letter -> composed character). */
  dead: Record<string, Record<string, string>>;
}

const k = (code: string, base: string, shift: string, finger: Finger, extra: Partial<KeyDef> = {}): KeyDef => ({ code, base, shift, finger, ...extra });

const ACUTE: Record<string, string> = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', y: 'ý', l: 'ĺ', r: 'ŕ' };
const CARON: Record<string, string> = { c: 'č', d: 'ď', l: 'ľ', n: 'ň', s: 'š', t: 'ť', z: 'ž' };
const withCapitals = (m: Record<string, string>) =>
  Object.fromEntries(Object.entries(m).flatMap(([a, b]) => [[a, b], [a.toUpperCase(), b.toUpperCase()]]));

const SK: Layout = {
  id: 'sk-qwertz',
  dead: { acute: withCapitals(ACUTE), caron: withCapitals(CARON) },
  rows: [
    [k('Backquote', ';', '°', 0), k('Digit1', '+', '1', 0), k('Digit2', 'ľ', '2', 1), k('Digit3', 'š', '3', 2), k('Digit4', 'č', '4', 3), k('Digit5', 'ť', '5', 3),
      k('Digit6', 'ž', '6', 6), k('Digit7', 'ý', '7', 6), k('Digit8', 'á', '8', 7), k('Digit9', 'í', '9', 8), k('Digit0', 'é', '0', 9), k('Minus', '=', '%', 9), k('Equal', 'dead:acute', 'dead:caron', 9)],
    [k('KeyQ', 'q', 'Q', 0, { w: 1 }), k('KeyW', 'w', 'W', 1), k('KeyE', 'e', 'E', 2), k('KeyR', 'r', 'R', 3), k('KeyT', 't', 'T', 3), k('KeyY', 'z', 'Z', 6),
      k('KeyU', 'u', 'U', 6), k('KeyI', 'i', 'I', 7), k('KeyO', 'o', 'O', 8), k('KeyP', 'p', 'P', 9), k('BracketLeft', 'ú', '/', 9), k('BracketRight', 'ä', '(', 9)],
    [k('KeyA', 'a', 'A', 0), k('KeyS', 's', 'S', 1), k('KeyD', 'd', 'D', 2), k('KeyF', 'f', 'F', 3, { bump: true }), k('KeyG', 'g', 'G', 3), k('KeyH', 'h', 'H', 6),
      k('KeyJ', 'j', 'J', 6, { bump: true }), k('KeyK', 'k', 'K', 7), k('KeyL', 'l', 'L', 8), k('Semicolon', 'ô', '"', 9), k('Quote', '§', '!', 9), k('Backslash', 'ň', ')', 9)],
    [k('ShiftLeft', 'shift', 'shift', 0, { w: 1.6 }), k('KeyZ', 'y', 'Y', 0), k('KeyX', 'x', 'X', 1), k('KeyC', 'c', 'C', 2), k('KeyV', 'v', 'V', 3), k('KeyB', 'b', 'B', 3),
      k('KeyN', 'n', 'N', 6), k('KeyM', 'm', 'M', 6), k('Comma', ',', '?', 7), k('Period', '.', ':', 8), k('Slash', '-', '_', 9), k('ShiftRight', 'shift', 'shift', 9, { w: 2.2 })],
    [k('Space', ' ', ' ', 5, { w: 6 })],
  ],
};

/** Slovak QWERTY: the Slovak layout with Y and Z in the English places. */
const SK_QWERTY: Layout = {
  id: 'sk-qwerty',
  dead: SK.dead,
  rows: SK.rows.map((row) => row.map((d) =>
    d.code === 'KeyY' ? { ...d, base: 'y', shift: 'Y' } : d.code === 'KeyZ' ? { ...d, base: 'z', shift: 'Z' } : d)),
};

const US: Layout = {
  id: 'us-qwerty',
  dead: {},
  rows: [
    [k('Backquote', '`', '~', 0), k('Digit1', '1', '!', 0), k('Digit2', '2', '@', 1), k('Digit3', '3', '#', 2), k('Digit4', '4', '$', 3), k('Digit5', '5', '%', 3),
      k('Digit6', '6', '^', 6), k('Digit7', '7', '&', 6), k('Digit8', '8', '*', 7), k('Digit9', '9', '(', 8), k('Digit0', '0', ')', 9), k('Minus', '-', '_', 9), k('Equal', '=', '+', 9)],
    [k('KeyQ', 'q', 'Q', 0), k('KeyW', 'w', 'W', 1), k('KeyE', 'e', 'E', 2), k('KeyR', 'r', 'R', 3), k('KeyT', 't', 'T', 3), k('KeyY', 'y', 'Y', 6),
      k('KeyU', 'u', 'U', 6), k('KeyI', 'i', 'I', 7), k('KeyO', 'o', 'O', 8), k('KeyP', 'p', 'P', 9), k('BracketLeft', '[', '{', 9), k('BracketRight', ']', '}', 9)],
    [k('KeyA', 'a', 'A', 0), k('KeyS', 's', 'S', 1), k('KeyD', 'd', 'D', 2), k('KeyF', 'f', 'F', 3, { bump: true }), k('KeyG', 'g', 'G', 3), k('KeyH', 'h', 'H', 6),
      k('KeyJ', 'j', 'J', 6, { bump: true }), k('KeyK', 'k', 'K', 7), k('KeyL', 'l', 'L', 8), k('Semicolon', ';', ':', 9), k('Quote', "'", '"', 9), k('Backslash', '\\', '|', 9)],
    [k('ShiftLeft', 'shift', 'shift', 0, { w: 1.6 }), k('KeyZ', 'z', 'Z', 0), k('KeyX', 'x', 'X', 1), k('KeyC', 'c', 'C', 2), k('KeyV', 'v', 'V', 3), k('KeyB', 'b', 'B', 3),
      k('KeyN', 'n', 'N', 6), k('KeyM', 'm', 'M', 6), k('Comma', ',', '<', 7), k('Period', '.', '>', 8), k('Slash', '/', '?', 9), k('ShiftRight', 'shift', 'shift', 9, { w: 2.2 })],
    [k('Space', ' ', ' ', 5, { w: 6 })],
  ],
};

export const LAYOUTS: Record<LayoutId, Layout> = { 'sk-qwertz': SK, 'sk-qwerty': SK_QWERTY, 'us-qwerty': US };

export const LAYOUT_IDS = Object.keys(LAYOUTS) as LayoutId[];

export function allKeys(layout: Layout): KeyDef[] {
  return layout.rows.flat();
}

export function keyByCode(layout: Layout, code: string): KeyDef | undefined {
  return allKeys(layout).find((d) => d.code === code);
}

/** Shift is pressed by the pinky of the other hand than the letter. */
function shiftFor(def: KeyDef): string {
  return def.finger <= 4 ? 'ShiftRight' : 'ShiftLeft';
}

/** Key presses needed for one character; empty when the layout cannot type it. */
export function stepsFor(layout: Layout, ch: string): KeyStep[] {
  for (const def of allKeys(layout)) {
    if (def.base === ch) return [{ code: def.code, shift: false }];
    if (def.shift === ch) return [{ code: def.code, shift: true }];
  }
  for (const [name, table] of Object.entries(layout.dead)) {
    const letter = Object.keys(table).find((l) => table[l] === ch);
    if (!letter) continue;
    const deadKey = allKeys(layout).find((d) => d.base === `dead:${name}` || d.shift === `dead:${name}`)!;
    const letterSteps = stepsFor(layout, letter);
    if (!letterSteps.length) continue;
    return [{ code: deadKey.code, shift: deadKey.shift === `dead:${name}` }, ...letterSteps];
  }
  return [];
}

/** The Shift key code to show for a shifted step. */
export function shiftKeyFor(layout: Layout, step: KeyStep): string | null {
  if (!step.shift) return null;
  const def = keyByCode(layout, step.code);
  return def ? shiftFor(def) : 'ShiftLeft';
}

export function fingerFor(layout: Layout, ch: string): Finger | null {
  const steps = stepsFor(layout, ch);
  if (!steps.length) return null;
  return keyByCode(layout, steps[steps.length - 1].code)?.finger ?? null;
}

export function canType(layout: Layout, ch: string): boolean {
  return stepsFor(layout, ch).length > 0;
}

/**
 * Notices when typed characters fit another layout better than the profile's,
 * for example `y`/`z` swapped or digits instead of `ľščť`.
 */
export class LayoutMismatchDetector {
  private votes = new Map<LayoutId, number>();
  /** Other layouts, those of the same language first (the likelier mix-up). */
  private others: LayoutId[];

  constructor(private layout: LayoutId, private threshold = 3) {
    const lang = layout.slice(0, 2);
    this.others = (Object.keys(LAYOUTS) as LayoutId[]).filter((id) => id !== layout)
      .sort((a, b) => Number(b.startsWith(lang)) - Number(a.startsWith(lang)));
  }

  /** Feeds one key event; returns the suspected layout once the evidence is strong enough. */
  observe(code: string, key: string, shift: boolean): LayoutId | null {
    const mine = keyByCode(LAYOUTS[this.layout], code);
    if (!mine || key.length !== 1) return null;
    const lower = key.toLowerCase();
    const typed = (d: KeyDef | undefined) => !!d && (shift ? d.shift : d.base).toLowerCase() === lower;
    if (typed(mine)) {
      for (const [id, n] of this.votes) this.votes.set(id, Math.max(0, n - 1));
      return null;
    }
    for (const id of this.others) if (typed(keyByCode(LAYOUTS[id], code))) this.votes.set(id, (this.votes.get(id) ?? 0) + 1);
    return this.others.find((id) => (this.votes.get(id) ?? 0) >= this.threshold) ?? null;
  }
}
