import { app } from '../../app/app';
import { fast } from '../../app/fast';
import { fontFamily, type G, wordBox } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import { LAYOUTS } from '../../keyboard/layouts';
import { PLACEMENT_SECONDS, PlacementCheck, contrastPairs } from '../../learning/placement';
import type { WordSource } from '../../words/words';
import { copyTarget } from '../levels';
import { type Drift, Mode } from '../mode';
import type { LevelRuntime } from '../runtime';
import { wordSource } from '../runtime/options';
import type { Target } from '../typing';
import { PANEL_Y, SIZE, copyPanel, text } from './copy-loop';

/** Targets tried for each one shown: the one with the most contrast pairs (near on one finger counts double) is typed. */
const CANDIDATES = 5;
/** Seconds the end line shows before the check ends. */
const END_TIME = 1.5;
const ACCENT = '#2fa596';
const INK = '#3d3355';

/**
 * The placement check: one target at a time on a calm panel, no time pressure. Stage after stage
 * along the lesson order (`PlacementCheck`), its words from the keys passed so far and its new keys,
 * the new ones in focus, picked to hold the pairs the touch-typing signal compares; it ends after three
 * stages in a row without a passed key, at the end of the order or after about four minutes of typing.
 */
export class PlacementMode extends Mode {
  readonly world = 'meadow';
  readonly drift: Drift = { layer: 'near', speed: 6 };
  readonly phraseWords: number;
  readonly phraseMin: number;
  readonly check: PlacementCheck;
  private source: WordSource;
  private sourceStage = 0;
  private current: Target | null = null;
  private endT: number | null = null;

  constructor(L: LevelRuntime) {
    super(L);
    const p = app.profile!;
    this.check = new PlacementCheck(p.layout, p.settings.noDiacritics, L.difficulty);
    const size = copyTarget(2, false);
    this.phraseWords = size.words;
    this.phraseMin = size.min;
    this.source = this.stageSource();
  }

  startLine(): string {
    return t('level.placementStart');
  }

  start(): void {
    this.next();
  }

  /** The words of the current stage. */
  private stageSource(): WordSource {
    const p = app.profile!, stage = this.check.current;
    this.sourceStage = this.check.stage;
    return wordSource(p, p.settings.wordLang, undefined, stage.keys, stage.group);
  }

  private next(): void {
    if (this.sourceStage !== this.check.stage) this.source = this.stageSource();
    const lay = LAYOUTS[app.profile!.layout];
    const score = (w: string) => {
      const n = contrastPairs(lay, w);
      return 2 * n.near + n.far;
    };
    const tries = Array.from({ length: CANDIDATES }, () => this.source.next(new Set(), undefined, this.phraseWords, this.phraseMin));
    this.current = this.L.core.add(tries.reduce((a, b) => (score(b) > score(a) ? b : a)), {});
  }

  onKey(expected: string, ok: boolean, rt: number, at: number): void {
    const tg = this.current;
    if (tg) this.check.press({ ch: expected, ok, rt, at, target: tg.id, pos: ok ? tg.typed - 1 : tg.typed });
  }

  onDone(tg: Target): void {
    if (tg !== this.current) return;
    this.L.sfx('pop');
    this.L.core.prune();
    this.current = null;
    if (this.check.targetDone() && this.t >= fast(PLACEMENT_SECONDS)) this.check.stop();
    if (!this.check.end) return this.next();
    this.endT = 0;
    this.L.sfx('cheer');
  }

  update(dt: number): void {
    if (this.endT !== null) this.endT += dt;
  }

  render(g: G): void {
    const cx = this.L.vw / 2;
    const end = this.endT === null ? null : t('level.placementDone');
    g.save();
    g.font = `700 40px ${fontFamily()}`;
    const need = this.current ? wordBox(g, this.current.word, SIZE).w : g.measureText(end ?? '').width;
    g.restore();
    copyPanel(g, this.L.vw, need, ACCENT);
    if (this.current) this.L.label(g, this.current, cx, PANEL_Y, SIZE);
    if (end) text(g, end, cx, PANEL_Y, 40, 700, INK, Math.min(1, (this.endT ?? 0) / 0.4));
  }

  progress(): number {
    return this.check.progress;
  }

  get finished(): boolean {
    return (this.endT ?? 0) > END_TIME;
  }
}
