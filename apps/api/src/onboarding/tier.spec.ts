import { describe, it, expect } from 'vitest';
import { VerificationTier } from '@mana/db';
import { computeTier } from './tier';

const D = new Date();
const none = {
  emailVerifiedAt: null,
  phoneVerifiedAt: null,
  aadhaarVerifiedAt: null,
  panVerifiedAt: null,
  gstVerifiedAt: null,
  bankVerifiedAt: null,
};

describe('computeTier', () => {
  it('T0 when email + phone verified', () => {
    expect(computeTier({ ...none, emailVerifiedAt: D, phoneVerifiedAt: D })).toBe(
      VerificationTier.T0,
    );
  });

  it('stays T0 without aadhaar+pan even if phone+email done', () => {
    expect(computeTier({ ...none, emailVerifiedAt: D, phoneVerifiedAt: D, panVerifiedAt: D })).toBe(
      VerificationTier.T0,
    );
  });

  it('T1 when identity (aadhaar + pan) added', () => {
    expect(
      computeTier({
        ...none,
        emailVerifiedAt: D,
        phoneVerifiedAt: D,
        aadhaarVerifiedAt: D,
        panVerifiedAt: D,
      }),
    ).toBe(VerificationTier.T1);
  });

  it('T2 when business (gst + bank) added', () => {
    expect(
      computeTier({
        emailVerifiedAt: D,
        phoneVerifiedAt: D,
        aadhaarVerifiedAt: D,
        panVerifiedAt: D,
        gstVerifiedAt: D,
        bankVerifiedAt: D,
      }),
    ).toBe(VerificationTier.T2);
  });

  it('not T2 if only gst (missing bank)', () => {
    expect(
      computeTier({
        ...none,
        emailVerifiedAt: D,
        phoneVerifiedAt: D,
        aadhaarVerifiedAt: D,
        panVerifiedAt: D,
        gstVerifiedAt: D,
      }),
    ).toBe(VerificationTier.T1);
  });
});
