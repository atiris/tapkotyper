import { IDLE_STOP_S } from '../game/levels';
import { earnWardrobe } from '../game/wardrobe-time';
import { LAYOUTS } from '../keyboard/layouts';
import { type KeyStat, type Profile, type SessionRecord, emptyKeyStat } from '../storage/schema';
import { MASTERY_WINDOW, STATS_WINDOW, keyMastery, lessonOrder, median, shiftKeyOf } from './lessons';

const RECENT_KEEP = Math.max(STATS_WINDOW, MASTERY_WINDOW * 2);
export const RECENT_WRONG_KEEP = 30;
const DAYS_KEEP = 60;
/** Reaction times above this are pauses, not slowness. */
const RT_CAP = 4000;

export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Records one key press against the expected character; a capital also counts for its Shift.
 * A `repeat` (the same key as the correct press before it) is no move between keys, so its
 * time stays out of the day's reaction time.
 */
export function recordPress(profile: Profile, expected: string, typed: string, reactionMs: number, repeat = false): void {
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
    if (!ok) day.errors++;
    else if (!repeat) {
      day.rtSum += rt;
      day.rtCount++;
    }
  }
}

/**
 * Typing time one own key adds: the game-clock seconds since the previous own key (or since the
 * run started), at most `IDLE_STOP_S`, so waiting without keys counts no practice.
 */
export function typingStep(gap: number): number {
  return Math.min(IDLE_STOP_S, Math.max(0, gap));
}

/** Adds typing time and characters to today's session record, and the time to all the training and the wardrobe time. */
export function recordSession(profile: Profile, seconds: number, chars: number, errors: number, cpm: number, rhythm: number | null = null): void {
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
  earnWardrobe(profile, Math.round(seconds));
  s.chars += chars;
  s.errors += errors;
  if (cpm > 0) s.cpm = Math.round((s.cpm * prevChars + cpm * chars) / Math.max(1, prevChars + chars));
  if (rhythm !== null && chars > 0) {
    const had = s.rhythm == null ? 0 : s.rhythmChars ?? 0;
    s.rhythm = Math.round(((s.rhythm ?? 0) * had + rhythm * chars) / (had + chars));
    s.rhythmChars = had + chars;
  }
  if (sessions.length > 365) sessions.splice(0, sessions.length - 365);
}

/** Whole days from local date `from` to `to` (both `YYYY-MM-DD`). */
function daysBetween(from: string, to: string): number {
  const day = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  return Math.round((day(to) - day(from)) / 86_400_000);
}

/** When the child last trained: its local date and the days since (both null = never). */
export function lastTraining(profile: Profile, now = new Date()): { date: string | null; daysAgo: number | null } {
  const sessions = profile.stats.sessions.filter((s) => s.seconds > 0);
  const last = sessions[sessions.length - 1];
  return last ? { date: last.date, daysAgo: Math.max(0, daysBetween(last.date, localDate(now))) } : { date: null, daysAgo: null };
}

export type Ago = { key: 'agoToday' | 'agoYesterday' | 'agoLastWeek' | 'agoLastMonth' | 'agoLong' } | { key: 'agoDays' | 'agoWeeks' | 'agoMonths'; n: number };

/** How long ago in a child's words: today, yesterday, 2-6 days, last week, 2-4 weeks, last month, 2-12 months, over a year. */
export function agoOf(days: number): Ago {
  if (days <= 0) return { key: 'agoToday' };
  if (days === 1) return { key: 'agoYesterday' };
  if (days < 7) return { key: 'agoDays', n: days };
  if (days < 14) return { key: 'agoLastWeek' };
  if (days < 30) return { key: 'agoWeeks', n: Math.floor(days / 7) };
  if (days < 60) return { key: 'agoLastMonth' };
  if (days < 365) return { key: 'agoMonths', n: Math.floor(days / 30) };
  return { key: 'agoLong' };
}

/**
 * Characters typed in the last `days` local calendar days, today included, with their accuracy
 * (0..1) and characters per minute (weighted by the characters); both 0 without any.
 */
export function recentTyping(profile: Profile, days: number, now = new Date()): { chars: number; accuracy: number; cpm: number; rhythm: number | null } {
  const today = localDate(now);
  const recent = profile.stats.sessions.filter((s) => daysBetween(s.date, today) < days);
  const chars = recent.reduce((a, s) => a + s.chars, 0);
  const errors = recent.reduce((a, s) => a + s.errors, 0);
  const timed = recent.filter((s) => s.cpm > 0);
  const timedChars = timed.reduce((a, s) => a + s.chars, 0);
  const even = recent.filter((s) => s.rhythm != null && s.rhythmChars);
  const evenChars = even.reduce((a, s) => a + s.rhythmChars!, 0);
  return {
    chars,
    accuracy: chars + errors ? chars / (chars + errors) : 0,
    cpm: timedChars ? Math.round(timed.reduce((a, s) => a + s.cpm * s.chars, 0) / timedChars) : 0,
    rhythm: evenChars ? Math.round(even.reduce((a, s) => a + s.rhythm! * s.rhythmChars!, 0) / evenChars) : null,
  };
}

/** Days with an own key and the typing seconds in the last `days` local calendar days, today included. */
export function recentPractice(profile: Profile, days: number, now = new Date()): { days: number; seconds: number } {
  const today = localDate(now);
  const recent = profile.stats.sessions.filter((s) => daysBetween(s.date, today) < days);
  const trained = new Set(recent.filter((s) => s.chars + s.errors > 0).map((s) => s.date));
  return { days: trained.size, seconds: recent.reduce((a, s) => a + s.seconds, 0) };
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

export interface KeyboardSummary {
  /** Keys of the lesson order with presses in their window. */
  keys: number;
  /** Mean accuracy of those keys, 0 without any. */
  accuracy: number;
  /** Median speed of their right presses in letters per minute, 0 without any. */
  cpm: number;
}

/** The whole keyboard by the keys' windows: their mean accuracy and the median speed of their right presses. */
export function keyboardSummary(profile: Profile): KeyboardSummary {
  const keys = lessonOrder(profile.layout);
  const reports = keys.flatMap((k) => keyReport(profile, k) ?? []);
  const rts = keys.flatMap((k) => (profile.stats.keys[k]?.recent.slice(-STATS_WINDOW) ?? []).filter((v) => v > 0));
  return {
    keys: reports.length,
    accuracy: reports.length ? reports.reduce((s, r) => s + r.accuracy, 0) / reports.length : 0,
    cpm: rts.length ? Math.round(60_000 / median(rts)) : 0,
  };
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

export interface MasterySummary {
  mastered: number;
  /** Keys of the layout's lessons. */
  total: number;
  /** Median characters per minute of the mastered keys; 0 without any. */
  cpm: number;
}

/** How many of the layout's keys the child can type well, over the long term. */
export function masterySummary(profile: Profile): MasterySummary {
  const keys = lessonOrder(profile.layout);
  const found = keys.flatMap((k) => keyMastery(profile, k) ?? []);
  const cpm = found.length ? Math.round(60_000 / median(found.map((m) => m.medianMs))) : 0;
  return { mastered: found.length, total: keys.length, cpm };
}
