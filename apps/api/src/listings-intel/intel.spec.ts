import { describe, it, expect } from 'vitest';
import { fairPrice } from './fair-price';
import { riskScore } from './risk-score';

describe('fairPrice', () => {
  it('labels within ±10% as FAIR', () => {
    expect(fairPrice(105, 100)?.label).toBe('FAIR');
    expect(fairPrice(95, 100)?.label).toBe('FAIR');
  });
  it('labels >10% above as OVERPRICED, below as UNDERPRICED', () => {
    expect(fairPrice(120, 100)?.label).toBe('OVERPRICED');
    expect(fairPrice(80, 100)?.label).toBe('UNDERPRICED');
  });
  it('returns signed deviation and a negotiation band', () => {
    const fp = fairPrice(120, 100)!;
    expect(fp.deviationPct).toBe(20);
    expect(fp.negotiationLow).toBe(95);
  });
  it('returns null without price or fair', () => {
    expect(fairPrice(null, 100)).toBeNull();
    expect(fairPrice(100, null)).toBeNull();
  });
});

describe('riskScore', () => {
  it('a clean, verified, inspected dealer car scores low', () => {
    const r = riskScore({
      manufactureYear: 2023,
      odometerKm: 20000,
      ownersCount: 1,
      source: 'DEALER',
      accidentFree: true,
      rcVerified: true,
      odometerFraudRisk: 'LOW',
      inspected: true,
    });
    expect(r.band).toBe('LOW');
    expect(r.score).toBeLessThanOrEqual(3);
  });
  it('an old high-mileage unverified auction car scores high', () => {
    const r = riskScore({
      manufactureYear: 2010,
      odometerKm: 250000,
      ownersCount: 5,
      source: 'AUCTION',
      accidentFree: false,
      rcVerified: false,
      odometerFraudRisk: 'HIGH',
      inspected: false,
    });
    expect(r.band).toBe('HIGH');
    expect(r.score).toBeGreaterThanOrEqual(7);
    expect(r.factors.length).toBeGreaterThan(3);
  });
});
