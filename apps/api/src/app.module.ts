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
import { AdminModule } from './admin/admin.module';
import { InspectionsModule } from './inspections/inspections.module';
import { FinanceModule } from './finance/finance.module';
import { AlertsModule } from './alerts/alerts.module';
import { ModerationModule } from './moderation/moderation.module';
import { PaymentsModule } from './payments/payments.module';
import { BillingModule } from './billing/billing.module';
import { SellModule } from './sell/sell.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    PrismaModule,
    NotificationsModule,
    VerificationModule,
    SearchModule,
    ModerationModule,
    AlertsModule,
    PaymentsModule,
    DealersModule,
    AuthModule,
    OnboardingModule,
    VehiclesModule,
    BuyersModule,
    AppointmentsModule,
    DmsModule,
    AdminModule,
    InspectionsModule,
    FinanceModule,
    BillingModule,
    SellModule,
    HealthModule,
  ],
})
export class AppModule {}
