import { sprite } from './assets';
import { VH } from '../engine/loop';

export type G = CanvasRenderingContext2D;

export interface SpriteOpts {
  flip?: boolean;
  rot?: number;
  alpha?: number;
  /** Squash and stretch. */
  sx?: number;
  sy?: number;
  /** Anchor inside the image, 0..1 (default center). */
  ax?: number;
  ay?: number;
}

/**
 * Draws a sprite with height `h` at (x, y). Falls back to `fallback` (drawn in a
 * box of the same size, centered on the anchor) when the image is missing.
 */
export function drawSprite(g: G, name: string, x: number, y: number, h: number, o: SpriteOpts = {}, fallback?: (g: G, w: number, h: number) => void): void {
  const img = sprite(name);
  const ratio = img ? img.naturalWidth / img.naturalHeight : 1;
  const w = h * ratio;
  g.save();
  g.translate(x, y);
  if (o.rot) g.rotate(o.rot);
  g.scale((o.flip ? -1 : 1) * (o.sx ?? 1), o.sy ?? 1);
  if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
  const ax = o.ax ?? 0.5, ay = o.ay ?? 0.5;
  if (img) g.drawImage(img, -w * ax, -h * ay, w, h);
  else if (fallback) {
    g.translate(-w * ax + w / 2, -h * ay + h / 2);
    fallback(g, w, h);
  }
  g.restore();
}

export function roundRect(g: G, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath();
  g.roundRect(x, y, w, h, Math.min(r, h / 2, w / 2));
}

/** Friendly blob with a face, used as the procedural fallback for creatures and rocks. */
export function blob(color: string, face = true, accent?: string) {
  return (g: G, w: number, h: number) => {
    const r = Math.min(w, h) * 0.42;
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.beginPath();
    g.ellipse(0, r * 0.95, r * 0.8, r * 0.18, 0, 0, Math.PI * 2);
    g.fill();
    const grad = g.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
    grad.addColorStop(0, lighten(color, 0.35));
    grad.addColorStop(1, color);
    g.fillStyle = grad;
    g.strokeStyle = '#5a3d2b';
    g.lineWidth = Math.max(2, r * 0.06);
    g.beginPath();
    g.ellipse(0, 0, r, r * 0.92, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    if (accent) {
      g.fillStyle = accent;
      for (const [dx, dy, s] of [[-0.4, -0.2, 0.18], [0.35, 0.3, 0.14], [0.1, -0.55, 0.12]]) {
        g.beginPath();
        g.arc(dx * r, dy * r, s * r, 0, Math.PI * 2);
        g.fill();
      }
    }
    if (face) drawFace(g, 0, r * 0.05, r * 0.5);
  };
}

export function drawFace(g: G, x: number, y: number, s: number, happy = false): void {
  g.fillStyle = '#3b2a20';
  for (const dx of [-0.45, 0.45]) {
    g.beginPath();
    if (happy) {
      g.lineWidth = s * 0.1;
      g.strokeStyle = '#3b2a20';
      g.arc(x + dx * s, y, s * 0.16, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    } else {
      g.arc(x + dx * s, y, s * 0.16, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(x + dx * s - s * 0.05, y - s * 0.06, s * 0.06, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#3b2a20';
    }
  }
  g.fillStyle = 'rgba(255,120,140,0.45)';
  for (const dx of [-0.7, 0.7]) {
    g.beginPath();
    g.ellipse(x + dx * s, y + s * 0.3, s * 0.16, s * 0.1, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = '#3b2a20';
  g.lineWidth = s * 0.08;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(x, y + s * 0.2, s * 0.2, Math.PI * 0.15, Math.PI * 0.85);
  g.stroke();
}

export function lighten(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export interface Palette {
  sky: [string, string];
  hills: [string, string];
  ground: string;
  accent: string;
}

export const PALETTES: Record<string, Palette> = {
  meadow: { sky: ['#a8dcf0', '#e6f6fb'], hills: ['#9ccf7a', '#7dbb5e'], ground: '#6aaa4c', accent: '#ffd25a' },
  space: { sky: ['#1d1b4b', '#3d2c6e'], hills: ['#2d3f7a', '#3b2f6b'], ground: '#251f4f', accent: '#ffe27a' },
  planet: { sky: ['#bdf0dc', '#eafbf3'], hills: ['#7fd1c7', '#b49be0'], ground: '#5eb59a', accent: '#f5a3d3' },
  dragons: { sky: ['#ffb48a', '#ffe0c2'], hills: ['#c79a7a', '#a8806a'], ground: '#8fb267', accent: '#ff8a65' },
  egg: { sky: ['#9fd8f5', '#f2fbff'], hills: ['#a5d97f', '#86c465'], ground: '#76b457', accent: '#ffd25a' },
  junkyard: { sky: ['#a8d8f0', '#f4f1e6'], hills: ['#c2a882', '#9e8a6e'], ground: '#8a7a62', accent: '#ff8a65' },
  workshop: { sky: ['#e8c9a0', '#f7e8d2'], hills: ['#c49a6c', '#a87f56'], ground: '#8f6a48', accent: '#ffd84a' },
  raintown: { sky: ['#8fa6bf', '#d5e1ec'], hills: ['#9fb0c4', '#7f93a8'], ground: '#6f8296', accent: '#ffd84a' },
  robocity: { sky: ['#c9b6e8', '#f0e6fb'], hills: ['#b8c4d4', '#9aa8bc'], ground: '#8796a8', accent: '#6ff3ff' },
  robohome: { sky: ['#f2d6b8', '#fff2e2'], hills: ['#d9b48c', '#c49a6c'], ground: '#b07f52', accent: '#ffe27a' },
  garden: { sky: ['#bfe6f5', '#fdf3f7'], hills: ['#a8d98a', '#8cc770'], ground: '#7ab85e', accent: '#f7a8c9' },
  forestpath: { sky: ['#a9d6c2', '#eef8ec'], hills: ['#6fae7a', '#4f8f5e'], ground: '#5d8a4a', accent: '#ffd25a' },
  lilylake: { sky: ['#b8e2f2', '#f1fbff'], hills: ['#8fcfc4', '#5fb3b0'], ground: '#4f9fa8', accent: '#ffd1e6' },
  musictree: { sky: ['#e8c9ec', '#fbf0fb'], hills: ['#b9a6dc', '#9c86c9'], ground: '#7f6aa8', accent: '#ffd25a' },
  moonball: { sky: ['#1f2350', '#4a3a7a'], hills: ['#2f3a6e', '#3b2f6b'], ground: '#2a2456', accent: '#fff3a0' },
};

const seamless = new Map<HTMLImageElement, HTMLCanvasElement>();

/**
 * A copy of a background that repeats without a visible seam: its last part is
 * cross-faded into its beginning, and the copy is shorter by that part.
 */
function seamlessCopy(img: HTMLImageElement): HTMLCanvasElement {
  let c = seamless.get(img);
  if (c) return c;
  const w = img.naturalWidth, h = img.naturalHeight;
  const overlap = Math.round(w * 0.15);
  c = document.createElement('canvas');
  c.width = w - overlap;
  c.height = h;
  const g = c.getContext('2d')!;
  g.drawImage(img, 0, 0);
  // Fade the start of the image out and add its end faded in: a linear cross-fade
  // that also works for layers with transparency.
  g.globalCompositeOperation = 'destination-out';
  const fade = g.createLinearGradient(0, 0, overlap, 0);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fade;
  g.fillRect(0, 0, overlap, h);
  g.globalCompositeOperation = 'lighter';
  const strip = document.createElement('canvas');
  strip.width = overlap;
  strip.height = h;
  const sg = strip.getContext('2d')!;
  sg.drawImage(img, w - overlap, 0, overlap, h, 0, 0, overlap, h);
  sg.globalCompositeOperation = 'destination-in';
  const grad = sg.createLinearGradient(0, 0, overlap, 0);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sg.fillStyle = grad;
  sg.fillRect(0, 0, overlap, h);
  g.drawImage(strip, 0, 0);
  seamless.set(img, c);
  return c;
}

const fitted = new Map<HTMLCanvasElement, { px: number; c: HTMLCanvasElement }>();

/** The tile scaled once to the pixel height it is drawn at, so each frame is a plain 1:1 copy. */
function fittedTile(tile: HTMLCanvasElement, px: number): HTMLCanvasElement {
  if (px >= tile.height) return tile;
  const hit = fitted.get(tile);
  if (hit && hit.px === px) return hit.c;
  const c = document.createElement('canvas');
  c.width = Math.round(tile.width * px / tile.height);
  c.height = px;
  const cg = c.getContext('2d')!;
  cg.imageSmoothingQuality = 'high';
  cg.drawImage(tile, 0, 0, c.width, px);
  fitted.set(tile, { px, c });
  return c;
}

/** Draws a background layer at full screen height, repeated horizontally by `offset`. */
function tiled(g: G, img: HTMLImageElement, vw: number, offset: number): void {
  const full = seamlessCopy(img);
  const s = VH / full.height;
  const tile = fittedTile(full, Math.round(VH * g.getTransform().d));
  const w = full.width * s, h = full.height * s;
  const y = VH - h;
  // Sub-pixel positions: rounding made slow layers move in visible jumps.
  for (let x = -(((offset % w) + w) % w); x < vw; x += w) g.drawImage(tile, x, y, w + 1, h);
}

/** Three-layer parallax background of a world; `scroll` grows as the scene moves forward. */
export function drawBackground(g: G, world: string, vw: number, scroll: number, motion = true): void {
  const pal = PALETTES[world] ?? PALETTES.meadow;
  const far = sprite(`bg-${world}-far`);
  if (far) tiled(g, far, vw, motion ? scroll * 0.1 : 0);
  else {
    const grad = g.createLinearGradient(0, 0, 0, VH);
    grad.addColorStop(0, pal.sky[0]);
    grad.addColorStop(1, pal.sky[1]);
    g.fillStyle = grad;
    g.fillRect(0, 0, vw, VH);
    if (world === 'space') starField(g, vw, scroll * 0.1);
  }
  if (world === 'space') {
    // Calm the busy sky so words stay readable.
    g.fillStyle = 'rgba(24,18,60,0.35)';
    g.fillRect(0, 0, vw, VH);
  }
  g.save();
  if (world === 'space') g.globalAlpha = 0.4;
  const mid = sprite(`bg-${world}-mid`);
  if (mid) tiled(g, mid, vw, motion ? scroll * 0.35 : 0);
  else hills(g, vw, scroll * 0.35, VH * 0.62, 70, pal.hills[0]);
  const near = sprite(`bg-${world}-near`);
  if (near) tiled(g, near, vw, motion ? scroll : 0);
  else if (world !== 'space') hills(g, vw, scroll, VH * 0.82, 30, pal.hills[1]);
  g.restore();
}

function hills(g: G, vw: number, offset: number, base: number, amp: number, color: string): void {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, VH);
  for (let x = 0; x <= vw + 20; x += 20) {
    const u = (x + offset) / 260;
    g.lineTo(x, base - Math.sin(u) * amp * 0.6 - Math.sin(u * 0.37 + 1) * amp * 0.4);
  }
  g.lineTo(vw, VH);
  g.closePath();
  g.fill();
}

function starField(g: G, vw: number, offset: number): void {
  g.fillStyle = '#fff';
  for (let i = 0; i < 90; i++) {
    const x = ((((i * 97.13) % 1) * 4000 - offset) % vw + vw) % vw;
    const y = ((i * 53.7) % VH);
    g.globalAlpha = 0.3 + ((i * 7) % 10) / 14;
    g.beginPath();
    g.arc(x, y, 1 + (i % 3) * 0.6, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

let font = '';

/** The game font; read once per look change, since a style read every frame forces a style recalc. */
export function fontFamily(): string {
  return (font ||= getComputedStyle(document.body).getPropertyValue('--font-game').trim() || 'Lexend, system-ui, sans-serif');
}

export function resetFontFamily(): void {
  font = '';
}

export interface WordStyle {
  size?: number;
  highContrast?: boolean;
  locked?: boolean;
  /** Letters not typed yet are dots (spaces stay gaps). */
  masked?: boolean;
  /** A small sign left of the letters: a speaker (dictation) or a ring that empties (memory, 0..1 left). */
  icon?: { kind: 'speaker' } | { kind: 'ring'; left: number };
}

function letterWidths(g: G, word: string, size: number): number[] {
  g.font = `600 ${size}px ${fontFamily()}`;
  // A space is wide enough to see its dot and to be its own step.
  return [...word].map((c) => (c === ' ' ? size * 0.5 : g.measureText(c).width + size * 0.08));
}

/** Room the icon of a label takes. */
const ICON_W = 0.85;

/** Width and height of a word label as `drawWord` draws it. */
export function wordBox(g: G, word: string, size = 40, icon = false): { w: number; h: number } {
  g.save();
  const total = letterWidths(g, word, size).reduce((a, b) => a + b, 0);
  g.restore();
  return { w: total + size * (0.9 + (icon ? ICON_W : 0)), h: size * 1.45 };
}

/** Word label on a target: typed letters in green, the next letter highlighted, gentle wobble on a mistake. */
export function drawWord(g: G, word: string, typed: number, x: number, y: number, wobble: number, st: WordStyle = {}): void {
  const size = st.size ?? 40;
  g.save();
  const chars = [...word];
  const widths = letterWidths(g, word, size);
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  const total = widths.reduce((a, b) => a + b, 0);
  const iconW = st.icon ? size * ICON_W : 0;
  const padX = size * 0.45, h = size * 1.45;
  const shake = wobble > 0 ? Math.sin(wobble * 60) * 5 * (wobble / 0.35) : 0;
  const bx = x - (total + iconW) / 2 - padX + shake;
  g.shadowColor = 'rgba(40,30,20,0.25)';
  g.shadowBlur = 8;
  g.shadowOffsetY = 3;
  g.fillStyle = st.highContrast ? '#ffffff' : 'rgba(255,253,246,0.94)';
  roundRect(g, bx, y - h / 2, total + iconW + padX * 2, h, h / 2);
  g.fill();
  g.shadowColor = 'transparent';
  g.lineWidth = st.locked ? 4 : 2.5;
  g.strokeStyle = st.locked ? '#ffb23e' : st.highContrast ? '#000' : 'rgba(90,61,43,0.55)';
  g.stroke();
  if (st.icon) drawLabelIcon(g, st.icon, bx + padX + size * 0.3, y, size, !!st.highContrast);
  let cx = bx + padX + iconW;
  chars.forEach((c, i) => {
    const w = widths[i];
    if (i < typed) g.fillStyle = st.highContrast ? '#006b2e' : '#3fa65a';
    else if (i === typed) {
      g.fillStyle = st.highContrast ? '#ffe066' : '#ffe9b0';
      roundRect(g, cx - size * 0.04, y - size * 0.62, w, size * 1.24, size * 0.2);
      g.fill();
      g.fillStyle = wobble > 0 ? '#d9534f' : '#2d2140';
    } else g.fillStyle = st.highContrast ? '#000' : '#4a3a5c';
    if (c === ' ') {
      // A light dot shows the space to type; a hidden target keeps a plain gap.
      if (!st.masked || i < typed) {
        g.save();
        g.globalAlpha *= i === typed ? 0.8 : 0.4;
        g.beginPath();
        g.arc(cx + w / 2 - size * 0.02, y + size * 0.08, size * 0.07, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
    } else if (st.masked && i >= typed) {
      g.beginPath();
      g.arc(cx + w / 2 - size * 0.04, y + size * 0.04, size * 0.12, 0, Math.PI * 2);
      g.fill();
    } else g.fillText(c, cx, y + size * 0.04);
    cx += w;
  });
  g.restore();
}

/** The speaker of a dictated target, or the ring of a memory target that empties while it shows. */
function drawLabelIcon(g: G, icon: NonNullable<WordStyle['icon']>, cx: number, y: number, size: number, highContrast: boolean): void {
  const ink = highContrast ? '#000' : '#5a3d2b';
  const r = size * 0.28;
  g.save();
  g.fillStyle = ink;
  g.strokeStyle = ink;
  g.lineCap = 'round';
  if (icon.kind === 'speaker') {
    g.beginPath();
    g.moveTo(cx - r, y - r * 0.4);
    g.lineTo(cx - r * 0.45, y - r * 0.4);
    g.lineTo(cx + r * 0.15, y - r);
    g.lineTo(cx + r * 0.15, y + r);
    g.lineTo(cx - r * 0.45, y + r * 0.4);
    g.lineTo(cx - r, y + r * 0.4);
    g.closePath();
    g.fill();
    g.lineWidth = size * 0.06;
    for (const k of [0.55, 0.95]) {
      g.beginPath();
      g.arc(cx + r * 0.15, y, r * k + r * 0.2, -Math.PI / 4, Math.PI / 4);
      g.stroke();
    }
  } else {
    g.lineWidth = size * 0.09;
    g.globalAlpha = 0.25;
    g.beginPath();
    g.arc(cx, y, r, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
    g.strokeStyle = highContrast ? '#000' : '#ffb23e';
    g.beginPath();
    g.arc(cx, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, icon.left)));
    g.stroke();
  }
  g.restore();
}
