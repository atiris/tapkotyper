import { drawCached, fontFamily, type G, wordBox } from '../../../gfx/draw';
import { storyOf } from '../../levels';
import type { LevelRuntime } from '../../runtime';
import type { Target } from '../../typing';

/** Extra words a slip may still add: 2 each, up to (1 + story order) x 3 in all. */
export function slipWords(storyOrder: number, added: number): number {
  return Math.max(0, Math.min(2, (1 + storyOrder) * 3 - added));
}

/** A word of the row: the one to type is a target, the others are ink. */
interface Slot {
  word: string;
  tg: Target;
  /** Seconds since a slip faded it (-1: no slip). */
  slip: number;
}

/** A slipped word's red. */
export const SLIP_INK = '#d9482b';
const SLIP_FADE = 0.6;
/** What stays of a slipped word: a faint trace where it stood. */
const SLIP_TRACE = 0.2;
const WORD_SIZE = 40;
const WORD_GAP = 26;

/**
 * The copy twist's row (a clean line): 3 to 4 words typed from left to right. A slip turns the
 * word red, it fades to a faint trace, and the level gets more words (`slipWords`).
 */
export class CopyRow {
  private row: Slot[] = [];
  private at = 0;
  /** Words typed or faded in the whole level. */
  resolved = 0;
  /** Words typed right in the whole level. */
  typed = 0;
  /** Words added by slips. */
  private added = 0;
  /** Words of this row typed right, and slipped. */
  rowTyped = 0;
  rowSlips = 0;

  constructor(private L: LevelRuntime) {}

  /** Words of the level still to come. */
  get left(): number {
    return this.L.count - this.resolved;
  }

  /** Every word of the row is typed or faded. */
  get complete(): boolean {
    return this.at >= this.row.length;
  }

  /** A new row of 3 to 4 words (fewer at the level's end); none when the level's words are done. */
  fill(): void {
    const n = Math.min(this.L.rng.int(3, 4), Math.max(0, this.left));
    this.at = 0;
    this.rowTyped = 0;
    this.rowSlips = 0;
    this.row = Array.from({ length: n }, (_, i) => {
      const word = this.L.word(6, 1);
      return { word, tg: this.L.core.add(word, {}, i === 0), slip: -1 };
    });
  }

  private next(): void {
    this.resolved++;
    this.at++;
    const s = this.row[this.at];
    if (s) s.tg.selectable = true;
  }

  /** The word to type was typed; false when it is not this row's. */
  onDone(tg: Target): boolean {
    if (this.row[this.at]?.tg !== tg) return false;
    this.typed++;
    this.rowTyped++;
    this.next();
    return true;
  }

  /** A slip on the word to type: it fades red and the level gets more words; false when it is not this row's. */
  onWrong(tg: Target | null): boolean {
    const s = this.row[this.at];
    if (!s || s.tg !== tg) return false;
    s.slip = 0;
    this.rowSlips++;
    this.L.core.release(tg, false);
    const more = slipWords(storyOf(this.L.def.world).tier + 1, this.added);
    this.added += more;
    this.L.count += more;
    this.next();
    return true;
  }

  update(dt: number): void {
    for (const s of this.row) if (s.slip >= 0) s.slip += dt;
  }

  /** The row centred at (cx, y), fitted into `width`: typed words in `ink`, the next ones faint. */
  draw(g: G, cx: number, y: number, width: number, ink: string): void {
    drawRow(g, this.L, this.row, this.at, this.row[this.at]?.tg ?? null, cx, y, width, ink);
  }
}

/**
 * A row of words centred at (cx, y), fitted into `width`: the word at `at` is the target `current`
 * (its label), the ones before it in `ink`, the next ones faint; a slipped word (`slip` seconds) fades red to a trace. Returns its width.
 */
export function drawRow(g: G, L: LevelRuntime, row: { word: string; slip: number }[], at: number, current: Target | null, cx: number, y: number, width: number, ink: string): number {
  const measure = (size: number) => {
    const widths = row.map((s) => wordBox(s.word, size).w);
    return { widths, total: widths.reduce((a, b) => a + b, 0) + WORD_GAP * (row.length - 1) };
  };
  const full = measure(WORD_SIZE);
  const size = full.total > width ? Math.max(24, (WORD_SIZE * width) / full.total) : WORD_SIZE;
  const { widths, total } = size === WORD_SIZE ? full : measure(size);
  const font = `600 ${size}px ${fontFamily()}`, h = size * 1.45, x0 = cx - total / 2;
  // Each word's middle from the row's left edge, and its look: the label, a slip still fading, or letters that stay as they are.
  let x = 0;
  const words = widths.map((w, i) => {
    const s = row[i], c = x + w / 2;
    x += w + WORD_GAP;
    const fading = s.slip >= 0 && s.slip < SLIP_FADE;
    return { word: s.word, c, label: i === at && !!current, fading, ink: s.slip >= 0 ? SLIP_INK : ink, alpha: s.slip >= 0 ? Math.max(SLIP_TRACE, 1 - (1 - SLIP_TRACE) * s.slip / SLIP_FADE) : i < at ? 1 : 0.35 };
  });
  const write = (to: G, word: (typeof words)[number], wx: number, wy: number) => {
    to.font = font;
    to.textAlign = 'center';
    to.textBaseline = 'middle';
    to.fillStyle = word.ink;
    to.globalAlpha = word.alpha;
    to.fillText(word.word, wx, wy);
  };
  // The letters that stay are one picture, made again when a word of the row changes its look.
  const still = words.filter((w) => !w.label && !w.fading);
  if (still.length) drawCached(g, `copy-row|${font}|${still.map((w) => `${w.word}@${w.c}:${w.ink}:${w.alpha}`).join('|')}`, x0, y - h / 2, total, h, (c) => still.forEach((w) => write(c, w, w.c, h / 2)), true);
  for (const w of words) {
    if (w.label) L.label(g, current!, x0 + w.c, y, size);
    else if (w.fading) {
      g.save();
      write(g, w, x0 + w.c, y);
      g.restore();
    }
  }
  return total;
}
