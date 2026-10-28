import { go } from '../app/app';
import { imageUrl } from '../gfx/assets';
import { type Dict, type Group, type Item, type Section, WORDS, buildCatalog, lookup, thumbs } from '../i18n/catalog';
import { LANGS, LANGUAGES, askedLanguage, isLang, language, officialDict, ownDict, setLanguage } from '../i18n/i18n';
import { type OwnLang, canonicalCode, deleteOwnLang, isOwnRef, newOwnLang, ownId, ownLangs, ownRef, ownStoreWorks, saveOwnLang } from '../i18n/own-langs';
import {
  type Field, type GuideFile, type ImportPlan, type Source, addVariant, exportJson, exportPairs, fieldValue, fieldsOf, flatGuide, formExample, guideText, itemNames,
  planJson, planPairs, prefill, progressOf, removeVariant, setFieldValue, situationFinder, sourceValue, splitWords, touch, untouch,
} from '../i18n/translation';
import { LAYOUTS, LAYOUT_IDS, canType } from '../keyboard/layouts';
import { lessonGroups } from '../learning/lessons';
import type { Lang, LangRef, LayoutId } from '../storage/schema';
import { cornerControls } from '../ui/chrome';
import { button, confirmDialog, download, h, icon, modal } from '../ui/dom';
import { rhythmRing, roundButton, roundTextSvg } from '../ui/hud';
import { loadWords } from '../words/words';

/** Where approved translations are asked for: a new issue of the project. */
const ISSUES = 'https://github.com/atiris/tapkotyper/issues/new';
/** The project's code search: every place a key is read or written. */
const codeSearch = (key: string) => `https://github.com/search?${new URLSearchParams({ q: `repo:atiris/tapkotyper "${key}"`, type: 'code' })}`;
/** A prefilled issue address longer than this is cut by browsers or GitHub: the file goes as an attachment. */
const ISSUE_URL_MAX = 7000;
const SAVE_MS = 500;
/** First lessons whose typeable words the words section counts, and the count that is enough. */
const LESSONS_SHOWN = 8;
const LESSON_WORDS_MIN = 20;
/** A text longer than this takes a whole row on a wide screen, base and translation side by side. */
const LONG_TEXT = 160;
/** A field's accessible name quotes at most this much of its base text. */
const LABEL_MAX = 80;
/** The last shadow language and translation, a convenience of this browser only. */
const REMEMBER = 'tapkotyper:translate';

const icons = new Map<string, HTMLElement>();
/** An icon for the many items of the sheet: parsed once, then cloned. */
const icon1 = (name: Parameters<typeof icon>[0]) => (icons.get(name) ?? icons.set(name, icon(name)).get(name)!).cloneNode(true) as HTMLElement;

const defaultLayout = (lang: Lang): LayoutId => (lang === 'sk' ? 'sk-qwertz' : 'us-qwerty');
/** A share as a whole percentage: the first field done shows 1 %, only everything done shows 100 %. */
const pct = (p: number) => (p > 0 && p < 0.01 ? 1 : Math.floor(p * 100));
const placeholders = (s: string) => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => `{${m[1]}}`))];

/** The translator's own file: its texts (`ui`) and the guide. */
type TranslatorFile = GuideFile & { ui: Dict };
const translatorFile = (lang: string): Promise<Partial<TranslatorFile> | null> =>
  fetch(`${import.meta.env.BASE_URL}i18n/translator/${lang}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);

/** The page's texts and the guide (flat), read when the page opens. */
let ui: Dict = {};
let guide: Record<string, string> = {};

/** A text of the page; `{name}` placeholders filled from params. */
function tr(key: string, params: Record<string, string | number> = {}): string {
  const v = lookup(ui, key);
  return (typeof v === 'string' ? v : key).replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

/** The page is in English; a file of the game's language, added by hand, translates it, English for what it lacks. */
async function loadTranslator(): Promise<void> {
  const lang = language();
  const [en, own] = await Promise.all([translatorFile('en'), isLang(lang) && lang !== 'en' ? translatorFile(lang) : null]);
  const file = merged((en ?? {}) as Dict, (own ?? {}) as Dict) as unknown as TranslatorFile;
  ui = file.ui ?? {};
  guide = flatGuide(file);
}

async function officialSource(lang: Lang): Promise<Source> {
  const [dict, words] = await Promise.all([officialDict(lang), loadWords(lang)]);
  return { code: lang, name: LANGUAGES[lang], dict, words };
}

/** Deep copy of `base` with `over` laid on top. */
function merged(base: Dict, over: Dict): Dict {
  const out: Dict = { ...base };
  for (const [k, v] of Object.entries(over)) {
    const b = out[k];
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && b && typeof b === 'object' && !Array.isArray(b) ? merged(b, v) : v;
  }
  return out;
}

/** An own language as a source: its texts over its base, so nothing shows empty. */
async function ownSource(l: OwnLang): Promise<Source> {
  const base = await officialSource(l.base);
  return { code: l.code, name: l.name, dict: merged(base.dict, ownDict(l)), words: l.words.length ? l.words : base.words };
}

function remembered(): { target?: string; shadow?: string } {
  try {
    return JSON.parse(localStorage.getItem(REMEMBER) ?? '{}');
  } catch {
    return {};
  }
}

function remember(v: { target?: string; shadow?: string }): void {
  try {
    localStorage.setItem(REMEMBER, JSON.stringify({ ...remembered(), ...v }));
  } catch {
    // A private window: the page simply opens on the defaults next time.
  }
}

/** The translator: every text of the game, English above each field and the translation under it. */
export function translateScreen(root: HTMLElement): () => void {
  const screen = h('div', { class: 'screen translate-screen', lang: 'en' });
  root.append(screen);
  let leave: (() => void) | null = null;
  let alive = true;
  void loadTranslator().then(() => { if (alive) leave = translatorPage(screen); });
  return () => {
    alive = false;
    leave?.();
  };
}

function translatorPage(screen: HTMLElement): () => void {
  let alive = true;
  let owns: OwnLang[] = [];
  let target: OwnLang | null = null;
  let shadowRef: LangRef = 'sk';
  /** English, above every field; the shadow language, in the info box of a field. */
  let base!: Source;
  let shadow!: Source;
  let catalog: Section[] = [];
  let fields: Field[] = [];
  let structure: Dict = {};
  let saveTimer = 0;
  let onlyOpen = false;
  let query = '';
  const inputs = new Map<string, HTMLTextAreaElement>();

  const back = () => go('parent', { granted: true });
  const save = () => {
    clearTimeout(saveTimer);
    saveTimer = 0;
    if (target) void saveOwnLang(target);
  };
  const saveSoon = () => {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(save, SAVE_MS);
  };
  const onHide = () => { if (document.visibilityState === 'hidden' && saveTimer) save(); };
  document.addEventListener('visibilitychange', onHide);

  // ---- top bar ----
  const shadowSelect = h('select', { class: 'tr-shadow', 'aria-label': tr('shadow') });
  const targetSelect = h('select', { class: 'tr-target', 'aria-label': tr('target') });
  const prefillSelect = h('select', { class: 'tr-prefill', 'aria-label': tr('prefill') });
  const ring = roundButton('control', 'check', tr('progress', { n: 0 }), () => jump());
  ring.classList.add('tr-ring');
  const toc = h('nav', { class: 'tr-toc', 'aria-label': tr('toc') });
  const tocSelect = h('select', { class: 'tr-toc-select', 'aria-label': tr('toc') });
  tocSelect.addEventListener('change', () => document.getElementById(`tr-s-${tocSelect.value}`)?.scrollIntoView({ block: 'start' }));
  const main = h('main', { class: 'tr-main' });
  /** The field focused last, and the one the ring went to last (a click on the ring takes the focus). */
  let lastField: string | undefined;
  let ringAt: string | undefined;
  main.addEventListener('focusin', (e) => { lastField = (e.target as HTMLElement).dataset.field ?? lastField; });
  const note = h('p', { class: 'tr-note hint', role: 'status' });
  const needTarget: HTMLButtonElement[] = [];
  const targetButton = (label: string, onClick: () => void, iconName?: Parameters<typeof button>[3]) => {
    const b = button(label, onClick, 'btn small', iconName);
    needTarget.push(b);
    return b;
  };
  const tools = h('div', { class: 'tr-tools' },
    h('label', { class: 'tr-pick', tip: tr('shadowHint') }, icon('language'), h('span', { class: 'tr-pick-label' }, tr('shadow')), shadowSelect),
    h('span', { class: 'tr-pick' }, h('label', { class: 'tr-pick-label' }, tr('target'), targetSelect),
      button(tr('new'), () => void newLanguage(), 'btn small', 'plus'), button(tr('edit'), () => void editLanguage(), 'btn small', 'edit')),
    h('span', { class: 'tr-pick' }, h('label', { class: 'tr-pick-label' }, tr('prefill'), prefillSelect), targetButton(tr('prefillGo'), () => void doPrefill())),
    ring,
    targetButton(tr('aboutButton'), () => aboutPanel(), 'info'),
    targetButton(tr('export'), () => exportMenu(), 'download'),
    button(tr('import'), () => pickImport(), 'btn small', 'upload'),
    targetButton(tr('send'), () => void send(), 'share'));
  const onlyBox = h('input', { type: 'checkbox', class: 'tr-only' });
  onlyBox.addEventListener('change', () => { onlyOpen = onlyBox.checked; applyFilter(); });
  const search = h('input', { type: 'search', class: 'tr-search', placeholder: tr('search'), 'aria-label': tr('search') });
  search.addEventListener('input', () => { query = search.value.trim().toLowerCase(); applyFilter(); });
  const empty = h('p', { class: 'hint tr-empty', hidden: true }, tr('empty'));
  const filter = h('div', { class: 'tr-filter' }, h('label', { class: 'tr-only-label' }, onlyBox, h('span', {}, tr('onlyOpen'))), search);

  screen.append(
    h('header', { class: 'bar' }, button(tr('back'), back, 'btn ghost small', 'back'), h('h1', {}, tr('title'))),
    cornerControls(), tools,
    h('div', { class: 'tr-body' }, h('aside', { class: 'tr-side' }, toc), h('div', { class: 'tr-content' }, tocSelect, note, filter, empty, main)));

  // ---- loading ----
  void (async () => {
    const [list, works] = await Promise.all([ownLangs(), ownStoreWorks()]);
    if (!alive) return;
    owns = list;
    const was = remembered();
    target = owns.find((l) => l.id === was.target) ?? null;
    const known = (ref?: string) => !!ref && (isLang(ref) || owns.some((l) => ownRef(l.id) === ref));
    const asked = language();
    shadowRef = known(was.shadow) ? (was.shadow as LangRef) : asked !== 'en' && known(asked) ? asked : LANGS.find((l) => l !== 'en') ?? 'en';
    if (!works) note.textContent = tr('noStore');
    catalog = buildCatalog(await officialDict('en'));
    await paint();
  })();

  async function sourceOf(ref: LangRef): Promise<Source> {
    const own = isOwnRef(ref) ? owns.find((l) => l.id === ownId(ref)) : null;
    return own ? ownSource(own) : officialSource(isLang(ref) ? ref : 'en');
  }

  function fillSelects(): void {
    const official = LANGS.map((l) => h('option', { value: l }, LANGUAGES[l]));
    const own = (skip?: string) => owns.filter((l) => l.id !== skip).map((l) => h('option', { value: ownRef(l.id) }, l.name));
    shadowSelect.replaceChildren(...official, ...own());
    shadowSelect.value = shadowRef;
    targetSelect.replaceChildren(h('option', { value: '' }, tr('none')), ...owns.map((l) => h('option', { value: l.id }, l.name)));
    targetSelect.value = target?.id ?? '';
    prefillSelect.replaceChildren(...LANGS.map((l) => h('option', { value: l }, LANGUAGES[l])), ...own(target?.id));
    if (target) prefillSelect.value = target.correctionOf ?? target.base;
    for (const b of needTarget) b.disabled = !target;
  }
  shadowSelect.addEventListener('change', () => { shadowRef = shadowSelect.value as LangRef; remember({ shadow: shadowRef }); void paint(); });
  targetSelect.addEventListener('change', () => {
    save();
    target = owns.find((l) => l.id === targetSelect.value) ?? null;
    remember({ target: target?.id ?? '' });
    void paint();
  });

  /** Builds the whole sheet for the chosen translation and shadow language. */
  async function paint(): Promise<void> {
    const [b, sh, s] = await Promise.all([officialSource('en'), sourceOf(shadowRef), officialDict(target?.base ?? 'en')]);
    if (!alive) return;
    base = b;
    shadow = sh;
    structure = s;
    fillSelects();
    setFields(target ? fieldsOf(catalog, target, structure) : []);
    lastField = undefined;
    situationOf = situationFinder(guide);
    names = itemNames(catalog, base.dict);
    inputs.clear();
    observer.disconnect();
    pending.clear();
    main.replaceChildren(...(target ? [] : [h('p', { class: 'tr-start panel' }, tr('startHint'))]), ...catalog.map(sectionEl));
    paintToc();
    paintProgress();
    applyFilter();
  }

  // ---- the sheet ----
  let byId = new Map<string, Field>();
  let byItem = new Map<string, Field[]>();
  let situationOf: (key: string) => string | null = () => null;
  let names = new Map<string, string>();
  /** The fields anew (a variant came or went, another translation): their indexes too. */
  function setFields(list: Field[]): void {
    fields = list;
    byId = new Map(list.map((f) => [f.id, f]));
    byItem = new Map();
    for (const f of list) if (f.item) (byItem.get(f.item.key) ?? byItem.set(f.item.key, []).get(f.item.key)!).push(f);
  }
  const fieldsOfItem = (key: string) => byItem.get(key) ?? [];
  const fieldById = (id: string) => byId.get(id);

  // The sheet has thousands of fields: a section fills in when it comes near the view (or when
  // a search, the filter or a jump needs it).
  const pending = new Map<Element, () => void>();
  const observer = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) pending.get(e.target)?.();
  }, { rootMargin: '1500px 0px' });

  function sectionEl(s: Section): HTMLElement {
    const el = h('section', { class: 'tr-section', id: `tr-s-${s.id}`, 'data-section': s.id },
      guideBlock(`sections.${s.id}.title`, 'h2'), guideBlock(`sections.${s.id}.about`, 'p'));
    pending.set(el, () => {
      pending.delete(el);
      observer.unobserve(el);
      el.append(...s.groups.map((g, i) => groupEl(g, i === 0 || s.groups[i - 1].guide !== g.guide)));
      for (const box of el.querySelectorAll<HTMLElement>('.tr-item')) markItem(box);
    });
    observer.observe(el);
    return el;
  }

  function renderAll(): void {
    for (const fill of [...pending.values()]) fill();
  }

  /** A heading or an explanation of the guide. */
  const guideBlock = (key: string, tag: 'h2' | 'h3' | 'p', name = '') => h('div', { class: 'tr-guide' }, h(tag, {}, guideText(guide, key, name) || key));

  function groupEl(g: Group, withGuide: boolean): HTMLElement {
    const name = g.name ? String(lookup(base.dict, g.name) ?? '') : '';
    const pic = g.name ? thumb(g.name) : null;
    return h('div', { class: 'tr-group', 'data-group': g.id },
      h('div', { class: 'tr-group-head' }, pic, h('div', {}, guideBlock(`groups.${g.guide}.title`, 'h3', name), withGuide ? guideBlock(`groups.${g.guide}.about`, 'p', name) : null)),
      h('div', { class: 'tr-grid' }, ...g.items.map(itemEl)));
  }

  function thumb(key: string): HTMLElement | null {
    const url = thumbs(key).map(imageUrl).find(Boolean);
    return url ? h('img', { class: 'tr-thumb', src: url, alt: '', loading: 'lazy' }) : null;
  }

  function itemEl(item: Item): HTMLElement {
    const box = h('div', { class: `tr-item tr-${item.kind}`, 'data-key': item.key });
    paintItem(box, item);
    return box;
  }

  function paintItem(box: HTMLElement, item: Item): void {
    const sit = situationOf(item.key);
    const head = h('div', { class: 'tr-sit' }, h('span', { class: 'tr-sit-label' }, (sit && guideText(guide, sit, names.get(item.key))) || item.key));
    const mine = target ? fieldsOfItem(item.key) : [];
    const rows: (HTMLElement | null)[] = [];
    if (item.kind === 'words') rows.push(wordsEl());
    else if (item.kind === 'plural') {
      const forms = lookup(base.dict, item.key) as Record<string, string> | undefined;
      rows.push(h('div', { class: 'tr-forms' }, h('span', { class: 'tr-forms-label hint' }, tr('baseForms')),
        ...Object.values(forms ?? {}).map((s) => h('span', { class: 'tr-chip' }, s))));
      for (const f of mine) {
        const n = formExample(target!.code, f.form!);
        rows.push(h('div', { class: 'tr-var' }, h('span', { class: 'tr-form hint' }, tr('form', { form: f.form!, n: n ?? '' })), fieldEl(f, sourceValue(base, f) || sourceValue(base, { ...f, form: 'other' }))));
      }
    } else if (!target) {
      const v = lookup(base.dict, item.key);
      rows.push(...(Array.isArray(v) ? v : [String(v ?? '')]).map((s) => h('div', { class: 'tr-var' }, h('span', { class: 'tr-chip' }, s))));
    } else {
      for (const f of mine) {
        const text = sourceValue(base, f);
        rows.push(h('div', { class: 'tr-var' }, text ? h('span', { class: 'tr-chip' }, text) : null, chipsOf(text), fieldEl(f, text),
          item.kind === 'pool' && mine.length > 1 ? h('button', { class: 'tr-remove', type: 'button', 'aria-label': tr('removeVariant'), tip: tr('removeVariant'), onClick: () => {
            removeVariant(target!, item.key, f.index!, structure);
            refreshItem(box, item);
          } }, icon1('trash')) : null));
      }
      if (item.kind === 'pool') rows.push(h('button', { class: 'btn small ghost tr-add', type: 'button', onClick: () => {
        addVariant(target!, item.key, structure);
        refreshItem(box, item, true);
      } }, icon1('plus'), h('span', {}, tr('addVariant'))));
    }
    const pic = item.key.split('.').length === 2 ? thumb(item.key) : null;
    box.classList.toggle('tr-long', mine.some((f) => sourceValue(base, f).length > LONG_TEXT));
    box.replaceChildren(pic ? h('div', { class: 'tr-item-pic' }, pic, head) : head, ...rows.filter((r): r is HTMLElement => !!r),
      h('span', { class: 'tr-done', 'aria-label': tr('done') }, icon1('check')));
  }

  /** After a variant came or went: the fields again, the item, the counts. */
  function refreshItem(box: HTMLElement, item: Item, focusLast = false): void {
    setFields(fieldsOf(catalog, target!, structure));
    for (const [id, el] of inputs) if (box.contains(el)) inputs.delete(id);
    paintItem(box, item);
    saveSoon();
    paintProgress();
    if (focusLast) [...box.querySelectorAll<HTMLTextAreaElement>('.tr-field')].at(-1)?.focus();
  }

  /** The placeholders of the base text, as chips. */
  function chipsOf(text: string): HTMLElement | null {
    const ph = placeholders(text);
    return ph.length ? h('span', { class: 'tr-ph' }, ...ph.map((p) => h('code', {}, p))) : null;
  }

  /** One field: the input, its state, its info button with the box under it, and the placeholder warning. */
  function fieldEl(f: Field, baseText: string, cls = ''): HTMLElement {
    const value = fieldValue(target!, f);
    const area = h('textarea', { class: `tr-field ${cls}`, rows: Math.max(1, value.split('\n').length), 'data-field': f.id, 'aria-label': tr('fieldLabel', { text: baseText.length > LABEL_MAX ? `${baseText.slice(0, LABEL_MAX)}…` : baseText }), spellcheck: 'true', lang: target!.code });
    area.value = value;
    inputs.set(f.id, area);
    const warn = h('small', { class: 'tr-warn', role: 'status' });
    const info = h('button', { class: 'tr-info', type: 'button', 'aria-label': tr('info'), 'aria-expanded': 'false', tip: tr('info'), onClick: () => toggleInfo() }, icon1('info'));
    const wrap = h('div', { class: 'tr-input' }, area, h('span', { class: 'tr-open-tag' }, tr('untranslated')), info, warn);
    let box: HTMLElement | null = null;
    let doneButton: HTMLButtonElement | null = null;
    const isTouched = () => target!.touched.includes(f.id);
    const state = () => {
      wrap.classList.toggle('open', !isTouched());
      doneButton?.replaceChildren(icon1(isTouched() ? 'close' : 'check'), h('span', {}, tr(isTouched() ? 'markOpen' : 'markDone')));
    };
    const check = () => {
      if (f.kind === 'words' || !area.value) return void (warn.textContent = '');
      const want = placeholders(baseText);
      const got = placeholders(area.value);
      warn.textContent = [...want.filter((p) => !got.includes(p)).map((name) => tr('missingPlaceholder', { name })),
        ...got.filter((p) => !want.includes(p)).map((name) => tr('extraPlaceholder', { name }))].join(' ');
    };
    const write = (text: string) => {
      const count = f.kind === 'variant' || f.kind === 'line' ? fieldsOfItem(f.key).length : 1;
      setFieldValue(target!, f, f.kind === 'words' ? splitWords(text).join(' ') : text, count);
      check();
    };
    const mark = (done = true) => {
      if (done) touch(target!, f.id);
      else untouch(target!, f.id);
      state();
      changed(f);
    };
    /** The shadow language's text, a copy of it (still not done), done or not done, and the key in the code. */
    function toggleInfo(): void {
      if (box) {
        box.remove();
        box = doneButton = null;
        info.setAttribute('aria-expanded', 'false');
        return;
      }
      const text = sourceValue(shadow, f) || (f.kind === 'form' ? sourceValue(shadow, { ...f, form: 'other' }) : '');
      doneButton = button('', () => mark(!isTouched()), 'btn small tr-mark');
      box = h('div', { class: 'tr-info-box' },
        h('p', { class: 'tr-shadow-text' }, h('strong', {}, `${shadow.name}: `), text ? h('span', { lang: shadow.code }, text) : h('em', {}, tr('shadowEmpty', { name: shadow.name }))),
        h('div', { class: 'row' },
          text ? button(tr('copy', { name: shadow.name }), () => {
            area.value = text;
            write(text);
            changed(f);
            area.focus();
          }, 'btn small tr-copy', 'copy') : null,
          doneButton,
          f.kind === 'words' ? null : h('a', { class: 'btn small ghost', href: codeSearch(f.key), target: '_blank', rel: 'noopener' }, icon1('code'), h('span', {}, tr('findCode')))),
        h('small', { class: 'hint' }, `${tr('key')}: `, h('code', {}, f.id)));
      wrap.append(box);
      info.setAttribute('aria-expanded', 'true');
      state();
    }
    area.addEventListener('input', () => {
      write(area.value);
      mark();
    });
    area.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        mark();
        jump(f.id);
      }
    });
    state();
    check();
    return wrap;
  }

  /** A field changed: save soon, the counts and the item's finished look. */
  function changed(f: Field): void {
    saveSoon();
    paintProgress();
    const box = f.item ? main.querySelector<HTMLElement>(`.tr-item[data-key="${CSS.escape(f.item.key)}"]`) : null;
    if (box) markItem(box);
    if (f.kind === 'words') paintWords();
  }

  function markItem(box: HTMLElement): void {
    const areas = [...box.querySelectorAll<HTMLTextAreaElement>('.tr-field')];
    box.classList.toggle('finished', !!target && areas.length > 0 && areas.every((a) => target!.touched.includes(a.dataset.field!)));
  }

  // ---- words ----
  let wordsInfo: HTMLElement | null = null;
  function wordsEl(): HTMLElement {
    const f = fieldById(WORDS);
    wordsInfo = h('div', { class: 'tr-words-info' });
    const baseWords = h('details', { class: 'tr-words-base' }, h('summary', {}, tr('words.count', { n: base.words.length })), h('p', {}, base.words.join(' ')));
    const box = h('div', { class: 'tr-words' }, h('p', { class: 'hint' }, tr('words.hint')), baseWords, f && target ? fieldEl(f, '', 'tr-words-field') : null, wordsInfo);
    queueMicrotask(paintWords);
    return box;
  }

  function paintWords(): void {
    if (!wordsInfo || !target) return;
    const layout = LAYOUTS[target.layout];
    const words = [...new Set(target.words.map((w) => w.normalize('NFC').toLowerCase()))];
    const bad = words.filter((w) => [...w].some((c) => !canType(layout, c)));
    const groups = lessonGroups(target.layout);
    const keys = new Set<string>();
    const lessons = groups.slice(0, LESSONS_SHOWN).map((g, i) => {
      g.forEach((k) => keys.add(k));
      const n = words.filter((w) => [...w].every((c) => keys.has(c))).length;
      return h('li', { class: n < LESSON_WORDS_MIN ? 'tr-few' : '' }, tr('words.lesson', { n: i + 1, keys: g.filter((k) => k.trim()).join(' '), count: n }),
        n < LESSON_WORDS_MIN ? h('span', { class: 'tr-warn' }, ` · ${tr('words.few')}`) : null);
    });
    wordsInfo.replaceChildren(h('div', {}, h('p', { class: 'hint' }, tr('words.count', { n: words.length })),
      bad.length ? h('p', { class: 'tr-warn' }, tr('words.untypable', { layout: layoutName(target.layout) }), ' ', bad.join(' ')) : null,
      h('h4', {}, tr('words.lessons')), h('ul', { class: 'tr-lessons' }, ...lessons)));
  }

  // ---- progress, contents, filter ----
  function paintProgress(): void {
    const p = target ? progressOf(target, fields) : 0;
    const n = pct(p);
    ring.innerHTML = roundTextSvg(String(n), rhythmRing(p));
    const label = p >= 1 ? tr('progressDone') : tr('progress', { n });
    ring.dataset.tip = label;
    ring.setAttribute('aria-label', label);
    ring.disabled = !target;
    for (const s of catalog) {
      const mine = fields.filter((f) => f.section === s.id);
      const n = mine.length ? pct(progressOf(target!, mine)) : 0;
      const el = toc.querySelector(`[data-section="${s.id}"] .tr-pct`);
      if (el) el.textContent = target ? `${n} %` : '';
      const opt = tocSelect.querySelector<HTMLOptionElement>(`option[value="${s.id}"]`);
      if (opt) opt.textContent = `${sectionTitle(s)}${target ? ` · ${n} %` : ''}`;
    }
  }

  const sectionTitle = (s: Section) => guideText(guide, `sections.${s.id}.title`) || s.id;
  const layoutName = (id: LayoutId) => String(lookup(base.dict, `layouts.${id}`) ?? id);

  function paintToc(): void {
    toc.replaceChildren(h('h2', {}, tr('toc')), h('ol', {}, ...catalog.map((s) => h('li', { 'data-section': s.id },
      h('a', { href: `#tr-s-${s.id}`, onClick: (e: Event) => { e.preventDefault(); document.getElementById(`tr-s-${s.id}`)?.scrollIntoView({ block: 'start' }); } },
        h('span', {}, sectionTitle(s)), h('span', { class: 'tr-pct' }))))));
    tocSelect.replaceChildren(...catalog.map((s) => h('option', { value: s.id }, sectionTitle(s))));
  }

  function applyFilter(): void {
    if (query || onlyOpen) renderAll();
    let any = false;
    for (const box of main.querySelectorAll<HTMLElement>('.tr-item')) {
      markItem(box);
      const hit = !query || box.dataset.key!.toLowerCase().includes(query) || box.textContent!.toLowerCase().includes(query)
        || [...box.querySelectorAll('textarea')].some((a) => a.value.toLowerCase().includes(query));
      box.hidden = !hit;
      box.classList.toggle('collapsed', onlyOpen && box.classList.contains('finished'));
      any ||= hit;
    }
    for (const g of main.querySelectorAll<HTMLElement>('.tr-group')) g.hidden = !g.querySelector('.tr-item:not([hidden])');
    for (const s of main.querySelectorAll<HTMLElement>('.tr-section')) s.hidden = !!query && !s.querySelector('.tr-group:not([hidden])');
    empty.hidden = !query || any;
  }

  /** Focuses the first untouched field after `after` (or after the focused one), from the top when none is after it. */
  function jump(after?: string): void {
    if (!target) return;
    // The first click starts at the top; the next ones go on while the focus stays where the ring left it.
    const from = after ?? (lastField && lastField === ringAt ? ringAt : undefined);
    const start = from ? fields.findIndex((f) => f.id === from) + 1 : 0;
    const open = (f: Field) => !target!.touched.includes(f.id);
    const next = fields.slice(start).find(open) ?? fields.find(open);
    if (!next) return;
    const section = document.getElementById(`tr-s-${next.section}`);
    if (section) pending.get(section)?.();
    let area = inputs.get(next.id);
    if (!area) return;
    if (!area.offsetParent && (query || onlyOpen)) {
      search.value = query = '';
      applyFilter();
    }
    ringAt = next.id;
    area.scrollIntoView({ block: 'center' });
    area.focus({ preventScroll: true });
  }

  // ---- languages ----
  function languageForm(o: { title: string; text?: string; pick?: boolean }): Promise<OwnLang | null> {
    return new Promise((resolve) => {
      let made: OwnLang | null = null;
      const name = h('input', { type: 'text', maxlength: 40, autofocus: true });
      const code = h('input', { type: 'text', maxlength: 20, spellcheck: 'false', autocomplete: 'off' });
      const fallback = h('select', {}, ...LANGS.map((l) => h('option', { value: l }, LANGUAGES[l])));
      const layout = h('select', {}, ...LAYOUT_IDS.map((id) => h('option', { value: id }, layoutName(id))));
      const asked = language();
      fallback.value = isLang(asked) ? asked : 'en';
      layout.value = defaultLayout(fallback.value as Lang);
      fallback.addEventListener('change', () => { layout.value = defaultLayout(fallback.value as Lang); });
      const error = h('p', { class: 'error', role: 'alert' });
      const create = () => {
        const lang = fallback.value as Lang;
        if (o.pick) {
          made = newOwnLang({ code: lang, name: tr('correctionName', { name: LANGUAGES[lang] }), base: lang, layout: layout.value as LayoutId, correctionOf: lang });
          return close();
        }
        const c = canonicalCode(code.value);
        if (!name.value.trim()) return void (error.textContent = tr('needName'));
        if (!c) return void (error.textContent = tr('codeBad'));
        made = newOwnLang({ code: c, name: name.value.trim(), base: lang, layout: layout.value as LayoutId });
        close();
      };
      const lab = (text: string, control: HTMLElement, hint?: string) => h('label', { class: 'field' }, h('span', { class: 'field-label' }, text), control, hint ? h('small', { class: 'hint' }, hint) : null);
      const close = modal(h('form', { class: 'tr-dialog', onSubmit: (e: Event) => { e.preventDefault(); create(); } },
        h('h2', {}, o.title), o.text ? h('p', {}, o.text) : null,
        o.pick ? null : lab(tr('name'), name),
        o.pick ? null : lab(tr('code'), code, tr('codeHint')),
        lab(o.pick ? tr('editPick') : tr('fallback'), fallback),
        lab(tr('layout'), layout),
        error,
        h('div', { class: 'row center' }, button(tr('cancel'), () => close(), 'btn'), h('button', { class: 'btn primary', type: 'submit' }, tr('create')))),
      { cls: 'tr-modal', onClose: () => resolve(made) });
    });
  }

  async function adopt(l: OwnLang): Promise<void> {
    save();
    await saveOwnLang(l);
    owns = await ownLangs();
    target = owns.find((x) => x.id === l.id) ?? l;
    remember({ target: target.id });
    await paint();
  }

  async function newLanguage(): Promise<void> {
    const l = await languageForm({ title: tr('newTitle') });
    if (l) await adopt(l);
  }

  async function editLanguage(): Promise<void> {
    const l = await languageForm({ title: tr('editTitle'), text: tr('editText'), pick: true });
    if (!l) return;
    const src = await officialSource(l.correctionOf!);
    prefill(l, fieldsOf(catalog, l, src.dict), src);
    await adopt(l);
  }

  async function doPrefill(): Promise<void> {
    if (!target) return;
    prefill(target, fields, await sourceOf(prefillSelect.value as LangRef));
    save();
    await paint();
  }

  function aboutPanel(): void {
    if (!target) return;
    const l = target;
    const text = (value: string, onChange: (v: string) => void, attrs: Record<string, string | number> = {}) => {
      const i = h('input', { type: 'text', value, ...attrs });
      i.addEventListener('change', () => { onChange(i.value.trim()); saveSoon(); });
      return i;
    };
    const lab = (label: string, control: HTMLElement, hint?: string) => h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), control, hint ? h('small', { class: 'hint' }, hint) : null);
    const error = h('p', { class: 'error', role: 'alert' });
    const layout = h('select', {}, ...LAYOUT_IDS.map((id) => h('option', { value: id, selected: id === l.layout }, layoutName(id))));
    layout.addEventListener('change', () => { l.layout = layout.value as LayoutId; saveSoon(); paintWords(); });
    let repaint = false;
    const close = modal(h('div', { class: 'tr-dialog' }, h('h2', {}, tr('aboutTitle')),
      lab(tr('author'), text(l.author, (v) => { l.author = v; }, { maxlength: 80 })),
      lab(tr('contact'), text(l.contact, (v) => { l.contact = v; }, { maxlength: 120 }), tr('contactHint')),
      lab(tr('name'), text(l.name, (v) => { if (v) { l.name = v; repaint = true; } }, { maxlength: 40 })),
      lab(tr('code'), text(l.code, (v) => {
        const c = canonicalCode(v);
        error.textContent = c ? '' : tr('codeBad');
        if (c && c !== l.code) { l.code = c; repaint = true; }
      }, { maxlength: 20, spellcheck: 'false' }), tr('codeHint')),
      error,
      lab(tr('layout'), layout),
      h('div', { class: 'row center' }, button(tr('delete'), () => void remove(), 'btn danger', 'trash'))),
    { cls: 'tr-modal', onClose: () => { save(); if (repaint) void adopt(l); } });
    async function remove(): Promise<void> {
      close();
      const yes = await confirmDialog({ title: tr('deleteTitle', { name: l.name }), text: tr('deleteText'), ok: tr('deleteOk'), cancel: tr('cancel'), danger: true });
      if (!yes) return;
      clearTimeout(saveTimer);
      saveTimer = 0;
      await deleteOwnLang(l.id);
      owns = await ownLangs();
      target = null;
      remember({ target: '' });
      await paint();
    }
  }

  // ---- files ----
  const fileName = (l: OwnLang, ext: string) => `tapkotyper-${l.code}${l.correctionOf ? '-own' : ''}.${ext}`;

  function exportMenu(): void {
    if (!target) return;
    const l = target;
    const pairs = (mode: 'full' | 'open' | 'changes') => async () => {
      close();
      const official = mode === 'changes' && l.correctionOf ? await officialSource(l.correctionOf) : undefined;
      const ctx = { base: official ?? base, catalog, guide };
      download(fileName(l, 'txt').replace('.txt', mode === 'full' ? '.txt' : `-${mode}.txt`), exportPairs(l, fields, ctx, mode, official), 'text/plain;charset=utf-8');
    };
    const close = modal(h('div', { class: 'tr-dialog tr-menu' }, h('h2', {}, tr('export')),
      button(tr('exportAll'), pairs('full'), 'btn', 'download'),
      button(tr('exportOpen'), pairs('open'), 'btn', 'download'),
      l.correctionOf ? button(tr('exportChanges', { name: LANGUAGES[l.correctionOf] }), pairs('changes'), 'btn', 'download') : null,
      button(tr('exportJson'), () => { close(); download(fileName(l, 'json'), exportJson(l)); }, 'btn', 'download')), { cls: 'tr-modal' });
  }

  function pickImport(): void {
    const input = h('input', { type: 'file', accept: '.txt,.json,text/plain,application/json', hidden: true });
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      input.remove();
      if (file) void file.text().then(importText);
    });
    screen.append(input);
    input.click();
  }

  async function importText(text: string): Promise<void> {
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Not JSON: a pair file.
    }
    const meta: Record<string, string> = json?.meta ?? {};
    if (!json) for (const m of text.matchAll(/^@meta\s+([\w-]+)=(.*)$/gm)) meta[m[1]] = m[2].trim();
    let l = target;
    if (!l) {
      const code = canonicalCode(meta.code ?? '');
      const fallback = isLang(meta.base ?? '') ? (meta.base as Lang) : null;
      if (!code || !fallback || !meta.name) return void confirmDialog({ title: tr('importTitle'), text: tr('importBad'), ok: tr('ok'), cancel: tr('cancel') });
      l = newOwnLang({ code, name: meta.name, base: fallback, layout: (LAYOUT_IDS as string[]).includes(meta.layout) ? (meta.layout as LayoutId) : defaultLayout(fallback),
        correctionOf: isLang(meta.correctionOf ?? '') ? (meta.correctionOf as Lang) : null });
    }
    const struct = await officialDict(l.base);
    const all = fieldsOf(catalog, l, struct);
    let plan: ImportPlan;
    try {
      plan = json ? planJson(l, all, json) : planPairs(l, all, text);
    } catch {
      plan = { applied: 0, empty: 0, skipped: [], meta: {}, apply() {} };
    }
    if (!plan.applied) return void confirmDialog({ title: tr('importTitle'), text: tr('importBad'), ok: tr('ok'), cancel: tr('cancel') });
    const why = { unknown: tr('importUnknown'), outside: tr('importOutside') };
    const yes = await new Promise<boolean>((resolve) => {
      let ok = false;
      const close = modal(h('div', { class: 'tr-dialog' }, h('h2', {}, tr('importTitle')),
        h('p', {}, tr('importSummary', { applied: plan.applied, empty: plan.empty, skipped: plan.skipped.length })),
        plan.skipped.length ? h('ul', { class: 'tr-skipped hint' }, ...plan.skipped.slice(0, 12).map((s) => h('li', {}, h('code', {}, s.id), ` · ${why[s.why]}`)), plan.skipped.length > 12 ? h('li', {}, '…') : null) : null,
        h('div', { class: 'row center' }, button(tr('cancel'), () => close(), 'btn'), button(tr('importDo'), () => { ok = true; close(); }, 'btn primary'))),
      { cls: 'tr-modal', onClose: () => resolve(ok) });
    });
    if (!yes) return;
    plan.apply();
    if (!l.author && plan.meta.author) l.author = plan.meta.author;
    if (!l.contact && plan.meta.contact) l.contact = plan.meta.contact;
    await adopt(l);
  }

  async function send(): Promise<void> {
    if (!target) return;
    const l = target;
    const ok = await confirmDialog({ title: tr('sendTitle'), text: tr('sendText'), ok: tr('sendGo'), cancel: tr('cancel') });
    if (!ok) return;
    save();
    const touched = fields.filter((f) => l.touched.includes(f.id)).length;
    const lines = [
      tr('issue.author', { name: l.author || '?' }), tr('issue.contact', { contact: l.contact || '?' }),
      tr('issue.base', { name: LANGUAGES[l.base] }),
      tr('issue.progress', { n: Math.floor(progressOf(l, fields) * 100), touched, total: fields.length }), '',
    ];
    const title = l.correctionOf ? tr('issue.fix', { name: LANGUAGES[l.correctionOf] }) : tr('issue.new', { name: l.name, code: l.code });
    const url = (body: string) => `${ISSUES}?${new URLSearchParams({ title, body })}`;
    let address = '';
    if (l.correctionOf) {
      const official = await officialSource(l.correctionOf);
      const changes = exportPairs(l, fields, { base: official, catalog, guide }, 'changes', official);
      address = url([...lines, tr('issue.changes'), '```text', changes.trimEnd(), '```'].join('\n'));
    }
    if (!address || address.length > ISSUE_URL_MAX) {
      const file = fileName(l, 'json');
      download(file, exportJson(l));
      address = url([...lines, tr('issue.attach', { file })].join('\n'));
    }
    window.open(address, '_blank', 'noopener');
  }

  return () => {
    alive = false;
    observer.disconnect();
    document.removeEventListener('visibilitychange', onHide);
    save();
    // The own language being played reads its new texts.
    const asked = askedLanguage();
    if (isOwnRef(asked)) void Promise.resolve().then(() => setLanguage(asked));
  };
}
