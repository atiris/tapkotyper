import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { WORLDS } from '../game/levels';

const manifest = JSON.parse(readFileSync('public/assets/manifest.json', 'utf8')) as {
  images: Record<string, unknown>;
  accessories: { id: string }[];
  music: string[];
};

describe('processed assets', () => {
  it('has a music track for every world, the menu, the break and the relaxing track', () => {
    for (const name of [...WORLDS, 'menu', 'break', 'relaxing']) expect(manifest.music, name).toContain(`music-${name}`);
  });

  it('has a map island and a badge for every world', () => {
    for (const w of WORLDS) {
      expect(manifest.images, w).toHaveProperty(`ui-map-${w}`);
      expect(manifest.images, w).toHaveProperty(`badge-${w}`);
    }
  });

  it('has a picture and a thumbnail for every accessory', () => {
    for (const a of manifest.accessories) {
      expect(manifest.images, a.id).toHaveProperty(`acc-${a.id}`);
      expect(manifest.images, a.id).toHaveProperty(`acc-${a.id}-thumb`);
    }
  });

  it('has either all three layers of a world background or none (a half set draws oddly)', () => {
    for (const w of WORLDS) {
      const layers = ['far', 'mid', 'near'].filter((l) => `bg-${w}-${l}` in manifest.images);
      expect([0, 3], w).toContain(layers.length);
    }
  });

  it('has the two music notes the music tree draws', () => {
    expect(manifest.images).toHaveProperty('obj-note1');
    expect(manifest.images).toHaveProperty('obj-note2');
  });
});
