import type { Profile } from '../storage/schema';

/** Where a tip's second button leads: a help tab, or a screen of the app. */
export type TipLink = { help: 'ui' | 'typing' | 'progress' | 'mentoring' } | { screen: 'progress' | 'parent' };

/** One thing the teacher turtle tells about the app: when it fits, and an optional second button. */
export interface TeacherTip {
  id: string;
  /** The tip fits the player now (a task tip only with a task...). */
  fits: (p: Profile) => boolean;
  link?: TipLink;
}

/** The tips in the order they come; texts are `teacher.tips.<id>`, the button `teacher.tips.<id>Button`. */
export const TEACHER_TIPS: TeacherTip[] = [
  { id: 'hello', fits: () => true },
  { id: 'help', fits: () => true, link: { help: 'ui' } },
  { id: 'keyboard', fits: (p) => p.progress.levelsFinished >= 1, link: { help: 'ui' } },
  { id: 'progress', fits: (p) => p.progress.levelsFinished >= 2, link: { screen: 'progress' } },
  { id: 'task', fits: (p) => p.tasks.length > 0, link: { help: 'mentoring' } },
  { id: 'share', fits: (p) => p.progress.levelsFinished >= 5, link: { help: 'progress' } },
  { id: 'range', fits: (p) => p.progress.worldsDone.length >= 1, link: { help: 'progress' } },
];

/** The first tips come at most this often; after them the rest come rarely. */
const EARLY_TIPS = 4;
const EARLY_GAP_MS = 60 * 60 * 1000;
const LATE_GAP_MS = 36 * 60 * 60 * 1000;

/** The tip to show on the map now, or null: the player wants tips, one fits that was not seen, and enough time passed since the last. */
export function dueTip(p: Profile, now = Date.now()): TeacherTip | null {
  if (!p.settings.appTips) return null;
  const { seen, lastAt } = p.progress.appTips;
  const gap = seen.length < EARLY_TIPS ? EARLY_GAP_MS : LATE_GAP_MS;
  if (lastAt && now - lastAt < gap) return null;
  return TEACHER_TIPS.find((tip) => !seen.includes(tip.id) && tip.fits(p)) ?? null;
}

/** The tip was read (OK, its button or closed): it does not come again, and the next waits. */
export function tipSeen(p: Profile, id: string, now = Date.now()): void {
  if (!p.progress.appTips.seen.includes(id)) p.progress.appTips.seen.push(id);
  p.progress.appTips.lastAt = now;
}
