import { Injectable, Logger } from '@nestjs/common';
import { Prisma, VehicleStatus } from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';
import { OpenSearchClient, type ListingDoc } from './opensearch.client';

export interface ListingSearch {
  q?: string;
  make?: string;
  model?: string;
  city?: string;
  state?: string;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  source?: string;
  minPrice?: number;
  maxPrice?: number;
  maxOwners?: number;
  minYear?: number;
  maxKm?: number;
  luxury?: string;
  verifiedOnly?: string;
  accidentFree?: string;
  riskBand?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  page?: number;
  limit?: number;
  sort?: string;
}

const isTrue = (v?: string) => v === 'true' || v === '1';

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

  private hasAdvancedFilters(q: ListingSearch): boolean {
    return !!(
      q.state ||
      q.transmission ||
      q.bodyType ||
      q.source ||
      q.maxOwners != null ||
      q.minYear != null ||
      q.maxKm != null ||
      isTrue(q.luxury) ||
      isTrue(q.verifiedOnly) ||
      isTrue(q.accidentFree) ||
      q.riskBand ||
      q.radiusKm != null
    );
  }

  async searchListings(q: ListingSearch) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;

    // Advanced filters live in Postgres only; skip OpenSearch when present.
    if (this.os.isEnabled() && !this.hasAdvancedFilters(q)) {
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

  private buildWhere(q: ListingSearch): Prisma.VehicleWhereInput {
    const text = q.q?.trim();
    // Approximate radius via a bounding box (no PostGIS needed): 1° lat ≈ 111 km.
    let geo: Prisma.VehicleWhereInput = {};
    if (q.lat != null && q.lng != null && q.radiusKm) {
      const dLat = q.radiusKm / 111;
      const dLng = q.radiusKm / (111 * Math.max(0.1, Math.cos((q.lat * Math.PI) / 180)));
      geo = {
        latitude: { gte: q.lat - dLat, lte: q.lat + dLat },
        longitude: { gte: q.lng - dLng, lte: q.lng + dLng },
      };
    }
    return {
      status: VehicleStatus.LIVE,
      ...(q.make ? { make: { contains: q.make, mode: 'insensitive' } } : {}),
      ...(q.model ? { model: { contains: q.model, mode: 'insensitive' } } : {}),
      ...(q.city ? { city: { contains: q.city, mode: 'insensitive' } } : {}),
      ...(q.state ? { state: { equals: q.state, mode: 'insensitive' } } : {}),
      ...(q.fuelType ? { fuelType: q.fuelType } : {}),
      ...(q.transmission ? { transmission: q.transmission } : {}),
      ...(q.bodyType ? { bodyType: q.bodyType } : {}),
      ...(q.source ? { source: q.source as Prisma.EnumListingSourceFilter['equals'] } : {}),
      ...(q.riskBand ? { riskBand: q.riskBand } : {}),
      ...(isTrue(q.luxury) ? { isLuxury: true } : {}),
      ...(isTrue(q.accidentFree) ? { accidentFree: true } : {}),
      ...(isTrue(q.verifiedOnly) ? { verification: { is: { verifiedAt: { not: null } } } } : {}),
      ...(q.maxOwners != null ? { ownersCount: { lte: q.maxOwners } } : {}),
      ...(q.minYear != null ? { manufactureYear: { gte: q.minYear } } : {}),
      ...(q.maxKm != null ? { odometerKm: { lte: q.maxKm } } : {}),
      ...(q.minPrice || q.maxPrice
        ? { price: { gte: q.minPrice ?? 0, lte: q.maxPrice ?? 100_000_000 } }
        : {}),
      ...geo,
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
  }

  private async postgresSearch(q: ListingSearch, page: number, limit: number) {
    const where = this.buildWhere(q);
    const sortMap: Record<string, Prisma.VehicleOrderByWithRelationInput> = {
      price_asc: { price: 'asc' },
      price_desc: { price: 'desc' },
      deal: { dealScore: 'desc' },
      risk: { riskScore: 'asc' },
      recent: { listedAt: 'desc' },
    };
    const orderBy = sortMap[q.sort ?? 'recent'] ?? sortMap.recent;

    const [total, items] = await Promise.all([
      this.prisma.vehicle.count({ where }),
      this.prisma.vehicle.findMany({
        where,
        orderBy: [{ boostedUntil: { sort: 'desc', nulls: 'last' } }, orderBy],
        skip: (page - 1) * limit,
        take: limit,
        include: LISTING_INCLUDE,
      }),
    ]);
    return { total, page, limit, backend: 'postgres', items: items.map(stripAdminFields) };
  }

  /** Drill-down facets for the search UI: states (with counts), makes, body types, sources. */
  async facets() {
    const where = { status: VehicleStatus.LIVE };
    const [states, makes, bodies, sources] = await Promise.all([
      this.prisma.vehicle.groupBy({ by: ['state'], where, _count: { _all: true } }),
      this.prisma.vehicle.groupBy({ by: ['make'], where, _count: { _all: true } }),
      this.prisma.vehicle.groupBy({ by: ['bodyType'], where, _count: { _all: true } }),
      this.prisma.vehicle.groupBy({ by: ['source'], where, _count: { _all: true } }),
    ]);
    const clean = (rows: { _count: { _all: number } }[], key: string) =>
      rows
        .map((r) => ({
          value: (r as Record<string, unknown>)[key] as string | null,
          count: r._count._all,
        }))
        .filter((r) => !!r.value)
        .sort((a, b) => b.count - a.count);
    return {
      states: clean(states, 'state'),
      makes: clean(makes, 'make'),
      bodyTypes: clean(bodies, 'bodyType'),
      sources: clean(sources, 'source'),
    };
  }

  /** Cities (with counts) within a state — second level of the location drill-down. */
  async cities(state: string) {
    const rows = await this.prisma.vehicle.groupBy({
      by: ['city'],
      where: { status: VehicleStatus.LIVE, state: { equals: state, mode: 'insensitive' } },
      _count: { _all: true },
    });
    return rows
      .map((r) => ({ value: r.city, count: r._count._all }))
      .filter((r) => !!r.value)
      .sort((a, b) => b.count - a.count);
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
