import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CheckType, MediaType, VehicleStatus, VerificationTier, type Vehicle } from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';
import { DealersService } from '../dealers/dealers.service';
import { VerificationService } from '../verification/verification.service';
import type { AddMediaDto, CreateVehicleDto, UpdateVehicleDto } from './dto';
import { publishBlocker } from './rules';
import { estimateValuation, dealScore } from './valuation';
import { assessOdometer } from '../inspections/odometer';
import { AlertsService } from '../alerts/alerts.service';
import { BillingService } from '../billing/billing.service';
import { listingLimitReached } from '../billing/billing-rules';
import { SearchService } from '../search/search.service';

function parseDate(v: unknown): Date | null {
  if (typeof v !== 'string') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dealers: DealersService,
    private readonly verification: VerificationService,
    private readonly alerts: AlertsService,
    private readonly billing: BillingService,
    private readonly search: SearchService,
  ) {}

  private async ownedVehicle(userId: string, vehicleId: string): Promise<Vehicle> {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.dealerId !== dealer.id) throw new ForbiddenException('Not your vehicle');
    return vehicle;
  }

  async create(userId: string, dto: CreateVehicleDto) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const existing = await this.prisma.vehicle.findUnique({
      where: { dealerId_regNumber: { dealerId: dealer.id, regNumber: dto.regNumber } },
    });
    if (existing)
      throw new BadRequestException('You already have a vehicle with this registration');
    return this.prisma.vehicle.create({
      data: {
        dealerId: dealer.id,
        regNumber: dto.regNumber,
        regState: dto.regState ?? dto.regNumber.slice(0, 2),
        city: dealer.city,
        latitude: dealer.latitude,
        longitude: dealer.longitude,
        status: VehicleStatus.DRAFT,
      },
    });
  }

  async listMine(userId: string) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    return this.prisma.vehicle.findMany({
      where: { dealerId: dealer.id },
      orderBy: { createdAt: 'desc' },
      include: { verification: true, media: true },
    });
  }

  async getMine(userId: string, vehicleId: string) {
    await this.ownedVehicle(userId, vehicleId);
    return this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { verification: true, media: { orderBy: { position: 'asc' } } },
    });
  }

  async update(userId: string, vehicleId: string, dto: UpdateVehicleDto) {
    const existing = await this.ownedVehicle(userId, vehicleId);
    const updated = await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { ...dto },
    });
    if (dto.price != null && dto.price !== existing.price) {
      await this.alerts.onPriceChange(vehicleId, existing.price, dto.price);
    }
    return updated;
  }

  async verifyRc(userId: string, vehicleId: string, meta: { ip?: string; userAgent?: string }) {
    const vehicle = await this.ownedVehicle(userId, vehicleId);
    await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status: VehicleStatus.RC_VERIFYING },
    });

    const rc = await this.verification.runCheck({
      subjectType: 'vehicle',
      subjectId: vehicleId,
      checkType: CheckType.VEHICLE_RC,
      input: { regNumber: vehicle.regNumber },
      consent: { purpose: 'vehicle_rc_verification', ...meta },
    });
    const challan = await this.verification.runCheck({
      subjectType: 'vehicle',
      subjectId: vehicleId,
      checkType: CheckType.VEHICLE_CHALLAN,
      input: { regNumber: vehicle.regNumber },
    });

    const f = rc.result;
    const c = challan.result;
    const verifiedOk = rc.status === 'SUCCESS';

    await this.prisma.vehicleVerification.upsert({
      where: { vehicleId },
      create: {
        vehicleId,
        source: 'vahan',
        rcOwnerName: String(f.rcOwnerName ?? ''),
        rcStatus: String(f.rcStatus ?? ''),
        rcMakeModel: String(f.rcMakeModel ?? ''),
        rcFuel: String(f.rcFuel ?? ''),
        insuranceValidTill: parseDate(f.insuranceValidTill),
        insuranceProvider: String(f.insuranceProvider ?? ''),
        pucValidTill: parseDate(f.pucValidTill),
        hypothecationActive: Boolean(f.hypothecationActive ?? false),
        financerName: f.financerName ? String(f.financerName) : null,
        challanCount: Number(c.challanCount ?? 0),
        challanTotalAmount: Number(c.challanTotalAmount ?? 0),
        confidence: rc.confidence,
        verifiedAt: verifiedOk ? new Date() : null,
      },
      update: {
        source: 'vahan',
        rcOwnerName: String(f.rcOwnerName ?? ''),
        rcStatus: String(f.rcStatus ?? ''),
        rcMakeModel: String(f.rcMakeModel ?? ''),
        rcFuel: String(f.rcFuel ?? ''),
        insuranceValidTill: parseDate(f.insuranceValidTill),
        insuranceProvider: String(f.insuranceProvider ?? ''),
        pucValidTill: parseDate(f.pucValidTill),
        hypothecationActive: Boolean(f.hypothecationActive ?? false),
        challanCount: Number(c.challanCount ?? 0),
        challanTotalAmount: Number(c.challanTotalAmount ?? 0),
        confidence: rc.confidence,
        verifiedAt: verifiedOk ? new Date() : null,
      },
    });

    await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        status: verifiedOk ? VehicleStatus.RC_VERIFIED : VehicleStatus.RC_FAILED,
        fuelType: vehicle.fuelType ?? (f.rcFuel ? String(f.rcFuel) : null),
      },
    });

    return this.getMine(userId, vehicleId);
  }

  async addMedia(userId: string, vehicleId: string, dto: AddMediaDto) {
    await this.ownedVehicle(userId, vehicleId);
    return this.prisma.mediaAsset.create({
      data: {
        vehicleId,
        type: dto.type,
        url: dto.url,
        position: dto.position ?? 0,
        capturedVia: 'upload',
      },
    });
  }

  async publish(userId: string, vehicleId: string) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const vehicle = await this.ownedVehicle(userId, vehicleId);

    const verification = await this.prisma.vehicleVerification.findUnique({ where: { vehicleId } });
    const photos = await this.prisma.mediaAsset.count({
      where: { vehicleId, type: MediaType.PHOTO },
    });
    const odometer = assessOdometer({
      declaredKm: vehicle.odometerKm ?? 0,
      manufactureYear: vehicle.manufactureYear,
    });
    const [liveCount, limit] = await Promise.all([
      this.prisma.vehicle.count({ where: { dealerId: dealer.id, status: VehicleStatus.LIVE } }),
      this.billing.listingLimitForDealer(dealer.id),
    ]);
    const blocker = publishBlocker({
      tierOk: this.dealers.hasTier(dealer, VerificationTier.T1),
      rcVerified: !!verification?.verifiedAt,
      photoCount: photos,
      hasPrice: !!vehicle.price,
      odometerHighRisk: odometer.fraudRisk === 'HIGH',
      listingLimitReached: listingLimitReached(liveCount, limit),
    });
    if (blocker) throw new BadRequestException(blocker);

    const band = estimateValuation({
      make: vehicle.make,
      model: vehicle.model,
      manufactureYear: vehicle.manufactureYear,
      odometerKm: vehicle.odometerKm,
    });
    await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        status: VehicleStatus.LIVE,
        listedAt: new Date(),
        valuationLow: band.low,
        valuationFair: band.fair,
        valuationHigh: band.high,
        dealScore: vehicle.price ? dealScore(vehicle.price, band.fair) : null,
      },
    });
    await this.search.syncVehicle(vehicleId);
    return this.getMine(userId, vehicleId);
  }

  async setStatus(userId: string, vehicleId: string, status: VehicleStatus) {
    await this.ownedVehicle(userId, vehicleId);
    const data: { status: VehicleStatus; soldAt?: Date } = { status };
    if (status === VehicleStatus.SOLD) data.soldAt = new Date();
    const updated = await this.prisma.vehicle.update({ where: { id: vehicleId }, data });
    await this.search.syncVehicle(vehicleId);
    return updated;
  }

  // ─── Public listings ──────────────────────────────────────
  // Browse/search now lives in SearchService (OpenSearch when configured,
  // else Postgres). VehiclesService keeps the listing-detail read below.

  async getListing(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        media: { orderBy: { position: 'asc' } },
        verification: true,
        certification: true,
        inspections: { orderBy: { createdAt: 'desc' }, take: 1 },
        odometerChecks: { orderBy: { checkedAt: 'desc' }, take: 1 },
        dealer: { select: { displayName: true, city: true, state: true, verificationTier: true } },
      },
    });
    if (!vehicle || vehicle.status !== VehicleStatus.LIVE) {
      throw new NotFoundException('Listing not available');
    }
    return vehicle;
  }
}
