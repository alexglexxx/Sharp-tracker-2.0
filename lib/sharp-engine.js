import { getOdds, getActionNetwork, getVsin, findGame, pinnacleMarket, draftKingsMarket } from './providers';
import { sameTeam } from './matching';
import { american, point } from './normalization';
import { analyzeSharpFlow } from './sharp-flow';
import { compareToOpener, movedTowardSide } from './line-movement';
import { createSnapshotStore } from './snapshot-store';

async function loadOpeners(store, league, games) {
  if (!store) return { openers:new Map(), status:{ available:false, error:'SUPABASE_URL / SUPABASE_SECRET_KEY not configured' } };
  try {
    const openers = await store.getOpeners({
      league,
      bookmaker:'pinnacle',
      market:league === 'MLB' ? 'h2h' : 'spreads',
      eventIds:games.map(g => g.id).filter(Boolean),
    });
    return { openers, status:{ available:true, openers:openers.size } };
  } catch (error) {
    return { openers:new Map(), status:{ available:false, error:error.message } };
  }
}

function underdogInfo(price, spreadPoint, league) {
  // NFL uses spreads, where prices sit near -110 on both sides: the underdog is
  // the side receiving points, and price magnitude says nothing about it.
  if (league === 'NFL') return { isUnderdog:Number.isFinite(spreadPoint) && spreadPoint > 0, magnitude:null };
  if (!Number.isFinite(price)) return { isUnderdog:false, magnitude:null };
  return { isUnderdog:price > 100, magnitude:price > 100 ? price : null };
}

export function auth(req) {
  // Public read endpoint. Cron authentication belongs to /api/sharp-daily.
  return true;
}

export async function runSharp(league, req, { store = createSnapshotStore() } = {}) {
  const odds = await getOdds(league);
  if (!odds.available) return { ok:false, league, error:odds.error, alerts:[], sources:{odds} };

  const [vsin, action, snapshots] = await Promise.all([
    getVsin(league),
    getActionNetwork(league),
    loadOpeners(store, league, odds.games),
  ]);
  const now = new Date().toISOString();
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
      // Only sources showing money outpacing tickets on this side agree with sharp flow.
      const agreement = validSources.filter(s => s.tickets - s.money < 0).length;

      const { isUnderdog, magnitude } = underdogInfo(price, p, league);

      // Movement is same-book (Pinnacle) over time, against the first stored
      // snapshot. Current Pinnacle vs current DraftKings is never movement.
      const movement = compareToOpener(snapshots.openers.get(`${game.id}|${team}`), {
        league, eventId:String(game.id), team, bookmaker:pm.bookmaker, market:pm.market,
        price, point:p, timestamp:now,
      });
      const marketMovedTowardSide = movedTowardSide(movement, pm.market);

      const flow = analyzeSharpFlow({
        tickets: primary.tickets,
        money: primary.money,
        sourceCount: validSources.length,
        agreeingSources: agreement,
        isUnderdog,
        underdogMagnitude: magnitude,
        marketMovedTowardSide,
      });

      if (flow.label !== 'SHARP_FLOW' && flow.label !== 'SHARP_WATCH') continue;

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
        confirmations: flow.confirmations,
        evidence: flow.evidence,
        movement: movement?.comparable ? {
          since: movement.previous.timestamp,
          openPrice: movement.previous.price,
          openPoint: movement.previous.point,
          lineDelta: movement.lineDelta,
          priceDelta: movement.priceDelta,
          impliedProbabilityDeltaPctPoints: movement.impliedProbabilityDeltaPctPoints,
          towardSide: marketMovedTowardSide,
        } : null,
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
      action,
      snapshots:snapshots.status,
    },
    checkedAt:new Date().toISOString(),
  };
}
