import type { Profile } from '../storage/schema';
import { parseImport } from '../storage/store';
import { decode, encode } from './codec';

/** Longest move link offered; a longer profile goes by file. */
export const MOVE_LINK_MAX = 8000;
/** Days of per-key history a too long move link keeps. */
const MOVE_DAYS_KEEP = 30;

/** Profile without the per-key day history older than `days`. */
export function trimHistory(p: Profile, days: number, now = new Date()): Profile {
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  const cut = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`;
  const keys = Object.fromEntries(Object.entries(p.stats.keys).map(([k, s]) => [k, { ...s, days: s.days.filter((d) => d.date >= cut) }]));
  return { ...p, stats: { ...p.stats, keys } };
}

/**
 * Code of a whole profile for a move link of at most `max` characters after `prefix`: the full
 * profile, else without old key history; null when even that is too long.
 */
export async function moveCode(p: Profile, prefix: string, max = MOVE_LINK_MAX): Promise<string | null> {
  for (const profile of [p, trimHistory(p, MOVE_DAYS_KEEP)]) {
    const code = await encode({ app: 'tapkotyper', type: 'move', profile });
    if (prefix.length + code.length <= max) return code;
  }
  return null;
}

/** The profile of a move link, checked like an imported file. Throws `share.broken` or an import error key. */
export async function parseMove(code: string): Promise<Profile> {
  const v: any = await decode(code);
  if (v?.app !== 'tapkotyper' || v.type !== 'move') throw new Error('share.broken');
  return parseImport(JSON.stringify({ app: 'tapkotyper', profiles: [v.profile] }))[0];
}
