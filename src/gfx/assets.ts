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

function load(name: string): Promise<void> {
  if (!loading.has(name)) {
    loading.set(name, new Promise<void>((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { images.set(name, img); resolve(); };
      img.onerror = () => resolve();
      img.src = assetUrl(`${name}.webp`);
    }));
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
