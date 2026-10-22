import { describe, expect, it } from 'vitest';
import { compareToOpener, movedTowardSide, snapshotsFromOdds } from '../lib/line-movement';

const opener = {
  league:'NFL', eventId:'evt-1', team:'Atlanta Falcons', bookmaker:'pinnacle', market:'spreads',
  price:-110, point:3, timestamp:'2026-10-22T10:00:00.000Z',
};
const later = changes => compareToOpener(opener, { ...opener, timestamp:'2026-10-22T16:00:00.000Z', ...changes });

describe('line movement toward a side', () => {
  it('counts fewer points on the spread as movement toward the side', () => {
    expect(movedTowardSide(later({ point:2.5 }), 'spreads')).toBe(true);
  });

  it('never counts a line that moved away, even if the price moved toward the side', () => {
    expect(movedTowardSide(later({ point:3.5, price:-125 }), 'spreads')).toBe(false);
  });

  it('counts a higher implied probability at the same line', () => {
    expect(movedTowardSide(later({ price:-120 }), 'spreads')).toBe(true);
  });

  it('ignores price changes below the noise threshold', () => {
    expect(movedTowardSide(later({ price:-112 }), 'spreads')).toBe(false);
  });

  it('reads moneyline movement from implied probability', () => {
    const ml = { ...opener, market:'h2h', point:null, price:130 };
    const shortened = compareToOpener(ml, { ...ml, timestamp:'2026-10-22T16:00:00.000Z', price:115 });
    const drifted = compareToOpener(ml, { ...ml, timestamp:'2026-10-22T16:00:00.000Z', price:145 });
    expect(movedTowardSide(shortened, 'h2h')).toBe(true);
    expect(movedTowardSide(drifted, 'h2h')).toBe(false);
  });

  it('treats missing or invalid openers as no movement', () => {
    expect(compareToOpener(null, opener)).toBeNull();
    expect(compareToOpener({ ...opener, price:0 }, opener)).toBeNull();
    expect(movedTowardSide(null, 'spreads')).toBe(false);
  });
});

describe('snapshots from odds', () => {
  it('builds one Pinnacle snapshot per outcome and skips games without an id', () => {
    const games = [
      { id:'evt-1', away:'Atlanta Falcons', home:'Carolina Panthers', commenceTime:'2026-10-25T17:00:00Z', raw:{ bookmakers:[
        { key:'pinnacle', markets:[{ key:'spreads', outcomes:[{ name:'Atlanta Falcons', price:-105, point:3 }, { name:'Carolina Panthers', price:-115, point:-3 }] }] },
        { key:'draftkings', markets:[{ key:'spreads', outcomes:[{ name:'Atlanta Falcons', price:-110, point:3 }] }] },
      ] } },
      { away:'A', home:'B', raw:{ bookmakers:[{ key:'pinnacle', markets:[{ key:'spreads', outcomes:[{ name:'A', price:-110, point:1 }] }] }] } },
    ];
    const rows = snapshotsFromOdds(games, 'NFL', '2026-10-22T12:00:00.000Z');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ eventId:'evt-1', team:'Atlanta Falcons', bookmaker:'pinnacle', market:'spreads', price:-105, point:3 });
  });
});
