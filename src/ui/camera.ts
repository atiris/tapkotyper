import { audio } from '../audio/audio';
import { t } from '../i18n/i18n';
import { type Camera, type CameraError, startScan } from './qr-scanner';
import { h } from './dom';

/** Milliseconds a hint (an unknown code) stays before the ready line comes back, and the least time between two. */
const HINT_MS = 1500;
const UNKNOWN_MS = 1000;
/** The green flash of a code read. */
export const HIT_MS = 400;

export interface CameraView {
  /** The live picture in its scan frame. */
  frame: HTMLElement;
  /** The camera picker, shown when the device has several cameras. */
  picker: HTMLSelectElement;
  /** One status line: starting, ready, the camera's errors, hints. */
  status: HTMLElement;
  /** Flashes the frame green, beeps like a shop scanner and buzzes where the device can. */
  hit(): void;
  /** Blinks the frame orange twice: this code is here already. */
  again(): void;
  /** A short hint in the status line, at most once a second (a code that is not the one wanted). */
  unknown(text: string): void;
  /** Stops the camera for good. */
  stop(): void;
}

/**
 * A camera that reads QR codes into `onText`: the picture in its frame, the camera picker and a
 * status line, for the caller to place. `ready` is the status once the camera runs. A hidden tab
 * turns the camera off and a visible one on again; `stop` ends it.
 */
export function cameraView(onText: (text: string) => void, ready: (multi: boolean) => string): CameraView {
  const video = h('video', { class: 'scan-video', playsinline: true, muted: true, 'aria-label': t('camera.preview') });
  video.muted = true;
  const status = h('p', { class: 'hint', role: 'status', 'aria-live': 'polite' });
  const picker = h('select', { class: 'scan-camera', 'aria-label': t('camera.pick'), onChange: (e: Event) => void camera?.use((e.target as HTMLSelectElement).value).catch(fail) });
  picker.hidden = true;
  const frame = h('div', { class: 'scan-frame' }, video);
  let camera: Camera | null = null;
  let closed = false;
  let flash = 0;
  let restore = 0;
  let base = '';
  let lastUnknown = -Infinity;

  const say = (text: string, cls = 'hint') => {
    status.className = cls;
    status.textContent = text;
  };
  const fail = (e: unknown) => {
    base = '';
    say(t(`camera.error.${(typeof e === 'string' ? e : 'failed') as CameraError}`), 'error');
  };
  const halt = () => {
    camera?.stop();
    camera = null;
  };
  const begin = async () => {
    if (closed || camera) return;
    say(t('camera.starting'));
    try {
      const c = await startScan(video, (text) => { if (!closed) onText(text); });
      if (closed || document.hidden) return void c.stop();
      camera = c;
      base = ready(c.multi);
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
    frame,
    picker,
    status,
    hit() {
      frame.classList.remove('again');
      frame.classList.add('hit');
      clearTimeout(flash);
      flash = window.setTimeout(() => frame.classList.remove('hit'), HIT_MS);
      audio.sfx('beep');
      navigator.vibrate?.(HIT_MS);
    },
    again() {
      clearTimeout(flash);
      frame.classList.remove('hit', 'again');
      // A reflow restarts the blink when the same code comes back right away.
      void frame.offsetWidth;
      frame.classList.add('again');
    },
    unknown(text) {
      const now = performance.now();
      if (now - lastUnknown < UNKNOWN_MS) return;
      lastUnknown = now;
      say(text);
      clearTimeout(restore);
      restore = window.setTimeout(() => base && say(base), HINT_MS);
    },
    stop() {
      closed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimeout(restore);
      halt();
    },
  };
}
