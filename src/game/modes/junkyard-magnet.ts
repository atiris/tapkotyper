import { pickLine } from '../../app/app';
import { ease } from '../../engine/tween';
import { drawSprite, wordBox, type G } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import type { Target } from '../typing';
import { type Ask, EASIER_AFTER, askWord, easierAsk } from './kit/ask';
import { HeroMode } from './kit/hero';
import { CHAIN, JUNK_FEET, JUNK_HERO_X, MAGNET, drawChainMagnet, gearFallback } from './kit/junk';

const FEET = JUNK_FEET;
const HERO_X = JUNK_HERO_X;
const END_TIME = 3;

/** The ways a plate moves the magnet: a step left or right, or a lift up / a dip down and back. */
export type Dir = 'left' | 'right' | 'up' | 'down';
const DIRS: Dir[] = ['left', 'right', 'up', 'down'];
/** The magnet stands on one of five places: the centre (0), one or two steps left (negative) or right. */
export const EDGE = 2;

/**
 * The plates around the magnet at `place` and how hard each one's word is: at the centre the
 * sideways ones are easy and up and down (which keep it there) hard; one step off the way out is
 * tiny and the way back super hard; two steps off only the way back (hard) and up and down.
 */
export function platesAt(place: number): Partial<Record<Dir, Ask>> {
  const off = Math.abs(place);
  if (off === 0) return { left: 'easy', right: 'easy', up: 'twoLong', down: 'twoLong' };
  const back: Dir = place < 0 ? 'right' : 'left', away: Dir = place < 0 ? 'left' : 'right';
  if (off === 1) return { [away]: 'tiny', [back]: 'extreme', up: 'normal', down: 'normal' };
  return { [back]: 'twoLong', up: 'normal', down: 'normal' };
}

/** The magnet's place after typing `dir` at `place` (up and down keep it). */
export function moved(place: number, dir: Dir): number {
  const step = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
  return Math.max(-EDGE, Math.min(EDGE, place + step));
}

/** What the magnet pulls from the pile at a place: a big screw or a gear at the centre, a small screw one step off, nothing at the edge. */
export function pullAt(place: number): 'big' | 'small' | null {
  const off = Math.abs(place);
  return off === 0 ? 'big' : off === 1 ? 'small' : null;
}

/** The hint to steer back comes the first time at the edge and then every third time at most. */
export function hintAt(visit: number): boolean {
  return visit % 3 === 1;
}

/** Where each plate stands by its direction; at first every plate stands on its own side. */
export type Places = Record<Dir, Dir>;
export const OWN_PLACES: Places = { left: 'left', right: 'right', up: 'up', down: 'down' };

/**
 * The plates get mixed up at two thirds of the level and once more before its end (at two words
 * before it, and at least one move after the first time). `mixedAt`: the words done at each mix so far.
 */
export function mixDue(done: number, count: number, mixedAt: number[]): boolean {
  if (done >= count) return false;
  if (mixedAt.length === 0) return done >= Math.ceil((count * 2) / 3);
  if (mixedAt.length === 1) return done >= Math.max(mixedAt[0] + 1, count - 2);
  return false;
}

/** All orders of the four directions. */
function orders(list: Dir[]): Dir[][] {
  if (list.length <= 1) return [list];
  return list.flatMap((d, i) => orders([...list.slice(0, i), ...list.slice(i + 1)]).map((rest) => [d, ...rest]));
}

/** New places for the plates: none on its own side, none where it stood before. */
export function mixedPlaces(before: Places, pick: (list: Places[]) => Places): Places {
  const all = orders(DIRS).map((o) => Object.fromEntries(DIRS.map((d, i) => [d, o[i]])) as Places);
  return pick(all.filter((p) => DIRS.every((d) => p[d] !== d && p[d] !== before[d])));
}

/** The pile: its picture, height, width, and the magnet's step (a third of its width). */
const PILE = 'obj-screw-pile';
const PILE_H = 120;
const PILE_W = 300;
const STEP = PILE_W / 3;
/** The pile's middle is at least this far right of him, and this far from the stage's right edge at most. */
const PILE_FROM_HERO = 480;
const PILE_EDGE = 330;
/** The magnet's rest height (its middle), its size, and how far a lift or dip goes. */
const MAGNET_Y = 240;
const MAGNET_H = 100;
const NUDGE = 50;
/** Seconds of a step sideways and of a lift or dip and back. */
const MOVE_S = 0.6;
const NUDGE_S = 0.7;
/** The plates: their words sit this far from the magnet's middle, with a small arrow sign between. */
const SIDE_GAP = 80;
const UP_DY = 120;
const PLATE_SIZE = 34;
const ARROW_AT = 72;
/** The plates sit around the horseshoe's middle, a little below the picture's (its ring is on top). */
const BODY_DY = MAGNET_H * 0.1;
/** Seconds the plates swirl round the magnet to their mixed places, and how many turns a sign spins on the way. */
const MIX_S = 1.2;
const MIX_SPINS = 2;
/** A pulled piece: its flight up, the moment it sticks, its fade; the big and small pieces' pictures and sizes. */
const FLY_S = 0.5;
const STICK_S = 0.6;
const FADE_S = 0.4;
const BIG = ['obj-bolt', 'obj-gear'];
const BIG_H = 60;
const SMALL = 'obj-screw';
const SMALL_H = 36;
/** At the end the magnet rises out of sight with the last gear. */
const RISE = 360;
const RISE_S = 1.6;

interface Plate {
  dir: Dir;
  ask: Ask;
  tg: Target;
}

/** A piece pulled from the pile: flying up to the magnet, then stuck to it and fading. */
interface Piece {
  pic: string;
  size: number;
  age: number;
  /** Where on the pile it came from. */
  x: number;
  /** The last gear stays on the magnet as it rises. */
  last: boolean;
}

/** A small round metal sign with a dark arrow pointing `dir`, turned on by `spin` while it swirls. */
function drawArrowSign(g: G, x: number, y: number, dir: Dir, spin = 0): void {
  const r = 14, a = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[dir] + spin;
  g.save();
  g.translate(x, y);
  g.fillStyle = '#e2b033';
  g.strokeStyle = '#5a4a2a';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.rotate(a);
  g.fillStyle = '#3a2e1a';
  g.beginPath();
  g.moveTo(r * 0.65, 0);
  g.lineTo(-r * 0.1, -r * 0.55);
  g.lineTo(-r * 0.1, -r * 0.2);
  g.lineTo(-r * 0.6, -r * 0.2);
  g.lineTo(-r * 0.6, r * 0.2);
  g.lineTo(-r * 0.1, r * 0.2);
  g.lineTo(-r * 0.1, r * 0.55);
  g.closePath();
  g.fill();
  g.restore();
}

/** A low pile of screws, nuts and small gears while its picture is missing. */
function pileFallback(g: G, w: number, h: number): void {
  g.save();
  g.fillStyle = '#7d8590';
  g.strokeStyle = '#4f555d';
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(0, h / 2, w / 2, h * 0.85, 0, Math.PI, 0);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = '#b3bac3';
  for (const [dx, dy, r] of [[-0.3, 0.25, 8], [-0.1, -0.05, 10], [0.15, 0.1, 7], [0.32, 0.3, 9], [0, 0.3, 6]]) {
    g.beginPath();
    g.arc(dx * w, dy * h, r, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** A big screw while its picture is missing: a hex head on a threaded rod. */
function boltFallback(g: G, w: number, h: number): void {
  g.save();
  g.fillStyle = '#a9b1bb';
  g.strokeStyle = '#5f6670';
  g.lineWidth = 2;
  g.fillRect(-w * 0.1, -h * 0.2, w * 0.2, h * 0.7);
  g.strokeRect(-w * 0.1, -h * 0.2, w * 0.2, h * 0.7);
  g.fillRect(-w * 0.3, -h * 0.45, w * 0.6, h * 0.25);
  g.strokeRect(-w * 0.3, -h * 0.45, w * 0.6, h * 0.25);
  g.restore();
}

/**
 * Junkyard 3, the magnet over the screws (a crossroads): a magnet hangs from the crane's cable over
 * a pile of screws and gears, on one of five places. Arrow plates around it carry words; a typed
 * plate moves it a step left or right, or lifts it up or dips it down and back. After each move it
 * pulls from the pile: a big piece over the centre, a small screw one step off, nothing at the edge.
 * Two steps off, the level's clock stands still until the magnet comes back. At two thirds of the
 * level and once more before its end the plates swirl round the magnet to mixed places, none on its
 * own side, so the child reads the arrow, not the side.
 */
export class MagnetMode extends HeroMode {
  readonly world = 'junkyard';
  readonly tapkoFeet = FEET;
  readonly pictures = [PILE, MAGNET, CHAIN, ...BIG, SMALL];
  private place = 0;
  private places: Places = OWN_PLACES;
  /** The words done at each mix, the places before the last mix and 0..1 of its swirl (null when still). */
  private mixedAt: number[] = [];
  private mixFrom: Places = OWN_PLACES;
  private mixK: number | null = null;
  /** The magnet's offset now (stage units): sideways from its place's spot while it steps, up or down while it nudges. */
  private mx = 0;
  private my = 0;
  private plates: Plate[] = [];
  private pieces: Piece[] = [];
  private busy = false;
  private edgeVisits = 0;
  /** The plate whose word was slipped in, and how often. */
  private slipped: Target | null = null;
  private slips = 0;
  private endT: number | null = null;

  startLine(): string {
    return pickLine('story.magnetStart');
  }

  /** The pile's middle: in the middle of the stage, clear of him on a narrow one and of the right edge. */
  private get pileX(): number {
    return Math.min(this.L.vw - PILE_EDGE, Math.max(HERO_X + PILE_FROM_HERO, this.L.vw * 0.55));
  }

  private get magnetX(): number {
    return this.pileX + this.place * STEP + this.mx;
  }

  private get magnetY(): number {
    return MAGNET_Y + this.my;
  }

  /** The level's clock stands still while the magnet hangs at the edge (its words still count). */
  get clockHeld(): boolean {
    return this.endT === null && Math.abs(this.place) >= EDGE;
  }

  start(): void {
    this.heroX = HERO_X;
    this.heroY = FEET;
    this.showPlates();
  }

  /** The plates of the magnet's place, in random order, every word with its own first letter. */
  private showPlates(): void {
    const asks = platesAt(this.place), mix = mixDue(this.done, this.L.count, this.mixedAt);
    this.plates = [];
    for (const dir of this.L.rng.shuffle(DIRS.filter((d) => asks[d]))) {
      const ask = asks[dir]!;
      this.plates.push({ dir, ask, tg: this.L.core.add(this.plateWord(ask), {}, !mix) });
    }
    this.slipped = null;
    this.slips = 0;
    if (mix) this.mix();
  }

  /** The plates swirl round the magnet to new places; their words can be typed once they stand. */
  private mix(): void {
    this.mixedAt.push(this.done);
    this.mixFrom = this.places;
    this.places = mixedPlaces(this.places, (list) => this.L.rng.pick(list));
    this.mixK = 0;
    this.L.sfx('pop');
    this.L.tweens.add(this.L.reduceMotion ? 0.01 : MIX_S, (k) => { this.mixK = k; }, ease.inOutQuad, () => {
      this.mixK = null;
      for (const p of this.plates) p.tg.selectable = true;
    });
  }

  private plateWord(ask: Ask): string {
    let word = askWord(this.L, ask);
    for (let k = 0; k < 8 && this.L.core.active.some((o) => o.word[0] === word[0]); k++) word = askWord(this.L, ask);
    return word;
  }

  onDone(tg: Target): void {
    const plate = this.plates.find((p) => p.tg === tg);
    if (!plate) return;
    this.done++;
    this.happy();
    for (const p of this.plates) if (p !== plate) this.L.core.release(p.tg, false);
    this.plates = [];
    this.L.core.prune();
    this.move(plate.dir, () => {
      this.pull();
      if (this.done >= this.L.count) return this.end();
      if (Math.abs(this.place) >= EDGE && hintAt(++this.edgeVisits)) this.L.say(t('story.magnetBack'), 4);
      this.showPlates();
    });
  }

  /** A step sideways, or a lift up or a dip down and back. */
  private move(dir: Dir, then: () => void): void {
    this.busy = true;
    const done = () => {
      this.busy = false;
      then();
    };
    if (dir === 'up' || dir === 'down') {
      const dy = dir === 'up' ? -NUDGE : NUDGE;
      this.L.tweens.add(this.L.reduceMotion ? 0.01 : NUDGE_S, (k) => { this.my = Math.sin(k * Math.PI) * dy; }, ease.linear, () => {
        this.my = 0;
        done();
      });
      return;
    }
    const to = moved(this.place, dir), from = (this.place - to) * STEP;
    this.place = to;
    this.mx = from;
    this.L.tweens.add(this.L.reduceMotion ? 0.01 : MOVE_S, (k) => { this.mx = from * (1 - k); }, ease.inOutQuad, () => {
      this.mx = 0;
      done();
    });
  }

  /** The magnet pulls what its place gives; at the edge it only hums. */
  private pull(big = false): void {
    const kind = big ? 'big' : pullAt(this.place);
    if (!kind) {
      this.L.sfx('bzzt');
      return;
    }
    this.L.sfx('pop');
    const pic = kind === 'big' ? (big ? 'obj-gear' : this.L.rng.pick(BIG)) : SMALL;
    this.pieces.push({ pic, size: kind === 'big' ? BIG_H : SMALL_H, age: 0, x: this.magnetX, last: big });
  }

  /** The last plate: the magnet rises with a last big gear and he hops. */
  private end(): void {
    this.endT = 0;
    this.pull(true);
    this.happy();
    this.L.say(pickLine('story.magnetDone'), END_TIME);
    this.L.tweens.add(this.L.reduceMotion ? 0.01 : FLY_S + STICK_S * 0.5, () => {}, ease.linear, () => {
      this.L.tweens.add(this.L.reduceMotion ? 0.01 : RISE_S, (k) => { this.my = -RISE * k; }, ease.inQuad);
    });
    this.L.tweens.add(0.5, (k) => { this.jump = Math.sin(k * Math.PI) * 0.3; }, ease.linear, () => { this.jump = 0; });
  }

  onWrong(tg: Target | null): void {
    super.onWrong(tg);
    const plate = this.plates.find((p) => p.tg === tg);
    if (!plate || this.L.core.locked !== tg) return;
    if (this.slipped !== tg) {
      this.slipped = tg;
      this.slips = 0;
    }
    if (++this.slips < EASIER_AFTER) return;
    // Two slips in one plate's word: a call to slow down and a slightly easier word on it.
    this.L.core.release(plate.tg, false);
    this.L.core.prune();
    plate.ask = easierAsk(plate.ask);
    plate.tg = this.L.core.add(this.plateWord(plate.ask), {});
    this.slipped = null;
    this.slips = 0;
    const spot = this.heroSpot();
    this.L.shout(pickLine('story.roadCareful'), spot.x, spot.y);
  }

  update(dt: number): void {
    super.update(dt);
    if (this.endT !== null) this.endT += dt;
    for (const p of this.pieces) p.age += dt;
    // A piece follows the magnet until it fades; the last one rises with it.
    this.pieces = this.pieces.filter((p) => p.last || p.age < FLY_S + STICK_S + FADE_S);
  }

  /** A piece's spot now: from the pile's top up to the magnet's poles, then stuck there. */
  private pieceAt(p: Piece): { x: number; y: number; alpha: number } {
    const k = Math.min(1, p.age / FLY_S), stuckY = this.magnetY + MAGNET_H * 0.45 + p.size * 0.35;
    const fromY = FEET - PILE_H * 0.7;
    const x = p.x + (this.magnetX - p.x) * k, y = fromY + (stuckY - fromY) * ease.outCubic(k);
    const fade = p.last ? 0 : Math.max(0, (p.age - FLY_S - STICK_S) / FADE_S);
    return { x, y, alpha: 1 - Math.min(1, fade) };
  }

  render(g: G): void {
    drawSprite(g, PILE, this.pileX, FEET + 8, PILE_H, { ay: 1 }, pileFallback);
    for (const p of this.pieces) {
      const at = this.pieceAt(p);
      if (at.alpha <= 0) continue;
      g.save();
      g.globalAlpha *= at.alpha;
      drawSprite(g, p.pic, at.x, at.y, p.size, {}, p.pic === 'obj-gear' ? gearFallback('#e8b848', '#b8862e') : boltFallback);
      g.restore();
    }
    const x = this.magnetX, y = this.magnetY;
    // The chain hangs from above the magnet's place, so it swings a little while it steps.
    drawChainMagnet(g, x, y, MAGNET_H, this.pileX + this.place * STEP);
    this.drawHero(g);
    if (this.busy || this.endT !== null) return;
    for (const p of this.plates) this.drawPlate(g, p, x, y + BODY_DY);
  }

  /** Where a plate's sign and word sit at the place `at`, from the horseshoe's middle. */
  private spot(at: Dir, word: string): { sx: number; sy: number; lx: number; ly: number } {
    if (at === 'up' || at === 'down') {
      const s = at === 'up' ? -1 : 1;
      return { sx: 0, sy: s * ARROW_AT, lx: 0, ly: s * UP_DY };
    }
    const s = at === 'left' ? -1 : 1, w = wordBox(word, PLATE_SIZE, true).w;
    return { sx: s * ARROW_AT, sy: 0, lx: s * (SIDE_GAP + 20 + w / 2), ly: 0 };
  }

  /** A plate's arrow sign by the magnet and its word beyond it; while mixing both swirl round the magnet to the new place. */
  private drawPlate(g: G, p: Plate, x: number, y: number): void {
    const to = this.spot(this.places[p.dir], p.tg.word);
    if (this.mixK === null) {
      drawArrowSign(g, x + to.sx, y + to.sy, p.dir);
      this.L.label(g, p.tg, x + to.lx, y + to.ly, PLATE_SIZE);
      return;
    }
    const from = this.spot(this.mixFrom[p.dir], p.tg.word), k = this.mixK;
    // Round the magnet clockwise: the angle and the distance from its middle go from the old place to the new one.
    const swirl = (ax: number, ay: number, bx: number, by: number) => {
      const a0 = Math.atan2(ay, ax), a1 = a0 + ((((Math.atan2(by, bx) - a0) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
      const r = Math.hypot(ax, ay) + (Math.hypot(bx, by) - Math.hypot(ax, ay)) * k, a = a0 + (a1 - a0) * k;
      return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r };
    };
    const sign = swirl(from.sx, from.sy, to.sx, to.sy), word = swirl(from.lx, from.ly, to.lx, to.ly);
    drawArrowSign(g, sign.x, sign.y, p.dir, k * MIX_SPINS * Math.PI * 2);
    this.L.label(g, p.tg, word.x, word.y, PLATE_SIZE);
  }

  progress(): number {
    return this.done / this.L.count;
  }

  get finished(): boolean {
    return (this.endT ?? 0) > END_TIME;
  }
}
