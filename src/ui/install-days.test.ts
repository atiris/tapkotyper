import { describe, expect, it } from 'vitest';
import { OFFER_DAYS, localDay, readInstall, withVisit } from './install-days';

describe('install days', () => {
  it('counts each day once and keeps only the first three', () => {
    let s = readInstall(null);
    expect(s).toEqual({ days: [], offered: false });
    s = withVisit(s, '2026-10-01');
    s = withVisit(s, '2026-10-01');
    expect(s.days).toEqual(['2026-10-01']);
    s = withVisit(withVisit(withVisit(s, '2026-10-03'), '2026-10-09'), '2026-10-10');
    expect(s.days).toEqual(['2026-10-01', '2026-10-03', '2026-10-09']);
    expect(s.days.length).toBe(OFFER_DAYS);
  });

  it('reads the old first-visit value as one day', () => {
    const first = new Date(2026, 8, 14, 18, 30).getTime();
    expect(readInstall(JSON.stringify({ firstSeen: first, offered: true }))).toEqual({ days: ['2026-09-14'], offered: true });
    expect(readInstall(JSON.stringify({ days: ['2026-10-01'], offered: false }))).toEqual({ days: ['2026-10-01'], offered: false });
    expect(readInstall('not json')).toEqual({ days: [], offered: false });
  });

  it('writes local dates', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
