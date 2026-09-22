import { getOdds, getActionNetwork, getVsin, findGame, pinnacleMarket, draftKingsMarket } from '../../lib/providers';
import { sameTeam } from '../../lib/matching';
import { american, point } from '../../lib/normalization';
import { analyzeSharpFlow } from '../../lib/sharp-flow';

function underdogInfo(price, league) {
  if (!Number.isFinite(price)) return { isUnderdog:false, magnitude:null };
  if (league === 'NFL') return { isUnderdog:price > 100, magnitude:price > 100 ? price : null };
  return { isUnderdog:price > 100, magnitude:price > 100 ? price : null };
}

export function auth(req) {
  // Public read endpoint. Cron authentication belongs to /api/sharp-daily.
  return true;
}

export async function runSharp(league, req) {
  const odds = await getOdds(league);
  if (!odds.available) return { ok:false, league, error:odds.error, alerts:[], sources:{odds} };

  const [vsin, action] = await Promise.all([getVsin(league), getActionNetwork(league)]);
  const alerts = [];

  for (const game of odds.games) {
    const pm = pinnacleMarket(game.raw, league);
    if (!pm) continue;

    const dm = draftKingsMarket(game.raw, league);
    const vg = findGame(vsin.games, game);
    const ag = findGame(action.games, game);

    for (const outcome of pm.outcomes) {
      const team = outcome.name;
      const price = american(outcome.price);
      const p = point(outcome.point);
      if (price === null) continue;

      const vs = vg?.sides.find(s => sameTeam(s.team, team)) || null;
      const as = ag?.sides.find(s => sameTeam(s.team, team)) || null;
      const dk = dm?.outcomes.find(o => sameTeam(o.name, team)) || null;

      const sources = [vs, as].filter(Boolean);
      const validSources = sources.filter(s => s.tickets !== null && s.money !== null);
      if (!validSources.length) continue;

      const primary = validSources[0];
      const divergences = validSources.map(s => s.tickets - s.money);
      const positiveAgreement = divergences.filter(d => d < 0).length;
      const negativeAgreement = divergences.filter(d => d > 0).length;
      const agreement = Math.max(positiveAgreement, negativeAgreement);

      const { isUnderdog, magnitude } = underdogInfo(price, league);

      // Current Pinnacle vs current DraftKings is NOT historical movement.
      // Until snapshots exist, this field remains false by design.
      const marketMovedTowardSide = false;

      const flow = analyzeSharpFlow({
        tickets: primary.tickets,
        money: primary.money,
        sourceCount: validSources.length,
        agreeingSources: agreement,
        isUnderdog,
        underdogMagnitude: magnitude,
        isHandicap: league === 'NFL' && p !== null,
        marketMovedTowardSide,
      });

      if (flow.label === 'INSUFFICIENT_EVIDENCE' || flow.score < 40) continue;

      alerts.push({
        league,
        game: `${game.away} @ ${game.home}`,
        team,
        market: pm.market,
        price,
        point: p,
        isUnderdog,
        underdogMagnitude: magnitude,
        tickets: primary.tickets,
        money: primary.money,
        divergence: flow.divergence,
        vsin: vs,
        action: as,
        dkPrice: dk?.price ?? null,
        dkPoint: dk?.point ?? null,
        score: flow.score,
        label: flow.label,
        evidence: flow.evidence,
        commenceTime: game.commenceTime,
      });
    }
  }

  alerts.sort((a, b) => b.score - a.score);

  return {
    ok:true,
    league,
    alerts:alerts.slice(0,10),
    count:Math.min(alerts.length,10),
    sources:{
      odds:{available:true,source:odds.source},
      vsin,
      action
    },
    checkedAt:new Date().toISOString(),
  };
}

export { auth };
