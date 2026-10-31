import { imageUrl } from '../gfx/assets';
import { t } from '../i18n/i18n';
import { openSurprises } from '../game/cards';
import type { Surprise } from '../storage/schema';
import { type Child, type ICONS, button, closeButton, h, richText } from './dom';
import { tip } from './tooltip';

export interface EndAction {
  label: string;
  icon: keyof typeof ICONS;
  run: () => void;
  tip?: string;
}

export interface EndCardOpts {
  /** The end's own class beside `end-card`. */
  cls: string;
  title: string;
  /** One picture of what happened: an image's name, or an element (the player's character). */
  picture: string | HTMLElement;
  /** Under the picture: the stars, or one short value. */
  under?: Child;
  /** At most three rows, label and value. */
  rows?: [string, Child][];
  /** Instead of the rows: a text with `**bold**` (the hero's journey's panel between parts). */
  text?: string | null;
  /** The one green line of news. */
  news?: Child[] | null;
  /** A yellow tip line. */
  tip?: string | null;
  /** Under the rows: the hand-in's link. */
  extra?: HTMLElement | null;
  /** Surprises told today, when this run told one: the band and its button. */
  surprises?: Surprise[];
  /** A break is due: its button goes first, and `back` brings the card back without it. */
  onBreak?: ((back: () => void) => void) | null;
  /** The end's own buttons, its main one first; at most two others are shown. */
  actions: EndAction[];
  /** "To the map" last; none on a card that goes on in the level. */
  toMap?: (() => void) | null;
  /** The round X at the top right. */
  onClose?: (() => void) | null;
}

/** Plain buttons beside the main one, "To the map" not counted. */
const PLAIN_MAX = 2;

/**
 * The one card of every end: the title on top; a square with one picture and the stars or one
 * value under it, beside at most three rows and one green line; the band of a surprise told in
 * this run; one main button, at most two plain ones and "To the map" last. A due break, then the
 * surprise, take the main button before the end's own; back from either, the card goes on without it.
 */
export function endCard(o: EndCardOpts): HTMLElement {
  const bot = h('div', { class: 'ec-bot' });
  let breakDue = !!o.onBreak;
  let surprise = !!o.surprises?.length;
  const again = () => {
    render();
    focusMain(bot);
  };
  const seeSurprises = () => openSurprises(t('surprise.toldTitle'), o.surprises!, [], () => {
    surprise = false;
    again();
  });
  const render = () => {
    const list = [
      breakDue ? { label: t('end.breakBtn'), icon: 'wave', run: () => o.onBreak!(() => { breakDue = false; again(); }) } satisfies EndAction : null,
      surprise ? { label: t('end.surpriseSee'), icon: 'star', run: seeSurprises } satisfies EndAction : null,
      ...o.actions,
    ].filter((a) => a !== null);
    const make = (a: EndAction, cls: string) => {
      const b = button(a.label, a.run, cls, a.icon);
      if (a.tip) tip(b, a.tip);
      return b;
    };
    const [main, ...rest] = list;
    bot.replaceChildren(...[main && make(main, 'btn primary'), ...rest.slice(0, PLAIN_MAX).map((a) => make(a, 'btn')), o.toMap ? make({ label: t('end.toMap'), icon: 'map', run: o.toMap }, 'btn home') : null].filter((b) => !!b));
  };
  render();
  const pic = typeof o.picture === 'string' ? imageUrl(o.picture) : null;
  const box = imageUrl('ui-surprise-open');
  return h('div', { class: `card end-card ${o.cls}` },
    o.onClose ? closeButton(o.onClose, o.actions[0]?.label) : null,
    h('div', { class: 'ec-top' }, h('h2', {}, o.title)),
    h('div', { class: 'ec-mid' },
      h('div', { class: 'ec-pic' },
        typeof o.picture === 'string' ? pic && h('img', { class: 'ec-img', src: pic, alt: '' }) : o.picture,
        o.under != null ? h('div', { class: 'ec-under' }, o.under) : null),
      h('div', { class: 'ec-rows' },
        o.text ? h('p', { class: 'ec-text' }, ...richText(o.text)) : null,
        ...(o.rows ?? []).map(([label, value]) => h('div', { class: 'ec-row' }, h('span', {}, label), h('b', {}, value))),
        o.extra,
        o.news?.length ? h('p', { class: 'ec-news' }, ...o.news) : null,
        o.tip ? h('p', { class: 'ec-tip' }, o.tip) : null)),
    surprise ? h('button', { class: 'ec-surprise', type: 'button', onClick: seeSurprises },
      box ? h('img', { src: box, alt: '' }) : null, h('b', {}, t('end.surpriseNew'))) : null,
    bot);
}

/** The card's main button takes the focus. */
export function focusMain(card: HTMLElement): void {
  (card.closest('.end-card') ?? card).querySelector<HTMLButtonElement>('.ec-bot .btn.primary, .ec-bot .btn')?.focus();
}
