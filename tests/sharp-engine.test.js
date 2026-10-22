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

  it('returns no alerts when splits show no meaningful divergence', async () => {
    getVsin.mockResolvedValue(splits('vsin', { tickets:52, money:50 }, { tickets:48, money:50 }));
    getActionNetwork.mockResolvedValue({ available:false, source:'action-network', games:[] });

    const result = await runSharp('MLB');

    expect(result.ok).toBe(true);
    expect(result.alerts).toEqual([]);
  });
});
