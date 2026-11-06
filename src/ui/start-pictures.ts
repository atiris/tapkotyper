import type { Look } from '../app/theme';

/** The start page's meadow of each look: its largest picture, which index.html starts loading with the page (vite.config.ts). */
export const MEADOW: Record<Look, string> = { light: 'ui-start-meadow', dark: 'ui-start-meadow-night' };

/** The meadow's coarser copy (scripts/assets.mjs) for a first visit; later visits have the full one offline. */
export const LOW = '-low';

/** A first visit: no service worker keeps the files on this device yet. */
export const firstVisit = (): boolean => !navigator.serviceWorker?.controller;

/** The meadow shown in a look. */
export const meadowPicture = (look: Look): string => MEADOW[look] + (firstVisit() ? LOW : '');

/** A start page picture's copy at twice its largest drawn size (scripts/assets.mjs), so a phone line loads little. */
export const small = (name: string): string => `${name}-small`;
