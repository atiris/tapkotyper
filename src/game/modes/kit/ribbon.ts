import { graphics } from '../../../engine/graphics';
import { WORD, fontFamily, type G, roundRect } from '../../../gfx/draw';
import type { LevelRuntime } from '../../runtime';
import type { Target } from '../../typing';

/** The ribbon: its middle's height, its size, its letters, and where the next letter stays (a share of its width). */
const RIBBON_Y = 84;
const RIBBON_H = 66;
const RIBBON_SIZE = 40;
const RIBBON_AT = 0.42;
/** Its ends fade out over its round end cap and a little more. */
const RIBBON_FADE = RIBBON_H / 2 + 10;
/** Seconds of the ribbon's ease toward where it should be: it glides, never snaps. */
const GLIDE_S = 0.25;
/** A new word slides in from this far right and fades in over these seconds. */
const APPEAR_DX = 40;
const APPEAR_S = 0.35;
/** Every word but the one in progress is grey. */
const GREY = '#8a8f98';
const GREY_HC = '#5a5f68';
/** The frame: its lines (at most three show), their letters and the room round them. */
const LINES = 3;
const LINE_H = 44;
const TEXT_SIZE = 28;
const FRAME_PAD = 26;
const FRAME_GAP = 26;
/** Lines scrolled away above the frame that a trimming ribbon still keeps. */
const KEPT_UP = 3;
/** Seconds the letters of a restarted word fade back out of the frame. */
const ERASE_S = 0.4;

/** A word of the ribbon: its text (without the space after it) and its place on the ribbon. */
export interface RibbonWord {
  text: string;
  /** Its sentence ends with it. */
  last: boolean;
  /** When it came (the ribbon's clock): it fades in. */
  born: number;
  /** Its width, and its start along the ribbon (pixels), measured when it is drawn; NaN before. */
  w: number;
  start: number;
  /** Where it shows along the ribbon: it glides to its start, from a little further right when new. */
  x: number;
}

/** `text` broken into lines that fit `width`, at whole words; each line keeps its start in the text. */
export function wrapLines(g: G, text: string, width: number): { from: number; text: string }[] {
  const out: { from: number; text: string }[] = [];
  let from = 0, line = '';
  const re = /\S+\s*/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (line && g.measureText((line + m[0]).trimEnd()).width > width) {
      out.push({ from, text: line });
      from = m.index;
      line = '';
    }
    line += m[0];
  }
  out.push({ from, text: line });
  return out;
}

/**
 * An endless ribbon of words, spaces and periods too, in `area` of the stage, and a stone frame
 * under it with what is written: the word at `at` is the target `current`, the ones before it are
 * written. The mode decides which words come and what a slip does.
 */
export class Ribbon {
  words: RibbonWord[] = [];
  at = 0;
  current: Target | null = null;
  /** The ribbon's own clock: words fade in, the frame's runes and cursor pulse. */
  private t = 0;
  /** Letters of a restarted word fading out of the frame: the text, where it starts in the frame's text, seconds since. */
  private ghost: { text: string; from: number; t: number } | null = null;
  /** The ribbon's position (pixels along the words) and the frame's scroll (pixels up), each gliding to its aim. */
  private ribbonX = 0;
  private ribbonAim = 0;
  private frameUp = 0;
  private frameAim = 0;
  /** The picture the ribbon's letters go into before its ends fade out. */
  private layer: HTMLCanvasElement | null = null;

  /** Words dropped from the front with the frame's lines long scrolled away. */
  dropped = 0;

  /** `trims`: an endless ribbon drops the words of the frame's lines long scrolled away, so a long one stays light to draw. */
  constructor(private L: LevelRuntime, private area: (vw: number) => { x: number; w: number }, private trims = false) {}

  word(text: string, last: boolean): RibbonWord {
    return { text, last, born: this.t, w: NaN, start: NaN, x: NaN };
  }

  /** The first `n` words as the frame writes them. */
  written(n: number): string {
    return this.words.slice(0, n).map((w) => `${w.text} `).join('');
  }

  /** The typed letters of a restarted word fade back out of the frame. */
  erase(typed: string): void {
    if (typed) this.ghost = { text: typed, from: this.written(this.at).length, t: 0 };
  }

  update(dt: number): void {
    this.t += dt;
    if (this.ghost && (this.ghost.t += dt) >= ERASE_S) this.ghost = null;
    // The ribbon, its words and the frame glide to where they should be.
    const k = this.L.reduceMotion ? 1 : 1 - Math.exp(-dt / GLIDE_S);
    this.ribbonX += (this.ribbonAim - this.ribbonX) * k;
    this.frameUp += (this.frameAim - this.frameUp) * k;
    for (const w of this.words) if (!Number.isNaN(w.start)) w.x += (w.start - w.x) * k;
  }

  /** The ribbon and the frame; the frame's cursor blinks while `writing`. */
  draw(g: G, writing: boolean): void {
    this.drawRibbon(g);
    this.drawFrame(g, writing);
  }

  /** What the frame shows: the written words and the letters of the word in progress. */
  private frameText(): string {
    const tg = this.current;
    return this.written(this.at) + (tg ? tg.word.slice(0, tg.typed) : '');
  }

  /**
   * Draws what `paint` draws inside the box (x, y, w, h) through a picture of its own whose left
   * and right ends fade out over `fade`, so nothing is ever cut off hard.
   */
  private faded(g: G, x: number, y: number, w: number, h: number, fade: number, paint: (to: G) => void): void {
    const m = g.getTransform(), res = Math.min(3, Math.hypot(m.a, m.b) || 1);
    const c = (this.layer ??= document.createElement('canvas')), pw = Math.ceil(w * res), ph = Math.ceil(h * res);
    if (c.width !== pw || c.height !== ph) {
      c.width = pw;
      c.height = ph;
    }
    const cg = c.getContext('2d')!;
    cg.setTransform(1, 0, 0, 1, 0, 0);
    cg.globalCompositeOperation = 'source-over';
    cg.globalAlpha = 1;
    cg.clearRect(0, 0, pw, ph);
    cg.setTransform(res, 0, 0, res, -x * res, -y * res);
    paint(cg);
    cg.setTransform(res, 0, 0, res, 0, 0);
    cg.globalAlpha = 1;
    cg.globalCompositeOperation = 'destination-in';
    const mask = cg.createLinearGradient(0, 0, w, 0), f = Math.min(0.5, fade / w);
    mask.addColorStop(0, 'rgba(0,0,0,0)');
    mask.addColorStop(f, '#000');
    mask.addColorStop(1 - f, '#000');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    cg.fillStyle = mask;
    cg.fillRect(0, 0, w, h);
    cg.globalCompositeOperation = 'source-over';
    g.drawImage(c, x, y, w, h);
  }

  /**
   * The ribbon: the word to type with its typed letters marked, every other word grey, its ends
   * fading out. It glides letter by letter, so the next letter stays near one point; a new word
   * slides in from the right. A space is a gap that lights up when it is the key to type.
   */
  private drawRibbon(g: G): void {
    const tg = this.current, hc = this.L.highContrast;
    const box = this.area(this.L.vw), size = RIBBON_SIZE, top = RIBBON_Y - RIBBON_H / 2;
    const font = `600 ${size}px ${fontFamily()}`, space = size * 0.5;
    g.save();
    g.font = font;
    // Each word's start along the ribbon.
    let along = 0;
    for (const w of this.words) {
      if (Number.isNaN(w.w)) w.w = g.measureText(w.text).width;
      w.start = along;
      if (Number.isNaN(w.x)) w.x = along + (this.L.reduceMotion ? 0 : APPEAR_DX);
      along += w.w + space;
    }
    const word = this.words[this.at];
    const typed = tg && word ? Math.min(tg.typed, word.text.length) : 0;
    this.ribbonAim = word ? word.start + g.measureText(word.text.slice(0, typed)).width + (tg && tg.typed > word.text.length ? space : 0) : along;
    if (!graphics.simple) {
      g.shadowColor = 'rgba(40,30,20,0.25)';
      g.shadowBlur = 8;
      g.shadowOffsetY = 3;
    }
    g.fillStyle = hc ? '#ffffff' : WORD.plate;
    roundRect(g, box.x, top, box.w, RIBBON_H, RIBBON_H / 2);
    g.fill();
    g.shadowColor = 'transparent';
    g.lineWidth = 4;
    g.strokeStyle = '#ffb23e';
    g.stroke();
    g.restore();
    const origin = box.x + box.w * RIBBON_AT - this.ribbonX, grey = hc ? GREY_HC : GREY;
    this.faded(g, box.x, top, box.w, RIBBON_H, RIBBON_FADE, (cg) => {
      cg.font = font;
      cg.textBaseline = 'middle';
      cg.textAlign = 'left';
      this.words.forEach((w, i) => {
        const wx = origin + w.x, now = i === this.at;
        if (wx > box.x + box.w || wx + w.w + space < box.x) return;
        const shown = this.L.reduceMotion ? 1 : Math.min(1, (this.t - w.born) / APPEAR_S);
        cg.globalAlpha = shown;
        if (now && tg && !this.L.core.letters(tg)) {
          // A hidden word (dictation, memory) shows dots for the letters still to type.
          let cx = wx;
          [...w.text].forEach((ch, k) => {
            const cw = cg.measureText(ch).width;
            if (k < typed) {
              cg.fillStyle = WORD.typed;
              cg.fillText(ch, cx, RIBBON_Y + 2);
            } else {
              cg.fillStyle = WORD.ink;
              cg.beginPath();
              cg.arc(cx + cw / 2, RIBBON_Y + 2, size * 0.12, 0, Math.PI * 2);
              cg.fill();
            }
            cx += cw;
          });
        } else if (now) {
          const head = w.text.slice(0, typed), hw = cg.measureText(head).width;
          cg.fillStyle = hc ? '#006b2e' : WORD.typed;
          cg.fillText(head, wx, RIBBON_Y + 2);
          if (typed < w.text.length) {
            const ch = w.text[typed], cw = cg.measureText(ch).width;
            cg.fillStyle = hc ? '#ffe066' : WORD.next;
            roundRect(cg, wx + hw - size * 0.04, RIBBON_Y - size * 0.62, cw + size * 0.08, size * 1.24, size * 0.2);
            cg.fill();
            cg.fillStyle = WORD.nextInk;
            cg.fillText(ch, wx + hw, RIBBON_Y + 2);
            cg.fillStyle = hc ? '#000' : WORD.ink;
            cg.fillText(w.text.slice(typed + 1), wx + hw + cw, RIBBON_Y + 2);
          }
        } else {
          cg.fillStyle = grey;
          cg.fillText(w.text, wx, RIBBON_Y + 2);
        }
        // The space after it: a gap with a soft pill, lit when it is the key to type.
        const lit = now && !!tg && typed >= w.text.length;
        cg.globalAlpha = shown * (lit ? 1 : 0.3);
        cg.fillStyle = lit ? WORD.next : grey;
        roundRect(cg, wx + w.w + space * 0.12, RIBBON_Y - size * 0.3, space * 0.76, size * 0.6, size * 0.2);
        cg.fill();
      });
    });
  }

  /** The frame's box: right under the ribbon, as wide as it and from the same left edge. */
  private frameBox(): { x: number; y: number; w: number; h: number } {
    const area = this.area(this.L.vw);
    return { x: area.x, y: RIBBON_Y + RIBBON_H / 2 + FRAME_GAP, w: area.w, h: LINES * LINE_H + FRAME_PAD * 2 };
  }

  /**
   * The frame: a carved stone frame with a glowing rune stone in each corner; inside, what the
   * child has written with a blinking cursor. A full frame scrolls its oldest line up and away;
   * the letters of a restarted word fade back out.
   */
  private drawFrame(g: G, writing: boolean): void {
    const b = this.frameBox();
    g.save();
    // The stone frame.
    g.fillStyle = 'rgba(255,250,240,0.92)';
    roundRect(g, b.x, b.y, b.w, b.h, 18);
    g.fill();
    g.lineWidth = 10;
    g.strokeStyle = '#8d8478';
    g.stroke();
    g.lineWidth = 2;
    g.strokeStyle = '#6a6259';
    roundRect(g, b.x + 7, b.y + 7, b.w - 14, b.h - 14, 13);
    g.stroke();
    const pulse = this.L.reduceMotion ? 0.7 : 0.55 + 0.3 * Math.sin(this.t * 2.2);
    for (const [cx, cy] of [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]) this.drawRune(g, cx, cy, pulse);
    // The written words, their last lines in view.
    g.font = `600 ${TEXT_SIZE}px ${fontFamily()}`;
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    const inner = b.w - FRAME_PAD * 2;
    if (this.trims) this.trim(wrapLines(g, this.frameText(), inner));
    const shown = this.frameText(), ghost = this.ghost;
    const full = ghost && ghost.from + ghost.text.length > shown.length ? shown + ghost.text.slice(shown.length - ghost.from) : shown;
    const lines = wrapLines(g, full, inner);
    this.frameAim = Math.max(0, lines.length - LINES) * LINE_H;
    g.save();
    g.beginPath();
    // Only whole lines show: the one scrolling away leaves at the top of the text.
    g.rect(b.x + 8, b.y + FRAME_PAD - 4, b.w - 16, LINES * LINE_H + 8);
    g.clip();
    const fade = ghost ? 1 - ghost.t / ERASE_S : 0;
    let cursor: { x: number; y: number } | null = null;
    lines.forEach((ln, i) => {
      const y = b.y + FRAME_PAD + LINE_H * (i + 0.5) - this.frameUp;
      let x = b.x + FRAME_PAD;
      [...ln.text].forEach((ch, k) => {
        const at = ln.from + k, cw = g.measureText(ch).width;
        if (at === shown.length) cursor = { x, y };
        g.globalAlpha = at < shown.length ? 1 : fade;
        g.fillStyle = '#4a3a5c';
        if (g.globalAlpha > 0) g.fillText(ch, x, y);
        x += cw;
      });
      if (ln.from + ln.text.length === shown.length) cursor ??= { x, y };
    });
    if (!cursor) {
      const last = lines[lines.length - 1];
      cursor = { x: b.x + FRAME_PAD + g.measureText(last.text).width, y: b.y + FRAME_PAD + LINE_H * (lines.length - 0.5) - this.frameUp };
    }
    // The cursor blinks.
    if (writing && (this.L.reduceMotion || Math.sin(this.t * 6) > -0.2)) {
      const c = cursor as { x: number; y: number };
      g.globalAlpha = 1;
      g.fillStyle = '#4a3a5c';
      g.fillRect(c.x + 1, c.y - TEXT_SIZE * 0.55, 3, TEXT_SIZE * 1.1);
    }
    g.restore();
    g.restore();
  }

  /**
   * With more than `KEPT_UP` lines scrolled away above the frame, drops the words of all but the
   * last of them and moves everything left and down by them, so nothing seen changes.
   */
  private trim(lines: { from: number; text: string }[]): void {
    const k = lines.length - LINES - 1;
    if (k < KEPT_UP) return;
    const n = lines.slice(0, k).reduce((sum, ln) => sum + (ln.text.match(/\S+/g)?.length ?? 0), 0);
    const kept = this.words[n];
    if (!kept || n > this.at || Number.isNaN(kept.start)) return;
    const dx = kept.start;
    this.words.splice(0, n);
    this.at -= n;
    this.dropped += n;
    this.ribbonX -= dx;
    this.ribbonAim -= dx;
    for (const w of this.words) w.x -= dx;
    this.frameUp -= k * LINE_H;
    this.frameAim -= k * LINE_H;
    if (this.ghost) this.ghost.from -= lines[k].from;
  }

  /** A rune stone at a corner of the frame, glowing softly. */
  private drawRune(g: G, x: number, y: number, glow: number): void {
    const r = 15;
    g.save();
    if (!graphics.simple) {
      g.shadowColor = `rgba(110,220,230,${glow})`;
      g.shadowBlur = 14;
    }
    g.fillStyle = '#9a9187';
    g.beginPath();
    g.roundRect(x - r, y - r, r * 2, r * 2, 6);
    g.fill();
    g.shadowColor = 'transparent';
    g.strokeStyle = '#5f574f';
    g.lineWidth = 2;
    g.stroke();
    g.strokeStyle = `rgba(120,230,240,${0.5 + glow * 0.5})`;
    g.lineWidth = 2.5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x - 5, y - 7);
    g.lineTo(x + 5, y);
    g.lineTo(x - 5, y + 7);
    g.moveTo(x + 4, y - 7);
    g.lineTo(x + 4, y - 2);
    g.stroke();
    g.restore();
  }
}
