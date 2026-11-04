import { LAYOUT_IDS } from '../keyboard/layouts';
import { t } from '../i18n/i18n';
import type { LayoutId, Settings } from '../storage/schema';
import { closeButton, h, icon } from './dom';
import { check, segmented, select } from './form';
import { flashTip } from './tooltip';

export type Fingering = Settings['fingering'];
export type HandsMode = Settings['hands'];

/** What the panel changes; the on-screen keyboard and the hands only where there are any (a level). */
export interface KeyboardSettingsHost {
  layout: LayoutId;
  fingering: Fingering;
  pickLayout(id: LayoutId): void;
  pickFingering(f: Fingering): void;
  /** The on-screen keyboard shown (F2), and whether the parent locked it. */
  guide?: { on(): boolean; locked: boolean; toggle(): void };
  hands?: { mode(): HandsMode; set(m: HandsMode): void };
  /** Opens the help's paragraph on the fingerings. */
  help?(): void;
}

/** The button's short name: the layout and the fingering, "SK QWERTZ ERG". */
export const settingsName = (layout: LayoutId, fingering: Fingering) => `${t(`layoutsShort.${layout}`)} ${t(`fingeringShort.${fingering}`)}`;

/**
 * The keyboard's settings: a quiet button with the layout and the fingering ("SK QWERTZ ERG") that looks like a key only
 * under the pointer or with focus (in the guide's bottom right corner), or a plain button (`labelled`: its name before
 * them, the practice key picker), and the small panel above it, "Rýchle nastavenie klávesnice": the layout and the
 * fingering, each with a line that explains it, and in a level the on-screen keyboard and the hands. A round X or Esc
 * closes it, a click outside too; while it is open the keys stay with it, so nothing reaches the level or a card under it.
 * `flag` marks the button when the keys typed fit another layout, until it is opened.
 */
export class KeyboardSettings {
  readonly el: HTMLElement;
  readonly btn: HTMLButtonElement;
  private panel: HTMLElement | null = null;
  private offKeys: (() => void) | null = null;

  constructor(private host: KeyboardSettingsHost, labelled = false) {
    const name = settingsName(host.layout, host.fingering);
    this.btn = h('button', {
      class: `kb-layout ${labelled ? 'labelled' : ''}`, type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': 'false',
      'aria-label': t('kbSettings.label', { layout: t(`layouts.${host.layout}`), fingering: t(`fingering.${host.fingering}`) }),
      'data-tip': t('kbSettings.tip'),
      onClick: () => (this.panel ? this.close() : this.open()),
    }, icon('keyboard'), h('span', {}, labelled ? `${t('kbSettings.tip')} · ${name}` : name));
    this.el = h('div', { class: 'kb-settings' }, this.btn);
  }

  /** The keys typed look like another layout: the button stands out until it is opened, and asks once for a while. */
  flag(other: LayoutId): void {
    this.btn.classList.add('flagged');
    if (!this.panel) flashTip(this.btn, t('kbSettings.ask', { layout: t(`layouts.${other}`) }), ASK_MS);
  }

  private open(): void {
    const host = this.host;
    this.btn.classList.remove('flagged');
    this.btn.setAttribute('aria-expanded', 'true');
    const layout = select<LayoutId>(host.layout, LAYOUT_IDS.map((id) => [id, t(`layouts.${id}`)]), (id) => {
      this.close();
      if (id !== host.layout) host.pickLayout(id);
    });
    layout.id = 'kb-settings-layout';
    const fingeringHint = h('p', { class: 'kb-panel-hint' }, t(`kbSettings.${host.fingering}Hint`));
    const fingering = segmented<Fingering>(t('kbSettings.fingering'), host.fingering, [['ergonomic', t('fingering.ergonomic')], ['standard', t('fingering.standard')]], (f) => {
      fingeringHint.textContent = t(`kbSettings.${f}Hint`);
      this.close();
      if (f !== host.fingering) host.pickFingering(f);
    });
    const guide = host.guide;
    const board = guide ? check(guide.on(), () => guide.toggle()) : null;
    if (board && guide?.locked) board.disabled = true;
    const hands = host.hands && segmented<HandsMode>(t('kbSettings.hands'), host.hands.mode(), [['on', t('handsMode.on')], ['bold', t('handsMode.bold')], ['off', t('handsMode.off')]], (m) => host.hands!.set(m));
    const panel = this.panel = h('div', { class: 'kb-panel', role: 'dialog', 'aria-label': t('kbSettings.title') },
      h('div', { class: 'kb-panel-head' }, h('h2', {}, t('kbSettings.title')), closeButton(() => this.close())),
      h('div', { class: 'kb-panel-part' },
        h('label', { class: 'kb-panel-label', for: layout.id }, t('kbSettings.layout')), layout,
        h('p', { class: 'kb-panel-hint' }, t('kbSettings.layoutHint'))),
      h('div', { class: 'kb-panel-part' },
        h('span', { class: 'kb-panel-label' }, t('kbSettings.fingering')), fingering.el, fingeringHint),
      board || hands ? h('hr', {}) : null,
      board ? h('label', { class: 'kb-panel-switch' }, board, h('span', {}, t('kbSettings.guide')), h('small', {}, 'F2')) : null,
      hands ? h('div', { class: 'kb-panel-part' }, h('span', { class: 'kb-panel-label' }, t('kbSettings.hands')), hands.el) : null,
      host.help ? h('a', { class: 'kb-panel-more', href: '#', onClick: (e: MouseEvent) => {
        e.preventDefault();
        this.close();
        host.help!();
      } }, t('kbSettings.more')) : null);
    this.btn.before(panel);
    layout.focus();
    // The keys belong to the panel: they work its controls (their own default actions) and reach nothing else.
    const onKey = (e: KeyboardEvent) => {
      e.stopImmediatePropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!this.el.contains(e.target as Node)) this.close();
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointer, true);
    this.offKeys = () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onPointer, true);
    };
  }

  private close(): void {
    this.offKeys?.();
    this.offKeys = null;
    this.panel?.remove();
    this.panel = null;
    this.btn.setAttribute('aria-expanded', 'false');
    // Focus left on the button would take the space bar typed next.
    this.btn.blur();
  }

  dispose(): void {
    this.close();
  }
}

/** How long the question about another layout stays over the button. */
const ASK_MS = 10_000;
