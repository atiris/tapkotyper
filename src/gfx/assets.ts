/** Loads processed assets listed in `public/assets/manifest.json`; every user has a procedural fallback. */

export interface AccessoryInfo {
  id: string;
  slot: Slot;
  set: string;
}

export type Slot = 'head' | 'eyes' | 'neck' | 'body' | 'back' | 'hand' | 'feet';

interface Manifest {
  images: Record<string, { w: number; h: number }>;
  accessories: AccessoryInfo[];
  music: string[];
}

let manifest: Manifest = { images: {}, accessories: [], music: [] };
/** Pictures ready so far: a still scene draws again when one more comes. */
let ready = 0;

export function picturesReady(): number {
  return ready;
}

const images = new Map<string, HTMLImageElement>();
const loading = new Map<string, Promise<void>>();

export const assetUrl = (file: string) => `${import.meta.env.BASE_URL}assets/${file}`;

export async function loadManifest(): Promise<void> {
  try {
    const res = await fetch(assetUrl('manifest.json'));
    if (res.ok) manifest = await res.json();
  } catch {
    // No assets: everything is drawn procedurally.
  }
}

export function hasImage(name: string): boolean {
  return name in manifest.images;
}

export function hasMusic(name: string): boolean {
  return manifest.music.includes(name);
}

/** Names of all music tracks (`audio.music` takes them without the `music-` prefix). */
export function musicTracks(): string[] {
  return manifest.music.map((m) => m.replace(/^music-/, ''));
}

export function accessories(): AccessoryInfo[] {
  return manifest.accessories;
}

export function imageUrl(name: string): string | null {
  return hasImage(name) ? assetUrl(`${name}.webp`) : null;
}

/** Starts loading images; resolves when all of them are ready (or failed). */
export function preload(names: string[]): Promise<void> {
  return Promise.all(names.filter(hasImage).map(load)).then(() => undefined);
}

/** Pictures a level draws only when their thing comes: objects, Bolt, Melody and the astronaut. */
const PLAY_PICTURES = /^(obj|robot|fairy|tapko-astronaut)/;

/**
 * Downloads every picture a level may draw (once per visit), in the background while the child picks
 * a player. Only the files come: a level decodes its own pictures when it opens (`preload`), so the
 * memory and the work at the start do not grow with every world added.
 */
export async function preloadPlay(): Promise<void> {
  const names = Object.keys(manifest.images).filter((n) => PLAY_PICTURES.test(n) && !loading.has(n));
  const next = async (): Promise<void> => {
    for (let n = names.shift(); n; n = names.shift()) {
      await ownIdle();
      if (!loading.has(n)) await fetch(assetUrl(`${n}.webp`), { priority: 'low' }).then((r) => r.blob()).catch(() => undefined);
    }
  };
  await Promise.all(Array.from({ length: BACKGROUND_AT_ONCE }, next));
}

/** Background downloads at a time: a few, so on a slow line a level's own pictures do not queue behind every other world's. */
const BACKGROUND_AT_ONCE = 2;
/** Pictures a screen asked for that are still loading; the background downloads wait for them. */
let own = 0;
let ownWaiting: (() => void)[] = [];

function ownIdle(): Promise<void> {
  return own ? new Promise((resolve) => ownWaiting.push(resolve)) : Promise.resolve();
}

function ownSettled(): void {
  if (--own) return;
  const waiting = ownWaiting;
  ownWaiting = [];
  for (const go of waiting) go();
}

/** Bolt and Melody in every look and mood: the story friend may join any level. */
export function friendPictures(): string[] {
  return Object.keys(manifest.images).filter((n) => /^(robot|fairy)/.test(n));
}

function load(name: string): Promise<void> {
  if (!loading.has(name)) {
    own++;
    loading.set(name, new Promise<void>((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      // Decoded before its first draw, so the frame that shows it does not stall.
      img.onload = () => void img.decode().catch(() => undefined).then(() => { images.set(name, img); ready++; resolve(); });
      img.onerror = () => resolve();
      img.src = assetUrl(`${name}.webp`);
    }).finally(ownSettled));
  }
  return loading.get(name)!;
}

/** The loaded image or null (then draw the fallback). Starts loading on first use. */
export function sprite(name: string): HTMLImageElement | null {
  const img = images.get(name);
  if (img) return img;
  if (hasImage(name)) void load(name);
  return null;
}
