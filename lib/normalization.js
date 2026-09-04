export function american(price) { return Number.isFinite(Number(price)) ? Number(price) : null; }
export function point(value) { return value === null || value === undefined || value === '' ? null : Number(value); }
export function pct(value) { const n = Number(value); return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null; }
export function divergence(tickets, money) { return tickets === null || money === null ? null : tickets - money; }
export function normalizeSide({ team, tickets, money, source, market = 'unknown' }) {
  const t = pct(tickets), m = pct(money);
  return { team: String(team || '').trim(), tickets: t, money: m, divergence: divergence(t,m), source, market };
}
export function normalizeGame({ league, id = null, away, home, commenceTime = null, market = 'h2h', source, sides = [] }) {
  return { league, id, away: String(away || '').trim(), home: String(home || '').trim(), commenceTime, market, source, sides: sides.filter(s => s.team) };
}
