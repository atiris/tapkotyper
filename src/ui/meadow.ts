import type { Look } from '../app/theme';

/** The start page's meadow of each look: its largest picture, which index.html starts loading with the page (vite.config.ts). */
export const MEADOW: Record<Look, string> = { light: 'ui-start-meadow', dark: 'ui-start-meadow-night' };
