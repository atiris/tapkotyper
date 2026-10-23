/** About one target in this many ends with the Enter mark. */
export const ENTER_EVERY = 20;
/** Enter targets a level has at most; own practice has no cap. */
export const ENTER_MAX = 2;

/** Decides which targets end with Enter: about one in 20, never two in a row, at most `max` (null = no cap). */
export class EnterMarks {
  private last = false;
  private count = 0;

  constructor(private chance: () => number, private max: number | null) {}

  next(): boolean {
    const yes = !this.last && (this.max == null || this.count < this.max) && this.chance() < 1 / ENTER_EVERY;
    this.last = yes;
    if (yes) this.count++;
    return yes;
  }
}
