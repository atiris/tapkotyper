import { tapkoElement } from '../gfx/tapko';
import { hasParrotBadge } from '../game/parrots';
import { WORLDS } from '../game/levels';
import { MAX_STARS, totalStars } from '../game/rewards';
import { imageUrl } from '../gfx/assets';
import { masterySummary, recentTyping } from '../learning/stats';
import { t } from '../i18n/i18n';
import { nickname } from '../storage/store';
import type { Profile } from '../storage/schema';
import { h } from './dom';

/** Players picked by the number keys. */
export const NUMBERED = 9;
/** Each number badge leans by its own fixed angle, so the row looks placed by hand. */
const NUM_TILT = [-12, 8, -5, 14, -9, 6, -14, 10, -7];

/** A player's card: the number key that picks it (with the parrot under it while the Parrot badge is held), the character, the nickname, and the progress at its bottom. */
export function profileCard(p: Profile, i: number, onPick: () => void): HTMLElement {
  return h('button', {
    class: 'profile-card', type: 'button', onClick: onPick,
    'aria-label': i < NUMBERED ? `${i + 1}: ${nickname(p)}` : null,
    tip: i < NUMBERED ? t('start.pickByNumber', { n: i + 1 }) : null,
  },
    i < NUMBERED ? h('span', { class: 'profile-num', 'aria-hidden': 'true', style: `--tilt: ${NUM_TILT[i]}deg` }, String(i + 1)) : null,
    hasParrotBadge(p) ? parrotMark() : null,
    tapkoElement(p.companion, 'idle', 96),
    h('span', { class: 'profile-name' }, nickname(p)),
    cardStats(p));
}

/** The Parrot badge on a player's card: the parrot itself, by the character's feet under the number. */
function parrotMark(): HTMLElement | null {
  const src = imageUrl('ui-act-parrot');
  return src ? h('span', { class: 'profile-parrot', role: 'img', 'aria-label': t('parrot.badge'), tip: t('parrot.badge') }, h('img', { src, alt: '' })) : null;
}

/** A small picture with a number; the meaning is in the tooltip and the label. */
function stat(pic: string, glyph: string, text: string, label: string): HTMLElement {
  const src = imageUrl(pic);
  return h('span', { class: 'profile-stat', role: 'img', 'aria-label': label, tip: label }, src ? h('img', { src, alt: '' }) : h('i', {}, glyph), h('b', {}, text));
}

/** The counts of "My progress" without their maxima (the tooltips keep them): keys mastered, worlds done, accuracy of the last 14 days, stars. */
function cardStats(p: Profile): HTMLElement {
  const m = masterySummary(p);
  const worlds = p.progress.worldsDone.length;
  const recent = recentTyping(p, 14);
  const acc = recent.chars ? String(Math.round(recent.accuracy * 100)) : '–';
  const stars = totalStars(p);
  return h('span', { class: 'profile-stats' },
    stat('ui-key', '⌨', String(m.mastered), t('progress.keys', { n: m.mastered, total: m.total })),
    stat('ui-earth', '●', String(worlds), t('progress.worlds', { n: worlds, total: WORLDS.length })),
    stat('ui-accuracy', '✓', acc, t('progress.quality', { n: acc })),
    stat('ui-star', '★', String(stars), t('progress.stars', { n: stars, total: MAX_STARS })));
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
