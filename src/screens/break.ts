import { app, go } from '../app/app';
import { audio } from '../audio/audio';
import { tapkoElement } from '../gfx/tapko';
import { t } from '../i18n/i18n';
import { nickname } from '../storage/store';
import { postureContent } from '../game/cards';
import { button, confirmDialog, h } from '../ui/dom';
import { cornerControls } from '../ui/chrome';

const EXERCISES = ['arms', 'fists', 'shoulders'] as const;
const SECONDS = 20;

/** Stretch break led by the narrator: three short exercises, then the posture card. */
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
  let i = 0;
  let left = SECONDS;
  const end = () => {
    clearInterval(tick);
    app.sessionSeconds = 0;
    box.replaceChildren(postureContent(), h('p', {}, t('break.done', { name: nickname(p) })),
      h('div', { class: 'row center' }, button(t('common.continue'), () => go('map'), 'btn primary', 'next')));
    (box.querySelector('.btn.primary') as HTMLElement).focus();
  };
  const show = () => {
    const ex = EXERCISES[i];
    stage.dataset.ex = ex;
    title.textContent = t('break.title', { n: i + 1, total: EXERCISES.length });
    text.textContent = t(`break.${ex}`);
  };
  const tick = setInterval(() => {
    left--;
    timer.textContent = String(left);
    if (left <= 0) {
      i++;
      left = SECONDS;
      if (i >= EXERCISES.length) return end();
      audio.sfx('pop');
      show();
    }
  }, 1000);
  timer.textContent = String(left);
  show();
  const corner = cornerControls();
  // The break is not skipped through the help page.
  corner.querySelector<HTMLButtonElement>('.help-btn')!.disabled = true;
  root.append(h('div', { class: 'screen break-screen' },
    corner,
    box,
    h('div', { class: 'row center' }, button(t('break.parentSkip'), async () => {
      if (await confirmDialog({ title: t('break.skipTitle'), text: t('break.skipText'), ok: t('break.skipOk'), cancel: t('common.back') })) end();
    }, 'btn ghost small', 'gear'))));
  return () => clearInterval(tick);
}
