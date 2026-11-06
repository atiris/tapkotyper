/**
 * The sections and single keys a first visit's start page shows (no player yet, nothing offline;
 * the corner buttons share theirs with the map): a build cuts them into `i18n/<lang>.start.json`
 * (vite.config.ts), which loads first; the whole file follows (i18n.ts). A text missing here shows
 * late; e2e/start-texts.spec.ts keeps the list whole.
 */
export const START_TEXTS = [
  'start', 'common', 'service', 'install', 'kbSettings', 'layouts', 'layoutsShort', 'fingering', 'fingeringShort', 'handsMode', 'about',
  'map.settings', 'teacher.title', 'help.title',
];
