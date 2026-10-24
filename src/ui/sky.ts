import { reduceMotion } from '../app/app';
import { type Look, onThemeChange, shownLook } from '../app/theme';
import { imageUrl } from '../gfx/assets';
import { h } from './dom';

/** Length of the day and night change, and the share of it the setting light takes. */
const CHANGE_MS = 2500;
const SET_SHARE = 0.55;
/** How much of its way out of the band the light travels before it has melted away, and how soft it gets. */
const MELT_TURN = 0.6;
const MELT_BLUR = 10;
/** Points along an arc: enough for a smooth path with linear steps between them. */
const ARC_STEPS = 24;
/** Room kept between the sky pieces and the content or the corner controls. */
const CLEAR = 14;

/**
 * A sky piece: its width and center in units of the sun's size, from the band's left edge and
 * middle; `ratio` is its picture's height to width, `drift` how far it sails to the right.
 */
interface Piece { el: HTMLElement; size: number; ratio: number; x: number; y: number; drift?: number }

const piece = (cls: string, image: string): HTMLElement => {
  const src = imageUrl(image);
  return h('div', { class: `sky-piece ${cls}` }, src ? h('img', { src, alt: '' }) : null);
};

/**
 * The start page's scene: a day and a night sky, the repeating meadow, the sun with two clouds or
 * the moon with three stars in a band above the title, butterflies or fireflies low over the meadow.
 * The band ends above the `under` boxes (the title) and left of the `beside` ones that reach into
 * it (the card, its logo, the corner controls); a piece that does not fit is left out. A theme
 * change plays the night and day.
 */
export function skyScene(screen: HTMLElement, under: () => (Element | null)[], beside: () => (Element | null)[]): { el: HTMLElement; destroy(): void } {
  const sun = piece('sky-sun', 'ui-start-sun');
  const moon = piece('sky-moon', 'ui-start-moon');
  const pieces: Piece[] = [
    { el: sun, size: 1, ratio: 1.02, x: 1.3, y: 0 },
    { el: moon, size: 0.92, ratio: 1.09, x: 1.3, y: 0 },
    { el: piece('sky-cloud', 'ui-start-cloud-1'), size: 1.3, ratio: 0.51, x: 2.1, y: 0.3, drift: 0.18 },
    { el: piece('sky-cloud c2', 'ui-start-cloud-2'), size: 0.9, ratio: 0.51, x: 3.5, y: -0.2, drift: 0.18 },
    { el: piece('sky-star', 'ui-start-star'), size: 0.26, ratio: 1, x: 2.6, y: -0.22 },
    { el: piece('sky-star s2', 'ui-start-star'), size: 0.18, ratio: 1, x: 3.3, y: 0.24 },
    { el: piece('sky-star s3', 'ui-start-star'), size: 0.2, ratio: 1, x: 0.25, y: -0.2 },
  ];
  const band = h('div', { class: 'sky-band' }, ...pieces.map((p) => p.el));
  const meadow = (cls: string, image: string) => {
    const src = imageUrl(image);
    return h('div', { class: `meadow ${cls}`, style: src ? `background-image: url("${src}")` : '' });
  };
  // One of each butterfly by day; fireflies are glowing dots (the sprite's edge shows at this size).
  // They stay in the meadow's lower part, where the content never reaches (its bottom 60 %).
  const butterflies = [['obj-butterfly', 0.07, 0.5, 48, 6.2], ['obj-butterfly-2', 0.36, 0.44, 40, 7.4], ['obj-butterfly-3', 0.6, 0.52, 44, 5.6]] as const;
  const fireflies = [[0.1, 0.6, 1.2], [0.3, 0.5, 1.5], [0.52, 0.66, 1.8], [0.74, 0.52, 2.1]] as const;
  const life = h('div', { class: 'meadow-life' },
    ...butterflies.map(([image, x, y, w, t], i) => {
      const src = imageUrl(image);
      return h('div', { class: 'bfly', style: `left: ${x * 100}%; top: ${y * 100}%; --w: calc(${w}px * var(--meadow-h) / 190px); --t: ${t}s; --d: ${-i * 1.7}s` }, src ? h('img', { src, alt: '' }) : null);
    }),
    ...fireflies.map(([x, y, at], i) => h('div', { class: 'ffly', style: `left: ${x * 100}%; top: ${y * 100}%; --in: ${at}s; --d: ${-i * 1.3}s` }, h('i'))));
  const el = h('div', { class: 'start-sky still', 'aria-hidden': 'true', 'data-look': shownLook() },
    h('div', { class: 'sky-layer sky-day' }), h('div', { class: 'sky-layer sky-night' }),
    band, meadow('meadow-day', 'ui-start-meadow'), meadow('meadow-night', 'ui-start-meadow-night'), life);
  el.classList.toggle('calm', reduceMotion());

  /** The sun's size and where the sun and moon rest, for the arcs. */
  let sunSize = 0, below = 0;
  const place = () => {
    const box = screen.getBoundingClientRect();
    const top = 8;
    let bottom = box.height, right = box.width;
    const rects = (list: (Element | null)[]) => list.filter((e): e is Element => !!e?.getClientRects().length).map((e) => e.getBoundingClientRect());
    for (const r of rects(under())) bottom = Math.min(bottom, r.top - box.top - CLEAR);
    for (const r of rects([...beside(), ...document.querySelectorAll('.top-right .corner-row, .top-right .corner-menu')])) {
      if (r.top - box.top < bottom && r.left - box.left > 0) right = Math.min(right, r.left - box.left - CLEAR);
    }
    // The band starts at the window's edge, so a rising light comes in from beyond it; the pieces keep a margin.
    const inset = Math.max(8, Math.min(48, box.width * 0.04));
    const width = Math.max(0, right), height = Math.max(0, bottom - top);
    Object.assign(band.style, { left: '0px', top: `${top}px`, width: `${width}px`, height: `${height}px` });
    const s = sunSize = Math.min(120, height * 0.72);
    below = height / 2 + s;
    for (const p of pieces) {
      const w = p.size * s, ph = w * p.ratio, drift = (p.drift ?? 0) * s;
      const cx = inset + p.x * s, cy = height / 2 + p.y * s;
      const fits = s >= 36 && cx - w / 2 >= inset && cx + w / 2 + drift <= width && cy - ph / 2 >= 0 && cy + ph / 2 <= height;
      p.el.hidden = !fits;
      Object.assign(p.el.style, { width: `${w}px`, left: `${cx - w / 2}px`, top: `${cy - ph / 2}px` });
      if (drift) p.el.style.setProperty('--sail', `${drift}px`);
    }
  };

  /**
   * The light's way: a short stretch of a turn around a pivot under the band, squeezed into an
   * ellipse. `from` and `to` are in units of that stretch (-1 rising from the left, 1 set to the
   * right). It melts away along its way (fades, softens, grows a little) well above the band's bottom
   * edge, so it never sinks behind a horizon the page does not show.
   */
  const arc = (target: HTMLElement, from: number, to: number, delay: number, duration: number) => {
    const ry = below, rx = Math.min(ry * 1.8, sunSize * 3);
    const span = MELT_TURN * Math.acos(Math.min(1, sunSize / 2 / ry));
    const frames = Array.from({ length: ARC_STEPS + 1 }, (_, i) => {
      const at = from + (to - from) * (i / ARC_STEPS), a = at * span, away = Math.abs(at);
      return {
        transform: `translate(${(rx * Math.sin(a)).toFixed(1)}px, ${(ry * (1 - Math.cos(a))).toFixed(1)}px) scale(${(1 + away * 0.25).toFixed(3)})`,
        filter: `blur(${(away * MELT_BLUR).toFixed(1)}px)`,
        opacity: (1 - away) ** 1.5,
      };
    });
    target.animate(frames, { duration, delay, easing: 'cubic-bezier(0.45, 0, 0.35, 1)', fill: 'backwards' });
  };

  const change = (look: Look) => {
    el.dataset.look = look;
    if (el.classList.contains('calm') || sun.hidden) return;
    for (const a of [...sun.getAnimations(), ...moon.getAnimations()]) a.cancel();
    const [rising, setting] = look === 'dark' ? [moon, sun] : [sun, moon];
    arc(setting, 0, 1, 0, CHANGE_MS * SET_SHARE);
    arc(rising, -1, 0, CHANGE_MS * (1 - SET_SHARE) * 0.7, CHANGE_MS * SET_SHARE);
  };

  place();
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('still')));
  const observer = new ResizeObserver(() => place());
  observer.observe(screen);
  for (const e of [...under(), ...beside()]) if (e) observer.observe(e);
  const offTheme = onThemeChange(change);
  return {
    el,
    destroy() {
      observer.disconnect();
      offTheme();
    },
  };
}
