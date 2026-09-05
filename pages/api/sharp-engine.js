import { getOdds, getActionNetwork, getVsin, findGame, pinnacleMarket, draftKingsMarket } from '../../lib/providers';
import { sameTeam } from '../../lib/matching';
import { american, point } from '../../lib/normalization';
import { scoreSignal } from '../../lib/scoring';

function auth(req) {
  if (!process.env.CRON_SECRET) return true;
  const value = req.headers.authorization || '';
  return value === `Bearer ${process.env.CRON_SECRET}` || req.query.cron === '1';
}

export async function runSharp(league, req) {
  const odds = await getOdds(league);
  if (!odds.available) return { ok:false, league, error:odds.error, alerts:[], sources:{odds} };
  const [vsin, action] = await Promise.all([getVsin(league), getActionNetwork(league)]);
  const alerts=[];
  for (const game of odds.games) {
    const pm = pinnacleMarket(game.raw, league); if (!pm) continue;
    const dm = draftKingsMarket(game.raw, league);
    const vg = findGame(vsin.games, game), ag = findGame(action.games, game);
    for (const outcome of pm.outcomes) {
      const team = outcome.name; const price = american(outcome.price); const p = point(outcome.point);
      if (price === null) continue;
      const vs = vg?.sides.find(s=>sameTeam(s.team,team)) || null;
      const as = ag?.sides.find(s=>sameTeam(s.team,team)) || null;
      const dk = dm?.outcomes.find(o=>sameTeam(o.name,team)) || null;
      const divergenceSource = vs || as;
      const hasPublicEvidence = !!divergenceSource && divergenceSource.tickets !== null && divergenceSource.money !== null;
      const marketMovement = { lineMoved:false, priceMoved:false };
      if (dk) {
        marketMovement.priceMoved = Number.isFinite(Number(dk.price)) && Math.abs(Number(dk.price)-price)>=10;
        marketMovement.lineMoved = league==='NFL' && p!==null && point(dk.point)!==null && Math.abs(point(dk.point)-p)>=0.5;
      }
      const scoring = scoreSignal({vsin:vs, action:as, marketMovement, sampleQuality:hasPublicEvidence?5:0});
      if (!hasPublicEvidence || scoring.score < 40) continue;
      alerts.push({league, game:`${game.away} @ ${game.home}`, team, market:pm.market, price, point:p, tickets:divergenceSource.tickets, money:divergenceSource.money, divergence:divergenceSource.divergence, vsin:vs, action:as, dkPrice:dk?.price ?? null, dkPoint:dk?.point ?? null, score:scoring.score, label:scoring.label, evidence:scoring.evidence, commenceTime:game.commenceTime});
    }
  }
  alerts.sort((a,b)=>b.score-a.score);
  return {ok:true, league, alerts:alerts.slice(0,10), count:Math.min(alerts.length,10), sources:{odds:{available:true,source:odds.source},vsin,action}, checkedAt:new Date().toISOString()};
}
export { auth };
