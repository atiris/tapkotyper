import { imageUrl } from './assets';
import type { G } from './draw';

/** The compass: the hero's journey's picture (its map node and end card) and a thing at the target range. */
export const COMPASS = 'obj-aim-compass';

/** A gold pocket compass with a red needle in a box of `w` x `h` around (0, 0), until its picture is there. */
export function drawCompass(g: G, w: number, h: number): void {
  const r = Math.min(w, h) / 2;
  g.save();
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(90,61,43,0.7)';
  g.lineWidth = Math.max(1.5, r * 0.05);
  // The ring on top, then the gold case and the face.
  g.fillStyle = '#d9a520';
  g.beginPath();
  g.arc(0, -r * 0.86, r * 0.16, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#f6c945';
  g.beginPath();
  g.arc(0, r * 0.06, r * 0.8, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#fff6dc';
  g.beginPath();
  g.arc(0, r * 0.06, r * 0.62, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#b07a45';
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    g.beginPath();
    g.arc(Math.sin(a) * r * 0.5, r * 0.06 - Math.cos(a) * r * 0.5, r * 0.045, 0, Math.PI * 2);
    g.fill();
  }
  // The needle: red to the north, grey to the south, turned a little.
  g.translate(0, r * 0.06);
  g.rotate(0.35);
  g.fillStyle = '#e5534b';
  g.beginPath();
  g.moveTo(0, -r * 0.48);
  g.lineTo(r * 0.11, 0);
  g.lineTo(-r * 0.11, 0);
  g.closePath();
  g.fill();
  g.fillStyle = '#9aa5b1';
  g.beginPath();
  g.moveTo(0, r * 0.48);
  g.lineTo(r * 0.11, 0);
  g.lineTo(-r * 0.11, 0);
  g.closePath();
  g.fill();
  g.fillStyle = '#5a3d2b';
  g.beginPath();
  g.arc(0, 0, r * 0.07, 0, Math.PI * 2);
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
