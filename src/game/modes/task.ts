import { VH } from '../../engine/loop';
import { fontFamily, type G, WORD } from '../../gfx/draw';
import { wordsGame } from '../../share/task';
import type { TaskSpec } from '../../storage/schema';
import { WORLDS } from '../levels';
import { Mode, TAPKO_X } from '../mode';
import type { LevelRuntime } from '../runtime';
import { type FeedItem, TaskFeed, taskDone } from '../task-play';
import type { Target } from '../typing';
import { ApproachMode, type Mover } from './kit/approach';

/** Words of a dictionary sentence in a text game: as the egg's spell takes them. */
const SENTENCE: [number, number] = [6, 4];

/**
 * What every task game shares: the task's pieces (`L.taskItems`, set before play) through the feed,
 * with dictionary words or the task's own again once they are given out, and the end by its limit.
 */
export class TaskPlay {
  readonly spec: TaskSpec;
  private feed: TaskFeed | null = null;

  constructor(private L: LevelRuntime) {
    this.spec = L.def.task!;
  }

  start(): void {
    const s = this.spec, L = this.L, words = wordsGame(s.game);
    this.feed = new TaskFeed(L.taskItems, {
      words,
      extras: s.limit !== 'text',
      dictionary: s.dictionary ? () => (words ? L.word(undefined, 1) : L.word(undefined, ...SENTENCE)) : null,
      rng: L.rng,
    });
  }

  next(): FeedItem | null {
    return this.feed?.next() ?? null;
  }

  written(it: FeedItem): void {
    this.feed?.written(it);
  }

  missed(it: FeedItem): void {
    this.feed?.missed(it);
  }

  /** The time limit's bar is the time alone; the text's the share written. */
  progress(): number {
    return this.spec.limit === 'time' ? 1 : this.feed?.ownShare ?? 0;
  }

  get finished(): boolean {
    return !!this.feed && taskDone(this.spec.limit, this.feed.ownDone);
  }
}

/** The world of the task's backdrop, by name. */
export const worldOf = (L: LevelRuntime): string => WORLDS[L.def.world];

/** The highest and lowest line words fly in on. */
const LANES = [VH * 0.22, VH * 0.72];
const BURST = ['#fff6a8', '#ffffff', '#ffd1f5'];

/**
 * Prúd slov: words fly in from the right edge toward Tapko, one after another at the stream's
 * pace for this child, nothing but the words. A word typed bursts; one reaching Tapko just passes.
 */
export class TaskChaseMode extends ApproachMode {
  readonly world = worldOf(this.L);
  private play = new TaskPlay(this.L);
  protected autoSpawn = false;
  protected playerX = TAPKO_X + 70;

  start(): void {
    this.play.start();
  }

  makeMover(word: string): Mover {
    const x = this.L.vw + 40;
    return { x, y: this.L.rng.range(LANES[0], LANES[1]), vx: this.speedFor(word, x), vy: 0, rot: 0, vr: 0, age: 0, state: 'come', fade: 0, sprite: '', size: 0 };
  }

  drawMover(): void {}

  update(dt: number): void {
    const core = this.L.core;
    if (this.spawnTimer <= 0 && core.active.length < this.maxOnScreen()) {
      const it = this.play.next();
      if (it) {
        const m = this.makeMover(it.text);
        m.item = it;
        core.add(it.text, m);
        this.spawnTimer = this.spawnGap();
      }
    }
    super.update(dt);
  }

  protected onLeave(m: Mover): void {
    this.play.written(m.item);
    m.vx = m.vy = 0;
    m.fade = 0.6;
    this.L.particles.emit(m.x, m.y - 26, 14, 'sparkle', BURST, 170, 8);
  }

  protected onPass(m: Mover, tg: Target): void {
    this.play.missed(m.item);
    super.onPass(m, tg);
  }

  progress(): number {
    return this.play.progress();
  }

  get finished(): boolean {
    return this.play.finished;
  }
}

/** A waiting word: its place, its piece, and seconds since it came. */
interface Waiting {
  x: number;
  y: number;
  item: FeedItem;
  age: number;
}

/** A typed word fading where it waited. */
interface Fading {
  text: string;
  x: number;
  y: number;
  t: number;
}

/** Waiting words: places in the right two thirds of the stage, a grid with a little play, and the seconds a typed word fades and the next one waits. */
const GRID = [3, 3];
const JITTER = 30;
const FADE_S = 0.6;
const NEXT_S = 0.4;
const WORD_SIZE = 40;

/**
 * Čakajúce slová: 3 to 5 words wait at free places in the right two thirds of the stage; the
 * child types them in any order (the first letter picks the word). A typed word fades and a new
 * one comes to a free place.
 */
export class TaskCatchMode extends Mode {
  readonly world = worldOf(this.L);
  private play = new TaskPlay(this.L);
  private fading: Fading[] = [];
  /** Seconds until the next word may come. */
  private wait = 0;

  start(): void {
    this.play.start();
    for (let i = 0; i < this.many; i++) this.add();
  }

  /** Words waiting at once: more for a quicker child. */
  private get many(): number {
    return Math.max(3, Math.min(5, 2 + this.L.maxActive));
  }

  /** The places of the grid in the right two thirds, under the top and above the keyboard's edge. */
  private places(): { x: number; y: number }[] {
    const L = this.L, left = Math.max(L.vw / 3, TAPKO_X + 160), right = L.vw - 90;
    const out: { x: number; y: number }[] = [];
    for (let c = 0; c < GRID[0]; c++) for (let r = 0; r < GRID[1]; r++) {
      out.push({ x: left + ((right - left) * (c + 0.5)) / GRID[0], y: VH * 0.18 + (VH * 0.6 * (r + 0.5)) / GRID[1] });
    }
    return out;
  }

  /** A new word at a free place, away from the waiting and fading ones. */
  private add(): void {
    const it = this.play.next();
    if (!it) return;
    const L = this.L, taken = [...L.core.active.map((tg) => tg.data as Waiting), ...this.fading];
    const free = this.places().filter((p) => !taken.some((w) => Math.abs(w.x - p.x) < 60 && Math.abs(w.y - p.y) < 40));
    const p = L.rng.pick(free.length ? free : this.places());
    const w: Waiting = { x: p.x + L.rng.range(-JITTER, JITTER), y: p.y + L.rng.range(-JITTER / 2, JITTER / 2), item: it, age: 0 };
    // The oldest word is picked first when two start with the same letter.
    L.core.add(it.text, w).urgency = -L.core.targets.length;
  }

  onDone(tg: Target): void {
    const w = tg.data as Waiting;
    this.play.written(w.item);
    this.fading.push({ text: tg.word, x: w.x, y: w.y, t: 0 });
    this.L.particles.emit(w.x, w.y, 10, 'sparkle', BURST, 140, 7);
    this.L.core.prune();
    this.wait = NEXT_S;
  }

  update(dt: number): void {
    for (const tg of this.L.core.active) (tg.data as Waiting).age += dt;
    for (const f of this.fading) f.t += dt;
    this.fading = this.fading.filter((f) => f.t < FADE_S);
    if ((this.wait -= dt) <= 0 && this.L.core.active.length < this.many) {
      this.add();
      this.wait = NEXT_S;
    }
  }

  render(g: G): void {
    for (const tg of this.L.core.active) {
      const w = tg.data as Waiting;
      this.L.label(g, tg, w.x, w.y, WORD_SIZE);
    }
    g.save();
    g.font = `600 ${WORD_SIZE}px ${fontFamily()}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = WORD.typed;
    for (const f of this.fading) {
      g.globalAlpha = 1 - f.t / FADE_S;
      g.fillText(f.text, f.x, f.y - (this.L.reduceMotion ? 0 : f.t * 30));
    }
    g.restore();
  }

  progress(): number {
    return this.play.progress();
  }

  get finished(): boolean {
    return this.play.finished;
  }
}
