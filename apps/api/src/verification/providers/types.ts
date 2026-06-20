import type { CheckType } from '@mana/db';

export type NormalizedStatus = 'SUCCESS' | 'FAILED' | 'MANUAL_REVIEW';

export interface NormalizedResult {
  status: NormalizedStatus;
  /** Provider-agnostic fields (e.g. { name, gstStatus, insuranceValidTill }). */
  fields: Record<string, unknown>;
  confidence?: number;
  provider: string;
}

export interface VerifyInput {
  /** Free-form payload per check type (phone, pan, gstin, regNumber, account+ifsc, etc.). */
  [key: string]: unknown;
}

/** A pluggable verification provider. Multiple providers can support a check type. */
export interface VerificationProvider {
  readonly name: string;
  supports(checkType: CheckType): boolean;
  verify(checkType: CheckType, input: VerifyInput): Promise<NormalizedResult>;
}

export const VERIFICATION_PROVIDERS = Symbol('VERIFICATION_PROVIDERS');
