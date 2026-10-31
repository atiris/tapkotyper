import type { G } from '../../../gfx/draw';

/** The round clock's radius, and the share of its time in which it blinks. */
export const CLOCK_R = 22;
const CLOCK_BLINK = 0.25;

/** The word's time left as a round clock: a green ring that empties (blinking at the end) round a green disc with an hourglass. */
export function drawClock(g: G, x: number, y: number, share: number, t: number, motion: boolean): void {
  const k = Math.max(0, Math.min(1, share));
  const blink = k < CLOCK_BLINK && motion ? 0.45 + 0.55 * Math.abs(Math.cos(t * 7)) : 1;
  g.save();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(x, y, CLOCK_R + 2, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = 'rgba(47,138,76,0.18)';
  g.beginPath();
  g.arc(x, y, CLOCK_R - 1, 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = blink;
  g.strokeStyle = '#4fb57a';
  g.lineCap = 'round';
  g.beginPath();
  g.arc(x, y, CLOCK_R - 1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
  g.stroke();
  g.globalAlpha = 1;
  g.fillStyle = '#2f8a4c';
  g.beginPath();
  g.arc(x, y, CLOCK_R - 5.5, 0, Math.PI * 2);
  g.fill();
  // The hourglass.
  const s = CLOCK_R * 0.42;
  g.strokeStyle = '#ffffff';
  g.fillStyle = '#ffffff';
  g.lineWidth = 2;
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(x - s * 0.7, y - s);
  g.lineTo(x + s * 0.7, y - s);
  g.lineTo(x - s * 0.7, y + s);
  g.lineTo(x + s * 0.7, y + s);
  g.closePath();
  g.stroke();
  g.beginPath();
  g.moveTo(x - s * 0.45 * k, y - s * (0.2 + 0.6 * k));
  g.lineTo(x + s * 0.45 * k, y - s * (0.2 + 0.6 * k));
  g.lineTo(x, y);
  g.closePath();
  g.fill();
  g.restore();
}
