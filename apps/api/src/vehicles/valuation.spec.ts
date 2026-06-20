import { describe, it, expect } from 'vitest';
import { estimateValuation, dealScore, dealLabel } from './valuation';

describe('estimateValuation', () => {
  it('depreciates a known model with age', () => {
    const newer = estimateValuation({
      make: 'Maruti Suzuki',
      model: 'Swift',
      manufactureYear: 2023,
      odometerKm: 12000,
      now: 2026,
    });
    const older = estimateValuation({
      make: 'Maruti Suzuki',
      model: 'Swift',
      manufactureYear: 2016,
      odometerKm: 120000,
      now: 2026,
    });
    expect(newer.fair).toBeGreaterThan(older.fair);
    expect(newer.low).toBeLessThan(newer.fair);
    expect(newer.high).toBeGreaterThan(newer.fair);
  });

  it('has higher confidence for known models', () => {
    const known = estimateValuation({
      make: 'Hyundai',
      model: 'i20',
      manufactureYear: 2022,
      odometerKm: 30000,
      now: 2026,
    });
    const unknown = estimateValuation({
      make: 'Obscure',
      model: 'Model',
      manufactureYear: 2022,
      odometerKm: 30000,
      now: 2026,
    });
    expect(known.confidence).toBeGreaterThan(unknown.confidence);
  });

  it('penalizes excess kilometres', () => {
    const low = estimateValuation({
      make: 'Honda',
      model: 'City',
      manufactureYear: 2020,
      odometerKm: 60000,
      now: 2026,
    });
    const high = estimateValuation({
      make: 'Honda',
      model: 'City',
      manufactureYear: 2020,
      odometerKm: 150000,
      now: 2026,
    });
    expect(low.fair).toBeGreaterThan(high.fair);
  });

  it('never goes below a floor', () => {
    const v = estimateValuation({
      make: 'Maruti Suzuki',
      model: 'Swift',
      manufactureYear: 2005,
      odometerKm: 300000,
      now: 2026,
    });
    expect(v.fair).toBeGreaterThan(0);
  });
});

describe('dealScore / dealLabel', () => {
  it('positive when priced below fair', () => {
    expect(dealScore(500000, 600000)).toBeGreaterThan(0);
    expect(dealLabel(dealScore(500000, 600000))).toBe('Great deal');
  });
  it('negative when priced above fair', () => {
    expect(dealScore(700000, 600000)).toBeLessThan(0);
    expect(dealLabel(dealScore(700000, 600000))).toBe('Above market');
  });
  it('near zero is a fair price', () => {
    expect(dealLabel(dealScore(600000, 600000))).toBe('Fair price');
  });
});
