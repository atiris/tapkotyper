import { app, reduceMotion } from '../app/app';
import { audio } from '../audio/audio';
import { imageUrl } from '../gfx/assets';
import { type Mood, renderTapkoInto, tapkoElement } from '../gfx/tapko';
import { h, modal } from './dom';

/** A point on the map as a share of its width and height. */
interface Spot { x: number; y: number }

/** Where the figure stands at each place of `ui-treasure-map` (beside its foot, on free paper); the last one is the treasure. */
const STOPS: Spot[] = [
  { x: 0.2, y: 0.86 }, // rocket
  { x: 0.19, y: 0.62 }, // egg
  { x: 0.31, y: 0.41 }, // town
  { x: 0.38, y: 0.58 }, // scrap pile
  { x: 0.57, y: 0.27 }, // forest
  { x: 0.61, y: 0.42 }, // lake
  { x: 0.66, y: 0.61 }, // forest
  { x: 0.51, y: 0.84 }, // crane
  { x: 0.71, y: 0.8 }, // town
  { x: 0.87, y: 0.54 }, // tree
  { x: 0.86, y: 0.26 }, // treasure
];
const TREASURE = STOPS.length - 1;
/** The free paper the figure's feet may walk on. */
const AREA = { x0: 0.1, x1: 0.9, y0: 0.2, y1: 0.88 };
/** Map heights per map width, so a step up is as long as a step aside. */
const ASPECT = 812 / 1094;
/** Map widths a second: a slow stroll. */
const SPEED = 0.07;
/** How close the feet come to a place to notice it. */
const NEAR = 0.05;
/** How long the figure rejoices at a place. */
const JOY_MS = 1800;
/** The share of walks that head for a place; the rest go anywhere. */
const TO_STOP = 0.5;

const dist = (a: Spot, b: Spot) => Math.hypot(a.x - b.x, (a.y - b.y) * ASPECT);

/**
 * Just for fun (the map's word typed on the world map): an old treasure map opens and the child's
 * figure strolls over it at random from the rocket; whenever it comes to one of the places it
 * stops and rejoices, at the treasure the most. With reduced motion it stands happy at the treasure.
 */
export function treasureMap(): void {
  const src = imageUrl('ui-treasure-map');
  const look = app.profile?.companion;
  if (!src || !look || document.querySelector('.treasure-map')) return;
  const figure = tapkoElement(look, 'idle');
  const board = h('div', { class: 'treasure-map' }, h('img', { src, alt: '', draggable: 'false' }), figure);
  let mood: Mood = 'idle';
  const show = (m: Mood) => { if (m !== mood) renderTapkoInto(figure, look, (mood = m)); };
  const place = (p: Spot) => { figure.style.left = `${p.x * 100}%`; figure.style.top = `${p.y * 100}%`; };
  let frame = 0;
  let timer = 0;
  const close = modal(board, { cls: 'treasure-modal', onClose: () => { cancelAnimationFrame(frame); clearTimeout(timer); } });
  board.addEventListener('click', close);
  if (reduceMotion()) {
    place(STOPS[TREASURE]);
    show('happy');
    return;
  }
  let at: Spot = STOPS[0];
  let last = 0;
  place(at);
  const rejoice = (stop: number) => {
    last = stop;
    figure.classList.remove('walking');
    show('happy');
    figure.classList.add('rejoice');
    audio.sfx(stop === TREASURE ? 'cheer' : 'pop');
    timer = window.setTimeout(() => {
      figure.classList.remove('rejoice');
      show('idle');
      walk();
    }, stop === TREASURE ? JOY_MS * 1.5 : JOY_MS);
  };
  const walk = () => {
    const others = STOPS.map((_, i) => i).filter((i) => i !== last);
    const to: Spot = Math.random() < TO_STOP
      ? STOPS[others[Math.floor(Math.random() * others.length)]]
      : { x: AREA.x0 + Math.random() * (AREA.x1 - AREA.x0), y: AREA.y0 + Math.random() * (AREA.y1 - AREA.y0) };
    const from = at;
    const ms = (dist(from, to) / SPEED) * 1000;
    const start = performance.now();
    figure.classList.add('walking');
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      at = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
      place(at);
      // A place on the way stops the stroll, but not the one just left.
      const near = STOPS.findIndex((s, i) => i !== last && dist(s, at) < NEAR);
      if (near >= 0) return rejoice(near);
      if (k < 1) frame = requestAnimationFrame(step);
      else walk();
    };
    frame = requestAnimationFrame(step);
  };
  timer = window.setTimeout(walk, 600);
}
