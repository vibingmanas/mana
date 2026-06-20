import { describe, it, expect } from 'vitest';
import { computeEmi, decideEligibility } from './emi';

describe('computeEmi', () => {
  it('computes a known EMI (₹5L, 12%, 60mo ≈ 11122)', () => {
    const r = computeEmi(500000, 0, 12, 60);
    expect(r.monthlyEmi).toBeGreaterThan(11000);
    expect(r.monthlyEmi).toBeLessThan(11200);
    expect(r.totalInterest).toBeGreaterThan(0);
  });

  it('subtracts the down payment from the principal', () => {
    expect(computeEmi(500000, 100000, 12, 60).loanAmount).toBe(400000);
  });

  it('handles 0% interest as straight division', () => {
    expect(computeEmi(120000, 0, 0, 12).monthlyEmi).toBe(10000);
  });
});

describe('decideEligibility', () => {
  it('approves a sensible application', () => {
    expect(
      decideEligibility({ price: 500000, downPayment: 100000, tenureMonths: 60 }).approved,
    ).toBe(true);
  });
  it('rejects low down payment', () => {
    const d = decideEligibility({ price: 500000, downPayment: 10000, tenureMonths: 60 });
    expect(d.approved).toBe(false);
    expect(d.reason).toMatch(/down payment/i);
  });
  it('rejects out-of-range tenure', () => {
    expect(
      decideEligibility({ price: 500000, downPayment: 100000, tenureMonths: 6 }).approved,
    ).toBe(false);
  });
  it('rejects an oversized loan', () => {
    expect(
      decideEligibility({ price: 3000000, downPayment: 300000, tenureMonths: 60 }).approved,
    ).toBe(false);
  });
});
