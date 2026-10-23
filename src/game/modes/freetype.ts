import { app } from '../../app/app';
import { VH } from '../../engine/loop';
import { drawWord, fontFamily, type G, roundRect, wordBox } from '../../gfx/draw';
import { drawTapko } from '../../gfx/tapko';
import { t } from '../../i18n/i18n';
import { WORLDS } from '../levels';
import type { LevelRuntime } from '../runtime';
import { TypedLine } from '../typed-line';
import { HeroMode } from './planet';

/** Tapko's walking speed (background units per second) and the seconds of his hop at a key. */
const WALK = 28;
const HOP = 0.35;
/** Seconds he stands after a hop before the next key may start another, so fast typing does not shake him. */
const REST = 0.25;
/** Every so many keys (between the two) he does a trick instead of a hop. */
const TRICK_KEYS = [18, 30];
/** The tricks: a flip, a high jump, and a surprised look with a small hop; their seconds. */
const TRICKS = { flip: 0.9, high: 0.7, wonder: 1.1 } as const;
type Trick = keyof typeof TRICKS;
/** Seconds the shown text stays above Tapko, and its size. */
const SHOW = 3.2;
const SHOW_SIZE = 64;
const LINE_SIZE = 30;
const SPARKS = ['#fff6a8', '#ffffff', '#ffd1f5', '#a6e3c9'];

/**
 * "Just typing": Tapko walks through a chosen world, hops with the typing (never faster than one
 * hop and a short rest), now and then does a trick, and the text typed before a pause is shown
 * above him (and said, when the parent allows it). No targets, no end.
 */
export class FreeTypeMode extends HeroMode {
  readonly world: string;
  private line = new TypedLine();
  private shown: { text: string; age: number } | null = null;
  /** Seconds since the hop or trick began. */
  private hopT = HOP + REST;
  private trick: Trick | null = null;
  private keysToTrick = 0;

  constructor(L: LevelRuntime) {
    super(L);
    this.world = WORLDS[L.def.world];
  }

  start(): void {
    this.heroY = VH * 0.8;
    this.keysToTrick = this.nextTrickIn();
  }

  private nextTrickIn(): number {
    return TRICK_KEYS[0] + Math.floor(Math.random() * (TRICK_KEYS[1] - TRICK_KEYS[0] + 1));
  }

  key(ch: string): void {
    this.cheer();
    const full = this.line.add(ch);
    if (full) this.show(full);
  }

  erase(): void {
    this.line.erase();
  }

  /** Enter: the collected text is shown now. */
  send(): void {
    const text = this.line.take();
    if (text) this.show(text);
  }

  private cheer(): void {
    this.L.particles.emit(this.heroX, this.heroY - 90, 5, 'sparkle', SPARKS, 140, 7, 0.6);
    this.keysToTrick--;
    if (this.L.reduceMotion || this.hopT < this.length() + REST) return this.trick ? undefined : this.happy();
    this.hopT = 0;
    if (this.keysToTrick > 0) {
      this.trick = null;
      return this.happy();
    }
    const all = Object.keys(TRICKS) as Trick[];
    this.trick = all[Math.floor(Math.random() * all.length)];
    this.keysToTrick = this.nextTrickIn();
    if (this.trick === 'wonder') this.surprised(TRICKS.wonder);
    else this.happy();
  }

  /** Seconds of the hop or trick under way. */
  private length(): number {
    return this.trick ? TRICKS[this.trick] : HOP;
  }

  private show(text: string): void {
    this.shown = { text, age: 0 };
    this.L.speakTyped(text);
  }

  update(dt: number): void {
    super.update(dt);
    this.scroll += WALK * dt;
    // He strolls back and forth in the left part of the stage, a little nearer and farther too.
    this.heroX = this.L.vw * (0.3 + Math.sin(this.t * 0.25) * 0.08);
    this.heroY = VH * (0.8 + Math.sin(this.t * 0.17 + 1) * 0.025);
    this.hopT += dt;
    const len = this.length();
    this.jump = this.hopT < len ? this.hopT / len : 0;
    if (this.hopT >= len && this.trick) this.trick = null;
    const text = this.line.tick(dt);
    if (text) this.show(text);
    if (this.shown && (this.shown.age += dt) >= SHOW) this.shown = null;
  }

  /** The hop, or the trick: a flip turns him once in a higher jump, a high jump goes higher, wonder only hops a little. */
  protected drawHero(g: G): void {
    const height = this.trick === 'flip' ? 0.6 : this.trick === 'high' ? 0.75 : this.trick === 'wonder' ? 0.15 : 0.35;
    const spin = this.trick === 'flip' ? this.jump : 0;
    drawTapko(g, app.profile!.companion, this.mood, this.heroX, this.heroY, 170, { t: this.t, jump: this.jump, height, spin });
  }

  render(g: G): void {
    this.drawLine(g);
    this.drawHero(g);
    if (!this.shown) return;
    const pop = Math.min(1, this.shown.age * 5);
    const fade = Math.min(1, (SHOW - this.shown.age) * 2);
    const room = this.L.vw * 0.9;
    const full = wordBox(g, this.shown.text, SHOW_SIZE).w;
    const size = full > room ? SHOW_SIZE * room / full : SHOW_SIZE;
    const w = wordBox(g, this.shown.text, size).w;
    const x = Math.max(w / 2 + 10, Math.min(this.L.vw - w / 2 - 10, this.heroX));
    g.save();
    g.globalAlpha = fade;
    drawWord(g, this.shown.text, [...this.shown.text].length, x, this.heroY - 230 + (1 - pop) * 20, 0, { size, highContrast: this.L.highContrast });
    g.restore();
  }

  /** The quiet line of what is typed now, or a hint while nothing is typed or shown. */
  private drawLine(g: G): void {
    const text = this.line.text;
    if (!text && this.shown) return;
    const hint = !text;
    const label = hint ? t('freeType.hint') : `${text}|`;
    const size = Math.max(LINE_SIZE, 18 / this.L.stage.scale);
    g.save();
    g.font = `600 ${size}px ${fontFamily()}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const w = Math.min(this.L.vw * 0.9, g.measureText(label).width + size * 1.2);
    const y = VH * 0.16;
    g.fillStyle = this.L.highContrast ? '#ffffff' : 'rgba(255,253,246,0.7)';
    roundRect(g, this.L.vw / 2 - w / 2, y - size * 0.8, w, size * 1.6, size * 0.8);
    g.fill();
    g.fillStyle = this.L.highContrast ? '#000000' : hint ? 'rgba(74,58,92,0.75)' : '#4a3a5c';
    g.fillText(label, this.L.vw / 2, y, this.L.vw * 0.86);
    g.restore();
  }

  progress(): number {
    return 0;
  }

  get finished(): boolean {
    return false;
  }
}
