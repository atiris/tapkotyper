import { t, tn } from '../i18n/i18n';
import { cameraView } from '../ui/camera';
import { button, h } from '../ui/dom';

export interface ScanCard {
  el: HTMLElement;
  /** Flashes the preview green, beeps like a shop scanner and buzzes where the phone can. */
  hit(): void;
  /** Blinks the preview orange twice: this code is here already. */
  again(): void;
  /** A short hint under the preview, at most once a second: an unknown code. */
  unknown(text: string): void;
  /** Replaces the list of what this scan collected; the done bar counts it. */
  setList(rows: Node[]): void;
  /** Stops the camera for good. */
  stop(): void;
}

/**
 * The camera card of the teacher view: the group being scanned, a live preview, the done bar
 * with the counts of this scan, the cameras and the list of this scan.
 */
export function scanCard(group: string, onText: (text: string) => void, onDone: () => void): ScanCard {
  const camera = cameraView(onText, (multi) => t(multi ? 'teacher.scan.many' : 'teacher.scan.one'));
  const list = h('ul', { class: 'scan-list' });
  const total = h('span', { class: 'scan-total' });
  return {
    el: h('section', { class: 'scan-card' },
      // On a phone this part fills the screen: the camera and the way out without scrolling.
      h('div', { class: 'scan-stage' },
        h('h2', { class: 'scan-title' }, group ? `${t('teacher.scan.title')} · ${group}` : t('teacher.scan.title')),
        camera.frame,
        h('div', { class: 'scan-done' },
          h('div', { class: 'scan-counts', 'aria-live': 'polite' }, total),
          button(t('teacher.scan.done'), onDone, 'btn primary', 'next'))),
      camera.picker,
      camera.status,
      h('h2', {}, t('teacher.scan.collected')),
      list),
    hit: camera.hit,
    again: camera.again,
    unknown: camera.unknown,
    setList(rows) {
      list.replaceChildren(...rows);
      total.textContent = tn('teacher.scan.count', rows.length);
    },
    stop: camera.stop,
  };
}
