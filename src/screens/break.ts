import { app, go } from '../app/app';
import { audio } from '../audio/audio';
import { tapkoElement } from '../gfx/tapko';
import { t } from '../i18n/i18n';
import { nickname } from '../storage/store';
import { postureContent } from '../game/cards';
import { button, confirmDialog, h } from '../ui/dom';
import { cornerControls } from '../ui/chrome';

/** The short break's stretches, 20 seconds each. */
const SMALL = { title: 'break.title', exercises: ['arms', 'fists', 'shoulders'], seconds: 20 };
/** The big break the child may add: longer, on the feet too, 30 seconds each. */
const BIG = { title: 'break.bigTitle', exercises: ['stand', 'march', 'neck', 'wrists', 'eyes', 'water'], seconds: 30 };

/**
 * Stretch break led by the narrator: three short exercises, then the posture card. During it the
 * big break can be added: six longer exercises, after which the short break goes on where it was.
 */
export function breakScreen(root: HTMLElement): () => void {
  const p = app.profile!;
  app.breakCount++;
  audio.music(app.breakCount % 2 ? 'break' : 'relaxing');
  const tapko = tapkoElement(p.companion, 'happy', 240);
  const title = h('h2', {});
  const text = h('p', { class: 'break-text' });
  const timer = h('div', { class: 'break-timer' });
  const stage = h('div', { class: 'break-stage' }, tapko);
  const box = h('div', { class: 'card break-card' }, title, stage, text, timer);
  let plan = SMALL;
  let i = 0;
  let left = plan.seconds;
  /** Where the short break was when the big one started. */
  let paused: { i: number; left: number } | null = null;
  const bigButton = button(t('break.big'), () => startBig(), 'btn', 'play');
  const backButton = button(t('break.bigBack'), () => backToSmall(), 'btn', 'back');
  backButton.hidden = true;
  const end = () => {
    clearInterval(tick);
    app.sessionSeconds = 0;
    bigButton.hidden = true;
    backButton.hidden = true;
    box.replaceChildren(postureContent(), h('p', {}, t('break.done', { name: nickname(p) })),
      h('div', { class: 'row center' }, button(t('common.continue'), () => go('map'), 'btn primary', 'next')));
    (box.querySelector('.btn.primary') as HTMLElement).focus();
  };
  const show = () => {
    const ex = plan.exercises[i];
    stage.dataset.ex = ex;
    title.textContent = t(plan.title, { n: i + 1, total: plan.exercises.length });
    text.textContent = t(`break.${ex}`);
    timer.textContent = String(left);
  };
  const startBig = () => {
    paused = { i, left };
    plan = BIG;
    i = 0;
    left = plan.seconds;
    bigButton.hidden = true;
    backButton.hidden = false;
    audio.sfx('pop');
    show();
  };
  const backToSmall = () => {
    plan = SMALL;
    ({ i, left } = paused!);
    paused = null;
    bigButton.hidden = false;
    backButton.hidden = true;
    audio.sfx('pop');
    show();
  };
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
  const corner = cornerControls();
  // The break is not skipped through the help page.
  corner.querySelector<HTMLButtonElement>('.help-btn')!.disabled = true;
  root.append(h('div', { class: 'screen break-screen' },
    corner,
    box,
    h('div', { class: 'row center' }, bigButton, backButton),
    h('div', { class: 'row center' }, button(t('break.parentSkip'), async () => {
      if (await confirmDialog({ title: t('break.skipTitle'), text: t('break.skipText'), ok: t('break.skipOk'), cancel: t('common.back') })) end();
    }, 'btn ghost small', 'gear'))));
  return () => clearInterval(tick);
}
