import { WORLDS, type LevelDef, worldLevels } from '../game/levels';
import { WARDROBE_MAX, countdownFace } from '../game/wardrobe-time';
import { t } from '../i18n/i18n';
import { SHIFT_L, SHIFT_R, SPACE } from '../learning/lessons';
import { ICONS, h } from './dom';
import { keyLabel } from './keyboard-guide';
import { tip } from './tooltip';

/** Colors of the round buttons: controls purple; the paw, rhythm, place in the world, a key's accuracy and the target's hits green (the round being played); the super star and a new version red; the wardrobe's time teal. */
export type RoundKind = 'control' | 'paw' | 'rhythm' | 'super' | 'place' | 'timer' | 'accuracy' | 'hits' | 'update';

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

/** A round button's picture with a short text (a number, a language code) on the disc instead of a glyph. */
export function roundTextSvg(text: string, ring = ''): string {
  return roundFrame(ring, `<text class="rb-num" x="24" y="24">${text}</text>`);
}

/** A ring of segments, one per class (`on` or none). */
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
 * The place in the world, drawn like the rhythm ring: one segment per level, filled up to this
 * one (the third of five fills three, the last one all); the level's number inside.
 */
export function levelRing(total: number, current: number): HTMLElement {
  const ring = segments(Array.from({ length: total }, (_, i) => (i <= current ? 'on' : '')));
  const label = t('level.place', { n: current + 1, total });
  return h('div', { class: 'round-btn place', role: 'img', tip: label, 'aria-label': label, html: roundTextSvg(String(current + 1), ring) });
}

/** The ring of a world level. */
export function placeRing(def: LevelDef): HTMLElement {
  return levelRing(worldLevels(def.world).length, def.index);
}

/** The rhythm's ring: filled from the top by `fraction`. */
export function rhythmRing(fraction: number): string {
  const f = Math.max(0, Math.min(1, fraction));
  return `<circle class="rb-arc on" cx="24" cy="24" r="21" transform="rotate(-90 24 24)" stroke-dasharray="${(f * RING_LEN).toFixed(1)} ${RING_LEN.toFixed(1)}"/>`;
}

/** A working round button; its text lives in the tooltip and `aria-label`. */
export function roundButton(kind: RoundKind, glyph: keyof typeof ICONS, label: string, onClick: () => void, ring = ''): HTMLButtonElement {
  const b = h('button', { class: `round-btn ${kind}`, type: 'button', tip: label, 'aria-label': label, onClick: () => onClick() });
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
      tip(el, text);
      el.setAttribute('aria-label', text);
    },
  };
}

/** Share of the ring an accuracy fills: the errors on a log scale, so 80 to 100 % takes two thirds of the ring. */
export function accuracyFill(accuracy: number): number {
  const errors = 1 - Math.max(0, Math.min(1, accuracy));
  return Math.max(0, 1 - Math.log10(1 + 99 * errors) / 2);
}

/**
 * Accuracy of one trained key (a picture): the key on the disc, the ring by `accuracyFill`;
 * red below 80 %, orange below 90 %, yellow above, green once the key is ready.
 */
export function accuracyPic(key: string): { el: HTMLElement; set(accuracy: number, ready: boolean): void } {
  const glyph = key === SPACE ? '␣' : key === SHIFT_L || key === SHIFT_R ? '⇧' : key;
  const el = h('div', { class: 'round-btn accuracy', role: 'img' });
  let shown = '';
  return {
    el,
    set(accuracy, ready) {
      const pct = Math.round(accuracy * 100);
      const band = ready ? 'ready' : pct < 80 ? 'low' : pct < 90 ? 'mid' : 'high';
      if (`${pct}${band}` === shown) return;
      shown = `${pct}${band}`;
      el.className = `round-btn accuracy acc-${band}`;
      el.innerHTML = roundTextSvg(glyph, rhythmRing(accuracyFill(accuracy)));
      const label = t('level.keyAccuracy', { key: keyLabel(key), n: pct });
      tip(el, label);
      el.setAttribute('aria-label', label);
    },
  };
}

/** Hits on the target range's target (a picture): their number on the disc, the ring filling with the base time. */
export function hitsPic(): { el: HTMLElement; set(hits: number, time: number): void } {
  const el = h('div', { class: 'round-btn hits', role: 'img' });
  let shown = '';
  return {
    el,
    set(hits, time) {
      const step = `${hits}:${Math.round(Math.max(0, Math.min(1, time)) * 40)}`;
      if (step === shown) return;
      shown = step;
      el.innerHTML = roundTextSvg(String(hits), rhythmRing(time));
      const label = t('aim.hits', { n: hits });
      tip(el, label);
      el.setAttribute('aria-label', label);
    },
  };
}

/**
 * The wardrobe's countdown (a picture, not a button): the ring shows the time left; inside a
 * smile, then a number a young child can read; it blinks the last 20 s, faster the last 10 s.
 */
export function timerPic(left: number): { el: HTMLElement; set(left: number): void } {
  const el = h('div', { class: 'round-btn timer', role: 'timer' });
  // The picture changes only with the 10 s step; the label follows every second.
  let step = -1;
  const set = (secs: number) => {
    const s = Math.max(0, Math.ceil(secs));
    const label = t('wardrobe.timer', { m: Math.floor(s / 60), s: s % 60 });
    tip(el, label);
    el.setAttribute('aria-label', label);
    el.classList.toggle('ending', s <= 20);
    el.classList.toggle('fast', s <= 10);
    const next = Math.ceil(s / 10);
    if (next === step) return;
    step = next;
    const face = countdownFace(s);
    const ring = rhythmRing(s / WARDROBE_MAX);
    el.innerHTML = face === 'smile' ? roundSvg('smile', ring) : roundTextSvg(String(face), ring);
  };
  set(left);
  return { el, set };
}

/** "Meadow · level 3": a level named without a world number. */
export function levelTitleWords(world: number, index: number): string {
  return t('level.titleWords', { name: t(`worlds.${WORLDS[world]}`), level: index + 1 });
}

/** The world's name as a word. */
export function worldName(def: LevelDef): string {
  return t(`worlds.${WORLDS[def.world]}`);
}
