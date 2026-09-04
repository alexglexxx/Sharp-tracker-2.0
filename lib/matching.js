function clean(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokens(value) { return clean(value).split(' ').filter(Boolean); }

export function sameTeam(a, b) {
  const aa = clean(a), bb = clean(b);
  if (!aa || !bb) return false;
  if (aa === bb) return true;
  const at = tokens(aa), bt = tokens(bb);
  const aset = new Set(at), bset = new Set(bt);
  const overlap = at.filter(t => bset.has(t)).length;
  return overlap >= Math.min(2, Math.min(aset.size, bset.size));
}

export function sameGame(a, b) {
  return (sameTeam(a.away, b.away) && sameTeam(a.home, b.home)) ||
         (sameTeam(a.away, b.home) && sameTeam(a.home, b.away));
}
