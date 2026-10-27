import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { blob, drawSprite, fontFamily, type G, wordBox } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import { STORIES, storyOf } from '../levels';
import { Mode } from '../mode';
import type { Target } from '../typing';

/** The pictures this world's levels draw; a level opens when they are loaded. */
const PICTURES = ['obj-bee', 'obj-butterfly', 'obj-dewdrop', 'obj-invitation', 'obj-ladybug', 'obj-mouse'];

/** Blade tips where dew drops sit, as shares of the stage width and of its height. */
const SPOTS: [number, number][] = [[0.3, 0.6], [0.4, 0.48], [0.5, 0.64], [0.6, 0.5], [0.7, 0.62], [0.8, 0.46], [0.9, 0.6]];
/** Drops on the grass at once (each starts with another letter), and the pause before a new one comes. */
const DROPS = 3;
const DROP_PAUSE = 0.8;
const DROP_SIZE = 90;
/** A flower opens, stays and fades, then its blade is free again. */
const FLOWER_OPEN = 0.5;
const FLOWER_STAY = 3;
const FLOWER_FADE = 1;
const PETALS = ['#f5a3d3', '#ffd25a', '#a6c8ff', '#ff9f7a', '#c7a6ff'];

interface Spot {
  x: number;
  y: number;
  drop: Target | null;
  /** Seconds since the drop came (its pop), and since its flower opened (-1: none). */
  dropT: number;
  flowerT: number;
  petal: string;
}

/** Code-drawn dew drop on a leaf, until the picture is there. */
function dropFallback(g: G, w: number, h: number): void {
  g.save();
  g.fillStyle = '#8fc76a';
  g.beginPath();
  g.ellipse(0, h * 0.32, w * 0.46, h * 0.1, -0.2, 0, Math.PI * 2);
  g.fill();
  blob('#a6d4f5', false)(g, w * 0.8, h * 0.8);
  g.restore();
}

/** A five-petal flower of radius `r`. */
function flower(g: G, x: number, y: number, r: number, petal: string): void {
  g.save();
  g.translate(x, y);
  g.strokeStyle = 'rgba(90,61,43,0.5)';
  g.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.fillStyle = petal;
    g.beginPath();
    g.ellipse(Math.sin(a) * r * 0.55, -Math.cos(a) * r * 0.55, r * 0.42, r * 0.42, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  g.fillStyle = '#ffcf3a';
  g.beginPath();
  g.arc(0, 0, r * 0.35, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.restore();
}

/**
 * The meadow's calm step: still dew drops on the grass, one letter each. A typed letter
 * opens a flower where its drop was, and a new drop comes on another free blade.
 */
export class DewdropsMode extends Mode {
  readonly pictures = PICTURES;
  readonly world = 'meadow';
  private spots: Spot[] = [];
  private spawned = 0;
  private done = 0;
  /** Seconds until the next drop may come. */
  private wait = 0;
  /** The blade whose drop was typed last; the next drop goes elsewhere. */
  private last = -1;
  private finishT = 0;

  startLine(): string {
    return pickLine('story.dewStart');
  }

  start(): void {
    this.spots = SPOTS.map(([fx, fy]) => ({ x: this.L.vw * fx, y: VH * fy, drop: null, dropT: 0, flowerT: -1, petal: PETALS[0] }));
  }

  private free(): number[] {
    return this.spots.map((s, i) => (!s.drop && s.flowerT < 0 && i !== this.last ? i : -1)).filter((i) => i >= 0);
  }

  update(dt: number): void {
    this.spots.forEach((s, i) => {
      s.x = this.L.vw * SPOTS[i][0];
      s.dropT += dt;
      if (s.drop) s.drop.urgency = s.dropT;
      if (s.flowerT >= 0 && (s.flowerT += dt) > FLOWER_OPEN + FLOWER_STAY + FLOWER_FADE) s.flowerT = -1;
    });
    this.wait -= dt;
    const onGrass = this.spots.filter((s) => s.drop).length;
    const free = this.free();
    if (this.wait <= 0 && onGrass < DROPS && this.spawned < this.L.count && free.length) {
      const word = this.L.word(2, 1);
      // Every waiting word starts with its own letter, so the first key picks the word.
      if (this.L.core.active.some((t) => t.word[0] === word[0])) {
        this.wait = 0.2;
        return;
      }
      const s = this.spots[this.L.rng.pick(free)];
      s.drop = this.L.core.add(word, {});
      s.dropT = 0;
      this.spawned++;
      this.wait = 0.4;
    }
    if (this.done >= this.L.count) this.finishT += dt;
  }

  onDone(tg: Target): void {
    const i = this.spots.findIndex((s) => s.drop === tg);
    if (i < 0) return;
    const s = this.spots[i];
    s.drop = null;
    s.flowerT = 0;
    s.petal = this.L.rng.pick(PETALS);
    this.last = i;
    this.done++;
    this.wait = Math.max(this.wait, DROP_PAUSE);
    this.L.core.prune();
    this.L.sfx('pop');
    this.L.particles.emit(s.x, s.y, 8, 'sparkle', ['#e6f6ff', '#a6d4f5', '#fff6a8'], 90, 6);
  }

  render(g: G): void {
    for (const s of this.spots) {
      if (s.flowerT >= 0) {
        const open = ease.outBack(Math.min(1, s.flowerT / FLOWER_OPEN));
        g.save();
        g.globalAlpha = 1 - Math.max(0, s.flowerT - FLOWER_OPEN - FLOWER_STAY) / FLOWER_FADE;
        g.strokeStyle = '#5fa84a';
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(s.x, VH);
        g.quadraticCurveTo(s.x - 12, (s.y + VH) / 2, s.x, s.y);
        g.stroke();
        flower(g, s.x, s.y, 34 * open, s.petal);
        g.restore();
      }
      if (!s.drop) continue;
      const pop = ease.outBack(Math.min(1, s.dropT * 2.5));
      drawSprite(g, 'obj-dewdrop', s.x, s.y + Math.sin(this.t * 1.5 + s.x) * 3, DROP_SIZE * pop, {}, dropFallback);
      if (pop > 0.6) this.L.label(g, s.drop, s.x, s.y - DROP_SIZE * 0.5 - 30, 46);
    }
  }

  progress(): number {
    return this.done / this.L.count;
  }

  get finished(): boolean {
    return this.finishT > 0.8;
  }
}

/** Extra words a slip may still add: 2 each, up to (1 + story order) x 3 in all. */
export function slipWords(storyOrder: number, added: number): number {
  return Math.max(0, Math.min(2, (1 + storyOrder) * 3 - added));
}

/** A word of the invitation card: the one to type is a target, the others are ink on the paper. */
interface Slot {
  word: string;
  tg: Target;
  /** Seconds since a slip faded it (-1: no slip). */
  slip: number;
}

const CARD_INK = '#4a3a5c';
const SLIP_INK = '#d9482b';
const SLIP_FADE = 0.6;
/** What stays of a slipped word: a faint trace where it stood. */
const SLIP_TRACE = 0.2;
const WORD_SIZE = 40;
const WORD_GAP = 26;
/** Seconds the finished card takes to fold, fly to its friend and leave with it. */
const FLY_TIME = 1.6;
/** Seconds the next card's friend takes to come in from the right (it popped up at its place before). */
const FRIEND_COME = 0.6;
const FRIENDS = ['obj-bee', 'obj-butterfly', 'obj-ladybug', 'obj-mouse'];
/** Seconds the guests take to come to the party, when the line about them shows, and when the level ends. */
const PARTY_COME = 1.4;
const PARTY_LINE = 1.2;
const PARTY_TIME = 4.2;

/**
 * The meadow's twist: you write the invitation to the meadow party. The words of a row are
 * typed from left to right; a slip turns the word red and it fades to a faint trace, and the level
 * gets two more words. A finished card flies as an envelope to a meadow friend. At the end one
 * animal of each kind that got a card comes to the middle, under the line how many were invited
 * (one per word typed right) and came to the party.
 */
export class InvitationMode extends Mode {
  readonly pictures = PICTURES;
  readonly world = 'meadow';
  readonly phraseWords = 1;
  private row: Slot[] = [];
  private at = 0;
  /** Words typed or faded. */
  private resolved = 0;
  /** Words added by slips. */
  private added = 0;
  /** The card's flight: 0 on the table, up to 1 gone with the friend; null while writing. */
  private fly: number | null = null;
  private friend = FRIENDS[0];
  /** Seconds since this card's friend started coming in. */
  private friendT = FRIEND_COME;
  private cards = 0;
  /** Words typed right: each one invited an animal. */
  private invited = 0;
  /** Seconds of the party at the end; null before it. */
  private party: number | null = null;

  startLine(): string {
    return pickLine('story.invitationStart');
  }

  start(): void {
    this.newCard();
  }

  private get cardX(): number {
    return this.L.vw * 0.56;
  }

  private get cardW(): number {
    return Math.min(this.L.vw * 0.62, 760);
  }

  private newCard(): void {
    const left = this.L.count - this.resolved;
    if (left <= 0) {
      this.row = [];
      this.party = 0;
      this.L.sfx('cheer');
      return;
    }
    const n = Math.min(this.L.rng.int(3, 4), left);
    this.friend = FRIENDS[this.cards++ % FRIENDS.length];
    if (this.cards > 1) this.friendT = 0;
    this.at = 0;
    this.row = Array.from({ length: n }, (_, i) => {
      const word = this.L.word(6, 1);
      return { word, tg: this.L.core.add(word, {}, i === 0), slip: -1 };
    });
  }

  private next(): void {
    this.resolved++;
    this.at++;
    const s = this.row[this.at];
    if (s) {
      s.tg.selectable = true;
      return;
    }
    this.fly = 0;
    this.L.sfx('whoosh');
    this.L.tweens.add(FLY_TIME, (k) => (this.fly = k), ease.linear, () => {
      this.fly = null;
      this.L.core.prune();
      this.newCard();
    });
  }

  update(dt: number): void {
    for (const s of this.row) if (s.slip >= 0) s.slip += dt;
    this.friendT += dt;
    if (this.party === null) return;
    const before = this.party;
    this.party += dt;
    if (before < PARTY_COME && this.party >= PARTY_COME) this.L.particles.emit(this.L.vw / 2, VH * 0.4, 40, 'sparkle', ['#ffd25a', '#ff8fb1', '#9ccf7a', '#8ec5f0'], 320, 9);
  }

  onDone(tg: Target): void {
    if (this.row[this.at]?.tg !== tg) return;
    this.L.sfx('pop');
    this.invited++;
    this.next();
  }

  /** A slip: the word fades away red and the level gets two more words (up to the story's ceiling). */
  onWrong(tg: Target | null): void {
    const s = this.row[this.at];
    if (!s || s.tg !== tg) return;
    s.slip = 0;
    this.L.core.release(tg, false);
    const story = STORIES.indexOf(storyOf(this.L.def.world)) + 1;
    const more = slipWords(story, this.added);
    this.added += more;
    this.L.count += more;
    this.next();
  }

  /** The row laid out on the card: each word's centre and the size that fits the card. */
  private layout(g: G): { xs: number[]; size: number } {
    const widths = (size: number) => this.row.map((s) => wordBox(g, s.word, size).w);
    let size = WORD_SIZE;
    const total = (sz: number) => widths(sz).reduce((a, b) => a + b, 0) + WORD_GAP * (this.row.length - 1);
    const room = this.cardW - 60;
    if (total(size) > room) size = Math.max(24, (size * room) / total(size));
    const ws = widths(size);
    let x = this.cardX - total(size) / 2;
    const xs = ws.map((w) => {
      const c = x + w / 2;
      x += w + WORD_GAP;
      return c;
    });
    return { xs, size };
  }

  /** The guests: one of each kind that got a card, walking or flying in to the middle; above them how many came. */
  private renderParty(g: G, time: number): void {
    const kinds = FRIENDS.slice(0, Math.min(this.cards, FRIENDS.length));
    const k = ease.outCubic(Math.min(1, time / PARTY_COME));
    kinds.forEach((kind, i) => {
      const from = this.L.vw + 120 + i * 90;
      const to = this.L.vw / 2 + (i - (kinds.length - 1) / 2) * 150;
      const ground = kind === 'obj-mouse';
      const y = ground ? VH - 55 - Math.abs(Math.sin(this.t * 4 + i)) * 10 : VH * 0.55 + Math.sin(this.t * 2.5 + i) * 10;
      drawSprite(g, kind, from + (to - from) * k, y, 100, { flip: true }, blob('#f5c542'));
    });
    const a = Math.min(1, Math.max(0, (time - PARTY_LINE) / 0.4));
    if (a <= 0) return;
    const n = this.invited;
    const lines = t(n === 1 ? 'story.invitationPartyOne' : n > 1 && n < 5 ? 'story.invitationPartyFew' : 'story.invitationPartyMany', { n }).split('\n');
    g.save();
    g.globalAlpha = a;
    g.font = `700 44px ${fontFamily()}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = 8;
    g.strokeStyle = '#fff';
    g.fillStyle = CARD_INK;
    lines.forEach((line, i) => {
      g.strokeText(line, this.L.vw / 2, VH * 0.22 + i * 56);
      g.fillText(line, this.L.vw / 2, VH * 0.22 + i * 56);
    });
    g.restore();
  }

  render(g: G): void {
    if (this.party !== null) return this.renderParty(g, this.party);
    const y = VH * 0.5;
    const k = this.fly ?? 0;
    // The friend waits on the right and leaves with the envelope.
    const come = (1 - ease.outCubic(Math.min(1, this.friendT / FRIEND_COME))) * 300;
    const fx = this.L.vw * 0.9 + (k > 0.6 ? ((k - 0.6) / 0.4) * 300 : 0) + come;
    // The mouse waits in the grass and hops; the flyers hover.
    const ground = this.friend === 'obj-mouse';
    const fy = ground ? VH - 55 - Math.abs(Math.sin(this.t * 3)) * 6 : VH * 0.3 + Math.sin(this.t * 2) * 8;
    drawSprite(g, this.friend, fx, fy, 90, { flip: true }, blob('#f5c542'));
    if (k > 0) {
      // The card folds into the envelope, which flies to the friend.
      const f = ease.inOutQuad(Math.min(1, k / 0.6));
      const ex = this.cardX + (fx - 40 - this.cardX) * f, ey = y + (fy + (ground ? -50 : 30) - y) * f - Math.sin(f * Math.PI) * 120;
      drawSprite(g, 'obj-invitation', ex, ey, 160 - f * 90, { rot: f * 0.4 }, blob('#f4e4c8', false));
      return;
    }
    g.save();
    g.fillStyle = '#fbf3e2';
    g.strokeStyle = 'rgba(90,61,43,0.6)';
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(this.cardX - this.cardW / 2, y - 90, this.cardW, 180, 18);
    g.fill();
    g.stroke();
    g.restore();
    drawSprite(g, 'obj-invitation', this.cardX + this.cardW / 2 - 20, y - 80, 70, { rot: 0.2 }, blob('#f4e4c8', false));
    const { xs, size } = this.layout(g);
    this.row.forEach((s, i) => {
      if (i === this.at) return this.L.label(g, s.tg, xs[i], y, size);
      g.save();
      g.font = `600 ${size}px ${fontFamily()}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = s.slip >= 0 ? SLIP_INK : CARD_INK;
      g.globalAlpha = s.slip >= 0 ? Math.max(SLIP_TRACE, 1 - (1 - SLIP_TRACE) * s.slip / SLIP_FADE) : i < this.at ? 1 : 0.35;
      g.fillText(s.word, xs[i], y);
      g.restore();
    });
  }

  progress(): number {
    return this.resolved / this.L.count;
  }

  get finished(): boolean {
    return (this.party ?? 0) > PARTY_TIME;
  }
}
