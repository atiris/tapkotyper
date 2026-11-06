import { reduceMotion } from '../app/app';
import { type Look, onThemeChange, shownLook } from '../app/theme';
import { imageUrl } from '../gfx/assets';
import { h } from './dom';
import { MEADOW } from './meadow';

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
/** The other look's pictures wait this long, so on a slow line the first screen's own pictures come first. */
const OTHER_LOOK_AFTER_MS = 2000;

/**
 * A sky piece: its width and center in units of the sun's size, from the band's left edge and
 * middle; `ratio` is its picture's height to width, `drift` how far it sails to the right.
 */
interface Piece { el: HTMLElement; size: number; ratio: number; x: number; y: number; drift?: number }

/**
 * The start page's scene: a day and a night sky, the repeating meadow, the sun with two clouds or
 * the moon with three stars in a band above the title, butterflies or fireflies low over the meadow.
 * The band ends above the `under` boxes (the title) and left of the `beside` ones that reach into
 * it (the card, its logo, the corner controls); a piece that does not fit is left out. A theme
 * change plays the night and day.
 */
export function skyScene(screen: HTMLElement, under: () => (Element | null)[], beside: () => (Element | null)[]): { el: HTMLElement; destroy(): void } {
  // Only the shown look's pictures load with the page; the other look's come later, or with a theme change.
  const waiting: Record<Look, (() => void)[]> = { light: [], dark: [] };
  const picture = (look: Look, show: () => void) => (look === shownLook() ? show() : waiting[look].push(show));
  const loadLook = (look: Look) => { for (const show of waiting[look].splice(0)) show(); };
  /** A picture of `look`; with `after`, it starts loading only once that has settled. */
  const image = (look: Look, name: string, after?: Promise<void>): HTMLImageElement | null => {
    const src = imageUrl(name);
    if (!src) return null;
    const img = h('img', { alt: '' });
    const set = () => { img.src = src; };
    picture(look, after ? () => void after.then(set) : set);
    return img;
  };
  const piece = (cls: string, look: Look, name: string) => h('div', { class: `sky-piece ${cls}` }, image(look, name));
  const sun = piece('sky-sun', 'light', 'ui-start-sun');
  const moon = piece('sky-moon', 'dark', 'ui-start-moon');
  const pieces: Piece[] = [
    { el: sun, size: 1, ratio: 1.02, x: 1.3, y: 0 },
    { el: moon, size: 0.92, ratio: 1.09, x: 1.3, y: 0 },
    { el: piece('sky-cloud', 'light', 'ui-start-cloud-1'), size: 1.3, ratio: 0.51, x: 2.1, y: 0.3, drift: 0.18 },
    { el: piece('sky-cloud c2', 'light', 'ui-start-cloud-2'), size: 0.9, ratio: 0.51, x: 3.5, y: -0.2, drift: 0.18 },
    { el: piece('sky-star', 'dark', 'ui-start-star'), size: 0.26, ratio: 1, x: 2.6, y: -0.22 },
    { el: piece('sky-star s2', 'dark', 'ui-start-star'), size: 0.18, ratio: 1, x: 3.3, y: 0.24 },
    { el: piece('sky-star s3', 'dark', 'ui-start-star'), size: 0.2, ratio: 1, x: 0.25, y: -0.2 },
  ];
  const band = h('div', { class: 'sky-band' }, ...pieces.map((p) => p.el));
  /** A meadow strip; `ready` settles when its picture has come (or failed). */
  const meadow = (cls: string, look: Look, name: string) => {
    const el = h('div', { class: `meadow ${cls}` });
    const src = imageUrl(name);
    const ready = new Promise<void>((resolve) => {
      if (!src) return resolve();
      picture(look, () => {
        // The start page's largest picture: it goes before the smaller ones.
        const first = new Image();
        first.fetchPriority = 'high';
        first.onload = first.onerror = () => resolve();
        first.src = src;
        el.style.backgroundImage = `url("${src}")`;
      });
    });
    return { el, ready };
  };
  const night = meadow('meadow-night', 'dark', MEADOW.dark);
  const day = meadow('meadow-day', 'light', MEADOW.light);
  // One of each butterfly by day, up among the flower heads; each wanders off now and then, turns
  // round and comes back (`far` px in `trip` s). Fireflies are glowing dots (the sprite's edge shows at this size)
  // and stay in the meadow's lower part, where the content never reaches (its bottom 60 %).
  const butterflies = [['obj-butterfly', 0.07, 0.22, 48, 6.2, 140, 30], ['obj-butterfly-2', 0.36, 0.16, 40, 7.4, 110, 34], ['obj-butterfly-3', 0.6, 0.26, 44, 5.6, 160, 27]] as const;
  const fireflies = [[0.1, 0.6, 1.2], [0.3, 0.5, 1.5], [0.52, 0.66, 1.8], [0.74, 0.52, 2.1]] as const;
  const life = h('div', { class: 'meadow-life' },
    ...butterflies.map(([name, x, y, w, t, far, trip], i) =>
      h('div', { class: 'bfly', style: `left: ${x * 100}%; top: ${y * 100}%; --w: calc(${w}px * var(--meadow-h) / 190px); --t: ${t}s; --d: ${-i * 1.7}s; --far: calc(${far}px * var(--meadow-h) / 190px); --trip: ${trip}s; --td: ${-i * 11}s` },
        // They come after the day meadow, so they never hold it up.
        h('span', { class: 'bfly-trip' }, image('light', name, day.ready)))),
    ...fireflies.map(([x, y, at], i) => h('div', { class: 'ffly', style: `left: ${x * 100}%; top: ${y * 100}%; --in: ${at}s; --d: ${-i * 1.3}s` }, h('i'))));
  const el = h('div', { class: 'start-sky still', 'aria-hidden': 'true', 'data-look': shownLook() },
    h('div', { class: 'sky-layer sky-day' }), h('div', { class: 'sky-layer sky-night' }),
    band, night.el, day.el, life);
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
    loadLook(look);
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
  const later = setTimeout(() => { loadLook('light'); loadLook('dark'); }, OTHER_LOOK_AFTER_MS);
  return {
    el,
    destroy() {
      clearTimeout(later);
      observer.disconnect();
      offTheme();
    },
  };
}
