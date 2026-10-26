import { app, go, saveProfile, shownScreen } from '../app/app';
import { fillProgress, randomFill } from '../app/super';
import { WORLDS } from '../game/levels';
import { bringParrotHome, sendParrotAway } from '../game/parrots';
import { localDate } from '../learning/stats';
import { lessonOrder } from '../learning/lessons';
import { locale, t } from '../i18n/i18n';
import { type Profile, SUPER_ID } from '../storage/schema';
import { type ICONS, button, h, modal } from './dom';
import { roundPic, roundButton } from './hud';
import { type MenuEntry, menuPanel } from './menu';
import { toast } from './toast';

/** Super mode is on: a round star in the top row that opens the service menu. Nothing otherwise. */
export function superStar(): HTMLButtonElement | null {
  if (!app.superMode) return null;
  let close: ((refocus?: boolean) => void) | null = null;
  const b: HTMLButtonElement = roundButton('super', 'star', t('super.badge'), () => (close ? close() : (close = openServiceMenu(b, () => (close = null)))));
  b.setAttribute('aria-haspopup', 'menu');
  b.setAttribute('aria-expanded', 'false');
  return b;
}

/** Ends super mode: the switch goes off and the super player is gone. */
function endSuperMode(): void {
  app.superMode = false;
  app.superPlayer = null;
  go('start');
}

/**
 * The service menu under the star: the end of super mode everywhere; on the super player's map the
 * progress filling, a random parrot flying away and a missing one coming home. The settings password is removed in the settings, which ask the super player nothing.
 */
function openServiceMenu(star: HTMLButtonElement, onClosed: () => void): (refocus?: boolean) => void {
  const entry = (glyph: keyof typeof ICONS, label: string, pick: () => void): MenuEntry => ({ label, art: roundPic('super', glyph), pick });
  const entries = [entry('close', t('service.end'), endSuperMode)];
  const p = app.profile;
  if (p?.id === SUPER_ID && shownScreen() === 'map') {
    entries.push(entry('chart', t('service.fill'), () => fillDialog(p)),
      entry('upload', t('service.parrotAway'), () => parrotChange(sendParrotAway(p) !== null, 'service.parrotNoneHome')),
      entry('download', t('service.parrotHome'), () => parrotChange(bringParrotHome(p, localDate()) !== null, 'service.parrotNoneMissing')));
  }
  return menuPanel(star, t('super.badge'), entries, (panel) => {
    // The star may sit folded in the corner's Menu: the panel hangs under what is in sight.
    const anchor = star.offsetParent ? star : star.closest('.top-right')?.querySelector<HTMLElement>('.menu-btn') ?? star;
    const r = anchor.getBoundingClientRect();
    panel.classList.add('service-menu');
    panel.style.top = `${r.bottom + 10}px`;
    panel.style.right = `${Math.max(8, innerWidth - r.right)}px`;
    document.querySelector('#app')!.append(panel);
  }, (refocus) => {
    onClosed();
    if (refocus && star.isConnected) star.focus();
  });
}

/** A parrot sent away or brought home by the service menu: the map shows it as it would happen in play; `none` says why nothing changed. */
function parrotChange(changed: boolean, none: string): void {
  if (!changed) return toast(t(none));
  saveProfile();
  go('map', {}, false);
}

/** A labelled control of the progress dialog with a short line on what it sets. */
const fillField = (label: string, control: HTMLElement, hint: string): HTMLElement =>
  h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), control, h('small', { class: 'hint' }, hint));

/** A whole-percent slider from `min` to 100 with its value; `get` reads it as a share. */
function percent(value: number, min = 0): { el: HTMLElement; get: () => number } {
  const input = h('input', { type: 'range', min, max: 100, step: 1, value: Math.round(value * 100) });
  const out = h('output', {}, `${input.value} %`);
  input.addEventListener('input', () => (out.textContent = `${input.value} %`));
  return { el: h('span', { class: 'range' }, input, out), get: () => Number(input.value) / 100 };
}

/** The super player's progress, set by hand: keys and the last finished world exactly, the rest spread at random; it opens on a fresh random fill. */
function fillDialog(p: Profile): void {
  const f = randomFill(p);
  const most = lessonOrder(p.layout).length;
  const keys = h('input', { type: 'number', min: 0, max: most, step: 1, value: f.keys });
  const world = h('select', {}, h('option', { value: '-1' }, t('service.noWorld')),
    ...WORLDS.map((_, i) => h('option', { value: String(i), selected: i === f.lastWorld }, `${i + 1}. ${t(`worlds.${WORLDS[i]}`)}`)));
  const stars = percent(f.stars);
  const accuracy = percent(f.accuracy, 70);
  const ranges = percent(f.ranges);
  const parrots = h('input', { type: 'checkbox' });
  parrots.checked = f.allParrots;
  const apply = () => {
    fillProgress(p, { keys: Math.min(most, Math.max(0, Number(keys.value) || 0)), lastWorld: Number(world.value), stars: stars.get(), accuracy: accuracy.get(), ranges: ranges.get(), allParrots: parrots.checked });
    close();
    go('map', {}, false);
    toast(t('service.filled'));
  };
  const close = modal(h('div', { class: 'service-dialog' }, h('h2', {}, t('service.fill')),
    h('p', { class: 'hint' }, t('service.fillHint')),
    h('div', { class: 'fill-grid' },
      fillField(t('service.fillKeys', { n: most }), keys, t('service.fillKeysHint')),
      fillField(t('service.fillWorld'), world, t('service.fillWorldHint')),
      fillField(t('service.fillStars'), stars.el, t('service.fillStarsHint')),
      fillField(t('service.fillAccuracy'), accuracy.el, t('service.fillAccuracyHint')),
      fillField(t('service.fillRanges'), ranges.el, t('service.fillRangesHint')),
      h('div', { class: 'switch-field' }, h('label', {}, parrots, h('span', { class: 'switch-title' }, t('service.fillParrots'))), h('small', {}, t('service.fillParrotsHint')))),
    h('div', { class: 'row center' }, button(t('common.back'), () => close(), 'btn'), button(t('service.fillApply'), apply, 'btn primary', 'check'))));
}

/** Days the settings show that the password was removed or changed without the current one. */
const LOCK_NOTE_DAYS = 30;

/** The round warning on the settings password panel for a month after the super player removed or changed it; null otherwise. */
export function lockRemovedNote(now = Date.now()): HTMLElement | null {
  const at = app.store.data.lockRemovedAt;
  if (at === undefined || now - at > LOCK_NOTE_DAYS * 86_400_000) return null;
  const text = t('service.lockRemovedAt', { date: new Date(at).toLocaleString(locale()) });
  const b = roundButton('super', 'warn', text, () => toast(text));
  b.classList.add('lock-note');
  return b;
}
