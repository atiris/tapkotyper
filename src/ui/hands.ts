import { type KeyStep, type Layout, keyByCode } from '../keyboard/layouts';
import { type HandPose, type Rig, type Side, blend, drawHand, keyMiddle, posesFor, restPose } from './hand-rig';

/**
 * The outline hands on the on-screen keyboard: the drawing's lines on a skeleton (./hand-rig.ts, public/hands/rig.json), in
 * units of the full size keyboard (a key and its gap 58 wide, a row 50 high, the digit row on top). The SVG lies over `.kb` and
 * scales with it, so the hands keep to the keys at any size; inside `.kb` they also fade with it.
 */

const UNIT = 58, GAP = 4, KEY_H = 46;
/** Where a key's letter sits: the middle of the key above its finger stripe. */
const LABEL_Y = (KEY_H - 9) / 2;
/** The full size keyboard's width (15 units) and the room around it: the hands reach out and their wrists below. */
const WIDTH = 15 * UNIT - GAP;
const VIEW = { x: -150, y: -20, w: WIDTH + 300, h: 460 };
/** The wrists fade out between these heights. */
const FADE = [283, 354];
/** Seconds the hands wait at the sides before they come to the keys. */
export const HANDS_ARRIVE_S = 1;
/** Seconds a typed key's pose stays in free typing, and a move from one pose to the next. */
const PRESS_S = 0.3;
const MOVE_S = 0.12;

let rigLoad: Promise<Rig | null> | null = null;
function loadRig(): Promise<Rig | null> {
  rigLoad ??= fetch(`${import.meta.env.BASE_URL}hands/rig.json`).then((r) => (r.ok ? r.json() as Promise<Rig> : null)).catch(() => null);
  return rigLoad;
}

const NS = 'http://www.w3.org/2000/svg';
function el(name: string, attrs: Record<string, string | number> = {}, parent?: Element): SVGElement {
  const e = document.createElementNS(NS, name) as SVGElement;
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent?.append(e);
  return e;
}

/** The hand that types a key (null for the space bar's thumbs). */
export function handOf(layout: Layout, code: string): Side | null {
  const f = keyByCode(layout, code)?.finger;
  return f == null || f === 4 || f === 5 ? null : f < 4 ? 'left' : 'right';
}

/** The key being typed: its sign and its finger's colour. */
export interface HandsKey {
  step: KeyStep;
  label: string;
  color: string;
}

export class Hands {
  readonly el: SVGSVGElement;
  private rig: Rig | null = null;
  private side: Record<Side, { g: SVGElement; lines: SVGElement; creases: SVGElement; nails: SVGElement }>;
  private focus: SVGElement;
  private disc: SVGElement;
  private letter: SVGElement;
  private stops: SVGElement[];
  /** The next key the hands show, and a key just typed in free typing, which they show for a moment instead. */
  private next: HandsKey | null = null;
  private pressed: HandsKey | null = null;
  private pressTimer = 0;
  /** The hand that typed the key before (the space bar's thumb is the other one's). */
  private lastHand: Side | null = null;
  /** The poses shown, and the move under way to the target poses. */
  private shown: Record<Side, HandPose> = { left: restPose('left'), right: restPose('right') };
  private from = this.shown;
  private target = this.shown;
  private moveStart = 0;
  private frame = 0;

  /** `fingerColor`: the colour of a finger (its nail). */
  constructor(private layout: Layout, private fingerColor: (finger: number) => string) {
    const id = `hands-${Math.random().toString(36).slice(2, 8)}`;
    this.el = el('svg', { class: 'kb-hands', viewBox: `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`, 'aria-hidden': 'true' }) as SVGSVGElement;
    this.el.style.setProperty('--vx', String(VIEW.x / WIDTH));
    this.el.style.setProperty('--vy', String(VIEW.y / WIDTH));
    this.el.style.setProperty('--vw', String(VIEW.w / WIDTH));
    const defs = el('defs', {}, this.el);
    const grad = el('linearGradient', { id: `${id}-fade`, x1: 0, x2: 0, y1: FADE[0], y2: FADE[1], gradientUnits: 'userSpaceOnUse' }, defs);
    el('stop', { offset: 0, 'stop-color': '#fff' }, grad);
    el('stop', { offset: 1, 'stop-color': '#000' }, grad);
    const mask = el('mask', { id: `${id}-mask`, maskUnits: 'userSpaceOnUse', x: VIEW.x - 500, y: VIEW.y, width: VIEW.w + 1000, height: VIEW.h }, defs);
    el('rect', { x: VIEW.x - 500, y: VIEW.y, width: VIEW.w + 1000, height: VIEW.h, fill: `url(#${id}-fade)` }, mask);
    // The nails are soft: their own shapes, blurred a little like the letter's disc.
    const soft = el('filter', { id: `${id}-soft`, x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs);
    el('feGaussianBlur', { stdDeviation: 1.6 }, soft);
    const both = el('g', { mask: `url(#${id}-mask)` }, this.el);
    const make = (s: Side) => {
      const g = el('g', { class: `hand-${s}` }, both);
      const nails = el('g', { class: 'hand-nails', filter: `url(#${id}-soft)` }, g);
      const lines = el('path', { class: 'hand-lines' }, g);
      const creases = el('path', { class: 'hand-creases' }, g);
      return { g, lines, creases, nails };
    };
    this.side = { left: make('left'), right: make('right') };
    // The key being typed, over the hands: its letter with a thin outline in its finger's colour on a small disc of that
    // colour fading from its centre, so a finger never hides it (the key's own letter is hidden meanwhile).
    const glow = el('radialGradient', { id: `${id}-glow` }, defs);
    this.stops = [[0, 0.9], [1, 0]].map(([offset, opacity]) => el('stop', { offset, 'stop-opacity': opacity }, glow));
    this.focus = el('g', { class: 'hand-focus', visibility: 'hidden' }, this.el);
    this.disc = el('circle', { r: (UNIT - GAP) / 4 + 2, fill: `url(#${id}-glow)` }, this.focus);
    this.letter = el('text', { class: 'hand-letter' }, this.focus);
    void loadRig().then((rig) => {
      this.rig = rig;
      this.el.classList.toggle('ready', !!rig);
      this.update();
    });
  }

  /** The hands wait at the page's sides (on) or lie on the keys (off). */
  park(on: boolean): void {
    this.el.classList.toggle('parked', on);
  }

  /** Shows how `key` is typed: the hands' pose and its sign over them; null leaves both hands at rest. */
  show(key: HandsKey | null): void {
    if (this.next && key?.step.code !== this.next.step.code) this.remember(this.next);
    this.next = key;
    this.update();
  }

  /** Free typing: the key just typed, in its pose for a moment, then back to rest. */
  press(key: HandsKey): void {
    this.pressed = key;
    clearTimeout(this.pressTimer);
    this.pressTimer = window.setTimeout(() => {
      this.remember(key);
      this.pressed = null;
      this.update();
    }, PRESS_S * 1000);
    this.update();
  }

  private remember(key: HandsKey): void {
    this.lastHand = handOf(this.layout, key.step.code) ?? this.lastHand;
  }

  /** New target poses: the hands move to them (at once when motion is reduced). */
  private update(): void {
    const key = this.pressed ?? this.next;
    this.paintLetter(key);
    if (!this.rig) return;
    this.from = this.shown;
    this.target = posesFor(this.rig, this.layout, key?.step ?? null, this.lastHand);
    this.moveStart = performance.now();
    cancelAnimationFrame(this.frame);
    const step = (now: number) => {
      // The app marks reduced motion on the body (its own setting or the system's): then the hands jump.
      const t = document.body.classList.contains('reduce-motion') ? 1 : Math.min(1, (now - this.moveStart) / (MOVE_S * 1000));
      this.shown = { left: blend(this.from.left, this.target.left, t), right: blend(this.from.right, this.target.right, t) };
      this.draw();
      if (t < 1) this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }

  private draw(): void {
    const rig = this.rig!;
    for (const s of ['left', 'right'] as Side[]) {
      const drawn = drawHand(rig[s], s, this.shown[s]), side = this.side[s];
      side.lines.setAttribute('d', drawn.lines);
      side.creases.setAttribute('d', drawn.creases);
      side.nails.replaceChildren(...drawn.nails.filter((n) => n.seen > 0).map((n) => el('path', { class: 'hand-nail', d: n.d, fill: this.fingerColor(n.f), opacity: n.seen })));
    }
  }

  private paintLetter(key: HandsKey | null): void {
    const at = key && keyMiddle(this.layout, key.step.code);
    this.focus.setAttribute('visibility', at ? 'visible' : 'hidden');
    if (!key || !at) return;
    // The letter where the key's own letter is: above the finger stripe.
    const y = at[1] - KEY_H / 2 + LABEL_Y;
    for (const st of this.stops) st.setAttribute('stop-color', key.color);
    this.disc.setAttribute('cx', String(at[0]));
    this.disc.setAttribute('cy', String(y));
    this.letter.setAttribute('x', String(at[0]));
    this.letter.setAttribute('y', String(y));
    this.letter.textContent = key.label;
    this.letter.style.setProperty('--hit', key.color);
  }
}
