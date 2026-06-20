import { Injectable, Inject } from '@nestjs/common';
import type { CheckType } from '@mana/db';
import { VERIFICATION_PROVIDERS, type VerificationProvider } from './types';

/**
 * Resolves which provider handles a given check type. Providers are tried in
 * registration order; the first that supports the type is used (failover to the
 * next can be layered in when live providers land). See plans/07-verification-kyc.md.
 */
@Injectable()
export class ProviderRegistry {
  constructor(@Inject(VERIFICATION_PROVIDERS) private readonly providers: VerificationProvider[]) {}

  resolve(checkType: CheckType): VerificationProvider {
    const provider = this.providers.find((p) => p.supports(checkType));
    if (!provider) {
      throw new Error(`No verification provider for check type ${checkType}`);
    }
    return provider;
  }

  list(): string[] {
    return this.providers.map((p) => p.name);
  }
}
