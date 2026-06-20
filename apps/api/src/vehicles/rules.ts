export interface PublishCheck {
  tierOk: boolean;
  rcVerified: boolean;
  photoCount: number;
  hasPrice: boolean;
  odometerHighRisk?: boolean;
}

/** Returns the first reason a listing cannot go live, or null if it can. */
export function publishBlocker(c: PublishCheck): string | null {
  if (!c.tierOk) return 'Requires verification tier T1';
  if (!c.rcVerified) return 'Verify the RC before publishing';
  if (c.photoCount < 1) return 'Add at least one photo before publishing';
  if (!c.hasPrice) return 'Set a price before publishing';
  if (c.odometerHighRisk) return 'High odometer-fraud risk — resolve before publishing';
  return null;
}
