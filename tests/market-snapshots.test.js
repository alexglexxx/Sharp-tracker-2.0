import { describe, expect, it } from 'vitest';
import { compareSnapshots, normalizeSnapshot } from '../lib/market-snapshots';

const base = {
  league:'NFL',
  eventId:'evt-123',
  away:'Buffalo Bills',
  home:'Miami Dolphins',
  team:'Buffalo Bills',
  bookmaker:'pinnacle',
  market:'spreads',
  price:-110,
  point:-2.5,
  timestamp:'2026-10-19T10:00:00.000Z',
};

describe('market snapshots', () => {
  it('normalizes valid snapshots', () => {
    expect(normalizeSnapshot(base).schemaVersion).toBe(1);
  });

  it('rejects zero American odds', () => {
    expect(() => normalizeSnapshot({ ...base, price:0 })).toThrow();
  });

  it('compares snapshots only for the same market', () => {
    const result = compareSnapshots(base, {
      ...base,
      timestamp:'2026-10-19T10:05:00.000Z',
      price:-125,
      point:-3,
    });
    expect(result.comparable).toBe(true);
    expect(result.lineDelta).toBe(-0.5);
    expect(result.priceDelta).toBe(-15);
    expect(result.elapsedMinutes).toBe(5);
  });

  it('refuses cross-book comparison as movement', () => {
    const result = compareSnapshots(base, {
      ...base,
      bookmaker:'draftkings',
      timestamp:'2026-10-19T10:05:00.000Z',
    });
    expect(result.comparable).toBe(false);
  });

  it('refuses out-of-order timestamps', () => {
    const result = compareSnapshots(base, {
      ...base,
      timestamp:'2026-10-19T09:59:00.000Z',
    });
    expect(result.comparable).toBe(false);
  });
});
