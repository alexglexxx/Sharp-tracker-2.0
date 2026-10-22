import { describe, expect, it } from 'vitest';
import { analyzeSharpFlow } from '../lib/sharp-flow';

describe('SHARP FLOW evidence engine', () => {
  it('does not create a signal without tickets and money', () => {
    expect(analyzeSharpFlow({ tickets:null, money:null }).label).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('identifies strong money divergence on an underdog', () => {
    const result = analyzeSharpFlow({
      tickets:28,
      money:64,
      sourceCount:2,
      agreeingSources:2,
      isUnderdog:true,
      underdogMagnitude:190,
      isHandicap:true,
    });
    expect(result.divergence).toBe(-36);
    expect(result.label).toBe('SHARP_FLOW');
    expect(result.score).toBeGreaterThanOrEqual(75);
  });

  it('does not award underdog money bonus when tickets exceed money', () => {
    const result = analyzeSharpFlow({
      tickets:64,
      money:28,
      isUnderdog:true,
      underdogMagnitude:190,
    });
    expect(result.evidence).not.toContain('underdog receiving disproportionately higher money');
  });

  it('never signals the public side, even with large divergence and agreement', () => {
    const result = analyzeSharpFlow({
      tickets:70,
      money:40,
      sourceCount:2,
      agreeingSources:2,
    });
    expect(result.label).toBe('NO_SHARP_FLOW');
    expect(result.score).toBe(0);
  });
});
