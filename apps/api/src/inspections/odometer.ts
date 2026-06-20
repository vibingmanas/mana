export type FraudRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface OdometerInput {
  declaredKm: number;
  manufactureYear: number | null;
  now?: number; // current year override
  priorReadings?: number[]; // earlier recorded odometer values (history/insurance/PUC)
}

export interface OdometerResult {
  estimatedKm: number;
  fraudRisk: FraudRiskLevel;
  signals: string[];
}

const KM_PER_YEAR = 12000;
const SEVERITY: Record<FraudRiskLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

function escalate(current: FraudRiskLevel, next: FraudRiskLevel): FraudRiskLevel {
  return SEVERITY[next] > SEVERITY[current] ? next : current;
}

/** Heuristic odometer-fraud assessment. See plans/08-trust-inspection.md. */
export function assessOdometer(input: OdometerInput): OdometerResult {
  const currentYear = input.now ?? new Date().getFullYear();
  const age = Math.max(0, currentYear - (input.manufactureYear ?? currentYear));
  const estimatedKm = age * KM_PER_YEAR;
  const signals: string[] = [];
  let risk: FraudRiskLevel = 'LOW';

  // Rollback: any prior recorded reading exceeds the current declared value.
  const maxPrior = input.priorReadings?.length ? Math.max(...input.priorReadings) : null;
  if (maxPrior != null && maxPrior > input.declaredKm) {
    signals.push(
      `Declared ${input.declaredKm} km is below a prior record of ${maxPrior} km (rollback)`,
    );
    risk = escalate(risk, 'HIGH');
  }

  // Implausibly low for the age (possible rollback).
  if (age >= 3 && estimatedKm > 0) {
    const ratio = input.declaredKm / estimatedKm;
    if (ratio < 0.25) {
      signals.push('Mileage far below expected for the vehicle age');
      risk = escalate(risk, 'HIGH');
    } else if (ratio < 0.4) {
      signals.push('Mileage lower than expected for the vehicle age');
      risk = escalate(risk, 'MEDIUM');
    } else if (ratio > 2.2) {
      signals.push('Unusually high mileage for the vehicle age');
      risk = escalate(risk, 'MEDIUM');
    }
  }

  if (signals.length === 0) signals.push('Odometer consistent with vehicle age');
  return { estimatedKm, fraudRisk: risk, signals };
}
