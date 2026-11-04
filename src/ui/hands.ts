import { type KeyStep, type Layout, keyByCode, shiftKeyFor } from '../keyboard/layouts';
import { type FingerScheme, fingerOf } from '../keyboard/fingers';
import { FINGER_COLORS } from './finger-colors';
import { HAND_STYLE } from './hand-style';
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
/** How soft the nails' edges are (a blur, keyboard units). */
export const NAIL_SOFT = 0.6;
/** The wrists fade out between these heights. */
const FADE = [283, 354];
/** Seconds the hands wait at the sides before they come to the keys, and how long they glide there. */
export const HANDS_ARRIVE_S = 2;
export const HANDS_GLIDE_S = 1.5;
/** Seconds a typed key's pose stays in free typing. */
const PRESS_S = 0.3;
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

/** A path split into its numbers and the text between them. */
function pathNumbers(d: string): { text: string[]; nums: number[] } {
  const parts = d.split(/(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/i);
  return { text: parts.filter((_, i) => i % 2 === 0), nums: parts.filter((_, i) => i % 2 === 1).map(Number) };
}
/**
 * One hand's outline at any point of a glide through `shapes` (0 the first, 1 the last), each path's numbers blended
 * between the two shapes around that point. The hand tool makes every outline from the same drawing, so their paths
 * match number for number; a shape whose path does not (another drawing) is left out.
 */
export function morphFrames(shapes: HandShape[]): { lines: (t: number) => string; creases: (t: number) => string } {
  const at = (pick: (s: HandShape) => string) => {
    const parsed = shapes.map((s) => pathNumbers(pick(s)));
    const keys = parsed.filter((p) => p.nums.length === parsed.at(-1)!.nums.length);
    return (t: number): string => {
      if (keys.length < 2) return pick(shapes.at(-1)!);
      const x = Math.min(1, Math.max(0, t)) * (keys.length - 1), i = Math.min(keys.length - 2, Math.floor(x)), u = x - i;
      const a = keys[i].nums, b = keys[i + 1].nums, text = keys[0].text;
      let d = text[0];
      for (let k = 0; k < a.length; k++) d += (a[k] + (b[k] - a[k]) * u).toFixed(1) + text[k + 1];
      return d;
    };
  };
  return { lines: at((s) => s.lines), creases: at((s) => s.creases) };
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
 * The key each hand presses for a step, which names its outline (by the hand, finger and key: poseName): the typing hand
 * its key with the finger of the `scheme`, the other hand Shift for a capital, the space bar the thumb of the hand that
 * did not type the key before (`lastHand`); a hand with nothing to press rests in its home position.
 */
export function poseNames(layout: Layout, step: KeyStep | null, lastHand: Side | null, scheme: FingerScheme = 'standard'): Record<Side, string> {
  const names: Record<Side, string> = { left: HOME, right: HOME };
  const def = step && keyByCode(layout, step.code);
  if (!step || !def) return names;
  if (def.finger === 4 || def.finger === 5) {
    const thumb = lastHand === 'right' ? 4 : 5;
    names[thumb === 4 ? 'left' : 'right'] = poseName(layout, step.code, thumb) ?? HOME;
    return names;
  }
  const finger = fingerOf(def, scheme), hand: Side = finger <= 4 ? 'left' : 'right';
  names[hand] = poseName(layout, step.code, finger) ?? HOME;
  const shift = shiftKeyFor(layout, step), shiftDef = shift ? keyByCode(layout, shift) : undefined;
  if (shiftDef) names[hand === 'left' ? 'right' : 'left'] = poseName(layout, shiftDef.code, shiftDef.finger) ?? HOME;
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
  /** Beside the keyboard (the level's start, a pause), gliding between there and the keys, or on the keys. */
  private place: 'rest' | 'gliding' | 'keys' = 'keys';
  /** Where the glide goes (true: beside the keyboard), and its frame. */
  private glideTo: boolean | null = null;
  private glideFrame = 0;
  /** When the glide started and how long it takes (a key typed early shortens it). */
  private glideStart = 0;
  private glideMs = 0;
  /** The outline of the key typed last, `<side>/<name>` (the hand poser opens it). */
  lastPose = `left/${HOME}`;

  constructor(private layout: Layout) {
    const id = `hands-${Math.random().toString(36).slice(2, 8)}`;
    this.el = el('svg', { class: 'kb-hands', viewBox: `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`, 'aria-hidden': 'true' }) as SVGSVGElement;
    this.el.style.setProperty('--vx', String(VIEW.x / WIDTH));
    this.el.style.setProperty('--vy', String(VIEW.y / WIDTH));
    this.el.style.setProperty('--vw', String(VIEW.w / WIDTH));
    this.look('on');
    const defs = el('defs', {}, this.el);
    const grad = el('linearGradient', { id: `${id}-fade`, x1: 0, x2: 0, y1: FADE[0], y2: FADE[1], gradientUnits: 'userSpaceOnUse' }, defs);
    el('stop', { offset: 0, 'stop-color': '#fff' }, grad);
    el('stop', { offset: 1, 'stop-color': '#000' }, grad);
    const mask = el('mask', { id: `${id}-mask`, maskUnits: 'userSpaceOnUse', x: VIEW.x - 500, y: VIEW.y, width: VIEW.w + 1000, height: VIEW.h }, defs);
    el('rect', { x: VIEW.x - 500, y: VIEW.y, width: VIEW.w + 1000, height: VIEW.h, fill: `url(#${id}-fade)` }, mask);
    el('feGaussianBlur', { stdDeviation: NAIL_SOFT }, el('filter', { id: `${id}-nail` }, defs));
    const both = el('g', { mask: `url(#${id}-mask)` }, this.el);
    const make = (s: Side) => {
      const g = el('g', { class: `hand-${s}` }, both);
      const layers = [0, 1].map(() => {
        const layer = el('g', { class: 'hand-pose' }, g);
        el('g', { class: 'hand-nails', filter: `url(#${id}-nail)` }, layer);
        el('path', { class: 'hand-creases' }, layer);
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

  /** Another layout or fingering: the poses are named from it again. */
  setLayout(layout: Layout): void {
    this.layout = layout;
    for (const s of ['left', 'right'] as Side[]) this.side[s].shown = '';
    this.update();
  }

  /**
   * How the hands show: their lines' colours and transparency as the hand tool set them (typing, and beside the
   * keyboard), emphasized (`bold`: every line and nail fully drawn) or hidden.
   */
  look(mode: 'on' | 'bold' | 'off'): void {
    this.el.classList.toggle('hands-hidden', mode === 'off');
    for (const [kind, style] of Object.entries(HAND_STYLE)) {
      for (const [part, s] of Object.entries(style)) {
        if ('color' in s) this.el.style.setProperty(`--${kind}-${part}`, s.color);
        this.el.style.setProperty(`--${kind}-${part}-alpha`, String(mode === 'bold' ? 1 : 1 - s.transparency / 100));
      }
    }
  }

  /**
   * The hands go beside the keyboard (on) or onto the keys (off): at once, or gliding for `glideS` seconds through the
   * steps between (`rest1`, `rest2`...), every point of the outline moving smoothly. A glide already on its way there
   * goes on.
   */
  park(on: boolean, glideS = 0): void {
    if (this.place === (on ? 'rest' : 'keys')) return;
    // Already gliding there: it goes on, sped up to end within `glideS` (a key typed before the hands arrived).
    if (this.glideTo === on) {
      const now = performance.now(), done = Math.min(1, (now - this.glideStart) / this.glideMs);
      if (glideS && (1 - done) * this.glideMs > glideS * 1000) {
        this.glideMs = (glideS * 1000) / (1 - done);
        this.glideStart = now - done * this.glideMs;
      }
      return;
    }
    cancelAnimationFrame(this.glideFrame);
    this.glideTo = null;
    if (!glideS || !this.index || document.body.classList.contains('reduce-motion')) {
      this.place = on ? 'rest' : 'keys';
      this.update();
      return;
    }
    this.glideTo = on;
    this.place = 'gliding';
    this.glideStart = performance.now();
    this.glideMs = glideS * 1000;
    void this.glide(on);
  }

  /** The glide: each hand's outline from the one shown through the steps to the end, its numbers blended frame by frame. */
  private async glide(on: boolean): Promise<void> {
    const index = this.index!, keys = poseNames(this.layout, (this.pressed ?? this.next)?.step ?? null, this.lastHand);
    const plan = await Promise.all((['left', 'right'] as Side[]).map(async (s) => {
      const steps = index[s].filter((n) => /^rest\d+$/.test(n)).sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)));
      // Onto the keys straight into the pose of the key due (home when it has none).
      const end = on ? (index[s].includes(REST) ? REST : HOME) : index[s].includes(keys[s]) ? keys[s] : HOME;
      const names = [this.side[s].shown || (on ? HOME : REST), ...(on ? [...steps].reverse() : steps), end];
      const shapes = await Promise.all(names.map((n) => loadShape(s, n)));
      return { s, frames: shapes.every(Boolean) ? morphFrames(shapes as HandShape[]) : null };
    }));
    if (this.glideTo !== on) return;
    const tick = (now: number) => {
      if (this.glideTo !== on) return;
      const t = Math.min(1, Math.max(0, (now - this.glideStart) / this.glideMs)), eased = t * t * (3 - 2 * t);
      for (const { s, frames } of plan) {
        const layer = this.side[s].layers.find((l) => l.classList.contains('on'));
        if (!frames || !layer) continue;
        // The look of the hands beside the keyboard comes and goes half way; the nails come back at the end.
        layer.classList.toggle('off', on ? eased > 0.5 : eased < 0.5);
        layer.querySelector('.hand-lines')!.setAttribute('d', frames.lines(eased));
        layer.querySelector('.hand-creases')!.setAttribute('d', frames.creases(eased));
        layer.querySelector('.hand-nails')!.replaceChildren();
      }
      if (t < 1) {
        this.glideFrame = requestAnimationFrame(tick);
        return;
      }
      this.glideTo = null;
      this.place = on ? 'rest' : 'keys';
      for (const { s } of plan) this.side[s].shown = '';
      this.update();
    };
    this.glideFrame = requestAnimationFrame(tick);
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
    // While gliding the glide draws the outlines.
    if (this.place === 'gliding') return;
    const names = this.place === 'keys' ? poseNames(this.layout, key?.step ?? null, this.lastHand) : { left: REST, right: REST };
    if (key && this.place === 'keys') {
      const hand = handOf(this.layout, key.step.code) ?? (names.left === HOME ? 'right' : 'left');
      this.lastPose = `${hand}/${names[hand]}`;
    }
    for (const s of ['left', 'right'] as Side[]) {
      const fallback = this.place === 'rest' && index[s].includes(REST) ? REST : HOME;
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
    layer.classList.toggle('off', name.startsWith('rest'));
    const lines = layer.querySelector('.hand-lines')!;
    lines.setAttribute('d', shape.lines);
    lines.setAttribute('stroke-width', String(shape.stroke));
    const creases = layer.querySelector('.hand-creases')!;
    creases.setAttribute('d', shape.creases);
    creases.setAttribute('stroke-width', String(shape.creaseStroke));
    const nails = layer.querySelector('.hand-nails')!;
    nails.replaceChildren();
    for (const n of shape.nails) el('path', { d: n.d, fill: FINGER_COLORS[n.finger] }, nails);
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
