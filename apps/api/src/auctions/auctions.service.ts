import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuctionSource, AuctionStatus, ListingSource, Prisma, VehicleStatus } from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';
import { estimateValuation } from '../vehicles/valuation';
import { fairPrice } from '../listings-intel/fair-price';
import { riskScore } from '../listings-intel/risk-score';
import { parseCsv } from '../dms/csv';

export interface AuctionInput {
  regNumber: string;
  make?: string;
  model?: string;
  variant?: string;
  manufactureYear?: number;
  odometerKm?: number;
  ownersCount?: number;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  city?: string;
  state?: string;
  source: AuctionSource;
  sourceName?: string;
  lotNumber?: string;
  venue?: string;
  startsAt: string;
  endsAt?: string;
  guidePrice?: number;
  reservePrice?: number;
  docsChecklist?: string[];
}

@Injectable()
export class AuctionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: { source?: string; state?: string; city?: string; status?: string }) {
    const where: Prisma.AuctionWhereInput = {
      ...(filter.source ? { source: filter.source as AuctionSource } : {}),
      ...(filter.status ? { status: filter.status as AuctionStatus } : {}),
      ...(filter.state || filter.city
        ? {
            vehicle: {
              ...(filter.state ? { state: { equals: filter.state, mode: 'insensitive' } } : {}),
              ...(filter.city ? { city: { equals: filter.city, mode: 'insensitive' } } : {}),
            },
          }
        : {}),
    };
    return this.prisma.auction.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            variant: true,
            manufactureYear: true,
            odometerKm: true,
            city: true,
            state: true,
            fuelType: true,
            price: true,
            fairPriceLabel: true,
            riskScore: true,
            riskBand: true,
            media: { take: 1, select: { url: true } },
          },
        },
      },
    });
  }

  async get(id: string) {
    const a = await this.prisma.auction.findUnique({
      where: { id },
      include: {
        vehicle: {
          include: {
            media: true,
            verification: true,
            inspections: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });
    if (!a) throw new NotFoundException('Auction not found');
    // Deviation % is admin-only.
    const { fairDeviationPct: _omit, ...vehicle } = a.vehicle;
    return { ...a, vehicle };
  }

  /** Admin: create an auction listing (Vehicle source=AUCTION) + the auction record. */
  async create(input: AuctionInput) {
    if (!input.regNumber) throw new BadRequestException('regNumber required');
    const startsAt = new Date(input.startsAt);
    if (Number.isNaN(startsAt.getTime())) throw new BadRequestException('invalid startsAt');

    const band = estimateValuation({
      make: input.make ?? null,
      model: input.model ?? null,
      manufactureYear: input.manufactureYear ?? null,
      odometerKm: input.odometerKm ?? null,
    });
    const price = input.guidePrice ?? band.fair;
    const fp = fairPrice(price, band.fair);
    const risk = riskScore({
      manufactureYear: input.manufactureYear,
      odometerKm: input.odometerKm,
      ownersCount: input.ownersCount,
      source: 'AUCTION',
      rcVerified: false,
      inspected: false,
    });

    const vehicle = await this.prisma.vehicle.create({
      data: {
        source: ListingSource.AUCTION,
        sellerName: input.sourceName ?? 'Auction',
        regNumber: input.regNumber.toUpperCase().replace(/\s+/g, ''),
        make: input.make ?? null,
        model: input.model ?? null,
        variant: input.variant ?? null,
        manufactureYear: input.manufactureYear ?? null,
        odometerKm: input.odometerKm ?? null,
        ownersCount: input.ownersCount ?? null,
        fuelType: input.fuelType ?? null,
        transmission: input.transmission ?? null,
        bodyType: input.bodyType ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        price,
        valuationLow: band.low,
        valuationFair: band.fair,
        valuationHigh: band.high,
        fairPriceLabel: fp?.label ?? null,
        fairDeviationPct: fp?.deviationPct ?? null,
        riskScore: risk.score,
        riskBand: risk.band,
        riskFactors: risk.factors as unknown as Prisma.InputJsonValue,
        status: VehicleStatus.LIVE,
        listedAt: new Date(),
      },
    });

    return this.prisma.auction.create({
      data: {
        vehicleId: vehicle.id,
        source: input.source,
        sourceName: input.sourceName ?? null,
        lotNumber: input.lotNumber ?? null,
        venue: input.venue ?? null,
        startsAt,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        guidePrice: input.guidePrice ?? null,
        reservePrice: input.reservePrice ?? null,
        status: AuctionStatus.UPCOMING,
        docsChecklist: (input.docsChecklist ?? [
          'PAN card',
          'Aadhaar',
          'EMD demand draft',
          'Signed bid form',
        ]) as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /** Admin: bulk import auctions from CSV. */
  async importCsv(csv: string) {
    const rows = parseCsv(csv);
    let created = 0;
    const errors: { row: number; reason: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        await this.create({
          regNumber: r.regNumber,
          make: r.make,
          model: r.model,
          manufactureYear: r.manufactureYear ? Number(r.manufactureYear) : undefined,
          odometerKm: r.odometerKm ? Number(r.odometerKm) : undefined,
          city: r.city,
          state: r.state,
          source: (r.source as AuctionSource) || AuctionSource.BANK,
          sourceName: r.sourceName,
          guidePrice: r.guidePrice ? Number(r.guidePrice) : undefined,
          startsAt: r.startsAt || new Date(Date.now() + 7 * 86400000).toISOString(),
        });
        created++;
      } catch (e) {
        errors.push({ row: i + 1, reason: (e as Error).message });
      }
    }
    return { created, skipped: errors.length, errors };
  }

  // ─── Buyer alerts ──
  async setAlert(userId: string, input: { city?: string; state?: string; source?: string }) {
    return this.prisma.auctionAlert.create({
      data: {
        userId,
        city: input.city ?? null,
        state: input.state ?? null,
        source: input.source ? (input.source as AuctionSource) : null,
      },
    });
  }

  myAlerts(userId: string) {
    return this.prisma.auctionAlert.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }
}
