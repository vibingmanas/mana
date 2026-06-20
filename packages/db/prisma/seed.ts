// Dev seed — a sample admin, dealer, and a couple of vehicles.
import {
  PrismaClient,
  UserRole,
  DealerStatus,
  VerificationTier,
  VehicleStatus,
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
