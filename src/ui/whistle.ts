import { reduceMotion } from '../app/app';
import { graphics } from '../engine/graphics';
import { h } from './dom';
import { type NoteLook, noteLook, notePic } from './notes';

/** Seconds between two whistles, at random, and the notes of one whistle, at random. */
const PAUSE_S: readonly [number, number] = [10, 30];
const NOTES: readonly [number, number] = [3, 5];
/** Milliseconds between two notes of a whistle, and how long a note flies, give or take a little. */
const NOTE_GAP_MS = 250;
const FLY_MS = 1600;
/** Where the mouth is on the figure, as shares of its box from the top left. */
const MOUTH = { x: 0.53, y: 0.38 };
/** How far a note rises (px, along its angle) and how wide it sways sideways. */
const RISE = 90;
const SWAY = 9;
/** Points on a note's path. */
const STEPS = 12;

const between = (lo: number, hi: number, rand: () => number) => lo + rand() * (hi - lo);

/**
 * The child's figure on the map whistles now and then: every 10-30 s a few small notes in their colours
 * leave its mouth one after another, grow, rise up and to the right on a wavy path and fade out. They are
 * only pictures (no sound, no clicks); nothing with less motion or simple graphics. Returns the stop.
 */
export function whistle(host: HTMLElement, seed: number, rand: () => number = Math.random): () => void {
  if (reduceMotion() || graphics.simple) return () => undefined;
  const layer = h('span', { class: 'whistle', 'aria-hidden': 'true' });
  host.append(layer);
  const timers: number[] = [];
  const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  let prev: NoteLook | undefined;
  const note = () => {
    prev = noteLook(Math.floor(rand() * 1e6), seed, prev);
    const el = notePic(prev);
    el.classList.add('whistle-note');
    el.style.left = `${MOUTH.x * 100}%`;
    el.style.top = `${MOUTH.y * 100}%`;
    layer.append(el);
    // A slightly different angle (up and to the right), speed and sway for each note.
    const angle = between(40, 65, rand) * (Math.PI / 180), ms = FLY_MS * between(0.85, 1.15, rand);
    const waves = between(1.2, 2, rand), phase = rand() * Math.PI * 2;
    const frames = Array.from({ length: STEPS + 1 }, (_, i) => {
      const k = i / STEPS, side = SWAY * Math.sin(phase + k * waves * Math.PI * 2) - SWAY * Math.sin(phase);
      const x = RISE * k * Math.cos(angle) + side * Math.sin(angle), y = -RISE * k * Math.sin(angle) + side * Math.cos(angle);
      return { transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(0.4 + 0.6 * Math.min(1, k * 2)).toFixed(2)}) rotate(${prev!.lean}deg)`, opacity: k < 0.4 ? 1 : 1 - (k - 0.4) / 0.6 };
    });
    el.animate(frames, { duration: ms, easing: 'ease-out', fill: 'forwards' }).onfinish = () => el.remove();
  };
  const next = () => later(between(PAUSE_S[0], PAUSE_S[1], rand) * 1000, () => {
    const n = Math.round(between(NOTES[0], NOTES[1], rand));
    for (let i = 0; i < n; i++) later(i * NOTE_GAP_MS, note);
    next();
  });
  next();
  return () => {
    for (const id of timers) clearTimeout(id);
    layer.remove();
  };
}
