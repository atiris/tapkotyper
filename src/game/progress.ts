import { advanceLesson } from '../learning/lessons';
import type { CompanionKind, Profile } from '../storage/schema';
import { type LevelDef, starsFor } from './levels';
import { type BadgeTier, badgeTier, grantAccessories, grantCompanions } from './rewards';
import type { Style } from './typing';

export interface LevelResult {
  stars: number;
  accuracy: number;
  chars: number;
  errors: number;
  cpm: number;
  seconds: number;
  newKeys: string[];
  newAccessories: string[];
  newCompanions: CompanionKind[];
  /** The world finished with this level (super-obstacle), else null. */
  worldDone: number | null;
  /** Rhythm compared with the sessions of a week ago, as a ratio (null = no data). */
  trend: number | null;
  /** An automatic step up earned with this level (a new medal), else null. */
  growth: GrowthStep | null;
  /** The child typed too few keys; the paw did most of the level. */
  byTapko: boolean;
  /** The world's badge, when this level earned it (`upgrade` false) or made it better. */
  badge: { world: number; tier: BadgeTier; upgrade: boolean } | null;
  /** A dictation or memory run: targets the child typed without the target shown again, of all. */
  byStyle?: { style: Exclude<Style, 'copy'>; clean: number; total: number };
}

/** What the runtime measured in one run. */
export type RunStats = Pick<LevelResult, 'accuracy' | 'chars' | 'errors' | 'cpm' | 'seconds' | 'byStyle'>;

export interface GrowthStep {
  kind: 'difficulty' | 'wordLen';
  /** New difficulty, or the new longest word. */
  value: number;
  /** Medal number (1 = first step). */
  medal: number;
}

/** Automatic steps stop here; higher values stay a parent's choice. */
export const AUTO_DIFFICULTY_MAX = 8;
export const AUTO_WORD_MAX = 9;
/** Accuracy a level needs for its time to count toward the next step. */
const GROWTH_ACCURACY = 0.9;
/** Share of a level's targets the child typed (not let pass) for its time to count. */
export const GROWTH_TYPED_SHARE = 0.85;
/** Fewer keys of the child's own in a story level: the paw did most of it. */
export const MIN_OWN_KEYS = 5;

/** Seconds of good play for the next step: 4 minutes, then one more for each step. */
export function growthNeed(step: number): number {
  return 240 + step * 60;
}

/**
 * Automatic difficulty and word length: good play time (accurate, and few targets let
 * pass) collects, and when there is enough, one setting goes up by one step (they take turns).
 */
export function grow(p: Profile, seconds: number, accuracy: number, typedShare: number): GrowthStep | null {
  const s = p.settings;
  const options: GrowthStep['kind'][] = [];
  if (s.autoDifficulty && s.difficulty < AUTO_DIFFICULTY_MAX) options.push('difficulty');
  if (s.autoWordLen && s.wordLen[1] < AUTO_WORD_MAX) options.push('wordLen');
  if (!options.length || accuracy < GROWTH_ACCURACY || typedShare < GROWTH_TYPED_SHARE) return null;
  p.progress.growthSeconds += Math.round(seconds);
  if (p.progress.growthSeconds < growthNeed(p.progress.growth)) return null;
  const kind = options[p.progress.growth % options.length];
  p.progress.growthSeconds = 0;
  p.progress.growth++;
  let value: number;
  if (kind === 'difficulty') value = ++s.difficulty;
  else {
    value = s.wordLen[1] + 1;
    // The shortest words grow slowly too, so long words really appear.
    s.wordLen = [Math.max(s.wordLen[0], Math.min(4, value - 4)), value];
  }
  return { kind, value, medal: p.progress.growth };
}

/**
 * Applies a finished level to the profile. Unlocks keys, worlds and accessories.
 * `typedShare`: targets the child typed / targets typed or let pass.
 */
export function completeLevel(p: Profile, def: LevelDef, r: RunStats, typedShare: number): LevelResult {
  // Accuracy of a handful of keys says nothing; such a level earns one star and no growth time.
  const byTapko = def.kind !== 'practice' && r.chars + r.errors < MIN_OWN_KEYS;
  const stars = byTapko ? 1 : starsFor(r.accuracy);
  let worldDone: number | null = null;
  let badge: LevelResult['badge'] = null;
  if (def.kind !== 'practice') {
    p.progress.levelsFinished++;
    p.progress.starsEarned += stars;
  }
  if (def.index >= 0 && def.kind !== 'practice') {
    const before = badgeTier(p, def.world);
    p.progress.levels[def.id] = Math.max(p.progress.levels[def.id] ?? 0, stars);
    if (def.isSuper && !p.progress.worldsDone.includes(def.world)) {
      p.progress.worldsDone.push(def.world);
      worldDone = def.world;
    }
    const tier = badgeTier(p, def.world);
    if (tier && tier !== before) badge = { world: def.world, tier, upgrade: before !== null };
  }
  const newKeys = advanceLesson(p);
  const newAccessories = grantAccessories(p);
  const newCompanions = grantCompanions(p);
  const growth = byTapko ? null : grow(p, r.seconds, r.accuracy, typedShare);
  return { ...r, stars, newKeys, newAccessories, newCompanions, worldDone, trend: rhythmTrend(p), growth, byTapko, badge };
}

/** Current rhythm vs. a week ago (only positive framing is shown). */
export function rhythmTrend(p: Profile): number | null {
  const s = p.stats.sessions;
  if (s.length < 2) return null;
  const now = s[s.length - 1];
  const weekAgo = new Date(now.date);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const old = s.filter((x) => new Date(x.date) <= weekAgo && x.cpm > 0);
  const ref = old.length ? old[old.length - 1] : s[0] !== now && s[0].cpm > 0 ? s[0] : null;
  if (!ref || !now.cpm) return null;
  return now.cpm / ref.cpm;
}


/**
 * The end of staying a while in a level or of the target range: like a practice, the lesson may
 * advance and good play counts toward growth, but the run gives no stars, rewards or level result.
 */
export function completeStay(p: Profile, r: RunStats, typedShare: number): LevelResult {
  const newKeys = advanceLesson(p);
  const growth = grow(p, r.seconds, r.accuracy, typedShare);
  return { ...r, stars: 0, newKeys, newAccessories: [], newCompanions: [], worldDone: null, trend: rhythmTrend(p), growth, byTapko: false, badge: null };
}
