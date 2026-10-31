import { app, pickLine } from '../../app/app';
import { graphics } from '../../engine/graphics';
import { ease } from '../../engine/tween';
import { WORD, drawSprite, fontFamily, type G, roundRect } from '../../gfx/draw';
import { eggFallback, eggSpot } from '../../gfx/tapko';
import { t } from '../../i18n/i18n';
import { ENTER } from '../../keyboard/layouts';
import { TAPKO_H } from '../mode';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { FLAMES, Firepit, PIT_RATIO, type PitLook } from './dragons';
import { HeroMode, PATH_FEET } from './kit/hero';

const FEET = PATH_FEET;
const HERO_X = 200;
/** The dragons' hearth on the right: its place (a share of the stage), its height, and the egg in it. */
const HEARTH_AT = 0.78;
const HEARTH_H = 112;
const EGG_IN = 64;
const HATCHED_H = 96;
/** Seconds Tapko takes to lay the egg off his back into the hearth before the first word shows. */
const LAY_S = 1;

/** The ribbon: its middle's height, its size, its letters, where the next letter stays (a share of its width) and how far it fades at each end. */
const RIBBON_Y = 84;
const RIBBON_H = 66;
const RIBBON_W = 780;
const RIBBON_SIZE = 40;
const RIBBON_AT = 0.42;
const RIBBON_FADE = 0.2;
/** A word not in progress shows faint on the ribbon. */
const FAINT = 0.35;
/** The spell frame: its lines (at most three show), their letters and the room round them. */
const LINES = 3;
const LINE_H = 44;
const TEXT_SIZE = 28;
const FRAME_PAD = 26;
const FRAME_GAP = 26;
/** Seconds an erased word fades back out of the frame. */
const ERASE_S = 0.4;
/** After the first slip's line, the reminder comes with about one slip in this many. */
const CAREFUL_EVERY = 10;
/** The end: the fire flares, the egg breaks, the baby says hello and Tapko cheers; then the level ends. */
const FLARE_AT = 0;
const BREAK_AT = 0.8;
const HELLO_AT = 1.3;
const CHEER_AT = 2.4;
const END_AT = 3.8;
/** The flames grow with the spell from this glow; the egg cracks at half, and cracks open at three quarters. */
const GLOW_START = 0.12;
const CRACK_AT = 0.5;
const CRACKING_AT = 0.75;

/**
 * Where the spell goes on after a slip at word `at`: the word in progress always goes, and the last
 * written word with it, unless the last rewind (`anchor`) was fewer than two words back; the rewind
 * then sits where the erased word began.
 */
export function slipBack(at: number, anchor: number | null): { at: number; anchor: number | null } {
  if (at > 0 && (anchor === null || at - anchor >= 2)) return { at: at - 1, anchor: at - 1 };
  return { at, anchor };
}

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

/** A baby dragon while its picture is missing. */
function hatchedFallback(g: G, w: number, h: number): void {
  g.save();
  g.fillStyle = '#8fd6b0';
  g.strokeStyle = '#3d6b55';
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(0, h * 0.15, w * 0.35, h * 0.32, 0, 0, Math.PI * 2);
  g.ellipse(0, -h * 0.25, w * 0.28, h * 0.22, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.restore();
}

/** A word of the spell: its text with the space after it (the last word ends without), and its target while it is the one to type. */
interface SpellWord {
  text: string;
  /** Its sentence ends with it. */
  last: boolean;
}

/**
 * Egg 5, the spell of awakening (the super level, the first ribbon): Tapko lays the egg into the
 * dragons' hearth on the summit, then types one long spell from an endless ribbon, spaces and
 * periods too; what he has written fills a stone frame. A slip erases the word in progress and the
 * last written word, and the ribbon rewinds to it (`slipBack`). Each sentence makes the fire grow;
 * the egg glows, cracks and at the end hatches.
 */
export class SpellRibbonMode extends HeroMode {
  readonly world = 'egg';
  readonly pictures = ['obj-hearth', ...FLAMES, 'obj-egg-plain', 'obj-egg-glow', 'obj-egg-cracking', 'obj-dragon-hatched'];
  private words: SpellWord[] = [];
  /** The word to type, the most words ever written (the progress), and the last rewind's place. */
  private at = 0;
  private best = 0;
  private anchor: number | null = null;
  private current: Target | null = null;
  private hearth: Firepit;
  /** Seconds since the egg left his back (-1 before play); the spell starts when it lies in the hearth. */
  private lay = -1;
  private spellOn = false;
  /** The share of the spell written, as the hearth shows it: it never goes back. */
  private warmth = 0;
  /** Seconds of the egg's wobble after a sentence. */
  private wobble = 0;
  /** Erased letters fading out of the frame: the text, where it starts in the frame's text, seconds since. */
  private ghost: { text: string; from: number; t: number } | null = null;
  /** The ribbon's position (pixels along the spell) and the frame's scroll (pixels up). */
  private ribbonX = 0;
  private frameUp = 0;
  private slips = 0;
  private endT: number | null = null;
  private helloSaid = false;
  private cheered = false;

  constructor(L: LevelRuntime) {
    super(L);
    this.hearth = new Firepit(L, 0, HEARTH_H, FEET + 6, HEARTH).burn(GLOW_START);
  }

  startLine(): string {
    return pickLine('story.spellStart');
  }

  start(): void {
    this.heroX = HERO_X;
    this.heroY = FEET;
    this.hearth.x = this.L.vw * HEARTH_AT;
    this.lay = 0;
    if (this.L.reduceMotion) this.lay = LAY_S;
  }

  /** The next sentence of 4-6 known words, ending with a period when the period is known. */
  private sentence(): void {
    const s = this.L.word(undefined, 6, 4).replace(ENTER, '');
    const list = s.split(' ').filter(Boolean);
    list.forEach((w, i) => this.words.push({ text: w, last: i === list.length - 1 }));
  }

  /** The spell needs more: either minimum is not met yet. */
  private get more(): boolean {
    return this.L.minLeft > 0 || this.words.length < this.L.count;
  }

  /** The word at `at` becomes the target: with its space, unless it ends the spell. */
  private target(): void {
    if (this.at >= this.words.length && this.more) this.sentence();
    const w = this.words[this.at];
    if (!w) return;
    // Its sentence's last word leads into the next one, as long as the spell needs more.
    const end = w.last && this.at === this.words.length - 1 && !this.more;
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
    if (this.at >= this.words.length && !this.more) return this.end();
    this.target();
  }

  /** A slip erases the word in progress and, by `slipBack`, the last written word; the ribbon rewinds. */
  onWrong(tg: Target | null): void {
    super.onWrong(tg);
    if (!tg || tg !== this.current || this.endT !== null) return;
    const before = this.frameText();
    const back = slipBack(this.at, this.anchor);
    this.at = back.at;
    this.anchor = back.anchor;
    this.L.core.release(tg, false);
    this.L.core.prune();
    this.current = null;
    const kept = this.written(this.at);
    if (before.length > kept.length) this.ghost = { text: before.slice(kept.length), from: kept.length, t: 0 };
    this.L.sfx('whoosh');
    if (!this.slips++) this.L.say(t('story.spellSlip'), 3);
    else if (this.L.rng.int(1, CAREFUL_EVERY) === 1) this.L.say(t('story.spellCareful'), 2.5);
    this.target();
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

  /** The spell is said: the fire flares up, the egg breaks and the baby dragon sits in the hearth. */
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
    this.hearth.x = L.vw * HEARTH_AT;
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
      L.sfx('pop');
      L.particles.emit(this.hearth.x, this.eggY() - EGG_IN / 2, 18, 'dot', ['#fbf1dc', '#6cc7c0', '#ffffff'], 160, 8);
      L.tweens.add(L.reduceMotion ? 0.01 : 0.8, (k) => { this.hearth.flare = 0.6 * (1 - k); }, ease.inOutQuad);
    }
    if (at(HELLO_AT) && !this.helloSaid) {
      this.helloSaid = true;
      L.shout(t('story.spellHello'), this.hearth.x, this.eggY() - HATCHED_H - 40);
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
    // The egg lies in the hearth in front of its flames, so they never hide it.
    this.hearth.draw(g);
    this.drawEgg(g);
    this.drawHero(g);
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
      const k = this.L.reduceMotion ? 1 : ease.outBack(Math.min(1, (this.endT - BREAK_AT) / 0.5));
      drawSprite(g, 'obj-dragon-hatched', x, y + 8, HATCHED_H * k, { ay: 1 }, hatchedFallback);
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

  /** The ribbon's box, centred at the top, narrower on a narrow stage. */
  private ribbonBox(): { x: number; w: number } {
    const w = Math.min(RIBBON_W, this.L.vw - 120);
    return { x: (this.L.vw - w) / 2, w };
  }

  /**
   * The ribbon: the previous word faint, the word to type with its typed letters marked, the next
   * word faint, fading out at both ends. It slides letter by letter, so the next letter stays at the
   * same point; a space is a gap that lights up when it is the key to type.
   */
  private drawRibbon(g: G): void {
    const tg = this.current;
    const box = this.ribbonBox(), size = RIBBON_SIZE, top = RIBBON_Y - RIBBON_H / 2;
    g.save();
    g.font = `600 ${size}px ${fontFamily()}`;
    const space = size * 0.5;
    const width = (w: string) => g.measureText(w).width + space;
    // Pixels along the spell to each word's start, and to the next letter.
    const starts: number[] = [];
    let x = 0;
    for (let i = 0; i <= Math.min(this.words.length - 1, this.at + 1); i++) {
      starts.push(x);
      x += width(this.words[i].text);
    }
    const word = this.words[this.at];
    const typed = tg && word ? Math.min(tg.typed, word.text.length) : 0;
    const aim = (starts[this.at] ?? x) + (word ? g.measureText(word.text.slice(0, typed)).width + (tg && tg.typed > word.text.length ? space : 0) : 0);
    this.ribbonX = this.L.reduceMotion ? aim : this.ribbonX + (aim - this.ribbonX) * Math.min(1, 0.25);
    if (!graphics.simple) {
      g.shadowColor = 'rgba(40,30,20,0.25)';
      g.shadowBlur = 8;
      g.shadowOffsetY = 3;
    }
    g.fillStyle = this.L.highContrast ? '#ffffff' : WORD.plate;
    roundRect(g, box.x, top, box.w, RIBBON_H, RIBBON_H / 2);
    g.fill();
    g.shadowColor = 'transparent';
    g.lineWidth = 4;
    g.strokeStyle = '#ffb23e';
    g.stroke();
    g.save();
    roundRect(g, box.x, top, box.w, RIBBON_H, RIBBON_H / 2);
    g.clip();
    const origin = box.x + box.w * RIBBON_AT - this.ribbonX;
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    for (let i = Math.max(0, this.at - 1); i < starts.length; i++) {
      const w = this.words[i], wx = origin + starts[i], now = i === this.at;
      g.globalAlpha = now ? 1 : FAINT;
      if (now && tg && !this.L.core.letters(tg)) {
        // A hidden word (dictation, memory) shows dots for the letters still to type.
        g.fillStyle = WORD.ink;
        let cx = wx;
        [...w.text].forEach((ch, k) => {
          const cw = g.measureText(ch).width;
          if (k < typed) {
            g.fillStyle = WORD.typed;
            g.fillText(ch, cx, RIBBON_Y + 2);
          } else {
            g.fillStyle = WORD.ink;
            g.beginPath();
            g.arc(cx + cw / 2, RIBBON_Y + 2, size * 0.12, 0, Math.PI * 2);
            g.fill();
          }
          cx += cw;
        });
      } else if (now) {
        const head = w.text.slice(0, typed), hw = g.measureText(head).width;
        g.fillStyle = this.L.highContrast ? '#006b2e' : WORD.typed;
        g.fillText(head, wx, RIBBON_Y + 2);
        if (typed < w.text.length) {
          const ch = w.text[typed], cw = g.measureText(ch).width;
          g.fillStyle = this.L.highContrast ? '#ffe066' : WORD.next;
          roundRect(g, wx + hw - size * 0.04, RIBBON_Y - size * 0.62, cw + size * 0.08, size * 1.24, size * 0.2);
          g.fill();
          g.fillStyle = WORD.nextInk;
          g.fillText(ch, wx + hw, RIBBON_Y + 2);
          g.fillStyle = this.L.highContrast ? '#000' : WORD.ink;
          g.fillText(w.text.slice(typed + 1), wx + hw + cw, RIBBON_Y + 2);
        }
      } else {
        g.fillStyle = this.L.highContrast ? '#000' : WORD.ink;
        g.fillText(w.text, wx, RIBBON_Y + 2);
      }
      // The space after it: a gap with a soft pill, lit when it is the key to type.
      const sx = wx + g.measureText(w.text).width, lit = now && !!tg && typed >= w.text.length;
      g.globalAlpha = lit ? 1 : FAINT * 0.7;
      g.fillStyle = lit ? WORD.next : 'rgba(90,61,43,0.25)';
      roundRect(g, sx + space * 0.12, RIBBON_Y - size * 0.3, space * 0.76, size * 0.6, size * 0.2);
      g.fill();
    }
    g.restore();
    // It fades out at both ends.
    g.globalAlpha = 1;
    for (const [from, to] of [[box.x, box.x + box.w * RIBBON_FADE], [box.x + box.w, box.x + box.w * (1 - RIBBON_FADE)]]) {
      const fade = g.createLinearGradient(from, 0, to, 0);
      fade.addColorStop(0, this.L.highContrast ? '#ffffff' : 'rgba(255,253,246,1)');
      fade.addColorStop(1, 'rgba(255,253,246,0)');
      g.fillStyle = fade;
      g.fillRect(Math.min(from, to), top + 3, Math.abs(to - from), RIBBON_H - 6);
    }
    g.restore();
  }

  /** The frame's box: between the ribbon and the ground, clear of Tapko and the hearth. */
  private frameBox(): { x: number; y: number; w: number; h: number } {
    const left = HERO_X + TAPKO_H * 0.55, right = this.hearth.x - (HEARTH_H * PIT_RATIO) / 2 - FRAME_GAP;
    return { x: left, y: RIBBON_Y + RIBBON_H / 2 + FRAME_GAP, w: Math.max(240, right - left), h: LINES * LINE_H + FRAME_PAD * 2 };
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
   * erased letters fade back out.
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
    const aimUp = Math.max(0, lines.length - LINES) * LINE_H;
    this.frameUp = this.L.reduceMotion ? aimUp : this.frameUp + (aimUp - this.frameUp) * 0.15;
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
