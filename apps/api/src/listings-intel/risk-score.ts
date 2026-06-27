export type RiskBand = 'LOW' | 'MODERATE' | 'HIGH';

export interface RiskFactor {
  key: string;
  label: string;
  points: number; // positive = adds risk
}
export interface RiskResult {
  score: number; // 1..10, lower = safer
  band: RiskBand;
  factors: RiskFactor[];
}

export interface RiskInput {
  manufactureYear?: number | null;
  odometerKm?: number | null;
  ownersCount?: number | null;
  source?: string | null; // DEALER | INDIVIDUAL | AUCTION | PLATFORM
  accidentFree?: boolean | null;
  accidentClaims?: number | null;
  rcVerified?: boolean;
  odometerFraudRisk?: string | null; // LOW | MEDIUM | HIGH
  inspected?: boolean;
  city?: string | null;
}

const NOW_YEAR = 2026;

/**
 * Heuristic risk model (1..10, lower = safer). Starts from a clean base and adds
 * points for risk signals; ML can replace this later behind the same interface.
 */
export function riskScore(v: RiskInput): RiskResult {
  const factors: RiskFactor[] = [];
  const add = (key: string, label: string, points: number) => {
    if (points > 0) factors.push({ key, label, points });
  };

  const age = v.manufactureYear ? Math.max(0, NOW_YEAR - v.manufactureYear) : null;
  const kmPerYear = age && age > 0 && v.odometerKm ? v.odometerKm / age : null;

  // Usage intensity.
  if (kmPerYear != null) {
    if (kmPerYear > 25000) add('km_per_year', 'Very high yearly mileage', 2);
    else if (kmPerYear > 18000) add('km_per_year', 'High yearly mileage', 1);
  } else if (v.odometerKm == null) {
    add('km_missing', 'Odometer not provided', 1);
  }

  // Ownership.
  const owners = v.ownersCount ?? null;
  if (owners != null) {
    if (owners >= 4) add('owners', '4+ previous owners', 2);
    else if (owners === 3) add('owners', '3 previous owners', 1);
  } else {
    add('owners_missing', 'Ownership count unknown', 1);
  }

  // Age.
  if (age != null && age >= 12) add('age', 'Over 12 years old', 2);
  else if (age != null && age >= 8) add('age', 'Older vehicle (8+ yrs)', 1);

  // Accident signal.
  if (v.accidentFree === false || (v.accidentClaims ?? 0) > 0) {
    add('accident', 'Accident / insurance claim on record', 2);
  } else if (v.accidentFree == null) {
    add('accident_unknown', 'Accident history not verified', 1);
  }

  // Source / seller trust.
  if (v.source === 'AUCTION') add('source', 'Auction / seized vehicle', 2);
  else if (v.source === 'INDIVIDUAL') add('source', 'Private individual seller', 1);

  // Documentation + tamper.
  if (!v.rcVerified) add('rc', 'RC not verified against VAHAN', 2);
  if (v.odometerFraudRisk === 'HIGH') add('odo_fraud', 'Odometer tamper suspected', 3);
  else if (v.odometerFraudRisk === 'MEDIUM') add('odo_fraud', 'Odometer reading inconsistent', 1);
  if (!v.inspected) add('inspection', 'No physical inspection on record', 1);

  const raw = factors.reduce((s, f) => s + f.points, 0);
  // Clamp into 1..10 (1 = pristine).
  const score = Math.max(1, Math.min(10, 1 + raw));
  const band: RiskBand = score <= 3 ? 'LOW' : score <= 6 ? 'MODERATE' : 'HIGH';
  return { score, band, factors };
}

export const RISK_BAND_LABEL: Record<RiskBand, string> = {
  LOW: 'Low risk',
  MODERATE: 'Moderate risk',
  HIGH: 'High risk',
};
