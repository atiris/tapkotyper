import { type Profile, SUPER_ID } from '../storage/schema';

/** Wardrobe time earned per second of training. */
export const WARDROBE_SHARE = 1 / 5;
/** The balance never grows above 7 minutes. */
export const WARDROBE_MAX = 420;
/** The wardrobe opens only with at least a minute on the balance. */
export const WARDROBE_MIN_OPEN = 60;

/** Adds the wardrobe time that `seconds` of training earn; earned also while the limit is off. */
export function earnWardrobe(p: Profile, seconds: number): void {
  p.progress.wardrobeSeconds = Math.min(WARDROBE_MAX, p.progress.wardrobeSeconds + Math.max(0, seconds) * WARDROBE_SHARE);
}

/** The wardrobe's time runs out for this player: the parent left the limit on and it is not the super player. */
export function wardrobeLimited(p: Profile): boolean {
  return p.settings.wardrobeLimit && p.id !== SUPER_ID;
}

/** On entering the wardrobe: too little time on the balance to open it. */
export function wardrobeLocked(p: Profile): boolean {
  return wardrobeLimited(p) && p.progress.wardrobeSeconds < WARDROBE_MIN_OPEN;
}

/** Takes `seconds` off the balance, never below 0. */
export function spendWardrobe(p: Profile, seconds: number): void {
  p.progress.wardrobeSeconds = Math.max(0, p.progress.wardrobeSeconds - seconds);
}

/** What the countdown shows: a smile while more than 90 s are left, then 9..1, one less every 10 s. */
export function countdownFace(left: number): 'smile' | number {
  return left > 90 ? 'smile' : Math.max(1, Math.ceil(left / 10));
}

/** Whole minutes of training still needed before the wardrobe opens. */
export function practiceToOpen(p: Profile): number {
  const missing = WARDROBE_MIN_OPEN - p.progress.wardrobeSeconds;
  return missing > 0 ? Math.ceil(missing / WARDROBE_SHARE / 60) : 0;
}
