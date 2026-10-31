import { app, applyProfileLook, go } from '../app/app';
import { locale, t } from '../i18n/i18n';
import { codeFrom, linkOf } from '../share/codec';
import { noteTask, parseTask } from '../share/task';
import type { TaskSpec } from '../storage/schema';
import { bigCode } from '../ui/big-code';
import { type CameraView, cameraView } from '../ui/camera';
import { cornerControls } from '../ui/chrome';
import { button, h, icon } from '../ui/dom';
import { copyLink, fitsQr } from '../ui/link-box';
import { taskPanel } from '../ui/task-panel';

/**
 * A phone without a keyboard notes a task from the teacher's QR code and sends it home: the
 * camera, then the task with ways to send its link (the share sheet, an e-mail, copying, a big
 * code for a laptop's camera). The tasks noted here stay listed under the camera.
 */
export function taskNoteScreen(root: HTMLElement): () => void {
  app.profile = null;
  applyProfileLook(null);
  const body = h('div', { class: 'note-body' });
  let camera: CameraView | null = null;
  const halt = () => {
    camera?.stop();
    camera = null;
  };

  const save = (code: string, spec: TaskSpec) => {
    app.store.data.notedTasks = noteTask(app.store.data.notedTasks, code, spec.title || t('task.untitled'));
    app.store.save();
  };

  /** The task and the ways to send it home. */
  const showTask = (code: string, spec: TaskSpec) => {
    halt();
    const link = linkOf('task', code);
    const title = spec.title || t('task.untitled');
    const area = h('textarea', { class: 'link-text', rows: 2, readonly: true, 'aria-label': t('share.link') });
    area.value = link;
    area.addEventListener('focus', () => area.select());
    const copied = h('span', { class: 'hint', 'aria-live': 'polite' });
    const text = t('note.body');
    const mail = `mailto:?subject=${encodeURIComponent(t('note.subject', { title }))}&body=${encodeURIComponent(`${text}\n${link}`)}`;
    body.replaceChildren(taskPanel(spec,
      area,
      h('div', { class: 'task-actions note-actions' },
        'share' in navigator ? button(t('note.send'), () => void navigator.share({ title, text, url: link }).catch(() => undefined), 'btn primary', 'share') : null,
        h('a', { class: 'btn', href: mail }, icon('mail'), h('span', {}, t('note.email'))),
        button(t('share.copy'), async () => {
          await copyLink(link, area);
          copied.textContent = t('share.copied');
        }, 'btn', 'copy'),
        fitsQr(link) ? button(t('task.bigCode'), () => bigCode(link, '', title, 'task'), 'btn', 'fullscreen') : null,
        button(t('note.again'), scan, 'btn ghost', 'camera')),
      copied));
    window.scrollTo(0, 0);
  };

  const open = (code: string) => void parseTask(code).then((spec) => showTask(code, spec), () => undefined);

  /** The camera and the tasks noted so far. */
  const scan = () => {
    halt();
    const view = camera = cameraView((text) => {
      const code = codeFrom(text, 'task');
      void (code ? parseTask(code) : Promise.reject()).then((spec) => {
        if (camera !== view) return;
        view.hit();
        save(code!, spec);
        showTask(code!, spec);
      }, () => view.unknown(t('task.notTask')));
    }, () => t('task.scanHint'));
    const noted = app.store.data.notedTasks;
    const list = h('ul', { class: 'noted-list' }, ...noted.map((x) => {
      const remove = button('', () => {
        app.store.data.notedTasks = app.store.data.notedTasks.filter((y) => y.code !== x.code);
        app.store.save();
        item.remove();
        if (!list.children.length) listBox.hidden = true;
      }, 'btn small ghost', 'close');
      remove.setAttribute('aria-label', t('note.remove'));
      const item = h('li', {},
        h('button', { class: 'noted-open', type: 'button', onClick: () => open(x.code) },
          h('b', {}, x.title), h('small', {}, new Date(x.at).toLocaleDateString(locale()))),
        remove);
      return item;
    }));
    const listBox = h('section', { class: 'noted' }, h('h2', {}, t('note.noted')), list);
    listBox.hidden = !noted.length;
    body.replaceChildren(h('section', { class: 'scan-card note-scan' }, view.frame, view.picker, view.status), listBox);
  };

  scan();
  root.append(h('div', { class: 'screen note-screen' },
    h('header', { class: 'bar' }, button(t('common.back'), () => go('start'), 'btn ghost small', 'back'), h('h1', {}, t('task.importTitle'))),
    cornerControls(),
    h('main', { class: 'panel' }, body)));
  return halt;
}
