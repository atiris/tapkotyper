import { t } from '../i18n/i18n';
import { h } from './dom';

/** Inline SVG line chart (no chart library). */
export function lineChart(values: number[], labels: string[], unit: string, color: string): HTMLElement {
  const w = 520, hh = 160, pad = 28;
  if (values.length < 1) return h('p', { class: 'hint' }, t('parent.noData'));
  const max = Math.max(...values, 1);
  const xs = values.map((_, i) => pad + (values.length === 1 ? (w - 2 * pad) / 2 : (i * (w - 2 * pad)) / (values.length - 1)));
  const ys = values.map((v) => hh - pad - (v / max) * (hh - 2 * pad));
  const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const svg = `<svg viewBox="0 0 ${w} ${hh}" class="chart" role="img" aria-label="${unit}">
    <line x1="${pad}" y1="${hh - pad}" x2="${w - pad}" y2="${hh - pad}" class="axis"/>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    ${xs.map((x, i) => `<circle cx="${x}" cy="${ys[i]}" r="4" fill="${color}"><title>${labels[i]}: ${values[i]} ${unit}</title></circle>`).join('')}
    <text x="${pad}" y="16" class="chart-label">${max} ${unit}</text>
    <text x="${pad}" y="${hh - 8}" class="chart-label">${labels[0] ?? ''}</text>
    <text x="${w - pad}" y="${hh - 8}" text-anchor="end" class="chart-label">${labels[labels.length - 1] ?? ''}</text></svg>`;
  return h('div', { html: svg });
}

export function barChart(values: number[], labels: string[], unit: string): HTMLElement {
  const w = 520, hh = 160, pad = 28;
  if (!values.length) return h('p', { class: 'hint' }, t('parent.noData'));
  const max = Math.max(...values, 1);
  const bw = Math.min(40, (w - 2 * pad) / values.length - 6);
  const svg = `<svg viewBox="0 0 ${w} ${hh}" class="chart" role="img" aria-label="${unit}">
    <line x1="${pad}" y1="${hh - pad}" x2="${w - pad}" y2="${hh - pad}" class="axis"/>
    ${values.map((v, i) => {
      const x = pad + i * ((w - 2 * pad) / values.length) + 3;
      const bh = (v / max) * (hh - 2 * pad);
      return `<rect x="${x}" y="${hh - pad - bh}" width="${bw}" height="${bh}" rx="4" fill="#5fb37b"><title>${labels[i]}: ${v} ${unit}</title></rect>`;
    }).join('')}
    <text x="${pad}" y="16" class="chart-label">${max} ${unit}</text>
    <text x="${pad}" y="${hh - 8}" class="chart-label">${labels[0]}</text>
    <text x="${w - pad}" y="${hh - 8}" text-anchor="end" class="chart-label">${labels[labels.length - 1]}</text></svg>`;
  return h('div', { html: svg });
}
