import { Injectable } from '@nestjs/common';
import { CheckType } from '@mana/db';
import type { NormalizedResult, VerificationProvider, VerifyInput } from './types';

/**
 * Mock provider covering every check type for local dev / tests.
 * Returns deterministic plausible data so flows can be exercised without
 * real (paid, compliance-gated) provider calls. Selected when
 * VERIFY_PROVIDER_MODE=mock (the default).
 */
@Injectable()
export class MockKycProvider implements VerificationProvider {
  readonly name = 'mock';

  supports(_checkType: CheckType): boolean {
    return true;
  }

  async verify(checkType: CheckType, input: VerifyInput): Promise<NormalizedResult> {
    const base = { provider: this.name, confidence: 0.99 };
    switch (checkType) {
      case CheckType.PAN:
        return { ...base, status: 'SUCCESS', fields: { pan: input.pan, name: 'VERIFIED NAME' } };
      case CheckType.GST:
        return {
          ...base,
          status: 'SUCCESS',
          fields: { gstin: input.gstin, gstStatus: 'Active', legalName: 'VERIFIED TRADERS' },
        };
      case CheckType.BANK:
        return {
          ...base,
          status: 'SUCCESS',
          fields: { accountName: 'VERIFIED NAME', method: 'penny_drop' },
        };
      case CheckType.AADHAAR:
        return {
          ...base,
          status: 'SUCCESS',
          fields: { nameMasked: 'V***** N***', method: 'digilocker' },
        };
      case CheckType.VEHICLE_RC:
        return {
          ...base,
          status: 'SUCCESS',
          fields: {
            rcOwnerName: 'VEHICLE OWNER',
            rcStatus: 'ACTIVE',
            rcMakeModel: 'Maruti Suzuki Swift',
            rcFuel: 'Petrol',
            insuranceValidTill: '2027-03-31',
            insuranceProvider: 'ACKO',
            pucValidTill: '2026-09-30',
            hypothecationActive: false,
          },
        };
      case CheckType.VEHICLE_CHALLAN:
        return { ...base, status: 'SUCCESS', fields: { challanCount: 0, challanTotalAmount: 0 } };
      case CheckType.EMAIL:
      case CheckType.PHONE:
        return { ...base, status: 'SUCCESS', fields: { verified: true } };
      default:
        return { ...base, status: 'MANUAL_REVIEW', fields: {} };
    }
  }
}
