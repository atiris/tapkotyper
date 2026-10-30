import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { type G, SPEECH_W, type SpeechLayout, drawSpeech, fontFamily, speechLayout } from '../../gfx/draw';
import type { LevelRuntime } from '../runtime';
import { LABEL_GAP, type Rect } from './labels';

/** A short shout over the scene (a goal, a cheer) where it popped up. */
interface Shout {
  text: string;
  x: number;
  y: number;
  age: number;
}

/** A speech bubble in the scene: who says it, centered near (x, y) (or ending at x), its tail toward (tx, ty). */
interface Speech {
  who: string;
  /** (x, y) is the middle of its right edge, not its center. */
  right: boolean;
  text: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  age: number;
  life: number;
  /** Its vertical move clear of the word labels, kept while it stays clear. */
  dy: number;
  lay?: SpeechLayout;
}

/** Seconds a shout stays over the scene. */
const SHOUT_TIME = 1.1;
/** How far a speech bubble may move up or down to stay clear of the word labels. */
const SPEECH_ROOM = 160;

/** The e2e build counts the frames with a speech bubble and those where one covers a word label (`window.speechLog`). */
function speechLog(b: Rect, labels: Rect[]): void {
  const log = ((window as any).speechLog ??= { frames: 0, overlaps: 0 });
  log.frames++;
  if (labels.some((r) => r.x1 > b.x0 + LABEL_GAP && r.x0 < b.x1 - LABEL_GAP && r.y1 > b.y0 + LABEL_GAP && r.y0 < b.y1 - LABEL_GAP)) log.overlaps++;
}

/** Shouts and speech bubbles over the scene, drawn after the word labels and kept clear of them. */
export class Callouts {
  private shouts: Shout[] = [];
  private speeches: Speech[] = [];

  constructor(private L: LevelRuntime) {}

  get shouting(): boolean {
    return this.shouts.length > 0;
  }

  shout(text: string, x: number, y: number): void {
    this.shouts.push({ text, x, y, age: 0 });
  }

  /** A new line of the same speaker replaces the old one. */
  speak(who: string, text: string, x: number, y: number, tx: number, ty: number, seconds: number, right: boolean): void {
    this.speeches = this.speeches.filter((s) => s.who !== who);
    this.speeches.push({ who, right, text, x, y, tx, ty, age: 0, life: seconds, dy: 0 });
  }

  speaking(who: string, within: number): boolean {
    return this.speeches.some((s) => s.who === who && s.age < within);
  }

  update(dt: number): void {
    for (const s of this.shouts) s.age += dt;
    this.shouts = this.shouts.filter((s) => s.age < SHOUT_TIME);
    for (const s of this.speeches) s.age += dt;
    this.speeches = this.speeches.filter((s) => s.age < s.life);
  }

  /** `labels`: where this frame's word labels are. */
  draw(g: G, labels: Rect[]): void {
    for (const s of this.speeches) this.drawSpeech(g, s, labels);
    for (const s of this.shouts) this.drawShout(g, s);
  }

  /** A speech bubble pops in and fades out; it moves up or down while it would cover a word label. */
  private drawSpeech(g: G, s: Speech, labels: Rect[]): void {
    const vw = this.L.vw;
    const lay = (s.lay ??= speechLayout(g, s.text, SPEECH_W));
    const x = Math.min(vw - lay.w / 2 - 8, Math.max(lay.w / 2 + 8, s.right ? s.x - lay.w / 2 : s.x));
    const box = (dy: number) => ({ x0: x - lay.w / 2 - LABEL_GAP, x1: x + lay.w / 2 + LABEL_GAP, y0: s.y + dy - lay.h / 2 - LABEL_GAP, y1: s.y + dy + lay.h / 2 + LABEL_GAP });
    const clear = (dy: number) => {
      const b = box(dy);
      return b.y0 >= 0 && b.y1 <= VH && labels.every((r) => r.x1 <= b.x0 || r.x0 >= b.x1 || r.y1 <= b.y0 || r.y0 >= b.y1);
    };
    if (!clear(s.dy)) s.dy = Array.from({ length: SPEECH_ROOM / 4 }, (_, i) => (i % 2 ? -1 : 1) * Math.ceil((i + 1) / 2) * 8).find(clear) ?? s.dy;
    if (import.meta.env.MODE === 'e2e') speechLog(box(s.dy), labels);
    const fade = Math.max(0, Math.min(1, (s.life - s.age) / 0.25));
    const pop = this.L.reduceMotion ? 1 : ease.outBack(Math.min(1, s.age / 0.25));
    drawSpeech(g, lay, x, s.y + s.dy, s.tx, s.ty, fade, pop);
  }

  private drawShout(g: G, s: Shout): void {
    const k = ease.outBack(Math.min(1, s.age / 0.35));
    g.save();
    g.globalAlpha = Math.max(0, Math.min(1, (SHOUT_TIME - s.age) / 0.3));
    g.font = `800 58px ${fontFamily()}`;
    // Room for its pop (it grows a little past its size) keeps it wholly on the stage.
    const half = (g.measureText(s.text).width / 2) * 1.12 + 10;
    g.translate(Math.min(this.L.vw - half, Math.max(half, s.x)), Math.max(50, s.y - s.age * 12));
    g.scale(k, k);
    g.rotate(-0.06);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = 8;
    g.strokeStyle = '#5a3d2b';
    g.strokeText(s.text, 0, 0);
    g.fillStyle = '#ffd25a';
    g.fillText(s.text, 0, 0);
    g.restore();
  }
}
