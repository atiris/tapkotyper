import { describe, expect, it } from 'vitest';
import { isHardMoment } from './paw';
import { TypingCore } from './typing';

describe('automatic paw help', () => {
  const setup = () => {
    const core = new TypingCore();
    const words = ['mama', 'lev', 'sova'].map((w, i) => Object.assign(core.add(w), { urgency: i }));
    return { core, closest: words[2] };
  };

  it('starts when the screen is full and the closest word is near its end', () => {
    const { core } = setup();
    expect(isHardMoment(core.targets, null, () => 8, () => 10, 3)).toBe(true);
    expect(isHardMoment(core.targets, null, () => 5, () => 10, 3)).toBe(false);
  });

  it('waits while the child types the closest word or the screen is not full', () => {
    const { core, closest } = setup();
    expect(isHardMoment(core.targets, closest, () => 8, () => 10, 3)).toBe(false);
    core.release(closest);
    expect(isHardMoment(core.targets, null, () => 8, () => 10, 3)).toBe(false);
    expect(isHardMoment(core.targets, null, () => 8, () => 10, 2)).toBe(true);
  });
});
