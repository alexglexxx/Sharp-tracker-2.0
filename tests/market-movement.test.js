import { describe, expect, it } from 'vitest';
import { analyzeMarketMovement } from '../lib/market-movement';

const previous = {
  league:'NFL',
  eventId:'game-1',
  bookmaker:'pinnacle',
  market:'spreads',
  team:'Buffalo Bills',
  timestamp:'2026-10-19T10:00:00.000Z',
  price:-110,
  point:-2.5,
};

describe('market movement analysis', () => {
  it('compares same-book observations over time', () => {
    const result = analyzeMarketMovement(previous, {
      ...previous,
      timestamp:'2026-10-19T10:10:00.000Z',
      price:-120,
      point:-3,
    });
    expect(result.comparable).toBe(true);
    expect(result.elapsedMinutes).toBe(10);
    expect(result.pointDelta).toBe(-0.5);
    expect(result.impliedProbabilityDeltaPctPoints).toBeGreaterThan(0);
  });

  it('rejects different bookmakers', () => {
    const result = analyzeMarketMovement(previous, {
      ...previous,
      bookmaker:'draftkings',
      timestamp:'2026-10-19T10:10:00.000Z',
    });
    expect(result.comparable).toBe(false);
  });

  it('rejects non-increasing timestamps', () => {
    const result = analyzeMarketMovement(previous, {
      ...previous,
      timestamp:previous.timestamp,
    });
    expect(result.comparable).toBe(false);
  });
});
