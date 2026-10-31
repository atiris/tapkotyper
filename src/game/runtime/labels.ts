import { VH } from '../../engine/loop';
import { type G, drawWord, wordBox } from '../../gfx/draw';
import { CLOCK_R, drawClock } from '../modes/kit/clock';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';

/** A word label a mode asked for in this frame, at its object's anchor. */
interface PendingLabel {
  tg: Target;
  x: number;
  y: number;
  size: number;
  /** The share of its countdown left, for a word that has one; the clock sits right of the word. */
  clock?: number;
}

export interface Rect {
  /** The target whose label it is. */
  id?: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** Space kept between two labels, and the move from which a line points back to the object. */
export const LABEL_GAP = 6;
const LABEL_LINE_FROM = 30;
/** A label keeps at least this far from the stage's edges, so the whole word and its bubble stay in sight. */
const LABEL_EDGE = 8;
/** A long label shrinks to fit, down to this font size. */
const LABEL_MIN_SIZE = 28;
/** The gap between a word and its countdown clock. */
const CLOCK_GAP = 10;

/** The word labels of a frame: the modes ask for them, they are drawn after the mode, so labels never overlap. */
export class Labels {
  private pending: PendingLabel[] = [];
  /** Where this frame's labels were drawn, in stage units. */
  rects: Rect[] = [];
  /** Vertical shift of each target's label, smoothed over frames. */
  private shift = new Map<number, number>();
  private time = 0;

  constructor(private L: LevelRuntime) {}

  /** A new frame: no labels yet. */
  begin(): void {
    this.pending = [];
    this.rects = [];
  }

  /** A word the child sees can be typed at once, so a target not selectable yet gets no label. */
  add(tg: Target, x: number, y: number, size: number, clock?: number): void {
    if (tg.selectable) this.pending.push({ tg, x, y, size, clock });
  }

  /** The label drawn at stage point (x, y), if any. */
  at(x: number, y: number): Rect | undefined {
    return this.rects.find((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1);
  }

  /**
   * The locked and most urgent labels keep their place; each later one moves up (down
   * near the top) until it is clear of the placed ones. Far moves get a line to the object.
   */
  draw(g: G): void {
    const L = this.L, core = L.core;
    const now = performance.now();
    const dt = this.time ? Math.min(0.1, (now - this.time) / 1000) : 0;
    this.time = now;
    // 0.25 of the way per frame at 60 Hz, the same at any frame rate.
    const follow = 1 - Math.pow(0.75, dt * 60);
    const rank = (l: PendingLabel) => (core.locked === l.tg ? Infinity : l.tg.urgency);
    const placed: Rect[] = [];
    const shifts = new Map<number, number>();
    const icon = L.style !== 'copy';
    for (const l of [...this.pending].sort((a, b) => rank(b) - rank(a))) {
      // Phrases shrink to fit: in calm modes the stage around their place, moving targets half of it.
      const room = L.mode.phraseWords > 2 ? Math.min(L.vw * 0.9, 2 * Math.min(l.x, L.vw - l.x) - 20) : L.vw * 0.5;
      const full = wordBox(g, l.tg.word, l.size, icon).w;
      if (full > room) l.size = Math.max(LABEL_MIN_SIZE, Math.min(l.size, l.size * room / full));
      const { w, h } = wordBox(g, l.tg.word, l.size, icon);
      // A word near an edge moves inward: the whole word, and its countdown, is always in sight.
      const tail = l.clock === undefined ? 0 : CLOCK_GAP + 2 * (CLOCK_R + 2);
      l.x = Math.max(w / 2 + LABEL_EDGE, Math.min(L.vw - w / 2 - LABEL_EDGE - tail, l.x));
      l.y = Math.max(h / 2 + LABEL_EDGE, Math.min(VH - h / 2 - LABEL_EDGE, l.y));
      const x0 = l.x - w / 2 - LABEL_GAP, x1 = l.x + w / 2 + LABEL_GAP;
      const clear = (dy: number) => placed.every((b) => x1 <= b.x0 || x0 >= b.x1 || l.y + dy + h / 2 + LABEL_GAP <= b.y0 || l.y + dy - h / 2 - LABEL_GAP >= b.y1);
      let want = 0;
      if (!clear(0)) {
        const up = Array.from({ length: Math.max(0, Math.floor((l.y - h / 2) / 4)) }, (_, i) => -(i + 1) * 4).find(clear);
        want = up ?? Array.from({ length: Math.max(0, Math.floor((VH - l.y - h / 2) / 4)) }, (_, i) => (i + 1) * 4).find(clear) ?? 0;
      }
      placed.push({ x0: x0 + LABEL_GAP, x1: x1 - LABEL_GAP, y0: l.y + want - h / 2, y1: l.y + want + h / 2 });
      const prev = this.shift.get(l.tg.id);
      const shift = prev == null ? want : prev + (want - prev) * follow;
      shifts.set(l.tg.id, shift);
      this.rects.push({ id: l.tg.id, x0: l.x - w / 2, x1: l.x + w / 2, y0: l.y + shift - h / 2, y1: l.y + shift + h / 2 });
      if (Math.abs(shift) > LABEL_LINE_FROM) {
        g.save();
        g.strokeStyle = 'rgba(255,253,246,0.7)';
        g.lineWidth = 2;
        g.setLineDash([4, 5]);
        g.beginPath();
        g.moveTo(l.x, l.y + shift + (shift < 0 ? h / 2 : -h / 2));
        g.lineTo(l.x, l.y);
        g.stroke();
        g.restore();
      }
      drawWord(g, l.tg.word, l.tg.typed, l.x, l.y + shift, l.tg.wobble, {
        size: l.size,
        highContrast: L.highContrast,
        locked: core.locked === l.tg,
        masked: !core.letters(l.tg),
        icon: l.tg.style === 'dictation' ? { kind: 'speaker' } : l.tg.style === 'memory' ? { kind: 'ring', left: l.tg.showFor ? l.tg.showLeft / l.tg.showFor : 0 } : undefined,
      });
      if (l.clock !== undefined) drawClock(g, l.x + w / 2 + CLOCK_GAP + CLOCK_R + 2, l.y + shift, l.clock, now / 1000, !L.reduceMotion);
    }
    this.shift = shifts;
  }
}
