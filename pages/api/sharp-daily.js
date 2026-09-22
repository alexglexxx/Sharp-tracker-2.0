import { runSharp } from './sharp-engine';

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const value = req.headers.authorization || '';
  return value === `Bearer ${secret}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok:false, error:'Method not allowed' });
  }

  if (!authorized(req)) {
    return res.status(401).json({ ok:false, error:'Unauthorized' });
  }

  try {
    const [nfl, mlb] = await Promise.all([
      runSharp('NFL', req),
      runSharp('MLB', req),
    ]);

    return res.status(200).json({
      ok: true,
      checkedAt: new Date().toISOString(),
      nfl,
      mlb,
    });
  } catch (error) {
    return res.status(500).json({
      ok:false,
      error:error instanceof Error ? error.message : 'Daily sharp scan failed',
    });
  }
}
