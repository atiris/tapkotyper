import { app } from '../../app/app';
import { tList } from '../../i18n/i18n';
import { LAYOUTS } from '../../keyboard/layouts';
import { SHIFT_L, SHIFT_R, activeKeys, isLetterKey, masteryLevel, newestGroup } from '../../learning/lessons';
import { keyWeights } from '../../learning/stats';
import type { LangRef, Profile } from '../../storage/schema';
import { OWN_SHARE, WordSource, type WordSourceOwn } from '../../words/words';
import type { FreeTyped } from '../modes/freetype';
import type { JourneyRun, LevelResult } from '../progress';
import type { Style } from '../typing';

/**
 * The targets of a profile: its active keys (or a drill's, or the keys chosen for free practice),
 * weak keys more often, the newest group in focus (or the target range's weak keys), and the
 * parent's own words and text mixed in (not in drills, chosen keys or the target range, their
 * words would bring other letters), or a task's.
 */
export function wordSource(p: Profile, lang: LangRef, drill?: string[], own?: WordSourceOwn, chosen?: string[], focus?: string[], hard = false): WordSource {
  // Practice of space, punctuation or a Shift needs letters around it: the known ones.
  const keys = chosen ?? (!drill ? activeKeys(p) : drill.every(isLetterKey) ? drill : [...new Set([...activeKeys(p), ...drill])]);
  const s = p.settings;
  return new WordSource(app.words[lang], {
    keys,
    len: hard ? [s.wordLen[0] + 1, s.wordLen[1] + 1] : s.wordLen,
    noDiacritics: s.noDiacritics,
    weights: keyWeights(p, keys),
    focus: drill ?? (focus ?? newestGroup(p)).filter((k) => keys.includes(k)),
    layout: LAYOUTS[p.layout],
    names: tList('names'),
    shiftMastery: Object.fromEntries([SHIFT_L, SHIFT_R].map((k) => [k, masteryLevel(p.stats.keys[k], s.difficulty)])),
    lang,
    own: drill || chosen || focus ? undefined : own ?? { words: s.ownWords, text: s.ownText, share: OWN_SHARE[s.ownMix] },
  });
}

export interface RuntimeOptions {
  /** Practice: only these keys (drills), else the profile's active keys. */
  keys?: string[];
  /** Free practice: words only from these keys, chosen in the key picker. */
  chosen?: string[];
  /** Practice length in seconds; null = until the child stops. */
  seconds?: number | null;
  /** Own words and text instead of the parent's (a task's). */
  own?: WordSourceOwn;
  /** Free practice: the style chosen in the key picker. */
  style?: Style;
  /** Staying a while: the level runs without an end until the child ends it on the pause card, for no stars. */
  stay?: boolean;
  /** Staying a while in a story level with the next one open: the pause card's first button goes on to it. */
  next?: () => void;
  onFinish(result: LevelResult | null): void;
  onExit(): void;
  /** Free typing left after something was typed: its end card. */
  onFreeDone(typed: FreeTyped): void;
  /** A click on Tapko during play (the level pauses first). */
  onTapko(): void;
  /** The help page over the paused or ended level, with what this level asks (`now`); `back` returns to the paused level. */
  onHelp(back: () => void, now: HTMLElement[]): void;
  /** The map's warm-up over the paused level: `back` returns to the pause card, `play` goes on typing. */
  onBreak(back: () => void, play: () => void): void;
  /** The player switched the keyboard layout under the on-screen keyboard: the level starts again with it. */
  onLayout(): void;
  /** A hero's journey part: the journey's parts so far, this one is added at its end. */
  journey?: JourneyRun;
  /** A hero's journey part that is not the last one ended: the next part comes. */
  onPart?(): void;
}
