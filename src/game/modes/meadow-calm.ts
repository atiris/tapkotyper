import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { blob, drawSprite, fontFamily, type G } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import { type Drift, Mode, TAPKO_X } from '../mode';
import type { Target } from '../typing';
import { CopyRow } from './copy-row';

/** The pictures this world's levels draw; a level opens when they are loaded. */
const PICTURES = ['obj-bee', 'obj-butterfly', 'obj-invitation', 'obj-ladybug', 'obj-mouse', 'obj-poppy-bud', 'obj-poppy-faded', 'obj-poppy-flower', 'obj-poppy-opening', 'obj-poppy-seedhead'];

/** The poppy's phase pictures, from bud to seed head (one stem, drawn at growing heights). */
const POPPY = ['obj-poppy-bud', 'obj-poppy-opening', 'obj-poppy-flower', 'obj-poppy-faded', 'obj-poppy-seedhead'];
type Phase = 'bud' | 'opening' | 'flower' | 'faded' | 'seed';
/** Each phase's picture, its height as a share of the flower's, and its color while the picture is missing. */
const PHASE: Record<Phase, { pic: string; h: number; color: string }> = {
  bud: { pic: POPPY[0], h: 0.82, color: '#8fc76a' },
  opening: { pic: POPPY[1], h: 0.9, color: '#e8604a' },
  flower: { pic: POPPY[2], h: 1, color: '#e5402e' },
  faded: { pic: POPPY[3], h: 1, color: '#c98a6a' },
  seed: { pic: POPPY[4], h: 0.96, color: '#9cae7a' },
};
/** About as tall as Tapko. */
const FLOWER_H = 250;
/** Poppies growing at once (each waits with another letter), and the pause before a new bud. */
const BUDS = 3;
const BUD_PAUSE = 0.8;
/** Seconds of each phase: the bud grows, opens (in half of the cases), flowers, fades and leaves its seed head. */
const GROW = 0.6;
const OPEN = 0.7;
const STAY = 3;
const FADED = 1.2;
const SEED = 1;
/** Stem bottoms lie in the near grass band, at least this far apart. */
const GAP = 130;
const PETALS = ['#e5402e', '#f05a3c', '#c9301f'];
/** Most stems in the bouquet at the end; its seconds to gather, when the shout comes and when the level ends. */
const BOUQUET = 9;
const GATHER = 0.9;
const BOUQUET_SHOUT = 0.8;
const BOUQUET_TIME = 3.4;

interface Poppy {
  /** Stem bottom. */
  x: number;
  y: number;
  flip: boolean;
  phase: Phase;
  /** Seconds in the phase. */
  t: number;
  /** Its letter while it is a bud, then null. */
  tg: Target | null;
  /** The bud opens before it flowers. */
  opens: boolean;
}

/**
 * The meadow's calm step: grow a bouquet of corn poppies. A bud grows in the near grass with a
 * letter above it; the typed letter makes it bloom, later it fades and drops its petals, and a new
 * bud grows elsewhere. Every typed letter adds a poppy to the bouquet shown at the end.
 */
export class PoppyMode extends Mode {
  readonly pictures = PICTURES;
  readonly world = 'meadow';
  readonly drift: Drift = { layer: 'mid', speed: 8 };
  private poppies: Poppy[] = [];
  private spawned = 0;
  private done = 0;
  /** Seconds until the next bud may grow. */
  private wait = 0;
  /** Where the last typed poppy grows; the next bud goes elsewhere. */
  private last: [number, number] | null = null;
  /** Seconds of the bouquet at the end; -1 before it. */
  private bouquetT = -1;

  startLine(): string {
    return pickLine('story.poppyStart');
  }

  /** A free stem bottom in the near grass, right of Tapko, away from the others; null when none is found. */
  private spot(): [number, number] | null {
    const r = this.L.rng;
    const taken = this.poppies.map((p): [number, number] => [p.x, p.y]);
    if (this.last) taken.push(this.last);
    const left = TAPKO_X + 170, right = this.L.vw - 70;
    const free = (x: number, y: number) => taken.every(([tx, ty]) => Math.hypot(x - tx, y - ty) >= GAP);
    for (let i = 0; i < 12; i++) {
      const x = r.range(left, right), y = r.range(VH * 0.8, VH * 0.92);
      if (free(x, y)) return [x, y];
    }
    // Chance found no room: the first free place from a random start along the band.
    const y = r.range(VH * 0.8, VH * 0.92), start = r.range(0, right - left);
    for (let d = 0; d < right - left; d += 20) {
      const x = left + ((start + d) % (right - left));
      if (free(x, y)) return [x, y];
    }
    return null;
  }

  private setPhase(p: Poppy, phase: Phase): void {
    p.phase = phase;
    p.t = 0;
    const head = p.y - FLOWER_H * 0.85;
    if (phase === 'flower') this.L.particles.emit(p.x, head, 8, 'leaf', PETALS, 120, 8, 0.8);
    // The faded flower keeps one petal; two or three more flutter down.
    if (phase === 'faded') this.L.particles.emit(p.x, head, this.L.rng.chance(0.5) ? 2 : 3, 'leaf', PETALS, 50, 12, 1.6);
  }

  update(dt: number): void {
    for (const p of this.poppies) {
      p.t += dt;
      if (p.tg) {
        p.tg.selectable = p.t >= GROW;
        p.tg.urgency = p.t;
      } else if (p.phase === 'opening' && p.t >= OPEN) this.setPhase(p, 'flower');
      else if (p.phase === 'flower' && p.t >= STAY) this.setPhase(p, 'faded');
      else if (p.phase === 'faded' && p.t >= FADED) this.setPhase(p, 'seed');
    }
    this.poppies = this.poppies.filter((p) => p.phase !== 'seed' || p.t < SEED);
    this.wait -= dt;
    if (this.wait <= 0 && this.poppies.filter((p) => p.tg).length < BUDS && this.spawned < this.L.count) this.grow();
    if (this.done < this.L.count) return;
    const before = this.bouquetT;
    this.bouquetT = Math.max(0, before) + dt;
    if (before < BOUQUET_SHOUT && this.bouquetT >= BOUQUET_SHOUT) this.L.hooray({ x: this.L.vw / 2, y: VH * 0.3 });
  }

  private grow(): void {
    const word = this.L.word(2, 1);
    const at = this.spot();
    // Every waiting word starts with its own letter, so the first key picks the word.
    if (!at || this.L.core.active.some((t) => t.word[0] === word[0])) {
      this.wait = 0.2;
      return;
    }
    const tg = this.L.core.add(word, {}, false);
    this.poppies.push({ x: at[0], y: at[1], flip: this.L.rng.chance(0.33), phase: 'bud', t: 0, tg, opens: this.L.rng.chance(0.5) });
    this.spawned++;
    this.wait = 0.4;
  }

  onDone(tg: Target): void {
    const p = this.poppies.find((p) => p.tg === tg);
    if (!p) return;
    p.tg = null;
    this.last = [p.x, p.y];
    this.done++;
    this.wait = Math.max(this.wait, BUD_PAUSE);
    this.L.core.prune();
    this.L.sfx('pop');
    this.setPhase(p, p.opens ? 'opening' : 'flower');
  }

  private drawPoppy(g: G, p: Poppy): void {
    const ph = PHASE[p.phase];
    // The bud grows out of the grass; a new phase pops a little; the seed head fades out.
    const grow = p.phase === 'bud' ? ease.outBack(Math.min(1, p.t / GROW)) : 1;
    const pop = p.phase !== 'bud' && p.t < 0.25 ? Math.sin((p.t / 0.25) * Math.PI) * 0.06 : 0;
    const alpha = p.phase === 'seed' ? Math.max(0, 1 - p.t / SEED) : 1;
    const sway = Math.sin(this.t * 1.3 + p.x * 0.01) * 0.03;
    drawSprite(g, ph.pic, p.x, p.y, FLOWER_H * ph.h * grow, { ay: 1, flip: p.flip, rot: sway, sx: 1 - pop, sy: 1 + pop, alpha }, blob(ph.color, false));
    if (p.tg && p.t >= GROW) this.L.label(g, p.tg, p.x, p.y - FLOWER_H * ph.h - 30);
  }

  /** The typed poppies fanned around one stem bottom in the middle, tied with a ribbon. */
  private drawBouquet(g: G): void {
    const n = Math.min(BOUQUET, this.done);
    const x = this.L.vw / 2, y = VH * 0.88;
    for (let i = 0; i < n; i++) {
      const k = ease.outBack(Math.min(1, Math.max(0, (this.bouquetT - i * 0.06) / GATHER)));
      const rot = n > 1 ? -0.5 + i / (n - 1) : 0;
      drawSprite(g, PHASE.flower.pic, x, y, FLOWER_H * k, { ay: 1, rot, flip: i % 2 === 1 }, blob(PHASE.flower.color, false));
    }
    const k = Math.min(1, this.bouquetT / GATHER);
    g.save();
    g.translate(x, y - FLOWER_H * 0.22);
    g.scale(k, k);
    g.fillStyle = '#f5c542';
    g.strokeStyle = 'rgba(90,61,43,0.6)';
    g.lineWidth = 2;
    for (const s of [-1, 1]) {
      // A loop of the bow and a ribbon end on each side.
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(s * 34, -26, s * 30, 4);
      g.quadraticCurveTo(s * 24, 14, 0, 0);
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(0, 2);
      g.lineTo(s * 16, 34);
      g.lineTo(s * 8, 32);
      g.closePath();
      g.fill();
      g.stroke();
    }
    g.beginPath();
    g.arc(0, 0, 7, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.restore();
  }

  render(g: G): void {
    // Lower poppies are nearer: they draw last.
    for (const p of [...this.poppies].sort((a, b) => a.y - b.y)) this.drawPoppy(g, p);
    if (this.bouquetT >= 0) this.drawBouquet(g);
  }

  progress(): number {
    return this.done / this.L.count;
  }

  get finished(): boolean {
    return this.bouquetT > BOUQUET_TIME;
  }
}

const CARD_INK = '#4a3a5c';
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
 * The meadow's twist: you write the invitation to the meadow party, one copy row per card
 * (`CopyRow`). A finished card flies as an envelope to a meadow friend. At the end one animal of
 * each kind that got a card comes to the middle, under the line how many were invited (one per
 * word typed right) and came to the party.
 */
export class InvitationMode extends Mode {
  readonly pictures = PICTURES;
  readonly world = 'meadow';
  readonly drift: Drift = { layer: 'mid', speed: 8 };
  readonly phraseWords = 1;
  private row = new CopyRow(this.L);
  /** The card's flight: 0 on the table, up to 1 gone with the friend; null while writing. */
  private fly: number | null = null;
  private friend = FRIENDS[0];
  /** Seconds since this card's friend started coming in. */
  private friendT = FRIEND_COME;
  private cards = 0;
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
    if (this.row.left <= 0) {
      this.party = 0;
      this.L.sfx('cheer');
      return;
    }
    this.row.fill();
    this.friend = FRIENDS[this.cards++ % FRIENDS.length];
    if (this.cards > 1) this.friendT = 0;
  }

  /** After a word: a finished card flies to its friend, then the next card comes. */
  private next(): void {
    if (!this.row.complete) return;
    this.fly = 0;
    this.L.sfx('whoosh');
    this.L.tweens.add(FLY_TIME, (k) => (this.fly = k), ease.linear, () => {
      this.fly = null;
      this.L.core.prune();
      this.newCard();
    });
  }

  update(dt: number): void {
    this.row.update(dt);
    this.friendT += dt;
    if (this.party === null) return;
    const before = this.party;
    this.party += dt;
    if (before < PARTY_COME && this.party >= PARTY_COME) this.L.particles.emit(this.L.vw / 2, VH * 0.4, 40, 'sparkle', ['#ffd25a', '#ff8fb1', '#9ccf7a', '#8ec5f0'], 320, 9);
  }

  onDone(tg: Target): void {
    if (!this.row.onDone(tg)) return;
    this.L.sfx('pop');
    this.next();
  }

  onWrong(tg: Target | null): void {
    if (this.row.onWrong(tg)) this.next();
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
    const n = this.row.typed;
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
    this.row.draw(g, this.cardX, y, this.cardW - 60, CARD_INK);
  }

  progress(): number {
    return this.row.resolved / this.L.count;
  }

  get finished(): boolean {
    return (this.party ?? 0) > PARTY_TIME;
  }
}
