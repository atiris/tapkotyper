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

/** An old tire while its picture is missing: a dark ring with a grey rim. */
export function tireFallback(g: G, w: number, h: number): void {
  const r = Math.min(w, h) * 0.45;
  g.save();
  g.lineWidth = r * 0.45;
  g.strokeStyle = '#3a3a3e';
  g.beginPath();
  g.arc(0, 0, r * 0.75, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 3;
  g.strokeStyle = '#8a8f98';
  g.beginPath();
  g.arc(0, 0, r * 0.5, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

export const BIN = 'obj-bin';

/** A round metal bin while its picture is missing. */
export function binFallback(g: G, w: number, h: number): void {
  const bw = Math.min(w, h * 0.75);
  g.save();
  g.fillStyle = '#a9b7c6';
  g.strokeStyle = '#6f7f92';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(-bw * 0.45, -h * 0.4);
  g.lineTo(bw * 0.45, -h * 0.4);
  g.lineTo(bw * 0.38, h * 0.48);
  g.lineTo(-bw * 0.38, h * 0.48);
  g.closePath();
  g.fill();
  g.stroke();
  for (const k of [-0.15, 0.15]) {
    g.beginPath();
    g.moveTo(k * bw, -h * 0.3);
    g.lineTo(k * bw * 0.9, h * 0.4);
    g.stroke();
  }
  g.restore();
}

/** A pile shrinks at these shares of its level (the tire pile, the beeping pile). */
export const PILE_STAGES = [1 / 3, 2 / 3];

/** The pile's stage (0-2) at a share of the level. */
export function pileStage(share: number): number {
  return PILE_STAGES.filter((s) => share >= s).length;
}
