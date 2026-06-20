export interface ValuationInput {
  make: string | null;
  model: string | null;
  manufactureYear: number | null;
  odometerKm: number | null;
  now?: number; // current year override (testability)
}

export interface ValuationBand {
  low: number;
  fair: number;
  high: number;
  confidence: number;
}

// Tiny base-price table (ex-showroom-ish, INR) for common models. A real
// implementation would source comps + an OBV-style engine (see plan 10).
const BASE_PRICES: Record<string, number> = {
  'maruti suzuki swift': 700000,
  'maruti suzuki baleno': 750000,
  'maruti suzuki dzire': 800000,
  'hyundai i20': 850000,
  'hyundai creta': 1300000,
  'tata nexon': 1100000,
  'honda city': 1200000,
  'toyota innova': 2000000,
  'kia seltos': 1400000,
  'mahindra xuv500': 1500000,
};
const DEFAULT_BASE = 650000;
const DEPRECIATION_PER_YEAR = 0.85; // retain 85% per year
const EXPECTED_KM_PER_YEAR = 12000;
const EXCESS_KM_PENALTY = 2; // INR per excess km

function baseFor(make: string | null, model: string | null): { base: number; known: boolean } {
  const key = `${make ?? ''} ${model ?? ''}`.toLowerCase().trim().replace(/\s+/g, ' ');
  const base = BASE_PRICES[key];
  return base ? { base, known: true } : { base: DEFAULT_BASE, known: false };
}

export function estimateValuation(input: ValuationInput): ValuationBand {
  const currentYear = input.now ?? new Date().getFullYear();
  const { base, known } = baseFor(input.make, input.model);
  const age = Math.max(0, currentYear - (input.manufactureYear ?? currentYear));

  let value = base * Math.pow(DEPRECIATION_PER_YEAR, age);
  const expectedKm = age * EXPECTED_KM_PER_YEAR;
  const excessKm = (input.odometerKm ?? expectedKm) - expectedKm;
  value -= excessKm * EXCESS_KM_PENALTY;
  value = Math.max(value, base * 0.1);

  const fair = Math.round(value / 1000) * 1000;
  return {
    low: Math.round(fair * 0.92),
    fair,
    high: Math.round(fair * 1.08),
    confidence: known ? 0.7 : 0.4,
  };
}

/** -1..1; positive = priced below fair (good deal), negative = above market. */
export function dealScore(askingPrice: number, fair: number): number {
  if (fair <= 0) return 0;
  const raw = (fair - askingPrice) / fair;
  return Math.max(-1, Math.min(1, Number(raw.toFixed(3))));
}

export function dealLabel(score: number): string {
  if (score >= 0.08) return 'Great deal';
  if (score >= -0.05) return 'Fair price';
  return 'Above market';
}
