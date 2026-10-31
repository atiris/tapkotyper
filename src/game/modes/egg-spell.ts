import { app, pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { drawSprite, type G } from '../../gfx/draw';
import { LITTLE_DRAGON_PICTURES, drawLittleDragon, littleDragonFallback, littleDragonImage } from '../../gfx/little-dragon';
import { eggFallback, eggSpot } from '../../gfx/tapko';
import { t } from '../../i18n/i18n';
import { ENTER } from '../../keyboard/layouts';
import { TAPKO_H } from '../mode';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { FLAMES, Firepit, type PitLook } from './dragons';
import { Detour, lengthen, secondsPerWord } from './kit/egg';
import { Ribbon } from './kit/ribbon';
import { HeroMode, PATH_FEET } from './kit/hero';

const FEET = PATH_FEET;
const HERO_X = 200;
/** The dragons' hearth just right of Tapko (its middle this far right of him), its height, and the egg in it. */
const HEARTH_DX = 150;
const HEARTH_H = 112;
const EGG_IN = 64;
const HATCHED_H = 96;
/** The little dragon out of its shell, as big as it walks with Tapko on the hero's journey. */
const LITTLE_H = 92;
/** Seconds Tapko takes to lay the egg off his back into the hearth before the first word shows. */
const LAY_S = 1;

/**
 * The spell's area: the right half of the stage, the right two thirds on a narrow one (narrower
 * than `NARROW` stage heights), never over Tapko; a margin on the right.
 */
const NARROW = 1.6;
const SPELL_MARGIN = 30;
/** A slip adds one word to the spell, at most this many in a level. */
const GROW_MAX = 10;
/** After the first slip's line, the reminder comes with about one slip in this many. */
const CAREFUL_EVERY = 10;
/**
 * The end: the fire flares, the egg breaks and the flames go out, the little dragon hops out of the
 * hearth to Tapko's right and says hello, Tapko cheers; then the level ends.
 */
const FLARE_AT = 0;
const BREAK_AT = 0.8;
const OUT_S = 0.9;
const HOP_AT = 1.4;
const HOP_S = 0.8;
const HOP_UP = 110;
const CHEER_AT = 2.9;
const END_AT = 3.9;
/** Where the little dragon lands: this far right of Tapko, a little in front of him. */
const LAND_DX = 95;
const LAND_DY = 16;
/** The flames grow with the spell from this glow; the egg cracks at half, and cracks open at three quarters. */
const GLOW_START = 0.12;
const CRACK_AT = 0.5;
const CRACKING_AT = 0.75;

/** The dragons' hearth while its picture is missing: a ring of old carved stones. */
function hearthFallback(g: G, _w: number, h: number): void {
  const rx = h * 0.95, ry = h * 0.28, cy = h * 0.18;
  g.save();
  g.fillStyle = '#4a3d36';
  g.beginPath();
  g.ellipse(0, cy, rx * 0.8, ry * 0.75, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(60,50,45,0.7)';
  g.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2, x = Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    g.fillStyle = i % 2 ? '#a39a8f' : '#8f867c';
    g.beginPath();
    g.roundRect(x - h * 0.13, y - h * 0.16, h * 0.26, h * 0.24, h * 0.05);
    g.fill();
    g.stroke();
    // A carved rune.
    g.beginPath();
    g.moveTo(x - h * 0.04, y - h * 0.09);
    g.lineTo(x + h * 0.04, y - h * 0.02);
    g.lineTo(x - h * 0.03, y + h * 0.03);
    g.stroke();
  }
  g.restore();
}
const HEARTH: PitLook = { pic: 'obj-hearth', fallback: hearthFallback };

/** The spell's area on a stage `vw` wide: the right half, the right two thirds on a narrow stage, never over Tapko. */
export function spellArea(vw: number): { x: number; w: number } {
  const x = Math.max(vw < NARROW * VH ? vw / 3 : vw / 2, HERO_X + TAPKO_H * 0.45);
  return { x, w: vw - SPELL_MARGIN - x };
}

/**
 * Egg 5, the spell of awakening (the super level, the first ribbon): Tapko lays the egg into the
 * dragons' hearth just right of him, then types one long spell from an endless ribbon, spaces and
 * periods too; what he has written fills a stone frame under it, both in the right part of the
 * stage. A slip starts the word in progress again and adds one word to the spell right after it
 * (the minimum grows with it, at most `GROW_MAX` words). Each sentence makes the fire grow; the egg
 * glows and cracks, and at the end it hatches, the flames go out and the little dragon hops out to
 * Tapko.
 */
export class SpellRibbonMode extends HeroMode {
  readonly world = 'egg';
  readonly pictures = ['obj-hearth', ...FLAMES, 'obj-egg-plain', 'obj-egg-glow', 'obj-egg-cracking', ...LITTLE_DRAGON_PICTURES];
  private ribbon: Ribbon;
  /** The most words ever written (the progress). */
  private best = 0;
  private hearth: Firepit;
  /** The words slips added to the spell. */
  private detour: Detour;
  /** Seconds since the egg left his back (-1 before play); the spell starts when it lies in the hearth. */
  private lay = -1;
  private spellOn = false;
  /** The share of the spell written, as the hearth shows it: it never goes back. */
  private warmth = 0;
  /** Seconds of the egg's wobble after a sentence. */
  private wobble = 0;
  private slips = 0;
  private endT: number | null = null;
  private helloSaid = false;
  private cheered = false;

  constructor(L: LevelRuntime) {
    super(L);
    this.hearth = new Firepit(L, HERO_X + HEARTH_DX, HEARTH_H, FEET + 6, HEARTH).burn(GLOW_START);
    this.detour = new Detour(GROW_MAX, secondsPerWord(L));
    this.ribbon = new Ribbon(L, spellArea);
  }

  startLine(): string {
    return pickLine('story.awakeningStart');
  }

  start(): void {
    this.heroX = HERO_X;
    this.heroY = FEET;
    this.lay = 0;
    if (this.L.reduceMotion) this.lay = LAY_S;
  }

  /** The next sentence of 4-6 known words, ending with a period when the period is known; false when it came empty. */
  private sentence(): boolean {
    const list = this.L.word(undefined, 6, 4).replace(ENTER, '').split(' ').filter(Boolean);
    list.forEach((w, i) => this.ribbon.words.push(this.ribbon.word(w, i === list.length - 1)));
    return list.length > 0;
  }

  /** The spell needs more: either minimum is not met yet. */
  private get more(): boolean {
    return this.L.minLeft > 0 || this.ribbon.words.length < this.L.count;
  }

  /** The word at `at` becomes the target: with its space, unless it ends the spell. The next word is always there to read. */
  private target(): void {
    const r = this.ribbon;
    while (r.at + 1 >= r.words.length && this.more && this.sentence());
    const w = r.words[r.at];
    if (!w) return;
    const end = r.at === r.words.length - 1 && !this.more;
    r.current = this.L.core.add(end ? w.text : `${w.text} `, {});
  }

  private get spellDone(): boolean {
    return this.ribbon.at >= this.ribbon.words.length && !this.more;
  }

  onDone(tg: Target): void {
    const r = this.ribbon;
    if (tg !== r.current) return;
    this.L.core.prune();
    const w = r.words[r.at];
    r.at++;
    this.best = Math.max(this.best, r.at);
    if (w.last) {
      this.wobble = 0.8;
      this.hearth.sparkle(16);
      this.L.sfx('pop');
    }
    r.current = null;
    if (this.spellDone) return this.end();
    this.target();
  }

  /** A slip starts the word in progress again and adds a word to the spell after it; nothing written is lost. */
  onWrong(tg: Target | null): void {
    super.onWrong(tg);
    if (!tg || tg !== this.ribbon.current || this.endT !== null) return;
    this.L.core.release(tg, false);
    this.L.core.prune();
    this.ribbon.current = null;
    this.ribbon.erase(tg.word.slice(0, tg.typed));
    this.grow();
    this.L.sfx('whoosh');
    if (!this.slips++) this.L.say(t('story.spellSlip'), 3);
    else if (this.L.rng.int(1, CAREFUL_EVERY) === 1) this.L.say(t('story.spellCareful'), 2.5);
    this.target();
  }

  /** One word more right after the word in progress, a word of the spell's own kind; the minimum grows by its share. */
  private grow(): void {
    if (!lengthen(this.L, this.detour, 1)) return;
    const list = this.L.word(undefined, 6, 4).replace(ENTER, '').split(' ').filter(Boolean);
    // A word from inside a sentence: no capital, no period.
    const pool = list.length > 2 ? list.slice(1, -1) : list;
    this.ribbon.words.splice(this.ribbon.at + 1, 0, this.ribbon.word(this.L.rng.pick(pool), false));
  }

  /** The spell is said: the fire flares up, the egg breaks and the little dragon comes out. */
  private end(): void {
    this.endT = 0;
    this.happy();
  }

  pawMay(): boolean {
    return this.spellOn;
  }

  update(dt: number): void {
    super.update(dt);
    const L = this.L;
    if (this.lay >= 0 && !this.spellOn && (this.lay += dt) >= LAY_S) {
      this.spellOn = true;
      L.sfx('pop');
      this.target();
    }
    this.warmth = Math.max(this.warmth, Math.min(1, L.share()));
    // Weak low flames at first; they come one by one and grow with the spell.
    this.hearth.glow = GLOW_START + (1 - GLOW_START) * this.warmth;
    this.hearth.growth = this.warmth;
    this.hearth.update(dt);
    this.wobble = Math.max(0, this.wobble - dt);
    this.ribbon.update(dt);
    if (this.endT !== null) this.updateEnd(dt);
  }

  private updateEnd(dt: number): void {
    const L = this.L, was = this.endT!, now = (this.endT = was + dt);
    const at = (s: number) => was < s && now >= s;
    if (at(FLARE_AT)) {
      this.hearth.sparkle(40);
      L.tweens.add(L.reduceMotion ? 0.01 : 0.6, (k) => { this.hearth.flare = k * 0.6; }, ease.outCubic);
    }
    if (at(BREAK_AT)) {
      // The shell breaks and the flames go out, leaving a cold hearth and a curl of smoke.
      L.sfx('pop');
      L.particles.emit(this.hearth.x, this.eggY() - EGG_IN / 2, 18, 'dot', ['#fbf1dc', '#6cc7c0', '#ffffff'], 160, 8);
      L.tweens.add(L.reduceMotion ? 0.01 : 0.5, (k) => { this.hearth.flare = 0.6 * (1 - k); }, ease.inOutQuad);
      this.hearth.fade = L.reduceMotion ? 0.01 : OUT_S;
      this.hearth.litTo = 0;
    }
    if (at(HOP_AT + HOP_S) && !this.helloSaid) {
      this.helloSaid = true;
      L.sfx('pop');
      const land = this.landSpot();
      L.shout(t('story.spellHello'), land.x, land.y - LITTLE_H - 30);
    }
    if (at(CHEER_AT) && !this.cheered) {
      this.cheered = true;
      L.hooray();
    }
  }

  /** The egg's foot in the hearth. */
  private eggY(): number {
    return FEET + 6 - HEARTH_H * 0.42;
  }

  /** Where the little dragon lands: on Tapko's right, a little in front of him. */
  private landSpot(): { x: number; y: number } {
    return { x: HERO_X + LAND_DX, y: FEET + LAND_DY };
  }

  /** While he lays it into the hearth the egg flies off his back; before and after it is not on him. */
  protected heroExtras() {
    return this.lay < 0 ? { carry: 'egg' as const } : {};
  }

  progress(): number {
    if (this.spellDone) return 1;
    return this.best / Math.max(this.L.count, this.ribbon.words.length);
  }

  get finished(): boolean {
    return (this.endT ?? 0) > END_AT;
  }

  render(g: G): void {
    // The egg lies in the hearth in front of its flames, so they never hide it; the little dragon hops out in front of Tapko.
    this.hearth.draw(g);
    const out = this.endT !== null && this.endT >= HOP_AT;
    if (!out) this.drawEgg(g);
    this.drawHero(g);
    if (out) this.drawHatched(g);
    if (this.lay >= 0 && this.lay < LAY_S) this.drawLaying(g);
    if (this.spellOn) this.ribbon.draw(g, this.endT === null);
  }

  /** The egg on its way from his back into the hearth, in a short arc. */
  private drawLaying(g: G): void {
    const from = eggSpot(app.profile!.companion, this.heroX, this.heroY, TAPKO_H);
    const k = ease.inOutQuad(Math.min(1, this.lay / LAY_S)), x = from.x + (this.hearth.x - from.x) * k;
    const y0 = from.y, y1 = this.eggY() - EGG_IN / 2, y = y0 + (y1 - y0) * k - Math.sin(Math.PI * k) * 120;
    drawSprite(g, 'obj-egg-plain', x, y, from.h + (EGG_IN - from.h) * k, { rot: from.rot * (1 - k) }, eggFallback);
  }

  /** The egg in the hearth: it glows warmer with the spell, cracks at half, cracks open at three quarters, and hatches at the end. */
  private drawEgg(g: G): void {
    if (this.lay < LAY_S && !this.spellOn) return;
    const x = this.hearth.x, y = this.eggY();
    if (this.endT !== null && this.endT >= BREAK_AT) {
      // Out of its shell, the little dragon stands up in the hearth.
      const k = this.L.reduceMotion ? 1 : ease.outBack(Math.min(1, (this.endT - BREAK_AT) / 0.4));
      drawSprite(g, 'obj-dragon-hatched', x, y + 8, HATCHED_H * k, { ay: 1 }, littleDragonFallback);
      return;
    }
    const rot = this.L.reduceMotion ? 0 : Math.sin(this.wobble * 18) * 0.12 * this.wobble;
    const pic = this.warmth >= CRACKING_AT ? 'obj-egg-cracking' : 'obj-egg-plain';
    drawSprite(g, pic, x, y, EGG_IN, { ay: 1, rot }, eggFallback);
    if (this.warmth < CRACKING_AT) drawSprite(g, 'obj-egg-glow', x, y, EGG_IN, { ay: 1, rot, alpha: this.warmth }, eggFallback);
    if (this.warmth >= CRACK_AT && this.warmth < CRACKING_AT) {
      // The first crack: a small zigzag on its shell.
      g.save();
      g.translate(x, y - EGG_IN * 0.55);
      g.rotate(rot);
      g.strokeStyle = '#6d5040';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-EGG_IN * 0.18, -EGG_IN * 0.05);
      g.lineTo(-EGG_IN * 0.06, EGG_IN * 0.04);
      g.lineTo(EGG_IN * 0.03, -EGG_IN * 0.06);
      g.lineTo(EGG_IN * 0.14, EGG_IN * 0.03);
      g.stroke();
      g.restore();
    }
  }

  /** The little dragon, out of its shell, hops out of the cold hearth in an arc and lands on Tapko's right, where it stays. */
  private drawHatched(g: G): void {
    const e = this.endT!, k = this.L.reduceMotion ? 1 : Math.min(1, (e - HOP_AT) / HOP_S), to = this.landSpot();
    if (k >= 1) return drawLittleDragon(g, 'happy', to.x, to.y, LITTLE_H, this.t, 0, !this.L.reduceMotion);
    const m = ease.inOutQuad(k), from = { x: this.hearth.x, y: this.eggY() + 8 };
    const x = from.x + (to.x - from.x) * m, y = from.y + (to.y - from.y) * m - Math.sin(Math.PI * k) * HOP_UP;
    drawSprite(g, littleDragonImage(), x, y, LITTLE_H, { ay: 1 }, littleDragonFallback);
  }
}
