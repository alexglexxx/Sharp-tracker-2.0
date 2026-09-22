function clean(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function tokens(value) {
  return clean(value).split(' ').filter(Boolean);
}

const ALIASES = new Map([
  ['ny yankees', 'new york yankees'],
  ['ny mets', 'new york mets'],
  ['la dodgers', 'los angeles dodgers'],
  ['la angels', 'los angeles angels'],
  ['sf giants', 'san francisco giants'],
  ['kc royals', 'kansas city royals'],
  ['tb rays', 'tampa bay rays'],
  ['sd padres', 'san diego padres'],
  ['st louis cardinals', 'st louis cardinals'],
  ['sf 49ers', 'san francisco 49ers'],
  ['ny giants', 'new york giants'],
  ['ny jets', 'new york jets'],
  ['ny jets', 'new york jets'],
  ['tb buccaneers', 'tampa bay buccaneers'],
  ['kc chiefs', 'kansas city chiefs'],
  ['ne patriots', 'new england patriots'],
  ['gb packers', 'green bay packers'],
  ['no saints', 'new orleans saints'],
  ['lv raiders', 'las vegas raiders'],
  ['la rams', 'los angeles rams'],
  ['la chargers', 'los angeles chargers'],
]);

function canonical(value) {
  const c = clean(value);
  return ALIASES.get(c) || c;
}

function isSafeNicknameMatch(a, b) {
  const aa = tokens(a);
  const bb = tokens(b);
  if (aa.length === 1 && bb.length > 1) {
    return aa[0].length >= 4 && bb[bb.length - 1] === aa[0];
  }
  if (bb.length === 1 && aa.length > 1) {
    return bb[0].length >= 4 && aa[aa.length - 1] === bb[0];
  }
  return false;
}

export function sameTeam(a, b) {
  const aa = canonical(a);
  const bb = canonical(b);
  if (!aa || !bb) return false;
  if (aa === bb) return true;

  // Conservative matching: only accept a clear full nickname match.
  // Never match on shared city tokens such as "New York".
  return isSafeNicknameMatch(aa, bb);
}

export function sameGame(a, b) {
  if (!a || !b) return false;
  return (
    (sameTeam(a.away, b.away) && sameTeam(a.home, b.home)) ||
    (sameTeam(a.away, b.home) && sameTeam(a.home, b.away))
  );
}
