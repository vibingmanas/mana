export type FairPriceLabel = 'UNDERPRICED' | 'FAIR' | 'OVERPRICED';

export interface FairPrice {
  label: FairPriceLabel;
  /** Signed % the asking price sits above (+) or below (-) fair value. Admin-only. */
  deviationPct: number;
  fair: number;
  /** Suggested buyer negotiation band (fair −5% .. fair). */
  negotiationLow: number;
  negotiationTarget: number;
}

// Asking within ±10% of fair = Fair; beyond = Under/Overpriced.
const BAND = 10;

export function fairPrice(price: number | null, fair: number | null): FairPrice | null {
  if (!price || !fair || fair <= 0) return null;
  const deviationPct = Math.round(((price - fair) / fair) * 1000) / 10;
  const label: FairPriceLabel =
    deviationPct < -BAND ? 'UNDERPRICED' : deviationPct > BAND ? 'OVERPRICED' : 'FAIR';
  return {
    label,
    deviationPct,
    fair,
    negotiationLow: Math.round(fair * 0.95),
    negotiationTarget: fair,
  };
}

export const FAIR_PRICE_LABELS: Record<FairPriceLabel, string> = {
  UNDERPRICED: 'Underpriced',
  FAIR: 'Fair price',
  OVERPRICED: 'Above market',
};
