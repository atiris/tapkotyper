import { describe, expect, it, vi } from 'vitest';
import { handleShortcut, setDefaultShortcuts, setShortcuts, withKey } from './shortcuts';

const press = (key: string, extra: Record<string, unknown> = {}) => {
  const e = { key, target: null, repeat: false, altKey: false, ctrlKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn(), ...extra };
  return { used: handleShortcut(e as any), e };
};

describe('shortcuts', () => {
  it('runs the shown screen\'s handler over the default, and the default again after it', () => {
    const appHelp = vi.fn(), levelHelp = vi.fn(), sound = vi.fn();
    setDefaultShortcuts({ help: appHelp, sound });
    const restore = setShortcuts({ help: levelHelp });
    press('F1');
    expect(levelHelp).toHaveBeenCalledTimes(1);
    expect(appHelp).not.toHaveBeenCalled();
    press('F4');
    expect(sound).toHaveBeenCalledTimes(1);
    restore();
    press('F1');
    expect(appHelp).toHaveBeenCalledTimes(1);
  });

  it('a restore that comes late does not undo a newer screen', () => {
    const a = vi.fn(), b = vi.fn();
    setDefaultShortcuts({});
    const restoreA = setShortcuts({ guide: a });
    setShortcuts({ guide: b });
    restoreA();
    press('F2');
    expect(b).toHaveBeenCalledTimes(1);
    expect(a).not.toHaveBeenCalled();
  });

  it('stops the browser\'s own action of its keys only, and does nothing without a handler', () => {
    setDefaultShortcuts({});
    setShortcuts({});
    const f3 = press('F3');
    expect(f3.used).toBe(true);
    expect(f3.e.preventDefault).toHaveBeenCalled();
    const f5 = press('F5');
    expect(f5.used).toBe(false);
    expect(f5.e.preventDefault).not.toHaveBeenCalled();
    expect(press('a').used).toBe(false);
    expect(press('F4', { altKey: true }).used).toBe(false);
  });

  it('a text field keeps its keys, except help', () => {
    const help = vi.fn(), guide = vi.fn();
    setShortcuts({ help, guide });
    const target = { tagName: 'INPUT', type: 'text' };
    press('F2', { target });
    press('F1', { target });
    expect(guide).not.toHaveBeenCalled();
    expect(help).toHaveBeenCalledTimes(1);
    press('F2', { target: { tagName: 'INPUT', type: 'checkbox' } });
    press('F2', { target: { tagName: 'BUTTON' } });
    expect(guide).toHaveBeenCalledTimes(2);
  });

  it('a held key does not repeat its action', () => {
    const guide = vi.fn();
    setShortcuts({ guide });
    press('F2', { repeat: true });
    expect(guide).not.toHaveBeenCalled();
  });

  it('adds the key to a label', () => {
    expect(withKey('Keyboard', 'F2')).toBe('Keyboard (F2)');
  });
});
