import { app, saveProfile } from '../../app/app';
import type { Sfx } from '../../audio/audio';
import { type Mood, pawColors } from '../../gfx/tapko';
import { t } from '../../i18n/i18n';
import { paintRound, pawRing, roundButton } from '../../ui/hud';
import type { Mode } from '../mode';
import { PAW_MAX, PAW_STREAK, PAW_WORDS } from '../paw';
import type { Rhythm } from '../rhythm';
import type { LevelState } from './state';

/** What the paws need of the level besides its state. */
export interface PawHost {
  readonly mode: Mode;
  readonly reduceMotion: boolean;
  /** The on-screen keyboard is shown; the paws show it while they type. */
  readonly guideOn: boolean;
  toggleGuide(): void;
  say(text: string, seconds: number): void;
  setMood(mood: Mood, seconds: number): void;
  sfx(s: Sfx): void;
  updateGuide(): void;
  readonly rhythm: Rhythm;
}

/** The paw help: a mistake-free streak charges it, its HUD button (or Enter) lets Tapko's paws type the next words for the child. */
export class Paws {
  readonly btn: HTMLButtonElement;
  /** Words the paws still type; 0 while the child types. */
  private words = 0;
  /** Seconds to the paws' next key, and seconds waited for a word to come. */
  private timer = 0;
  private idle = 0;
  private guideBefore = true;

  constructor(private state: LevelState, private host: PawHost) {
    this.btn = roundButton('paw', 'paw', t('paw.title', { n: PAW_STREAK, words: PAW_WORDS }), () => this.start());
    this.btn.classList.add('paw-btn');
    this.render();
  }

  /** The paws type now: the child's keys wait, and none of it counts. */
  get typing(): boolean {
    return this.words > 0;
  }

  private render(): void {
    const { pawHelp } = app.profile!.progress;
    this.btn.classList.toggle('empty', pawHelp === 0);
    this.btn.dataset.charged = String(pawHelp);
    this.btn.setAttribute('aria-label', t('paw.aria', { n: pawHelp }));
    paintRound(this.btn, 'paw', pawRing(pawHelp, PAW_MAX));
  }

  /** A word the child typed: every PAW_STREAK of them in a row charge one paw help. */
  wordDone(streak: number): void {
    if (streak % PAW_STREAK) return;
    const p = app.profile!;
    if (p.progress.pawHelp >= PAW_MAX) return;
    p.progress.pawHelp++;
    saveProfile();
    this.host.say(t('paw.charged', { n: PAW_STREAK, words: PAW_WORDS }), 4);
    this.render();
    this.btn.classList.remove('charged');
    void this.btn.offsetWidth;
    this.btn.classList.add('charged');
  }

  /** The paws replace the hands and type the closest words for the child. */
  start(): boolean {
    const p = app.profile!;
    if (!this.state.playing || this.words) return false;
    const focus = this.state.core.focus();
    if (p.progress.pawHelp <= 0 || !focus || !this.host.mode.pawMay(focus)) return false;
    p.progress.pawHelp--;
    saveProfile();
    this.words = PAW_WORDS;
    this.timer = this.host.reduceMotion ? 0.2 : 0.6;
    this.idle = 0;
    this.guideBefore = this.host.guideOn;
    if (!this.host.guideOn) this.host.toggleGuide();
    this.state.guide.setPaws(pawColors(p.companion.kind));
    this.host.say(t('paw.start'), 2.5);
    this.host.setMood('happy', 1.4);
    this.render();
    return true;
  }

  stop(): void {
    this.words = 0;
    this.render();
    this.state.guide.setPaws(null);
    if (this.host.guideOn !== this.guideBefore) this.host.toggleGuide();
    // The child's next reaction time starts now, not with the paw's last key.
    this.host.rhythm.ready(performance.now());
    this.host.updateGuide();
  }

  /** One key at a time, with Tapko's rhythm; none of it counts in the child's statistics. */
  tick(dt: number): void {
    if ((this.timer -= dt) > 0) return;
    const { core, guide } = this.state;
    const { mode } = this.host;
    const tg = core.focus();
    if (!tg) {
      // Wait a moment for the next word; stop when none comes.
      this.timer = 0.2;
      if ((this.idle += 0.2) > 4) this.stop();
      return;
    }
    // A decision waits: the paws stop and the child chooses.
    if (!mode.pawMay(tg)) return this.stop();
    this.idle = 0;
    const ch = tg.word[tg.typed];
    if (tg.masked) core.reveal(tg);
    core.locked = tg;
    const res = core.type(ch);
    guide.pawTap(ch);
    if (res.kind === 'done') {
      this.host.sfx('word');
      mode.onDone(tg);
      this.timer = 0.4;
      if (--this.words === 0) this.stop();
    } else {
      this.host.sfx('key');
      mode.onCorrect(tg);
      this.timer = 0.13;
    }
    this.host.updateGuide();
  }
}
