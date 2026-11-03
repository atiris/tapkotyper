import { type Side, VIEW } from '../../src/ui/hand-svg';

/** A hand's outline in the SVG Tapko draws, read and written the same way by the row templates' page and its save. */

/** A hand's outline and thin lines: filled bands (as traced), or middle lines drawn this wide (keyboard units). */
export interface Outline { lines: string; creases: string; width?: { lines: number; creases: number } }

const pathOf = (svg: string, cls: string) => new RegExp(`<path class="${cls}" d="([^"]*)"`).exec(svg)?.[1] ?? '';
const widthOf = (svg: string, cls: string) => Number(new RegExp(`<path class="${cls}"[^>]*fill="none"[^>]*stroke-width="([0-9.]+)"`).exec(svg)?.[1] ?? 0);

/** An outline read from an SVG: its paths, and its widths when they are middle lines. */
export function readOutline(svg: string): Outline {
  const o: Outline = { lines: pathOf(svg, 'hand-lines'), creases: pathOf(svg, 'hand-creases') };
  const lines = widthOf(svg, 'hand-lines');
  if (lines) o.width = { lines, creases: widthOf(svg, 'hand-creases') || lines / 2 };
  return o;
}

/** An outline as the SVG Tapko draws (src/ui/hand-svg.ts reads it): filled bands, or middle lines with their width. */
export function outlineSvg(s: Side, o: Outline, source: string): string {
  const w = o.width;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}" data-side="${s}">`,
    w
      ? `<path class="hand-creases" d="${o.creases}" fill="none" stroke="#5a5560" stroke-opacity="0.6" stroke-width="${w.creases}" stroke-linecap="round" stroke-linejoin="round"/>`
      : `<path class="hand-creases" d="${o.creases}" fill="#5a5560" fill-opacity="0.6" fill-rule="evenodd"/>`,
    w
      ? `<path class="hand-lines" d="${o.lines}" fill="none" stroke="#5a5560" stroke-width="${w.lines}" stroke-linecap="round" stroke-linejoin="round" data-source="${source}"/>`
      : `<path class="hand-lines" d="${o.lines}" fill="#5a5560" fill-rule="evenodd" stroke="#5a5560" stroke-width="0" stroke-linejoin="round" data-source="${source}"/>`,
    '</svg>',
    '',
  ].join('\n');
}

