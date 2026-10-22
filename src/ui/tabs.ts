import { button, h } from './dom';

/** A row of tabs (`[id, label]`) that sits right above its panel; selects `current` now and calls `onChange` on every pick. */
export function tabBar<T extends string>(tabs: readonly (readonly [T, string])[], current: T, onChange: (tab: T) => void): HTMLElement {
  const nav = h('nav', { class: 'tabs', role: 'tablist' });
  const show = (tab: T) => {
    nav.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    onChange(tab);
  };
  for (const [tab, label] of tabs) {
    const b = button(label, () => show(tab), 'tab');
    b.dataset.tab = tab;
    b.setAttribute('role', 'tab');
    nav.append(b);
  }
  show(current);
  return nav;
}
