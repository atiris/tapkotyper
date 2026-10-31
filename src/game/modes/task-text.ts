import { VH } from '../../engine/loop';
import { WORD, fontFamily, type G, roundRect } from '../../gfx/draw';
import { Mode, TAPKO_X } from '../mode';
import type { FeedItem } from '../task-play';
import type { Target } from '../typing';
import { PANEL_INK, drawCopyPanel } from './kit/copy-panel';
import { SLIP_INK } from './kit/copy-row';
import { Ribbon, wrapLines } from './kit/ribbon';
import { TaskPlay, worldOf } from './task';

/** A word of the task's text; the last word of a sentence carries the sentence, written with it. */
interface TextWord {
  text: string;
  sentence: FeedItem | null;
}

/** The task's text word by word: its sentences one after another, as long as the feed gives them. */
class TextStream {
  private queue: TextWord[] = [];

  constructor(private play: TaskPlay) {}

  /** The next word without taking it; null when the text has ended. */
  peek(): TextWord | null {
    while (!this.queue.length) {
      const it = this.play.next();
      if (!it) return null;
      const words = it.text.split(' ').filter(Boolean);
      words.forEach((w, i) => this.queue.push({ text: w, sentence: i === words.length - 1 ? it : null }));
    }
    return this.queue[0];
  }

  next(): TextWord | null {
    const w = this.peek();
    if (w) this.queue.shift();
    return w;
  }
}

/** Letters measured off the stage: pages are laid out before they are drawn. */
let measurer: CanvasRenderingContext2D | null = null;
function textWidth(text: string, size: number): number {
  measurer ??= document.createElement('canvas').getContext('2d')!;
  measurer.font = `600 ${size}px ${fontFamily()}`;
  return measurer.measureText(text).width;
}

/** Lines of words from the stream, each filled up to `width` at whole words; at most `max` lines, fewer when the text ends. */
function fillLines(stream: TextStream, width: number, size: number, max: number): TextWord[][] {
  const lines: TextWord[][] = [];
  while (lines.length < max && stream.peek()) {
    const line: TextWord[] = [];
    // A word longer than the whole line stands on a line of its own.
    while (stream.peek() && (!line.length || textWidth([...line, stream.peek()!].map((w) => w.text).join(' '), size) <= width)) line.push(stream.next()!);
    lines.push(line);
  }
  return lines;
}

/** Seconds a slipped place stays red. */
const SLIP_S = 0.6;
/** The letter to type, marked on the lit line, and the lit line's band. */
const PLACE = '#ffc94d';
const LIT = 'rgba(255,246,222,0.75)';

/** Text games share the slip mark and the end of a sentence. */
abstract class TaskTextMode extends Mode {
  readonly world = worldOf(this.L);
  protected play = new TaskPlay(this.L);
  protected stream = new TextStream(this.play);
  protected current: Target | null = null;
  /** Seconds since the last slip (the place to type is red a moment). */
  protected slip = SLIP_S;

  /** A word typed: its sentence is written when it ends one. */
  protected wordDone(w: TextWord): void {
    if (w.sentence) this.play.written(w.sentence);
  }

  onWrong(tg: Target | null): void {
    if (tg && tg === this.current) this.slip = 0;
  }

  update(dt: number): void {
    this.slip = Math.min(SLIP_S, this.slip + dt);
  }

  /** The place to type now: red right after a slip, else a warm yellow that stands out on the lit line. */
  protected get placeInk(): string {
    return this.slip < SLIP_S ? SLIP_INK : this.L.highContrast ? '#ffe066' : PLACE;
  }

  progress(): number {
    return this.play.progress();
  }

  get finished(): boolean {
    return this.play.finished;
  }
}

/** Odpis: the panel's share of the stage and its margins, the letters, and the rows of one line (the text and under it what is written). */
const COPY_SHARE = 0.6;
const MARGIN = 24;
const COPY_TOP = 36;
const COPY_PAD = 28;
const COPY_SIZE = 30;
const ROW_H = 44;
const PAIR_H = ROW_H * 2 + 12;

/**
 * Odpis: the lullaby's panel on the right, about 60 % of the stage. It shows as many lines as fit,
 * each filled with sentences up to its width at whole words. The line to copy is lit; it is typed
 * letter by letter into the row under it; then the next line lights up, and after the last a new
 * page of the next sentences comes. A slip marks the place red and waits for the right key.
 */
export class TaskCopyMode extends TaskTextMode {
  private page: TextWord[][] = [];
  /** The line and the word in it to type. */
  private line = 0;
  private word = 0;

  private box(): { x: number; y: number; w: number; h: number } {
    const L = this.L, w = Math.min(L.vw * COPY_SHARE, L.vw - MARGIN - (TAPKO_X + 110));
    return { x: L.vw - MARGIN - w, y: COPY_TOP, w, h: VH - COPY_TOP * 2 };
  }

  start(): void {
    this.play.start();
    this.newPage();
  }

  private newPage(): void {
    const b = this.box();
    this.page = fillLines(this.stream, b.w - COPY_PAD * 2, COPY_SIZE, Math.max(1, Math.floor((b.h - COPY_PAD * 2) / PAIR_H)));
    this.line = this.word = 0;
    this.ask();
  }

  /** The word to type, with the space after it unless it ends its line. */
  private ask(): void {
    const ln = this.page[this.line];
    const w = ln?.[this.word];
    this.current = w ? this.L.core.add(this.word < ln.length - 1 ? `${w.text} ` : w.text, {}) : null;
  }

  onDone(tg: Target): void {
    if (tg !== this.current) return;
    this.L.core.prune();
    this.wordDone(this.page[this.line][this.word]);
    if (++this.word >= this.page[this.line].length) {
      this.word = 0;
      this.L.sfx('note');
      if (++this.line >= this.page.length) return this.newPage();
    }
    this.ask();
  }

  render(g: G): void {
    const b = this.box();
    drawCopyPanel(g, b.x, b.y, b.w, b.h);
    g.save();
    g.font = `600 ${COPY_SIZE}px ${fontFamily()}`;
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    const x0 = b.x + COPY_PAD;
    this.page.forEach((ln, i) => {
      const y = b.y + COPY_PAD + PAIR_H * i + ROW_H / 2, text = ln.map((w) => w.text).join(' ');
      const now = i === this.line && !!this.current;
      if (now) {
        g.fillStyle = LIT;
        roundRect(g, x0 - 10, y - ROW_H / 2, b.w - COPY_PAD * 2 + 20, ROW_H * 2 + 4, 12);
        g.fill();
      }
      // The line to copy: the done ones in ink, the next ones faint.
      g.globalAlpha = i <= this.line ? 1 : 0.4;
      g.fillStyle = PANEL_INK;
      g.fillText(text, x0, y);
      g.globalAlpha = 1;
      // What is written under it.
      const done = i < this.line ? text : now ? ln.slice(0, this.word).map((w) => `${w.text} `).join('') + this.current!.word.slice(0, this.current!.typed) : '';
      g.fillStyle = WORD.typed;
      g.fillText(done, x0, y + ROW_H);
      if (now) {
        // The letter to copy marked in the line, and the cursor where it goes.
        const at = done.length, ch = text[at] ?? ' ', cx = x0 + g.measureText(text.slice(0, at)).width, cw = Math.max(10, g.measureText(ch).width);
        g.fillStyle = this.placeInk;
        roundRect(g, cx - 2, y - COPY_SIZE * 0.6, cw + 4, COPY_SIZE * 1.2, 6);
        g.fill();
        g.fillStyle = this.slip < SLIP_S ? '#ffffff' : WORD.nextInk;
        g.fillText(ch, cx, y);
        const wx = x0 + g.measureText(done).width;
        g.fillStyle = this.slip < SLIP_S ? SLIP_INK : PANEL_INK;
        if (this.L.reduceMotion || Math.sin(this.t * 6) > -0.2) g.fillRect(wx + 1, y + ROW_H - COPY_SIZE * 0.55, 3, COPY_SIZE * 1.1);
      }
    });
    g.restore();
  }
}

/** Pás: the ribbon in the right half of the stage, never over Tapko, a margin on the right. */
function ribbonArea(vw: number): { x: number; w: number } {
  const x = Math.max(vw / 2, TAPKO_X + 130);
  return { x, w: vw - 30 - x };
}

/**
 * Pás: the egg spell's ribbon, the text as one endless ribbon, spaces and periods too, with the
 * frame of what is written under it (no hearth, egg or fire). A slip waits for the right key.
 */
export class TaskRibbonMode extends TaskTextMode {
  private ribbon = new Ribbon(this.L, ribbonArea, true);
  /** The text's words on the ribbon, by their place there. */
  private words: TextWord[] = [];

  start(): void {
    this.play.start();
    this.target();
  }

  /** The word at the ribbon's place becomes the target, the next one always there to read; the text's last word has no space after it. */
  private target(): void {
    const r = this.ribbon;
    while (r.words.length < r.at + 2) {
      const w = this.stream.next();
      if (!w) break;
      this.words.push(w);
      r.words.push(r.word(w.text, !!w.sentence));
    }
    const w = r.words[r.at];
    r.current = this.current = w ? this.L.core.add(r.at < r.words.length - 1 ? `${w.text} ` : w.text, {}) : null;
  }

  onDone(tg: Target): void {
    const r = this.ribbon;
    if (tg !== this.current) return;
    this.L.core.prune();
    this.wordDone(this.words[r.at + r.dropped]);
    r.at++;
    this.target();
  }

  update(dt: number): void {
    super.update(dt);
    this.ribbon.update(dt);
  }

  render(g: G): void {
    this.ribbon.draw(g, !!this.current);
  }
}

/** Prepis: the panels' area right of Tapko, the left one's share of it, the gap, the letters and the line height. */
const PAIR_LEFT = TAPKO_X + 140;
const LEFT_SHARE = 0.44;
const RIGHT_SHARE = 0.52;
const TR_TOP = 36;
const TR_PAD = 24;
const TR_SIZE = 28;
const TR_LINE = 42;

/**
 * Prepis: two panels side by side right of Tapko, the text to copy on the narrower left one (the
 * next word softly lit), what is written on the wider right one wrapping at its own width with a
 * cursor; so the words fall on other lines and the child copies by reading. The left page turns
 * when it is copied.
 */
export class TaskTranscribeMode extends TaskTextMode {
  private page: TextWord[] = [];
  private word = 0;

  private boxes(): { left: { x: number; w: number }; right: { x: number; w: number }; y: number; h: number } {
    const L = this.L, area = L.vw - MARGIN - PAIR_LEFT;
    const lw = area * LEFT_SHARE, rw = area * RIGHT_SHARE;
    return { left: { x: PAIR_LEFT, w: lw }, right: { x: L.vw - MARGIN - rw, w: rw }, y: TR_TOP, h: VH - TR_TOP * 2 };
  }

  start(): void {
    this.play.start();
    this.newPage();
  }

  private newPage(): void {
    const b = this.boxes();
    this.page = fillLines(this.stream, b.left.w - TR_PAD * 2, TR_SIZE, Math.max(1, Math.floor((b.h - TR_PAD * 2) / TR_LINE))).flat();
    this.word = 0;
    this.ask();
  }

  /** The word to copy with its space, unless it is the text's last. */
  private ask(): void {
    const w = this.page[this.word];
    const last = this.word === this.page.length - 1 && !this.stream.peek();
    this.current = w ? this.L.core.add(last ? w.text : `${w.text} `, {}) : null;
  }

  onDone(tg: Target): void {
    if (tg !== this.current) return;
    this.L.core.prune();
    this.wordDone(this.page[this.word]);
    if (++this.word >= this.page.length) {
      this.L.sfx('note');
      return this.newPage();
    }
    this.ask();
  }

  render(g: G): void {
    const b = this.boxes(), L = this.L;
    drawCopyPanel(g, b.left.x, b.y, b.left.w, b.h);
    drawCopyPanel(g, b.right.x, b.y, b.right.w, b.h);
    g.save();
    g.font = `600 ${TR_SIZE}px ${fontFamily()}`;
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    // The page to copy, the next word softly lit.
    const text = this.page.map((w) => w.text).join(' ');
    const at = this.page.slice(0, this.word).reduce((n, w) => n + w.text.length + 1, 0);
    const src = wrapLines(g, text, b.left.w - TR_PAD * 2);
    src.forEach((ln, i) => {
      const y = b.y + TR_PAD + TR_LINE * (i + 0.5), x = b.left.x + TR_PAD;
      const cur = this.page[this.word];
      if (cur && this.current && at >= ln.from && at < ln.from + ln.text.length) {
        const wx = x + g.measureText(ln.text.slice(0, at - ln.from)).width;
        g.fillStyle = this.slip < SLIP_S ? 'rgba(217,72,43,0.25)' : 'rgba(255,233,176,0.8)';
        roundRect(g, wx - 4, y - TR_SIZE * 0.6, g.measureText(cur.text).width + 8, TR_SIZE * 1.2, 8);
        g.fill();
      }
      g.fillStyle = PANEL_INK;
      g.fillText(ln.text, x, y);
    });
    // What is written, wrapping at its own width; the last lines in view.
    const written = this.page.slice(0, this.word).map((w) => `${w.text} `).join('') + (this.current ? this.current.word.slice(0, this.current.typed) : '');
    const lines = wrapLines(g, written, b.right.w - TR_PAD * 2), fit = Math.max(1, Math.floor((b.h - TR_PAD * 2) / TR_LINE));
    const shown = lines.slice(-fit), first = lines.length - shown.length;
    g.fillStyle = WORD.typed;
    shown.forEach((ln, i) => g.fillText(ln.text, b.right.x + TR_PAD, b.y + TR_PAD + TR_LINE * (i + 0.5)));
    if (this.current && (L.reduceMotion || Math.sin(this.t * 6) > -0.2)) {
      const last = lines[lines.length - 1], i = lines.length - 1 - first;
      g.fillStyle = this.slip < SLIP_S ? SLIP_INK : PANEL_INK;
      g.fillRect(b.right.x + TR_PAD + g.measureText(last.text).width + 1, b.y + TR_PAD + TR_LINE * (i + 0.5) - TR_SIZE * 0.55, 3, TR_SIZE * 1.1);
    }
    g.restore();
  }
}
