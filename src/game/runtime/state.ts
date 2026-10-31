import type { KeyboardGuide } from '../../ui/keyboard-guide';
import type { TypingCore } from '../typing';

/** What the level's parts (the pause card, the paws, the super help) share with the runtime, which owns it. */
export class LevelState {
  /** The pause card is open (also over the cards before play). */
  paused = false;
  /** Play began (the preparation cards are done). */
  started = false;
  /** The level ended, or free typing left for its end card. */
  finished = false;
  /** Seconds of play in this level, pauses not counted. */
  elapsed = 0;
  /** Level time of the child's last counted key. */
  keyAt = 0;

  constructor(readonly core: TypingCore, readonly guide: KeyboardGuide, readonly el: HTMLElement) {}

  /** Play runs: begun, not paused, not over. */
  get playing(): boolean {
    return this.started && !this.paused && !this.finished;
  }

  /** Seconds of play since the child's last key (since play started before the first one). */
  get idleFor(): number {
    return this.elapsed - this.keyAt;
  }

  /** The stage's box, where cards over the scene go. */
  get stageWrap(): HTMLElement {
    return this.el.querySelector<HTMLElement>('.stage-wrap')!;
  }
}
