import { app, go, layout } from '../app/app';
import { speech } from '../audio/speech';
import type { Style } from '../game/typing';
import { t } from '../i18n/i18n';
import { allKeys } from '../keyboard/layouts';
import { activeKeys, isLetterKey, practiceOrder, practiceSteps, stepHolding } from '../learning/lessons';
import { KeyboardGuide, keyLabel } from '../ui/keyboard-guide';
import { button, h, modal } from '../ui/dom';
import { keyForCode } from './stats';

/** Fewest letters free practice needs to build words. */
const MIN_LETTERS = 2;

/**
 * Free practice starts here: the keyboard with the chosen keys lit, a slider that adds keys
 * in the lesson order three at a time, and single keys toggled by a click. It opens with
 * the child's active keys and copy typing; dictation shows only when the browser has a voice.
 */
export function openPracticeKeys(): void {
  const p = app.profile!;
  const order = practiceOrder(p);
  const steps = practiceSteps(order);
  let chosen = new Set(activeKeys(p));
  let step = stepHolding(steps, [...chosen]);
  let shifted = false;
  let style: Style = 'copy';
  const styles: Style[] = speech.available(p.language) ? ['copy', 'dictation', 'memory'] : ['copy', 'memory'];
  const styleBtns = styles.map((s) => h('button', { class: 'chip', type: 'button', 'data-style': s, onClick: () => {
    style = s;
    paint();
  } }, t(`practiceKeys.${s}`)));
  const codes = allKeys(layout()).map((d) => d.code);
  const kb = new KeyboardGuide(layout());
  kb.el.classList.add('picker', 'practice-picker');
  kb.exposeKeys();
  kb.onKeyClick((code) => {
    const key = keyForCode(code, shifted);
    if (!key || !order.includes(key)) return;
    if (chosen.has(key)) chosen.delete(key); else chosen.add(key);
    paint();
  });
  const slider = h('input', { type: 'range', min: '1', max: String(steps.length), step: '1', value: String(step + 1), 'aria-label': t('practiceKeys.slider') }) as HTMLInputElement;
  slider.addEventListener('input', () => {
    step = Number(slider.value) - 1;
    chosen = new Set(steps[step]);
    paint();
  });
  const shiftChip = h('button', { class: 'chip shift-toggle', type: 'button', 'aria-pressed': 'false', onClick: () => {
    shifted = !shifted;
    shiftChip.classList.toggle('on', shifted);
    shiftChip.setAttribute('aria-pressed', String(shifted));
    paint();
  } }, t('stats.shifted'));
  const stepLabel = h('span', { class: 'pk-step' });
  const count = h('span', { class: 'pk-count' });
  const hint = h('p', { class: 'hint pk-hint', role: 'status' });
  const start = button(t('practiceKeys.start'), () => {
    close();
    go('level', { id: 'practice', chosen: [...chosen], style });
  }, 'btn primary', 'play');
  start.autofocus = true;

  function paint(): void {
    styleBtns.forEach((b, i) => {
      b.classList.toggle('on', styles[i] === style);
      b.setAttribute('aria-pressed', String(styles[i] === style));
    });
    kb.el.classList.toggle('shifted', shifted);
    for (const code of codes) {
      const el = kb.keyEl(code)!;
      const key = keyForCode(code, shifted);
      const usable = !!key && order.includes(key);
      const on = !!key && chosen.has(key);
      el.classList.toggle('picked', on);
      el.classList.toggle('off', !usable);
      if (usable) {
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', keyLabel(key));
        el.setAttribute('aria-pressed', String(on));
        el.tabIndex = 0;
      } else {
        el.removeAttribute('role');
        el.removeAttribute('aria-label');
        el.removeAttribute('aria-pressed');
        el.removeAttribute('tabindex');
      }
    }
    const own = chosen.size !== steps[step].length || steps[step].some((k) => !chosen.has(k));
    slider.value = String(step + 1);
    stepLabel.textContent = own ? t('practiceKeys.own') : t('practiceKeys.step', { n: step + 1, total: steps.length });
    const n = chosen.size;
    count.textContent = t(n === 1 ? 'practiceKeys.countOne' : n < 5 ? 'practiceKeys.countFew' : 'practiceKeys.countMany', { n });
    const short = [...chosen].filter(isLetterKey).length < MIN_LETTERS;
    start.disabled = short;
    hint.textContent = short ? t('practiceKeys.needLetters', { n: MIN_LETTERS }) : '';
  }
  paint();

  const close = modal(h('div', { class: 'practice-keys' },
    h('h2', {}, t('practiceKeys.title')),
    h('p', { class: 'hint' }, t('practiceKeys.intro')),
    h('div', { class: 'pk-styles', role: 'group', 'aria-label': t('practiceKeys.style') }, ...styleBtns),
    kb.el,
    h('div', { class: 'pk-row' }, shiftChip, count),
    h('label', { class: 'pk-slider' }, h('span', {}, t('practiceKeys.slider')), slider, stepLabel),
    hint,
    h('div', { class: 'row center' }, start)), { cls: 'practice-keys-modal' });
}
