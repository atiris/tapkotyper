import { reduceMotion } from '../app/app';
import { audio } from '../audio/audio';
import { imageUrl } from '../gfx/assets';
import { t } from '../i18n/i18n';
import { h } from './dom';
import { type FlightPoint, flyAlong, somewhere } from './parrot-visit';

/** Milliseconds Aro's line shows before he takes off, and after he lands. */
const SAY_MS = 1400;
const SAID_MS = 2600;
/** Milliseconds Aro stays out of the window on a round flight before he comes back. */
const AWAY_MS = 1500;
/** The flying parrot's width against the sitting one's (its wings are spread). */
const SPREAD = 1.8;

/** Aro, the Parrot badge, on his short perch; built by `aroPerch`. */
export interface AroPerch {
  el: HTMLElement;
  /** A small hop on the perch. */
  hop(): void;
  /** After `wait` ms says one of `lines`, spreads his wings and flies off to the right across the window; `back`: he flies round and lands again. */
  flyOff(lines: string[], back: boolean, wait?: number): void;
  /** Flies in from the right onto the empty perch and says one of `lines`. */
  arrive(lines: string[]): void;
  /** Ends every flight and timer (the page is left). */
  stop(): void;
}

/**
 * Aro sitting on his short wooden perch (`seated` false: the perch is empty until he arrives); `onClick`
 * gets the clicks on him. Null without the pictures.
 */
export function aroPerch(seated: boolean, onClick: (aro: AroPerch) => void): AroPerch | null {
  const wood = imageUrl('obj-parrot-perch-short');
  const sitting = imageUrl('ui-act-parrot');
  if (!wood || !sitting) return null;
  const bird = h('button', { class: `aro ${seated ? '' : 'away'}`, type: 'button', 'aria-label': `${t('parrot.name')}: ${t('parrot.badge')}`, tip: t('parrot.badge'), onClick: () => onClick(aro) },
    h('img', { src: sitting, alt: '' }));
  bird.addEventListener('animationend', () => bird.classList.remove('hop'));
  const line = h('p', { class: 'bubble aro-say' });
  line.hidden = true;
  const timers: number[] = [];
  const flights: (() => void)[] = [];
  let busy = !seated;
  const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  const say = (lines: string[], ms: number) => {
    line.textContent = lines[Math.floor(Math.random() * lines.length)];
    line.hidden = false;
    audio.sfx('squawk');
    later(ms, () => (line.hidden = true));
  };
  // Where Aro sits, in window pixels, and how wide he flies.
  const seat = (): FlightPoint => {
    const r = bird.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  const fly = (points: FlightPoint[], then: () => void) => {
    const flight = flyAlong(points, bird.getBoundingClientRect().width * SPREAD);
    if (!flight) return then();
    flights.push(flight.stop);
    void flight.done.then(then);
  };
  // In from the right edge, round the window, down onto the perch.
  const comeBack = (then: () => void) => {
    const to = seat();
    fly([{ x: innerWidth + 120, y: innerHeight * (0.15 + Math.random() * 0.3) }, somewhere(0.55, 0.85, 0.1, 0.5), somewhere(0.3, 0.6, 0.15, 0.6), to], () => {
      bird.classList.remove('away');
      then();
    });
  };
  const aro: AroPerch = {
    el: h('div', { class: 'aro-perch' }, h('img', { class: 'aro-wood', src: wood, alt: '' }), bird, line),
    hop: () => {
      if (busy || reduceMotion()) return;
      bird.classList.remove('hop');
      void bird.offsetWidth;
      bird.classList.add('hop');
    },
    flyOff: (lines, back, wait = 0) => {
      if (busy) return;
      busy = true;
      later(wait, () => say(lines, SAY_MS + 400));
      later(wait + SAY_MS, () => {
        const from = seat();
        bird.classList.add('away');
        const landed = () => (busy = false);
        if (reduceMotion()) return back ? later(AWAY_MS, () => { bird.classList.remove('away'); landed(); }) : undefined;
        // Up and to the right, over the page, out of the right edge.
        fly([from, { x: from.x + innerWidth * 0.12, y: from.y - innerHeight * 0.25 }, somewhere(0.35, 0.6, 0.1, 0.6), somewhere(0.6, 0.85, 0.15, 0.7), { x: innerWidth + 120, y: innerHeight * (0.1 + Math.random() * 0.3) }],
          () => back && later(AWAY_MS, () => comeBack(landed)));
      });
    },
    arrive: (lines) => {
      const landed = () => {
        busy = false;
        say(lines, SAID_MS);
      };
      if (reduceMotion()) {
        bird.classList.remove('away');
        return landed();
      }
      later(600, () => comeBack(landed));
    },
    stop: () => {
      timers.forEach(clearTimeout);
      flights.forEach((stop) => stop());
    },
  };
  return aro;
}
