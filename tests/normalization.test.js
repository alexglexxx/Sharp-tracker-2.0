import { describe, expect, it } from 'vitest';
import { american, normalizeSide, pct, point } from '../lib/normalization';

describe('normalization', () => {
  it('treats missing percentages as unknown, not zero', () => {
    expect(pct(null)).toBeNull();
    expect(pct(undefined)).toBeNull();
    expect(pct('')).toBeNull();
    expect(pct(0)).toBe(0);
    expect(pct(101)).toBeNull();
  });

  it('never builds a divergence from a missing split', () => {
    const side = normalizeSide({ team:'Atlanta Falcons', tickets:null, money:60, source:'vsin' });
    expect(side.tickets).toBeNull();
    expect(side.divergence).toBeNull();
  });

  it('rejects missing, zero and non-numeric prices and points', () => {
    expect(american(null)).toBeNull();
    expect(american(0)).toBeNull();
    expect(american('-110')).toBe(-110);
    expect(point('abc')).toBeNull();
    expect(point(null)).toBeNull();
    expect(point('-3.5')).toBe(-3.5);
  });
});
