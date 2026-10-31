import { app } from '../../app/app';
import { type Mood, renderTapkoInto, tapkoElement } from '../../gfx/tapko';
import { t } from '../../i18n/i18n';
import { h } from '../../ui/dom';
import { TAPKO_FEET, TAPKO_H, TAPKO_X } from '../mode';
import { sayTime } from '../pace';
import { LABEL_GAP, type Rect } from './labels';

/** Tapko on the stage (a DOM picture over the canvas) and the narrator's bubble. */
export class StageTapko {
  readonly el: HTMLElement;
  readonly bubble: HTMLElement;
  /** Tapko's current mood, for modes that draw him on the canvas. */
  mood: Mood = 'idle';
  private moodTimer = 0;
  private bubbleTimer = 0;
  private px = 0;

  constructor(private reduceMotion: boolean, onClick: () => void) {
    this.el = tapkoElement(app.profile!.companion, 'idle');
    // Tapko joins the stage when play starts; the preparation cards show him themselves.
    this.el.classList.add('level-tapko', 'waiting');
    this.el.dataset.tip = t('tapko.statsHint');
    this.el.addEventListener('click', onClick);
    this.bubble = h('div', { class: 'bubble hidden', role: 'status', 'aria-live': 'polite' });
  }

  /**
   * The narrator's line in the bubble; only screen readers hear it, the voice reads the targets alone.
   * It stays long enough to read (`seconds` is a minimum) and a line still shown is not replaced.
   */
  say(text: string, seconds: number): void {
    if (this.bubbleTimer > 0) return;
    this.bubble.replaceChildren(h('p', {}, text));
    this.bubble.classList.remove('hidden');
    this.bubbleTimer = Math.max(seconds, sayTime(text));
  }

  hideBubble(): void {
    this.bubble.classList.add('hidden');
    this.bubbleTimer = 0;
  }

  setMood(mood: Mood, seconds: number): void {
    this.show(mood);
    if (mood === 'happy' && !this.reduceMotion) this.replay('jump');
    this.moodTimer = seconds;
  }

  /** Tapko stays in place and hops happily before the results card; just the happy face with reduced motion. */
  celebrate(): void {
    this.moodTimer = 0;
    this.show('happy');
    if (!this.reduceMotion) this.replay('celebrate');
  }

  /** A line hidden behind a target waits for a free spot instead of running out. */
  update(dt: number): void {
    if (this.bubbleTimer > 0 && !this.bubble.classList.contains('covered') && (this.bubbleTimer -= dt) <= 0) this.hideBubble();
    if (this.moodTimer > 0 && (this.moodTimer -= dt) <= 0) this.show('idle');
  }

  /** The DOM Tapko keeps his size in game units, so he grows and shrinks with the scene; his feet stand where the mode's ground is. */
  size(scale: number, feet: number): void {
    const px = Math.round(TAPKO_H * scale);
    if (px === this.px) return;
    this.px = px;
    this.el.style.setProperty('--size', `${px}px`);
    this.el.style.left = `${Math.round((TAPKO_X - TAPKO_H / 2) * scale)}px`;
    this.el.style.bottom = `${Math.round((TAPKO_FEET - feet) * scale)}px`;
  }

  /** The word is the task, so the bubble never covers one (`labels`): over a label it hides until its spot is free. */
  placeBubble(scale: number, at: { x: number; y: number } | null, labels: Rect[]): void {
    const b = this.bubble, s = scale;
    if (b.classList.contains('hidden')) return;
    // The tail's tip (40 px + half of its 16 px from the left, 8 px below) points to the mode's spot.
    if (at) {
      b.style.left = `${Math.max(8, at.x * s - 48)}px`;
      b.style.top = `${Math.max(8, at.y * s - b.offsetHeight - 8)}px`;
    }
    const covers = () => {
      const x0 = b.offsetLeft / s - LABEL_GAP, x1 = (b.offsetLeft + b.offsetWidth) / s + LABEL_GAP;
      const y0 = b.offsetTop / s - LABEL_GAP, y1 = (b.offsetTop + b.offsetHeight) / s + LABEL_GAP;
      return labels.some((r) => r.x0 < x1 && r.x1 > x0 && r.y0 < y1 && r.y1 > y0);
    };
    b.classList.toggle('covered', covers());
  }

  private show(mood: Mood): void {
    this.mood = mood;
    renderTapkoInto(this.el, app.profile!.companion, mood);
    this.el.classList.remove('jump');
  }

  /** Starts a CSS hop again even when it just ran. */
  private replay(cls: 'jump' | 'celebrate'): void {
    void this.el.offsetWidth;
    this.el.classList.add(cls);
  }
}
