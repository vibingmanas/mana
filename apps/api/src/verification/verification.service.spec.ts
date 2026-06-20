import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckType, VerificationStatus } from '@mana/db';
import { VerificationService } from './verification.service';
import { ProviderRegistry } from './providers/provider.registry';
import { MockKycProvider } from './providers/mock-kyc.provider';
import { VaultService } from './vault.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { ConsentService } from './consent.service';

function makePrisma() {
  const store = new Map<string, any>();
  return {
    _store: store,
    verificationRequest: {
      findUnique: vi.fn(async ({ where }: any) => store.get(where.idempotencyKey) ?? null),
      create: vi.fn(async ({ data }: any) => {
        const row = { id: `vr_${store.size + 1}`, ...data };
        store.set(data.idempotencyKey, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const existing = [...store.values()].find((r) => r.id === where.id);
        const merged = { ...existing, ...data };
        if (merged.idempotencyKey) store.set(merged.idempotencyKey, merged);
        return merged;
      }),
    },
  };
}

describe('VerificationService', () => {
  let service: VerificationService;
  let prisma: ReturnType<typeof makePrisma>;
  let consent: { record: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prisma = makePrisma();
    consent = { record: vi.fn(async () => 'consent_1') };
    const registry = new ProviderRegistry([new MockKycProvider()]);
    service = new VerificationService(
      prisma as unknown as PrismaService,
      registry,
      consent as unknown as ConsentService,
      new VaultService(),
    );
  });

  it('runs a PAN check and returns SUCCESS with normalized fields', async () => {
    const res = await service.runCheck({
      subjectType: 'dealer',
      subjectId: 'd1',
      checkType: CheckType.PAN,
      input: { pan: 'ABCDE1234F' },
      consent: { purpose: 'onboarding' },
    });
    expect(res.status).toBe(VerificationStatus.SUCCESS);
    expect(res.result.pan).toBe('ABCDE1234F');
    expect(res.cached).toBe(false);
    expect(consent.record).toHaveBeenCalledOnce();
  });

  it('is idempotent: same input returns cached result without a second provider call', async () => {
    const params = {
      subjectType: 'dealer' as const,
      subjectId: 'd1',
      checkType: CheckType.GST,
      input: { gstin: '27ABCDE1234F1Z5' },
    };
    const first = await service.runCheck(params);
    const second = await service.runCheck(params);
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.id).toBe(first.id);
  });

  it('vaults Aadhaar: result carries a token + masked number, never the raw number', async () => {
    const res = await service.runCheck({
      subjectType: 'dealer',
      subjectId: 'd1',
      checkType: CheckType.AADHAAR,
      input: { aadhaarNumber: '1234 5678 9012' },
      consent: { purpose: 'onboarding' },
    });
    expect(res.result.aadhaarVaultToken).toBeDefined();
    expect(res.result.aadhaarMasked).toBe('XXXXXXXX9012');
    expect(JSON.stringify(res.result)).not.toContain('56789012');
    // Aadhaar consent must be recorded as aadhaar (6-month expiry).
    expect(consent.record).toHaveBeenCalledWith(expect.objectContaining({ aadhaar: true }));
  });
});
