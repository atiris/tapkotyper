import type { Page } from '@playwright/test';

/** A text that misses WCAG AA against what is painted behind it. */
export interface ContrastMiss { text: string; ratio: number; need: number; color: string; bg: string }

/**
 * Every visible text of the page with less than WCAG AA contrast (4.5, or 3 for large text)
 * against its effective background: the colors of its ancestors composited up to the first
 * opaque one; a gradient counts as the average of its colors. Texts over pictures (the start
 * page's scene and its licence line on the meadow, canvases), disabled controls and keys a
 * picker cannot use are left out,
 * and so is white on the brand orange or a meaning color (a strong, mid-light color): the look
 * keeps those colors as they are.
 */
export function contrastMisses(page: Page): Promise<ContrastMiss[]> {
  return page.evaluate(() => {
    type C = [number, number, number, number];
    const probe = document.createElement('i');
    document.body.append(probe);
    const parse = (css: string): C => {
      probe.style.color = '';
      probe.style.color = css;
      const m = getComputedStyle(probe).color.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0];
      return [m[0], m[1], m[2], m[3] ?? 1];
    };
    const over = (top: C, under: C): C => {
      const a = top[3] + under[3] * (1 - top[3]);
      if (!a) return [0, 0, 0, 0];
      const mix = (i: number) => (top[i] * top[3] + under[i] * under[3] * (1 - top[3])) / a;
      return [mix(0), mix(1), mix(2), a];
    };
    /** A strong color, neither dark nor pale: the brand orange, a round button's disc, a finger color. */
    const strong = (c: C) => {
      const [r, g, b] = c.slice(0, 3).map((v) => v / 255);
      const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
      const sat = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
      return sat > 0.45 && l > 0.3 && l < 0.75;
    };
    const lum = (c: C) => {
      const ch = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2]);
    };
    const gradient = (img: string): C | null => {
      const stops = img.match(/rgba?\([^)]+\)/g);
      if (!stops) return null;
      const cs = stops.map(parse);
      return [0, 1, 2, 3].map((i) => cs.reduce((s, c) => s + c[i], 0) / cs.length) as C;
    };
    /** What is behind `el`: null over a picture. */
    const background = (el: Element): C | null => {
      const layers: C[] = [];
      for (let e: Element | null = el; e; e = e.parentElement) {
        const st = getComputedStyle(e);
        const bg = parse(st.backgroundColor);
        if (bg[3] > 0) layers.push(bg);
        if (bg[3] >= 1) break;
        if (st.backgroundImage !== 'none') {
          const g = gradient(st.backgroundImage);
          if (!g) return null;
          layers.push(g);
          if (g[3] >= 1) break;
        }
        if (e === document.documentElement) layers.push([255, 255, 255, 1]);
      }
      return layers.reduceRight<C>((under, top) => over(top, under), [255, 255, 255, 1]);
    };
    const misses: { text: string; ratio: number; need: number; color: string; bg: string }[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      const own = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim());
      if (!own || !el.getClientRects().length || el.closest('.start-sky, .start-sig, canvas, svg, [aria-hidden="true"], :disabled, .kb-key.off, .tip:not(.show), .toast:not(.show)')) continue;
      const st = getComputedStyle(el);
      if (st.visibility !== 'visible') continue;
      let alpha = 1;
      for (let e: Element | null = el; e; e = e.parentElement) alpha *= Number(getComputedStyle(e).opacity);
      if (alpha < 0.05) continue;
      const bg = background(el);
      if (!bg) continue;
      const fg = parse(st.color);
      if (fg[0] + fg[1] + fg[2] >= 3 * 250 && strong(bg)) continue;
      const text = over([fg[0], fg[1], fg[2], fg[3] * alpha], bg);
      const [a, b] = [lum(text), lum(bg)].sort((x, y) => y - x);
      const ratio = (a + 0.05) / (b + 0.05);
      const size = parseFloat(st.fontSize), bold = Number(st.fontWeight) >= 700;
      const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
      if (ratio < need) misses.push({ text: el.textContent!.trim().slice(0, 40), ratio: Math.round(ratio * 100) / 100, need, color: st.color, bg: `rgb(${bg.slice(0, 3).map(Math.round).join(', ')})` });
    }
    probe.remove();
    return misses;
  });
}
