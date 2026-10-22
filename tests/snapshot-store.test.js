import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSnapshotStore } from '../lib/snapshot-store';

const env = { SUPABASE_URL:'https://example.supabase.co/', SUPABASE_SECRET_KEY:'sb_secret_test' };

function stubFetch(body, status = 200) {
  const fetch = vi.fn(async () => new Response(body === null ? '' : JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

describe('snapshot store', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is disabled when Supabase is not configured', () => {
    expect(createSnapshotStore({})).toBeNull();
    expect(createSnapshotStore({ SUPABASE_URL:env.SUPABASE_URL })).toBeNull();
  });

  it('inserts normalized snapshots with the secret key', async () => {
    const fetch = stubFetch(null, 201);
    const saved = await createSnapshotStore(env).saveSnapshots([{
      league:'NFL', eventId:'evt-1', team:'Atlanta Falcons', bookmaker:'Pinnacle', market:'spreads',
      price:-105, point:3, timestamp:'2026-10-22T12:00:00Z',
    }]);
    expect(saved).toBe(1);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://example.supabase.co/rest/v1/odds_snapshots');
    expect(options.method).toBe('POST');
    expect(options.headers.apikey).toBe('sb_secret_test');
    expect(JSON.parse(options.body)[0]).toMatchObject({ event_id:'evt-1', bookmaker:'pinnacle', price:-105, point:3, captured_at:'2026-10-22T12:00:00.000Z' });
  });

  it('rejects invalid snapshots before writing', async () => {
    const fetch = stubFetch(null, 201);
    await expect(createSnapshotStore(env).saveSnapshots([{ league:'NBA', eventId:'x', team:'y', bookmaker:'pinnacle', market:'h2h', price:-110 }])).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reads openers keyed by event and team', async () => {
    const fetch = stubFetch([{ event_id:'evt-1', team:'Atlanta Falcons', price:-110, point:'3', captured_at:'2026-10-22T10:00:00+00:00' }]);
    const openers = await createSnapshotStore(env).getOpeners({ league:'NFL', bookmaker:'pinnacle', market:'spreads', eventIds:['evt-1', 'evt-2'] });
    const url = decodeURIComponent(fetch.mock.calls[0][0]);
    expect(url).toContain('/rest/v1/odds_openers?');
    expect(url).toContain('event_id=in.("evt-1","evt-2")');
    expect(openers.get('evt-1|Atlanta Falcons')).toMatchObject({ price:-110, point:3, market:'spreads' });
  });

  it('surfaces HTTP errors', async () => {
    stubFetch({ message:'denied' }, 401);
    await expect(createSnapshotStore(env).getOpeners({ league:'NFL', bookmaker:'pinnacle', market:'spreads', eventIds:['evt-1'] })).rejects.toThrow('HTTP 401');
  });
});
