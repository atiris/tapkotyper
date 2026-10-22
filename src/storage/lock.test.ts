import { describe, expect, it } from 'vitest';
import { checkLock, makeLock } from './lock';

describe('parent lock', () => {
  it('matches the same password only', async () => {
    const lock = await makeLock('mama123');
    expect(lock.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(lock.hash).not.toContain('mama123');
    expect(await checkLock(lock, 'mama123')).toBe(true);
    expect(await checkLock(lock, 'mama124')).toBe(false);
    expect(await checkLock(lock, '')).toBe(false);
  });

  it('salts every lock', async () => {
    const a = await makeLock('same');
    const b = await makeLock('same');
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });
});
