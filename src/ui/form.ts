import { h } from './dom';

/** A labelled control of a settings form, with an optional short line under it. */
export function field(label: string, control: HTMLElement, hint?: string, tag: 'label' | 'div' = 'label'): HTMLElement {
  return h(tag, { class: 'field' }, h('span', { class: 'field-label' }, label), control, hint ? h('small', {}, hint) : null);
}

export function range(value: number, min: number, max: number, step: number, onInput: (v: number) => void, fmt: (v: number) => string = String): HTMLElement {
  const out = h('output', {}, fmt(value));
  const input = h('input', { type: 'range', min, max, step, value });
  input.addEventListener('input', () => { out.textContent = fmt(Number(input.value)); onInput(Number(input.value)); });
  return h('span', { class: 'range' }, input, out);
}

export function check(value: boolean, onChange: (v: boolean) => void): HTMLInputElement {
  const c = h('input', { type: 'checkbox' });
  c.checked = value;
  c.addEventListener('change', () => onChange(c.checked));
  return c;
}

let switchIds = 0;

/** A checkbox on the left, its bold title to the right and an optional short line under the title. */
export function switchField(title: string, box: HTMLInputElement, hint?: string): HTMLElement {
  const id = hint ? `switch-hint-${++switchIds}` : '';
  if (id) box.setAttribute('aria-describedby', id);
  return h('div', { class: 'switch-field' },
    h('label', {}, box, h('span', { class: 'switch-title' }, title)),
    hint ? h('small', { id }, hint) : null);
}

export function select<T extends string>(value: T, options: [T, string][], onChange: (v: T) => void): HTMLSelectElement {
  const s = h('select', {}, ...options.map(([v, l]) => h('option', { value: v, selected: v === value }, l)));
  s.addEventListener('change', () => onChange(s.value as T));
  return s;
}

/** A choice of a few options as a row of chips, one of them on; `set` changes it from outside without `onChange`. */
export function segmented<T extends string>(label: string, value: T, options: [T, string][], onChange: (v: T) => void): { el: HTMLElement; set(v: T): void } {
  const chips = options.map(([v, text]) => h('button', { type: 'button', class: 'chip', onClick: () => { set(v); onChange(v); } }, text));
  const set = (v: T) => options.forEach(([x], i) => {
    chips[i].classList.toggle('on', x === v);
    chips[i].setAttribute('aria-pressed', String(x === v));
  });
  set(value);
  return { el: h('div', { class: 'chips seg', role: 'group', 'aria-label': label }, ...chips), set };
}
