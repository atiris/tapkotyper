import { type Side, VIEW } from '../../src/ui/hand-svg';

/**
 * A hand's outline in the SVG Tapko draws, read and written the same way by the hand tool and its save. Reading also
 * takes the file back from an editor (Inkscape): attributes on several lines or in `style`, relative path commands.
 */

/** A hand's outline and thin lines: filled bands (as traced), or middle lines drawn this wide (keyboard units). */
export interface Outline { lines: string; creases: string; width?: { lines: number; creases: number } }

/** A path element's attributes, with the ones in its `style` as well. */
function attrsOf(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) out[m[1]] = m[2];
  for (const part of (out.style ?? '').split(';')) {
    const [k, v] = part.split(':').map((x) => x.trim());
    if (k && v && !(k in out)) out[k] = v;
  }
  return out;
}

const fmt = (n: number) => String(Math.round(n * 100) / 100);

/** A path with only absolute M, L, C and Z commands (the tool moves its points as x y pairs). */
export function absolutePath(d: string): string {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi) ?? [];
  const out: string[] = [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0, qx = 0, qy = 0, last = '';
  const num = () => Number(tokens[i++]);
  const curve = (x1: number, y1: number, x2: number, y2: number, ex: number, ey: number) => {
    out.push(`C${fmt(x1)} ${fmt(y1)} ${fmt(x2)} ${fmt(y2)} ${fmt(ex)} ${fmt(ey)}`);
    cx = x2; cy = y2; x = ex; y = ey;
  };
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    else if (!cmd) { i++; continue; }
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'Z') { out.push('Z'); x = sx; y = sy; last = 'Z'; cmd = ''; continue; }
    if (C === 'M') {
      x = ox + num(); y = oy + num(); sx = x; sy = y;
      out.push(`M${fmt(x)} ${fmt(y)}`);
      cmd = rel ? 'l' : 'L';
    } else if (C === 'L') { x = ox + num(); y = oy + num(); out.push(`L${fmt(x)} ${fmt(y)}`); }
    else if (C === 'H') { x = ox + num(); out.push(`L${fmt(x)} ${fmt(y)}`); }
    else if (C === 'V') { y = oy + num(); out.push(`L${fmt(x)} ${fmt(y)}`); }
    else if (C === 'C') { const a = [num(), num(), num(), num(), num(), num()]; curve(ox + a[0], oy + a[1], ox + a[2], oy + a[3], ox + a[4], oy + a[5]); }
    else if (C === 'S') {
      const [x1, y1] = last === 'C' || last === 'S' ? [2 * x - cx, 2 * y - cy] : [x, y];
      const a = [num(), num(), num(), num()];
      curve(x1, y1, ox + a[0], oy + a[1], ox + a[2], oy + a[3]);
    } else if (C === 'Q' || C === 'T') {
      const [px, py] = C === 'Q' ? [ox + num(), oy + num()] : last === 'Q' || last === 'T' ? [2 * x - qx, 2 * y - qy] : [x, y];
      const ex = ox + num(), ey = oy + num();
      qx = px; qy = py;
      curve(x + (2 / 3) * (px - x), y + (2 / 3) * (py - y), ex + (2 / 3) * (px - ex), ey + (2 / 3) * (py - ey), ex, ey);
    } else if (C === 'A') {
      // An arc (rare from an editor) becomes a line to its end.
      i += 5;
      x = ox + num(); y = oy + num();
      out.push(`L${fmt(x)} ${fmt(y)}`);
    } else { i++; continue; }
    last = C;
  }
  return out.join(' ');
}

/** An outline read from an SVG: its paths, and its widths when they are middle lines. */
export function readOutline(svg: string): Outline {
  const paths = [...svg.matchAll(/<path\b([^>]*)>/g)].map((m) => attrsOf(m[1]));
  const find = (cls: string) => paths.find((a) => (a.class ?? '').split(/\s+/).includes(cls));
  const lines = find('hand-lines'), creases = find('hand-creases');
  const o: Outline = { lines: absolutePath(lines?.d ?? ''), creases: absolutePath(creases?.d ?? '') };
  const widthOf = (a?: Record<string, string>) => (a?.fill === 'none' ? Number.parseFloat(a['stroke-width'] ?? '') || 0 : 0);
  const w = widthOf(lines);
  if (w) o.width = { lines: w, creases: widthOf(creases) || w / 2 };
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

