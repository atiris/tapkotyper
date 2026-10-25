import { tapkoElement } from '../gfx/tapko';
import { hasParrotBadge } from '../game/parrots';
import { totalStars } from '../game/rewards';
import { t } from '../i18n/i18n';
import { nickname } from '../storage/store';
import type { Profile } from '../storage/schema';
import { parrotBadge } from './badge';
import { h } from './dom';

/** Players picked by the number keys. */
export const NUMBERED = 9;
/** Each number badge leans by its own fixed angle, so the row looks placed by hand. */
const NUM_TILT = [-12, 8, -5, 14, -9, 6, -14, 10, -7];

/** A player's card: the number key that picks it, the character, the nickname (with the Parrot badge when held), the real name when it differs, the stars. */
export function profileCard(p: Profile, i: number, onPick: () => void): HTMLElement {
  return h('button', {
    class: 'profile-card', type: 'button', onClick: onPick,
    'aria-label': i < NUMBERED ? `${i + 1}: ${nickname(p)}` : null,
    tip: i < NUMBERED ? t('start.pickByNumber', { n: i + 1 }) : null,
  },
    i < NUMBERED ? h('span', { class: 'profile-num', 'aria-hidden': 'true', style: `--tilt: ${NUM_TILT[i]}deg` }, String(i + 1)) : null,
    tapkoElement(p.companion, 'idle', 96),
    h('span', { class: 'profile-name' }, nickname(p), hasParrotBadge(p) ? parrotBadge() : null),
    // Siblings recognize their own tile by the real name under the nickname.
    p.name && p.name !== nickname(p) ? h('span', { class: 'profile-real' }, p.name) : null,
    h('span', { class: 'profile-sub' }, t('start.stars', { n: totalStars(p) })));
}

/**
 * The card a number key picks (0-based), by the key, not its character, so a Slovak
 * keyboard's "ľ" is 2; null for other keys, with a modifier, or past the cards.
 */
export function numberPick(e: KeyboardEvent, count: number): number | null {
  if (e.ctrlKey || e.altKey || e.metaKey) return null;
  const digit = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
  if (!digit) return null;
  const i = Number(digit[1]) - 1;
  return i < count && i < NUMBERED ? i : null;
}
