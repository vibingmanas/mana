import { describe, it, expect } from 'vitest';
import { listingLimitReached, gstBreakup, DEFAULT_PLANS } from './billing-rules';

describe('listingLimitReached', () => {
  it('blocks at the limit', () => {
    expect(listingLimitReached(3, 3)).toBe(true);
    expect(listingLimitReached(2, 3)).toBe(false);
  });
  it('unlimited (-1) never blocks', () => {
    expect(listingLimitReached(9999, -1)).toBe(false);
  });
});

describe('gstBreakup', () => {
  it('adds 18% GST', () => {
    expect(gstBreakup(1999)).toEqual({ base: 1999, gst: 360, total: 2359 });
  });
  it('zero base = zero total', () => {
    expect(gstBreakup(0)).toEqual({ base: 0, gst: 0, total: 0 });
  });
});

describe('DEFAULT_PLANS', () => {
  it('has starter/growth/pro with ascending price', () => {
    const keys = DEFAULT_PLANS.map((p) => p.key);
    expect(keys).toEqual(['starter', 'growth', 'pro']);
    expect(DEFAULT_PLANS[0]!.priceMonthly).toBeLessThan(DEFAULT_PLANS[2]!.priceMonthly);
  });
});
