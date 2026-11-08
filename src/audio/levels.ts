import type { SoundLevel } from '../storage/schema';

/** Quick sound switch: normal, quiet (20 % of normal), only where sound matters (normal there, else off) or off. */
export const SOUND_LEVELS: SoundLevel[] = ['normal', 'quiet', 'important', 'off'];

/** The level after `level` in the switch's cycle (F4). */
export const nextLevel = (level: SoundLevel): SoundLevel => SOUND_LEVELS[(SOUND_LEVELS.indexOf(level) + 1) % SOUND_LEVELS.length];

/** The gain a level gives: `important` plays like normal while a level runs whose sound matters, else like off. */
export function levelGain(level: SoundLevel, important: boolean): number {
  if (level === 'important') return important ? 1 : 0;
  return level === 'normal' ? 1 : level === 'quiet' ? 0.2 : 0;
}
