import { hasImage, imageUrl, sprite } from './assets';
import type { G } from './draw';

/** Melody's moods: she sings the dictated words, looks curious at a mistake and twirls at a finished word. */
export type FairyMood = 'idle' | 'happy' | 'singing' | 'curious';

/** The image of a mood; a missing mood falls back to the idle picture. */
export function fairyImage(mood: FairyMood): string {
  const name = `fairy-${mood}`;
  return hasImage(name) || !hasImage('fairy-idle') ? name : 'fairy-idle';
}

/**
 * Draws Melody floating with her feet at (x, y), `size` high. The pictures are square with
 * the feet near the bottom; without them a small fairy with shimmering wings is drawn.
 * `spin` 0..1 is a twirl (a happy word).
 */
export function drawFairy(g: G, mood: FairyMood, x: number, y: number, size: number, t: number, spin = 0): void {
  const bob = Math.sin(t * 2.2) * size * 0.05;
  g.save();
  // Her soft glow on the ground below.
  g.fillStyle = 'rgba(255,240,180,0.22)';
  g.beginPath();
  g.ellipse(x, y + size * 0.5, size * 0.2, size * 0.04, 0, 0, Math.PI * 2);
  g.fill();
  g.translate(x, y + bob);
  if (spin > 0) g.scale(Math.cos(spin * Math.PI * 2), 1);
  if (mood === 'curious') g.rotate(-0.12);
  const img = sprite(fairyImage(mood));
  if (img) g.drawImage(img, -size / 2, -size * 0.95, size, size);
  else fairyFallback(g, mood, size, t);
  if (mood === 'singing') notes(g, size, t);
  g.restore();
}

function fairyFallback(g: G, mood: FairyMood, s: number, t: number): void {
  // Two pairs of wings that shimmer.
  const shimmer = 0.45 + Math.sin(t * 9) * 0.15;
  for (const side of [-1, 1]) {
    g.fillStyle = `rgba(190,230,255,${shimmer})`;
    g.strokeStyle = 'rgba(140,170,230,0.8)';
    g.lineWidth = s * 0.01;
    g.beginPath();
    g.ellipse(side * s * 0.16, -s * 0.52, s * 0.15, s * 0.09, side * -0.6, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = `rgba(255,210,245,${shimmer})`;
    g.beginPath();
    g.ellipse(side * s * 0.12, -s * 0.38, s * 0.1, s * 0.06, side * 0.5, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  // Petal dress.
  g.fillStyle = '#f4a6c8';
  g.strokeStyle = '#b05f8a';
  g.lineWidth = s * 0.012;
  g.beginPath();
  g.moveTo(0, -s * 0.5);
  g.quadraticCurveTo(-s * 0.16, -s * 0.28, -s * 0.13, -s * 0.2);
  g.quadraticCurveTo(0, -s * 0.15, s * 0.13, -s * 0.2);
  g.quadraticCurveTo(s * 0.16, -s * 0.28, 0, -s * 0.5);
  g.fill();
  g.stroke();
  // Legs.
  g.strokeStyle = '#e9b78f';
  g.lineWidth = s * 0.025;
  for (const dx of [-0.04, 0.04]) {
    g.beginPath();
    g.moveTo(dx * s, -s * 0.19);
    g.lineTo(dx * s * 1.3, -s * 0.06);
    g.stroke();
  }
  // Arms: up when happy, one at the chin when curious.
  for (const side of [-1, 1]) {
    const up = mood === 'happy' || (mood === 'singing' && side === 1);
    g.beginPath();
    g.moveTo(side * s * 0.05, -s * 0.44);
    g.lineTo(side * s * 0.15, -s * (up ? 0.6 : mood === 'curious' && side === 1 ? 0.52 : 0.32));
    g.stroke();
  }
  // Head and lavender hair with a flower.
  const hy = -s * 0.62;
  g.fillStyle = '#b79be8';
  g.beginPath();
  g.arc(0, hy - s * 0.01, s * 0.12, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffe2cc';
  g.beginPath();
  g.arc(0, hy + s * 0.02, s * 0.09, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffd25a';
  g.beginPath();
  g.arc(s * 0.08, hy - s * 0.09, s * 0.03, 0, Math.PI * 2);
  g.fill();
  // Face.
  g.fillStyle = g.strokeStyle = '#5a3a5e';
  g.lineWidth = s * 0.01;
  for (const dx of [-0.035, 0.035]) {
    g.beginPath();
    if (mood === 'happy') {
      g.arc(dx * s, hy + s * 0.02, s * 0.014, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    } else {
      g.arc(dx * s, hy + s * 0.015, s * (mood === 'curious' ? 0.016 : 0.012), 0, Math.PI * 2);
      g.fill();
    }
  }
  g.beginPath();
  if (mood === 'singing') g.arc(0, hy + s * 0.055, s * 0.016, 0, Math.PI * 2);
  else g.arc(0, hy + s * 0.045, s * 0.022, 0.15 * Math.PI, 0.85 * Math.PI);
  if (mood === 'singing') g.fill();
  else g.stroke();
}

/** Little notes rising while she sings. */
function notes(g: G, s: number, t: number): void {
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#ffffff';
  g.lineWidth = s * 0.012;
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.7 + i / 3) % 1;
    const nx = s * (0.18 + i * 0.07) + Math.sin(k * 6 + i) * s * 0.03, ny = -s * (0.7 + k * 0.35);
    g.globalAlpha = 1 - k;
    g.beginPath();
    g.ellipse(nx, ny, s * 0.025, s * 0.018, -0.4, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(nx + s * 0.022, ny);
    g.lineTo(nx + s * 0.022, ny - s * 0.07);
    g.stroke();
  }
  g.globalAlpha = 1;
}

/** DOM version for scenes and the friends screen: the picture, else a small canvas. */
export function fairyElement(mood: FairyMood, size: number): HTMLElement {
  const src = imageUrl(fairyImage(mood));
  const el = document.createElement('div');
  el.className = 'robot-stack fairy-stack';
  el.style.setProperty('--size', `${size}px`);
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.draggable = false;
    el.append(img);
  } else {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    drawFairy(cv.getContext('2d')!, mood, 128, 246, 256, 0);
    el.append(cv);
  }
  return el;
}
