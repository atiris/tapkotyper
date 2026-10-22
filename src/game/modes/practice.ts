import { VH } from '../../engine/loop';
import { fontFamily, type G } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import { LAYOUTS } from '../../keyboard/layouts';
import type { Profile } from '../../storage/schema';
import { textPhrases, typableText } from '../../words/words';
import { Mode } from '../mode';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';

const MIN_WORD_PX = 44;
const MIN_INFO_PX = 18;
/** Most words in one practice target. */
const PRACTICE_WORDS = 4;

/** The parent's own text as practice targets, in reading order (empty without text). */
export function ownTextPhrases(p: Profile): string[] {
  return textPhrases(typableText(p.settings.ownText, LAYOUTS[p.layout]).text, PRACTICE_WORDS);
}

/** Free practice: calm words one after another, no story, no motion pressure; or the parent's text in order. */
export class PracticeMode extends Mode {
  readonly world = 'meadow';
  readonly phraseWords = PRACTICE_WORDS;
  private current: Target | null = null;
  private pop = 0;
  private count = 0;
  private time = 0;

  constructor(L: LevelRuntime, private seconds: number | null, private phrases: string[] | null) {
    super(L);
  }

  start(): void {
    this.next();
  }

  private next(): void {
    this.current = this.L.core.add(this.phrases ? this.phrases[this.count] : this.L.word(), {});
    this.pop = 0;
  }

  update(dt: number): void {
    this.time += dt;
    this.pop = Math.min(1, this.pop + dt * 4);
    this.scroll += dt * 6;
  }

  onDone(): void {
    this.count++;
    this.L.particles.emit(this.L.vw / 2, VH * 0.42, 10, 'sparkle', ['#fff6a8', '#ffffff', '#ffd1f5'], 150, 8);
    this.L.core.prune();
    if (!this.finished) this.next();
    else this.current = null;
  }

  render(g: G): void {
    g.save();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(0, 0, this.L.vw, VH);
    g.restore();
    // Sizes in screen pixels never drop below a readable minimum in a small window.
    const scale = this.L.stage.scale;
    const wordSize = Math.max(56, MIN_WORD_PX / scale);
    const infoSize = Math.max(24, MIN_INFO_PX / scale);
    const y = VH * 0.42;
    if (this.current) this.L.label(g, this.current, this.L.vw / 2, y + (1 - this.pop) * 20, wordSize);
    g.save();
    g.fillStyle = '#2d4a3a';
    g.font = `600 ${infoSize}px ${fontFamily()}`;
    g.textAlign = 'center';
    const info = this.seconds ? t('practice.left', { s: Math.max(0, Math.ceil(this.seconds - this.time)) })
      : this.phrases ? t('practice.parts', { n: this.count, total: this.phrases.length }) : t('practice.words', { n: this.count });
    g.fillText(info, this.L.vw / 2, Math.max(VH * 0.62, y + wordSize * 0.75 + infoSize * 1.4));
    g.restore();
  }

  progress(): number {
    if (this.phrases) return this.count / this.phrases.length;
    return this.seconds ? Math.min(1, this.time / this.seconds) : 0;
  }

  get finished(): boolean {
    if (this.phrases) return this.count >= this.phrases.length;
    return !!this.seconds && this.time >= this.seconds;
  }
}
