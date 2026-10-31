import type { Companion, CompanionKind } from '../storage/schema';
import { accessories, hasImage, imageUrl, sprite, type Slot } from './assets';
import { drawFace, drawSprite, evictOldest, type G } from './draw';

/** `surprised` is optional art, used only in story 2's meeting scene. */
export type Mood = 'idle' | 'happy' | 'thinking' | 'surprised';

/** A random mood other than `current` that has a picture for this kind (`surprised` is optional art). */
export function otherMood(kind: CompanionKind, current: Mood): Mood {
  const moods = (['idle', 'happy', 'thinking', 'surprised'] as Mood[])
    .filter((m) => m !== current && (m !== 'surprised' || hasImage(`tapko-${kind}-surprised`)));
  return moods[Math.floor(Math.random() * moods.length)];
}

/** Draw order of accessory slots around the companion image. */
export const SLOT_ORDER: (Slot | 'companion')[] = ['back', 'companion', 'feet', 'body', 'neck', 'hand', 'eyes', 'head'];
export const SLOTS: Slot[] = ['head', 'eyes', 'neck', 'body', 'back', 'hand', 'feet'];

/** For every body area: half the time nothing, else one of the items of that area that `has` allows. */
export function randomOutfit(has: (id: string) => boolean, rand: () => number = Math.random): string[] {
  return SLOTS.flatMap((slot) => {
    const owned = accessories().filter((a) => a.slot === slot && has(a.id));
    if (!owned.length || rand() < 0.5) return [];
    return [owned[Math.floor(rand() * owned.length)].id];
  });
}

const KIND_COLORS: Record<CompanionKind, [string, string]> = {
  fox: ['#f28a3c', '#fbe6c8'], cat: ['#b7bcc4', '#ffffff'], bunny: ['#f6e4cc', '#ffffff'], owl: ['#6fb5ad', '#f4ead2'],
  dog: ['#e3b46c', '#ffffff'], bear: ['#a8703f', '#e5c49a'], panda: ['#f5f5f5', '#2f2f35'], penguin: ['#4a5878', '#ffffff'], lion: ['#e8b544', '#f5e3b3'],
};

/** Paw and toe-bean colors of a kind (Tapko's paws on the keyboard). */
export function pawColors(kind: CompanionKind): [string, string] {
  const [main, belly] = KIND_COLORS[kind];
  // A panda's paws are its dark color.
  return kind === 'panda' ? [belly, '#f4a9b8'] : [main, '#f4a9b8'];
}

const FALLBACK_ACC: Record<Slot, string> = { head: '#e0574f', eyes: '#f29a38', neck: '#4f8fd6', body: '#7bb661', back: '#a5d8f3', hand: '#ffd25a', feet: '#c0504d' };

export function slotOf(accId: string): Slot | null {
  return accessories().find((a) => a.id === accId)?.slot ?? null;
}

/** Image names of the stack, back to front. */
export function tapkoStack(c: Companion, mood: Mood): { name: string; slot: Slot | 'companion' }[] {
  const bySlot = new Map<Slot, string>();
  for (const id of c.accessories) {
    const slot = slotOf(id);
    if (slot) bySlot.set(slot, `acc-${id}`);
  }
  return SLOT_ORDER.flatMap((slot): { name: string; slot: Slot | 'companion' }[] => {
    if (slot === 'companion') return [{ name: `tapko-${c.kind}-${mood}`, slot }];
    const name = bySlot.get(slot);
    const layers: { name: string; slot: Slot | 'companion' }[] = name ? [{ name, slot }] : [];
    // A back item's front part (a cape's clasp) lies over the body.
    const back = bySlot.get('back');
    if (slot === 'body' && back && hasImage(`${back}-front`)) layers.push({ name: `${back}-front`, slot: 'back' });
    return layers;
  });
}

/** Every picture of the companion in a level: each mood and everything it wears. */
export function tapkoPictures(c: Companion): string[] {
  return (['idle', 'happy', 'thinking', 'surprised'] as Mood[]).flatMap((mood) => tapkoStack(c, mood).map((l) => l.name));
}

export interface TapkoMotion {
  /** Seconds, drives breathing and sway. */
  t: number;
  /** 0..1 jump progress (0 = standing). */
  jump?: number;
  /** The jump's height as a share of `size` (0.35 by default). */
  height?: number;
  /** 0..1 of a whole turn around the body's middle (a flip in the air). */
  spin?: number;
  flip?: boolean;
  alpha?: number;
  /** false leaves out the ground shadow (Tapko off the ground, in a vehicle). */
  shadow?: boolean;
  /** He carries the dragon egg on his back (world 5): it peeks over his right shoulder, behind everything he wears. */
  carry?: 'egg';
  /** 0..1 of the egg's peek: 0 at rest (a third of it shows), 1 risen (two thirds show). */
  peek?: number;
  /** The egg's extra tilt while it peeks (radians, a little wobble). */
  wobble?: number;
}

/** Tapko's layers put together, least recently drawn first: a frame draws one picture instead of one per accessory. */
const stacks = new Map<string, HTMLCanvasElement>();
const STACKS_KEEP = 6;

/** The layers drawn together at `px` device pixels; null while one is still loading. */
function stackCanvas(layers: { name: string }[], px: number): HTMLCanvasElement | null {
  const key = `${layers.map((l) => l.name).join(' ')}|${px}`;
  let c = stacks.get(key);
  if (c) stacks.delete(key);
  else {
    const imgs = layers.map((l) => sprite(l.name));
    if (imgs.some((img) => !img)) return null;
    c = document.createElement('canvas');
    c.width = c.height = px;
    const cg = c.getContext('2d')!;
    for (const img of imgs) cg.drawImage(img!, 0, 0, px, px);
    if (stacks.size >= STACKS_KEEP) evictOldest(stacks);
  }
  stacks.set(key, c);
  return c;
}

/**
 * The egg on his back (`carry: 'egg'`): its picture's height, its middle's y as shares of his
 * picture (behind his back, at his belly's height), its tilt outward, and the share of it that shows
 * past his left side (the viewer's left, away from what comes from the right) at rest and while it peeks.
 */
const EGG = 'obj-egg-plain';
const EGG_H = 0.27;
const EGG_Y = 0.62;
const EGG_TILT = -0.26;
export const EGG_REST = 1 / 3;
export const EGG_PEEK = 2 / 3;
/** Its middle starts behind his middle, goes no further left than the picture's edge, and slides out at most this share of its height to peek. */
const EGG_START = 0.5;
const EGG_SLIDE = 0.5;
/** The egg picture's width per height (401 x 512); its outline is about this oval. */
const EGG_RATIO = 401 / 512;
/** Side of the silhouette mask the egg's place is found on. */
const MASK = 96;

/** Is (x, y) inside the egg (shares of the picture) whose middle is at (cx, cy)? */
function inEgg(x: number, y: number, cx: number, cy: number): boolean {
  const c = Math.cos(EGG_TILT), s = Math.sin(EGG_TILT), dx = x - cx, dy = y - cy;
  const u = (dx * c + dy * s) / (EGG_H * EGG_RATIO * 0.5), v = (-dx * s + dy * c) / (EGG_H * 0.5);
  return u * u + v * v <= 1;
}

/** The share of the egg, its middle at (cx, EGG_Y), that no opaque pixel of the silhouette (`mask`, n x n, 1 = opaque) covers. */
export function eggVisible(mask: Uint8Array, n: number, cx: number): number {
  let all = 0, shown = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (!inEgg((x + 0.5) / n, (y + 0.5) / n, cx, EGG_Y)) continue;
    all++;
    if (!mask[y * n + x]) shown++;
  }
  return all ? shown / all : 0;
}

/** The egg's middle x at rest (share of the picture): slid left from behind his middle until `EGG_REST` of it shows. */
export function eggRest(mask: Uint8Array, n: number): number {
  let cx = EGG_START;
  while (cx - 1 / n >= 0 && eggVisible(mask, n, cx) < EGG_REST) cx -= 1 / n;
  return cx;
}

/** Peeking, it slides left from `rest` until `EGG_PEEK` of it shows, at most `EGG_SLIDE` of its height. */
export function eggPeek(mask: Uint8Array, n: number, rest: number): number {
  let cx = rest;
  while (cx > rest - EGG_SLIDE * EGG_H && eggVisible(mask, n, cx) < EGG_PEEK) cx -= 1 / n;
  return cx;
}

/** An opaque silhouette (n x n, 1 = alpha over a half) of ovals given in shares of the picture. */
export function ovalMask(ovals: Oval[], n: number, mask = new Uint8Array(n * n)): Uint8Array {
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const px = (x + 0.5) / n, py = (y + 0.5) / n;
    if (ovals.some(([cx, cy, rx, ry, rot]) => {
      const c = Math.cos(rot), s = Math.sin(rot), dx = px - cx, dy = py - cy;
      const u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry;
      return u * u + v * v <= 1;
    })) mask[y * n + x] = 1;
  }
  return mask;
}

/** The egg's middle at rest and peeking, per outfit (his idle stack) and which of its pictures were there. */
const eggPlaces = new Map<string, { rest: number; peek: number }>();

/** The egg's place for this outfit, from the union of everything he wears: drawn pictures, else their fallbacks' ovals. */
function eggPlace(c: Companion): { rest: number; peek: number } {
  const layers = tapkoStack(c, 'idle');
  const imgs = layers.map((l) => sprite(l.name));
  const key = layers.map((l, i) => `${l.name}${imgs[i] ? '' : '?'}`).join(' ');
  let place = eggPlaces.get(key);
  if (place) return place;
  const mask = new Uint8Array(MASK * MASK);
  const cv = document.createElement('canvas');
  cv.width = cv.height = MASK;
  const cg = cv.getContext('2d', { willReadFrequently: true })!;
  layers.forEach((l, i) => {
    const img = imgs[i];
    if (img) cg.drawImage(img, 0, 0, MASK, MASK);
    else if (l.slot === 'companion') ovalMask(FALLBACK_BODY, MASK, mask);
    else if (l.slot === 'back') ovalMask(FALLBACK_BACK, MASK, mask);
  });
  const px = cg.getImageData(0, 0, MASK, MASK).data;
  for (let i = 0; i < mask.length; i++) if (px[i * 4 + 3] > 127) mask[i] = 1;
  const rest = eggRest(mask, MASK);
  place = { rest, peek: eggPeek(mask, MASK, rest) };
  eggPlaces.set(key, place);
  return place;
}

/** Where the egg's middle is on the stage for Tapko standing at (x, y) at `size` (no sway): where it is lifted off his back. */
export function eggSpot(c: Companion, x: number, y: number, size: number): { x: number; y: number; h: number; rot: number } {
  return { x: x + (eggPlace(c).rest - 0.5) * size, y: y + (EGG_Y - 0.9) * size, h: EGG_H * size, rot: EGG_TILT };
}

/** The egg in his picture's own units (the stack's square, `size` high), behind the stack. */
function drawEgg(g: G, c: Companion, size: number, m: TapkoMotion): void {
  const place = eggPlace(c), k = m.peek ?? 0;
  const cx = place.rest + (place.peek - place.rest) * k;
  drawSprite(g, EGG, cx * size, EGG_Y * size, EGG_H * size, { rot: EGG_TILT + (m.wobble ?? 0) }, eggFallback);
}

/** The egg while its picture is missing: a cream oval with turquoise spots. */
export function eggFallback(g: G, w: number, h: number): void {
  g.save();
  g.fillStyle = '#fbf1dc';
  g.strokeStyle = '#6d5040';
  g.lineWidth = Math.max(1.5, h * 0.02);
  g.beginPath();
  g.ellipse(0, 0, w * 0.48, h * 0.48, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#6cc7c0';
  for (const [dx, dy, r] of [[-0.15, -0.2, 0.08], [0.18, -0.05, 0.07], [-0.05, 0.18, 0.09], [0.2, 0.25, 0.05]]) {
    g.beginPath();
    g.arc(dx * w, dy * h, r * h, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/**
 * Draws the companion with its accessories. (x, y) is the point between the feet;
 * `size` is the height of the square template image.
 */
export function drawTapko(g: G, c: Companion, mood: Mood, x: number, y: number, size: number, m: TapkoMotion): void {
  const t0 = g.getTransform();
  const px = Math.ceil(size * Math.hypot(t0.a, t0.b));
  const breathe = Math.sin(m.t * 2.4) * 0.018;
  const jumpH = m.jump ? Math.sin(m.jump * Math.PI) * size * (m.height ?? 0.35) : 0;
  const squash = m.jump ? 1 + Math.sin(m.jump * Math.PI * 2) * 0.05 : 1;
  const sway = Math.sin(m.t * 1.3) * 0.025;
  g.save();
  if (m.alpha !== undefined) g.globalAlpha *= m.alpha;
  // Soft shadow on the ground.
  if (m.shadow !== false) {
    g.fillStyle = 'rgba(30,20,10,0.16)';
    g.beginPath();
    g.ellipse(x, y, size * 0.2 * (1 - jumpH / size), size * 0.04, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.translate(x, y - jumpH);
  if (m.spin) {
    g.translate(0, -size * 0.45);
    g.rotate(m.spin * Math.PI * 2);
    g.translate(0, size * 0.45);
  }
  g.rotate(sway);
  g.scale((m.flip ? -1 : 1) * (1 - breathe) / squash, (1 + breathe) * squash);
  // The template's feet sit at 90 % of the image height.
  g.translate(-size / 2, -size * 0.9);
  if (m.carry === 'egg') drawEgg(g, c, size, m);
  const layers = tapkoStack(c, mood);
  const stack = stackCanvas(layers, px);
  if (stack) g.drawImage(stack, 0, 0, size, size);
  else for (const layer of layers) {
    const img = sprite(layer.name);
    if (img) g.drawImage(img, 0, 0, size, size);
    else if (layer.slot === 'companion') drawFallbackBody(g, c.kind, mood, size);
    else drawFallbackAccessory(g, layer.slot, size);
  }
  g.restore();
}

/** An ellipse of a fallback drawing in shares of the picture: middle, radii and turn. */
export type Oval = [cx: number, cy: number, rx: number, ry: number, rot: number];
/** The fallback body: feet, paws, belly and head. */
export const FALLBACK_BODY: Oval[] = [[0.4, 0.86, 0.07, 0.05, 0], [0.6, 0.86, 0.07, 0.05, 0], [0.29, 0.64, 0.06, 0.06, 0], [0.71, 0.64, 0.06, 0.06, 0], [0.5, 0.66, 0.2, 0.2, 0], [0.5, 0.36, 0.25, 0.22, 0]];
/** The fallback back item: two wings. */
export const FALLBACK_BACK: Oval[] = [[0.22, 0.55, 0.1, 0.14, -0.5], [0.78, 0.55, 0.1, 0.14, 0.5]];

function drawFallbackBody(g: G, kind: CompanionKind, mood: Mood, s: number): void {
  const [main, belly] = KIND_COLORS[kind];
  g.strokeStyle = '#5a3d2b';
  g.lineWidth = s * 0.012;
  g.fillStyle = main;
  for (const [cx, cy, rx, ry, rot] of FALLBACK_BODY) {
    g.beginPath();
    g.ellipse(cx * s, cy * s, rx * s, ry * s, rot, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  g.fillStyle = belly;
  g.beginPath();
  g.ellipse(0.5 * s, 0.7 * s, 0.12 * s, 0.13 * s, 0, 0, Math.PI * 2);
  g.fill();
  drawFace(g, 0.5 * s, 0.38 * s, 0.1 * s, mood === 'happy');
}

function drawFallbackAccessory(g: G, slot: Slot, s: number): void {
  g.fillStyle = FALLBACK_ACC[slot];
  g.strokeStyle = '#5a3d2b';
  g.lineWidth = s * 0.01;
  g.beginPath();
  if (slot === 'head') g.ellipse(0.5 * s, 0.16 * s, 0.17 * s, 0.07 * s, 0, 0, Math.PI * 2);
  else if (slot === 'eyes') { g.lineWidth = s * 0.015; g.strokeStyle = FALLBACK_ACC.eyes; g.arc(0.4 * s, 0.37 * s, 0.06 * s, 0, 7); g.moveTo(0.66 * s, 0.37 * s); g.arc(0.6 * s, 0.37 * s, 0.06 * s, 0, 7); g.stroke(); return; }
  else if (slot === 'neck') g.ellipse(0.5 * s, 0.53 * s, 0.15 * s, 0.035 * s, 0, 0, Math.PI * 2);
  else if (slot === 'body') g.ellipse(0.5 * s, 0.67 * s, 0.17 * s, 0.13 * s, 0, 0, Math.PI * 2);
  else if (slot === 'back') for (const [cx, cy, rx, ry, rot] of FALLBACK_BACK) { g.ellipse(cx * s, cy * s, rx * s, ry * s, rot, 0, Math.PI * 2); }
  else if (slot === 'hand') g.arc(0.78 * s, 0.6 * s, 0.05 * s, 0, Math.PI * 2);
  else { g.ellipse(0.4 * s, 0.88 * s, 0.08 * s, 0.04 * s, 0, 0, Math.PI * 2); g.ellipse(0.6 * s, 0.88 * s, 0.08 * s, 0.04 * s, 0, 0, Math.PI * 2); }
  g.fill();
  g.stroke();
}

/** DOM version for menus: stacked images with CSS animation; fallback renders a small canvas. */
export function tapkoElement(c: Companion, mood: Mood = 'idle', size = 160): HTMLElement {
  const el = document.createElement('div');
  el.className = 'tapko-stack';
  el.style.setProperty('--size', `${size}px`);
  renderTapkoInto(el, c, mood);
  return el;
}

export function renderTapkoInto(el: HTMLElement, c: Companion, mood: Mood): void {
  const stack = tapkoStack(c, mood);
  if (stack.every((l) => imageUrl(l.name))) {
    el.replaceChildren(...stack.map((l) => {
      const img = document.createElement('img');
      img.src = imageUrl(l.name)!;
      img.alt = '';
      img.draggable = false;
      return img;
    }));
  } else {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    drawTapko(cv.getContext('2d')!, c, mood, 128, 230, 256, { t: 0 });
    el.replaceChildren(cv);
  }
}
