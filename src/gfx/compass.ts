import { imageUrl } from './assets';
import type { G } from './draw';

/** The compass: the hero's journey's picture (its map node and end card) and a thing at the target range. */
export const COMPASS = 'obj-aim-compass';

/** A gold compass with a compass rose and a diagonal red needle in a box of `w` x `h` around (0, 0), until its picture is there. */
export function drawCompass(g: G, w: number, h: number): void {
  const r = Math.min(w, h) / 2;
  g.save();
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(90,61,43,0.7)';
  g.lineWidth = Math.max(1.5, r * 0.05);
  // The gold case and the face.
  g.fillStyle = '#f6c945';
  g.beginPath();
  g.arc(0, 0, r * 0.9, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#fff6dc';
  g.beginPath();
  g.arc(0, 0, r * 0.7, 0, Math.PI * 2);
  g.fill();
  // The compass rose: four long points to the sides of the world, four short ones between them.
  g.fillStyle = '#b07a45';
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8, len = i % 4 === 0 ? 0.62 : i % 2 === 0 ? 0.36 : 0.12;
    g.lineTo(Math.sin(a) * r * len, -Math.cos(a) * r * len);
  }
  g.closePath();
  g.fill();
  // The needle: red to the upper right, grey to the lower left.
  g.rotate(Math.PI / 4);
  for (const [color, dir] of [['#e5534b', -1], ['#9aa5b1', 1]] as const) {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, dir * r * 0.58);
    g.lineTo(r * 0.16, 0);
    g.lineTo(-r * 0.16, 0);
    g.closePath();
    g.fill();
    g.stroke();
  }
  g.fillStyle = '#5a3d2b';
  g.beginPath();
  g.arc(0, 0, r * 0.08, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** The compass as a DOM picture: its image, else a small canvas with the drawn one. */
export function compassElement(cls: string): HTMLElement {
  const src = imageUrl(COMPASS);
  if (src) {
    const img = document.createElement('img');
    img.className = cls;
    img.src = src;
    img.alt = '';
    return img;
  }
  const cv = document.createElement('canvas');
  cv.className = cls;
  cv.width = cv.height = 128;
  const g = cv.getContext('2d')!;
  g.translate(64, 64);
  drawCompass(g, 120, 120);
  return cv;
}
