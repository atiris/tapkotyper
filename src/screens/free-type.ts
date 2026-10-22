import { app, go } from '../app/app';
import { WORLDS, isWorldUnlocked } from '../game/levels';
import { imageUrl } from '../gfx/assets';
import { t } from '../i18n/i18n';
import type { Profile } from '../storage/schema';
import { h, modal } from '../ui/dom';

/** Indexes of the worlds the child has opened: the places of free typing. */
export function openWorlds(p: Profile): number[] {
  return WORLDS.map((_, i) => i).filter((i) => isWorldUnlocked(p, i));
}

/** "Just typing" from the map: with one open world it starts there, else the child picks the place. */
export function startFreeType(): void {
  const worlds = openWorlds(app.profile!);
  if (worlds.length > 1) openPlacePicker();
  else go('level', { id: 'freetype', world: worlds[0] ?? 0 });
}

/** The place picker: a picture of every open world; `current` is the world played now. */
export function openPlacePicker(current?: number): void {
  const tiles = openWorlds(app.profile!).map((wi) => {
    const w = WORLDS[wi];
    const img = imageUrl(`ui-map-${w}`);
    return h('button', {
      class: `place ${wi === current ? 'on' : ''}`,
      type: 'button',
      'aria-pressed': String(wi === current),
      onClick: () => {
        close();
        if (wi !== current) go('level', { id: 'freetype', world: wi });
      },
    }, img ? h('img', { src: img, alt: '' }) : h('div', { class: 'island-fallback' }), h('span', {}, t(`worlds.${w}`)));
  });
  const close = modal(h('div', { class: 'place-picker' },
    h('h2', {}, t('freeType.pick')),
    h('div', { class: 'places' }, ...tiles)), { cls: 'place-picker-modal' });
}
