import { app } from '../app/app';
import { WORLDS, type LevelDef, worldLevels } from '../game/levels';
import { t } from '../i18n/i18n';
import { ICONS, h } from './dom';

/** Colors of the round buttons: controls purple, paw orange, rhythm green, the super star gold, the place in the world blue. */
export type RoundKind = 'control' | 'paw' | 'rhythm' | 'super' | 'place';

const RING_LEN = 2 * Math.PI * 21;
/** Glyphs drawn filled in white; the others are white lines. */
const FILLED: (keyof typeof ICONS)[] = ['paw', 'star', 'play'];

/** Point on a circle around the button's center, 0 degrees at the top, clockwise. */
function at(r: number, deg: number): string {
  const a = ((deg - 90) * Math.PI) / 180;
  return `${(24 + r * Math.cos(a)).toFixed(2)} ${(24 + r * Math.sin(a)).toFixed(2)}`;
}

/** A ring, a colored disc and `inner` over it. */
function roundFrame(ring: string, inner: string): string {
  return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle class="rb-base" cx="24" cy="24" r="21"/>${ring}` +
    `<circle class="rb-disc" cx="24" cy="24" r="16.5"/>${inner}</svg>`;
}

/** The one look of every round button: a ring, a colored disc and a white glyph. `ring` adds colored marks over the ring. */
export function roundSvg(glyph: keyof typeof ICONS, ring = ''): string {
  const filled = FILLED.includes(glyph);
  return roundFrame(ring, `<g transform="translate(12 12)" fill="${filled ? '#fff' : 'none'}" stroke="#fff" stroke-width="${filled ? 1.2 : 2.2}" stroke-linecap="round" stroke-linejoin="round">${ICONS[glyph]}</g>`);
}

/** A ring of segments, one per class (`on`, `now` or none). */
function segments(classes: string[]): string {
  const gap = 16, n = classes.length;
  return classes.map((cls, i) => {
    const from = (i * 360) / n + gap / 2, to = ((i + 1) * 360) / n - gap / 2;
    return `<path class="rb-arc${cls ? ` ${cls}` : ''}" d="M${at(21, from)} A21 21 0 0 1 ${at(21, to)}"/>`;
  }).join('');
}

/** The paw's ring: one segment per charge. */
export function pawRing(charged: number, max: number): string {
  return segments(Array.from({ length: max }, (_, i) => (i < charged ? 'on' : '')));
}

/**
 * The place in the world, drawn like the rhythm ring: one segment per level, green done,
 * orange this one; the level's number inside, a web for the big challenge.
 */
export function levelRing(done: boolean[], current: number, web: boolean): HTMLElement {
  const ring = segments(done.map((d, i) => (i === current ? 'now' : d ? 'on' : '')));
  const label = t('level.place', { n: current + 1, total: done.length });
  return h('div', { class: 'round-btn place', role: 'img', title: label, 'aria-label': label,
    html: web ? roundSvg('web', ring) : roundFrame(ring, `<text class="rb-num" x="24" y="24">${current + 1}</text>`) });
}

/** The ring of a world level, from the player's progress. */
export function placeRing(def: LevelDef): HTMLElement {
  const progress = app.profile?.progress.levels ?? {};
  return levelRing(worldLevels(def.world).map((l) => !!progress[l.id]), def.index, def.isSuper);
}

/** The rhythm's ring: filled from the top by `fraction`. */
export function rhythmRing(fraction: number): string {
  const f = Math.max(0, Math.min(1, fraction));
  return `<circle class="rb-arc on" cx="24" cy="24" r="21" transform="rotate(-90 24 24)" stroke-dasharray="${(f * RING_LEN).toFixed(1)} ${RING_LEN.toFixed(1)}"/>`;
}

/** A working round button; its text lives in the tooltip and `aria-label`. */
export function roundButton(kind: RoundKind, glyph: keyof typeof ICONS, label: string, onClick: () => void, ring = ''): HTMLButtonElement {
  const b = h('button', { class: `round-btn ${kind}`, type: 'button', title: label, 'aria-label': label, onClick: () => onClick() });
  b.innerHTML = roundSvg(glyph, ring);
  return b;
}

/** Repaints a round button's picture. */
export function paintRound(b: HTMLElement, glyph: keyof typeof ICONS, ring = ''): void {
  b.innerHTML = roundSvg(glyph, ring);
}

/** The same look as a picture, for the help page. */
export function roundPic(kind: RoundKind, glyph: keyof typeof ICONS, ring = ''): HTMLElement {
  return h('span', { class: `round-btn ${kind}`, html: roundSvg(glyph, ring) });
}

/** Rhythm (a picture, not a button): the green ring fills from calm to excellent. */
export function rhythmPic(): { el: HTMLElement; set(ratio: number): void; label(text: string): void } {
  const el = h('div', { class: 'round-btn rhythm', role: 'img', html: roundSvg('wave', rhythmRing(0.25)) });
  // The ring is redrawn only when its 1/40 step changes, not on every frame.
  let step = -1;
  return {
    el,
    set(ratio) {
      const next = Math.round(Math.max(0, Math.min(1, ratio)) * 40);
      if (next === step) return;
      step = next;
      paintRound(el, 'wave', rhythmRing(0.25 + 0.7 * (next / 40)));
    },
    label(text) {
      el.title = text;
      el.setAttribute('aria-label', text);
    },
  };
}

/** "Meadow · level 3": a level named without a world number. */
export function levelTitleWords(world: number, index: number): string {
  return t('level.titleWords', { name: t(`worlds.${WORLDS[world]}`), level: index + 1 });
}

/** The world's name as a word. */
export function worldName(def: LevelDef): string {
  return t(`worlds.${WORLDS[def.world]}`);
}
