import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CheckType } from '@mana/db';
import { SurepassKycProvider } from './surepass-kyc.provider';

describe('SurepassKycProvider', () => {
  beforeEach(() => {
    process.env.KYC_PROVIDER_API_KEY = 'test-key';
    process.env.KYC_PROVIDER_BASE_URL = 'https://kyc.example';
  });
  afterEach(() => {
    delete process.env.KYC_PROVIDER_API_KEY;
    vi.restoreAllMocks();
  });

  it('is configured when the key is set', () => {
    expect(SurepassKycProvider.isConfigured()).toBe(true);
  });

  it('supports KYC + vehicle checks but not Aadhaar', () => {
    const p = new SurepassKycProvider();
    expect(p.supports(CheckType.PAN)).toBe(true);
    expect(p.supports(CheckType.VEHICLE_RC)).toBe(true);
    expect(p.supports(CheckType.AADHAAR)).toBe(false);
  });

  it('normalizes a successful PAN response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { full_name: 'RAVI KUMAR' } }),
      }),
    );
    const p = new SurepassKycProvider();
    const r = await p.verify(CheckType.PAN, { pan: 'ABCDE1234F' });
    expect(r.status).toBe('SUCCESS');
    expect(r.fields.name).toBe('RAVI KUMAR');
    expect(r.provider).toBe('surepass');
  });

  it('maps RC fields incl. hypothecation from financer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            owner_name: 'OWNER',
            rc_status: 'ACTIVE',
            fuel_type: 'Petrol',
            financer: 'HDFC Bank',
          },
        }),
      }),
    );
    const r = await new SurepassKycProvider().verify(CheckType.VEHICLE_RC, {
      regNumber: 'MH12AB1234',
    });
    expect(r.status).toBe('SUCCESS');
    expect(r.fields.hypothecationActive).toBe(true);
    expect(r.fields.financerName).toBe('HDFC Bank');
  });

  it('returns FAILED on an unsuccessful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, message: 'invalid id' }),
      }),
    );
    const r = await new SurepassKycProvider().verify(CheckType.GST, { gstin: 'BAD' });
    expect(r.status).toBe('FAILED');
  });
});
