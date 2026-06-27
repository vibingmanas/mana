import { Injectable, Logger } from '@nestjs/common';
import { Prisma, VehicleStatus } from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';
import { OpenSearchClient, type ListingDoc } from './opensearch.client';

export interface ListingSearch {
  q?: string;
  make?: string;
  model?: string;
  city?: string;
  fuelType?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  sort?: string;
}

// Shared hydration shape so OpenSearch and Postgres paths return identical items.
const LISTING_INCLUDE = {
  media: { orderBy: { position: 'asc' as const }, take: 1 },
  verification: true,
  certification: true,
  inspections: { orderBy: { createdAt: 'desc' as const }, take: 1 },
  dealer: { select: { displayName: true, city: true, verificationTier: true } },
} satisfies Prisma.VehicleInclude;

// Fair-price deviation % is admin-only — never expose it on public listing reads.
function stripAdminFields<T extends { fairDeviationPct?: unknown }>(
  row: T,
): Omit<T, 'fairDeviationPct'> {
  const { fairDeviationPct: _omit, ...rest } = row;
  return rest;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly os: OpenSearchClient,
  ) {}

  async searchListings(q: ListingSearch) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;

    if (this.os.isEnabled()) {
      try {
        const { total, ids } = await this.os.search({
          q: q.q,
          make: q.make,
          model: q.model,
          city: q.city,
          fuelType: q.fuelType,
          minPrice: q.minPrice,
          maxPrice: q.maxPrice,
          sort: q.sort,
          from: (page - 1) * limit,
          size: limit,
        });
        const rows = await this.prisma.vehicle.findMany({
          where: { id: { in: ids }, status: VehicleStatus.LIVE },
          include: LISTING_INCLUDE,
        });
        const byId = new Map(rows.map((r) => [r.id, r]));
        const items = ids
          .map((id) => byId.get(id))
          .filter((r): r is (typeof rows)[number] => !!r)
          .map(stripAdminFields);
        return { total, page, limit, backend: 'opensearch', items };
      } catch (err) {
        this.logger.warn(`OpenSearch query failed, falling back to Postgres: ${String(err)}`);
      }
    }
    return this.postgresSearch(q, page, limit);
  }

  private async postgresSearch(q: ListingSearch, page: number, limit: number) {
    const text = q.q?.trim();
    const where: Prisma.VehicleWhereInput = {
      status: VehicleStatus.LIVE,
      ...(q.make ? { make: { contains: q.make, mode: 'insensitive' } } : {}),
      ...(q.model ? { model: { contains: q.model, mode: 'insensitive' } } : {}),
      ...(q.city ? { city: { contains: q.city, mode: 'insensitive' } } : {}),
      ...(q.fuelType ? { fuelType: q.fuelType } : {}),
      ...(q.minPrice || q.maxPrice
        ? { price: { gte: q.minPrice ?? 0, lte: q.maxPrice ?? 100_000_000 } }
        : {}),
      ...(text
        ? {
            OR: [
              { make: { contains: text, mode: 'insensitive' } },
              { model: { contains: text, mode: 'insensitive' } },
              { variant: { contains: text, mode: 'insensitive' } },
              { city: { contains: text, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const orderBy = {
      price_asc: { price: 'asc' as const },
      price_desc: { price: 'desc' as const },
      deal: { dealScore: 'desc' as const },
      recent: { listedAt: 'desc' as const },
    }[q.sort ?? 'recent'];

    const [total, items] = await Promise.all([
      this.prisma.vehicle.count({ where }),
      this.prisma.vehicle.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: LISTING_INCLUDE,
      }),
    ]);
    return { total, page, limit, backend: 'postgres', items: items.map(stripAdminFields) };
  }

  // ─── Index maintenance (best-effort; never blocks the write path) ───────

  private toDoc(v: {
    id: string;
    make: string | null;
    model: string | null;
    variant: string | null;
    city: string | null;
    fuelType: string | null;
    transmission: string | null;
    price: number | null;
    manufactureYear: number | null;
    odometerKm: number | null;
    dealScore: number | null;
    listedAt: Date | null;
    dealer?: { displayName: string | null } | null;
  }): ListingDoc {
    return {
      id: v.id,
      make: v.make,
      model: v.model,
      variant: v.variant,
      city: v.city,
      fuelType: v.fuelType,
      transmission: v.transmission,
      price: v.price,
      manufactureYear: v.manufactureYear,
      odometerKm: v.odometerKm,
      dealScore: v.dealScore,
      listedAt: v.listedAt ? v.listedAt.toISOString() : null,
      dealerName: v.dealer?.displayName ?? null,
    };
  }

  /** Reflect a vehicle's current state into the index (index if LIVE, else remove). */
  async syncVehicle(vehicleId: string): Promise<void> {
    if (!this.os.isEnabled()) return;
    try {
      const v = await this.prisma.vehicle.findUnique({
        where: { id: vehicleId },
        include: { dealer: { select: { displayName: true } } },
      });
      if (!v || v.status !== VehicleStatus.LIVE) {
        await this.os.deleteDoc(vehicleId);
        return;
      }
      await this.os.indexDoc(this.toDoc(v));
    } catch (err) {
      this.logger.warn(`syncVehicle ${vehicleId} failed: ${String(err)}`);
    }
  }

  /** Admin: rebuild the whole index from the current LIVE inventory. */
  async reindexAll(): Promise<{ enabled: boolean; indexed: number }> {
    if (!this.os.isEnabled()) return { enabled: false, indexed: 0 };
    await this.os.ensureIndex();
    const live = await this.prisma.vehicle.findMany({
      where: { status: VehicleStatus.LIVE },
      include: { dealer: { select: { displayName: true } } },
    });
    const docs = live.map((v) => this.toDoc(v));
    const BATCH = 500;
    for (let i = 0; i < docs.length; i += BATCH) {
      await this.os.bulkIndex(docs.slice(i, i + BATCH));
    }
    return { enabled: true, indexed: docs.length };
  }
}
