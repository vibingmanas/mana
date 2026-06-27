import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  DealerStaffRole,
  LeadStatus,
  SyndicationChannel,
  UserRole,
  VehicleStatus,
} from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';
import { DealersService } from '../dealers/dealers.service';
import { countByStage } from './pipeline';
import { parseCsv } from './csv';

export interface BulkRow {
  regNumber?: string;
  make?: string;
  model?: string;
  variant?: string;
  manufactureYear?: string | number;
  odometerKm?: string | number;
  price?: string | number;
  fuelType?: string;
  transmission?: string;
  color?: string;
  city?: string;
}

const BULK_MAX_ROWS = 500;

@Injectable()
export class DmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dealers: DealersService,
  ) {}

  /** Boost a listing to the top of search for 7 days (dealer monetization). */
  async boostListing(userId: string, vehicleId: string) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const v = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!v || v.dealerId !== dealer.id) throw new NotFoundException('Not your vehicle');
    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { boostedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });
  }

  /**
   * Market-intelligence dashboard: how the dealer's prices sit vs market, lead
   * demand by model, and the competitor price envelope for the models they stock.
   */
  async intelligence(userId: string) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const stock = await this.prisma.vehicle.findMany({
      where: { dealerId: dealer.id, status: VehicleStatus.LIVE },
      select: { make: true, model: true, price: true, valuationFair: true, fairPriceLabel: true },
    });

    // Pricing position vs fair value.
    const priced = stock.filter((s) => s.price && s.valuationFair);
    const overpriced = priced.filter((s) => (s.price ?? 0) > (s.valuationFair ?? 0) * 1.1).length;
    const underpriced = priced.filter((s) => (s.price ?? 0) < (s.valuationFair ?? 0) * 0.9).length;

    // Demand: leads by model for this dealer.
    const leads = await this.prisma.lead.findMany({
      where: { dealerId: dealer.id },
      select: { vehicle: { select: { make: true, model: true } } },
    });
    const demandMap = new Map<string, number>();
    for (const l of leads) {
      const k = `${l.vehicle?.make ?? '?'} ${l.vehicle?.model ?? ''}`.trim();
      demandMap.set(k, (demandMap.get(k) ?? 0) + 1);
    }
    const demand = [...demandMap.entries()]
      .map(([model, leadCount]) => ({ model, leadCount }))
      .sort((a, b) => b.leadCount - a.leadCount)
      .slice(0, 8);

    // Competitor price envelope for the models the dealer stocks (all live cars).
    const models = [...new Set(stock.map((s) => s.model).filter(Boolean))].slice(0, 8) as string[];
    const envelope = await Promise.all(
      models.map(async (model) => {
        const agg = await this.prisma.vehicle.aggregate({
          where: { model, status: VehicleStatus.LIVE, price: { not: null } },
          _min: { price: true },
          _max: { price: true },
          _avg: { price: true },
          _count: { _all: true },
        });
        const mine = stock.find((s) => s.model === model)?.price ?? null;
        return {
          model,
          min: agg._min.price,
          avg: agg._avg.price ? Math.round(agg._avg.price) : null,
          max: agg._max.price,
          count: agg._count._all,
          yourPrice: mine,
        };
      }),
    );

    return {
      stockCount: stock.length,
      pricing: { overpriced, underpriced, fair: priced.length - overpriced - underpriced },
      demand,
      envelope,
    };
  }

  async listLeads(userId: string, status?: LeadStatus) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const leads = await this.prisma.lead.findMany({
      where: { dealerId: dealer.id, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: { select: { id: true, make: true, model: true, regNumber: true, price: true } },
        buyer: { include: { user: { select: { phone: true, name: true } } } },
      },
    });
    return { pipeline: countByStage(leads), leads };
  }

  async updateLead(userId: string, leadId: string, data: { status?: LeadStatus; note?: string }) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.dealerId !== dealer.id) throw new ForbiddenException('Not your lead');
    return this.prisma.lead.update({
      where: { id: leadId },
      data: { status: data.status ?? lead.status, note: data.note ?? lead.note },
    });
  }

  async dashboard(userId: string) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [stockGroups, leadGroups, liveCount, upcoming, salesThisMonth, newLeads] =
      await Promise.all([
        this.prisma.vehicle.groupBy({
          by: ['status'],
          where: { dealerId: dealer.id },
          _count: { _all: true },
        }),
        this.prisma.lead.groupBy({
          by: ['status'],
          where: { dealerId: dealer.id },
          _count: { _all: true },
        }),
        this.prisma.vehicle.count({ where: { dealerId: dealer.id, status: VehicleStatus.LIVE } }),
        this.prisma.appointment.count({
          where: {
            dealerId: dealer.id,
            status: { in: [AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED] },
            scheduledStart: { gte: now },
          },
        }),
        this.prisma.vehicle.count({
          where: { dealerId: dealer.id, status: VehicleStatus.SOLD, soldAt: { gte: startOfMonth } },
        }),
        this.prisma.lead.count({ where: { dealerId: dealer.id, status: LeadStatus.NEW } }),
      ]);

    return {
      dealer: { id: dealer.id, verificationTier: dealer.verificationTier },
      stockByStatus: Object.fromEntries(stockGroups.map((g) => [g.status, g._count._all])),
      leadsByStatus: Object.fromEntries(leadGroups.map((g) => [g.status, g._count._all])),
      liveListings: liveCount,
      newLeads,
      upcomingAppointments: upcoming,
      salesThisMonth,
    };
  }

  // ─── Staff roster (owner manages; staff inherit dealer DMS access) ──────

  async listStaff(userId: string) {
    const dealer = await this.dealers.assertOwner(userId);
    const owner = await this.prisma.user.findUnique({
      where: { id: dealer.ownerUserId },
      select: { id: true, name: true, phone: true },
    });
    const staff = await this.prisma.dealerStaff.findMany({
      where: { dealerId: dealer.id },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, phone: true } } },
    });
    return { owner, staff };
  }

  async addStaff(userId: string, phone: string, role: DealerStaffRole) {
    const dealer = await this.dealers.assertOwner(userId);
    if (
      phone === (await this.prisma.user.findUnique({ where: { id: dealer.ownerUserId } }))?.phone
    ) {
      throw new BadRequestException('Owner is already a member');
    }
    // Staff sign in with the dealer role so existing /dealer guards admit them;
    // their membership row scopes them to this dealer.
    const user = await this.prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone, role: UserRole.DEALER_OWNER },
    });
    if (await this.prisma.dealer.findUnique({ where: { ownerUserId: user.id } })) {
      throw new BadRequestException('That user already owns a dealer');
    }
    return this.prisma.dealerStaff.upsert({
      where: { dealerId_userId: { dealerId: dealer.id, userId: user.id } },
      update: { role },
      create: { dealerId: dealer.id, userId: user.id, role },
      include: { user: { select: { id: true, name: true, phone: true } } },
    });
  }

  async removeStaff(userId: string, staffId: string) {
    const dealer = await this.dealers.assertOwner(userId);
    const staff = await this.prisma.dealerStaff.findUnique({ where: { id: staffId } });
    if (!staff || staff.dealerId !== dealer.id)
      throw new NotFoundException('Staff member not found');
    await this.prisma.dealerStaff.delete({ where: { id: staffId } });
    return { removed: true };
  }

  // ─── Bulk inventory upload (CSV or JSON rows → DRAFT vehicles) ──────────

  async bulkUpload(userId: string, rows: BulkRow[]) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    if (rows.length === 0) throw new BadRequestException('No rows provided');
    if (rows.length > BULK_MAX_ROWS) {
      throw new BadRequestException(`Too many rows (max ${BULK_MAX_ROWS})`);
    }

    const existing = new Set(
      (
        await this.prisma.vehicle.findMany({
          where: { dealerId: dealer.id },
          select: { regNumber: true },
        })
      ).map((v) => v.regNumber.toUpperCase()),
    );

    const created: string[] = [];
    const errors: { row: number; reason: string }[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const reg = (r.regNumber ?? '').toUpperCase().replace(/\s+/g, '');
      if (!reg) {
        errors.push({ row: i + 1, reason: 'missing regNumber' });
        continue;
      }
      if (existing.has(reg) || seen.has(reg)) {
        errors.push({ row: i + 1, reason: `duplicate regNumber ${reg}` });
        continue;
      }
      seen.add(reg);
      await this.prisma.vehicle.create({
        data: {
          dealerId: dealer.id,
          regNumber: reg,
          make: r.make || null,
          model: r.model || null,
          variant: r.variant || null,
          fuelType: r.fuelType || null,
          transmission: r.transmission || null,
          color: r.color || null,
          city: r.city || dealer.city,
          manufactureYear: toInt(r.manufactureYear),
          odometerKm: toInt(r.odometerKm),
          price: toInt(r.price),
          status: VehicleStatus.DRAFT,
        },
      });
      created.push(reg);
    }
    return { created: created.length, skipped: errors.length, createdRegNumbers: created, errors };
  }

  bulkUploadCsv(userId: string, csv: string) {
    return this.bulkUpload(userId, parseCsv(csv) as BulkRow[]);
  }

  // ─── Syndication (live-listings feed + per-channel toggles) ────────────

  async listSyndication(userId: string) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const targets = await this.prisma.syndicationTarget.findMany({
      where: { dealerId: dealer.id },
    });
    const map = new Map(targets.map((t) => [t.channel, t.enabled]));
    return Object.values(SyndicationChannel).map((channel) => ({
      channel,
      enabled: map.get(channel) ?? false,
    }));
  }

  async setSyndication(userId: string, channel: SyndicationChannel, enabled: boolean) {
    if (!Object.values(SyndicationChannel).includes(channel)) {
      throw new BadRequestException('Unknown syndication channel');
    }
    const { dealer, role } = await this.dealers.getMembershipOrThrow(userId);
    if (role === DealerStaffRole.SALES) {
      throw new ForbiddenException('Sales staff cannot change syndication');
    }
    return this.prisma.syndicationTarget.upsert({
      where: { dealerId_channel: { dealerId: dealer.id, channel } },
      update: { enabled },
      create: { dealerId: dealer.id, channel, enabled },
    });
  }

  /** Normalized feed of a dealer's LIVE listings for export to enabled channels. */
  async syndicationFeed(userId: string) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const [vehicles, targets] = await Promise.all([
      this.prisma.vehicle.findMany({
        where: { dealerId: dealer.id, status: VehicleStatus.LIVE },
        include: { media: { where: { type: 'PHOTO' }, select: { url: true } } },
        orderBy: { listedAt: 'desc' },
      }),
      this.prisma.syndicationTarget.findMany({
        where: { dealerId: dealer.id, enabled: true },
      }),
    ]);
    return {
      dealer: { id: dealer.id, name: dealer.displayName, city: dealer.city },
      channels: targets.map((t) => t.channel),
      count: vehicles.length,
      listings: vehicles.map((v) => ({
        id: v.id,
        title: [v.manufactureYear, v.make, v.model, v.variant].filter(Boolean).join(' '),
        make: v.make,
        model: v.model,
        year: v.manufactureYear,
        odometerKm: v.odometerKm,
        fuelType: v.fuelType,
        transmission: v.transmission,
        price: v.price,
        city: v.city,
        photos: v.media.map((m) => m.url),
        url: `https://mana.app/listings/${v.id}`,
      })),
    };
  }
}

function toInt(v: string | number | undefined): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'number' ? v : parseInt(v.replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}
