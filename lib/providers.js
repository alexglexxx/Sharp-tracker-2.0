import { fetchJson } from './http';
import { normalizeGame, normalizeSide, american, point, pct } from './normalization';
import { sameGame } from './matching';

function parseSides(raw) {
  const candidates = raw?.sides || raw?.teams || raw?.outcomes || raw?.public_betting?.sides || [];
  if (!Array.isArray(candidates)) return [];
  return candidates.map(s => normalizeSide({
    team: s.team || s.name || s.team_name || s.display_name,
    tickets: s.tickets ?? s.bets ?? s.bet_pct ?? s.tickets_pct ?? s.public_bets,
    money: s.money ?? s.handle ?? s.money_pct ?? s.handle_pct ?? s.public_money,
    source: s.source || 'unknown', market: s.market || 'unknown'
  }));
}

export async function getOdds(league) {
  const key = process.env.ODDS_API_KEY;
  if (!key) return { available:false, source:'odds-api', games:[], error:'ODDS_API_KEY missing' };
  const sport = league === 'MLB' ? 'baseball_mlb' : 'americanfootball_nfl';
  const market = league === 'MLB' ? 'h2h' : 'spreads';
  const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${encodeURIComponent(key)}&regions=us&markets=${market}&oddsFormat=american&bookmakers=pinnacle,draftkings`;
  try {
    const data = await fetchJson(url);
    const games = Array.isArray(data) ? data.map(g => normalizeGame({ league, id:g.id, away:g.away_team, home:g.home_team, commenceTime:g.commence_time, market, source:'odds-api', sides:[] })).map(g => ({...g, raw:data.find(x=>x.id===g.id)})) : [];
    return { available:true, source:'odds-api', games };
  } catch (error) { return { available:false, source:'odds-api', games:[], error:error.message }; }
}

// Action Network v2 scoreboard: games carry teams[] keyed by id and
// markets[bookId].event.{moneyline,spread}[] outcomes with bet_info percents.
// Book 15 is the consensus book and the one that always carries bet_info.
const ACTION_NETWORK_CONSENSUS_BOOK = '15';

export function parseActionNetworkGames(data, league) {
  const anMarket = league === 'MLB' ? 'moneyline' : 'spread';
  const market = league === 'MLB' ? 'h2h' : 'spreads';
  const list = Array.isArray(data?.games) ? data.games : [];
  return list.map(g => {
    const teams = new Map((g.teams || []).map(t => [t.id, t.full_name || t.display_name || '']));
    const books = g.markets || {};
    const outcomes = books[ACTION_NETWORK_CONSENSUS_BOOK]?.event?.[anMarket]
      || Object.values(books).map(b => b?.event?.[anMarket]).find(o => o?.some(x => x.bet_info))
      || [];
    const sides = outcomes.map(o => normalizeSide({
      team:teams.get(o.team_id), tickets:o.bet_info?.tickets?.percent, money:o.bet_info?.money?.percent,
      source:'action-network', market
    }));
    return normalizeGame({league, id:g.id, away:teams.get(g.away_team_id), home:teams.get(g.home_team_id), commenceTime:g.start_time, market, source:'action-network', sides});
  }).filter(g => g.away && g.home);
}

export async function getActionNetwork(league) {
  const slug = league === 'MLB' ? 'mlb' : 'nfl';
  const url = process.env[`ACTION_NETWORK_${league}_URL`] || `https://api.actionnetwork.com/web/v2/scoreboard/${slug}?bookIds=${ACTION_NETWORK_CONSENSUS_BOOK}&periods=event`;
  try {
    const data = await fetchJson(url, { headers:{'User-Agent':'Tracke-Sharp/2.0'} });
    return { available:true, source:'action-network', games:parseActionNetworkGames(data, league) };
  } catch (error) { return { available:false, source:'action-network', games:[], error:error.message }; }
}

export async function getVsin(league) {
  const url = process.env[`VSIN_${league}_DATA_URL`] || process.env.VSIN_DATA_URL;
  if (!url) return { available:false, source:'vsin', games:[], error:`VSIN_${league}_DATA_URL not configured` };
  try {
    const data = await fetchJson(url, { headers:{'User-Agent':'Tracke-Sharp/2.0'} });
    const list = Array.isArray(data) ? data : (data?.games || data?.data || data?.events || []);
    const games = list.map(g => normalizeGame({
      league, id:g.id, away:g.away || g.away_team || g.visitor, home:g.home || g.home_team || g.homeTeam,
      commenceTime:g.commenceTime || g.start_time || g.commence_time, market:g.market || 'unknown', source:'vsin',
      sides:parseSides(g)
    })).filter(g => g.away && g.home);
    return { available:true, source:'vsin', games };
  } catch (error) { return { available:false, source:'vsin', games:[], error:error.message }; }
}

export function findGame(list, target) { return list.find(g => sameGame(g, target)) || null; }
export function pinnacleMarket(raw, league) {
  const b = raw?.bookmakers?.find(x => x.key === 'pinnacle');
  const marketKey = league === 'MLB' ? 'h2h' : 'spreads';
  const m = b?.markets?.find(x => x.key === marketKey);
  if (!m) return null;
  return { bookmaker:'pinnacle', market:marketKey, outcomes:m.outcomes || [] };
}
export function draftKingsMarket(raw, league) {
  const b = raw?.bookmakers?.find(x => x.key === 'draftkings');
  const marketKey = league === 'MLB' ? 'h2h' : 'spreads';
  const m = b?.markets?.find(x => x.key === marketKey);
  if (!m) return null;
  return { bookmaker:'draftkings', market:marketKey, outcomes:m.outcomes || [] };
}
export { american, point, pct };
