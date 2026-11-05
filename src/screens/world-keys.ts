import { go, layout } from '../app/app';
import { DRILL_SECONDS, worldKeys, worldKeysMissing, worldLock, worldName, worldNewKeys } from '../game/levels';
import { imageUrl } from '../gfx/assets';
import { t } from '../i18n/i18n';
import { LAYOUTS, allKeys } from '../keyboard/layouts';
import { keyName } from '../keyboard/key-names';
import { MASTERED_TEXT, lessonKeysFor, masteredKeyNames, notReadyKeys } from '../learning/lessons';
import type { Profile } from '../storage/schema';
import { button, h, icon, modal } from '../ui/dom';
import { KeyboardGuide, keyLabel, namedKeyCaps, namedKeyLabel } from '../ui/keyboard-guide';
import { openPracticeKeys } from './practice-keys';

/** What a closed world still needs, in one line (the lock's tooltip); empty for an open one. */
export function worldLockText(p: Profile, world: number): string {
  const lock = worldLock(p, world);
  if (!lock) return '';
  if (lock.kind === 'world') return t('map.lockWorld', { world: worldName(lock.prev) });
  if (lock.kind === 'need') return `${t('map.lockNeed', MASTERED_TEXT)} ${lock.keys.map((n) => namedKeyLabel(LAYOUTS[p.layout], n).main).join(', ')}`;
  return t('map.lockKeys', { n: lock.need, have: lock.have });
}

/** The keyboard button of an open world on the map, drawn like the world's badge: opens the world's keys. */
export function worldKeysButton(p: Profile, world: number): HTMLElement {
  const label = t('worldKeys.open', { world: worldName(world) });
  const src = imageUrl('ui-world-keys');
  return h('button', { class: 'world-kb-btn', type: 'button', 'aria-label': label, tip: label, onClick: (e: MouseEvent) => {
    e.stopPropagation();
    openWorldKeys(p, world);
  } }, src ? h('img', { src, alt: '' }) : icon('keyboard'));
}

/**
 * A world's keys on the child's keyboard, and for a closed world the conditions to open it. Keys are outlined by their
 * part, not by finger: must know green, I learn orange, dashed while not mastered, solid with a check once mastered; a
 * mastered key outside the world grey. A closed world says why above the keyboard (with the short drill of its missing
 * keys, or own practice while its story waits for keys) and lists its missing keys under it.
 */
export function openWorldKeys(p: Profile, world: number): void {
  const need = new Set(worldKeys(p, world)), learn = new Set(worldNewKeys(p, world));
  const mastered = masteredKeyNames(p);
  const lay = layout();
  const kb = new KeyboardGuide(lay);
  kb.el.classList.add('world-kb');
  for (const def of allKeys(lay)) {
    const name = keyName(lay, def.code), el = kb.keyEl(def.code);
    if (!name || !el) continue;
    const known = mastered.has(name);
    if (need.has(name)) el.classList.add('wk-need');
    else if (learn.has(name)) el.classList.add('wk-learn');
    else if (known) el.classList.add('wk-other');
    if (known) el.classList.add('wk-known');
  }
  const lock = worldLock(p, world);
  const missing = worldKeysMissing(p, world);
  const close = () => closeModal();
  const actions = [
    ...(missing.length ? [button(t('stats.drill'), () => { close(); go('level', { id: 'practice', keys: lessonKeysFor(p, missing), seconds: DRILL_SECONDS }); }, 'btn small', 'practice')] : []),
    ...(lock?.kind === 'keys' ? [button(t('map.practice'), () => { close(); openPracticeKeys(); }, 'btn small', 'practice')] : []),
  ];
  const held = lock?.kind === 'keys' && notReadyKeys(p).length ? t('map.heldKeys', { keys: notReadyKeys(p).map(keyLabel).join(', ') }) : '';
  const closeModal = modal(h('div', { class: 'world-keys-panel' },
    h('h2', {}, ...(lock ? [icon('lock'), ' ', t('worldKeys.titleLocked', { world: worldName(world) })] : [t('worldKeys.titleOpen', { world: worldName(world) })])),
    lock ? h('p', { class: 'wk-lock' }, lock.kind === 'need' ? t('worldKeys.lockedByKeys') : worldLockText(p, world)) : null,
    held ? h('p', { class: 'held-keys' }, held) : null,
    actions.length ? h('div', { class: 'row wk-actions' }, ...actions) : null,
    kb.el,
    h('p', { class: 'legend wk-legend' },
      h('span', { class: 'lg wk-need' }, t('worldKeys.need', { n: need.size })),
      h('span', { class: 'lg wk-learn' }, t('worldKeys.learn', { n: learn.size })),
      h('span', { class: 'lg wk-known' }, `✓ ${t('worldKeys.known')}`),
      h('span', { class: 'lg wk-other' }, t('worldKeys.other'))),
    h('p', { class: 'hint' }, t('worldKeys.mastered', MASTERED_TEXT)),
    missing.length ? h('div', { class: 'wk-missing' }, h('p', {}, t('worldKeys.missing')), namedKeyCaps(lay, missing, mastered)) : null), { cls: 'world-keys-modal' });
}
