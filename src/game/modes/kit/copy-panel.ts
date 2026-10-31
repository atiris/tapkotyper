import type { G } from '../../../gfx/draw';

/** The ink of a copy panel's lines. */
export const PANEL_INK = '#3d3355';

/** The copy panel of the valley's lullaby: a pale lilac plate with a purple edge, at (x, y), `w` by `h`. */
export function drawCopyPanel(g: G, x: number, y: number, w: number, h: number): void {
  g.save();
  g.fillStyle = 'rgba(250,246,255,0.92)';
  g.strokeStyle = '#9b86c9';
  g.lineWidth = 4;
  g.beginPath();
  g.roundRect(x, y, w, h, 22);
  g.fill();
  g.stroke();
  g.restore();
}
