import { Global, Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { ConsentService } from './consent.service';
import { VaultService } from './vault.service';
import { ProviderRegistry } from './providers/provider.registry';
import { MockKycProvider } from './providers/mock-kyc.provider';
import { SurepassKycProvider } from './providers/surepass-kyc.provider';
import { VERIFICATION_PROVIDERS } from './providers/types';

/**
 * Shared verification engine. Providers are tried in priority order: the live
 * Surepass adapter first (only when KYC_PROVIDER_API_KEY is set), then the mock
 * fallback which covers every check type. See plans/07-verification-kyc.md.
 */
@Global()
@Module({
  controllers: [VerificationController],
  providers: [
    VerificationService,
    ConsentService,
    VaultService,
    ProviderRegistry,
    MockKycProvider,
    SurepassKycProvider,
    {
      provide: VERIFICATION_PROVIDERS,
      useFactory: (surepass: SurepassKycProvider, mock: MockKycProvider) =>
        SurepassKycProvider.isConfigured() ? [surepass, mock] : [mock],
      inject: [SurepassKycProvider, MockKycProvider],
    },
  ],
  exports: [VerificationService, VaultService, ConsentService],
})
export class VerificationModule {}
