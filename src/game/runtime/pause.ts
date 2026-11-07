import { t } from '../../i18n/i18n';
import { button, closeButton, h } from '../../ui/dom';
import { focusDefault, panelHotkeys } from '../../ui/hotkeys';
import { paintRound } from '../../ui/hud';
import { tip } from '../../ui/tooltip';
import type { LevelDef } from '../levels';
import type { LevelState } from './state';

/** Stretches done sitting, one of them shown on the pause card. */
const STRETCHES = ['arms', 'fists', 'shoulders', 'neck', 'wrists', 'eyes'];

/** One stretch to try, at random. */
export function pickStretch(): string {
  return STRETCHES[Math.floor(Math.random() * STRETCHES.length)];
}

/** What leaving and going on are called, and what the question before leaving says is lost. */
export interface Ending {
  label: string;
  keep: string;
  text: string;
}

/** A story level or an exercise: each ends and goes on in its own words (a hero's journey asks with `giveUpJourney`). */
export function endingOf(def: LevelDef, stay: boolean): Ending {
  if (def.kind === 'freetype') return { label: 'level.leave', keep: 'level.keepTyping', text: '' };
  if (def.kind === 'practice' || def.kind === 'task' || def.kind === 'aim' || def.kind === 'parrot' || def.kind === 'rhythm' || def.kind === 'placement' || stay) return { label: 'level.end', keep: 'level.keepPractice', text: 'level.endPracticeText' };
  return { label: 'level.end', keep: 'level.keepLevel', text: 'level.endLevelText' };
}

/** What the pause card does with the level. */
export interface PauseHost {
  readonly ending: Ending;
  /** Staying a while: the level has no end of its own. */
  readonly stay: boolean;
  /** Staying a while with the next level open: the card's first button goes on to it. */
  readonly next?: () => void;
  /** The difficulty can still go down. */
  canSlowDown(): boolean;
  resume(): void;
  slowDown(): void;
  leave(): void;
  /** The warm-up over the paused level; `back` returns to the pause card. */
  onBreak(back: () => void): void;
}

/** The pause card over the scene and the HUD's pause button (none in free typing, whose X leaves). */
export class PauseCard {
  el: HTMLElement | null = null;

  constructor(private state: LevelState, private host: PauseHost, private btn: HTMLButtonElement | null) {}

  /** Opens the card; before play there is no key input yet, so Esc on the card goes on to the cards. */
  open(): void {
    this.paint();
    this.el = h('div', { class: 'card pause-card', role: 'dialog', 'aria-label': t('level.paused') });
    if (!this.state.started) this.el.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.host.resume(); });
    this.card();
    this.state.stageWrap.append(this.el);
    this.focus();
  }

  close(): void {
    this.el?.remove();
    this.el = null;
    this.paint();
  }

  /** The card's first button: Continue, or staying a while the next level or the end. */
  focus(): void {
    if (this.el) focusDefault(this.el);
  }

  /** The pause button shows what it does: pause while playing, play while paused. */
  paint(): void {
    if (!this.btn) return;
    const label = t(this.state.paused ? this.host.ending.keep : 'level.pause');
    paintRound(this.btn, this.state.paused ? 'play' : 'pause');
    this.btn.setAttribute('aria-label', label);
    tip(this.btn, label);
  }

  /**
   * A small card at the top (the words and the guide's next key stay in sight): a stretch to try,
   * the X (Esc too) to go on, and Continue, Slower (only in play), the warm-up and the end.
   * Staying a while, the level is already done: the next level (when open), else the end comes first.
   * The first button is the default, every one has its letter.
   */
  private card(): void {
    const host = this.host;
    const stretch = pickStretch();
    const slower = this.state.started ? button(t('level.slower'), () => host.slowDown(), 'btn') : null;
    if (slower) slower.disabled = !host.canSlowDown();
    const keep = button(t(host.ending.keep), () => host.resume(), 'btn', 'play');
    const end = button(t(host.ending.label), () => host.leave(), 'btn', 'close');
    const first = !host.stay ? keep : host.next ? button(t('results.next'), host.next, 'btn', 'next') : end;
    first.classList.add('primary');
    const buttons = [first, ...[keep, slower, button(t('level.stretch'), () => this.warmUp(), 'btn', 'smile'), end].filter((b): b is HTMLButtonElement => b !== null && b !== first)];
    this.el!.replaceChildren(
      closeButton(() => host.resume(), t('level.pauseClose')),
      h('h2', {}, t('level.paused')),
      h('p', { class: 'pause-tip' }, t(`break.${stretch}`)),
      h('div', { class: 'row' }, ...buttons));
    panelHotkeys(this.el!, buttons);
  }

  /** The warm-up over the paused level, then the pause card again. */
  private warmUp(): void {
    this.host.onBreak(() => {
      if (!this.el) return;
      this.card();
      this.focus();
    });
  }
}
