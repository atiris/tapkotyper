import { app } from '../app/app';
import { fast } from '../app/fast';
import { audio } from '../audio/audio';
import { tapkoElement } from '../gfx/tapko';
import { t } from '../i18n/i18n';
import { nickname } from '../storage/store';
import { button, h, modal } from '../ui/dom';
import { cornerControls } from '../ui/chrome';

/** The short break's stretches, 20 seconds each. */
const SMALL = { title: 'break.title', exercises: ['arms', 'fists', 'shoulders'], seconds: 20 };
/** The big break the child may add: longer, on the feet too, 30 seconds each. */
const BIG = { title: 'break.bigTitle', exercises: ['stand', 'march', 'neck', 'wrists', 'eyes', 'water'], seconds: 30 };

/**
 * Stretch break led by the narrator over the screen it was opened from: three short exercises,
 * then a short "well rested", and `onDone` back on that screen. Under the countdown the big break
 * can be added: six longer exercises, after which the short break goes on where it was. Anyone may
 * skip either (Esc too), unless the profile's breaks cannot be skipped: then only the big one can.
 * With `play` it is the map's warm-up, the child's own choice: "Continue typing" (`play`) is there
 * all along and at its end, and "Cancel" (Esc) goes back to the map; it is never locked.
 */
export function openBreak(onDone: () => void, play?: () => void): void {
  const p = app.profile!;
  const locked = p.settings.breaksLocked && !play;
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
  /** Seconds of one exercise of the plan now. */
  const length = () => Math.ceil(fast(plan.seconds));
  let left = length();
  /** Where the short break was when the big one started. */
  let paused: { i: number; left: number } | null = null;
  let finished = false;
  const bigButton = button(t('break.big'), () => startBig(), 'btn', 'play');
  bigButton.autofocus = true;
  const skipLabel = h('span', {});
  const skipButton = button(skipLabel, () => skip(), 'btn', play ? 'close' : 'next');
  const playButton = play ? button(t('break.play'), () => leave(play), 'btn primary', 'play') : null;
  const actions = h('div', { class: 'row center' }, bigButton, playButton, skipButton);
  const box = h('div', { class: 'card break-card' }, title, stage, text, timer, actions);
  const close = modal(h('div', { class: 'break-screen' }, cornerControls(), box), {
    cls: 'break-modal',
    closable: false,
    onClose: () => {
      clearInterval(tick);
      document.removeEventListener('keydown', onKey, true);
    },
  });
  /** Back to the screen it came from, then `then` (the warm-up's next level). */
  const leave = (then = onDone) => {
    close();
    audio.music(track);
    then();
  };
  const end = () => {
    clearInterval(tick);
    finished = true;
    app.sessionSeconds = 0;
    box.replaceChildren(h('h2', {}, t('break.done', { name: nickname(p) })),
      h('div', { class: 'row center' }, ...(play
        ? [button(t('break.play'), () => leave(play), 'btn primary', 'play'), button(t('break.cancel'), () => leave(), 'btn', 'close')]
        : [button(t('common.continue'), () => leave(), 'btn primary', 'next')])));
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
    skipLabel.textContent = t(paused ? 'break.bigSkip' : play ? 'break.cancel' : 'break.skip');
  };
  const startBig = () => {
    paused = { i, left };
    plan = BIG;
    i = 0;
    left = length();
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
    else if (play) leave();
    else if (!locked) end();
  };
  // Escape skips (the warm-up: cancels) like the button; on the last card it goes back.
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
    left = length();
    if (i < plan.exercises.length) {
      audio.sfx('pop');
      show();
    } else if (paused) backToSmall();
    else end();
  }, 1000);
  show();
}
