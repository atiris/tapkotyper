import { pickLine } from '../../app/app';
import { ease } from '../../engine/tween';
import { sprite } from '../../gfx/assets';
import { drawSprite, fontFamily, type G } from '../../gfx/draw';
import { t, tList } from '../../i18n/i18n';
import type { Target } from '../typing';
import { HeroMode, PATH_FEET, wordAbove } from './kit/hero';

/**
 * The kinds of path at a crossroads; each sets how the road goes on. `ask` is how hard its
 * activation word is, `len` and `diff` the words after it (unset: ordinary), `time` and `words`
 * scale the rest of the level, `leg` is how many words come before the next crossroads.
 */
export type PathKind = 'plain' | 'short' | 'fast' | 'teleport' | 'detour' | 'hard' | 'wide' | 'dark' | 'unknown' | 'practice';
type Ask = 'tiny' | 'easy' | 'normal' | 'two' | 'twoLong' | 'extreme';
export type Len = 'short' | 'normal' | 'long';
export type Diff = 'easy' | 'normal' | 'hard';

interface PathDef {
  ask: Ask;
  len?: Len;
  diff?: Diff;
  time: number;
  words: number;
  leg: number;
  /** Words come back (an echo), and one of the leg is extreme. */
  echo?: boolean;
  /** The words train the child's weak keys. */
  weak?: boolean;
}

export const PATHS: Record<PathKind, PathDef> = {
  plain: { ask: 'normal', time: 1, words: 1, leg: 4 },
  short: { ask: 'two', len: 'short', time: 0.9, words: 0.85, leg: 4 },
  fast: { ask: 'twoLong', len: 'short', time: 0.8, words: 0.8, leg: 3 },
  teleport: { ask: 'extreme', time: 0.6, words: 0.6, leg: 3 },
  detour: { ask: 'easy', time: 1.2, words: 1.25, leg: 4 },
  hard: { ask: 'tiny', diff: 'hard', time: 1.2, words: 1.25, leg: 4 },
  wide: { ask: 'two', diff: 'easy', time: 1, words: 1.1, leg: 6 },
  dark: { ask: 'normal', time: 0.85, words: 1, leg: 4, echo: true },
  unknown: { ask: 'normal', time: 1, words: 1, leg: 4 },
  practice: { ask: 'normal', time: 1, words: 1, leg: 4, weak: true },
};
const KINDS = Object.keys(PATHS) as PathKind[];

/** The road from a path on: its word length and difficulty, words per leg, echoes and weak keys. */
export interface Road {
  len: Len;
  diff: Diff;
  leg: number;
  echo: boolean;
  weak: boolean;
}

/** What the unknown path turned out to be: each of the three things drawn at random. */
export interface Unknown {
  len: 'short' | 'long';
  time: 'quick' | 'slow';
  diff: 'easy' | 'hard';
}

/** The road after taking `kind` (the unknown path with its draw). */
export function roadAfter(kind: PathKind, unknown?: Unknown): Road {
  const p = PATHS[kind];
  if (kind === 'unknown' && unknown) return { len: unknown.len, diff: unknown.diff, leg: 4, echo: false, weak: false };
  return { len: p.len ?? 'normal', diff: p.diff ?? 'normal', leg: p.leg, echo: !!p.echo, weak: !!p.weak };
}

/** How the rest of the level changes after `kind`: time and words scaled. */
export function scaleAfter(kind: PathKind, unknown?: Unknown): { time: number; words: number } {
  if (kind === 'unknown' && unknown) {
    const k = unknown.time === 'quick' ? 0.8 : 1.25;
    return { time: k, words: k };
  }
  return { time: PATHS[kind].time, words: PATHS[kind].words };
}

/** The longest word of the road's length. */
const LEN_MAX: Record<Len, number | undefined> = { short: 4, normal: 6, long: undefined };
/** Words in one target by difficulty: one, up to two, two or three. */
const DIFF_WORDS: Record<Diff, number> = { easy: 1, normal: 2, hard: 3 };

/** Five places from left to right; signposts of three heights (short, tall, middle by place), each its own picture. */
const SLOTS = 5;
const POSTS = [{ pic: 'obj-signpost-1', h: 170 }, { pic: 'obj-signpost-3', h: 370 }, { pic: 'obj-signpost-2', h: 270 }];
/**
 * Two long arrow boards (pointing right) carry the path's name: their height, where on the post they
 * are pinned by their middle (a share of its height from the foot), how far the name sits from the
 * middle toward the tail (the tip takes some of the board), and the room the tip and tail take.
 */
const ARROWS = ['obj-arrow-1', 'obj-arrow-2'];
const ARROW_H = 44;
const ARROW_AT = 0.6;
const ARROW_TEXT = 0.05;
const ARROW_ROOM = 1.6;
/** An arrow points anywhere but straight up or down, and its name stays easy to read: up to this far (radians) from the horizontal, to the right or the left. */
const ARROW_TURN = 0.6;
/** Seconds a post grows, the gap between posts coming (almost together), and of a vanishing one. */
const POST_GROW = 0.4;
const POST_STAGGER = 0.12;
const POST_GONE = 0.5;
/** The chosen sign's arrow spins this long and stops pointing up, then the sign waits a moment and goes last. */
const SPIN = 1;
const SPIN_HOLD = 0.35;
/** A step forward after a typed word: how far the view moves and its seconds. */
const STEP = 150;
const STEP_TIME = 0.6;
/** Seconds of his walk to the chosen sign per place, and the end. */
const WALK_PER_SLOT = 0.35;
const END_TIME = 1.8;
const NAME_SIZE = 22;
/** On a road his word floats well above his head, clear of the signposts' arrows. */
const ROAD_WORD_UP = 30;
/** He and the posts stand in the middle of the path. */
const FEET = PATH_FEET;
const NAME_INK = '#3a2614';
/** Most signs at once (five places, one is his); the first crossroads has three. */
const SIGNS_MAX = 4;
const SIGNS_FIRST = 3;

interface Sign {
  slot: number;
  kind: PathKind;
  name: string;
  tg: Target;
  /** Seconds since it started growing (negative: it waits for its turn). */
  age: number;
  /** Seconds since it started vanishing; null while it stands. */
  gone: number | null;
  /** Its arrow: which board, its turn off the horizontal, and whether it points left. */
  arrow: { pic: string; rot: number; left: boolean };
  /** Seconds since it was chosen (its arrow spins); null for the others. */
  spin: number | null;
}

/** An arrow board while its picture is missing. */
function arrowFallback(g: G, w: number, h: number): void {
  g.fillStyle = '#d8a86a';
  g.beginPath();
  g.moveTo(-w / 2, -h / 3);
  g.lineTo(w / 4, -h / 3);
  g.lineTo(w / 2, 0);
  g.lineTo(w / 4, h / 3);
  g.lineTo(-w / 2, h / 3);
  g.closePath();
  g.fill();
}

/** A post while its picture is missing. */
function postFallback(g: G, w: number, h: number): void {
  g.fillStyle = '#9b6b43';
  g.fillRect(-Math.min(w, 18) / 2, -h / 2, Math.min(w, 18), h);
}

/**
 * Planet 3, the crossroads: Tapko walks on, one word at a time above him (none can be skipped);
 * at a crossroads his word goes and signposts grow in the other places, each with its path's name
 * and activation word. A slip on a sign's word makes it vanish; the last one must be typed without
 * one. The typed path sets the road: word length and difficulty, more or fewer words and time.
 */
export class CrossroadsMode extends HeroMode {
  readonly pictures = [...POSTS.map((p) => p.pic), ...ARROWS];
  private slot = 0;
  private road: Road = roadAfter('plain');
  private legLeft = 3;
  private current: Target | null = null;
  private signs: Sign[] = [];
  /** The leg's extreme word comes at this word of the leg (dark forest), -1 none. */
  private extremeAt = -1;
  private echoes = 0;
  private crossings = 0;
  private busy = false;
  private signGoneSaid = false;
  private signLastSaid = false;
  private endT: number | null = null;

  startLine(): string {
    return pickLine('story.crossroadsStart');
  }

  private slotX(i: number): number {
    return this.L.vw * (0.1 + (0.8 * i) / (SLOTS - 1));
  }

  start(): void {
    this.heroY = FEET;
    this.heroX = this.slotX(this.slot);
    this.nextWord();
  }

  /** The word for the road, by its length and difficulty (or the child's weak keys). */
  private roadWord(): string {
    const r = this.road;
    const max = LEN_MAX[r.len];
    if (r.weak) return this.L.weakWord(max ?? 6);
    return this.L.word(max, DIFF_WORDS[r.diff], 2);
  }

  /** An activation word of the asked difficulty. */
  private askWord(ask: Ask): string {
    const w = (n: number) => this.L.word(n, 1);
    switch (ask) {
      case 'tiny': return w(2);
      case 'easy': return w(3);
      case 'normal': return w(5);
      case 'two': return `${w(5)} ${w(5)}`;
      case 'twoLong': return `${w(8)} ${w(8)}`;
      case 'extreme': return this.L.word(undefined, 4, 3);
    }
  }

  private nextWord(): void {
    if (this.done >= this.L.count) {
      this.endT = 0;
      this.happy();
      this.L.say(pickLine('story.roadEnd'), 3);
      return;
    }
    // A crossroads after each leg, while enough of the road is left.
    if (this.legLeft <= 0 && this.L.count - this.done > 2) return this.crossroads();
    const prev = this.current?.word;
    let word: string;
    if (this.road.echo && prev && this.echoes < 2 && this.L.rng.chance(0.45)) {
      word = prev;
      this.echoes++;
    } else {
      this.echoes = 0;
      word = this.road.echo && this.legLeft === this.extremeAt ? this.askWord('extreme') : this.roadWord();
    }
    this.current = this.L.core.add(word, {});
  }

  /** His word goes and up to four signs grow almost together in the other places, every word with its own first letter. */
  private crossroads(): void {
    this.current = null;
    const r = this.L.rng;
    const free = Array.from({ length: SLOTS }, (_, i) => i).filter((i) => i !== this.slot);
    const n = Math.min(free.length, this.crossings ? SIGNS_MAX : SIGNS_FIRST);
    const slots = r.shuffle(free).slice(0, n).sort((a, b) => a - b);
    const kinds = r.shuffle([...KINDS]).slice(0, n);
    this.signs = slots.map((slot, i) => {
      const kind = kinds[i];
      let word = this.askWord(PATHS[kind].ask);
      for (let k = 0; k < 8 && this.L.core.active.some((o) => o.word[0] === word[0]); k++) word = this.askWord(PATHS[kind].ask);
      const arrow = { pic: r.pick(ARROWS), rot: r.range(-ARROW_TURN, ARROW_TURN), left: r.chance(0.5) };
      return { slot, kind, name: r.pick(tList(`story.path.${kind}.names`)), tg: this.L.core.add(word, {}), age: -i * POST_STAGGER, gone: null, arrow, spin: null };
    });
    for (const s of this.signs) s.tg.selectable = false;
    this.crossings++;
    this.L.sfx('pop');
  }

  onDone(tg: Target): void {
    const sign = this.signs.find((s) => s.tg === tg);
    if (sign) return this.choose(sign);
    if (tg !== this.current) return;
    this.done++;
    this.legLeft--;
    this.happy();
    this.L.core.prune();
    this.step(() => this.nextWord());
  }

  /** A typed word is a step on: the view moves and he bobs. */
  private step(then: () => void): void {
    this.busy = true;
    const from = this.scroll;
    this.L.tweens.add(this.L.reduceMotion ? 0.01 : STEP_TIME, (k) => {
      this.scroll = from + STEP * k;
      this.jump = Math.abs(Math.sin(k * Math.PI * 2)) * 0.2;
    }, ease.inOutQuad, () => {
      this.jump = 0;
      this.busy = false;
      then();
    });
  }

  /** The typed sign is the road: the others vanish, he walks to its place and the road changes. */
  private choose(sign: Sign): void {
    this.done++;
    this.happy();
    for (const s of this.signs) {
      if (s === sign) continue;
      if (s.gone === null) s.gone = 0;
      this.L.core.release(s.tg, false);
    }
    sign.spin = 0;
    this.L.core.prune();
    this.L.particles.emit(this.slotX(sign.slot), FEET - POSTS[sign.slot % 3].h, 14, 'sparkle', ['#fff6a8', '#a6e3c9', '#f5a3d3'], 150, 8);
    const unknown: Unknown | undefined = sign.kind === 'unknown'
      ? { len: this.L.rng.pick(['short', 'long'] as const), time: this.L.rng.pick(['quick', 'slow'] as const), diff: this.L.rng.pick(['easy', 'hard'] as const) }
      : undefined;
    this.road = roadAfter(sign.kind, unknown);
    const scale = scaleAfter(sign.kind, unknown);
    this.L.count = this.done + Math.max(2, Math.round((this.L.count - this.done) * scale.words));
    this.L.stretchMin(scale.time);
    this.legLeft = this.road.leg;
    this.extremeAt = this.road.echo ? this.L.rng.int(1, this.road.leg) : -1;
    // What the path changes matters more than a line still shown.
    this.L.hideBubble();
    this.L.say(unknown
      ? t('story.path.unknownSaid', { len: t(`story.path.unknown.${unknown.len}`), time: t(`story.path.unknown.${unknown.time}`), diff: t(`story.path.unknown.${unknown.diff}`) })
      : pickLine(`story.path.${sign.kind}.said`), 3);
    // He watches the arrow spin and the sign go, then walks to its place.
    this.busy = true;
    this.L.tweens.add(this.L.reduceMotion ? 0.01 : SPIN + SPIN_HOLD + POST_GONE, () => {}, ease.linear, () => this.walkTo(sign.slot, () => this.nextWord()));
  }

  private walkTo(slot: number, then: () => void): void {
    this.busy = true;
    const from = this.heroX, to = this.slotX(slot);
    const time = this.L.reduceMotion ? 0.01 : 0.3 + WALK_PER_SLOT * Math.abs(slot - this.slot);
    this.slot = slot;
    this.L.tweens.add(time, (k) => {
      this.heroX = from + (to - from) * k;
      this.jump = Math.abs(Math.sin(k * Math.PI * 3)) * 0.25;
    }, ease.inOutQuad, () => {
      this.jump = 0;
      this.busy = false;
      then();
    });
  }

  /** The child chooses the path: the paws never type a sign. */
  pawMay(tg: Target): boolean {
    return !this.signs.some((s) => s.tg === tg);
  }

  onWrong(tg: Target | null): void {
    super.onWrong(tg);
    const sign = this.signs.find((s) => s.tg === tg);
    // Only a slip inside a started sign's word counts; a key that starts no word does not.
    if (!sign || !tg || this.L.core.locked !== tg) return;
    const standing = this.signs.filter((s) => s.gone === null);
    if (standing.length > 1) {
      sign.gone = 0;
      this.L.core.release(tg, false);
      this.L.core.prune();
      this.L.sfx('whoosh');
      if (!this.signGoneSaid) {
        this.signGoneSaid = true;
        this.L.say(t('story.signGone'), 2.5);
      }
      return;
    }
    // The last sign starts its word again: it must be typed without a slip.
    this.L.core.restart();
    if (!this.signLastSaid) {
      this.signLastSaid = true;
      this.L.say(t('story.signLast'), 2.5);
    }
  }

  update(dt: number): void {
    super.update(dt);
    for (const s of this.signs) {
      s.age += dt;
      if (s.spin !== null && s.gone === null && (s.spin += dt) >= SPIN + SPIN_HOLD) s.gone = 0;
      if (s.gone === null) s.tg.selectable = s.age >= POST_GROW;
      else s.gone += dt;
    }
    this.signs = this.signs.filter((s) => s.gone === null || s.gone < POST_GONE);
    if (this.endT !== null) this.endT += dt;
  }

  /** The arrow's turn now: its own, or, once chosen, two whole turns that end pointing straight up. */
  private arrowTurn(s: Sign): number {
    const a = s.arrow;
    if (s.spin === null) return a.rot;
    // A mirrored arrow points up at a quarter turn the other way.
    const up = a.left ? Math.PI / 2 : -Math.PI / 2;
    const k = this.L.reduceMotion ? 1 : ease.outCubic(Math.min(1, s.spin / SPIN));
    return a.rot + (up + Math.PI * 4 - a.rot) * k;
  }

  /**
   * The arrow, as long as its name needs, pinned to the post by its middle and turned around it;
   * one pointing left is mirrored, never upside down. The name runs along it and always reads upright.
   */
  private drawArrow(g: G, s: Sign, x: number, y: number, grow: number, alpha: number): void {
    const a = s.arrow, rot = this.arrowTurn(s);
    g.save();
    g.font = `700 ${NAME_SIZE}px ${fontFamily()}`;
    const len = Math.max(ARROW_H * 4, g.measureText(s.name).width * ARROW_ROOM) * grow;
    g.restore();
    const img = sprite(a.pic);
    const natural = ARROW_H * grow * (img ? img.naturalWidth / img.naturalHeight : 4);
    // Pinned to the post by its middle, it turns around it.
    drawSprite(g, a.pic, x, y, ARROW_H * grow, { flip: a.left, rot, sx: len / natural, alpha }, arrowFallback);
    if (s.spin !== null || grow < 1) return;
    // The way the arrow points: to the right, or mirrored to the left; the name sits a little toward its tail.
    const dx = (a.left ? -1 : 1) * Math.cos(rot), dy = (a.left ? -1 : 1) * Math.sin(rot);
    const along = -len * ARROW_TEXT;
    g.save();
    g.globalAlpha *= alpha;
    g.translate(x + dx * along, y + dy * along);
    g.rotate(Math.atan2(dy, dx) + (dx < 0 ? Math.PI : 0));
    g.font = `700 ${NAME_SIZE}px ${fontFamily()}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = NAME_INK;
    g.fillText(s.name, 0, 1);
    g.restore();
  }

  render(g: G): void {
    for (const s of this.signs) {
      if (s.age < 0) continue;
      const post = POSTS[s.slot % POSTS.length];
      const grow = this.L.reduceMotion ? 1 : ease.outBack(Math.min(1, s.age / POST_GROW));
      const alpha = s.gone === null ? 1 : Math.max(0, 1 - s.gone / POST_GONE);
      if (alpha <= 0) continue;
      const x = this.slotX(s.slot), top = FEET - post.h;
      drawSprite(g, post.pic, x, FEET + 6, post.h, { ay: 1, sy: grow, alpha }, postFallback);
      this.drawArrow(g, s, x, FEET + 6 - post.h * ARROW_AT * grow, grow, alpha);
      if (s.gone !== null || s.spin !== null || grow < 1) continue;
      this.L.label(g, s.tg, x, top - 28);
    }
    if (this.current && !this.current.done && !this.busy) this.L.label(g, this.current, this.heroX, wordAbove(FEET) - ROAD_WORD_UP);
    this.drawHero(g);
  }

  progress(): number {
    return this.done / this.L.count;
  }

  get finished(): boolean {
    return (this.endT ?? 0) > END_TIME;
  }
}
