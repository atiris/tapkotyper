export interface TypedChar {
  ch: string;
  code: string;
  shift: boolean;
  /** Which Shift is held (`ShiftLeft` / `ShiftRight`), null without Shift. */
  shiftCode: string | null;
  /** When the key went down, on the clock of `performance.now()`. */
  time: number;
  /** When the stroke began, if a combo's first press (the Shift, the dead key) came before the letter. */
  start?: number;
}

export interface InputHandlers {
  onChar?(c: TypedChar): void;
  /** A dead key (accent mark) was pressed; the next char is composed by the browser. */
  onDead?(code: string, shift: boolean): void;
  onEscape?(): void;
  /** True when the level used Enter, so a focused button does not take it too. */
  onEnter?(): boolean;
  onBackspace?(): void;
  /** Raw key events, for the layout mismatch detector. */
  onRaw?(code: string, key: string, shift: boolean): void;
  /** True while the keys belong to buttons (a pause, a dialog): only Escape reaches the level then. */
  idle?(): boolean;
  /** The keys held down (by `code`) changed. */
  onHold?(held: ReadonlySet<string>): void;
  /** True for a key the run asks to hold: its press is no typed character. */
  holds?(code: string): boolean;
}

const IGNORED = new Set(['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'CapsLock', 'Tab', 'NumLock', 'ScrollLock', 'ContextMenu', 'OS']);

/**
 * The one keydown listener of a level. Produces typed characters with zero
 * processing delay; dead keys are reported as a step and the browser's composed
 * character arrives with the next keydown.
 */
export class KeyInput {
  private handler = (e: KeyboardEvent) => this.handle(e);
  private release = (e: KeyboardEvent) => {
    if (e.key === 'Shift') this.shiftCode = null;
    if (this.held.delete(e.code)) this.handlers.onHold?.(this.held);
  };
  /** A keyup may never come once the window loses focus or the page hides: nothing counts as held then. */
  private letGo = () => {
    if (!this.held.size) return;
    this.held.clear();
    this.handlers.onHold?.(this.held);
  };
  private onVisibility = () => { if (document.hidden) this.letGo(); };
  private pendingDead: string | null = null;
  private shiftCode: string | null = null;
  /** When the Shift and the dead key went down, and the last typed character. */
  private shiftAt = 0;
  private deadAt = 0;
  private charAt = 0;
  /** Keys held down now, by `code`. */
  readonly held = new Set<string>();

  constructor(private target: EventTarget, private handlers: InputHandlers) {
    target.addEventListener('keydown', this.handler as EventListener);
    target.addEventListener('keyup', this.release as EventListener);
    target.addEventListener('blur', this.letGo);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisibility);
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.handler as EventListener);
    this.target.removeEventListener('keyup', this.release as EventListener);
    this.target.removeEventListener('blur', this.letGo);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisibility);
  }

  get deadPending(): boolean {
    return this.pendingDead !== null;
  }

  handle(e: KeyboardEvent): void {
    // A repeat counts too: the key went down before this listener came (on the card before play).
    if (e.code && !this.held.has(e.code)) {
      this.held.add(e.code);
      this.handlers.onHold?.(this.held);
    }
    if (e.isComposing) return;
    const key = e.key;
    if (key === 'Escape') {
      e.preventDefault();
      this.handlers.onEscape?.();
      return;
    }
    // A key the run asks to hold is no typed character: no miss, no press, no sound.
    if (this.handlers.holds?.(e.code)) {
      e.preventDefault();
      return;
    }
    if (this.handlers.idle?.()) return;
    if (key === 'Enter') {
      // A held Enter (from the card before) is not a new press.
      if (!e.repeat && this.handlers.onEnter?.()) e.preventDefault();
      return;
    }
    if (key === 'Shift' && !e.repeat) {
      this.shiftCode = e.code;
      this.shiftAt = pressTime(e);
    }
    if (e.repeat || IGNORED.has(key)) return;
    // Shortcuts like Ctrl+R stay with the browser; AltGr (Ctrl+Alt) still types characters.
    if ((e.ctrlKey || e.metaKey) && !(e.ctrlKey && e.altKey)) return;
    if (key === 'Backspace') {
      e.preventDefault();
      this.handlers.onBackspace?.();
      return;
    }
    if (key === 'Dead') {
      e.preventDefault();
      if (this.pendingDead === null) this.deadAt = pressTime(e);
      this.pendingDead = e.code;
      this.handlers.onDead?.(e.code, e.shiftKey);
      return;
    }
    this.handlers.onRaw?.(e.code, key, e.shiftKey);
    // Unicode-aware length: one code point is one typed character.
    if ([...key].length !== 1) return;
    e.preventDefault();
    const time = pressTime(e);
    // A combo's stroke begins with its first press after the character before it.
    const start = Math.min(time, this.pendingDead !== null ? this.deadAt : time, e.shiftKey && this.shiftAt > this.charAt ? this.shiftAt : time);
    this.pendingDead = null;
    this.charAt = time;
    this.handlers.onChar?.({ ch: key.normalize('NFC'), code: e.code, shift: e.shiftKey, shiftCode: e.shiftKey ? this.shiftCode : null, time, start });
  }
}

/** When the key went down: the event's own time (the press itself, not when the handler ran), unless a browser gives none on the page's clock. */
function pressTime(e: KeyboardEvent): number {
  const now = performance.now();
  return e.timeStamp > 0 && e.timeStamp <= now && now - e.timeStamp < 1000 ? e.timeStamp : now;
}
