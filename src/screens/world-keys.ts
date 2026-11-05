import { layout } from '../app/app';
import { worldKeys, worldLock, worldName, worldNewKeys } from '../game/levels';
import { t } from '../i18n/i18n';
import { codeOfName } from '../keyboard/key-names';
import { MASTERED_TEXT, masteredKeyNames } from '../learning/lessons';
import type { Profile } from '../storage/schema';
import { h, icon, modal } from '../ui/dom';
import { KeyboardGuide } from '../ui/keyboard-guide';

/** The round keyboard button of a world on the map: opens the world's keys. */
export function worldKeysButton(p: Profile, world: number): HTMLElement {
  const label = t('worldKeys.open', { world: worldName(world) });
  return h('button', { class: 'world-kb-btn', type: 'button', 'aria-label': label, tip: label, onClick: (e: MouseEvent) => {
    // On a closed world the island under it opens the lock card; this button opens only the keys.
    e.stopPropagation();
    openWorldKeys(p, world);
  } }, icon('keyboard'));
}

/**
 * The keys of a world on the child's keyboard: the keys to master before it opens, the keys it teaches and, marked, the
 * keys the child masters already; a world closed only by keys says so above the keyboard.
 */
export function openWorldKeys(p: Profile, world: number): void {
  const need = worldKeys(p, world), learn = worldNewKeys(p, world);
  const mastered = masteredKeyNames(p);
  const lay = layout();
  const kb = new KeyboardGuide(lay);
  kb.el.classList.add('world-kb');
  const mark = (names: string[], cls: string) => {
    for (const name of names) {
      const el = kb.keyEl(codeOfName(lay, name) ?? '');
      if (!el) continue;
      el.classList.add(cls);
      if (mastered.has(name)) el.classList.add('wk-known');
    }
  };
  mark(need, 'wk-need');
  mark(learn, 'wk-learn');
  const lock = worldLock(p, world);
  modal(h('div', { class: 'world-keys-panel' },
    h('h2', {}, t('worldKeys.title', { world: worldName(world) })),
    lock?.kind === 'need' ? h('p', { class: 'wk-lock' }, icon('lock'), ' ', t('worldKeys.lockedByKeys')) : null,
    kb.el,
    h('p', { class: 'legend wk-legend' },
      h('span', { class: 'lg wk-need' }, t('worldKeys.need', { n: need.length })),
      h('span', { class: 'lg wk-learn' }, t('worldKeys.learn', { n: learn.length })),
      h('span', { class: 'lg wk-known' }, `✓ ${t('worldKeys.known')}`)),
    h('p', { class: 'hint' }, t('worldKeys.mastered', MASTERED_TEXT))), { cls: 'world-keys-modal' });
}
