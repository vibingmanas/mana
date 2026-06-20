export interface PlanSeed {
  key: string;
  name: string;
  priceMonthly: number;
  listingLimit: number; // -1 = unlimited
  leadLimit: number;
  features: string[];
}

// Illustrative pricing — validate with real dealers (plans/12-monetization.md).
export const DEFAULT_PLANS: PlanSeed[] = [
  {
    key: 'starter',
    name: 'Starter',
    priceMonthly: 0,
    listingLimit: 3,
    leadLimit: -1,
    features: ['Up to 3 live listings', 'Web leads', 'Basic DMS'],
  },
  {
    key: 'growth',
    name: 'Growth',
    priceMonthly: 1999,
    listingLimit: 25,
    leadLimit: -1,
    features: ['25 live listings', 'WhatsApp leads', 'Pricing intelligence', 'Verified badge'],
  },
  {
    key: 'pro',
    name: 'Pro',
    priceMonthly: 4999,
    listingLimit: -1,
    leadLimit: -1,
    features: ['Unlimited listings', 'Priority placement', 'Floor-plan eligibility', 'Analytics'],
  },
];

export const STARTER_LISTING_LIMIT = 3;

/** True when a dealer at `limit` (>=0) already has `liveCount` live listings. */
export function listingLimitReached(liveCount: number, limit: number): boolean {
  return limit >= 0 && liveCount >= limit;
}

export interface GstBreakup {
  base: number;
  gst: number;
  total: number;
}

/** GST breakup on a base amount (default 18%). */
export function gstBreakup(base: number, ratePct = 18): GstBreakup {
  const gst = Math.round((base * ratePct) / 100);
  return { base, gst, total: base + gst };
}
