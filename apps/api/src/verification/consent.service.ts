import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ConsentInput {
  subjectId: string;
  purpose: string;
  provider?: string;
  documentType?: string;
  ip?: string;
  userAgent?: string;
  /** Aadhaar auth data must expire within 6 months. */
  aadhaar?: boolean;
}

/** Writes DPDP/Aadhaar-Act consent records. See plans/07-verification-kyc.md. */
@Injectable()
export class ConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: ConsentInput): Promise<string> {
    const expiresAt = input.aadhaar
      ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 180) // 180 days
      : null;
    const log = await this.prisma.consentLog.create({
      data: {
        subjectId: input.subjectId,
        purpose: input.purpose,
        provider: input.provider ?? null,
        documentType: input.documentType ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        expiresAt,
      },
    });
    return log.id;
  }
}
