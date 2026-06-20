import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Fraud/abuse blocklist (phone / pan / gstin / reg_number). Used by auth + admin. */
@Injectable()
export class BlocklistService {
  constructor(private readonly prisma: PrismaService) {}

  async isBlocked(kind: string, value: string): Promise<boolean> {
    if (!value) return false;
    const hit = await this.prisma.blocklist.findUnique({
      where: { kind_value: { kind, value } },
    });
    return !!hit;
  }

  list() {
    return this.prisma.blocklist.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async add(kind: string, value: string, reason: string | undefined, createdByUserId: string) {
    return this.prisma.blocklist.upsert({
      where: { kind_value: { kind, value } },
      update: { reason: reason ?? null, createdByUserId },
      create: { kind, value, reason: reason ?? null, createdByUserId },
    });
  }

  async remove(id: string) {
    await this.prisma.blocklist.deleteMany({ where: { id } });
    return { removed: true };
  }
}
