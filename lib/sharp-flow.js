export function divergence(tickets, money) {
  if (!Number.isFinite(tickets) || !Number.isFinite(money)) return null;
  return tickets - money;
}

function evidenceWeight(absDivergence) {
  if (absDivergence >= 30) return 40;
  if (absDivergence >= 20) return 30;
  if (absDivergence >= 12) return 20;
  if (absDivergence >= 8) return 10;
  return 0;
}

export function analyzeSharpFlow({
  tickets,
  money,
  sourceCount = 0,
  agreeingSources = 0,
  isUnderdog = false,
  underdogMagnitude = null,
  isHandicap = false,
  marketMovedTowardSide = false,
}) {
  const d = divergence(tickets, money);

  if (d === null) {
    return {
      label: 'INSUFFICIENT_EVIDENCE',
      score: 0,
      divergence: null,
      evidence: [],
    };
  }

  const evidence = [];
  let score = evidenceWeight(Math.abs(d));

  if (Math.abs(d) >= 8) evidence.push(`public-money divergence ${d.toFixed(1)} points`);
  if (agreeingSources >= 2) {
    score += 15;
    evidence.push('independent public-split agreement');
  } else if (sourceCount >= 2) {
    evidence.push('multiple sources available');
  }

  if (isUnderdog && d < 0) {
    score += 15;
    evidence.push('underdog receiving disproportionately higher money');
  }

  if (isUnderdog && Number.isFinite(underdogMagnitude)) {
    if (underdogMagnitude >= 150) {
      score += 10;
      evidence.push('large underdog price');
    } else if (underdogMagnitude >= 100) {
      score += 5;
      evidence.push('meaningful underdog price');
    }
  }

  if (isHandicap) {
    score += 5;
    evidence.push('handicap market');
  }

  if (marketMovedTowardSide) {
    score += 15;
    evidence.push('market movement agrees with flow');
  }

  score = Math.min(100, score);

  let label = 'NO_SHARP_FLOW';
  if (score >= 75) label = 'SHARP_FLOW';
  else if (score >= 50) label = 'SHARP_WATCH';

  return {
    label,
    score,
    divergence: d,
    evidence,
  };
}
