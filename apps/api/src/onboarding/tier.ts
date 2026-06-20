import { VerificationTier, type DealerKYC } from '@mana/db';

export interface TierInputs {
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  aadhaarVerifiedAt: Date | null;
  panVerifiedAt: Date | null;
  gstVerifiedAt: Date | null;
  bankVerifiedAt: Date | null;
}

/**
 * Computes the verification tier from KYC completion. T3 (Mana Certified) is
 * granted by admin (premises check + agreement), not derived here.
 * See plans/01-vendor-onboarding.md.
 */
export function computeTier(kyc: TierInputs): VerificationTier {
  const t0 = !!kyc.emailVerifiedAt && !!kyc.phoneVerifiedAt;
  const t1 = t0 && !!kyc.aadhaarVerifiedAt && !!kyc.panVerifiedAt;
  const t2 = t1 && !!kyc.gstVerifiedAt && !!kyc.bankVerifiedAt;
  if (t2) return VerificationTier.T2;
  if (t1) return VerificationTier.T1;
  return VerificationTier.T0;
}

const STEP_FLAGS: Array<[keyof TierInputs, string]> = [
  ['phoneVerifiedAt', 'phone'],
  ['emailVerifiedAt', 'email'],
  ['aadhaarVerifiedAt', 'aadhaar'],
  ['panVerifiedAt', 'pan'],
  ['gstVerifiedAt', 'gst'],
  ['bankVerifiedAt', 'bank'],
];

export function completedSteps(kyc: DealerKYC): string[] {
  return STEP_FLAGS.filter(([k]) => kyc[k] != null).map(([, name]) => name);
}

export function nextStep(kyc: DealerKYC): string | null {
  const next = STEP_FLAGS.find(([k]) => kyc[k] == null);
  return next ? next[1] : null;
}
