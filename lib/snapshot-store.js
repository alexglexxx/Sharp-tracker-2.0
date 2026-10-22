import { fetchJson } from './http';
import { normalizeSnapshot } from './market-snapshots';

// Supabase PostgREST access with the server-only secret key. Returns null when
// storage is not configured, so callers can run without line movement.
export function createSnapshotStore(env = process.env) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  const base = `${url.replace(/\/$/, '')}/rest/v1`;
  const headers = { apikey:key };

  return {
    async saveSnapshots(snapshots) {
      if (!snapshots.length) return 0;
      const rows = snapshots.map(input => {
        const s = normalizeSnapshot(input);
        return {
          captured_at:s.timestamp, schema_version:s.schemaVersion, league:s.league, event_id:s.eventId,
          away:s.away, home:s.home, team:s.team, bookmaker:s.bookmaker, market:s.market,
          price:s.price, point:s.point, commence_time:s.commenceTime,
        };
      });
      await fetchJson(`${base}/odds_snapshots`, {
        method:'POST',
        headers:{ ...headers, 'Content-Type':'application/json', Prefer:'return=minimal' },
        body:JSON.stringify(rows),
      });
      return rows.length;
    },

    // First observed line per event/team, keyed by `${eventId}|${team}`.
    async getOpeners({ league, bookmaker, market, eventIds }) {
      const openers = new Map();
      if (!eventIds.length) return openers;
      const ids = eventIds.map(id => `"${String(id).replace(/"/g, '')}"`).join(',');
      const query = new URLSearchParams({
        select:'event_id,team,price,point,captured_at',
        league:`eq.${league}`,
        bookmaker:`eq.${bookmaker}`,
        market:`eq.${market}`,
        event_id:`in.(${ids})`,
      });
      const rows = await fetchJson(`${base}/odds_openers?${query}`, { headers });
      for (const r of Array.isArray(rows) ? rows : []) {
        openers.set(`${r.event_id}|${r.team}`, {
          league, bookmaker, market, eventId:r.event_id, team:r.team,
          price:r.price, point:r.point === null ? null : Number(r.point), timestamp:r.captured_at,
        });
      }
      return openers;
    },
  };
}
