import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  }

  /** Public map of enabled flags for clients. */
  async publicMap(): Promise<Record<string, boolean>> {
    const flags = await this.prisma.featureFlag.findMany();
    return Object.fromEntries(flags.map((f) => [f.key, f.enabled]));
  }

  set(key: string, enabled: boolean, description?: string) {
    return this.prisma.featureFlag.upsert({
      where: { key },
      update: { enabled, ...(description ? { description } : {}) },
      create: { key, enabled, description: description ?? null },
    });
  }
}
