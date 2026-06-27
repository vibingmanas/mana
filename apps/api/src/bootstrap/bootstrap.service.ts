import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import {
  AuctionSource,
  AuctionStatus,
  DealerStatus,
  ListingSource,
  Prisma,
  UserRole,
  VehicleStatus,
  VerificationTier,
} from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';
import { estimateValuation } from '../vehicles/valuation';
import { fairPrice } from '../listings-intel/fair-price';
import { riskScore } from '../listings-intel/risk-score';

/**
 * Seeds a demo dataset the first time the app boots against an un-seeded database
 * (no ADMIN user). Idempotent and safe: it no-ops once an admin exists, so it
 * never runs on an established environment. Lets a fresh prod come up demo-ready
 * without a manual seed step.
 */
@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BootstrapService.name);
  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    if (process.env.BOOTSTRAP_SEED === 'off') return;
    const admin = await this.prisma.user.findFirst({ where: { role: UserRole.ADMIN } });
    if (admin) return;
    this.logger.log('No admin found — seeding demo dataset…');
    try {
      await this.seed();
      this.logger.log('Demo seed complete.');
    } catch (e) {
      this.logger.error(`Demo seed failed: ${String(e)}`);
    }
  }

  private async seed() {
    await this.prisma.user.upsert({
      where: { phone: '+919000000001' },
      update: { role: UserRole.ADMIN },
      create: {
        phone: '+919000000001',
        email: 'admin@mana.dev',
        name: 'Mana Admin',
        role: UserRole.ADMIN,
        phoneVerifiedAt: new Date(),
        adminProfile: { create: { adminRole: 'superadmin' } },
      },
    });
    await this.prisma.user.upsert({
      where: { phone: '+919000000003' },
      update: { role: UserRole.INSPECTOR },
      create: {
        phone: '+919000000003',
        name: 'Sample Inspector',
        role: UserRole.INSPECTOR,
        phoneVerifiedAt: new Date(),
      },
    });

    const dealerUser = await this.prisma.user.upsert({
      where: { phone: '+919000000002' },
      update: {},
      create: {
        phone: '+919000000002',
        email: 'dealer@mana.dev',
        name: 'Sample Dealer',
        role: UserRole.DEALER_OWNER,
        phoneVerifiedAt: new Date(),
      },
    });
    const dealer = await this.prisma.dealer.upsert({
      where: { ownerUserId: dealerUser.id },
      update: {},
      create: {
        ownerUserId: dealerUser.id,
        legalName: 'Sample Motors',
        displayName: 'Sample Motors',
        ownerName: 'Sample Dealer',
        status: DealerStatus.ACTIVE,
        verificationTier: VerificationTier.T2,
        city: 'Pune',
        state: 'Maharashtra',
      },
    });

    const cars: {
      regNumber: string;
      source: ListingSource;
      sellerName?: string;
      dealerId?: string;
      make: string;
      model: string;
      variant?: string;
      manufactureYear: number;
      odometerKm: number;
      ownersCount: number;
      fuelType: string;
      transmission: string;
      bodyType: string;
      city: string;
      state: string;
      price: number;
      accidentFree?: boolean | null;
      isLuxury?: boolean;
      auction?: { source: AuctionSource; sourceName: string; guidePrice: number; days: number };
    }[] = [
      {
        regNumber: 'MH12DLR1001',
        source: ListingSource.DEALER,
        dealerId: dealer.id,
        make: 'Maruti Suzuki',
        model: 'Swift',
        variant: 'ZXi',
        manufactureYear: 2021,
        odometerKm: 32000,
        ownersCount: 1,
        fuelType: 'Petrol',
        transmission: 'Manual',
        bodyType: 'Hatchback',
        city: 'Pune',
        state: 'Maharashtra',
        price: 640000,
        accidentFree: true,
      },
      {
        regNumber: 'MH12DLR1002',
        source: ListingSource.DEALER,
        dealerId: dealer.id,
        make: 'Hyundai',
        model: 'Creta',
        variant: 'SX',
        manufactureYear: 2020,
        odometerKm: 48000,
        ownersCount: 1,
        fuelType: 'Diesel',
        transmission: 'Automatic',
        bodyType: 'SUV',
        city: 'Pune',
        state: 'Maharashtra',
        price: 1280000,
        accidentFree: true,
      },
      {
        regNumber: 'KA01IND2201',
        source: ListingSource.INDIVIDUAL,
        sellerName: 'Ravi Kumar',
        make: 'Hyundai',
        model: 'i20',
        variant: 'Asta',
        manufactureYear: 2020,
        odometerKm: 38000,
        ownersCount: 1,
        fuelType: 'Petrol',
        transmission: 'Manual',
        bodyType: 'Hatchback',
        city: 'Bengaluru',
        state: 'Karnataka',
        price: 720000,
        accidentFree: true,
      },
      {
        regNumber: 'MH02IND7788',
        source: ListingSource.INDIVIDUAL,
        sellerName: 'Sneha Patil',
        make: 'Maruti Suzuki',
        model: 'Baleno',
        variant: 'Zeta',
        manufactureYear: 2018,
        odometerKm: 61000,
        ownersCount: 2,
        fuelType: 'Petrol',
        transmission: 'Manual',
        bodyType: 'Hatchback',
        city: 'Mumbai',
        state: 'Maharashtra',
        price: 560000,
        accidentFree: null,
      },
      {
        regNumber: 'DL03LUX5500',
        source: ListingSource.INDIVIDUAL,
        sellerName: 'Aman Verma',
        make: 'BMW',
        model: '3 Series',
        variant: '330i',
        manufactureYear: 2019,
        odometerKm: 42000,
        ownersCount: 1,
        fuelType: 'Petrol',
        transmission: 'Automatic',
        bodyType: 'Sedan',
        city: 'Delhi',
        state: 'Delhi',
        price: 3200000,
        accidentFree: true,
        isLuxury: true,
      },
      {
        regNumber: 'DL03AUC9001',
        source: ListingSource.AUCTION,
        sellerName: 'HDFC Bank',
        make: 'Toyota',
        model: 'Innova Crysta',
        variant: 'GX',
        manufactureYear: 2017,
        odometerKm: 120000,
        ownersCount: 2,
        fuelType: 'Diesel',
        transmission: 'Manual',
        bodyType: 'MUV',
        city: 'Delhi',
        state: 'Delhi',
        price: 950000,
        accidentFree: false,
        auction: {
          source: AuctionSource.BANK,
          sourceName: 'HDFC Bank',
          guidePrice: 950000,
          days: 5,
        },
      },
      {
        regNumber: 'TN09AUC3320',
        source: ListingSource.AUCTION,
        sellerName: 'Madras High Court',
        make: 'Honda',
        model: 'City',
        variant: 'VX',
        manufactureYear: 2016,
        odometerKm: 98000,
        ownersCount: 3,
        fuelType: 'Petrol',
        transmission: 'Manual',
        bodyType: 'Sedan',
        city: 'Chennai',
        state: 'Tamil Nadu',
        price: 540000,
        accidentFree: null,
        auction: {
          source: AuctionSource.COURT,
          sourceName: 'Madras High Court',
          guidePrice: 540000,
          days: 8,
        },
      },
    ];

    for (const c of cars) {
      const existing = await this.prisma.vehicle.findFirst({ where: { regNumber: c.regNumber } });
      if (existing) continue;
      const band = estimateValuation({
        make: c.make,
        model: c.model,
        manufactureYear: c.manufactureYear,
        odometerKm: c.odometerKm,
      });
      const fp = fairPrice(c.price, band.fair);
      const risk = riskScore({
        manufactureYear: c.manufactureYear,
        odometerKm: c.odometerKm,
        ownersCount: c.ownersCount,
        source: c.source,
        accidentFree: c.accidentFree,
        rcVerified: c.source === ListingSource.DEALER,
        inspected: c.source === ListingSource.DEALER,
      });
      const v = await this.prisma.vehicle.create({
        data: {
          source: c.source,
          dealerId: c.dealerId ?? null,
          sellerName: c.sellerName ?? null,
          regNumber: c.regNumber,
          make: c.make,
          model: c.model,
          variant: c.variant ?? null,
          manufactureYear: c.manufactureYear,
          odometerKm: c.odometerKm,
          ownersCount: c.ownersCount,
          fuelType: c.fuelType,
          transmission: c.transmission,
          bodyType: c.bodyType,
          city: c.city,
          state: c.state,
          price: c.price,
          isLuxury: c.isLuxury ?? false,
          accidentFree: c.accidentFree ?? null,
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
      if (c.auction) {
        await this.prisma.auction.create({
          data: {
            vehicleId: v.id,
            source: c.auction.source,
            sourceName: c.auction.sourceName,
            venue: `${c.city} · online`,
            startsAt: new Date(Date.now() + c.auction.days * 86400000),
            endsAt: new Date(Date.now() + (c.auction.days + 1) * 86400000),
            guidePrice: c.auction.guidePrice,
            reservePrice: Math.round(c.auction.guidePrice * 0.95),
            status: AuctionStatus.UPCOMING,
            docsChecklist: [
              'PAN card',
              'Aadhaar',
              'EMD demand draft',
              'Signed bid form',
            ] as unknown as Prisma.InputJsonValue,
          },
        });
      }
    }
  }
}
