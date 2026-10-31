import { app, pickLine } from '../../app/app';
import { graphics } from '../../engine/graphics';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { WORD, drawSprite, fontFamily, type G, roundRect } from '../../gfx/draw';
import { LITTLE_DRAGON_PICTURES, drawLittleDragon, littleDragonFallback, littleDragonImage } from '../../gfx/little-dragon';
import { eggFallback, eggSpot } from '../../gfx/tapko';
import { t } from '../../i18n/i18n';
import { ENTER } from '../../keyboard/layouts';
import { TAPKO_H } from '../mode';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { FLAMES, Firepit, type PitLook } from './dragons';
import { Detour, lengthen, secondsPerWord } from './kit/egg';
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
/** The ribbon: its middle's height, its size, its letters, and where the next letter stays (a share of its width). */
const RIBBON_Y = 84;
const RIBBON_H = 66;
const RIBBON_SIZE = 40;
const RIBBON_AT = 0.42;
/** Its ends fade out over its round end cap and a little more. */
const RIBBON_FADE = RIBBON_H / 2 + 10;
/** Seconds of the ribbon's ease toward where it should be: it glides, never snaps. */
const GLIDE_S = 0.25;
/** A new word slides in from this far right and fades in over these seconds. */
const APPEAR_DX = 40;
const APPEAR_S = 0.35;
/** Every word but the one in progress is grey. */
const GREY = '#8a8f98';
const GREY_HC = '#5a5f68';
/** The spell frame: its lines (at most three show), their letters and the room round them. */
const LINES = 3;
const LINE_H = 44;
const TEXT_SIZE = 28;
const FRAME_PAD = 26;
const FRAME_GAP = 26;
/** Seconds the letters of a restarted word fade back out of the frame. */
const ERASE_S = 0.4;
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

/** A word of the spell: its text (without the space after it) and its place on the ribbon. */
interface SpellWord {
  text: string;
  /** Its sentence ends with it. */
  last: boolean;
  /** When it came (the mode's clock): it fades in. */
  born: number;
  /** Its width, and its start along the spell (pixels), measured when it is drawn; NaN before. */
  w: number;
  start: number;
  /** Where it shows along the spell: it glides to its start, from a little further right when new. */
  x: number;
}

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
  private words: SpellWord[] = [];
  /** The word to type, and the most words ever written (the progress). */
  private at = 0;
  private best = 0;
  private current: Target | null = null;
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
  /** Letters of a restarted word fading out of the frame: the text, where it starts in the frame's text, seconds since. */
  private ghost: { text: string; from: number; t: number } | null = null;
  /** The ribbon's position (pixels along the spell) and the frame's scroll (pixels up), each gliding to its aim. */
  private ribbonX = 0;
  private ribbonAim = 0;
  private frameUp = 0;
  private frameAim = 0;
  /** The picture the ribbon's letters go into before its ends fade out. */
  private layer: HTMLCanvasElement | null = null;
  private slips = 0;
  private endT: number | null = null;
  private helloSaid = false;
  private cheered = false;

  constructor(L: LevelRuntime) {
    super(L);
    this.hearth = new Firepit(L, HERO_X + HEARTH_DX, HEARTH_H, FEET + 6, HEARTH).burn(GLOW_START);
    this.detour = new Detour(GROW_MAX, secondsPerWord(L));
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

  private spellWord(text: string, last: boolean): SpellWord {
    return { text, last, born: this.t, w: NaN, start: NaN, x: NaN };
  }

  /** The next sentence of 4-6 known words, ending with a period when the period is known; false when it came empty. */
  private sentence(): boolean {
    const list = this.L.word(undefined, 6, 4).replace(ENTER, '').split(' ').filter(Boolean);
    list.forEach((w, i) => this.words.push(this.spellWord(w, i === list.length - 1)));
    return list.length > 0;
  }

  /** The spell needs more: either minimum is not met yet. */
  private get more(): boolean {
    return this.L.minLeft > 0 || this.words.length < this.L.count;
  }

  /** The word at `at` becomes the target: with its space, unless it ends the spell. The next word is always there to read. */
  private target(): void {
    while (this.at + 1 >= this.words.length && this.more && this.sentence());
    const w = this.words[this.at];
    if (!w) return;
    const end = this.at === this.words.length - 1 && !this.more;
    this.current = this.L.core.add(end ? w.text : `${w.text} `, {});
  }

  private get spellDone(): boolean {
    return this.at >= this.words.length && !this.more;
  }

  onDone(tg: Target): void {
    if (tg !== this.current) return;
    this.L.core.prune();
    const w = this.words[this.at];
    this.at++;
    this.best = Math.max(this.best, this.at);
    if (w.last) {
      this.wobble = 0.8;
      this.hearth.sparkle(16);
      this.L.sfx('pop');
    }
    this.current = null;
    if (this.spellDone) return this.end();
    this.target();
  }

  /** A slip starts the word in progress again and adds a word to the spell after it; nothing written is lost. */
  onWrong(tg: Target | null): void {
    super.onWrong(tg);
    if (!tg || tg !== this.current || this.endT !== null) return;
    const typed = tg.word.slice(0, tg.typed);
    this.L.core.release(tg, false);
    this.L.core.prune();
    this.current = null;
    if (typed) this.ghost = { text: typed, from: this.written(this.at).length, t: 0 };
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
    this.words.splice(this.at + 1, 0, this.spellWord(this.L.rng.pick(pool), false));
  }

  /** The spell's first `n` words as the frame writes them. */
  private written(n: number): string {
    return this.words.slice(0, n).map((w) => `${w.text} `).join('');
  }

  /** What the frame shows: the written words and the letters of the word in progress. */
  private frameText(): string {
    const tg = this.current;
    return this.written(this.at) + (tg ? tg.word.slice(0, tg.typed) : '');
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
    if (this.ghost && (this.ghost.t += dt) >= ERASE_S) this.ghost = null;
    // The ribbon, its words and the frame glide to where they should be.
    const k = L.reduceMotion ? 1 : 1 - Math.exp(-dt / GLIDE_S);
    this.ribbonX += (this.ribbonAim - this.ribbonX) * k;
    this.frameUp += (this.frameAim - this.frameUp) * k;
    for (const w of this.words) if (!Number.isNaN(w.start)) w.x += (w.start - w.x) * k;
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
    return this.best / Math.max(this.L.count, this.words.length);
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
    if (!this.spellOn) return;
    this.drawRibbon(g);
    this.drawFrame(g);
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

  /**
   * Draws what `paint` draws inside the box (x, y, w, h) through a picture of its own whose left
   * and right ends fade out over `fade`, so nothing is ever cut off hard.
   */
  private faded(g: G, x: number, y: number, w: number, h: number, fade: number, paint: (to: G) => void): void {
    const m = g.getTransform(), res = Math.min(3, Math.hypot(m.a, m.b) || 1);
    const c = (this.layer ??= document.createElement('canvas')), pw = Math.ceil(w * res), ph = Math.ceil(h * res);
    if (c.width !== pw || c.height !== ph) {
      c.width = pw;
      c.height = ph;
    }
    const cg = c.getContext('2d')!;
    cg.setTransform(1, 0, 0, 1, 0, 0);
    cg.globalCompositeOperation = 'source-over';
    cg.globalAlpha = 1;
    cg.clearRect(0, 0, pw, ph);
    cg.setTransform(res, 0, 0, res, -x * res, -y * res);
    paint(cg);
    cg.setTransform(res, 0, 0, res, 0, 0);
    cg.globalAlpha = 1;
    cg.globalCompositeOperation = 'destination-in';
    const mask = cg.createLinearGradient(0, 0, w, 0), f = Math.min(0.5, fade / w);
    mask.addColorStop(0, 'rgba(0,0,0,0)');
    mask.addColorStop(f, '#000');
    mask.addColorStop(1 - f, '#000');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    cg.fillStyle = mask;
    cg.fillRect(0, 0, w, h);
    cg.globalCompositeOperation = 'source-over';
    g.drawImage(c, x, y, w, h);
  }

  /**
   * The ribbon: the word to type with its typed letters marked, every other word grey, its ends
   * fading out. It glides letter by letter, so the next letter stays near one point; a new word
   * slides in from the right. A space is a gap that lights up when it is the key to type.
   */
  private drawRibbon(g: G): void {
    const tg = this.current, hc = this.L.highContrast;
    const box = spellArea(this.L.vw), size = RIBBON_SIZE, top = RIBBON_Y - RIBBON_H / 2;
    const font = `600 ${size}px ${fontFamily()}`, space = size * 0.5;
    g.save();
    g.font = font;
    // Each word's start along the spell.
    let along = 0;
    for (const w of this.words) {
      if (Number.isNaN(w.w)) w.w = g.measureText(w.text).width;
      w.start = along;
      if (Number.isNaN(w.x)) w.x = along + (this.L.reduceMotion ? 0 : APPEAR_DX);
      along += w.w + space;
    }
    const word = this.words[this.at];
    const typed = tg && word ? Math.min(tg.typed, word.text.length) : 0;
    this.ribbonAim = word ? word.start + g.measureText(word.text.slice(0, typed)).width + (tg && tg.typed > word.text.length ? space : 0) : along;
    if (!graphics.simple) {
      g.shadowColor = 'rgba(40,30,20,0.25)';
      g.shadowBlur = 8;
      g.shadowOffsetY = 3;
    }
    g.fillStyle = hc ? '#ffffff' : WORD.plate;
    roundRect(g, box.x, top, box.w, RIBBON_H, RIBBON_H / 2);
    g.fill();
    g.shadowColor = 'transparent';
    g.lineWidth = 4;
    g.strokeStyle = '#ffb23e';
    g.stroke();
    g.restore();
    const origin = box.x + box.w * RIBBON_AT - this.ribbonX, grey = hc ? GREY_HC : GREY;
    this.faded(g, box.x, top, box.w, RIBBON_H, RIBBON_FADE, (cg) => {
      cg.font = font;
      cg.textBaseline = 'middle';
      cg.textAlign = 'left';
      this.words.forEach((w, i) => {
        const wx = origin + w.x, now = i === this.at;
        if (wx > box.x + box.w || wx + w.w + space < box.x) return;
        const shown = this.L.reduceMotion ? 1 : Math.min(1, (this.t - w.born) / APPEAR_S);
        cg.globalAlpha = shown;
        if (now && tg && !this.L.core.letters(tg)) {
          // A hidden word (dictation, memory) shows dots for the letters still to type.
          let cx = wx;
          [...w.text].forEach((ch, k) => {
            const cw = cg.measureText(ch).width;
            if (k < typed) {
              cg.fillStyle = WORD.typed;
              cg.fillText(ch, cx, RIBBON_Y + 2);
            } else {
              cg.fillStyle = WORD.ink;
              cg.beginPath();
              cg.arc(cx + cw / 2, RIBBON_Y + 2, size * 0.12, 0, Math.PI * 2);
              cg.fill();
            }
            cx += cw;
          });
        } else if (now) {
          const head = w.text.slice(0, typed), hw = cg.measureText(head).width;
          cg.fillStyle = hc ? '#006b2e' : WORD.typed;
          cg.fillText(head, wx, RIBBON_Y + 2);
          if (typed < w.text.length) {
            const ch = w.text[typed], cw = cg.measureText(ch).width;
            cg.fillStyle = hc ? '#ffe066' : WORD.next;
            roundRect(cg, wx + hw - size * 0.04, RIBBON_Y - size * 0.62, cw + size * 0.08, size * 1.24, size * 0.2);
            cg.fill();
            cg.fillStyle = WORD.nextInk;
            cg.fillText(ch, wx + hw, RIBBON_Y + 2);
            cg.fillStyle = hc ? '#000' : WORD.ink;
            cg.fillText(w.text.slice(typed + 1), wx + hw + cw, RIBBON_Y + 2);
          }
        } else {
          cg.fillStyle = grey;
          cg.fillText(w.text, wx, RIBBON_Y + 2);
        }
        // The space after it: a gap with a soft pill, lit when it is the key to type.
        const lit = now && !!tg && typed >= w.text.length;
        cg.globalAlpha = shown * (lit ? 1 : 0.3);
        cg.fillStyle = lit ? WORD.next : grey;
        roundRect(cg, wx + w.w + space * 0.12, RIBBON_Y - size * 0.3, space * 0.76, size * 0.6, size * 0.2);
        cg.fill();
      });
    });
  }

  /** The frame's box: right under the ribbon, as wide as it and from the same left edge. */
  private frameBox(): { x: number; y: number; w: number; h: number } {
    const area = spellArea(this.L.vw);
    return { x: area.x, y: RIBBON_Y + RIBBON_H / 2 + FRAME_GAP, w: area.w, h: LINES * LINE_H + FRAME_PAD * 2 };
  }

  /** `text` broken into lines that fit `width`, at whole words; each line keeps its start in the text. */
  private lines(g: G, text: string, width: number): { from: number; text: string }[] {
    const out: { from: number; text: string }[] = [];
    let from = 0, line = '';
    const re = /\S+\s*/g;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      if (line && g.measureText((line + m[0]).trimEnd()).width > width) {
        out.push({ from, text: line });
        from = m.index;
        line = '';
      }
      line += m[0];
    }
    out.push({ from, text: line });
    return out;
  }

  /**
   * The spell frame: a carved stone frame with a glowing rune stone in each corner; inside, what
   * the child has written with a blinking cursor. A full frame scrolls its oldest line up and away;
   * the letters of a restarted word fade back out.
   */
  private drawFrame(g: G): void {
    const b = this.frameBox(), shown = this.frameText(), ghost = this.ghost;
    const full = ghost && ghost.from + ghost.text.length > shown.length ? shown + ghost.text.slice(shown.length - ghost.from) : shown;
    g.save();
    // The stone frame.
    g.fillStyle = 'rgba(255,250,240,0.92)';
    roundRect(g, b.x, b.y, b.w, b.h, 18);
    g.fill();
    g.lineWidth = 10;
    g.strokeStyle = '#8d8478';
    g.stroke();
    g.lineWidth = 2;
    g.strokeStyle = '#6a6259';
    roundRect(g, b.x + 7, b.y + 7, b.w - 14, b.h - 14, 13);
    g.stroke();
    const pulse = this.L.reduceMotion ? 0.7 : 0.55 + 0.3 * Math.sin(this.t * 2.2);
    for (const [cx, cy] of [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]) this.drawRune(g, cx, cy, pulse);
    // The written spell, its last lines in view.
    g.font = `600 ${TEXT_SIZE}px ${fontFamily()}`;
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    const inner = b.w - FRAME_PAD * 2, lines = this.lines(g, full, inner);
    this.frameAim = Math.max(0, lines.length - LINES) * LINE_H;
    g.save();
    g.beginPath();
    // Only whole lines show: the one scrolling away leaves at the top of the text.
    g.rect(b.x + 8, b.y + FRAME_PAD - 4, b.w - 16, LINES * LINE_H + 8);
    g.clip();
    const fade = ghost ? 1 - ghost.t / ERASE_S : 0;
    let cursor: { x: number; y: number } | null = null;
    lines.forEach((ln, i) => {
      const y = b.y + FRAME_PAD + LINE_H * (i + 0.5) - this.frameUp;
      let x = b.x + FRAME_PAD;
      [...ln.text].forEach((ch, k) => {
        const at = ln.from + k, cw = g.measureText(ch).width;
        if (at === shown.length) cursor = { x, y };
        g.globalAlpha = at < shown.length ? 1 : fade;
        g.fillStyle = '#4a3a5c';
        if (g.globalAlpha > 0) g.fillText(ch, x, y);
        x += cw;
      });
      if (ln.from + ln.text.length === shown.length) cursor ??= { x, y };
    });
    if (!cursor) {
      const last = lines[lines.length - 1];
      cursor = { x: b.x + FRAME_PAD + g.measureText(last.text).width, y: b.y + FRAME_PAD + LINE_H * (lines.length - 0.5) - this.frameUp };
    }
    // The cursor blinks.
    if (this.endT === null && (this.L.reduceMotion || Math.sin(this.t * 6) > -0.2)) {
      const c = cursor as { x: number; y: number };
      g.globalAlpha = 1;
      g.fillStyle = '#4a3a5c';
      g.fillRect(c.x + 1, c.y - TEXT_SIZE * 0.55, 3, TEXT_SIZE * 1.1);
    }
    g.restore();
    g.restore();
  }

  /** A rune stone at a corner of the frame, glowing softly. */
  private drawRune(g: G, x: number, y: number, glow: number): void {
    const r = 15;
    g.save();
    if (!graphics.simple) {
      g.shadowColor = `rgba(110,220,230,${glow})`;
      g.shadowBlur = 14;
    }
    g.fillStyle = '#9a9187';
    g.beginPath();
    g.roundRect(x - r, y - r, r * 2, r * 2, 6);
    g.fill();
    g.shadowColor = 'transparent';
    g.strokeStyle = '#5f574f';
    g.lineWidth = 2;
    g.stroke();
    g.strokeStyle = `rgba(120,230,240,${0.5 + glow * 0.5})`;
    g.lineWidth = 2.5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x - 5, y - 7);
    g.lineTo(x + 5, y);
    g.lineTo(x - 5, y + 7);
    g.moveTo(x + 4, y - 7);
    g.lineTo(x + 4, y - 2);
    g.stroke();
    g.restore();
  }
}
