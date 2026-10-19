import { describe, expect, it } from 'vitest';
import { sameGame, sameTeam } from '../lib/matching';

describe('team identity matching', () => {
  it('does not match teams that share a city', () => {
    expect(sameTeam('New York Yankees', 'New York Mets')).toBe(false);
    expect(sameTeam('New York Giants', 'New York Jets')).toBe(false);
  });

  it('matches exact names case-insensitively', () => {
    expect(sameTeam('Buffalo Bills', 'buffalo bills')).toBe(true);
  });

  it('matches known explicit aliases', () => {
    expect(sameTeam('LA Dodgers', 'Los Angeles Dodgers')).toBe(true);
  });

  it('matches games regardless of home/away ordering', () => {
    expect(sameGame(
      { away:'Buffalo Bills', home:'Miami Dolphins' },
      { away:'Miami Dolphins', home:'Buffalo Bills' }
    )).toBe(true);
  });
});
