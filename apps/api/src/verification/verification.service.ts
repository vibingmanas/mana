import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { CheckType, VerificationStatus, Prisma } from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderRegistry } from './providers/provider.registry';
import { ConsentService, type ConsentInput } from './consent.service';
import { VaultService } from './vault.service';
import type { NormalizedResult } from './providers/types';

export interface RunCheckParams {
  subjectType: 'dealer' | 'vehicle' | 'user';
  subjectId: string;
  checkType: CheckType;
  input: Record<string, unknown>;
  consent?: Omit<ConsentInput, 'subjectId'>;
  idempotencyKey?: string;
}

export interface VerificationResult {
  id: string;
  status: VerificationStatus;
  checkType: CheckType;
  provider: string | null;
  result: NormalizedResult['fields'];
  confidence: number | null;
  cached: boolean;
}

const STATUS_MAP: Record<NormalizedResult['status'], VerificationStatus> = {
  SUCCESS: VerificationStatus.SUCCESS,
  FAILED: VerificationStatus.FAILED,
  MANUAL_REVIEW: VerificationStatus.MANUAL_REVIEW,
};

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ProviderRegistry,
    private readonly consent: ConsentService,
    private readonly vault: VaultService,
  ) {}

  private buildIdempotencyKey(p: RunCheckParams): string {
    if (p.idempotencyKey) return p.idempotencyKey;
    const raw = JSON.stringify({
      s: p.subjectType,
      i: p.subjectId,
      c: p.checkType,
      in: p.input,
    });
    return createHash('sha256').update(raw).digest('hex');
  }

  async runCheck(params: RunCheckParams): Promise<VerificationResult> {
    const idempotencyKey = this.buildIdempotencyKey(params);

    // Idempotency: return a prior successful/terminal result for the same input.
    const existing = await this.prisma.verificationRequest.findUnique({
      where: { idempotencyKey },
    });
    if (existing && existing.status === VerificationStatus.SUCCESS) {
      return {
        id: existing.id,
        status: existing.status,
        checkType: existing.checkType,
        provider: existing.provider,
        result: (existing.normalizedResult as NormalizedResult['fields']) ?? {},
        confidence: existing.confidence,
        cached: true,
      };
    }

    // Aadhaar: vault the raw number; never persist it. Strip from provider input.
    let input = params.input;
    let vaultFields: Record<string, unknown> = {};
    if (params.checkType === CheckType.AADHAAR && typeof input.aadhaarNumber === 'string') {
      const stored = this.vault.storeAadhaar(input.aadhaarNumber);
      vaultFields = { aadhaarVaultToken: stored.token, aadhaarMasked: stored.maskedNumber };
      const { aadhaarNumber: _omit, ...rest } = input;
      input = rest;
    }

    const request =
      existing ??
      (await this.prisma.verificationRequest.create({
        data: {
          subjectType: params.subjectType,
          subjectId: params.subjectId,
          checkType: params.checkType,
          status: VerificationStatus.PENDING,
          idempotencyKey,
        },
      }));

    const consentLogId = params.consent
      ? await this.consent.record({
          subjectId: params.subjectId,
          aadhaar: params.checkType === CheckType.AADHAAR,
          ...params.consent,
        })
      : null;

    const normalized = await this.callProviderWithRetry(params.checkType, input);
    const fields = { ...normalized.fields, ...vaultFields };

    const updated = await this.prisma.verificationRequest.update({
      where: { id: request.id },
      data: {
        provider: normalized.provider,
        status: STATUS_MAP[normalized.status],
        normalizedResult: fields as unknown as Prisma.InputJsonValue,
        confidence: normalized.confidence ?? null,
        consentLogId,
        completedAt: new Date(),
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      checkType: updated.checkType,
      provider: updated.provider,
      result: fields,
      confidence: updated.confidence,
      cached: false,
    };
  }

  private async callProviderWithRetry(
    checkType: CheckType,
    input: Record<string, unknown>,
    attempts = 2,
  ): Promise<NormalizedResult> {
    // Try each supporting provider in priority order (live → mock); within a
    // provider, retry transient errors. Fall through to the next on a thrown error.
    const providers = this.registry.resolveAll(checkType);
    let last: NormalizedResult | null = null;
    for (const provider of providers) {
      for (let i = 0; i < attempts; i++) {
        try {
          const res = await provider.verify(checkType, input);
          if (res.status !== 'FAILED') return res;
          last = res;
          break; // a clean FAILED isn't retried; try the next provider
        } catch (err) {
          this.logger.warn(`Provider ${provider.name} threw for ${checkType} (attempt ${i + 1})`);
        }
      }
    }
    return last ?? { status: 'MANUAL_REVIEW', fields: {}, provider: providers[0]?.name ?? 'none' };
  }
}
