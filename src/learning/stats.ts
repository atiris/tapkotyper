import { LAYOUTS } from '../keyboard/layouts';
import { type KeyStat, type Profile, type SessionRecord, emptyKeyStat } from '../storage/schema';
import { MASTERY_WINDOW, lessonOrder, median, reactionLimit, shiftKeyOf } from './lessons';

const RECENT_KEEP = MASTERY_WINDOW * 2;
export const RECENT_WRONG_KEEP = 30;
const DAYS_KEEP = 60;
/** Key statistics look at the last presses only, so old habits stop counting. */
export const STATS_WINDOW = 50;
/** Reaction times above this are pauses, not slowness. */
const RT_CAP = 4000;

export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Records one key press against the expected character; a capital also counts for its Shift. */
export function recordPress(profile: Profile, expected: string, typed: string, reactionMs: number): void {
  const shift = shiftKeyOf(LAYOUTS[profile.layout], expected);
  const keys = shift ? [expected.toLowerCase(), shift] : [expected];
  const ok = typed === expected;
  const rt = Math.max(1, Math.min(RT_CAP, Math.round(reactionMs)));
  const date = localDate();
  for (const key of keys) {
    const s = (profile.stats.keys[key] ??= emptyKeyStat());
    s.presses++;
    if (!ok) {
      s.errors++;
      s.recentWrong.push(typed);
      if (s.recentWrong.length > RECENT_WRONG_KEEP) s.recentWrong.splice(0, s.recentWrong.length - RECENT_WRONG_KEEP);
    }
    s.recent.push(ok ? rt : 0);
    if (s.recent.length > RECENT_KEEP) s.recent.splice(0, s.recent.length - RECENT_KEEP);
    let day = s.days[s.days.length - 1];
    if (!day || day.date !== date) {
      day = { date, presses: 0, errors: 0, rtSum: 0, rtCount: 0 };
      s.days.push(day);
      if (s.days.length > DAYS_KEEP) s.days.splice(0, s.days.length - DAYS_KEEP);
    }
    day.presses++;
    if (ok) {
      day.rtSum += rt;
      day.rtCount++;
    } else day.errors++;
  }
}

/** Adds play time and characters to today's session record, and the time to all the training. */
export function recordSession(profile: Profile, seconds: number, chars: number, errors: number, cpm: number): void {
  const date = localDate();
  const sessions = profile.stats.sessions;
  let s: SessionRecord | undefined = sessions[sessions.length - 1];
  if (!s || s.date !== date) {
    s = { date, seconds: 0, chars: 0, errors: 0, cpm: 0 };
    sessions.push(s);
  }
  const prevChars = s.chars;
  s.seconds += Math.round(seconds);
  profile.progress.trainedSeconds += Math.round(seconds);
  s.chars += chars;
  s.errors += errors;
  if (cpm > 0) s.cpm = Math.round((s.cpm * prevChars + cpm * chars) / Math.max(1, prevChars + chars));
  if (sessions.length > 365) sessions.splice(0, sessions.length - 365);
}

/** Whole days from local date `from` to `to` (both `YYYY-MM-DD`). */
function daysBetween(from: string, to: string): number {
  const day = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  return Math.round((day(to) - day(from)) / 86_400_000);
}

/** When the child last trained (days ago, null = never) and the minutes of the last 7 days. */
export function lastTraining(profile: Profile, now = new Date()): { daysAgo: number | null; weekMinutes: number } {
  const today = localDate(now);
  const sessions = profile.stats.sessions.filter((s) => s.seconds > 0);
  const last = sessions[sessions.length - 1];
  const week = sessions.filter((s) => daysBetween(s.date, today) < 7).reduce((a, s) => a + s.seconds, 0);
  return { daysAgo: last ? Math.max(0, daysBetween(last.date, today)) : null, weekMinutes: Math.round(week / 60) };
}

export interface KeyReport {
  key: string;
  /** All presses ever. */
  presses: number;
  /** Presses the report is based on (the last STATS_WINDOW). */
  window: number;
  accuracy: number;
  /** Typical reaction time of correct presses (median), 0 without data. */
  avgMs: number;
  /** Keys typed instead of this one lately, most frequent first. */
  confusions: { ch: string; n: number }[];
  /** 0..1 how well it goes; higher is better. */
  score: number;
}

export function keyReport(profile: Profile, key: string): KeyReport | null {
  const s: KeyStat | undefined = profile.stats.keys[key];
  if (!s || !s.recent.length) return null;
  const win = s.recent.slice(-STATS_WINDOW);
  const ok = win.filter((v) => v > 0);
  const accuracy = ok.length / win.length;
  const avgMs = ok.length ? median(ok) : 0;
  const counts = new Map<string, number>();
  for (const ch of s.recentWrong) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  const confusions = [...counts].map(([ch, n]) => ({ ch, n })).sort((a, b) => b.n - a.n);
  const speed = avgMs ? Math.max(0, Math.min(1, (2000 - avgMs) / 1400)) : 0.5;
  return { key, presses: s.presses, window: win.length, accuracy, avgMs, confusions, score: accuracy * 0.75 + speed * 0.25 };
}

/** Keys that need practice most, worst first (only keys with enough data). */
export function weakKeys(profile: Profile, keys: string[], count = 3): KeyReport[] {
  return keys
    .map((k) => keyReport(profile, k))
    .filter((r): r is KeyReport => !!r && r.window >= 5)
    .sort((a, b) => a.score - b.score)
    .slice(0, count);
}

/** Weight of each key for word picking: weak and slow keys appear more often. */
export function keyWeights(profile: Profile, keys: string[]): Record<string, number> {
  const w: Record<string, number> = {};
  for (const k of keys) {
    const r = keyReport(profile, k);
    w[k] = r ? 1 + (1 - r.score) * 3 : 1.5;
  }
  return w;
}

export interface KeyDayPoint {
  date: string;
  accuracy: number;
  /** Average reaction time of correct presses that day, 0 without data. */
  avgMs: number;
  presses: number;
}

/** Day by day accuracy and speed of a key, oldest first. */
export function keyHistory(profile: Profile, key: string): KeyDayPoint[] {
  return (profile.stats.keys[key]?.days ?? []).map((d) => ({
    date: d.date,
    accuracy: d.presses ? (d.presses - d.errors) / d.presses : 0,
    avgMs: d.rtCount ? d.rtSum / d.rtCount : 0,
    presses: d.presses,
  }));
}

/** Presses the long-term "mastered" verdict of a key looks at. */
export const MASTERED_WINDOW = 30;
/** Share of the last presses that must be right. */
export const MASTERED_ACCURACY = 0.9;

export interface KeyMastery {
  /** Accuracy and median reaction time (ms) of the last MASTERED_WINDOW presses. */
  accuracy: number;
  medianMs: number;
}

/**
 * A key is mastered when, over its last 30 recorded presses, accuracy is at least 90 %
 * and the median reaction time is within the target of the child's difficulty
 * (the same speed limit that readies a key for the next lesson). Null while it is not.
 */
export function keyMastery(profile: Profile, key: string): KeyMastery | null {
  const recent = profile.stats.keys[key]?.recent;
  if (!recent || recent.length < MASTERED_WINDOW) return null;
  const win = recent.slice(-MASTERED_WINDOW);
  const ok = win.filter((v) => v > 0);
  const accuracy = ok.length / win.length;
  const medianMs = ok.length ? median(ok) : Infinity;
  if (accuracy < MASTERED_ACCURACY || medianMs > reactionLimit(profile.settings.difficulty)) return null;
  return { accuracy, medianMs };
}

export interface MasterySummary {
  mastered: number;
  /** Keys of the layout's lessons. */
  total: number;
  /** Average accuracy (0..1) and median characters per minute of the mastered keys; 0 without any. */
  accuracy: number;
  cpm: number;
}

/** How many of the layout's keys the child can type well, over the long term. */
export function masterySummary(profile: Profile): MasterySummary {
  const keys = lessonOrder(profile.layout);
  const found = keys.flatMap((k) => keyMastery(profile, k) ?? []);
  const accuracy = found.length ? found.reduce((a, m) => a + m.accuracy, 0) / found.length : 0;
  const cpm = found.length ? Math.round(60_000 / median(found.map((m) => m.medianMs))) : 0;
  return { mastered: found.length, total: keys.length, accuracy, cpm };
}
