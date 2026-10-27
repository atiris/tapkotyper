import { app } from '../app/app';
import { audio } from '../audio/audio';
import { tapkoElement } from '../gfx/tapko';
import { t } from '../i18n/i18n';
import { nickname } from '../storage/store';
import { postureContent } from '../game/cards';
import { button, h, modal } from '../ui/dom';
import { cornerControls } from '../ui/chrome';

/** The short break's stretches, 20 seconds each. */
const SMALL = { title: 'break.title', exercises: ['arms', 'fists', 'shoulders'], seconds: 20 };
/** The big break the child may add: longer, on the feet too, 30 seconds each. */
const BIG = { title: 'break.bigTitle', exercises: ['stand', 'march', 'neck', 'wrists', 'eyes', 'water'], seconds: 30 };

/**
 * Stretch break led by the narrator over the screen it was opened from: three short exercises,
 * then the posture card, and `onDone` back on that screen. Under the countdown the big break can
 * be added: six longer exercises, after which the short break goes on where it was. Anyone may skip
 * either (Esc too), unless the profile's breaks cannot be skipped: then only the big one can.
 */
export function openBreak(onDone: () => void): void {
  const p = app.profile!;
  const locked = p.settings.breaksLocked;
  const track = audio.playing;
  app.breakCount++;
  audio.music(app.breakCount % 2 ? 'break' : 'relaxing');
  const tapko = tapkoElement(p.companion, 'happy', 240);
  const title = h('h2', {});
  const text = h('p', { class: 'break-text' });
  const timer = h('div', { class: 'break-timer' });
  const stage = h('div', { class: 'break-stage' }, tapko);
  let plan = SMALL;
  let i = 0;
  let left = plan.seconds;
  /** Where the short break was when the big one started. */
  let paused: { i: number; left: number } | null = null;
  let finished = false;
  const bigButton = button(t('break.big'), () => startBig(), 'btn', 'play');
  bigButton.autofocus = true;
  const skipLabel = h('span', {});
  const skipButton = button(skipLabel, () => skip(), 'btn', 'next');
  const actions = h('div', { class: 'row center' }, bigButton, skipButton);
  const box = h('div', { class: 'card break-card' }, title, stage, text, timer, actions);
  const close = modal(h('div', { class: 'break-screen' }, cornerControls(), box), {
    cls: 'break-modal',
    closable: false,
    onClose: () => {
      clearInterval(tick);
      document.removeEventListener('keydown', onKey, true);
    },
  });
  const leave = () => {
    close();
    audio.music(track);
    onDone();
  };
  const end = () => {
    clearInterval(tick);
    finished = true;
    app.sessionSeconds = 0;
    box.replaceChildren(postureContent(), h('p', {}, t('break.done', { name: nickname(p) })),
      h('div', { class: 'row center' }, button(t('common.continue'), leave, 'btn primary', 'next')));
    (box.querySelector('.btn.primary') as HTMLElement).focus();
  };
  const show = () => {
    const ex = plan.exercises[i];
    stage.dataset.ex = ex;
    title.textContent = t(plan.title, { n: i + 1, total: plan.exercises.length });
    text.textContent = t(`break.${ex}`);
    timer.textContent = String(left);
    bigButton.hidden = !!paused;
    skipButton.hidden = locked && !paused;
    skipLabel.textContent = t(paused ? 'break.bigSkip' : 'break.skip');
  };
  const startBig = () => {
    paused = { i, left };
    plan = BIG;
    i = 0;
    left = plan.seconds;
    audio.sfx('pop');
    show();
  };
  const backToSmall = () => {
    plan = SMALL;
    ({ i, left } = paused!);
    paused = null;
    audio.sfx('pop');
    show();
  };
  const skip = () => {
    if (paused) backToSmall();
    else if (!locked) end();
  };
  // Escape skips like the button; on the posture card it goes on.
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    if (finished) leave();
    else skip();
  };
  document.addEventListener('keydown', onKey, true);
  const tick = setInterval(() => {
    left--;
    timer.textContent = String(left);
    if (left > 0) return;
    i++;
    left = plan.seconds;
    if (i < plan.exercises.length) {
      audio.sfx('pop');
      show();
    } else if (paused) backToSmall();
    else end();
  }, 1000);
  show();
}
