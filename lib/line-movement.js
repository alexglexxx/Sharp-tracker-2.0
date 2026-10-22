import { compareSnapshots } from './market-snapshots';
import { pinnacleMarket } from './providers';

// Smallest implied-probability change treated as real movement rather than noise.
// -110 to -115 is about 1.1 points; a single cent of juice is below this.
export const MIN_IMPLIED_MOVE_PCT_POINTS = 1;

// The market moved toward a side when it became more expensive to back it:
// fewer points on a spread (+3 -> +2.5, -3 -> -3.5) or, at the same line,
// a higher implied probability. A line that moved away never counts, even if
// the price moved toward the side.
export function movedTowardSide(comparison, market) {
  if (!comparison?.comparable) return false;
  if (market === 'spreads' && comparison.lineDelta !== null && comparison.lineDelta !== 0) {
    return comparison.lineDelta < 0;
  }
  return comparison.impliedProbabilityDeltaPctPoints >= MIN_IMPLIED_MOVE_PCT_POINTS;
}

export function compareToOpener(opener, current) {
  if (!opener) return null;
  try {
    return compareSnapshots(opener, current);
  } catch {
    return null;
  }
}

export function snapshotsFromOdds(games, league, timestamp = new Date().toISOString()) {
  const rows = [];
  for (const game of games || []) {
    const pm = pinnacleMarket(game.raw, league);
    if (!pm || !game.id) continue;
    for (const o of pm.outcomes) {
      const price = Number(o.price);
      if (!o.name || !Number.isFinite(price) || Math.abs(price) < 100) continue;
      rows.push({
        timestamp,
        league,
        eventId:String(game.id),
        away:game.away,
        home:game.home,
        team:o.name,
        bookmaker:pm.bookmaker,
        market:pm.market,
        price,
        point:o.point ?? null,
        commenceTime:game.commenceTime || null,
      });
    }
  }
  return rows;
}
