const SNAPSHOT_VERSION = 1;

function validAmerican(price) {
  return Number.isFinite(price) && price !== 0 && Math.abs(price) >= 100;
}

function validPoint(point) {
  return point === null || point === undefined || Number.isFinite(point);
}

function impliedProbability(americanOdds) {
  return americanOdds > 0 ? 100 / (americanOdds + 100) : -americanOdds / (-americanOdds + 100);
}

export function normalizeSnapshot(input) {
  if (!input || !['MLB', 'NFL'].includes(input.league)) {
    throw new Error('Snapshot league must be MLB or NFL');
  }
  if (!input.eventId || !input.team || !input.bookmaker || !input.market) {
    throw new Error('Snapshot requires eventId, team, bookmaker, and market');
  }
  if (!validAmerican(input.price)) throw new Error('Snapshot price must be a valid American price');
  if (!validPoint(input.point ?? null)) throw new Error('Snapshot point must be numeric or null');
  const timestamp = input.timestamp || new Date().toISOString();
  if (Number.isNaN(Date.parse(timestamp))) throw new Error('Snapshot timestamp must be ISO-compatible');

  return {
    schemaVersion: SNAPSHOT_VERSION,
    timestamp: new Date(timestamp).toISOString(),
    league: input.league,
    eventId: String(input.eventId),
    away: String(input.away || ''),
    home: String(input.home || ''),
    team: String(input.team),
    bookmaker: String(input.bookmaker).toLowerCase(),
    market: String(input.market).toLowerCase(),
    price: input.price,
    point: input.point ?? null,
    commenceTime: input.commenceTime || null,
  };
}

export function compareSnapshots(previous, current) {
  if (!previous || !current) throw new Error('Two snapshots are required');
  const a = normalizeSnapshot(previous);
  const b = normalizeSnapshot(current);

  const sameMarket = ['league', 'eventId', 'team', 'bookmaker', 'market']
    .every(key => a[key] === b[key]);
  if (!sameMarket) {
    return { comparable:false, reason:'Snapshots refer to different event/team/bookmaker/market' };
  }

  const elapsedMs = Date.parse(b.timestamp) - Date.parse(a.timestamp);
  if (elapsedMs <= 0) {
    return { comparable:false, reason:'Current snapshot must be later than previous snapshot' };
  }

  const lineChanged = a.point !== b.point;
  const priceChanged = a.price !== b.price;
  const minutes = elapsedMs / 60000;

  return {
    comparable:true,
    elapsedMinutes:Number(minutes.toFixed(2)),
    previous:{ timestamp:a.timestamp, price:a.price, point:a.point },
    current:{ timestamp:b.timestamp, price:b.price, point:b.point },
    lineChanged,
    priceChanged,
    lineDelta:a.point === null || b.point === null ? null : Number((b.point - a.point).toFixed(3)),
    priceDelta:b.price - a.price,
    impliedProbabilityDeltaPctPoints:Number(((impliedProbability(b.price) - impliedProbability(a.price)) * 100).toFixed(3)),
    priceMovementPerHour:Number(((b.price - a.price) / (minutes / 60)).toFixed(3)),
  };
}
