/** Counting the days of use before the install offer. */

/** The offer waits until the game was opened on this many different days. */
export const OFFER_DAYS = 3;

export interface InstallState {
  /** Distinct local dates (YYYY-MM-DD) of visits, the first ones only. */
  days: string[];
  offered: boolean;
}

/** A local date as YYYY-MM-DD. */
export function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The stored state; an old `{ firstSeen, offered }` counts its first visit as one day. */
export function readInstall(raw: string | null): InstallState {
  try {
    const v = JSON.parse(raw ?? 'null');
    if (Array.isArray(v?.days)) return { days: v.days.filter((x: unknown) => typeof x === 'string').slice(0, OFFER_DAYS), offered: !!v.offered };
    if (typeof v?.firstSeen === 'number') return { days: [localDay(new Date(v.firstSeen))], offered: !!v.offered };
  } catch { /* broken value: start over */ }
  return { days: [], offered: false };
}

/** The state with `today` counted; at most `OFFER_DAYS` days are kept. */
export function withVisit(state: InstallState, today: string): InstallState {
  if (state.days.includes(today) || state.days.length >= OFFER_DAYS) return state;
  return { ...state, days: [...state.days, today] };
}
