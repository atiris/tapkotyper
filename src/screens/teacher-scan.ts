import { audio } from '../audio/audio';
import { t } from '../i18n/i18n';
import { type Camera, type CameraError, startScan } from '../ui/qr-scanner';
import { button, h } from '../ui/dom';

export interface ScanCard {
  el: HTMLElement;
  /** Flashes the preview green and ticks softly. */
  hit(): void;
  /** A short hint under the preview, for example an unknown code. */
  hint(text: string): void;
  /** Replaces the list of what this scan collected, with its counts: new children and updated results. */
  setList(rows: Node[], fresh: number, updated: number): void;
  /** Stops the camera for good. */
  stop(): void;
}

/**
 * The camera card of the teacher view: the group being scanned, a live preview, the done bar
 * with the counts of this scan, the cameras and the list of this scan.
 */
export function scanCard(group: string, onText: (text: string) => void, onDone: () => void): ScanCard {
  const video = h('video', { class: 'scan-video', playsinline: true, muted: true, 'aria-label': t('teacher.scan.preview') });
  video.muted = true;
  const status = h('p', { class: 'hint', role: 'status', 'aria-live': 'polite' });
  const picker = h('select', { class: 'scan-camera', 'aria-label': t('teacher.scan.camera'), onChange: (e: Event) => void camera?.use((e.target as HTMLSelectElement).value).catch(fail) });
  picker.hidden = true;
  const list = h('ul', { class: 'scan-list' });
  const total = h('span', { class: 'scan-total' });
  const split = h('span', { class: 'hint' });
  const frame = h('div', { class: 'scan-frame' }, video);
  let camera: Camera | null = null;
  let closed = false;
  let flash = 0;
  let restore = 0;
  let base = '';

  const say = (text: string, cls = 'hint') => {
    status.className = cls;
    status.textContent = text;
  };
  const fail = (e: unknown) => {
    base = '';
    say(t(`teacher.scan.error.${(typeof e === 'string' ? e : 'failed') as CameraError}`), 'error');
  };
  const halt = () => {
    camera?.stop();
    camera = null;
  };
  const begin = async () => {
    if (closed || camera) return;
    say(t('teacher.scan.starting'));
    try {
      const c = await startScan(video, onText);
      if (closed || document.hidden) return void c.stop();
      camera = c;
      base = t(c.multi ? 'teacher.scan.many' : 'teacher.scan.one');
      say(base);
      picker.replaceChildren(...c.devices.map((d) => h('option', { value: d.id }, d.label)));
      picker.hidden = c.devices.length < 2;
    } catch (e) {
      fail(e);
    }
  };
  // A hidden tab must not keep the camera on.
  const onVisibility = () => (document.hidden ? halt() : void begin());
  document.addEventListener('visibilitychange', onVisibility);
  void begin();

  return {
    el: h('section', { class: 'scan-card' },
      // On a phone this part fills the screen: the camera and the way out without scrolling.
      h('div', { class: 'scan-stage' },
        h('h2', { class: 'scan-title' }, group ? `${t('teacher.scan.title')} · ${group}` : t('teacher.scan.title')),
        frame,
        h('div', { class: 'scan-done' },
          h('div', { class: 'scan-counts', 'aria-live': 'polite' }, total, split),
          button(t('teacher.scan.done'), onDone, 'btn primary', 'next'))),
      picker,
      status,
      h('h2', {}, t('teacher.scan.collected')),
      list),
    hit() {
      frame.classList.add('hit');
      clearTimeout(flash);
      flash = window.setTimeout(() => frame.classList.remove('hit'), 400);
      audio.sfx('pop');
    },
    hint(text) {
      say(text);
      clearTimeout(restore);
      restore = window.setTimeout(() => base && say(base), 1500);
    },
    setList(rows, fresh, updated) {
      list.replaceChildren(...rows);
      total.textContent = t('teacher.scan.count', { n: fresh + updated });
      split.textContent = [t('teacher.scan.fresh', { n: fresh }), updated ? t('teacher.scan.updatedCount', { n: updated }) : ''].filter(Boolean).join(' · ');
    },
    stop() {
      closed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimeout(flash);
      clearTimeout(restore);
      halt();
    },
  };
}
