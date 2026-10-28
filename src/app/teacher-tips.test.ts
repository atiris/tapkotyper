import { describe, expect, it } from 'vitest';
import { newProfile } from '../storage/store';
import { dueTip, tipSeen } from './teacher-tips';

const HOUR = 60 * 60 * 1000;

describe('teacher tips', () => {
  it('come one by one, the character right after the hello, the first ones at most hourly, the later ones after a day and a half', () => {
    const p = newProfile('Ema', 'sk');
    let now = 1_000_000_000_000;
    expect(dueTip(p, now)?.id).toBe('hello');
    tipSeen(p, 'hello', now);
    expect(dueTip(p, now)?.id).toBe('character');
    tipSeen(p, 'character', now);
    expect(dueTip(p, now + HOUR / 2)).toBeNull();
    now += HOUR;
    expect(dueTip(p, now)?.id).toBe('help');
    tipSeen(p, 'help', now);
    p.progress.levelsFinished = 5;
    p.progress.appTips.seen.push('keyboard', 'progress');
    now += HOUR;
    expect(dueTip(p, now)).toBeNull();
    expect(dueTip(p, now + 36 * HOUR)?.id).toBe('share');
  });

  it('fit the player: the task tip only with a task, none when the setting is off', () => {
    const p = newProfile('Ema', 'sk');
    p.progress.appTips.seen.push('hello', 'character', 'help', 'keyboard', 'progress', 'share', 'range');
    expect(dueTip(p)).toBeNull();
    p.tasks.push({} as never);
    expect(dueTip(p)?.id).toBe('task');
    p.settings.appTips = false;
    expect(dueTip(p)).toBeNull();
  });
});
