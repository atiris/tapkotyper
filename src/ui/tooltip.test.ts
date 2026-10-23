import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HIDE_DELAY, SHOW_DELAY, WARM_MS, tipMachine } from './tooltip';

describe('tipMachine', () => {
  let log: string[];
  let m: ReturnType<typeof tipMachine<string>>;
  beforeEach(() => {
    vi.useFakeTimers();
    log = [];
    m = tipMachine((x) => log.push(`show ${x}`), () => log.push('hide'));
  });
  afterEach(() => vi.useRealTimers());

  it('shows only after the delay', () => {
    m.enter('a');
    vi.advanceTimersByTime(SHOW_DELAY - 1);
    expect(log).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(log).toEqual(['show a']);
  });

  it('never shows when the pointer leaves before the delay', () => {
    m.enter('a');
    vi.advanceTimersByTime(SHOW_DELAY / 2);
    m.leave('a');
    vi.advanceTimersByTime(SHOW_DELAY * 2);
    expect(log).toEqual([]);
  });

  it('hides after a short wait and moves to a neighbour at once', () => {
    m.enter('a');
    vi.advanceTimersByTime(SHOW_DELAY);
    m.leave('a');
    m.enter('b');
    expect(log).toEqual(['show a', 'show b']);
    m.leave('b');
    vi.advanceTimersByTime(HIDE_DELAY - 1);
    expect(m.shown).toBe('b');
    vi.advanceTimersByTime(1);
    expect(log.at(-1)).toBe('hide');
    expect(m.shown).toBeNull();
  });

  it('shows the next one at once within the warm window, then waits again', () => {
    m.enter('a');
    vi.advanceTimersByTime(SHOW_DELAY);
    m.close();
    vi.advanceTimersByTime(WARM_MS - 10);
    m.enter('b');
    expect(log).toEqual(['show a', 'hide', 'show b']);
    m.close();
    vi.advanceTimersByTime(WARM_MS + 1);
    m.enter('c');
    expect(log.at(-1)).toBe('hide');
    vi.advanceTimersByTime(SHOW_DELAY);
    expect(log.at(-1)).toBe('show c');
  });

  it('a pending tooltip is dropped by a click', () => {
    m.enter('a');
    m.close();
    vi.advanceTimersByTime(SHOW_DELAY);
    expect(log).toEqual([]);
  });
});
