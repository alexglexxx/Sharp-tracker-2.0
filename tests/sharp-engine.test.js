import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/providers', async (importOriginal) => ({
  ...(await importOriginal()),
  getOdds: vi.fn(),
  getVsin: vi.fn(),
  getActionNetwork: vi.fn(),
}));

import { getActionNetwork, getOdds, getVsin } from '../lib/providers';
import { runSharp } from '../lib/sharp-engine';

const away = 'New York Yankees';
const home = 'Boston Red Sox';

function oddsWithPinnacle() {
  return {
    available:true,
    source:'odds-api',
    games:[{
      league:'MLB', id:'evt-1', away, home, commenceTime:'2026-10-22T23:00:00Z', sides:[],
      raw:{
        id:'evt-1',
        bookmakers:[{
          key:'pinnacle',
          markets:[{ key:'h2h', outcomes:[{ name:away, price:-150 }, { name:home, price:130 }] }],
        }],
      },
    }],
  };
}

function splits(source, awaySplit, homeSplit) {
  return {
    available:true,
    source,
    games:[{
      league:'MLB', away, home,
      sides:[
        { team:away, source, ...awaySplit },
        { team:home, source, ...homeSplit },
      ],
    }],
  };
}

describe('sharp engine', () => {
  beforeEach(() => {
    getOdds.mockResolvedValue(oddsWithPinnacle());
  });

  it('alerts only the money-heavy side and never the public side', async () => {
    getVsin.mockResolvedValue(splits('vsin', { tickets:72, money:40 }, { tickets:28, money:60 }));
    getActionNetwork.mockResolvedValue(splits('action-network', { tickets:70, money:45 }, { tickets:30, money:55 }));

    const result = await runSharp('MLB');

    expect(result.alerts.map(a => a.team)).toEqual([home]);
    expect(result.alerts[0].label).toBe('SHARP_FLOW');
    expect(result.alerts[0].evidence).toContain('independent public-split agreement');
  });

  it('does not count a source pointing the other way as agreement', async () => {
    getVsin.mockResolvedValue(splits('vsin', { tickets:72, money:40 }, { tickets:28, money:60 }));
    getActionNetwork.mockResolvedValue(splits('action-network', { tickets:40, money:70 }, { tickets:60, money:30 }));

    const result = await runSharp('MLB');

    expect(result.alerts.map(a => a.team)).toEqual([home]);
    expect(result.alerts[0].evidence).not.toContain('independent public-split agreement');
  });

  it('treats the NFL side receiving points as the underdog', async () => {
    const bills = 'Buffalo Bills';
    const dolphins = 'Miami Dolphins';
    getOdds.mockResolvedValue({
      available:true,
      source:'odds-api',
      games:[{
        league:'NFL', id:'evt-2', away:bills, home:dolphins, sides:[],
        raw:{
          id:'evt-2',
          bookmakers:[{
            key:'pinnacle',
            markets:[{ key:'spreads', outcomes:[
              { name:bills, price:-110, point:-3 },
              { name:dolphins, price:-110, point:3 },
            ] }],
          }],
        },
      }],
    });
    getVsin.mockResolvedValue({
      available:true,
      source:'vsin',
      games:[{ league:'NFL', away:bills, home:dolphins, sides:[
        { team:bills, source:'vsin', tickets:70, money:40 },
        { team:dolphins, source:'vsin', tickets:30, money:60 },
      ] }],
    });
    getActionNetwork.mockResolvedValue({ available:false, source:'action-network', games:[] });

    const result = await runSharp('NFL');

    expect(result.alerts.map(a => a.team)).toEqual([dolphins]);
    expect(result.alerts[0].isUnderdog).toBe(true);
    expect(result.alerts[0].evidence).toContain('underdog receiving disproportionately higher money');
    expect(result.alerts[0].evidence).not.toContain('handicap market');
  });

  it('caps a single split source at SHARP_WATCH without line movement', async () => {
    getVsin.mockResolvedValue(splits('vsin', { tickets:72, money:40 }, { tickets:28, money:60 }));
    getActionNetwork.mockResolvedValue({ available:false, source:'action-network', games:[] });

    const result = await runSharp('MLB', undefined, { store:null });

    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]).toMatchObject({ team:home, label:'SHARP_WATCH', confirmations:0, movement:null });
    expect(result.sources.snapshots.available).toBe(false);
  });

  it('upgrades to SHARP_FLOW when Pinnacle moved toward the side since the opener', async () => {
    getVsin.mockResolvedValue(splits('vsin', { tickets:72, money:40 }, { tickets:28, money:60 }));
    getActionNetwork.mockResolvedValue({ available:false, source:'action-network', games:[] });
    const store = {
      getOpeners: vi.fn(async () => new Map([[`evt-1|${home}`, {
        league:'MLB', eventId:'evt-1', team:home, bookmaker:'pinnacle', market:'h2h',
        price:150, point:null, timestamp:'2026-10-22T10:00:00.000Z',
      }]])),
    };

    const result = await runSharp('MLB', undefined, { store });

    expect(store.getOpeners).toHaveBeenCalledWith({ league:'MLB', bookmaker:'pinnacle', market:'h2h', eventIds:['evt-1'] });
    expect(result.alerts[0]).toMatchObject({ team:home, label:'SHARP_FLOW', confirmations:1 });
    expect(result.alerts[0].evidence).toContain('market movement agrees with flow');
    expect(result.alerts[0].movement).toMatchObject({ openPrice:150, priceDelta:-20, towardSide:true });
    expect(result.sources.snapshots).toEqual({ available:true, openers:1 });
  });

  it('keeps running without movement when the snapshot store fails', async () => {
    getVsin.mockResolvedValue(splits('vsin', { tickets:72, money:40 }, { tickets:28, money:60 }));
    getActionNetwork.mockResolvedValue({ available:false, source:'action-network', games:[] });
    const store = { getOpeners: vi.fn(async () => { throw new Error('HTTP 503'); }) };

    const result = await runSharp('MLB', undefined, { store });

    expect(result.ok).toBe(true);
    expect(result.alerts[0].label).toBe('SHARP_WATCH');
    expect(result.sources.snapshots).toEqual({ available:false, error:'HTTP 503' });
  });

  it('returns no alerts when splits show no meaningful divergence', async () => {
    getVsin.mockResolvedValue(splits('vsin', { tickets:52, money:50 }, { tickets:48, money:50 }));
    getActionNetwork.mockResolvedValue({ available:false, source:'action-network', games:[] });

    const result = await runSharp('MLB');

    expect(result.ok).toBe(true);
    expect(result.alerts).toEqual([]);
  });
});
