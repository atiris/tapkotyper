/** Finds the texts of the QR codes in one picture. */
export type Detect = (frame: CanvasImageSource, width: number, height: number) => Promise<string[]>;

export const SCAN_FPS = 8;
/** The same code is reported again only after this many milliseconds out of sight. */
export const SCAN_DEDUPE_MS = 3000;
/** Longest side of the picture given to the fallback decoder; smaller is faster. */
const FALLBACK_SIDE = 640;

interface BarcodeDetectorLike { detect(src: CanvasImageSource): Promise<{ rawValue: string }[]> }
declare const BarcodeDetector: (new (opts: { formats: string[] }) => BarcodeDetectorLike) | undefined;

export interface Scanner {
  /** Looks at one frame unless the last look was too recent or still runs. */
  tick(frame: CanvasImageSource, width: number, height: number): Promise<void>;
  /** True when the detector reads several codes in a frame. */
  multi: boolean;
}

/** The throttle and the dedupe around a detector, free of any camera. */
export function makeScanner(detect: Detect, multi: boolean, onCode: (text: string) => void, now: () => number = () => performance.now()): Scanner {
  const seen = new Map<string, number>();
  let last = -Infinity;
  let busy = false;
  return {
    multi,
    async tick(frame, width, height) {
      const at = now();
      if (busy || at - last < 1000 / SCAN_FPS) return;
      busy = true;
      last = at;
      try {
        for (const text of await detect(frame, width, height)) {
          const before = seen.get(text);
          seen.set(text, at);
          if (before === undefined || at - before > SCAN_DEDUPE_MS) onCode(text);
        }
      } catch { /* a bad frame: the next one is tried */ } finally {
        busy = false;
      }
    },
  };
}

/** The browser's own detector when it has one, else the small `jsqr` decoder, loaded only now. */
export async function makeDetector(): Promise<{ detect: Detect; multi: boolean }> {
  if (typeof BarcodeDetector !== 'undefined') {
    try {
      const native = new BarcodeDetector({ formats: ['qr_code'] });
      return { detect: async (frame) => (await native.detect(frame)).map((c) => c.rawValue), multi: true };
    } catch { /* formats not supported here: use the fallback */ }
  }
  const { default: jsQR } = await import('jsqr');
  const canvas = document.createElement('canvas');
  const g = canvas.getContext('2d', { willReadFrequently: true })!;
  return {
    multi: false,
    detect: async (frame, w, h) => {
      const k = Math.min(1, FALLBACK_SIDE / Math.max(w, h));
      canvas.width = Math.max(1, Math.round(w * k));
      canvas.height = Math.max(1, Math.round(h * k));
      g.drawImage(frame, 0, 0, canvas.width, canvas.height);
      const img = g.getImageData(0, 0, canvas.width, canvas.height);
      const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
      return hit ? [hit.data] : [];
    },
  };
}

export type CameraError = 'denied' | 'none' | 'insecure' | 'failed';

export interface Camera {
  multi: boolean;
  /** Cameras the device has, for a selector; filled once the permission is given. */
  devices: { id: string; label: string }[];
  /** Switches to another camera. */
  use(id: string): Promise<void>;
  stop(): void;
}

const errorOf = (e: unknown): CameraError => {
  const name = (e as DOMException)?.name;
  return name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'none' : 'failed';
};

/**
 * Opens the camera into `video` and reports every QR code read, about SCAN_FPS times a second.
 * Rejects with a CameraError. The picture stays in the video element: nothing is sent or stored.
 */
export async function startScan(video: HTMLVideoElement, onCode: (text: string) => void): Promise<Camera> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw 'insecure' satisfies CameraError;
  let stream: MediaStream | null = null;
  let stopped = false;
  const open = async (id?: string) => {
    stream?.getTracks().forEach((x) => x.stop());
    const wanted: MediaTrackConstraints = id ? { deviceId: { exact: id } } : { facingMode: 'environment' };
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: wanted, audio: false });
    } catch (e) {
      if (id || errorOf(e) === 'denied') throw errorOf(e);
      try { stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); } catch (e2) { throw errorOf(e2); }
    }
    video.srcObject = stream;
    await video.play().catch(() => undefined);
  };
  await open();
  const { detect, multi } = await makeDetector();
  const scanner = makeScanner(detect, multi, onCode);
  const timer = setInterval(() => { if (!stopped && video.videoWidth) void scanner.tick(video, video.videoWidth, video.videoHeight); }, 1000 / SCAN_FPS / 2);
  const camera: Camera = {
    multi,
    devices: [],
    use: open,
    stop() {
      stopped = true;
      clearInterval(timer);
      stream?.getTracks().forEach((x) => x.stop());
      video.srcObject = null;
    },
  };
  // Labels exist only after the permission was given.
  try {
    camera.devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput').map((d, i) => ({ id: d.deviceId, label: d.label || String(i + 1) }));
  } catch { /* no selector */ }
  return camera;
}
