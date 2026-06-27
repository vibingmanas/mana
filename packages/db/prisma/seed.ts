// Dev seed — a sample admin, dealer, and a couple of vehicles.
import {
  PrismaClient,
  UserRole,
  DealerStatus,
  VerificationTier,
  VehicleStatus,
  ListingSource,
  AuctionSource,
  AuctionStatus,
} from '../generated/client';

const prisma = new PrismaClient();

async function main() {
  // Admin
  const adminUser = await prisma.user.upsert({
    where: { phone: '+919000000001' },
    update: {},
    create: {
      phone: '+919000000001',
      email: 'admin@mana.dev',
      name: 'Mana Admin',
      role: UserRole.ADMIN,
      phoneVerifiedAt: new Date(),
      emailVerifiedAt: new Date(),
      adminProfile: { create: { adminRole: 'superadmin' } },
    },
  });

  // Dealer
  const dealerUser = await prisma.user.upsert({
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

  // Inspector (field app)
  await prisma.user.upsert({
    where: { phone: '+919000000003' },
    update: { role: UserRole.INSPECTOR },
    create: {
      phone: '+919000000003',
      email: 'inspector@mana.dev',
      name: 'Sample Inspector',
      role: UserRole.INSPECTOR,
      phoneVerifiedAt: new Date(),
    },
  });

  const dealer = await prisma.dealer.upsert({
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
      latitude: 18.5204,
      longitude: 73.8567,
      onboarding: {
        create: {
          currentStep: 'done',
          completedSteps: ['email', 'phone', 'aadhaar', 'pan', 'gst', 'bank'],
        },
      },
      kyc: { create: { emailVerifiedAt: new Date(), phoneVerifiedAt: new Date() } },
    },
  });

  await prisma.vehicle.upsert({
    where: { dealerId_regNumber: { dealerId: dealer.id, regNumber: 'MH12AB1234' } },
    update: {},
    create: {
      dealerId: dealer.id,
      regNumber: 'MH12AB1234',
      regState: 'MH',
      make: 'Maruti Suzuki',
      model: 'Swift',
      variant: 'VXi',
      fuelType: 'Petrol',
      transmission: 'Manual',
      bodyType: 'Hatchback',
      manufactureYear: 2019,
      odometerKm: 42000,
      ownersCount: 1,
      color: 'White',
      price: 550000,
      valuationLow: 520000,
      valuationFair: 560000,
      valuationHigh: 600000,
      status: VehicleStatus.LIVE,
      city: 'Pune',
      latitude: 18.5204,
      longitude: 73.8567,
      listedAt: new Date(),
    },
  });

  // ─── Multi-source demo inventory (individual sellers + auctions) ──────
  const demo = [
    {
      regNumber: 'KA01IND2201',
      source: ListingSource.INDIVIDUAL,
      sellerName: 'Ravi Kumar',
      make: 'Hyundai',
      model: 'i20',
      variant: 'Asta',
      fuelType: 'Petrol',
      transmission: 'Manual',
      bodyType: 'Hatchback',
      manufactureYear: 2020,
      odometerKm: 38000,
      ownersCount: 1,
      accidentFree: true,
      price: 720000,
      valuationFair: 700000,
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      latitude: 12.9716,
      longitude: 77.5946,
      fairPriceLabel: 'FAIR',
      fairDeviationPct: 2.9,
      riskScore: 2,
      riskBand: 'LOW',
    },
    {
      regNumber: 'MH02IND7788',
      source: ListingSource.INDIVIDUAL,
      sellerName: 'Sneha Patil',
      make: 'Maruti Suzuki',
      model: 'Baleno',
      variant: 'Zeta',
      fuelType: 'Petrol',
      transmission: 'Manual',
      bodyType: 'Hatchback',
      manufactureYear: 2018,
      odometerKm: 61000,
      ownersCount: 2,
      accidentFree: null,
      price: 560000,
      valuationFair: 620000,
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      latitude: 19.076,
      longitude: 72.8777,
      fairPriceLabel: 'UNDERPRICED',
      fairDeviationPct: -9.7,
      riskScore: 4,
      riskBand: 'MODERATE',
    },
    {
      regNumber: 'DL03AUC9001',
      source: ListingSource.AUCTION,
      sellerName: 'HDFC Bank',
      make: 'Toyota',
      model: 'Innova Crysta',
      variant: 'GX',
      fuelType: 'Diesel',
      transmission: 'Manual',
      bodyType: 'MUV',
      manufactureYear: 2017,
      odometerKm: 120000,
      ownersCount: 2,
      accidentFree: false,
      price: 980000,
      valuationFair: 1150000,
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      latitude: 28.6139,
      longitude: 77.209,
      fairPriceLabel: 'UNDERPRICED',
      fairDeviationPct: -14.8,
      riskScore: 7,
      riskBand: 'HIGH',
    },
  ];

  for (const d of demo) {
    const { fairDeviationPct, riskScore, riskBand, ...rest } = d;
    const existing = await prisma.vehicle.findFirst({ where: { regNumber: d.regNumber } });
    const v =
      existing ??
      (await prisma.vehicle.create({
        data: {
          ...rest,
          valuationLow: Math.round(d.valuationFair * 0.92),
          valuationHigh: Math.round(d.valuationFair * 1.08),
          fairDeviationPct,
          riskScore,
          riskBand,
          status: VehicleStatus.LIVE,
          listedAt: new Date(),
        },
      }));
    if (d.source === ListingSource.AUCTION) {
      await prisma.auction.upsert({
        where: { vehicleId: v.id },
        update: {},
        create: {
          vehicleId: v.id,
          source: AuctionSource.BANK,
          sourceName: 'HDFC Bank',
          lotNumber: 'LOT-9001',
          venue: 'Online · Delhi NCR',
          startsAt: new Date(Date.now() + 5 * 86400000),
          endsAt: new Date(Date.now() + 6 * 86400000),
          guidePrice: 950000,
          reservePrice: 900000,
          status: AuctionStatus.UPCOMING,
          docsChecklist: ['PAN', 'Aadhaar', 'EMD demand draft', 'Bid form'],
        },
      });
    }
  }

  console.log('Seed complete:', { adminUser: adminUser.email, dealer: dealer.displayName });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
