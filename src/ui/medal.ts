import { t } from '../i18n/i18n';
import { h } from './dom';

/** Growth medal with its number (one for each automatic step up). */
export function medal(n: number, small = false): HTMLElement {
  return h('span', { class: `medal ${small ? 'small' : ''}`, role: 'img', 'aria-label': t('results.medalAria', { n }) },
    h('span', { class: 'medal-ribbon' }), h('span', { class: 'medal-disc' }, String(n)));
}
