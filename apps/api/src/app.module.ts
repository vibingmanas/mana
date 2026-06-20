import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { VerificationModule } from './verification/verification.module';
import { AuthModule } from './auth/auth.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { DealersModule } from './dealers/dealers.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { BuyersModule } from './buyers/buyers.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { DmsModule } from './dms/dms.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    PrismaModule,
    NotificationsModule,
    VerificationModule,
    DealersModule,
    AuthModule,
    OnboardingModule,
    VehiclesModule,
    BuyersModule,
    AppointmentsModule,
    DmsModule,
    HealthModule,
  ],
})
export class AppModule {}
