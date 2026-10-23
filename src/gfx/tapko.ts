import type { Companion, CompanionKind } from '../storage/schema';
import { accessories, hasImage, imageUrl, sprite, type Slot } from './assets';
import { drawFace, type G } from './draw';

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
}

/**
 * Draws the companion with its accessories. (x, y) is the point between the feet;
 * `size` is the height of the square template image.
 */
export function drawTapko(g: G, c: Companion, mood: Mood, x: number, y: number, size: number, m: TapkoMotion): void {
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
  for (const layer of tapkoStack(c, mood)) {
    const img = sprite(layer.name);
    if (img) g.drawImage(img, 0, 0, size, size);
    else if (layer.slot === 'companion') drawFallbackBody(g, c.kind, mood, size);
    else drawFallbackAccessory(g, layer.slot, size);
  }
  g.restore();
}

function drawFallbackBody(g: G, kind: CompanionKind, mood: Mood, s: number): void {
  const [main, belly] = KIND_COLORS[kind];
  g.strokeStyle = '#5a3d2b';
  g.lineWidth = s * 0.012;
  g.fillStyle = main;
  for (const [cx, cy, rx, ry] of [[0.4, 0.86, 0.07, 0.05], [0.6, 0.86, 0.07, 0.05], [0.29, 0.64, 0.06, 0.06], [0.71, 0.64, 0.06, 0.06], [0.5, 0.66, 0.2, 0.2], [0.5, 0.36, 0.25, 0.22]]) {
    g.beginPath();
    g.ellipse(cx * s, cy * s, rx * s, ry * s, 0, 0, Math.PI * 2);
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
  else if (slot === 'back') { g.ellipse(0.22 * s, 0.55 * s, 0.1 * s, 0.14 * s, -0.5, 0, Math.PI * 2); g.ellipse(0.78 * s, 0.55 * s, 0.1 * s, 0.14 * s, 0.5, 0, Math.PI * 2); }
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
