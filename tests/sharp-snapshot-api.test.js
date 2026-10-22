import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/providers', async (importOriginal) => ({
  ...(await importOriginal()),
  getOdds: vi.fn(),
}));

import { getOdds } from '../lib/providers';
import handler from '../pages/api/sharp-snapshot';

function mockRes() {
  return {
    statusCode:null,
    body:null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

const authorized = { method:'GET', headers:{ authorization:'Bearer test-secret' } };

describe('sharp-snapshot endpoint', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('requires the cron secret and spends no Odds API requests without it', async () => {
    const res = mockRes();
    await handler({ method:'GET', headers:{} }, res);
    expect(res.statusCode).toBe(401);
    expect(getOdds).not.toHaveBeenCalled();
  });

  it('refuses to run without storage configured', async () => {
    delete process.env.SUPABASE_SECRET_KEY;
    const res = mockRes();
    await handler(authorized, res);
    expect(res.statusCode).toBe(503);
    expect(getOdds).not.toHaveBeenCalled();
  });

  it('stores Pinnacle lines for both leagues', async () => {
    getOdds.mockImplementation(async (league) => ({
      available:true,
      source:'odds-api',
      games:league === 'NFL' ? [{ id:'evt-1', away:'Atlanta Falcons', home:'Carolina Panthers', raw:{ bookmakers:[
        { key:'pinnacle', markets:[{ key:'spreads', outcomes:[{ name:'Atlanta Falcons', price:-105, point:3 }, { name:'Carolina Panthers', price:-115, point:-3 }] }] },
      ] } }] : [],
    }));
    const fetch = vi.fn(async () => new Response('', { status:201 }));
    vi.stubGlobal('fetch', fetch);

    const res = mockRes();
    await handler(authorized, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.results).toEqual({
      NFL:{ ok:true, games:1, saved:2 },
      MLB:{ ok:true, games:0, saved:0 },
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
