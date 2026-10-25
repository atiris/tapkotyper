/**
 * Update and render once per animation frame with the real frame time, split into
 * steps of at most 1/60 s. A fixed 60 Hz update would leave some frames without
 * movement on 75-144 Hz screens and make motion stutter.
 */
export class Loop {
  static readonly STEP = 1 / 60;
  private raf = 0;
  private last = 0;
  running = false;

  constructor(private update: (dt: number) => void, private render: () => void) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const frame = (now: number) => {
      if (!this.running) return;
      // Long gaps (tab hidden, debugger) do not fast-forward the game.
      let left = Math.min(0.25, Math.max(0, (now - this.last) / 1000));
      this.last = now;
      while (left > 1e-6) {
        const dt = Math.min(Loop.STEP, left);
        this.update(dt);
        left -= dt;
      }
      this.render();
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}

/** Virtual coordinate system: 600 units high, width follows the aspect ratio. */
export const VH = 600;

export class Stage {
  readonly canvas: HTMLCanvasElement;
  readonly g: CanvasRenderingContext2D;
  /** A layer over the DOM Tapko, for what the scene holds in front of him. */
  private readonly front: HTMLCanvasElement;
  private readonly fg: CanvasRenderingContext2D;
  /** Virtual width. */
  vw = 1280;
  scale = 1;
  /** The canvas was cleared by a resize and needs a redraw even when nothing moves. */
  dirty = true;
  private observer: ResizeObserver;

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'stage';
    parent.appendChild(this.canvas);
    this.g = this.canvas.getContext('2d')!;
    this.front = document.createElement('canvas');
    this.front.className = 'stage stage-front';
    parent.appendChild(this.front);
    this.fg = this.front.getContext('2d')!;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(parent);
    this.resize();
  }

  resize(): void {
    const r = this.canvas.parentElement!.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    for (const c of [this.canvas, this.front]) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
    }
    this.scale = h / VH;
    this.vw = w / this.scale;
    this.dirty = true;
  }

  /** Prepares the context for drawing in virtual units. */
  begin(): CanvasRenderingContext2D {
    this.dirty = false;
    return this.clear(this.g);
  }

  /** The front layer's context, cleared and in virtual units. */
  beginFront(): CanvasRenderingContext2D {
    return this.clear(this.fg);
  }

  private clear(g: CanvasRenderingContext2D): CanvasRenderingContext2D {
    const dpr = this.canvas.width / Math.max(1, this.canvas.clientWidth || 1);
    g.setTransform(this.scale * dpr, 0, 0, this.scale * dpr, 0, 0);
    g.clearRect(0, 0, this.vw, VH);
    return g;
  }

  dispose(): void {
    this.observer.disconnect();
    this.canvas.remove();
    this.front.remove();
  }
}
