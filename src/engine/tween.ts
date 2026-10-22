export const ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  outBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
  outElastic: (t: number) =>
    t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
};

interface Tween {
  t: number;
  dur: number;
  fn: (k: number) => void;
  easing: (t: number) => number;
  done?: () => void;
}

/** Simple tween runner advanced by the game update. */
export class Tweens {
  private list: Tween[] = [];
  /** Durations are multiplied by this (reduce motion shortens them). */
  speed = 1;

  add(dur: number, fn: (k: number) => void, easing = ease.outCubic, done?: () => void): void {
    this.list.push({ t: 0, dur: Math.max(0.001, dur * this.speed), fn, easing, done });
  }

  update(dt: number): void {
    const finished: Tween[] = [];
    for (const tw of this.list) {
      tw.t = Math.min(tw.dur, tw.t + dt);
      tw.fn(tw.easing(tw.t / tw.dur));
      if (tw.t >= tw.dur) finished.push(tw);
    }
    if (finished.length) {
      this.list = this.list.filter((tw) => !finished.includes(tw));
      for (const tw of finished) tw.done?.();
    }
  }
}
