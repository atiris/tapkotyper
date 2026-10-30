import { graphics } from '../../engine/graphics';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { drawCached, drawWord, fontFamily, type G, wordBox } from '../../gfx/draw';
import { t, tn } from '../../i18n/i18n';
import { SPACE } from '../../learning/lessons';
import { WORLDS } from '../levels';
import { type Drift, Mode } from '../mode';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';

/** The accent of each world's panel, picked to stand out on its background. */
const ACCENT: Record<string, string> = {
  dragons: '#e0782a', egg: '#2fa596', junkyard: '#b0603a', workshop: '#4a78b0', raintown: '#3d8fd6', robocity: '#1f9e94',
  robohome: '#d99a12', garden: '#d9587a', forestpath: '#4f9e3a', lilylake: '#2f86c4', musictree: '#8a5cc8', moonball: '#8b97b3',
};
/** The target's letter size, the panel's centre height and its smallest width. */
const SIZE = 52;
const PANEL_Y = VH * 0.36;
const PANEL_MIN_W = 420;
/** Room round the panel for its glow: a shadow blur of 26 reaches about 40 device pixels, inside this down to a stage 400 px high. */
const GLOW = 60;
/** Seconds a new target grows in, a finished one floats up, and the end line shows before the level ends. */
const GROW = 0.3;
const FLOAT = 0.7;
const END_TIME = 3;
const INK = '#3d3355';

/** How many words a target has at a level's place in its world: words, then phrases, a sentence at the super level once space and period are known. */
export function copyTarget(index: number, sentence: boolean): { words: number; min: number } {
  if (index <= 1) return { words: 1, min: 2 };
  return index >= 4 && sentence ? { words: 5, min: 3 } : { words: 3, min: 2 };
}

/** A small text centred at (x, y); with `rim` a white rim keeps it readable on any background. */
function text(g: G, s: string, x: number, y: number, size: number, weight: number, ink: string, alpha = 1, rim = false): void {
  g.save();
  g.globalAlpha = alpha;
  g.font = `${weight} ${size}px ${fontFamily()}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (rim) {
    g.lineJoin = 'round';
    g.lineWidth = size / 4;
    g.strokeStyle = 'rgba(255,253,246,0.9)';
    g.strokeText(s, x, y);
  }
  g.fillStyle = ink;
  g.fillText(s, x, y);
  g.restore();
}

/**
 * The placeholder of a world not built yet: cyclic copy. One target at a time on a panel in the
 * middle; a finished one floats up and the next grows in, without end, until the round time is
 * played; the target being typed then is the last. A slip only counts.
 */
export class CopyLoopMode extends Mode {
  readonly world: string;
  readonly drift: Drift = { layer: 'near', speed: 6 };
  readonly phraseWords: number;
  readonly phraseMin: number;
  private readonly accent: string;
  private current: Target | null = null;
  /** Seconds since the current target came. */
  private age = 0;
  /** Targets and words typed. */
  private done = 0;
  private typedWords = 0;
  /** Finished targets floating up, with their seconds. */
  private floating: { word: string; t: number }[] = [];
  private endT: number | null = null;

  constructor(L: LevelRuntime) {
    super(L);
    this.world = WORLDS[L.def.world];
    this.accent = ACCENT[this.world] ?? '#8a5cc8';
    const size = copyTarget(L.def.index, L.words.knows(SPACE) && L.words.knows('.'));
    this.phraseWords = size.words;
    this.phraseMin = size.min;
  }

  startLine(): string {
    return t('story.copyLoopStart');
  }

  start(): void {
    this.next();
  }

  private next(): void {
    this.current = this.L.core.add(this.L.word(), {});
    this.age = 0;
  }

  onDone(tg: Target): void {
    if (tg !== this.current) return;
    this.done++;
    this.typedWords += tg.word.trim().split(/\s+/).length;
    this.floating.push({ word: tg.word, t: 0 });
    this.L.sfx('pop');
    this.L.core.prune();
    this.current = null;
    if (this.L.minLeft > 0) return this.next();
    // The round time is played: this was the last target.
    this.L.count = this.done;
    this.endT = 0;
    this.L.sfx('cheer');
  }

  update(dt: number): void {
    this.age += dt;
    for (const f of this.floating) f.t += dt;
    this.floating = this.floating.filter((f) => f.t < FLOAT);
    if (this.endT !== null) this.endT += dt;
  }

  render(g: G): void {
    const cx = this.L.vw / 2;
    const end = this.endT === null ? [] : tn('story.copyLoopDone', this.typedWords).split('\n');
    g.save();
    g.font = `700 40px ${fontFamily()}`;
    const need = this.current ? wordBox(g, this.current.word, SIZE).w : Math.max(0, ...end.map((l) => g.measureText(l).width));
    g.restore();
    // The panel fits the current target or the end line, never wider than the stage.
    const w = Math.round(Math.min(this.L.vw - 80, Math.max(PANEL_MIN_W, need + 80))), h = SIZE * 1.45 + 56;
    this.drawSign(g, cx);
    // The panel with its glow is drawn once per width: a blur this big is slow to draw every frame.
    const simple = graphics.simple;
    drawCached(g, `copy-panel ${this.accent} ${simple}`, cx - w / 2 - GLOW, PANEL_Y - h / 2 - GLOW, w + 2 * GLOW, h + 2 * GLOW, (pg) => {
      if (!simple) {
        pg.shadowColor = this.accent;
        pg.shadowBlur = 26;
      }
      pg.fillStyle = 'rgba(252,250,255,0.93)';
      pg.strokeStyle = this.accent;
      pg.lineWidth = 5;
      pg.beginPath();
      pg.roundRect(GLOW, GLOW, w, h, 28);
      pg.fill();
      pg.shadowColor = 'transparent';
      pg.stroke();
    });
    for (const f of this.floating) {
      const k = Math.min(1, f.t / FLOAT);
      g.save();
      g.globalAlpha = 1 - ease.inOutQuad(k);
      drawWord(g, f.word, f.word.length, cx, PANEL_Y - (this.L.reduceMotion ? 0 : 90 * ease.outCubic(k)), 0, { size: SIZE });
      g.restore();
    }
    if (this.current) {
      const grow = this.L.reduceMotion ? 1 : 0.6 + 0.4 * ease.outBack(Math.min(1, this.age / GROW));
      this.L.label(g, this.current, cx, PANEL_Y, SIZE * grow);
    }
    text(g, t('story.copyLoopCount', { n: this.typedWords }), cx, PANEL_Y + h / 2 + 24, 22, 700, INK, 1, true);
    const a = Math.min(1, (this.endT ?? 0) / 0.4);
    end.forEach((l, i) => text(g, l, cx, PANEL_Y + (i - (end.length - 1) / 2) * 48, 40, 700, INK, a));
  }

  /** A small rounded sign at the top: the world's name and that it is still being made. */
  private drawSign(g: G, cx: number): void {
    const name = t(`worlds.${this.world}`), soon = t('story.copyLoopSoon');
    g.save();
    g.font = `700 22px ${fontFamily()}`;
    const w = Math.max(g.measureText(name).width, g.measureText(soon).width * 0.8) + 44;
    g.fillStyle = 'rgba(255,253,246,0.85)';
    g.strokeStyle = this.accent;
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(cx - w / 2, 14, w, 62, 18);
    g.fill();
    g.stroke();
    g.restore();
    text(g, name, cx, 36, 22, 700, INK);
    text(g, soon, cx, 59, 16, 600, INK, 0.7);
  }

  progress(): number {
    return Math.min(1, this.done / this.L.count);
  }

  get finished(): boolean {
    return (this.endT ?? 0) > END_TIME;
  }
}
