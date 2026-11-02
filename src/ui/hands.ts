import { type KeyStep, type Layout, keyByCode, shiftKeyFor } from '../keyboard/layouts';
import { type HandIndex, type HandShape, type Side, VIEW, poseName, readHandSvg } from './hand-svg';

/**
 * The outline hands on the on-screen keyboard: one outline per hand and key, posed in the hand poser (tools/hand-poser) and
 * saved in `public/hands/` (./hand-svg.ts), in units of the full size keyboard. The SVG lies over `.kb` and scales with it,
 * so the hands keep to the keys at any size; inside `.kb` they also fade with it.
 */

const UNIT = 58, GAP = 4, KEY_H = 46;
/** Where a key's letter sits: the middle of the key above its finger stripe. */
const LABEL_Y = (KEY_H - 9) / 2;
/** The full size keyboard's width (15 units). */
const WIDTH = 15 * UNIT - GAP;
/** The wrists fade out between these heights. */
const FADE = [283, 354];
/** Seconds the hands wait at the sides before they come to the keys. */
export const HANDS_ARRIVE_S = 1;
/** Seconds a typed key's pose stays in free typing, and each step on the way from rest to home. */
const PRESS_S = 0.3;
const STEP_S = 0.1;
/** A hand's outline without its own pose for a key; the hands beside the keyboard; the steps between (`rest1`, `rest2`...). */
const HOME = 'home';
const REST = 'rest';
/** The hand poser tells an open Tapko on the dev server that it saved an outline. */
export const HANDS_CHANNEL = 'tapko-hands';

const base = () => `${import.meta.env.BASE_URL}hands/`;
// On the dev server an outline may change while Tapko is open (the hand poser saves it).
const fresh: RequestInit = { cache: import.meta.env.DEV ? 'no-store' : 'default' };
let indexLoad: Promise<HandIndex | null> | null = null;
const shapes = new Map<string, Promise<HandShape | null>>();
function loadIndex(): Promise<HandIndex | null> {
  indexLoad ??= fetch(`${base()}index.json`, fresh).then((r) => (r.ok ? (r.json() as Promise<HandIndex>) : null)).catch(() => null);
  return indexLoad;
}
function loadShape(side: Side, name: string): Promise<HandShape | null> {
  const key = `${side}/${name}`;
  if (!shapes.has(key)) shapes.set(key, fetch(`${base()}${key}.svg`, fresh).then(async (r) => (r.ok ? readHandSvg(await r.text()) : null)).catch(() => null));
  return shapes.get(key)!;
}

const NS = 'http://www.w3.org/2000/svg';
function el(name: string, attrs: Record<string, string | number> = {}, parent?: Element): SVGElement {
  const e = document.createElementNS(NS, name) as SVGElement;
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent?.append(e);
  return e;
}

/** The middle of a key in full size units (the same grid as the on-screen keyboard). */
export function keyMiddle(layout: Layout, code: string): [number, number] | null {
  for (const [r, row] of layout.rows.entries()) {
    let x = 0;
    for (const d of row) {
      x += (d.x ?? 0) * UNIT;
      if (d.code === code) return [x + ((d.w ?? 1) * UNIT - GAP) / 2, r * (KEY_H + GAP) + KEY_H / 2];
      x += (d.w ?? 1) * UNIT;
    }
  }
  return null;
}

/** The hand that types a key (null for the space bar's thumbs). */
export function handOf(layout: Layout, code: string): Side | null {
  const f = keyByCode(layout, code)?.finger;
  return f == null || f === 4 || f === 5 ? null : f < 4 ? 'left' : 'right';
}

/**
 * The key each hand presses for a step, which names its outline: the typing hand its key, the other hand Shift for a
 * capital, the space bar the thumb of the hand that did not type the key before (`lastHand`); a hand with nothing to press
 * rests in its home position.
 */
export function poseNames(layout: Layout, step: KeyStep | null, lastHand: Side | null): Record<Side, string> {
  const names: Record<Side, string> = { left: HOME, right: HOME };
  const name = step && poseName(layout, step.code);
  if (!step || !name) return names;
  const hand = handOf(layout, step.code);
  if (!hand) {
    names[lastHand === 'right' ? 'left' : 'right'] = name;
    return names;
  }
  names[hand] = name;
  const shift = shiftKeyFor(layout, step);
  if (shift) names[hand === 'left' ? 'right' : 'left'] = poseName(layout, shift) ?? HOME;
  return names;
}

/** The key being typed: its sign and its finger's colour. */
export interface HandsKey {
  step: KeyStep;
  label: string;
  color: string;
}

export class Hands {
  readonly el: SVGSVGElement;
  private index: HandIndex | null = null;
  /** Per hand two layers: the outline shown and the one fading in over it. */
  private side: Record<Side, { g: SVGElement; layers: SVGElement[]; shown: string }>;
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
  /** Counts the changes, so an outline that loads late never replaces a newer one. */
  private turn = 0;
  /** Beside the keyboard (the level's start), on the way to the keys (the step), or on the keys. */
  private place: 'rest' | number | 'keys' = 'keys';
  private stepTimer = 0;
  /** The outline of the key typed last, `<side>/<name>` (the hand poser opens it). */
  lastPose = `left/${HOME}`;

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
      const layers = [0, 1].map(() => {
        const layer = el('g', { class: 'hand-pose' }, g);
        el('g', { class: 'hand-nails', filter: `url(#${id}-soft)` }, layer);
        el('path', { class: 'hand-lines' }, layer);
        return layer;
      });
      return { g, layers, shown: '' };
    };
    this.side = { left: make('left'), right: make('right') };
    // The key being typed, over the hands: its letter with a thin outline in its finger's colour on a small disc of that
    // colour fading from its centre, so a finger never hides it (the key's own letter is hidden meanwhile).
    const glow = el('radialGradient', { id: `${id}-glow` }, defs);
    this.stops = [[0, 0.9], [1, 0]].map(([offset, opacity]) => el('stop', { offset, 'stop-opacity': opacity }, glow));
    this.focus = el('g', { class: 'hand-focus', visibility: 'hidden' }, this.el);
    this.disc = el('circle', { r: (UNIT - GAP) / 4 + 2, fill: `url(#${id}-glow)` }, this.focus);
    this.letter = el('text', { class: 'hand-letter' }, this.focus);
    void loadIndex().then((index) => {
      this.index = index;
      this.update();
    });
    if (import.meta.env.DEV) {
      new BroadcastChannel(HANDS_CHANNEL).onmessage = () => {
        indexLoad = null;
        shapes.clear();
        for (const s of ['left', 'right'] as Side[]) this.side[s].shown = '';
        void loadIndex().then((index) => {
          this.index = index;
          this.update();
        });
      };
    }
  }

  /** The hands rest beside the keyboard (on) or come onto the keys (off), through the steps between when there are any. */
  park(on: boolean): void {
    // Already on the way: the steps go on.
    if (!on && typeof this.place === 'number') return;
    clearTimeout(this.stepTimer);
    if (on) this.place = 'rest';
    else if (this.place === 'rest' && !document.body.classList.contains('reduce-motion')) this.step(1);
    else this.place = 'keys';
    this.update();
  }

  private step(n: number): void {
    const has = (s: Side) => this.index?.[s].includes(`${REST}${n}`);
    this.place = has('left') || has('right') ? n : 'keys';
    if (this.place !== 'keys') this.stepTimer = window.setTimeout(() => {
      this.step(n + 1);
      this.update();
    }, STEP_S * 1000);
  }

  /** Shows how `key` is typed: the hands' outlines and its sign over them; null leaves both hands at home. */
  show(key: HandsKey | null): void {
    if (this.next && key?.step.code !== this.next.step.code) this.remember(this.next);
    this.next = key;
    this.update();
  }

  /** Free typing: the key just typed, in its pose for a moment, then back home. */
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

  private update(): void {
    const key = this.pressed ?? this.next;
    this.paintLetter(key);
    const index = this.index;
    if (!index) return;
    const turn = ++this.turn;
    const names = this.place === 'keys' ? poseNames(this.layout, key?.step ?? null, this.lastHand)
      : { left: this.place === 'rest' ? REST : `${REST}${this.place}`, right: this.place === 'rest' ? REST : `${REST}${this.place}` };
    if (key && this.place === 'keys') {
      const hand = handOf(this.layout, key.step.code) ?? (names.left === HOME ? 'right' : 'left');
      this.lastPose = `${hand}/${names[hand]}`;
    }
    for (const s of ['left', 'right'] as Side[]) {
      const fallback = this.place !== 'keys' && index[s].includes(REST) ? REST : HOME;
      const name = index[s].includes(names[s]) ? names[s] : fallback;
      if (name === this.side[s].shown) continue;
      void loadShape(s, name).then((shape) => {
        if (shape && turn === this.turn) this.draw(s, name, shape);
      });
    }
  }

  /** The new outline fades in over the old one, which fades out. */
  private draw(s: Side, name: string, shape: HandShape): void {
    const side = this.side[s];
    side.shown = name;
    const [old, layer] = side.layers[0].classList.contains('on') ? side.layers : [side.layers[1], side.layers[0]];
    layer.querySelector('.hand-lines')!.setAttribute('d', shape.lines);
    layer.querySelector('.hand-nails')!.replaceChildren(...shape.nails.map((n) => el('path', { class: 'hand-nail', d: n.d, fill: this.fingerColor(n.f) })));
    old.classList.remove('on');
    layer.classList.add('on');
    this.el.classList.add('ready');
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
