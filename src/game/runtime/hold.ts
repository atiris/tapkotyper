import { app } from '../../app/app';
import { t } from '../../i18n/i18n';
import { type Layout, keyByCode } from '../../keyboard/layouts';
import { button, closeButton, h } from '../../ui/dom';
import { focusDefault, panelHotkeys } from '../../ui/hotkeys';
import type { KeyboardGuide } from '../../ui/keyboard-guide';
import type { WordSource } from '../../words/words';
import { captureKeys } from '../cards';
import { HoldRun, type HoldRound } from '../modes/kit/hold';
import type { LevelState } from './state';

/** A held key as its cap shows it (J, Ô). */
export function holdLabel(layout: Layout, code: string): string {
  return (keyByCode(layout, code)?.base ?? code).toUpperCase();
}

/**
 * A sticky run in a level: the round's words, the wait while a held key is up (the scene stops as on a pause, without
 * the pause card, and a line over the scene asks to put the finger back) and the held keys on the on-screen keyboard.
 */
export class StickyHold {
  readonly run: HoldRun;
  private sources = new Map<number, WordSource>();
  private line = h('p', { class: 'hold-line', role: 'status', 'aria-live': 'polite' });

  constructor(rounds: HoldRound[], roundS: number, private state: LevelState, private guide: KeyboardGuide, private layout: Layout, private makeWords: (keys: string[]) => WordSource) {
    this.run = new HoldRun(rounds, roundS);
  }

  /** Play begins: the line over the scene asks to press and hold the round's keys. */
  start(host: HTMLElement): void {
    host.append(this.line);
    this.paint();
  }

  /** The round's words: one hand's keys only. */
  get words(): WordSource {
    const i = this.run.round;
    if (!this.sources.has(i)) this.sources.set(i, this.makeWords(this.run.current.keys));
    return this.sources.get(i)!;
  }

  holds(code: string): boolean {
    return this.run.holds(code);
  }

  /** The keys held down changed; true when the wait ended. */
  onHold(down: ReadonlySet<string>): boolean {
    const was = this.state.waiting;
    this.run.held(down);
    this.paint();
    return was && !this.state.waiting;
  }

  /** Seconds of play (the runtime calls it only while playing). */
  tick(dt: number): void {
    this.run.tick(dt);
  }

  /** Between targets: a new round when this one is over. */
  atTarget(): void {
    if (this.run.atTarget()) this.paint();
  }

  private paint(): void {
    const round = this.run.current, up = this.run.up;
    this.state.waiting = up.length > 0;
    const keys = up.map((c) => holdLabel(this.layout, c)).join(' ');
    this.line.textContent = up.length ? t(up.length === 1 ? 'level.stickyWait' : 'level.stickyWaitMany', { keys }) : '';
    this.line.classList.toggle('on', up.length > 0);
    this.guide.hold(round.hold, up);
  }

  dispose(): void {
    this.line.remove();
    this.guide.hold([], []);
  }
}

/** The keys of the keyboard check: three held, one pressed. */
const CHECK_HOLD = ['KeyA', 'KeyS', 'KeyD'];
const CHECK_PRESS = 'KeyF';

/**
 * Before the first run on this device that holds two keys or more: "Hold A S D and press F." Some keyboards lose a third
 * or fourth key held at once; the card records how many arrived together. Resolves with that number, or null when the
 * child went on without trying (nothing is kept then). It never blames the child.
 */
export function checkRollover(host: HTMLElement, layout: Layout): Promise<number | null> {
  return new Promise((resolve) => {
    const codes = [...CHECK_HOLD, CHECK_PRESS];
    const down = new Set<string>();
    let most = 0;
    const caps = h('div', { class: 'rollover-keys' }, ...codes.map((c) => h('span', { class: 'kb-key', 'data-code': c }, holdLabel(layout, c))));
    const text = h('p', {}, t('level.stickyCheck', { keys: CHECK_HOLD.map((c) => holdLabel(layout, c)).join(' '), key: holdLabel(layout, CHECK_PRESS) }));
    const go = button(t('common.continue'), () => finish(), 'btn primary');
    const card = h('div', { class: 'card rollover-card' }, closeButton(() => finish(), t('common.continue')), h('h2', {}, t('level.stickyCheckTitle')), text, caps, h('div', { class: 'row' }, go));
    const overlay = h('div', { class: 'overlay' }, card);
    let done = false;
    const paint = () => caps.querySelectorAll<HTMLElement>('.kb-key').forEach((k) => k.classList.toggle('held', down.has(k.dataset.code!)));
    const finish = () => {
      if (done) return;
      // Fewer keys than asked arrived: the card says the run holds fewer, then goes on.
      if (most >= 2 && most < codes.length && !card.classList.contains('told')) {
        card.classList.add('told');
        text.textContent = t('level.stickyCheckFewer');
        caps.remove();
        return;
      }
      done = true;
      stop();
      window.removeEventListener('keyup', onUp, true);
      overlay.remove();
      resolve(most >= 2 ? most : null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || (e.key === 'Enter' && !e.repeat)) {
        e.preventDefault();
        e.stopPropagation();
        return finish();
      }
      if (!codes.includes(e.code) || card.classList.contains('told')) return;
      e.preventDefault();
      e.stopPropagation();
      down.add(e.code);
      most = Math.max(most, down.size);
      paint();
      // All four together: this keyboard reports them; the card closes by itself.
      if (most === codes.length) window.setTimeout(finish, 600);
    };
    const onUp = (e: KeyboardEvent) => {
      down.delete(e.code);
      paint();
    };
    const stop = captureKeys(overlay, onKey);
    window.addEventListener('keyup', onUp, true);
    host.append(overlay);
    panelHotkeys(card, [go]);
    queueMicrotask(() => focusDefault(card));
  });
}

/** The keyboard check's result, kept for the whole device (not a profile): how many keys arrived together. */
export function saveRollover(max: number): void {
  app.store.data.rollover = { max, checked: new Date().toISOString() };
  app.store.save();
}
