import { Global, Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { ConsentService } from './consent.service';
import { VaultService } from './vault.service';
import { ProviderRegistry } from './providers/provider.registry';
import { MockKycProvider } from './providers/mock-kyc.provider';
import { VERIFICATION_PROVIDERS } from './providers/types';

/**
 * Shared verification engine. Provider list is assembled here; add live
 * adapters (DigiLocker, Surepass/Signzy, Cashfree, MSG91) alongside the mock
 * and the registry will prefer the first that supports a check type.
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
    {
      provide: VERIFICATION_PROVIDERS,
      useFactory: (mock: MockKycProvider) => [mock],
      inject: [MockKycProvider],
    },
  ],
  exports: [VerificationService, VaultService, ConsentService],
})
export class VerificationModule {}
