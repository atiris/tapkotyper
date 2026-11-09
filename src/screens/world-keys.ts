import { go, layout } from '../app/app';
import { DRILL_SECONDS, worldKeys, worldKeysMissing, worldLock, worldName, worldNewKeys } from '../game/levels';
import { imageUrl } from '../gfx/assets';
import { t } from '../i18n/i18n';
import { LAYOUTS, allKeys } from '../keyboard/layouts';
import { codeOfName, keyName } from '../keyboard/key-names';
import { MASTERED_TEXT, lessonKeysFor, masteredKeyNames, notReadyKeys } from '../learning/lessons';
import type { Profile } from '../storage/schema';
import { button, h, icon, modal } from '../ui/dom';
import { tip } from '../ui/tooltip';
import { KeyboardGuide, keyLabel, namedKeyCaps, namedKeyLabel } from '../ui/keyboard-guide';
import { openPracticeKeys } from './practice-keys';
import { keyForCode, keyStatsCap } from './stats';

/** Which letters still need accuracy before new ones open (the target range trains them); empty when none holds them back. */
export function heldText(p: Profile): string {
  const keys = notReadyKeys(p);
  return keys.length ? t('map.heldKeys', { keys: keys.map(keyLabel).join(', ') }) : '';
}

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
 * keys, or own practice while its story waits for keys) and lists its missing keys under it. A key with statistics,
 * on the keyboard or in the list, opens them on My progress.
 */
export function openWorldKeys(p: Profile, world: number): void {
  const need = new Set(worldKeys(p, world)), learn = new Set(worldNewKeys(p, world));
  const mastered = masteredKeyNames(p);
  const lay = layout();
  const kb = new KeyboardGuide(lay);
  kb.el.classList.add('world-kb');
  kb.onKeyClick((code) => {
    const key = keyForCode(code);
    if (key) go('progress', { tab: 'keys', key });
  });
  for (const def of allKeys(lay)) {
    const name = keyName(lay, def.code), el = kb.keyEl(def.code);
    if (!name || !el) continue;
    if (keyForCode(def.code)) el.dataset.stat = '';
    const known = mastered.has(name);
    if (need.has(name)) el.classList.add('wk-need');
    else if (learn.has(name)) el.classList.add('wk-learn');
    else if (known) el.classList.add('wk-other');
    if (known) el.classList.add('wk-known');
  }
  const lock = worldLock(p, world);
  const missing = worldKeysMissing(p, world);
  const close = () => closeModal();
  // The drill of the missing keys, named in its tooltip as on My keys; own practice while the story waits for keys.
  const drillKeys = lessonKeysFor(p, missing);
  const drill = missing.length ? button(t('stats.drill'), () => { close(); go('level', { id: 'practice', keys: drillKeys, seconds: DRILL_SECONDS }); }, 'btn primary', 'practice') : null;
  if (drill) tip(drill, t('stats.drillTip', { keys: drillKeys.map(keyLabel).join(' ') }));
  const actions = [drill, lock?.kind === 'keys' ? button(t('map.practice'), () => { close(); openPracticeKeys(); }, 'btn', 'practice') : null].filter((b) => !!b);
  const held = lock?.kind === 'keys' ? heldText(p) : '';
  // Each missing key links to its statistics, in the line of the sentence; a key without them (a dead key) is a plain cap.
  const missingCaps = missing.flatMap((name) => {
    const key = keyForCode(codeOfName(lay, name) ?? '');
    return [key ? keyStatsCap(key) : namedKeyCaps(lay, [name], mastered), ' '];
  });
  const closeModal = modal(h('div', { class: 'world-keys-panel' },
    h('h2', {}, ...(lock ? [icon('lock'), ' ', t('worldKeys.titleLocked', { world: worldName(world) })] : [t('worldKeys.titleOpen', { world: worldName(world) })])),
    lock ? h('p', { class: 'wk-lock' }, lock.kind === 'need' ? t('worldKeys.lockedByKeys') : worldLockText(p, world)) : null,
    held ? h('p', { class: 'held-keys' }, held) : null,
    kb.el,
    h('p', { class: 'legend wk-legend' },
      h('span', { class: 'lg wk-need' }, t('worldKeys.need', { n: need.size })),
      h('span', { class: 'lg wk-learn' }, t('worldKeys.learn', { n: learn.size })),
      h('span', { class: 'lg wk-known' }, `✓ ${t('worldKeys.known')}`),
      h('span', { class: 'lg wk-other' }, t('worldKeys.other'))),
    h('p', { class: 'hint wk-mastered' }, t('worldKeys.solid'), h('br'), t('worldKeys.mastered', MASTERED_TEXT)),
    missing.length ? h('p', { class: 'wk-missing' }, h('b', {}, t('worldKeys.missing')), ...missingCaps) : null,
    actions.length ? h('div', { class: 'row wk-actions' }, ...actions) : null), { cls: 'world-keys-modal' });
}
