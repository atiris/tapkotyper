import type { Rng } from '../engine/rng';
import type { Layout } from '../keyboard/layouts';
import { SPACE, isLetterKey, lessonOrder, shiftKeyOf } from '../learning/lessons';
import type { TaskSpec } from '../storage/schema';
import { typableText, untypableWords } from '../words/words';
import { wordsGame } from '../share/task';

/** A text in sentences, split after `.`, `!` and `?`; whitespace made single spaces. */
export function splitSentences(text: string): string[] {
  return (text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]*/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

/** The child can type the character: its key (and the Shift of a capital) is learned; the space as the levels allow it. */
export function knownChar(ch: string, keys: ReadonlySet<string>, layout: Layout): boolean {
  if (ch === ' ') return keys.has(SPACE);
  const lower = ch.toLowerCase();
  if (!keys.has(lower)) return false;
  const shift = shiftKeyOf(layout, ch);
  return !shift || keys.has(shift);
}

/** A word with the marks the child does not know left out; empty when a letter of it is not known. */
function knownWord(word: string, keys: ReadonlySet<string>, layout: Layout): string {
  const kept = [...word].filter((c) => isLetterKey(c.toLowerCase()) || knownChar(c, keys, layout)).join('');
  return [...kept].every((c) => knownChar(c, keys, layout)) ? kept : '';
}

/**
 * What a task plays: its words (a words game) or its text's sentences (a text game), what the
 * layout cannot type left out. With `knownOnly` the words with a letter the child has not learned
 * go (and the marks it does not know; a text needs the space); without it, `untaught` lists the
 * keys of the content the child has not learned, in the order they first come, for their cards.
 */
export function taskContent(spec: Pick<TaskSpec, 'game' | 'words' | 'text' | 'knownOnly'>, known: string[], layout: Layout): { items: string[]; untaught: string[] } {
  const keys = new Set(known);
  let items = wordsGame(spec.game)
    ? spec.words.filter((w) => !untypableWords([w], layout).length)
    : splitSentences(typableText(spec.text, layout).text);
  if (spec.knownOnly) {
    items = wordsGame(spec.game) ? items.map((w) => knownWord(w, keys, layout))
      : !keys.has(SPACE) ? []
      : items.map((s) => s.split(' ').map((w) => knownWord(w, keys, layout)).filter(Boolean).join(' '));
    return { items: items.filter(Boolean), untaught: [] };
  }
  const order = new Set(lessonOrder(layout.id));
  const untaught = new Set<string>();
  for (const ch of items.join(' ')) {
    const need = [ch === ' ' ? SPACE : ch.toLowerCase(), shiftKeyOf(layout, ch)];
    for (const k of need) if (k && order.has(k) && !keys.has(k)) untaught.add(k);
  }
  return { items, untaught: [...untaught] };
}

/** One piece the feed gave: a word or a sentence, and whether it is of the task's first pass (it counts toward the text written once). */
export interface FeedItem {
  text: string;
  first: boolean;
}

export interface FeedOptions {
  /** Words repeat shuffled, sentences in order. */
  words: boolean;
  /** More comes after the first pass is given out (the limits `time` and `both`); none for `text`. */
  extras: boolean;
  /** Dictionary words after the first pass; null: the task's own pieces repeat. */
  dictionary: (() => string) | null;
  rng: Rng;
}

/**
 * The task's pieces: all of them once in order (the first pass); then, while the limit asks for
 * more, dictionary words or the task's own again (words shuffled, sentences from the start). A first
 * pass piece let pass comes again at the end, so the text is written whole.
 */
export class TaskFeed {
  private pending: string[];
  /** First pass pieces given out and not written yet. */
  private open = 0;
  private again: string[] = [];

  constructor(private readonly items: string[], private readonly o: FeedOptions) {
    if (!items.length) throw new Error('TaskFeed needs pieces');
    this.pending = [...items];
  }

  /** The next piece; null when nothing more comes (the text limit after its first pass is given out). */
  next(): FeedItem | null {
    if (this.pending.length) {
      this.open++;
      return { text: this.pending.shift()!, first: true };
    }
    if (!this.o.extras) return null;
    if (this.o.dictionary) return { text: this.o.dictionary(), first: false };
    if (!this.again.length) this.again = this.o.words ? this.o.rng.shuffle(this.items) : [...this.items];
    return { text: this.again.shift()!, first: false };
  }

  written(it: FeedItem): void {
    if (it.first) this.open--;
  }

  /** A piece left untyped; a first pass one comes again. */
  missed(it: FeedItem): void {
    if (!it.first) return;
    this.open--;
    this.pending.push(it.text);
  }

  /** The task's own pieces are all written once. */
  get ownDone(): boolean {
    return !this.pending.length && this.open === 0;
  }

  /** The share of the first pass written. */
  get ownShare(): number {
    return (this.items.length - this.pending.length - this.open) / this.items.length;
  }
}

/** A task's game is done with its limit's part: the time limit any time (its minutes end it), the others once the text is written. */
export function taskDone(limit: TaskSpec['limit'], ownDone: boolean): boolean {
  return limit === 'time' || ownDone;
}
