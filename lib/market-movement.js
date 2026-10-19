function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function impliedProbability(americanOdds) {
  if (!Number.isFinite(americanOdds) || americanOdds === 0) return null;
  if (americanOdds > 0) return 100 / (americanOdds + 100);
  return -americanOdds / (-americanOdds + 100);
}

function normalizePair(outcomes) {
  if (!Array.isArray(outcomes) || outcomes.length !== 2) return null;
  const prices = outcomes.map(o => toFiniteNumber(o.price));
  if (prices.some(p => p === null || p === 0)) return null;
  const implied = prices.map(impliedProbability);
  const total = implied[0] + implied[1];
  if (!Number.isFinite(total) || total <= 0) return null;
  return implied.map(p => p / total);
}

export function analyzeMarketMovement(previous, current) {
  if (!previous || !current) {
    return { comparable:false, reason:'Both observations are required' };
  }

  const keys = ['league', 'eventId', 'bookmaker', 'market', 'team'];
  for (const key of keys) {
    if (!previous[key] || !current[key] || previous[key] !== current[key]) {
      return { comparable:false, reason:`Mismatched ${key}` };
    }
  }

  const previousTime = Date.parse(previous.timestamp);
  const currentTime = Date.parse(current.timestamp);
  if (!Number.isFinite(previousTime) || !Number.isFinite(currentTime) || currentTime <= previousTime) {
    return { comparable:false, reason:'Timestamps must be valid and strictly increasing' };
  }

  const previousPrice = toFiniteNumber(previous.price);
  const currentPrice = toFiniteNumber(current.price);
  if (previousPrice === null || currentPrice === null || previousPrice === 0 || currentPrice === 0) {
    return { comparable:false, reason:'American odds must be valid non-zero numbers' };
  }

  const previousPoint = previous.point === null || previous.point === undefined ? null : toFiniteNumber(previous.point);
  const currentPoint = current.point === null || current.point === undefined ? null : toFiniteNumber(current.point);
  if ((previous.point != null && previousPoint === null) || (current.point != null && currentPoint === null)) {
    return { comparable:false, reason:'Points must be numeric or null' };
  }

  const elapsedMinutes = (currentTime - previousTime) / 60000;
  const previousImplied = impliedProbability(previousPrice);
  const currentImplied = impliedProbability(currentPrice);

  return {
    comparable:true,
    elapsedMinutes:Number(elapsedMinutes.toFixed(2)),
    previousPrice,
    currentPrice,
    priceDelta:currentPrice - previousPrice,
    impliedProbabilityDeltaPctPoints:Number(((currentImplied - previousImplied) * 100).toFixed(3)),
    previousPoint,
    currentPoint,
    pointDelta:previousPoint === null || currentPoint === null ? null : Number((currentPoint - previousPoint).toFixed(3)),
    priceMoved:previousPrice !== currentPrice,
    lineMoved:previousPoint !== currentPoint,
  };
}

export { normalizePair };
