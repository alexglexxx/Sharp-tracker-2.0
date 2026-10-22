import { describe, expect, it } from 'vitest';
import { findGame, parseActionNetworkGames } from '../lib/providers';
import nfl from './fixtures/action-network-v2-nfl.json';
import mlb from './fixtures/action-network-v2-mlb.json';

describe('Action Network v2 parser', () => {
  it('reads NFL spread splits from the consensus book using team ids', () => {
    const [game] = parseActionNetworkGames(nfl, 'NFL');
    expect(game).toMatchObject({ league:'NFL', away:'New England Patriots', home:'Chicago Bears', market:'spreads', source:'action-network' });
    expect(game.sides).toEqual([
      expect.objectContaining({ team:'Chicago Bears', tickets:28, money:30, market:'spreads' }),
      expect.objectContaining({ team:'New England Patriots', tickets:72, money:70, market:'spreads' }),
    ]);
  });

  it('reads MLB moneyline splits', () => {
    const [game] = parseActionNetworkGames(mlb, 'MLB');
    expect(game).toMatchObject({ away:'Tampa Bay Rays', home:'Milwaukee Brewers', market:'h2h' });
    expect(game.sides.map(s => [s.team, s.tickets, s.money])).toEqual([
      ['Tampa Bay Rays', 27, 33],
      ['Milwaukee Brewers', 73, 67],
    ]);
  });

  it('parses every game in the response', () => {
    expect(parseActionNetworkGames(nfl, 'NFL')).toHaveLength(nfl.games.length);
  });

  it('keeps games without bet_info but leaves their splits empty', () => {
    const game = structuredClone(nfl.games[0]);
    for (const o of game.markets['15'].event.spread) delete o.bet_info;
    const [parsed] = parseActionNetworkGames({ games:[game] }, 'NFL');
    expect(parsed.sides.every(s => s.tickets === null && s.money === null)).toBe(true);
  });

  it('drops games whose teams cannot be resolved', () => {
    const game = { ...structuredClone(nfl.games[0]), teams:[] };
    expect(parseActionNetworkGames({ games:[game] }, 'NFL')).toEqual([]);
  });

  it('returns no games for an unexpected payload', () => {
    expect(parseActionNetworkGames({ scoreboard:{} }, 'NFL')).toEqual([]);
    expect(parseActionNetworkGames(null, 'MLB')).toEqual([]);
  });

  it('matches The Odds API team names', () => {
    const games = parseActionNetworkGames(nfl, 'NFL');
    expect(findGame(games, { away:'New England Patriots', home:'Chicago Bears' })).not.toBeNull();
  });
});
