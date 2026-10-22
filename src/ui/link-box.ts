import qrcode from 'qrcode-generator';
import { t } from '../i18n/i18n';
import { button, h } from './dom';

/** Bytes a QR code holds at most (version 40, low error correction). */
const QR_MAX = 2900;

/** True when the link fits in a QR code. */
export const fitsQr = (link: string) => link.length <= QR_MAX;

/** A link to copy, with a QR code when it fits in one. */
export function linkBox(link: string): HTMLElement {
  const area = h('textarea', { class: 'link-text', rows: 3, readonly: true, 'aria-label': t('share.link') });
  area.value = link;
  area.addEventListener('focus', () => area.select());
  const done = h('span', { class: 'hint', 'aria-live': 'polite' });
  const copy = button(t('share.copy'), async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      area.select();
      document.execCommand('copy');
    }
    done.textContent = t('share.copied');
  }, 'btn primary', 'code');
  return h('div', { class: 'link-box' },
    area,
    h('div', { class: 'row' }, copy, done),
    fitsQr(link) ? qr(link) : h('p', { class: 'hint' }, t('share.noQr')));
}

export function qr(link: string): HTMLElement {
  const code = qrcode(0, 'L');
  code.addData(link, 'Byte');
  code.make();
  return h('div', { class: 'qr', role: 'img', 'aria-label': t('share.qr'), html: code.createSvgTag({ cellSize: 4, margin: 4, scalable: true }) });
}
