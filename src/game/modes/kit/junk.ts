import { VH } from '../../../engine/loop';
import { drawSprite, type G } from '../../../gfx/draw';

/** He stands on the junkyard's sandy path, at his usual place on the left. */
export const JUNK_FEET = VH * 0.91;
export const JUNK_HERO_X = 200;

/** An old gear while its picture is missing: a toothed disc with a hole in the middle, in the gear's own colours. */
export function gearFallback(body: string, dark: string) {
  return (g: G, w: number, h: number): void => {
    const r = Math.min(w, h) * 0.42, teeth = 10;
    g.save();
    g.fillStyle = body;
    g.strokeStyle = dark;
    g.lineWidth = Math.max(2, r * 0.08);
    g.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i / (teeth * 2)) * Math.PI * 2, rr = i % 2 ? r * 0.82 : r;
      g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = dark;
    g.beginPath();
    g.arc(0, 0, r * 0.22, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
}

/** A red horseshoe magnet while its picture is missing. */
function magnetFallback(g: G, w: number, h: number): void {
  const r = Math.min(w, h * 0.6) * 0.42;
  g.save();
  g.lineWidth = r * 0.55;
  g.strokeStyle = '#d23a32';
  g.beginPath();
  g.arc(0, -h * 0.1, r, Math.PI, 0, true);
  g.stroke();
  g.fillStyle = '#d8dde3';
  g.fillRect(-r - g.lineWidth / 2, -h * 0.1, g.lineWidth, h * 0.25);
  g.fillRect(r - g.lineWidth / 2, -h * 0.1, g.lineWidth, h * 0.25);
  g.restore();
}

export const MAGNET = 'obj-magnet';

/** The crane's cable from the top of the stage and the magnet on it, its middle at (x, y). */
export function drawCraneMagnet(g: G, x: number, y: number, h: number, cableX = x): void {
  g.save();
  g.strokeStyle = '#4a4a4a';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(cableX, 0);
  g.lineTo(x, y - h / 2 + 4);
  g.stroke();
  g.restore();
  drawSprite(g, MAGNET, x, y, h, {}, magnetFallback);
}
