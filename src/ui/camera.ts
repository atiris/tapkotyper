import { audio } from '../audio/audio';
import { t } from '../i18n/i18n';
import { type Camera, type CameraError, startScan } from './qr-scanner';
import { h, icon } from './dom';

/** Milliseconds a hint (an unknown code) stays before the ready line comes back, and the least time between two. */
const HINT_MS = 1500;
const UNKNOWN_MS = 1000;
/** The green flash of a code read. */
export const HIT_MS = 400;

export interface CameraView {
  /** The live picture, a square from its middle, with the aim and in its corner the fullscreen switch (phones) and, with several cameras, the camera switch. */
  frame: HTMLElement;
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
 * A camera that reads QR codes into `onText`: the picture in its frame and a status line, for the
 * caller to place. `ready` is the status once the camera runs. A hidden tab turns the camera off
 * and a visible one on again; `stop` ends it.
 */
export function cameraView(onText: (text: string) => void, ready: (multi: boolean) => string): CameraView {
  const video = h('video', { class: 'scan-video', playsinline: true, muted: true, 'aria-label': t('camera.preview') });
  video.muted = true;
  const status = h('p', { class: 'hint', role: 'status', 'aria-live': 'polite' });
  // The next camera of the device, in turn.
  const switcher = h('button', { type: 'button', class: 'scan-switch', 'aria-label': t('camera.switch'), tip: t('camera.switch'), onClick: () => {
    if (!camera) return;
    const list = camera.devices;
    const at = list.findIndex((d) => d.id === camera!.current());
    void camera.use(list[(at + 1) % list.length].id).catch(fail);
  } }, icon('cameraSwitch'));
  switcher.hidden = true;
  // On a phone the scan takes the whole screen; `auto`: this camera turned it on, so leaving gives it back.
  const phone = document.fullscreenEnabled && matchMedia('(pointer: coarse) and (hover: none)').matches;
  let auto = false;
  const full = h('button', { type: 'button', class: 'scan-switch', onClick: () => {
    auto = false;
    void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => undefined);
  } });
  const paintFull = () => {
    const on = !!document.fullscreenElement;
    if (!on) auto = false;
    const label = t(on ? 'common.fullscreenExit' : 'common.fullscreen');
    full.setAttribute('aria-label', label);
    full.setAttribute('aria-pressed', String(on));
    full.replaceChildren(icon(on ? 'fullscreenExit' : 'fullscreen'));
  };
  full.hidden = !phone;
  if (phone) {
    paintFull();
    document.addEventListener('fullscreenchange', paintFull);
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen().then(() => {
      if (!closed) auto = true;
      else void document.exitFullscreen().catch(() => undefined);
    }, () => undefined);
  }
  const frame = h('div', { class: 'scan-frame' }, video, h('div', { class: 'scan-aim', 'aria-hidden': 'true' }), h('div', { class: 'scan-tools' }, full, switcher));
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
      switcher.hidden = c.devices.length < 2;
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
      document.removeEventListener('fullscreenchange', paintFull);
      if (auto && document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      auto = false;
    },
  };
}
