/** Seconds without a key after which the collected text is shown and said. */
export const LINE_PAUSE = 1.5;
/** Most characters collected; the next key shows the full line at once. */
export const LINE_MAX = 32;

/**
 * Free typing: the characters typed since the last pause. Backspace removes the last one;
 * after `LINE_PAUSE` seconds without a key (or Enter, or a full line) the text is taken out.
 */
export class TypedLine {
  text = '';
  private idle = 0;

  /** Adds a character; returns the full line when it had no room left, else null. */
  add(ch: string): string | null {
    const full = [...this.text].length >= LINE_MAX ? this.take() : null;
    this.text += ch;
    this.idle = 0;
    return full;
  }

  erase(): void {
    this.text = [...this.text].slice(0, -1).join('');
    this.idle = 0;
  }

  /** Time passes; returns the collected text once the pause is long enough, else null. */
  tick(dt: number): string | null {
    if (!this.text) return null;
    this.idle += dt;
    return this.idle >= LINE_PAUSE ? this.take() : null;
  }

  /** The collected text, trimmed (null when only spaces), and an empty line. */
  take(): string | null {
    const out = this.text.trim().replace(/\s+/g, ' ');
    this.text = '';
    this.idle = 0;
    return out || null;
  }
}
