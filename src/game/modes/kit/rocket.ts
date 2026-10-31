import { hasImage, sprite } from '../../../gfx/assets';
import { blob, drawSprite, type G } from '../../../gfx/draw';

/** Tapko's rocket standing on the planet's shore, nose up on its fins; the flying picture turned upright until its own one is there. */
export const STANDING_ROCKET = ['obj-rocket-standing', 'obj-rocket-empty'];
/** Its height on the stage, a bit taller than Tapko, so he and the little dragon fit in. */
export const ROCKET_STAND_H = 300;
/** Where he climbs in: its round window, as a share of its height from its feet. */
export const ROCKET_DOOR = 0.55;

/** The flying picture's height to its length (512 x 272) while it is missing. */
const FLYING_RATIO = 272 / 512;

/** The standing rocket with its feet at (x, y), `h` high, `alpha` faded. */
export function drawStandingRocket(g: G, x: number, y: number, h = ROCKET_STAND_H, alpha = 1): void {
  if (hasImage(STANDING_ROCKET[0])) return drawSprite(g, STANDING_ROCKET[0], x, y, h, { ay: 1, alpha }, blob('#e5534b', false));
  // The flying rocket faces right: turned a quarter left it points up, its length now its height.
  const img = sprite(STANDING_ROCKET[1]), ratio = img ? img.naturalHeight / img.naturalWidth : FLYING_RATIO;
  drawSprite(g, STANDING_ROCKET[1], x, y - h / 2, h * ratio, { rot: -Math.PI / 2, alpha }, blob('#e5534b', false));
}
