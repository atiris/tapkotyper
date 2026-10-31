import { app, saveProfile } from '../../app/app';
import { speech } from '../../audio/speech';
import type { Stage } from '../../engine/loop';
import { locale, t } from '../../i18n/i18n';
import { withKey } from '../../input/shortcuts';
import { ENTER } from '../../keyboard/layouts';
import { roundButton } from '../../ui/hud';
import { tip } from '../../ui/tooltip';
import type { LevelDef } from '../levels';
import type { Style, Target } from '../typing';
import type { Friends } from './friends';
import type { Labels } from './labels';
import type { LevelState } from './state';

/** Seconds without a key after which a dictated target is said once more. */
const DICTATION_REPEAT = 4;

/** What the voice says for a target: its words, never the Enter mark. */
function spoken(tg: Target): string {
  return tg.word.replace(ENTER, '');
}

/** What reading aloud needs of the level besides its state. */
export interface ReadHost {
  readonly def: LevelDef;
  /** How the targets are shown; a dictation's voice is the task. */
  readonly style: Style;
  readonly stage: Stage;
  readonly friends: Friends;
}

/** Reading aloud (the HUD button, F3) and the voice of a dictation: each target is said once when it becomes the focus. */
export class Reading {
  readonly btn: HTMLButtonElement;
  private readonly offVoices: () => void;
  /** The target read last, so each one is read once, when it becomes the focus. */
  private readId = 0;
  /** Level time of the last dictated target said; it is said again once by itself. */
  private spokenAt = 0;
  private repeated = false;
  private canvas: HTMLCanvasElement | null = null;

  constructor(private state: LevelState, private host: ReadHost, private labels: Labels) {
    this.btn = roundButton('control', 'read', t('level.read'), () => this.toggle());
    tip(this.btn, withKey(t('level.read'), 'F3'));
    this.paint();
    this.offVoices = speech.onVoices(() => this.paint());
    this.onStageClick = this.onStageClick.bind(this);
  }

  /** Reading aloud is on and the browser has a voice of the profile's language. */
  get on(): boolean {
    return app.profile!.settings.readAloud && speech.available(locale());
  }

  /** The run has dictated targets. */
  get dictating(): boolean {
    return this.host.style === 'dictation' || this.host.style === 'mixed';
  }

  /** A click or tap on a dictated target's label on this canvas says it again. */
  listen(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    canvas.addEventListener('pointerdown', this.onStageClick);
  }

  /** The button shows only when the browser has a voice of the profile's language; in a dictation the voice is the task. */
  paint(): void {
    const p = app.profile!;
    this.btn.hidden = this.dictating || !speech.available(locale()) || (this.host.def.kind === 'freetype' && !p.settings.speakTyped);
    this.btn.setAttribute('aria-pressed', String(p.settings.readAloud));
  }

  toggle(): void {
    const p = app.profile!;
    p.settings.readAloud = !p.settings.readAloud;
    saveProfile();
    this.paint();
    this.readId = 0;
    if (!p.settings.readAloud) speech.stop();
    else this.focus();
  }

  /** The pause cut the voice: a dictated target is said again. */
  again(): void {
    if (this.dictating) this.readId = 0;
  }

  /** Says the focused target when it is new, and a dictated one once more after a while without a key. */
  focus(): void {
    const tg = this.state.core.focus();
    if (!tg || !this.state.started || this.state.paused) return;
    if (tg.id !== this.readId) {
      this.readId = tg.id;
      if (tg.style === 'dictation') this.dictate(tg, false);
      else if (this.on && !this.dictating) speech.say(spoken(tg), locale());
    } else if (tg.style === 'dictation' && tg.masked && !this.repeated && this.state.elapsed - Math.max(this.spokenAt, this.state.keyAt) >= DICTATION_REPEAT) {
      this.dictate(tg, true);
    }
  }

  dispose(): void {
    this.offVoices();
    this.canvas?.removeEventListener('pointerdown', this.onStageClick);
  }

  /** Says a dictated target; a repeat cuts what is still being said. */
  private dictate(tg: Target, repeat: boolean): void {
    if (repeat) speech.stop();
    speech.say(spoken(tg), locale());
    this.spokenAt = this.state.elapsed;
    this.repeated = repeat;
    this.host.friends.sing();
  }

  private onStageClick(e: PointerEvent): void {
    if (!this.dictating || !this.state.playing) return;
    const { stage } = this.host;
    const r = stage.canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / stage.scale, y = (e.clientY - r.top) / stage.scale;
    const hit = this.labels.at(x, y);
    const tg = hit && this.state.core.active.find((a) => a.id === hit.id);
    if (tg?.style === 'dictation') this.dictate(tg, true);
  }
}
