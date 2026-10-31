import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { FALLBACK_BACK, FALLBACK_BODY, eggPeek, eggRest, eggVisible, ovalMask } from './tapko';

const N = 96;

/** The union silhouette (alpha over a half) of processed pictures, as `drawTapko` stacks them. */
async function silhouette(names: string[]): Promise<Uint8Array> {
  const mask = new Uint8Array(N * N);
  for (const name of names) {
    const px = await sharp(`public/assets/${name}.webp`).resize(N, N, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
    for (let i = 0; i < mask.length; i++) if (px[i * 4 + 3] > 127) mask[i] = 1;
  }
  return mask;
}

/** The egg at rest shows at least 30 % and is still mostly behind him; peeking it shows more. */
function expectPeeks(mask: Uint8Array, label: string): void {
  const at = eggRest(mask, N), rest = eggVisible(mask, N, at);
  expect(rest, label).toBeGreaterThanOrEqual(0.3);
  expect(rest, label).toBeLessThan(0.9);
  expect(eggVisible(mask, N, eggPeek(mask, N, at)), label).toBeGreaterThan(rest);
}

describe('the egg on his back', () => {
  // The widest and highest things on his back, a hand item that rises over his head, and a tall hat over them.
  const outfits = [[], ['acc-dragon-wings'], ['acc-jetpack'], ['acc-hero-cape'], ['acc-butterfly-wings'], ['acc-fairy-wings'], ['acc-star-cape'], ['acc-backpack'], ['acc-balloon'], ['acc-dragon-wings', 'acc-wizard-hat'], ['acc-jetpack', 'acc-balloon']];

  for (const kind of ['fox', 'owl', 'bunny']) {
    it(`peeks out whatever the ${kind} wears`, async () => {
      for (const acc of outfits) expectPeeks(await silhouette([...acc, `tapko-${kind}-idle`]), `${kind} ${acc.join(' ')}`);
    });
  }

  it('peeks out of the fallback drawings', () => {
    expectPeeks(ovalMask(FALLBACK_BODY, N), 'body');
    expectPeeks(ovalMask([...FALLBACK_BODY, ...FALLBACK_BACK], N), 'body and wings');
  });
});
