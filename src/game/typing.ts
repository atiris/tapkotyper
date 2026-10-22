/** Pure typing state of a level: targets with words, lock-on, letter fill and the style of the run. */

/** How a run shows its targets: copied from the label, heard (dictation), remembered, or heard and remembered in turns (mixed). */
export type Style = 'copy' | 'dictation' | 'memory' | 'mixed';
/** How one target is shown. */
export type TargetStyle = Exclude<Style, 'mixed'>;

/** Seconds a memory target shows before its letters hide; shorter at a higher difficulty. */
export function memoryShow(length: number, difficulty: number): number {
  return Math.max(0.8 + 0.15 * length, (1.2 + 0.25 * length) * (1.15 - difficulty * 0.05));
}

/** Seconds a memory target shows again after a wrong key. */
export function memoryFlash(length: number): number {
  return 0.8 + 0.1 * length;
}

export interface Target {
  id: number;
  word: string;
  typed: number;
  done: boolean;
  /** Left the scene without being typed (passed by, helped by Tapko). */
  gone: boolean;
  /** Can be locked on (e.g. not hidden behind a web). */
  selectable: boolean;
  /** Higher = closer to the player; picked first when several targets share a first letter. */
  urgency: number;
  /** Seconds left of the wrong-letter wobble. */
  wobble: number;
  /** Errors made on this target. */
  errors: number;
  /** How it is shown: the run's style, in a mixed run dictation and memory in turns. */
  style: TargetStyle;
  /** Letters not typed yet are dots (dictation, memory once hidden). */
  masked: boolean;
  /** Memory: seconds the whole target still shows (keys wait), and how long this showing lasts. */
  showLeft: number;
  showFor: number;
  /** A wrong key or Tapko's paws showed the hidden target again. */
  revealed: boolean;
  /** Free data for the level mode (sprite, position...). */
  data: any;
}

export type TypeResult =
  | { kind: 'ok'; target: Target; expected: string }
  | { kind: 'done'; target: Target; expected: string }
  | { kind: 'wrong'; target: Target | null; expected: string | null }
  /** Memory: a key while the target shows; it is not counted. */
  | { kind: 'ignored' };

export class TypingCore {
  targets: Target[] = [];
  locked: Target | null = null;
  /** Targets that left the scene untyped (passed by the child). */
  missed = 0;
  /** The style of the run and the difficulty that sets how long memory targets show. */
  style: Style = 'copy';
  difficulty = 5;
  private nextId = 1;

  add(word: string, data: any = {}, selectable = true): Target {
    const id = this.nextId++;
    const style: TargetStyle = this.style === 'mixed' ? (id % 2 ? 'dictation' : 'memory') : this.style;
    const t: Target = {
      id, word, typed: 0, done: false, gone: false, selectable, urgency: 0, wobble: 0, errors: 0, style,
      masked: style !== 'copy', showLeft: 0, showFor: 0, revealed: false, data,
    };
    this.targets.push(t);
    return t;
  }

  get active(): Target[] {
    return this.targets.filter((t) => !t.done && !t.gone);
  }

  /** The target that will receive the next correct key. */
  focus(): Target | null {
    if (this.locked) return this.locked;
    const list = this.active.filter((t) => t.selectable);
    if (!list.length) return null;
    return list.reduce((a, b) => (b.urgency > a.urgency ? b : a));
  }

  /** The character the child should type next. */
  expectedChar(): string | null {
    const f = this.focus();
    return f ? f.word[f.typed] : null;
  }

  /** The next character when the child can see it (for the finger guide): a hidden target keeps it secret. */
  shownChar(): string | null {
    const f = this.focus();
    return f && this.letters(f) ? f.word[f.typed] : null;
  }

  /** The target's letters are drawn (not dots). */
  letters(t: Target): boolean {
    return !t.masked || t.showLeft > 0;
  }

  /** Keys reach the target: a memory target waits until it has shown and hidden. */
  typable(t: Target): boolean {
    return t.selectable && (t.style !== 'memory' || !t.masked || (t.showFor > 0 && t.showLeft <= 0));
  }

  /** Shows a hidden target for good (Tapko's paws type it). */
  reveal(t: Target): void {
    t.masked = false;
    t.showLeft = 0;
    t.revealed = true;
  }

  /** Lets a target leave without being typed; `missed` = false when the child chose another one. */
  release(t: Target, missed = true): void {
    t.gone = true;
    if (missed) this.missed++;
    if (this.locked === t) this.locked = null;
  }

  /** Removes finished and gone targets from the list. */
  prune(keep: (t: Target) => boolean = () => false): void {
    this.targets = this.targets.filter((t) => (!t.done && !t.gone) || keep(t));
  }

  type(ch: string): TypeResult {
    if (this.locked) {
      const t = this.locked;
      if (!this.typable(t)) return { kind: 'ignored' };
      const expected = t.word[t.typed];
      if (ch !== expected) {
        this.miss(t);
        return { kind: 'wrong', target: t, expected };
      }
      return this.advance(t, expected);
    }
    const candidates = this.active.filter((t) => this.typable(t) && t.word[0] === ch);
    if (!candidates.length) {
      // A key while a memory target shows waits for it, it is no mistake.
      if (this.active.some((t) => t.selectable && !this.typable(t))) return { kind: 'ignored' };
      const f = this.focus();
      if (f) this.miss(f);
      return { kind: 'wrong', target: f, expected: f ? f.word[0] : null };
    }
    const t = candidates.reduce((a, b) => (b.urgency > a.urgency ? b : a));
    this.locked = t;
    return this.advance(t, ch);
  }

  /** A wrong key: the wobble, and a hidden target shows itself (dictation for good, memory for a flash). */
  private miss(t: Target): void {
    t.wobble = 0.35;
    t.errors++;
    if (!t.masked) return;
    t.revealed = true;
    if (t.style === 'memory') t.showLeft = t.showFor = memoryFlash(t.word.length);
    else t.masked = false;
  }

  private advance(t: Target, expected: string): TypeResult {
    t.typed++;
    if (t.typed >= t.word.length) {
      t.done = true;
      this.locked = null;
      return { kind: 'done', target: t, expected };
    }
    return { kind: 'ok', target: t, expected };
  }

  update(dt: number): void {
    for (const t of this.targets) {
      if (t.wobble > 0) t.wobble = Math.max(0, t.wobble - dt);
      if (t.style !== 'memory' || !t.selectable || t.done || t.gone) continue;
      // A memory target shows from the moment it can be seen.
      if (t.showFor === 0 && t.masked) t.showLeft = t.showFor = memoryShow(t.word.length, this.difficulty);
      else if (t.showLeft > 0) t.showLeft = Math.max(0, t.showLeft - dt);
    }
  }
}
