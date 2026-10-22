import { runSharp } from '../../lib/sharp-engine';
import { hasCronSecret } from '../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok:false, error:'Method not allowed' });
  }

  if (!hasCronSecret(req)) {
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
