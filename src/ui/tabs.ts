import { arrowFocus, button, h } from './dom';

/** A row of tabs (`[id, label]`) that sits right above its panel; selects `current` now and calls `onChange` on every pick; the arrows pick the next one. */
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
  arrowFocus(nav, '.tab', (b) => b.click());
  show(current);
  return nav;
}

/** The element that scrolls `el`: its nearest scrolling ancestor, else the page. */
function scroller(el: HTMLElement): Element {
  for (let p = el.parentElement; p; p = p.parentElement) if (/auto|scroll/.test(getComputedStyle(p).overflowY)) return p;
  return document.scrollingElement ?? document.documentElement;
}

/**
 * Once the tab row has scrolled away under the page's top bar, the bar lists the tabs after its
 * title ("Title · Tab · Tab", the open one marked) on a desktop screen wide enough for them; a
 * link opens its tab at the top of the page. Stops listening when the bar leaves the page.
 */
export function barTabLinks(bar: HTMLElement, nav: HTMLElement): void {
  const tabs = [...nav.querySelectorAll<HTMLButtonElement>('.tab')];
  const links = tabs.map((b) => h('a', { href: '#', onClick: (e: Event) => {
    e.preventDefault();
    b.click();
    scroller(nav).scrollTo({ top: 0 });
  } }, b.textContent ?? ''));
  const row = h('span', { class: 'bar-links' }, ...links.flatMap((a) => [h('span', { class: 'bar-dot', 'aria-hidden': 'true' }, '·'), a]));
  bar.querySelector('h1')!.after(row);
  let seen = false;
  const update = () => {
    if (!bar.isConnected) {
      if (!seen) return;
      document.removeEventListener('scroll', update, true);
      removeEventListener('resize', update);
      return;
    }
    seen = true;
    const under = nav.getBoundingClientRect().bottom <= bar.getBoundingClientRect().bottom;
    bar.classList.toggle('show-links', under);
    if (!under) return;
    links.forEach((a, i) => a.classList.toggle('on', tabs[i].getAttribute('aria-selected') === 'true'));
    bar.classList.remove('links-cramped');
    bar.classList.toggle('links-cramped', row.scrollWidth > row.clientWidth);
  };
  document.addEventListener('scroll', update, { capture: true, passive: true });
  addEventListener('resize', update);
}
