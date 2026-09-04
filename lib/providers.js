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

export async function getActionNetwork(league) {
  const slug = league === 'MLB' ? 'mlb' : 'nfl';
  const url = process.env[`ACTION_NETWORK_${league}_URL`] || `https://api.actionnetwork.com/web/v1/scoreboard/${slug}?period=game`;
  try {
    const data = await fetchJson(url, { headers:{'User-Agent':'Tracke-Sharp/2.0'} });
    const list = data?.games || data?.scoreboard?.games || [];
    const games = list.map(g => {
      const away = g.away_team?.display_name || g.away_team?.short_name || g.away_team?.name || '';
      const home = g.home_team?.display_name || g.home_team?.short_name || g.home_team?.name || '';
      const pb = g.public_betting || {};
      const sides = (pb.sides || []).map(s => normalizeSide({team:s.team || s.name, tickets:s.tickets_pct ?? s.bets_pct ?? s.bets, money:s.money_pct ?? s.handle_pct ?? s.money, source:'action-network', market:s.market}));
      return normalizeGame({league, id:g.id, away, home, commenceTime:g.start_time, source:'action-network', sides});
    }).filter(g => g.away && g.home);
    return { available:true, source:'action-network', games };
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
