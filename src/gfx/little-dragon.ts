import { hasImage } from './assets';
import { drawSprite, type G } from './draw';

/** The hatched baby dragon's moods on the hero's journey: glad at a word or a finished part, worried at a slip. */
export type LittleDragonMood = 'idle' | 'happy' | 'worried';

/** The little dragon out of its shell; the hatched picture until its own one is there. */
export const LITTLE_DRAGON_PICTURES = ['obj-dragon-little', 'obj-dragon-hatched'];

export function littleDragonImage(): string {
  return hasImage(LITTLE_DRAGON_PICTURES[0]) ? LITTLE_DRAGON_PICTURES[0] : LITTLE_DRAGON_PICTURES[1];
}

/** A small green dragon while both pictures are missing. */
export function littleDragonFallback(g: G, w: number, h: number): void {
  g.save();
  g.fillStyle = '#8fd6b0';
  g.strokeStyle = '#3d6b55';
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(0, h * 0.15, w * 0.35, h * 0.32, 0, 0, Math.PI * 2);
  g.ellipse(0, -h * 0.25, w * 0.28, h * 0.22, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.restore();
}

/**
 * Draws the little dragon with its feet at (x, y), `size` high, facing right: it flutters a
 * little (a bob and a breath of its wings), hops when glad (`hop` 0..1) and shakes when worried.
 * With `motion` off it stands still.
 */
export function drawLittleDragon(g: G, mood: LittleDragonMood, x: number, y: number, size: number, t: number, hop: number, motion: boolean): void {
  const bob = motion ? Math.abs(Math.sin(t * 4.2)) * size * 0.05 : 0;
  const up = Math.sin(Math.min(1, hop) * Math.PI) * size * 0.3;
  const breath = motion ? Math.sin(t * 8.4) * 0.03 : 0;
  const shake = motion && mood === 'worried' ? Math.sin(t * 32) * 0.08 : 0;
  // Its soft shadow stays on the ground.
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.14)';
  g.beginPath();
  g.ellipse(x, y, size * 0.26 * (1 - up / size), size * 0.05, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
  drawSprite(g, littleDragonImage(), x, y - bob - up, size, { ay: 1, sx: 1 + breath, sy: (1 - breath) * (mood === 'worried' ? 0.95 : 1), rot: shake }, littleDragonFallback);
}
