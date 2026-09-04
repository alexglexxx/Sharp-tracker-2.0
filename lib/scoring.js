export function scoreSignal({ vsin, action, marketMovement, sampleQuality = 0 }) {
  let score = 0; const evidence = [];
  const sources = [vsin, action].filter(Boolean).filter(x => x.tickets !== null && x.money !== null);
  for (const s of sources) {
    const d = Math.abs(s.tickets - s.money);
    if (d >= 20) { score += 25; evidence.push(`${s.source} divergence ${d.toFixed(0)}`); }
    else if (d >= 12) { score += 18; evidence.push(`${s.source} divergence ${d.toFixed(0)}`); }
    else if (d >= 8) { score += 10; evidence.push(`${s.source} divergence ${d.toFixed(0)}`); }
  }
  if (vsin && action && vsin.tickets !== null && action.tickets !== null) {
    const sameDirection = (vsin.tickets - vsin.money) * (action.tickets - action.money) > 0;
    if (sameDirection) { score += 15; evidence.push('cross-source agreement'); }
  }
  if (marketMovement?.lineMoved) { score += 15; evidence.push('Pinnacle line movement'); }
  if (marketMovement?.priceMoved) { score += 10; evidence.push('Pinnacle price movement'); }
  score += Math.min(10, Math.max(0, sampleQuality));
  const label = score >= 75 ? 'SHARP' : score >= 60 ? 'SHARP_WATCH' : score >= 40 ? 'INTEREST' : 'NORMAL';
  return { score: Math.min(100, score), label, evidence };
}
