import { app } from '../app/app';
import { fast } from '../app/fast';
import { audio } from '../audio/audio';
import { tapkoElement } from '../gfx/tapko';
import { t } from '../i18n/i18n';
import { button, closeButton, h, modal } from '../ui/dom';
import { cornerControls } from '../ui/chrome';

/** The warm-up's exercises on the feet, three of them at random, 30 seconds each. */
const EXERCISES = ['stand', 'march', 'squat', 'jump', 'twist', 'water'];
const COUNT = 3;
const SECONDS = 30;

/**
 * The warm-up ("Rozcvička") led by the narrator in a popup over the screen it was opened from: three
 * random exercises on the feet, with another exercise, once more and the end under them. At the end
 * of its time, or ended (the button, the round X, Esc or a click beside the card), the popup closes
 * and `onDone` goes back. The due warm-up (`due`) of a profile whose breaks cannot be skipped has no
 * way to end early.
 */
export function openBreak(onDone: () => void, due = false): void {
  const locked = due && app.profile!.settings.breaksLocked;
  const track = audio.playing;
  app.breakCount++;
  audio.music(app.breakCount % 2 ? 'break' : 'relaxing');
  const title = h('h2', {});
  const text = h('p', { class: 'break-text' });
  const timer = h('div', { class: 'break-timer' });
  const stage = h('div', { class: 'break-stage' }, tapkoElement(app.profile!.companion, 'happy', 240));
  const plan = pick(EXERCISES, COUNT);
  const length = () => Math.ceil(fast(SECONDS));
  let i = 0;
  let left = length();
  const otherButton = button(t('break.other'), () => other(), 'btn', 'replay');
  otherButton.autofocus = true;
  const endButton = button(t('break.end'), () => leave(), 'btn', 'close');
  endButton.hidden = locked;
  const actions = h('div', { class: 'row center break-actions' }, otherButton, button(t('break.again'), () => restart(), 'btn', 'replay'), endButton);
  const box = h('div', { class: 'card break-card' }, locked ? null : closeButton(() => leave(), t('break.closeTip')), title, stage, text, timer, actions);
  const screen = h('div', { class: 'break-screen' }, cornerControls(), box);
  screen.addEventListener('pointerdown', (e) => { if (e.target === screen && !locked) leave(); });
  const close = modal(screen, {
    cls: 'break-modal',
    closable: false,
    onClose: () => {
      clearInterval(tick);
      document.removeEventListener('keydown', onKey, true);
    },
  });
  /** Back to the screen it came from; the play time before the next warm-up starts again. */
  const leave = () => {
    app.sessionSeconds = 0;
    close();
    audio.music(track);
    onDone();
  };
  const show = () => {
    stage.dataset.ex = plan[i];
    title.textContent = t('break.title', { n: i + 1, total: plan.length });
    text.textContent = t(`break.${plan[i]}`);
    timer.textContent = String(left);
  };
  /** Once more, from the first exercise. */
  const restart = () => {
    i = 0;
    left = length();
    audio.sfx('pop');
    show();
  };
  /** Another exercise in place of this one, its full time again. */
  const other = () => {
    plan[i] = pick(EXERCISES.filter((e) => !plan.includes(e)), 1)[0];
    left = length();
    audio.sfx('pop');
    show();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    if (!locked) leave();
  };
  document.addEventListener('keydown', onKey, true);
  const step = () => {
    left--;
    timer.textContent = String(left);
    if (left > 0) return;
    if (++i >= plan.length) return leave();
    left = length();
    audio.sfx('pop');
    show();
  };
  const tick = setInterval(step, 1000);
  show();
}

/** `n` different exercises of `pool` at random. */
function pick(pool: readonly string[], n: number): string[] {
  const free = [...pool];
  return Array.from({ length: n }, () => free.splice(Math.floor(Math.random() * free.length), 1)[0]);
}
