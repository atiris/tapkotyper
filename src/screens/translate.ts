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
import { tipMachine } from '../ui/tooltip';
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
/** A text longer than this takes a whole row on a wide screen, sample and translation side by side. */
const LONG_TEXT = 160;
/** A field's accessible name quotes at most this much of its sample text. */
const LABEL_MAX = 80;
/** Typing without a pause this long is one change for undo. */
const TYPING_MS = 1500;
/** The page's keys, in the order of their list; the text of each is `keys.<id>` of the translator file. */
const KEYS: [id: string, keys: string][] = [
  ['tab', 'Tab / Shift+Tab'], ['move', 'Alt+↓ / Alt+↑'], ['next', 'Alt+N'], ['doneNext', 'Ctrl+Enter'], ['copy', 'Alt+C'], ['copy2', 'Alt+Shift+C'],
  ['mark', 'Alt+M'], ['info', 'Alt+I'], ['code', 'Alt+G'], ['undo', 'Ctrl+Z'], ['redo', 'Ctrl+Y / Ctrl+Shift+Z'], ['all', 'Ctrl+A'],
  ['search', 'Alt+S'], ['close', 'Esc'], ['list', 'Alt+K'],
];
/** A button's tooltip with its key. */
const keyed = (label: string, id: string) => `${label} (${KEYS.find(([k]) => k === id)![1]})`;
/** The last sample languages and translation, a convenience of this browser only. */
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

interface Remembered { target?: string; sample?: string; sample2?: string }

function remembered(): Remembered {
  try {
    return JSON.parse(localStorage.getItem(REMEMBER) ?? '{}');
  } catch {
    return {};
  }
}

function remember(v: Remembered): void {
  try {
    localStorage.setItem(REMEMBER, JSON.stringify({ ...remembered(), ...v }));
  } catch {
    // A private window: the page simply opens on the defaults next time.
  }
}

/** The translator: every text of the game, the sample language above each field and the translation under it. */
export function translateScreen(root: HTMLElement): () => void {
  const screen = h('div', { class: 'screen translate-screen', lang: 'en' });
  root.append(screen);
  let leave: (() => void) | null = null;
  let alive = true;
  // English for the browser too: its translation (Google Translate) offers to translate the page.
  const html = document.documentElement;
  const lang = html.lang;
  html.lang = 'en';
  void loadTranslator().then(() => { if (alive) leave = translatorPage(screen); });
  return () => {
    alive = false;
    html.lang = lang;
    leave?.();
  };
}

function translatorPage(screen: HTMLElement): () => void {
  let alive = true;
  let owns: OwnLang[] = [];
  let target: OwnLang | null = null;
  let sampleRef: LangRef = 'en';
  let sample2Ref: LangRef | '' = '';
  /** English, the language of the page and the guide (names, keyboards). */
  let english!: Source;
  /** The sample language above every field; both samples in a field's info pop-up. */
  let sample!: Source;
  let sample2: Source | null = null;
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
  const sampleSelect = h('select', { class: 'tr-sample', 'aria-label': tr('sample'), translate: 'no' });
  const sample2Select = h('select', { class: 'tr-sample2', 'aria-label': tr('sample2'), translate: 'no' });
  const targetSelect = h('select', { class: 'tr-target', 'aria-label': tr('target'), translate: 'no' });
  const prefillSelect = h('select', { class: 'tr-prefill', 'aria-label': tr('prefill'), translate: 'no' });
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
    h('span', { class: 'tr-pick', tip: tr('sampleHint') }, icon('language'), h('label', { class: 'tr-pick-label' }, tr('sample'), sampleSelect),
      h('label', { class: 'tr-pick-label' }, tr('sample2'), sample2Select)),
    h('span', { class: 'tr-pick' }, h('label', { class: 'tr-pick-label' }, tr('target'), targetSelect),
      button(tr('new'), () => void newLanguage(), 'btn small', 'plus'), button(tr('edit'), () => void editLanguage(), 'btn small', 'edit')),
    h('span', { class: 'tr-pick' }, h('label', { class: 'tr-pick-label' }, tr('prefill'), prefillSelect), targetButton(tr('prefillGo'), () => void doPrefill())),
    ring,
    targetButton(tr('aboutButton'), () => aboutPanel(), 'info'),
    targetButton(tr('export'), () => exportMenu(), 'download'),
    button(tr('import'), () => pickImport(), 'btn small', 'upload'),
    button(tr('keys.button'), () => keysList(), 'btn small', 'keyboard'),
    targetButton(tr('send'), () => void send(), 'share'));
  const onlyBox = h('input', { type: 'checkbox', class: 'tr-only' });
  onlyBox.addEventListener('change', () => { onlyOpen = onlyBox.checked; applyFilter(); });
  const search = h('input', { type: 'search', class: 'tr-search', placeholder: tr('search'), 'aria-label': tr('search') });
  search.addEventListener('input', () => { query = search.value.trim().toLowerCase(); applyFilter(); });
  const empty = h('p', { class: 'hint tr-empty', hidden: true }, tr('empty'));
  const filter = h('div', { class: 'tr-filter' }, h('label', { class: 'tr-only-label' }, onlyBox, h('span', {}, tr('onlyOpen'))), search);

  screen.append(
    h('header', { class: 'bar' }, button(tr('back'), back, 'btn ghost small', 'back'), h('h1', {}, tr('title')),
      h('span', { class: 'tr-page-tip', tabindex: 0, role: 'note', 'aria-label': tr('pageTip'), tip: tr('pageTip') }, icon('language'), h('span', {}, tr('tip')))),
    cornerControls(), tools,
    h('div', { class: 'tr-body' }, h('aside', { class: 'tr-side' }, toc), h('div', { class: 'tr-content' }, tocSelect, note, filter, empty, main)));
  // The tools wrap to more lines on a narrow screen: the contents and the section jumps sit under them.
  const toolsSize = new ResizeObserver(() => screen.style.setProperty('--tr-tools-h', `${tools.offsetHeight}px`));
  toolsSize.observe(tools);

  // ---- loading ----
  void (async () => {
    const [list, works] = await Promise.all([ownLangs(), ownStoreWorks()]);
    if (!alive) return;
    owns = list;
    const was = remembered();
    target = owns.find((l) => l.id === was.target) ?? null;
    const known = (ref?: string) => !!ref && (isLang(ref) || owns.some((l) => ownRef(l.id) === ref));
    const asked = language();
    sampleRef = known(was.sample) ? (was.sample as LangRef) : known(asked) ? asked : 'en';
    sample2Ref = was.sample2 !== undefined ? (known(was.sample2) ? (was.sample2 as LangRef) : '') : sampleRef !== 'en' ? 'en' : '';
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
    sampleSelect.replaceChildren(...official, ...own(target?.id));
    sampleSelect.value = sampleRef;
    sample2Select.replaceChildren(h('option', { value: '' }, tr('none')), ...LANGS.map((l) => h('option', { value: l }, LANGUAGES[l])), ...own(target?.id));
    sample2Select.value = sample2Ref;
    targetSelect.replaceChildren(h('option', { value: '' }, tr('none')), ...owns.map((l) => h('option', { value: l.id }, l.name)));
    targetSelect.value = target?.id ?? '';
    prefillSelect.replaceChildren(...LANGS.map((l) => h('option', { value: l }, LANGUAGES[l])), ...own(target?.id));
    if (target) prefillSelect.value = target.correctionOf ?? target.base;
    for (const b of needTarget) b.disabled = !target;
  }
  sampleSelect.addEventListener('change', () => { sampleRef = sampleSelect.value as LangRef; remember({ sample: sampleRef }); void paint(); });
  sample2Select.addEventListener('change', () => { sample2Ref = sample2Select.value as LangRef | ''; remember({ sample2: sample2Ref }); void paint(); });
  targetSelect.addEventListener('change', () => {
    save();
    target = owns.find((l) => l.id === targetSelect.value) ?? null;
    remember({ target: target?.id ?? '' });
    void paint();
  });

  /** Builds the whole sheet for the chosen translation and sample languages. */
  async function paint(): Promise<void> {
    // A translation is never its own sample.
    const self = target ? ownRef(target.id) : '';
    if (sampleRef === self) sampleRef = 'en';
    if (sample2Ref === self) sample2Ref = '';
    const [en, s1, s2, s] = await Promise.all([officialSource('en'), sourceOf(sampleRef), sample2Ref ? sourceOf(sample2Ref) : null, officialDict(target?.base ?? 'en')]);
    if (!alive) return;
    english = en;
    sample = s1;
    sample2 = s2;
    structure = s;
    hidePop();
    fillSelects();
    setFields(target ? fieldsOf(catalog, target, structure) : []);
    lastField = undefined;
    situationOf = situationFinder(guide);
    names = itemNames(catalog, english.dict);
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
    const name = g.name ? String(lookup(english.dict, g.name) ?? '') : '';
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
      const forms = lookup(sample.dict, item.key) as Record<string, string> | undefined;
      rows.push(h('div', { class: 'tr-forms' }, h('span', { class: 'tr-forms-label hint' }, tr('sampleForms', { name: sample.name })),
        ...Object.values(forms ?? {}).map(chip)));
      for (const f of mine) {
        const n = formExample(target!.code, f.form!);
        rows.push(h('div', { class: 'tr-var' }, h('span', { class: 'tr-form hint' }, tr('form', { form: f.form!, n: n ?? '' })), fieldEl(f, textIn(sample, f))));
      }
    } else if (!target) {
      const v = lookup(sample.dict, item.key);
      rows.push(...(Array.isArray(v) ? v : [String(v ?? '')]).map((s) => h('div', { class: 'tr-var' }, chip(s))));
    } else {
      for (const f of mine) {
        const text = sourceValue(sample, f);
        rows.push(h('div', { class: 'tr-var' }, text ? chip(text) : null, fieldEl(f, text),
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
    box.classList.toggle('tr-long', mine.some((f) => sourceValue(sample, f).length > LONG_TEXT));
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

  /** A sample text, its placeholders (`{name}`, kept as they are in the translation) marked in it. */
  const chip = (text: string) => h('span', { class: 'tr-chip', lang: sample.code, translate: 'no' },
    ...text.split(/(\{\w+\})/).map((part, i) => (i % 2 ? h('code', { class: 'tr-ph' }, part) : part)).filter((x) => x !== ''));

  /** A field's text in a language; a plural form the language lacks shows its "other". */
  const textIn = (src: Source, f: Field) => sourceValue(src, f) || (f.kind === 'form' ? sourceValue(src, { ...f, form: 'other' }) : '');

  /** One field: its round buttons above it (a placeholder warning, info, copy per sample, done, undo, redo, the key in the code) and the input. */
  function fieldEl(f: Field, sampleText: string, cls = ''): HTMLElement {
    const value = fieldValue(target!, f);
    const area = h('textarea', { class: `tr-field ${cls}`, rows: Math.max(1, value.split('\n').length), 'data-field': f.id, 'aria-label': tr('fieldLabel', { text: sampleText.length > LABEL_MAX ? `${sampleText.slice(0, LABEL_MAX)}…` : sampleText }), spellcheck: 'true', lang: target!.code, translate: 'no' });
    area.value = value;
    inputs.set(f.id, area);
    // Shows only while the translation lacks a placeholder of the sample or has one the sample has not; its tooltip says why.
    const warn = h('span', { class: 'tr-act tr-warn-act', role: 'img', hidden: true }, icon1('warn'));
    const act = (glyph: Parameters<typeof icon>[0], label: string, onClick: () => void, cls2 = '') =>
      h('button', { class: `tr-act ${cls2}`, type: 'button', tabindex: -1, 'aria-label': label, tip: label, onClick }, icon1(glyph));
    // The buttons are out of the Tab order (Tab goes from field to field); their keys work in the field.
    const info = h('button', { class: 'tr-act tr-act-info', type: 'button', tabindex: -1, 'aria-label': keyed(tr('info'), 'info'), 'aria-controls': 'tr-pop' }, icon1('info'));
    popFields.set(info, f);
    /** The field takes a sample's text; it still counts as untranslated. */
    const copyFrom = (src: Source | null) => {
      const text = src ? textIn(src, f) : '';
      if (!text) return;
      area.value = text;
      write(text);
      changed(f);
      record(false);
      area.focus();
    };
    /** A copy button per sample, named by the sample's language code (SK, CZ). */
    const copyButton = (src: Source, key: string, cls2: string) => {
      const label = keyed(tr('copy', { name: src.name }), key);
      return h('button', { class: `tr-act tr-code ${cls2}`, type: 'button', tabindex: -1, 'aria-label': label, tip: label, translate: 'no', disabled: !textIn(src, f), onClick: () => copyFrom(src) },
        src.code.toUpperCase());
    };
    const copy = copyButton(sample, 'copy', 'tr-copy');
    const copy2 = sample2 ? copyButton(sample2, 'copy2', 'tr-copy2') : null;
    const toggleDone = () => {
      mark(!isTouched());
      record(false);
    };
    const done = act('check', '', toggleDone, 'tr-mark');
    const undo = act('undo', keyed(tr('undo'), 'undo'), () => step(undos, redos), 'tr-undo');
    const redo = act('redo', keyed(tr('redo'), 'redo'), () => step(redos, undos), 'tr-redo');
    const codeUrl = f.kind === 'words' ? null : codeSearch(f.key);
    const code = codeUrl ? h('a', { class: 'tr-act', href: codeUrl, target: '_blank', rel: 'noopener', tabindex: -1, 'aria-label': keyed(tr('findCode'), 'code'), tip: keyed(tr('findCode'), 'code') }, icon1('code')) : null;
    const wrap = h('div', { class: 'tr-input' },
      h('div', { class: 'tr-bar' }, h('span', { class: 'tr-open-tag' }, tr('untranslated')), h('span', { class: 'tr-acts' }, warn, info, copy, copy2, done, undo, redo, code)),
      area);
    const isTouched = () => target!.touched.includes(f.id);
    type Snap = { value: string; done: boolean };
    const snap = (): Snap => ({ value: area.value, done: isTouched() });
    const undos: Snap[] = [];
    const redos: Snap[] = [];
    let last = snap();
    let typedAt = 0;
    const state = () => {
      const on = isTouched();
      wrap.classList.toggle('open', !on);
      done.classList.toggle('on', on);
      done.setAttribute('aria-pressed', String(on));
      done.setAttribute('aria-label', keyed(tr(on ? 'markOpen' : 'markDone'), 'mark'));
      done.dataset.tip = keyed(tr(on ? 'markOpen' : 'markDone'), 'mark');
      undo.disabled = !undos.length;
      redo.disabled = !redos.length;
    };
    /** After a change the state before it can be undone; typing without a pause is one change. */
    const record = (typing: boolean) => {
      if (!typing || Date.now() - typedAt > TYPING_MS) undos.push(last);
      typedAt = typing ? Date.now() : 0;
      redos.length = 0;
      last = snap();
      state();
    };
    /** Undo or redo: back to the state on top of `from`, the present goes to `into`. */
    const step = (from: Snap[], into: Snap[]) => {
      const to = from.pop();
      if (!to) return;
      into.push(snap());
      area.value = to.value;
      write(to.value);
      mark(to.done);
      last = snap();
      typedAt = 0;
      state();
    };
    const check = () => {
      const want = placeholders(sampleText);
      const got = f.kind === 'words' ? want : placeholders(area.value);
      const why = area.value ? [...want.filter((p) => !got.includes(p)).map((name) => tr('missingPlaceholder', { name })),
        ...got.filter((p) => !want.includes(p)).map((name) => tr('extraPlaceholder', { name }))].join(' ') : '';
      const text = why && `${tr('warning')}: ${why} ${tr('placeholderWhy')}`;
      warn.hidden = !text;
      warn.dataset.tip = text;
      warn.setAttribute('aria-label', text);
      if (popper.shown === info) showPop(info);
    };
    const write = (text: string) => {
      const count = f.kind === 'variant' || f.kind === 'line' ? fieldsOfItem(f.key).length : 1;
      setFieldValue(target!, f, f.kind === 'words' ? splitWords(text).join(' ') : text, count);
      check();
    };
    const mark = (on = true) => {
      if (on) touch(target!, f.id);
      else untouch(target!, f.id);
      state();
      changed(f);
    };
    area.addEventListener('input', () => {
      write(area.value);
      mark();
      record(true);
    });
    // Keys by their place on the keyboard (`code`): Alt with a letter types other letters on some systems.
    const keys: Record<string, () => void> = {
      'Ctrl+Enter': () => { mark(); record(false); jump(f.id); },
      'Alt+ArrowDown': () => move(f.id, 1),
      'Alt+ArrowUp': () => move(f.id, -1),
      'Alt+KeyN': () => jump(f.id),
      'Alt+KeyC': () => copyFrom(sample),
      'Alt+Shift+KeyC': () => copyFrom(sample2),
      'Alt+KeyM': toggleDone,
      'Alt+KeyI': () => info.click(),
      'Alt+KeyG': () => { if (codeUrl) window.open(codeUrl, '_blank', 'noopener'); },
      'Ctrl+KeyZ': () => step(undos, redos),
      'Ctrl+KeyY': () => step(redos, undos),
      'Ctrl+Shift+KeyZ': () => step(redos, undos),
    };
    area.addEventListener('keydown', (e) => {
      const name = `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.altKey ? 'Alt+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.code}`;
      const run = keys[name.replace('NumpadEnter', 'Enter')];
      if (!run) return;
      e.preventDefault();
      run();
    });
    // Come by the keyboard, the field shows its samples at once.
    area.addEventListener('focus', () => { if (byKeys && !pinned) popper.open(info); });
    area.addEventListener('blur', () => { if (!pinned && popper.shown === info) hidePop(); });
    state();
    check();
    return wrap;
  }

  // ---- the info pop-up: the field's name and its text in the samples ----
  const pop = h('div', { class: 'tr-pop', id: 'tr-pop', role: 'tooltip', hidden: true });
  screen.append(pop);
  const popFields = new WeakMap<Element, Field>();
  /** A click keeps the pop-up open until the next click, Escape or a scroll. */
  let pinned = false;
  const popper = tipMachine<HTMLElement>(showPop, () => {
    pop.hidden = true;
    pinned = false;
  });
  const hidePop = () => popper.close();
  function showPop(el: HTMLElement): void {
    const f = popFields.get(el);
    if (!f) return;
    const row = (src: Source) => {
      const text = textIn(src, f);
      return h('div', { class: 'tr-pop-lang' }, h('strong', {}, src.name),
        h('p', { lang: src.code, translate: 'no' }, text || h('em', {}, tr('sampleEmpty'))));
    };
    const warning = el.closest('.tr-input')?.querySelector<HTMLElement>('.tr-warn-act:not([hidden])')?.dataset.tip;
    pop.replaceChildren(h('p', { class: 'tr-pop-key' }, `${tr('field')}: `, h('code', { translate: 'no' }, f.id)), row(sample), ...(sample2 ? [row(sample2)] : []),
      ...(warning ? [h('p', { class: 'tr-pop-warn' }, warning)] : []));
    pop.hidden = false;
    // Above the button (the field under it stays free to type in), its right edges in line; under it when there is no room above.
    const r = el.getBoundingClientRect();
    const w = pop.offsetWidth, ph = pop.offsetHeight, gap = 6;
    pop.style.left = `${Math.max(gap, Math.min(innerWidth - w - gap, r.right - w))}px`;
    pop.style.top = `${r.top - gap - ph >= gap ? r.top - gap - ph : r.bottom + gap}px`;
  }
  const infoOf = (e: Event) => (e.target as Element | null)?.closest?.<HTMLElement>('.tr-act-info') ?? null;
  main.addEventListener('pointerover', (e) => { const el = infoOf(e); if (el && !pinned) popper.enter(el); });
  main.addEventListener('pointerout', (e) => { const el = infoOf(e); if (el && !pinned) popper.leave(el); });
  main.addEventListener('focusin', (e) => { const el = infoOf(e); if (el && !pinned) popper.enter(el); });
  main.addEventListener('focusout', (e) => { const el = infoOf(e); if (el && !pinned) popper.leave(el); });
  main.addEventListener('click', (e) => {
    const el = infoOf(e);
    if (!el) return;
    if (pinned && popper.shown === el) return hidePop();
    popper.open(el);
    pinned = true;
  });
  /** Was the last thing done with the keyboard (a field reached by Tab shows its samples). */
  let byKeys = false;
  const onDown = (e: PointerEvent) => {
    byKeys = false;
    if (pinned && !pop.contains(e.target as Node) && !infoOf(e)) hidePop();
  };
  const onKey = (e: KeyboardEvent) => {
    byKeys = true;
    if (e.altKey && !e.ctrlKey && !e.shiftKey && (e.code === 'KeyS' || e.code === 'KeyK')) {
      e.preventDefault();
      if (e.code === 'KeyS') search.focus();
      else keysList();
      return;
    }
    if (e.key !== 'Escape' || pop.hidden) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    hidePop();
  };

  /** Focuses the next (or previous) field that can be seen from `from`. */
  function move(from: string, dir: 1 | -1): void {
    for (let i = fields.findIndex((f) => f.id === from) + dir; i >= 0 && i < fields.length; i += dir) {
      const section = document.getElementById(`tr-s-${fields[i].section}`);
      if (section) pending.get(section)?.();
      const area = inputs.get(fields[i].id);
      if (area?.offsetParent) {
        area.scrollIntoView({ block: 'center' });
        area.focus({ preventScroll: true });
        return;
      }
    }
  }

  function keysList(): void {
    modal(h('div', { class: 'tr-dialog tr-keys' }, h('h2', {}, tr('keys.title')),
      h('dl', {}, ...KEYS.flatMap(([id, keys]) => [h('dt', {}, h('kbd', {}, keys)), h('dd', {}, tr(`keys.${id}`))]))), { cls: 'tr-modal' });
  }
  document.addEventListener('pointerdown', onDown);
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('scroll', hidePop, { passive: true });

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
    const baseWords = h('details', { class: 'tr-words-base' }, h('summary', {}, tr('words.count', { n: sample.words.length })), h('p', { lang: sample.code, translate: 'no' }, sample.words.join(' ')));
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
  const layoutName = (id: LayoutId) => String(lookup(english.dict, `layouts.${id}`) ?? id);

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
      const ctx = { base: official ?? sample, catalog, guide };
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
    toolsSize.disconnect();
    document.removeEventListener('visibilitychange', onHide);
    document.removeEventListener('pointerdown', onDown);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('scroll', hidePop);
    save();
    // The own language being played reads its new texts.
    const asked = askedLanguage();
    if (isOwnRef(asked)) void Promise.resolve().then(() => setLanguage(asked));
  };
}
