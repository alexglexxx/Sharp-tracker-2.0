import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/providers', async (importOriginal) => ({
  ...(await importOriginal()),
  getOdds: vi.fn(async () => ({ available:true, source:'odds-api', games:[] })),
}));

import { getOdds } from '../lib/providers';
import sourceOdds from '../pages/api/source-odds';

function mockRes() {
  return {
    statusCode:null,
    body:null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('source endpoints', () => {
  beforeEach(() => { process.env.CRON_SECRET = 'test-secret'; });
  afterEach(() => { delete process.env.CRON_SECRET; vi.clearAllMocks(); });

  it('reject requests without the cron secret and never call the provider', async () => {
    const res = mockRes();
    await sourceOdds({ headers:{}, query:{ league:'NFL' } }, res);
    expect(res.statusCode).toBe(401);
    expect(getOdds).not.toHaveBeenCalled();
  });

  it('reject every request when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;
    const res = mockRes();
    await sourceOdds({ headers:{ authorization:'Bearer ' }, query:{} }, res);
    expect(res.statusCode).toBe(401);
  });

  it('serve requests that carry the cron secret', async () => {
    const res = mockRes();
    await sourceOdds({ headers:{ authorization:'Bearer test-secret' }, query:{ league:'NFL' } }, res);
    expect(res.statusCode).toBe(200);
    expect(getOdds).toHaveBeenCalledWith('NFL');
  });
});
