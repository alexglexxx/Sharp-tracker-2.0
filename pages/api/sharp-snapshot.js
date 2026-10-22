import { getOdds } from '../../lib/providers';
import { hasCronSecret } from '../../lib/auth';
import { snapshotsFromOdds } from '../../lib/line-movement';
import { createSnapshotStore } from '../../lib/snapshot-store';

// Stores current Pinnacle lines so the engine can measure movement over time.
// Each run spends one The Odds API request per league.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok:false, error:'Method not allowed' });
  }

  if (!hasCronSecret(req)) {
    return res.status(401).json({ ok:false, error:'Unauthorized' });
  }

  const store = createSnapshotStore();
  if (!store) {
    return res.status(503).json({ ok:false, error:'SUPABASE_URL / SUPABASE_SECRET_KEY not configured' });
  }

  const results = {};
  for (const league of ['NFL', 'MLB']) {
    const odds = await getOdds(league);
    if (!odds.available) {
      results[league] = { ok:false, error:odds.error };
      continue;
    }
    try {
      const saved = await store.saveSnapshots(snapshotsFromOdds(odds.games, league));
      results[league] = { ok:true, games:odds.games.length, saved };
    } catch (error) {
      results[league] = { ok:false, error:error.message };
    }
  }

  const ok = Object.values(results).every(r => r.ok);
  return res.status(ok ? 200 : 502).json({ ok, capturedAt:new Date().toISOString(), results });
}
